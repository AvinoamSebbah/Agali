"""Test import of one Shufersal PromoFull file"""
import asyncio
from pathlib import Path
from import_xml_to_db import XMLDataImporter

async def test():
    importer = XMLDataImporter()
    await importer.connect()
    
    # Find first PromoFull file
    promo_files = list(Path("dumps/Shufersal").glob("PromoFull*.xml"))
    if promo_files:
        print(f"Testing with: {promo_files[0]}")
        await importer.import_promotions(promo_files[0])
    else:
        print("No PromoFull files found")
    
    await importer.disconnect()

if __name__ == "__main__":
    asyncio.run(test())
