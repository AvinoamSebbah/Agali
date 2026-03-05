"""Check which stores are missing"""
import asyncio
from prisma import Prisma

async def check():
    db = Prisma()
    await db.connect()
    
    # Get all Shufersal stores
    stores = await db.store.find_many(where={'chainId': '7290027600007'})
    store_ids = set([s.storeId for s in stores])
    
    print(f'\n[*] Total Shufersal stores: {len(store_ids)}')
    
    # Check problematic stores from errors
    error_stores = ['041', '042', '043', '270', '276', '278', '281', '282', '283']
    
    print(f'\n[*] Vérification des magasins problématiques:')
    missing = []
    for store_id in error_stores:
        if store_id in store_ids:
            print(f'  ✓ Store {store_id}: EXISTE')
        else:
            print(f'  ✗ Store {store_id}: MANQUANT')
            missing.append(store_id)
    
    if missing:
        print(f'\n[!] Magasins manquants: {missing}')
        
        # Check if these stores exist in XML
        from lxml import etree
        tree = etree.parse('dumps/Shufersal/Stores7290027600007-000-202601070201.xml')
        root = tree.getroot()
        all_stores = root.findall('.//{http://www.sap.com/abapxml}STORE')
        
        print(f'\n[*] Vérification dans le XML:')
        for store_id in missing:
            found_in_xml = False
            for store in all_stores:
                sid = store.find('STOREID')
                if sid is not None and sid.text == store_id:
                    found_in_xml = True
                    print(f'  ✓ Store {store_id}: EXISTE dans XML')
                    break
            if not found_in_xml:
                print(f'  ✗ Store {store_id}: N\'EXISTE PAS dans XML')
    
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check())
