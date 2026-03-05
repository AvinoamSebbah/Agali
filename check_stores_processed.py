"""Check if Stores file was processed"""
import asyncio
from prisma import Prisma

async def check():
    db = Prisma()
    await db.connect()
    
    result = await db.query_raw("SELECT file_name FROM processed_files WHERE file_name LIKE '%Stores%Shufersal%'")
    print('\n[*] Fichiers Stores Shufersal traités:')
    if result:
        for r in result:
            print(f'  - {r["file_name"]}')
    else:
        print('  AUCUN fichier Stores Shufersal traité!')
    
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check())
