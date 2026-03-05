"""
Test script pour vérifier l'intégration DB checker avec le scraper
"""
import asyncio
from il_supermarket_scarper.utils.db_checker import ProcessedFilesChecker, load_processed_files


def test_sync():
    """Test synchrone"""
    print("=== Test Synchrone ===")
    
    # Load processed files
    print("Chargement des fichiers traités...")
    load_processed_files()
    
    # Check how many files
    if ProcessedFilesChecker._processed_files:
        count = len(ProcessedFilesChecker._processed_files)
        print(f"✓ {count} fichiers traités chargés depuis la DB")
        
        # Show first 5
        if count > 0:
            print("\nPremiers fichiers traités:")
            for i, filename in enumerate(list(ProcessedFilesChecker._processed_files)[:5]):
                print(f"  {i+1}. {filename}")
    else:
        print("✗ Aucun fichier traité trouvé")
    
    # Test is_file_processed
    test_files = [
        "Stores7290027600007-000-202601040201.xml",
        "NonExistent123.xml"
    ]
    
    print("\nTest de vérification de fichiers:")
    for filename in test_files:
        is_processed = ProcessedFilesChecker.is_file_processed_sync(filename)
        status = "✓ TRAITÉ" if is_processed else "✗ NON TRAITÉ"
        print(f"  {filename}: {status}")
    
    # Test filter_unprocessed_files
    print("\nTest de filtrage:")
    all_files = [
        "Stores7290027600007-000-202601040201.xml",
        "NewFile1.xml",
        "NewFile2.xml",
        "StoresFull7290875100001-000-202601041022.aspx.xml",
    ]
    
    unprocessed = ProcessedFilesChecker.filter_unprocessed_files(all_files)
    print(f"  Fichiers testés: {len(all_files)}")
    print(f"  Fichiers à télécharger: {len(unprocessed)}")
    print(f"  Fichiers sautés: {len(all_files) - len(unprocessed)}")


if __name__ == "__main__":
    test_sync()
