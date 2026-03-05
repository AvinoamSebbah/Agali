import asyncio
from prisma import Prisma

async def check():
    db = Prisma()
    await db.connect()
    
    # Count total
    result = await db.query_raw('SELECT COUNT(*) as count FROM processed_files')
    print(f'Total files in processed_files: {result[0]["count"]}')
    
    # Count by type
    by_type = await db.query_raw('SELECT file_type, COUNT(*) as count FROM processed_files GROUP BY file_type')
    print('\nBy type:')
    for row in by_type:
        print(f'  {row["file_type"]}: {row["count"]}')
    
    # Show last 5 processed
    last = await db.query_raw('SELECT file_name, file_type, record_count FROM processed_files ORDER BY processed_at DESC LIMIT 5')
    print('\nLast 5 processed:')
    for row in last:
        print(f'  {row["file_name"]} ({row["file_type"]}) - {row["record_count"]} records')
    
    await db.disconnect()

asyncio.run(check())
