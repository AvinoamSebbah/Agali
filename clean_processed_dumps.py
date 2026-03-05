"""
Script pour supprimer les fichiers dumps déjà traités
"""
import asyncio
from pathlib import Path
from prisma import Prisma


async def main():
    """Clean processed files from dumps folder"""
    db = Prisma()
    await db.connect()
    
    print("[*] Chargement des fichiers traites depuis la DB...")
    
    # Load processed files from database
    result = await db.query_raw("SELECT file_name FROM processed_files")
    processed_files = {row['file_name'] for row in result}
    
    print(f"[*] Trouve {len(processed_files)} fichiers traites en base")
    
    # Scan dumps folder
    dumps_folder = Path("dumps")
    if not dumps_folder.exists():
        print("[-] Dossier dumps inexistant")
        await db.disconnect()
        return
    
    deleted_count = 0
    total_size = 0
    
    print("\n[*] Recherche des fichiers a supprimer...")
    
    for chain_folder in dumps_folder.iterdir():
        if not chain_folder.is_dir() or chain_folder.name == "status":
            continue
        
        for xml_file in chain_folder.glob("*.xml"):
            if xml_file.name in processed_files:
                file_size = xml_file.stat().st_size
                total_size += file_size
                xml_file.unlink()
                deleted_count += 1
                if deleted_count % 50 == 0:
                    print(f"  [*] Supprime {deleted_count} fichiers jusqu'a present...")
    
    await db.disconnect()
    
    # Format size
    size_mb = total_size / (1024 * 1024)
    print(f"\n[+] Termine!")
    print(f"[+] Fichiers supprimes: {deleted_count}")
    print(f"[+] Espace libere: {size_mb:.2f} MB")


if __name__ == "__main__":
    asyncio.run(main())
