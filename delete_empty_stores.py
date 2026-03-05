"""Delete stores without chainId"""
import asyncio
from prisma import Prisma

async def delete():
    db = Prisma()
    await db.connect()
    
    # Delete stores with empty chainId
    result = await db.store.delete_many(where={'chainId': ''})
    print(f'[*] Deleted {result} stores with empty chainId')
    
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(delete())
