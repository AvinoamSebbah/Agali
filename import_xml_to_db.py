"""
Script to import XML data from dumps/ folder into PostgreSQL database
"""
import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime
from lxml import etree
from prisma import Prisma
import threading
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()


class XMLDataImporter:
    """Import XML data from dumps folder to database"""
    
    def __init__(self, dumps_folder="dumps", skip_processed=True):
        self.dumps_folder = Path(dumps_folder)
        self.db = Prisma()
        self.stats = {
            "stores": {"created": 0, "updated": 0, "skipped": 0},
            "products": {"created": 0, "updated": 0, "skipped": 0},
            "promotions": {"created": 0, "updated": 0, "skipped": 0},
            "prices": {"created": 0, "updated": 0, "skipped": 0},
            "files": {"processed": 0, "skipped": 0},
        }
        self.start_time = None
        self.file_count = 0
        self.total_files = 0
        self.product_cache = set()  # Cache des produits deja verifies
        self.store_cache = set()  # Cache des magasins deja verifies
        self.batch_size = 2000  # Taille des lots pour insertion rapide (augmenté pour speed)
        self.concurrent_workers = 2  # 2 workers max (évite saturation Supabase free tier)
        self.skip_processed = skip_processed  # Skip already processed files
        self.already_processed = set()  # Set des fichiers déjà traités
        
        # Heartbeat monitoring pour éviter les "frozen" apparences
        self.active_workers = {}  # {worker_id: (filename, start_time)}
        self.heartbeat_stop = False
        self.last_activity = None
    
    async def connect(self):
        """Connect to database"""
        await self.db.connect()
        print("[+] Connected to database")
        
        # Load already processed files
        if self.skip_processed:
            try:
                result = await self.db.query_raw("SELECT file_name FROM processed_files")
                self.already_processed = {row['file_name'] for row in result}
                if self.already_processed:
                    print(f"[*] Already processed: {len(self.already_processed)} files")
            except:
                pass  # Table doesn't exist yet
    
    async def disconnect(self):
        """Disconnect from database"""
        await self.db.disconnect()
        print("[+] Disconnected from database")
    
    async def is_file_processed(self, file_path):
        """Check if file has already been processed"""
        if not self.skip_processed:
            return False
        return file_path.name in self.already_processed
    
    async def mark_file_as_processed(self, file_name):
        """Mark file as processed in database - SIMPLE: just the name"""
        try:
            await self.db.execute_raw(f"""
                INSERT INTO processed_files (file_name, file_path, file_hash, file_size, file_type) 
                VALUES ('{file_name}', '', 'n/a', 0, '')
                ON CONFLICT (file_name) DO NOTHING
            """)
            self.already_processed.add(file_name)
        except:
            pass  # Ignore errors
    
    def start_heartbeat_monitor(self):
        """Start a background thread to monitor active workers and show progress every 10s"""
        def heartbeat():
            import time
            import sys
            print("[HEARTBEAT] Monitor started - will update every 10 seconds")
            sys.stdout.flush()
            while not self.heartbeat_stop:
                time.sleep(10)  # Check every 10 seconds
                if not self.heartbeat_stop and self.active_workers:
                    processed = self.stats["files"]["processed"]
                    total_to_process = self.total_files
                    
                    # Collecter les numéros de fichiers en cours
                    working_file_nums = []
                    working_on = []
                    for worker_id, worker_data in list(self.active_workers.items()):
                        filename = worker_data[0]
                        start_time = worker_data[1]
                        file_num = worker_data[2] if len(worker_data) > 2 else "?"
                        elapsed = time.time() - start_time
                        
                        working_file_nums.append(str(file_num))
                        
                        # Extraire les infos de progression si disponibles
                        progress_info = ""
                        if len(worker_data) > 4:
                            current_item = worker_data[3]
                            total_items = worker_data[4]
                            progress_info = f" ({current_item}/{total_items}, {self.format_time(elapsed)})"
                        else:
                            progress_info = f" ({self.format_time(elapsed)})"
                        
                        working_on.append(f"{filename}{progress_info}")
                    
                    # Afficher le heartbeat avec les numéros de fichiers
                    working_files_str = " - ".join(working_file_nums)
                    print(f"\n[HEARTBEAT] Done {processed}/{total_to_process} files | Working on files {working_files_str}")
                    for idx, file_info in enumerate(working_on, 1):
                        print(f"  -> Worker {idx}: {file_info}")
                    print()
                    sys.stdout.flush()  # Force immediate display in GUI
        
        thread = threading.Thread(target=heartbeat, daemon=True)
        thread.start()
    
    def stop_heartbeat_monitor(self):
        """Stop the heartbeat monitor"""
        self.heartbeat_stop = True
    
    def parse_xml_file(self, xml_path):
        """Parse XML file and return root element"""
        try:
            tree = etree.parse(str(xml_path))
            return tree.getroot()
        except Exception as e:
            print(f"[-] Error parsing {xml_path}: {e}")
            return None
    
    def get_text(self, element, tag, default=""):
        """Safely get text from XML element (case-insensitive, namespace-aware)"""
        # Try exact match first
        child = element.find(tag)
        if child is not None and child.text:
            return child.text
        
        # Try case-insensitive search (with namespace handling)
        tag_lower = tag.lower()
        
        # Search in direct children
        for child in element:
            # Remove namespace if present
            child_tag = child.tag.split('}')[-1] if '}' in child.tag else child.tag
            if child_tag.lower() == tag_lower:
                return child.text if child.text else default
        
        # Try searching deeper with findall (.//)
        for child in element.findall('.//*'):
            child_tag = child.tag.split('}')[-1] if '}' in child.tag else child.tag
            if child_tag.lower() == tag_lower:
                return child.text if child.text else default
        
        return default
    
    def parse_date(self, date_str):
        """Parse date string to datetime"""
        if not date_str:
            return None
        try:
            # Try different date formats
            for fmt in ["%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%d/%m/%Y"]:
                try:
                    dt = datetime.strptime(date_str, fmt)
                    # Make timezone-aware (UTC) for comparison with database timestamps
                    if dt.tzinfo is None:
                        from datetime import timezone
                        dt = dt.replace(tzinfo=timezone.utc)
                    return dt
                except ValueError:
                    continue
            return None
        except Exception:
            return None
    
    def parse_time(self, time_str):
        """Parse time string to datetime.time"""
        if not time_str:
            return None
        try:
            # Extract time part if datetime
            if " " in time_str:
                time_str = time_str.split(" ")[1]
            # Remove milliseconds if present
            if "." in time_str:
                time_str = time_str.split(".")[0]
            # Parse time and combine with fixed date (Prisma @db.Time expects datetime)
            time_obj = datetime.strptime(time_str, "%H:%M:%S")
            return datetime(2000, 1, 1, time_obj.hour, time_obj.minute, time_obj.second)
        except Exception:
            return None
    
    async def import_stores(self, xml_path):
        """Import stores from Stores*.xml file"""
        root = self.parse_xml_file(xml_path)
        if root is None:
            return
        
        chain_id = self.get_text(root, "ChainId")
        chain_name = self.get_text(root, "ChainName")
        last_update_date = self.parse_date(self.get_text(root, "LastUpdateDate"))
        last_update_time = self.parse_time(self.get_text(root, "LastUpdateTime"))
        
        # Find all stores - support both formats (SubChain/Store and STORES/STORE)
        all_stores = []
        
        # Try standard format first (.//SubChain/Store)
        for sub_chain in root.findall(".//SubChain"):
            all_stores.extend(sub_chain.findall(".//Store"))
        
        # If no stores found, try uppercase format (.//STORES/STORE for Shufersal)
        if not all_stores:
            for stores_elem in root.findall(".//STORES"):
                all_stores.extend(stores_elem.findall(".//STORE"))
        
        # If still no stores, try direct search for Store or STORE tags
        if not all_stores:
            all_stores = root.findall(".//Store") or root.findall(".//STORE")
        
        total_stores = len(all_stores)
        
        for idx, store_elem in enumerate(all_stores, 1):
            # Update worker progress for heartbeat monitoring
            worker_id = id(asyncio.current_task())
            if worker_id in self.active_workers:
                filename, start_time, file_num = self.active_workers[worker_id][:3]
                self.active_workers[worker_id] = (filename, start_time, file_num, f"store {idx}", total_stores)
            
            store_id = self.get_text(store_elem, "StoreId")
                
            if not store_id:
                continue
                
            # Base store data (excluding city for updates to preserve manual configuration)
            store_data_base = {
                "chainId": chain_id,
                "chainName": chain_name,
                "lastUpdateDate": last_update_date,
                "lastUpdateTime": last_update_time,
                "storeId": store_id,
                "bikoretNo": self.get_text(store_elem, "BikoretNo"),
                "storeType": self.get_text(store_elem, "StoreType"),
                "storeName": self.get_text(store_elem, "StoreName"),
                "address": self.get_text(store_elem, "Address"),
                "zipCode": self.get_text(store_elem, "ZipCode"),
            }
            
            # Full store data with city (only for creation)
            store_data_with_city = {
                **store_data_base,
                "city": self.get_text(store_elem, "City"),
            }
            
            try:
                # Use upsert to handle concurrent writes and avoid duplicates
                # Note: city is only set during creation, not during updates (user configured manually)
                await self.db.store.upsert(
                    where={
                        "chainId_storeId": {
                            "chainId": chain_id,
                            "storeId": store_id,
                        }
                    },
                    data={
                        "create": store_data_with_city,
                        "update": store_data_base,
                    },
                )
                self.stats["stores"]["updated"] += 1
            
            except Exception as e:
                print(f"[-] Error importing store {chain_id}/{store_id}: {e}")
                self.stats["stores"]["skipped"] += 1
    
    async def import_promotions(self, xml_path):
        """Import promotions from Promo*.xml file"""
        root = self.parse_xml_file(xml_path)
        if root is None:
            return
        
        chain_id = self.get_text(root, "ChainId")
        sub_chain_id = self.get_text(root, "SubChainId")
        store_id = self.get_text(root, "StoreId")
        bikoret_no = self.get_text(root, "BikoretNo")
        
        # Find all promotions
        all_promos = root.findall(".//Promotion")
        total_promos = len(all_promos)
        
        for idx, promo_elem in enumerate(all_promos, 1):
            # Update worker progress for heartbeat monitoring
            worker_id = id(asyncio.current_task())
            if worker_id in self.active_workers:
                filename, start_time, file_num = self.active_workers[worker_id][:3]
                self.active_workers[worker_id] = (filename, start_time, file_num, f"promo {idx}", total_promos)
            
            promotion_id = self.get_text(promo_elem, "PromotionId")
            
            if not promotion_id:
                continue
            
            promotion_update_date = self.parse_date(self.get_text(promo_elem, "PromotionUpdateDate"))
            
            promo_data = {
                "chainId": chain_id,
                "subChainId": sub_chain_id,
                "storeId": store_id,
                "bikoretNo": bikoret_no,
                "promotionId": promotion_id,
                "promotionDescription": self.get_text(promo_elem, "PromotionDescription"),
                "promotionUpdateDate": promotion_update_date or datetime.now(),
                "promotionStartDate": self.parse_date(self.get_text(promo_elem, "PromotionStartDate")) or datetime.now(),
                "promotionStartHour": self.get_text(promo_elem, "PromotionStartHour"),
                "promotionEndDate": self.parse_date(self.get_text(promo_elem, "PromotionEndDate")) or datetime.now(),
                "promotionEndHour": self.get_text(promo_elem, "PromotionEndHour"),
                "rewardType": self.get_text(promo_elem, "RewardType"),
                "allowMultipleDiscounts": self.get_text(promo_elem, "AllowMultipleDiscounts"),
                "isWeightedPromo": self.get_text(promo_elem, "IsWeightedPromo") == "1",
                "additionalIsCoupon": self.get_text(promo_elem, "AdditionalIsCoupon"),
                "additionalGiftCount": self.get_text(promo_elem, "AdditionalGiftCount"),
                "additionalIsTotal": self.get_text(promo_elem, "AdditionalIsTotal"),
                "additionalIsActive": self.get_text(promo_elem, "AdditionalIsActive"),
                "minQty": self.get_text(promo_elem, "MinQty"),
                "discountedPrice": self.get_text(promo_elem, "DiscountedPrice"),
                "discountedPricePerMida": self.get_text(promo_elem, "DiscountedPricePerMida"),
                "minNoOfItemOfered": self.get_text(promo_elem, "MinNoOfItemOfered"),
                "weightUnit": self.get_text(promo_elem, "WeightUnit"),
                "clubId": self.get_text(promo_elem, "ClubId"),
            }
            
            try:
                # Ensure store exists before creating promotion
                await self.ensure_store_exists(chain_id, store_id)
                
                # Use upsert to handle concurrent writes (multiple workers)
                promotion = await self.db.promotion.upsert(
                    where={
                        "chainId_storeId_promotionId": {
                            "chainId": chain_id,
                            "storeId": store_id,
                            "promotionId": promotion_id,
                        }
                    },
                    data={
                        "create": promo_data,
                        "update": promo_data,
                    },
                )
                
                # Delete old promotion items before adding new ones
                await self.db.promotionitem.delete_many(
                    where={"promotionId": promotion.id}
                )
                self.stats["promotions"]["updated"] += 1
                
                # Get product name from Remarks if available
                remarks = self.get_text(promo_elem, "Remarks")
                
                # Import promotion items - BATCH MODE for speed
                promo_items = promo_elem.find(".//PromotionItems")
                if promo_items is not None:
                    items = promo_items.findall("Item")
                    
                    # Batch prepare all promotion items
                    promotion_items_batch = []
                    for item_elem in items:
                        item_code = self.get_text(item_elem, "ItemCode")
                        if not item_code:
                            continue
                        
                        # Ensure product exists (cached)
                        if item_code not in self.product_cache:
                            await self.ensure_product_exists(item_code)
                        
                        promotion_items_batch.append({
                            "promotionId": promotion.id,
                            "itemCode": item_code,
                            "itemType": self.get_text(item_elem, "ItemType"),
                            "isGiftItem": self.get_text(item_elem, "IsGiftItem") == "1",
                        })
                    
                    # Batch insert promotion items in smaller chunks to avoid timeouts
                    if promotion_items_batch:
                        chunk_size = 500  # Process 500 items at a time
                        for i in range(0, len(promotion_items_batch), chunk_size):
                            chunk = promotion_items_batch[i:i + chunk_size]
                            try:
                                await self.db.promotionitem.create_many(
                                    data=chunk,
                                    skip_duplicates=True
                                )
                            except Exception:
                                pass  # Ignore errors (duplicates etc)
            
            except Exception as e:
                print(f"[-] Error importing promotion {chain_id}/{store_id}/{promotion_id}: {e}")
                self.stats["promotions"]["skipped"] += 1
    
    async def ensure_product_exists(self, item_code):
        """Ensure product exists in database (with cache)"""
        # Check cache first (ultra fast)
        if item_code in self.product_cache:
            return
        
        # Try to find product first (faster than upsert)
        try:
            existing = await self.db.product.find_unique(where={"itemCode": item_code})
            if existing:
                self.product_cache.add(item_code)
                return
            
            # Only create if doesn't exist
            await self.db.product.create(data={"itemCode": item_code})
            self.product_cache.add(item_code)
        except Exception:
            # Product might have been created by another worker
            self.product_cache.add(item_code)
    
    async def ensure_store_exists(self, chain_id, store_id):
        """Ensure store exists in database, create placeholder if missing"""
        cache_key = f"{chain_id}_{store_id}"
        
        # Check cache first
        if cache_key in self.store_cache:
            return
        
        # Try to find store first (faster than upsert in most cases)
        try:
            existing = await self.db.store.find_unique(
                where={
                    "chainId_storeId": {
                        "chainId": chain_id,
                        "storeId": store_id,
                    }
                }
            )
            if existing:
                self.store_cache.add(cache_key)
                return
            
            # Only create if doesn't exist
            await self.db.store.create(
                data={
                    "chainId": chain_id,
                    "storeId": store_id,
                    "storeName": f"Store {store_id} (placeholder)",
                    "chainName": "Unknown",
                }
            )
            self.store_cache.add(cache_key)
        except Exception:
            # Store might have been created by another worker, add to cache anyway
            self.store_cache.add(cache_key)
    
    async def update_product_name_from_remarks(self, item_code, remarks):
        """Update product name from promotion Remarks if product doesn't have a name"""
        if not remarks:
            return
        
        # Get existing product
        product = await self.db.product.find_unique(where={"itemCode": item_code})
        if not product:
            return
        
        # Update only if product doesn't have a name yet
        if not product.itemName:
            await self.db.product.update(
                where={"itemCode": item_code},
                data={"itemName": remarks}
            )
        # Add to cache
        self.product_cache.add(item_code)
    
    async def import_prices(self, xml_path):
        """Import prices from Price*.xml file (optimized with batch processing)"""
        root = self.parse_xml_file(xml_path)
        if root is None:
            return
        
        chain_id = self.get_text(root, "ChainId")
        sub_chain_id = self.get_text(root, "SubChainId")
        store_id = self.get_text(root, "StoreId")
        bikoret_no = self.get_text(root, "BikoretNo")
        
        # Find all items
        items_elem = root.find("Items")
        if items_elem is None:
            return
        
        all_items = items_elem.findall("Item")
        total_items = len(all_items)
        
        # Batch processing for large files
        products_to_create = []
        products_to_update = {}
        prices_to_process = []
        
        for idx, item_elem in enumerate(all_items, 1):
            # Update worker progress for heartbeat monitoring
            worker_id = id(asyncio.current_task())
            if worker_id in self.active_workers:
                filename, start_time, file_num = self.active_workers[worker_id][:3]
                self.active_workers[worker_id] = (filename, start_time, file_num, f"price {idx}", total_items)
            
            item_code = self.get_text(item_elem, "ItemCode")
            
            if not item_code:
                continue
            
            price_update_date = self.parse_date(self.get_text(item_elem, "PriceUpdateDate"))
            
            # Prepare product data
            if item_code not in self.product_cache:
                product_info = {
                    "itemCode": item_code,
                    "itemName": self.get_text(item_elem, "ItemName") or self.get_text(item_elem, "ItemNm"),
                    "manufacturerName": self.get_text(item_elem, "ManufacturerName"),
                    "manufactureCountry": self.get_text(item_elem, "ManufactureCountry"),
                    "manufacturerItemDescription": self.get_text(item_elem, "ManufacturerItemDescription"),
                }
                products_to_update[item_code] = product_info
                self.product_cache.add(item_code)
            
            # Prepare price data
            prices_to_process.append({
                "item_elem": item_elem,
                "item_code": item_code,
                "price_update_date": price_update_date
            })
        
        # Batch create/update products
        if products_to_update:
            await self.batch_upsert_products(list(products_to_update.values()))
        
        # Batch process prices
        if prices_to_process:
            await self.batch_process_prices(chain_id, sub_chain_id, store_id, bikoret_no, prices_to_process)
    
    async def batch_upsert_products(self, products_data):
        """Bulk upsert products via raw SQL — 1 req pour N produits au lieu de N reqs"""
        if not products_data:
            return
        
        BATCH_SIZE = 200  # 200 rows max (Supabase free tier: HTTP payload limit)
        for i in range(0, len(products_data), BATCH_SIZE):
            chunk = products_data[i:i + BATCH_SIZE]
            
            def esc(v):
                if v is None:
                    return 'NULL'
                return "'" + str(v).replace("'", "''") + "'"
            
            values = []
            for p in chunk:
                values.append(
                    f"({esc(p.get('itemCode'))}, {esc(p.get('itemName'))}, "
                    f"{esc(p.get('manufacturerName'))}, {esc(p.get('manufactureCountry'))}, "
                    f"{esc(p.get('manufacturerItemDescription'))})"
                )
            
            sql = f"""
                INSERT INTO products (item_code, item_name, manufacturer_name, manufacture_country, manufacturer_item_description)
                VALUES {', '.join(values)}
                ON CONFLICT (item_code) DO UPDATE SET
                    item_name = COALESCE(EXCLUDED.item_name, products.item_name),
                    manufacturer_name = COALESCE(EXCLUDED.manufacturer_name, products.manufacturer_name),
                    manufacture_country = COALESCE(EXCLUDED.manufacture_country, products.manufacture_country),
                    manufacturer_item_description = COALESCE(EXCLUDED.manufacturer_item_description, products.manufacturer_item_description),
                    updated_at = NOW()
            """
            try:
                await self.db.execute_raw(sql)
                self.product_cache.update(p['itemCode'] for p in chunk if p.get('itemCode'))
            except Exception as e:
                # Fallback individuel si batch échoue
                for p in chunk:
                    try:
                        update_data = {k: v for k, v in p.items() if v and k != 'itemCode'}
                        await self.db.product.upsert(
                            where={'itemCode': p['itemCode']},
                            data={'create': p, 'update': update_data or {}}
                        )
                        self.product_cache.add(p['itemCode'])
                    except Exception:
                        pass
    
    async def batch_process_prices(self, chain_id, sub_chain_id, store_id, bikoret_no, prices_data):
        """Batch process prices for better performance"""
        batch = []
        
        for idx, price_info in enumerate(prices_data, 1):
            item_elem = price_info["item_elem"]
            item_code = price_info["item_code"]
            price_update_date = price_info["price_update_date"]
            
            price_data = {
                "chainId": chain_id,
                "subChainId": sub_chain_id,
                "storeId": store_id,
                "bikoretNo": bikoret_no,
                "priceUpdateDate": price_update_date or datetime.now(),
                "itemCode": item_code,
                "itemType": self.get_text(item_elem, "ItemType"),
                "unitQty": self.get_text(item_elem, "UnitQty"),
                "quantity": self.get_text(item_elem, "Quantity"),
                "unitOfMeasure": self.get_text(item_elem, "UnitOfMeasure"),
                "bIsWeighted": self.get_text(item_elem, "bIsWeighted") == "1",
                "qtyInPackage": self.get_text(item_elem, "QtyInPackage"),
                "itemPrice": self.get_text(item_elem, "ItemPrice"),
                "unitOfMeasurePrice": self.get_text(item_elem, "UnitOfMeasurePrice"),
                "allowDiscount": self.get_text(item_elem, "AllowDiscount"),
                "itemStatus": self.get_text(item_elem, "ItemStatus"),
                "itemId": self.get_text(item_elem, "ItemId"),
            }
            
            batch.append(price_data)
            
            # Process batch every 200 items (limite HTTP Supabase free tier)
            if len(batch) >= 200:
                await self.process_price_batch(batch)
                batch = []
        
        # Process remaining
        if batch:
            await self.process_price_batch(batch)
    
    async def process_price_batch(self, batch):
        """Bulk upsert prices via raw SQL — 1 req pour N prix au lieu de N reqs"""
        if not batch:
            return
        
        def esc(v):
            if v is None:
                return 'NULL'
            return "'" + str(v).replace("'", "''") + "'"
        
        def esc_bool(v):
            return 'TRUE' if v else 'FALSE'
        
        values = []
        for p in batch:
            date_str = p['priceUpdateDate'].strftime('%Y-%m-%d %H:%M:%S') if hasattr(p['priceUpdateDate'], 'strftime') else str(p['priceUpdateDate'])
            values.append(
                f"({esc(p['chainId'])}, {esc(p.get('subChainId'))}, {esc(p['storeId'])}, "
                f"{esc(p.get('bikoretNo'))}, {esc(date_str)}::timestamp, {esc(p['itemCode'])}, "
                f"{esc(p.get('itemType'))}, {esc(p.get('unitQty'))}, {esc(p.get('quantity'))}, "
                f"{esc(p.get('unitOfMeasure'))}, {esc_bool(p.get('bIsWeighted'))}, "
                f"{esc(p.get('qtyInPackage'))}, {esc(p.get('itemPrice'))}, "
                f"{esc(p.get('unitOfMeasurePrice'))}, {esc(p.get('allowDiscount'))}, "
                f"{esc(p.get('itemStatus'))}, {esc(p.get('itemId'))})"
            )
        
        sql = f"""
            INSERT INTO prices (
                chain_id, sub_chain_id, store_id, bikoret_no, price_update_date,
                item_code, item_type, unit_qty, quantity, unit_of_measure,
                b_is_weighted, qty_in_package, item_price, unit_of_measure_price,
                allow_discount, item_status, item_id
            )
            VALUES {', '.join(values)}
            ON CONFLICT (chain_id, store_id, item_code) DO UPDATE SET
                sub_chain_id = EXCLUDED.sub_chain_id,
                bikoret_no = EXCLUDED.bikoret_no,
                price_update_date = EXCLUDED.price_update_date,
                item_type = EXCLUDED.item_type,
                unit_qty = EXCLUDED.unit_qty,
                quantity = EXCLUDED.quantity,
                unit_of_measure = EXCLUDED.unit_of_measure,
                b_is_weighted = EXCLUDED.b_is_weighted,
                qty_in_package = EXCLUDED.qty_in_package,
                item_price = EXCLUDED.item_price,
                unit_of_measure_price = EXCLUDED.unit_of_measure_price,
                allow_discount = EXCLUDED.allow_discount,
                item_status = EXCLUDED.item_status,
                item_id = EXCLUDED.item_id,
                updated_at = NOW()
        """
        try:
            await self.db.execute_raw(sql)
            self.stats["prices"]["updated"] += len(batch)
        except Exception as e:
            # Fallback individuel si le batch SQL échoue
            for price_data in batch:
                try:
                    await self.db.price.upsert(
                        where={
                            "chainId_storeId_itemCode": {
                                "chainId": price_data["chainId"],
                                "storeId": price_data["storeId"],
                                "itemCode": price_data["itemCode"],
                            }
                        },
                        data={"create": price_data, "update": price_data},
                    )
                    self.stats["prices"]["updated"] += 1
                except Exception:
                    self.stats["prices"]["skipped"] += 1
    
    async def update_product_info(self, item_elem, item_code):
        """Update product information from price XML (supports multiple tag variants)"""
        # Try multiple tag variants for better compatibility
        product_data = {
            "itemName": self.get_text(item_elem, "ItemName") or self.get_text(item_elem, "ItemNm"),
            "manufacturerName": self.get_text(item_elem, "ManufacturerName"),
            "manufactureCountry": self.get_text(item_elem, "ManufactureCountry"),
            "manufacturerItemDescription": self.get_text(item_elem, "ManufacturerItemDescription"),
        }
        
        # Use upsert to avoid duplicates
        product_data["itemCode"] = item_code
        update_data = {k: v for k, v in product_data.items() if v and k != "itemCode"}
        await self.db.product.upsert(
            where={"itemCode": item_code},
            data={
                "create": product_data,
                "update": update_data if update_data else {},
            },
        )
    
    async def process_xml_file(self, xml_path, store_name=None):
        """Process a single XML file based on its type"""
        filename = xml_path.name.lower()
        
        # Check if file has already been processed
        if await self.is_file_processed(xml_path):
            self.stats["files"]["skipped"] += 1
            # Afficher un compteur tous les 50 fichiers au lieu de spammer
            if self.stats["files"]["skipped"] % 50 == 0:
                print(f"[-] Skipped {self.stats['files']['skipped']} files so far...")
            return
        
        self.file_count += 1
        
        # Register this worker as active (pour heartbeat monitoring)
        import time as time_module
        worker_id = id(asyncio.current_task())
        file_start_time = time_module.time()
        # Store: (filename, start_time, file_number)
        self.active_workers[worker_id] = (xml_path.name, file_start_time, self.file_count)
        
        try:
            # Determine file type and record count
            file_type = "unknown"
            record_count = 0
            if filename.startswith("stores") or filename.startswith("storesfull"):
                file_type = "stores"
                await self.import_stores(xml_path)
                record_count = self.stats["stores"]["created"] + self.stats["stores"]["updated"]
            elif filename.startswith("promo") or filename.startswith("promofull"):
                file_type = "promo"
                await self.import_promotions(xml_path)
                record_count = self.stats["promotions"]["created"] + self.stats["promotions"]["updated"]
            elif filename.startswith("price") or filename.startswith("pricefull"):
                file_type = "price"
                await self.import_prices(xml_path)
                record_count = self.stats["prices"]["created"] + self.stats["prices"]["updated"]
            else:
                print(f"  [!] Unknown file type: {filename}")
                return
            
            # Mark file as processed immediately (just the name)
            await self.mark_file_as_processed(xml_path.name)
            self.stats["files"]["processed"] += 1
            
        finally:
            # Always remove from active workers when done
            if worker_id in self.active_workers:
                del self.active_workers[worker_id]
    
    async def import_all(self, file_types=None, stores=None):
        """
        Import all XML files from dumps folder
        
        Args:
            file_types: List of file types to import. Options: ['stores', 'promo', 'price']
                       If None, imports all files in order.
            stores: List of store names to import. If None, imports all stores.
        """
        if not self.dumps_folder.exists():
            print(f"[-] Dumps folder not found: {self.dumps_folder}")
            return
        
        if file_types is None:
            file_types = ['stores', 'promo', 'price']
        
        print(f"\n[>] Scanning dumps folder: {self.dumps_folder}")
        print(f"[>] File types to import: {', '.join(file_types)}")
        if stores:
            print(f"[>] Stores filter: {', '.join(stores)}")
        print()
        
        # Iterate through chain folders
        for chain_folder in self.dumps_folder.iterdir():
            if not chain_folder.is_dir() or chain_folder.name == "status":
                continue
            
            # Filter by store name if specified
            if stores and chain_folder.name not in stores:
                continue
            
            print(f"\n{'='*60}")
            print(f"[>] Processing chain: {chain_folder.name}")
            print(f"{'='*60}\n")
            
            # Find all XML files
            xml_files = list(chain_folder.glob("*.xml"))
            
            if not xml_files:
                print(f"  [!] No XML files found")
                continue
            
            # Organize files by type
            stores_files = [f for f in xml_files if f.name.lower().startswith("stores") or f.name.lower().startswith("storesfull")]
            promo_files = [f for f in xml_files if f.name.lower().startswith("promo")]
            price_files = [f for f in xml_files if f.name.lower().startswith("price")]
            
            print(f"  Found {len(stores_files)} Stores, {len(promo_files)} Promo, {len(price_files)} Price files\n")
            
            # IMPORTANT: Always process files in correct order to satisfy foreign keys
            # Stores must be imported FIRST, then Promo, then Price
            files_to_process = []
            
            # Always import stores first if they exist (needed for foreign keys)
            # Import stores even if not explicitly requested when promo or price are requested
            if stores_files and ('stores' in file_types or 'promo' in file_types or 'price' in file_types):
                if 'stores' not in file_types:
                    print(f"  [!] Auto-importing stores first to satisfy foreign key constraints")
                files_to_process.extend(stores_files)
            
            # Then promo (depends on stores)
            if promo_files and 'promo' in file_types:
                files_to_process.extend(promo_files)
            
            # Finally price (depends on stores and products)
            if price_files and 'price' in file_types:
                files_to_process.extend(price_files)
            
            # Filter out already processed files for display
            files_to_actually_process = [f for f in files_to_process if f.name not in self.already_processed]
            
            # Initialize progress tracking (based on files that will actually be processed)
            self.total_files = len(files_to_actually_process) if self.skip_processed else len(files_to_process)
            self.file_count = 0
            self.start_time = time.time()
            
            print(f"\n[*] Starting import of {len(files_to_process)} files ({len(files_to_process) - self.total_files} already processed, {self.total_files} to process)...\n")
            
            # Start heartbeat monitor to show activity every 20s
            self.start_heartbeat_monitor()
            
            # Process files with controlled concurrency
            if self.concurrent_workers > 1:
                print(f"[>] Using {self.concurrent_workers} concurrent workers\n")
                
                # Create semaphore to limit concurrent tasks
                semaphore = asyncio.Semaphore(self.concurrent_workers)
                
                async def process_with_semaphore(xml_file, store_name):
                    async with semaphore:
                        await self.process_xml_file(xml_file, store_name)
                
                # Process each group in order (stores → promo → price)
                # but parallelize within each group
                current_idx = 0
                
                # Process stores first (parallel within stores)
                stores_count = len(stores_files) if (stores_files and ('stores' in file_types or 'promo' in file_types or 'price' in file_types)) else 0
                if stores_count > 0:
                    stores_batch = files_to_process[current_idx:current_idx + stores_count]
                    tasks = [process_with_semaphore(f, chain_folder.name) for f in stores_batch]
                    await asyncio.gather(*tasks)
                    current_idx += stores_count
                
                # Process promo files (parallel within promo)
                promo_count = len(promo_files) if (promo_files and 'promo' in file_types) else 0
                if promo_count > 0:
                    promo_batch = files_to_process[current_idx:current_idx + promo_count]
                    tasks = [process_with_semaphore(f, chain_folder.name) for f in promo_batch]
                    await asyncio.gather(*tasks)
                    current_idx += promo_count
                
                # Process price files (parallel within price)
                price_count = len(price_files) if (price_files and 'price' in file_types) else 0
                if price_count > 0:
                    price_batch = files_to_process[current_idx:current_idx + price_count]
                    tasks = [process_with_semaphore(f, chain_folder.name) for f in price_batch]
                    await asyncio.gather(*tasks)
            else:
                # Sequential processing
                for xml_file in files_to_process:
                    await self.process_xml_file(xml_file, chain_folder.name)
        
        # Stop heartbeat monitor
        self.stop_heartbeat_monitor()
        
        self.print_stats()
    
    def format_time(self, seconds):
        """Format seconds into human-readable time"""
        if seconds < 60:
            return f"{int(seconds)}s"
        elif seconds < 3600:
            mins = int(seconds / 60)
            secs = int(seconds % 60)
            return f"{mins}m {secs}s"
        else:
            hours = int(seconds / 3600)
            mins = int((seconds % 3600) / 60)
            return f"{hours}h {mins}m"
    
    def print_stats(self):
        """Print import statistics"""
        total_time = time.time() - self.start_time if self.start_time else 0
        
        print(f"\n\n{'='*60}")
        print("  [#] IMPORT STATISTICS")
        print(f"{'='*60}\n")
        
        print(f"[*] Total Time: {self.format_time(total_time)}")
        print(f"[>] Files Total: {self.total_files}")
        print(f"[+] Files Processed: {self.stats['files']['processed']}")
        print(f"[-] Files Skipped (already processed): {self.stats['files']['skipped']}\n")
        
        for entity, stats in self.stats.items():
            if entity == "files":
                continue
            total = stats['created'] + stats['updated'] + stats['skipped']
            if total > 0:
                print(f"{entity.upper()}:")
                print(f"  [+] Created: {stats['created']:,}")
                print(f"  [~] Updated: {stats['updated']:,}")
                print(f"  [-] Skipped: {stats['skipped']:,}")
                print(f"  [=] Total:  {total:,}\n")


