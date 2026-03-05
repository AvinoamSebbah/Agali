"""
Script pour vider la base JSON du scraper (verified_downloads)
Utile quand vous avez vide le dossier dumps/ manuellement
"""
import json
from pathlib import Path
import shutil


def main():
    """Clear JSON database files"""
    dumps_folder = Path("dumps")
    
    if not dumps_folder.exists():
        print("[-] Dossier dumps inexistant")
        return
    
    total_cleared = 0
    
    print("[*] Recherche des bases JSON a vider...")
    
    # Scan each chain folder
    for chain_folder in dumps_folder.iterdir():
        if not chain_folder.is_dir():
            continue
        
        # Look for status folder
        status_folder = chain_folder / "status"
        if not status_folder.exists():
            continue
        
        # Look for verified_downloads JSON file
        verified_file = status_folder / "status_verified_downloads.json"
        if verified_file.exists():
            try:
                # Read current content to count entries
                with open(verified_file, 'r') as f:
                    data = json.load(f)
                    count = len(data) if isinstance(data, list) else len(data.keys()) if isinstance(data, dict) else 0
                
                # Clear the file (write empty list)
                with open(verified_file, 'w') as f:
                    json.dump([], f)
                
                total_cleared += count
                print(f"  [+] {chain_folder.name}: {count} entrees videes")
            except Exception as e:
                print(f"  [-] Erreur avec {chain_folder.name}: {e}")
    
    print(f"\n[+] Termine!")
    print(f"[+] Total d'entrees videes: {total_cleared}")
    print(f"\n[*] Le scraper peut maintenant re-telecharger les fichiers")


if __name__ == "__main__":
    main()
