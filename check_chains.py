"""Check what chainId was used for Shufersal stores"""
import asyncio
from prisma import Prisma

async def check():
    db = Prisma()
    await db.connect()
    
    # Get all stores and group by chainId
    stores = await db.store.find_many()
    
    # Group manually
    from collections import defaultdict
    chain_counts = defaultdict(int)
    chain_names = {}
    
    for store in stores:
        chain_counts[store.chainId] += 1
        chain_names[store.chainId] = store.chainName
    
    print('\n[*] Chains dans la DB:')
    for chain_id in sorted(chain_counts.keys(), key=lambda x: chain_counts[x], reverse=True):
        print(f'  - Chain {chain_id} ({chain_names[chain_id]}): {chain_counts[chain_id]} magasins')
    
    # Check for Shufersal specifically
    print('\n[*] Recherche de "Shufersal" (7290027600007):')
    shufersal_stores = await db.store.find_many(where={'chainId': '7290027600007'})
    print(f'  Found: {len(shufersal_stores)} magasins Shufersal')
    if shufersal_stores:
        print(f'  Chain name: {shufersal_stores[0].chainName}')
        print(f'  Premiers store IDs: {sorted([s.storeId for s in shufersal_stores])[:10]}')
    
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check())