async def main():
    """Main entry point"""
    import sys
    import argparse
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Import XML data to database')
    parser.add_argument('file_types', nargs='*', 
                       help='File types to import (stores, promo, price)')
    parser.add_argument('--stores', type=str,
                       help='Comma-separated list of store names to import')
    parser.add_argument('--workers', type=int, default=4,
                       help='Number of parallel workers (1-16, default: 4)')
    parser.add_argument('--force', action='store_true',
                       help='Force reprocessing of already processed files')
    
    args = parser.parse_args()
    
    file_types = None
    if args.file_types:
        valid_types = ['stores', 'promo', 'price']
        file_types = [t.lower() for t in args.file_types if t.lower() in valid_types]
        if not file_types:
            print("[-] Invalid file type. Valid options: stores, promo, price")
            print("Usage: python import_xml_to_db.py [stores] [promo] [price] [--stores STORES] [--force]")
            print("Example: python import_xml_to_db.py stores --stores Osherad,RamiLevy")
            print("         python import_xml_to_db.py promo price --workers 8 --force")
            return
    
    stores = None
    if args.stores:
        stores = [s.strip() for s in args.stores.split(',')]
    
    # Get number of concurrent workers
    workers = max(1, min(args.workers, 16))  # Limit to 1-16
    
    # Skip processed files unless --force is used
    skip_processed = not args.force
    
    print("\n[*] XML Data Importer")
    print("="*60)
    
    if workers > 1:
        print(f"[*] Concurrent mode: {workers} parallel tasks")
    
    if args.force:
        print(f"[*] Force mode: Reprocessing ALL files")
    else:
        print(f"[*] Incremental mode: Skipping already processed files")
    
    importer = XMLDataImporter(skip_processed=skip_processed)
    importer.concurrent_workers = workers
    
    try:
        await importer.connect()
        await importer.import_all(file_types, stores)
    except Exception as e:
        print(f"\n[-] Fatal error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await importer.disconnect()
    
    print("\n[+] Import completed!\n")


if __name__ == "__main__":
    asyncio.run(main())

