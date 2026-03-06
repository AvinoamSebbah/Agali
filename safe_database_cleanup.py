"""
Script de nettoyage SÉCURISÉ de la base de données
RÈGLES STRICTES:
1. JAMAIS supprimer de produits - juste vérifier les doublons de barcode
2. Promotions: supprimer UNIQUEMENT si la date de fin est dépassée (dans le passé)
3. Prix: supprimer UNIQUEMENT les anciens prix quand il existe un plus récent pour le même article
4. Tout avec du SQL direct pour éviter les bugs Prisma Python
"""
import asyncio
from datetime import datetime, timezone
from prisma import Prisma
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
        await self.db.connect()
        print("[✓] Connecté à la base de données PostgreSQL")

    async def disconnect(self):
        await self.db.disconnect()
        print("[✓] Déconnecté de la base de données")

    async def check_duplicate_barcodes(self):
        """VÉRIFIE (sans supprimer) les produits avec des barcodes dupliqués"""
        print("\n[→] Vérification des barcodes dupliqués (AUCUNE SUPPRESSION)...")

        result = await self.db.query_raw("""
            SELECT item_code, COUNT(*) as cnt
            FROM products
            WHERE item_code IS NOT NULL
            GROUP BY item_code
            HAVING COUNT(*) > 1
        """)

        if result:
            self.stats["duplicate_barcodes_found"] = sum(r["cnt"] - 1 for r in result)
            print(f"[!] {len(result)} barcodes avec doublons :")
            for r in result[:20]:  # Affiche max 20
                print(f"    - {r['item_code']} : {r['cnt']} occurrences")
            if len(result) > 20:
                print(f"    ... et {len(result) - 20} autres")
        else:
            print("[✓] Aucun doublon de barcode trouvé")

    async def clean_expired_promotions(self):
        """Supprime les promotions EXPIRÉES uniquement (date de fin dans le passé)"""
        print("\n[→] Nettoyage des promotions expirées...")

        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # Compter les promos expirées
        count_result = await self.db.query_raw(f"""
            SELECT COUNT(*) as cnt FROM promotions
            WHERE promotion_end_date < '{today}'::date
        """)
        expired_count = count_result[0]["cnt"] if count_result else 0

        print(f"  Promotions expirées trouvées: {expired_count}")

        if expired_count > 0:
            # Détail par chaîne
            detail = await self.db.query_raw(f"""
                SELECT chain_id, COUNT(*) as cnt
                FROM promotions
                WHERE promotion_end_date < '{today}'::date
                GROUP BY chain_id
                ORDER BY cnt DESC
                LIMIT 10
            """)
            for row in detail:
                print(f"    - Chaîne {row['chain_id']}: {row['cnt']} promos expirées")

            if not self.dry_run:
                # Supprimer d'abord les promotion_items liés (FK cascade)
                await self.db.execute_raw(f"""
                    DELETE FROM promotion_items
                    WHERE promotion_id IN (
                        SELECT id FROM promotions
                        WHERE promotion_end_date < '{today}'::date
                    )
                """)
                # Puis les promotions
                result = await self.db.execute_raw(f"""
                    DELETE FROM promotions
                    WHERE promotion_end_date < '{today}'::date
                """)
                print(f"  ✅ {expired_count} promotions expirées supprimées")
            else:
                print(f"  [DRY-RUN] {expired_count} promotions expirées seraient supprimées")

        self.stats["expired_promotions"] = expired_count

    async def clean_old_prices(self):
        """
        Supprime les anciens prix — garde uniquement le plus récent
        par (chain_id, store_id, item_code)
        """
        print("\n[→] Nettoyage des anciens prix (garde le plus récent par article/magasin)...")

        # Compter les doublons de prix
        count_result = await self.db.query_raw("""
            SELECT COUNT(*) as cnt FROM prices p
            WHERE EXISTS (
                SELECT 1 FROM prices p2
                WHERE p2.chain_id = p.chain_id
                  AND p2.store_id = p.store_id
                  AND p2.item_code = p.item_code
                  AND p2.price_update_date > p.price_update_date
            )
        """)
        old_count = count_result[0]["cnt"] if count_result else 0

        print(f"  Anciens prix (avec version plus récente): {old_count}")

        if old_count > 0:
            if not self.dry_run:
                result = await self.db.execute_raw("""
                    DELETE FROM prices p
                    WHERE EXISTS (
                        SELECT 1 FROM prices p2
                        WHERE p2.chain_id = p.chain_id
                          AND p2.store_id = p.store_id
                          AND p2.item_code = p.item_code
                          AND p2.price_update_date > p.price_update_date
                    )
                """)
                print(f"  ✅ {old_count} anciens prix supprimés")
            else:
                print(f"  [DRY-RUN] {old_count} anciens prix seraient supprimés")

        self.stats["old_prices"] = old_count

    async def print_db_summary(self):
        """Affiche un résumé de la base de données"""
        print("\n" + "="*60)
        print("RÉSUMÉ DE LA BASE DE DONNÉES")
        print("="*60)

        tables = [
            ("stores", "Magasins"),
            ("products", "Produits"),
            ("prices", "Prix"),
            ("promotions", "Promotions"),
            ("promotion_items", "Items de promotion"),
            ("processed_files", "Fichiers traités"),
        ]
        for table, label in tables:
            try:
                result = await self.db.query_raw(f"SELECT COUNT(*) as cnt FROM {table}")
                count = result[0]["cnt"] if result else 0
                print(f"  {label:<25}: {count:>10,}")
            except Exception:
                print(f"  {label:<25}: (erreur)")
        print("="*60)

    async def print_statistics(self):
        print("\n" + "="*60)
        print("STATISTIQUES DU NETTOYAGE")
        print("="*60)
        print(f"  Doublons barcode trouvés  : {self.stats['duplicate_barcodes_found']} (AUCUNE SUPPRESSION)")
        print(f"  Promotions expirées       : {self.stats['expired_promotions']}")
        print(f"  Anciens prix              : {self.stats['old_prices']}")
        total = self.stats["expired_promotions"] + self.stats["old_prices"]
        print(f"  TOTAL SUPPRIMÉ            : {total}")
        print(f"  Produits supprimés        : 0 (JAMAIS !)")
        print("="*60)
        if self.dry_run:
            print("\n⚠️  MODE DRY-RUN: Aucune suppression réelle effectuée")
            print("   Pour exécuter vraiment: python safe_database_cleanup.py --execute")
        return self.stats

    async def run_safe_cleanup(self):
        print("\n" + "="*60)
        print("NETTOYAGE SÉCURISÉ DE LA BASE DE DONNÉES")
        print("="*60)

        if self.dry_run:
            print("\n⚠️  MODE DRY-RUN - Aucune suppression réelle")
        else:
            print("\n⚠️  MODE EXECUTION - Suppressions réelles !")

        print("\nRÈGLES APPLIQUÉES:")
        print("  1. ✅ Produits: JAMAIS supprimés")
        print("  2. ✅ Promotions: supprimées si date de fin PASSÉE uniquement")
        print("  3. ✅ Prix: supprimés si un prix plus récent existe\n")

        await self.connect()

        try:
            await self.print_db_summary()
            await self.check_duplicate_barcodes()
            await self.clean_expired_promotions()
            await self.clean_old_prices()
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
    dry_run = "--execute" not in sys.argv

    if not dry_run:
        print("\n⚠️  MODE EXECUTION — Suppressions réelles activées via --execute")

    cleaner = SafeDatabaseCleaner(dry_run=dry_run)
    stats = await cleaner.run_safe_cleanup()

    if stats is not None:
        print("\n[✓] Nettoyage terminé avec succès!")
        return 0
    else:
        print("\n[✗] Le nettoyage a échoué")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
