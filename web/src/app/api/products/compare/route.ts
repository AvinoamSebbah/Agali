import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { barcodes, city } = await request.json();

    if (!barcodes || !Array.isArray(barcodes) || barcodes.length === 0) {
      return NextResponse.json(
        { error: 'Barcodes array is required' },
        { status: 400 }
      );
    }

    // Get all products with their prices
    const products = await prisma.product.findMany({
      where: {
        itemCode: {
          in: barcodes,
        },
      },
      include: {
        prices: {
          where: city ? {
            store: {
              city: city,
            },
          } : undefined,
          include: {
            store: {
              select: {
                chainId: true,
                chainName: true,
                storeId: true,
                storeName: true,
                city: true,
              },
            },
          },
          orderBy: {
            priceUpdateDate: 'desc',
          },
        },
        promotionItems: {
          include: {
            promotion: {
              include: {
                store: true,
              },
            },
          },
        },
      },
    });

    // Filter active promotions
    const now = new Date();
    const productsWithActivePromotions = products.map(product => ({
      ...product,
      promotionItems: product.promotionItems.filter(item => {
        const startDate = new Date(item.promotion.promotionStartDate);
        const endDate = new Date(item.promotion.promotionEndDate);
        const isActive = startDate <= now && endDate >= now;
        const matchesCity = city ? item.promotion.store.city === city : true;
        const isNotClubExclusive = item.promotion.clubId !== '2'; // Exclude club_id = '2'
        return isActive && matchesCity && isNotClubExclusive;
      }),
    }));

    // Group prices by store and calculate totals
    const storeComparison: Record<string, {
      chainName: string;
      storeName: string;
      city: string;
      total: number;
      items: Array<{
        barcode: string;
        name: string;
        price: number;
        hasPromo: boolean;
        promoPrice?: number;
      }>;
    }> = {};

    productsWithActivePromotions.forEach((product) => {
      product.prices.forEach((price) => {
        const storeKey = `${price.chainId}-${price.storeId}`;
        
        if (!storeComparison[storeKey]) {
          storeComparison[storeKey] = {
            chainName: price.store.chainName || '',
            storeName: price.store.storeName || '',
            city: price.store.city || '',
            total: 0,
            items: [],
          };
        }

        // Check for active promotion
        const activePromo = product.promotionItems.find(
          (pi) =>
            pi.promotion.chainId === price.chainId &&
            pi.promotion.storeId === price.storeId
        );

        const itemPrice = parseFloat(price.itemPrice || '0');
        const promoPrice = activePromo?.promotion.discountedPrice
          ? parseFloat(activePromo.promotion.discountedPrice)
          : null;

        const finalPrice = promoPrice || itemPrice;

        storeComparison[storeKey].items.push({
          barcode: product.itemCode,
          name: product.itemName || '',
          price: itemPrice,
          hasPromo: !!promoPrice,
          promoPrice: promoPrice || undefined,
        });

        storeComparison[storeKey].total += finalPrice;
      });
    });

    // Sort by total price
    const sortedStores = Object.entries(storeComparison)
      .map(([key, value]) => ({
        storeKey: key,
        ...value,
      }))
      .sort((a, b) => a.total - b.total);

    // Separate stores with all products vs incomplete stores
    const totalProductsRequested = barcodes.length;
    const completeStores = sortedStores.filter(
      store => store.items.length === totalProductsRequested
    );
    const incompleteStores = sortedStores.filter(
      store => store.items.length < totalProductsRequested
    ).map(store => {
      // Find which products are missing
      const missingBarcodes = barcodes.filter(
        barcode => !store.items.some(item => item.barcode === barcode)
      );
      return {
        ...store,
        missingProducts: missingBarcodes,
        missingCount: missingBarcodes.length,
      };
    });

    return NextResponse.json({
      products: productsWithActivePromotions,
      comparison: completeStores,
      incompleteStores: incompleteStores,
      cheapestStore: completeStores[0] || null,
    });
  } catch (error) {
    console.error('Compare error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
