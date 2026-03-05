"""
Test du scraper avec l'intégration DB
Lance un scrape de test avec Cofix (petit scraper)
"""
from il_supermarket_scarper.scrapper_runner import MainScrapperRunner


def test_scraper_with_db():
    """Test le scraper avec la vérification DB"""
    print("=" * 60)
    print("TEST SCRAPER AVEC VÉRIFICATION DB")
    print("=" * 60)
    
    runner = MainScrapperRunner(
        enabled_scrapers=["Cofix"],  # Petit scraper pour test rapide
        lookup_in_db=True,  # Active la vérification DB
        multiprocessing=1  # Un seul process pour voir les logs
    )
    
    print("\n🚀 Démarrage du scrape...")
    print("Le scraper va:")
    print("  1. Charger les fichiers traités depuis PostgreSQL")
    print("  2. Scanner le site Cofix")
    print("  3. Sauter les fichiers déjà dans la DB")
    print("  4. Télécharger seulement les nouveaux fichiers")
    print("\n" + "-" * 60 + "\n")
    
    result = runner.run(
        limit=10,  # Limite à 10 fichiers pour le test
        files_types=None,
        when_date=False,
        suppress_exception=False
    )
    
    print("\n" + "-" * 60)
    print("✅ Test terminé!")
    print(f"Résultats: {result}")


if __name__ == "__main__":
    test_scraper_with_db()
