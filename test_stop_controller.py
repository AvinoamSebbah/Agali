"""
Test du système d'arrêt multi-processus

Ce script démontre comment le StopController fonctionne dans un scénario
similaire au scraping réel.
"""
import time
import multiprocessing
from il_supermarket_scarper.utils.stop_controller import StopController


def download_worker(file_num):
    """Simule un téléchargement de fichier"""
    # Vérifier si arrêt demandé AVANT de commencer
    if StopController.should_stop():
        print(f"  ⏹️ Worker {file_num}: Arrêt détecté - skip download")
        return f"File {file_num}: STOPPED"
    
    print(f"  📥 Worker {file_num}: Début téléchargement...")
    
    # Simuler téléchargement (2 secondes)
    for i in range(4):
        time.sleep(0.5)
        # Vérifier pendant le téléchargement
        if StopController.should_stop():
            print(f"  ⏹️ Worker {file_num}: Arrêt détecté pendant download")
            return f"File {file_num}: INTERRUPTED"
    
    print(f"  ✅ Worker {file_num}: Téléchargement terminé")
    return f"File {file_num}: COMPLETED"


def main():
    """Test principal"""
    print("=== Test du StopController ===\n")
    
    # Nettoyer au démarrage
    StopController.clear_stop()
    print("1️⃣ StopController initialisé (clear_stop)")
    print(f"   Should stop? {StopController.should_stop()}\n")
    
    # Créer un pool de workers
    print("2️⃣ Lancement de 10 workers (comme le vrai scraper)...")
    print("   (chaque téléchargement prend ~2 secondes)\n")
    
    with multiprocessing.Pool(3) as pool:
        # Lancer les téléchargements en parallèle
        result_async = pool.map_async(download_worker, range(10))
        
        # Attendre 3 secondes puis simuler arrêt
        print("3️⃣ Attente de 3 secondes avant d'arrêter...\n")
        time.sleep(3)
        
        print("🛑 STOP DEMANDÉ (comme clic sur bouton GUI)!")
        StopController.request_stop()
        print(f"   Should stop? {StopController.should_stop()}\n")
        
        # Attendre que tous les workers se terminent
        print("4️⃣ Attente de fin des workers restants...\n")
        results = result_async.get()
    
    print("\n5️⃣ Résultats:")
    for result in results:
        print(f"   {result}")
    
    # Statistiques
    completed = sum(1 for r in results if "COMPLETED" in r)
    stopped = sum(1 for r in results if "STOPPED" in r)
    interrupted = sum(1 for r in results if "INTERRUPTED" in r)
    
    print(f"\n📊 Statistiques:")
    print(f"   ✅ Complétés: {completed}")
    print(f"   ⏹️ Arrêtés: {stopped}")
    print(f"   ⏸️ Interrompus: {interrupted}")
    
    # Nettoyer
    StopController.clear_stop()
    print(f"\n6️⃣ Nettoyage final - Should stop? {StopController.should_stop()}")
    
    print("\n✅ Test terminé!")
    print("\n💡 Résultat attendu:")
    print("   - Les 2-3 premiers workers se complètent")
    print("   - Les workers suivants sont arrêtés avant de commencer")
    print("   - Arrêt quasi-instantané après request_stop()")


if __name__ == "__main__":
    # Nécessaire sur Windows pour multiprocessing
    multiprocessing.freeze_support()
    main()
