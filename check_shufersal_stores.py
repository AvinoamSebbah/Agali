"""Check Shufersal stores in database"""
import asyncio
from prisma import Prisma

async def check_stores():
    db = Prisma()
    await db.connect()
    
    # Check stores for Shufersal
    stores = await db.store.find_many(where={'chainId': '7290027600007'})
    print(f'\n[*] Nombre de magasins Shufersal dans la DB: {len(stores)}')
    
    if stores:
        store_ids = sorted([s.storeId for s in stores])
        print(f'[*] Store IDs: {store_ids[:20]}...' if len(store_ids) > 20 else f'[*] Store IDs: {store_ids}')
    
    # Check for specific store IDs from the error
    error_store_ids = ['270', '276', '278', '281', '282', '283']
    print(f'\n[*] Vérification des magasins problématiques:')
    for store_id in error_store_ids:
        store = await db.store.find_first(where={'chainId': '7290027600007', 'storeId': store_id})
        if store:
            print(f'  ✓ Store {store_id}: EXISTE')
        else:
            print(f'  ✗ Store {store_id}: N\'EXISTE PAS')
    
    # Count all stores
    total_stores = await db.store.count()
    print(f'\n[*] Total de tous les magasins: {total_stores}')
    
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check_stores())
