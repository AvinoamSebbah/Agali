import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/compare - Compare prices across stores
router.post('/', async (req, res) => {
  try {
    const { products } = req.body;
    const { city } = req.query;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Products array required' });
    }

    const barcodes = products.map((p: any) => p.itemCode);

    // Get all prices for these products
    const prices = await prisma.price.findMany({
      where: {
        itemCode: { in: barcodes },
        store: city ? { city: city as string } : undefined
      },
      include: {
        product: true,
        store: true
      }
    });

    // Get all promotions for these products
    const promotions = await prisma.promotion.findMany({
      where: {
        items: {
          some: {
            itemCode: { in: barcodes }
          }
        },
        clubId: {
          not: '2'
        },
        promotionEndDate: {
          gte: new Date()
        },
        store: city ? { city: city as string } : undefined
      },
      include: {
        store: true,
        items: true
      }
    });

    // Group by store and calculate totals
    const storeMap = new Map<number, any>();

    for (const price of prices) {
      const storeId = price.store.id;
      const productQuantity = products.find(p => p.itemCode === price.itemCode)?.quantity || 1;

      if (!storeMap.has(storeId)) {
        storeMap.set(storeId, {
          storeId: price.store.id,
          storeName: price.store.storeName,
          chainName: price.store.chainName,
          city: price.store.city,
          totalPrice: 0,
          items: []
        });
      }

      const store = storeMap.get(storeId)!;
      const originalPrice = parseFloat(price.itemPrice || '0');

      // Check if there's a promo
      const promo = promotions.find(p =>
        p.store.id === storeId &&
        p.items.some(i => i.itemCode === price.itemCode)
      );

      const finalPrice = promo && promo.discountedPrice
        ? parseFloat(promo.discountedPrice)
        : originalPrice;

      store.items.push({
        itemCode: price.itemCode,
        itemName: price.product.itemName,
        price: finalPrice,
        quantity: productQuantity,
        hasPromo: !!promo,
        originalPrice: promo ? originalPrice : undefined
      });

      store.totalPrice += finalPrice * productQuantity;
    }

    // Convert to array and sort by total price
    const stores = Array.from(storeMap.values())
      .filter(store => store.items.length === products.length) // Only stores with all products
      .sort((a, b) => a.totalPrice - b.totalPrice);

    res.json({ stores });
  } catch (error) {
    console.error('Compare error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
