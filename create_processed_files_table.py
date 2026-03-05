"""
Script to create the processed_files table in PostgreSQL
"""
import asyncio
from prisma import Prisma

async def create_table():
    db = Prisma()
    await db.connect()
    
    try:
        # Create the table using raw SQL
        await db.execute_raw("""
            CREATE TABLE IF NOT EXISTS processed_files (
                id SERIAL PRIMARY KEY,
                file_name VARCHAR UNIQUE NOT NULL,
                file_path VARCHAR NOT NULL,
                file_hash VARCHAR NOT NULL,
                file_size BIGINT NOT NULL,
                file_type VARCHAR NOT NULL,
                store_name VARCHAR,
                record_count INTEGER,
                processed_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        # Create indexes
        await db.execute_raw("""
            CREATE INDEX IF NOT EXISTS idx_processed_files_file_name ON processed_files(file_name);
        """)
        await db.execute_raw("""
            CREATE INDEX IF NOT EXISTS idx_processed_files_file_hash ON processed_files(file_hash);
        """)
        await db.execute_raw("""
            CREATE INDEX IF NOT EXISTS idx_processed_files_store_name ON processed_files(store_name);
        """)
        await db.execute_raw("""
            CREATE INDEX IF NOT EXISTS idx_processed_files_processed_at ON processed_files(processed_at);
        """)
        
        print("[+] Table 'processed_files' created successfully!")
        print("[+] Indexes created successfully!")
        
    except Exception as e:
        print(f"[-] Error: {e}")
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(create_table())
