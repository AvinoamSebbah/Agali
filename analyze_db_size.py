"""
Analyse de la taille et de l'obsolescence des données
"""
import asyncio
import os
from datetime import datetime, timedelta
from prisma import Prisma

async def analyze():
    db = Prisma()
    await db.connect()
    
    print("\n" + "="*60)
    print("📊 ANALYSE DE LA BASE DE DONNÉES")
    print("="*60)
    
    # Totaux
    total_promotions = await db.promotion.count()
    total_promo_items = await db.promotionitem.count()
    total_prices = await db.price.count()
    total_products = await db.product.count()
    total_stores = await db.store.count()
    
    print(f"\n[TOTAUX ACTUELS]")
    print(f"  Stores:          {total_stores:,}")
    print(f"  Products:        {total_products:,}")
    print(f"  Prices:          {total_prices:,}")
    print(f"  Promotions:      {total_promotions:,}")
    print(f"  Promotion Items: {total_promo_items:,}")
    
    # Promos expirées
    today = datetime.now()
    expired_7_days = today - timedelta(days=7)
    expired_30_days = today - timedelta(days=30)
    
    expired_promos_7d = await db.promotion.count(
        where={'promotionEndDate': {'lt': expired_7_days}}
    )
    
    expired_promos_30d = await db.promotion.count(
        where={'promotionEndDate': {'lt': expired_30_days}}
    )
    
    active_promos = await db.promotion.count(
        where={'promotionEndDate': {'gte': today}}
    )
    
    print(f"\n[PROMOTIONS PAR STATUT]")
    print(f"  Actives (≥ aujourd'hui):     {active_promos:,}")
    print(f"  Expirées < 7 jours:          {expired_promos_7d:,}")
    print(f"  Expirées < 30 jours:         {expired_promos_30d:,}")
    
    # Prix par âge
    old_prices_7d = await db.price.count(
        where={'priceUpdateDate': {'lt': expired_7_days}}
    )
    
    old_prices_30d = await db.price.count(
        where={'priceUpdateDate': {'lt': expired_30_days}}
    )
    
    recent_prices = await db.price.count(
        where={'priceUpdateDate': {'gte': expired_7_days}}
    )
    
    print(f"\n[PRIX PAR ÂGE]")
    print(f"  Récents (< 7 jours):     {recent_prices:,}")
    print(f"  Anciens (> 7 jours):     {old_prices_7d:,}")
    print(f"  Très anciens (> 30j):    {old_prices_30d:,}")
    
    # Estimation de réduction
    if expired_promos_7d > 0:
        # Ratio moyen items par promo
        items_per_promo = total_promo_items / total_promotions if total_promotions > 0 else 0
        promo_items_to_delete = int(expired_promos_7d * items_per_promo)
        
        print(f"\n[ESTIMATION NETTOYAGE (> 7 jours)]")
        print(f"  Promotions à supprimer:      {expired_promos_7d:,} ({expired_promos_7d/total_promotions*100:.1f}%)")
        print(f"  Promotion items supprimés:   {promo_items_to_delete:,} ({promo_items_to_delete/total_promo_items*100:.1f}%)")
        print(f"  Prix à supprimer:            {old_prices_7d:,} ({old_prices_7d/total_prices*100:.1f}%)")
        
        new_promo_total = total_promotions - expired_promos_7d
        new_promo_items = total_promo_items - promo_items_to_delete
        new_prices = total_prices - old_prices_7d
        
        print(f"\n[APRÈS NETTOYAGE]")
        print(f"  Promotions:      {new_promo_total:,}")
        print(f"  Promotion Items: {new_promo_items:,}")
        print(f"  Prices:          {new_prices:,}")
        
        print(f"\n[PROJECTION 20 MAGASINS]")
        # Bareket = 90%, RamiLevy = 40% des données actuelles
        # Donc ~1.3 chains actuellement, besoin de ×15 multiplier
        multiplier = 20 / 1.3
        
        print(f"  Promotions:      {int(new_promo_total * multiplier):,}")
        print(f"  Promotion Items: {int(new_promo_items * multiplier):,}")
        print(f"  Prices:          {int(new_prices * multiplier):,}")
        print(f"  Products:        {int(total_products * multiplier):,}")
        print(f"  Stores:          {int(total_stores * multiplier):,}")
    
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(analyze())
