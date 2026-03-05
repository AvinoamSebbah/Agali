import asyncio
from prisma import Prisma

async def main():
    db = Prisma()
    await db.connect()
    
    print("[*] Suppression des donnees dans le bon ordre...")
    
    # IMPORTANT: Supprimer dans l'ordre inverse des dépendances
    # 1. D'abord les tables enfants
    print("  [-] Suppression des promotion_items...")
    await db.promotionitem.delete_many()
    
    print("  [-] Suppression des prices...")
    await db.price.delete_many()
    
    print("  [-] Suppression des promotions...")
    await db.promotion.delete_many()
    
    # 2. Ensuite les tables sans dépendances vers d'autres
    print("  [-] Suppression des products...")
    await db.product.delete_many()
    
    print("  [-] Suppression des stores...")
    await db.store.delete_many()
    
    print("  [-] Suppression des processed_files...")
    try:
        await db.execute_raw("DELETE FROM processed_files")
    except:
        pass  # Table might not exist
    
    await db.disconnect()
    print("[+] Base de donnees videe!")

if __name__ == "__main__":
    asyncio.run(main())
