import asyncio
from prisma import Prisma

async def main():
    db = Prisma()
    await db.connect()
    
    store_count = await db.store.count()
    promo_count = await db.promotion.count()
    price_count = await db.price.count()
    product_count = await db.product.count()
    promo_item_count = await db.promotionitem.count()
    
    print(f"[#] Statistiques de la base de donnees:")
    print(f"   Stores: {store_count}")
    print(f"   Promotions: {promo_count}")
    print(f"   Promotion Items: {promo_item_count}")
    print(f"   Prices: {price_count}")
    print(f"   Products: {product_count}")
    
    # Check quelques stores
    if store_count > 0:
        stores = await db.store.find_many(take=5)
        print(f"\n[>] Exemples de stores:")
        for store in stores:
            print(f"   - {store.chainId}/{store.storeId}: {store.storeName} ({store.city})")
    
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
