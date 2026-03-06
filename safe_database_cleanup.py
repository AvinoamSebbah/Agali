"""
Script de nettoyage SÉCURISÉ de la base de données
RÈGLES STRICTES:
1. JAMAIS supprimer de produits - juste vérifier les doublons de barcode
2. Promotions: supprimer UNIQUEMENT si la date de fin est dépassée (dans le passé)
3. Prix: supprimer UNIQUEMENT les anciens prix quand il existe un plus récent pour le même article
4. Tout séparé par magasin
"""
import asyncio
from datetime import datetime
from prisma import Prisma
from collections import defaultdict
import sys


class SafeDatabaseCleaner:
    def __init__(self, dry_run=True):
        self.db = Prisma()
        self.dry_run = dry_run
        self.stats = {
            "duplicate_barcodes_found": 0,
            "expired_promotions": 0,
            "old_prices": 0,
        }
    
    async def connect(self):
        """Connexion à la base de données"""
        await self.db.connect()
        print("[✓] Connecté à la base de données PostgreSQL")
    
    async def disconnect(self):
        """Déconnexion de la base de données"""
        await self.db.disconnect()
        print("[✓] Déconnecté de la base de données")
    
    async def check_duplicate_barcodes(self):
        """
        VÉRIFIE (sans supprimer) les produits avec des barcodes dupliqués
        Les produits ne sont JAMAIS supprimés !
        """
        print("\n[→] Vérification des barcodes dupliqués (AUCUNE SUPPRESSION)...")
        
        # Récupérer tous les produits (Prisma Python ne supporte pas select dans find_many)
        all_products = await self.db.product.find_many()
        
        # Grouper par barcode (itemCode)
        barcode_groups = defaultdict(list)
        for product in all_products:
            if product.itemCode:
                barcode_groups[product.itemCode].append(product)
        
        # Afficher les doublons trouvés
        duplicates_found = 0
        for barcode, products in barcode_groups.items():
            if len(products) > 1:
                duplicates_found += len(products) - 1
                print(f"\n  ⚠️  Barcode dupliqué: {barcode}")
                for idx, product in enumerate(products, 1):
                    print(f"      {idx}. ID={product.id}, Nom={product.itemName[:50]}..., "
                          f"Créé={product.createdAt.strftime('%Y-%m-%d %H:%M')}")
        
        self.stats["duplicate_barcodes_found"] = duplicates_found
        
        if duplicates_found > 0:
            print(f"\n[!] {duplicates_found} doublons de barcode trouvés (AUCUNE SUPPRESSION)")
            print("    💡 Vous devrez les gérer manuellement si nécessaire")
        else:
            print("[✓] Aucun doublon de barcode trouvé")
    
    async def clean_expired_promotions(self):
        """
        Supprime les promotions EXPIRÉES uniquement (date de fin dans le passé)
        Ne touche PAS aux promotions futures ou en cours
        """
        print("\n[→] Nettoyage des promotions expirées...")
        
        # Date actuelle (aujourd'hui à minuit)
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Trouver les promotions expirées PAR MAGASIN
        # Prisma Python ne supporte pas select dans find_many — on prend tout
        stores = await self.db.store.find_many()
        
        total_deleted = 0
        
        for store in stores:
            # Compter les promotions expirées pour ce magasin
            expired_count = await self.db.promotion.count(
                where={
                    "storeId": store.id,
                    "promotionEndDate": {"lt": today}  # Strictement avant aujourd'hui
                }
            )
            
            if expired_count > 0:
                print(f"  📍 Magasin: {store.storeName} (ID: {store.id})")
                print(f"     Promotions expirées: {expired_count}")
                
                if not self.dry_run:
                    # Supprimer les promotions expirées
                    result = await self.db.promotion.delete_many(
                        where={
                            "storeId": store.id,
                            "promotionEndDate": {"lt": today}
                        }
                    )
                    total_deleted += result
                    print(f"     ✅ Supprimées: {result}")
                else:
                    total_deleted += expired_count
                    print(f"     [DRY-RUN] À supprimer: {expired_count}")
        
        self.stats["expired_promotions"] = total_deleted
        
        if total_deleted > 0:
            if self.dry_run:
                print(f"\n[DRY-RUN] {total_deleted} promotions expirées seraient supprimées")
            else:
                print(f"\n[✓] {total_deleted} promotions expirées supprimées")
        else:
            print("\n[✓] Aucune promotion expirée trouvée")
    
    async def clean_old_prices(self):
        """
        Supprime les anciens prix UNIQUEMENT s'il existe un prix plus récent
        pour le même article dans le même magasin
        Traité par magasin pour la sécurité
        """
        print("\n[→] Nettoyage des anciens prix (garde le plus récent par article/magasin)...")
        
        # Récupérer tous les magasins
        # Prisma Python ne supporte pas select dans find_many — on prend tout
        stores = await self.db.store.find_many()
        
        total_deleted = 0
        
        for store in stores:
            print(f"\n  📍 Magasin: {store.storeName} (ID: {store.id})")
            
            # Récupérer tous les prix pour ce magasin, triés par date décroissante
            prices = await self.db.price.find_many(
                where={"storeId": store.id},
                order={"priceUpdateDate": "desc"},  # Plus récent en premier
            )
            
            if not prices:
                print("     Aucun prix trouvé")
                continue
            
            # Grouper par itemCode
            price_groups = defaultdict(list)
            for price in prices:
                price_groups[price.itemCode].append(price)
            
            # Identifier les prix à supprimer (tous sauf le plus récent)
            ids_to_delete = []
            for item_code, item_prices in price_groups.items():
                if len(item_prices) > 1:
                    # Garder le premier (le plus récent), supprimer les autres
                    for old_price in item_prices[1:]:
                        ids_to_delete.append(old_price.id)
            
            if ids_to_delete:
                print(f"     Articles avec plusieurs prix: {len([g for g in price_groups.values() if len(g) > 1])}")
                print(f"     Anciens prix à supprimer: {len(ids_to_delete)}")
                
                if not self.dry_run:
                    # Supprimer les anciens prix
                    result = await self.db.price.delete_many(
                        where={"id": {"in": ids_to_delete}}
                    )
                    total_deleted += result
                    print(f"     ✅ Supprimés: {result}")
                else:
                    total_deleted += len(ids_to_delete)
                    print(f"     [DRY-RUN] À supprimer: {len(ids_to_delete)}")
            else:
                print("     ✅ Aucun ancien prix à supprimer")
        
        self.stats["old_prices"] = total_deleted
        
        if total_deleted > 0:
            if self.dry_run:
                print(f"\n[DRY-RUN] {total_deleted} anciens prix seraient supprimés")
            else:
                print(f"\n[✓] {total_deleted} anciens prix supprimés")
        else:
            print("\n[✓] Aucun ancien prix trouvé")
    
    async def print_statistics(self):
        """Affiche les statistiques de nettoyage"""
        print("\n" + "="*70)
        print("STATISTIQUES DE NETTOYAGE SÉCURISÉ")
        print("="*70)
        print(f"Doublons de barcode trouvés:           {self.stats['duplicate_barcodes_found']} (AUCUNE SUPPRESSION)")
        print(f"Promotions expirées supprimées:        {self.stats['expired_promotions']}")
        print(f"Anciens prix supprimés:                {self.stats['old_prices']}")
        print("="*70)
        
        total = self.stats['expired_promotions'] + self.stats['old_prices']
        print(f"TOTAL D'ENREGISTREMENTS SUPPRIMÉS:     {total}")
        print(f"PRODUITS SUPPRIMÉS:                    0 (JAMAIS !)")
        print("="*70 + "\n")
        
        if self.dry_run:
            print("⚠️  MODE DRY-RUN: Aucune suppression réelle effectuée")
            print("   Pour exécuter vraiment, lance: python safe_database_cleanup.py --execute")
        
        return self.stats
    
    async def run_safe_cleanup(self):
        """Exécute le nettoyage sécurisé de la base de données"""
        print("\n" + "="*70)
        print("NETTOYAGE SÉCURISÉ DE LA BASE DE DONNÉES")
        print("="*70)
        
        if self.dry_run:
            print("\n⚠️  MODE DRY-RUN - Aucune suppression réelle")
        else:
            print("\n⚠️  MODE EXECUTION - Suppressions réelles !")
        
        print("\nRÈGLES APPLIQUÉES:")
        print("  1. ✅ Produits: JAMAIS supprimés (juste vérification doublons)")
        print("  2. ✅ Promotions: supprimées si date de fin PASSÉE uniquement")
        print("  3. ✅ Prix: supprimés si un prix plus récent existe pour le même article")
        print("  4. ✅ Tout séparé par magasin\n")
        
        await self.connect()
        
        try:
            # 1. Vérifier les doublons de barcode (SANS SUPPRIMER)
            await self.check_duplicate_barcodes()
            
            # 2. Nettoyer les promotions expirées (par magasin)
            await self.clean_expired_promotions()
            
            # 3. Nettoyer les anciens prix (par magasin)
            await self.clean_old_prices()
            
            # Afficher les statistiques
            stats = await self.print_statistics()
            
            return stats
            
        except Exception as e:
            print(f"\n[✗] Erreur pendant le nettoyage: {e}")
            import traceback
            traceback.print_exc()
            return None
        
        finally:
            await self.disconnect()


async def main():
    """Fonction principale"""
    # Vérifier les arguments
    dry_run = "--execute" not in sys.argv
    
    cleaner = SafeDatabaseCleaner(dry_run=dry_run)
    
    if not dry_run:
        # En mode CI (GitHub Actions), pas de prompt interactif
        # La confirmation se fait via le flag --execute dans le workflow
        print("\n⚠️  MODE EXECUTION — Suppressions réelles activées via --execute")
    
    stats = await cleaner.run_safe_cleanup()
    
    if stats is not None:
        print("\n[✓] Nettoyage terminé avec succès!")
        return 0
    else:
        print("\n[✗] Le nettoyage a échoué")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
