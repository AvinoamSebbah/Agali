import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ─── Levenshtein relevance scoring ──────────────────────────────────────────

function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function calculateRelevanceScore(product: any, searchTerms: string[]): number {
  const itemName = (product.itemName || '').toLowerCase();
  const manufacturerName = (product.manufacturerName || '').toLowerCase();
  const itemCode = product.itemCode || '';
  const itemWords = itemName.split(/\s+/);

  let score = 0;
  let matchedTerms = 0;

  if (searchTerms.some(term => itemCode.includes(term))) return 10000;

  for (const term of searchTerms) {
    const lowerTerm = term.toLowerCase();
    let termMatched = false;
    let bestMatchScore = 0;

    for (const word of itemWords) {
      if (word === lowerTerm) {
        bestMatchScore = Math.max(bestMatchScore, 100);
        termMatched = true;
      } else if (word.includes(lowerTerm) && lowerTerm.length >= 3) {
        bestMatchScore = Math.max(bestMatchScore, 60);
        termMatched = true;
      } else if (lowerTerm.includes(word) && word.length >= 3) {
        bestMatchScore = Math.max(bestMatchScore, 40);
        termMatched = true;
      } else {
        const sim = similarity(word, lowerTerm);
        if (sim > 0.85 && Math.min(word.length, lowerTerm.length) >= 3) {
          bestMatchScore = Math.max(bestMatchScore, Math.floor(sim * 30));
          termMatched = true;
        }
      }
    }

    if (!termMatched && manufacturerName.includes(lowerTerm)) {
      bestMatchScore = 25;
      termMatched = true;
    }

    if (termMatched) {
      score += bestMatchScore;
      matchedTerms++;
    }
  }

  if (matchedTerms < searchTerms.length) return 0;
  return score;
}

// ─── GET /api/products/search ────────────────────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const { q, page = '1', limit = '10', city } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 10, 50);
    const skip = (pageNum - 1) * limitNum;

    const searchTerms = q.trim().split(/\s+/).filter(t => t.length > 0);
    const searchConditions = searchTerms.map(term => ({
      itemName: { contains: term, mode: 'insensitive' as const },
    }));

    const products = await prisma.product.findMany({
      where: { AND: searchConditions },
      include: {
        prices: {
          where: city ? { store: { city: city as string } } : undefined,
          include: {
            store: {
              select: {
                id: true,
                chainId: true,
                storeId: true,
                chainName: true,
                storeName: true,
                city: true,
              },
            },
          },
          orderBy: { priceUpdateDate: 'desc' },
        },
        promotionItems: {
          include: {
            promotion: {
              include: {
                store: {
                  select: {
                    id: true,
                    chainId: true,
                    storeId: true,
                    chainName: true,
                    storeName: true,
                    city: true,
                  },
                },
              },
            },
          },
        },
      },
      take: Math.min(limitNum * 5, 200),
      orderBy: { itemName: 'asc' },
    });

    const now = new Date();
    const withActivePromos = products.map(product => ({
      ...product,
      promotionItems: product.promotionItems.filter(item => {
        const startDate = new Date(item.promotion.promotionStartDate);
        const endDate = new Date(item.promotion.promotionEndDate);
        const isActive = startDate <= now && endDate >= now;
        const matchesCity = city ? item.promotion.store.city === city : true;
        const isNotClubExclusive = item.promotion.clubId !== '2';
        return isActive && matchesCity && isNotClubExclusive;
      }),
    }));

    const scored = withActivePromos
      .filter(p => p.prices.length > 0)
      .map(p => ({ ...p, _score: calculateRelevanceScore(p, searchTerms) }))
      .filter(p => p._score > 0)
      .sort((a, b) => b._score - a._score);

    const paginated = scored
      .slice(skip, skip + limitNum)
      .map(({ _score, ...p }) => p);

    return res.json({
      products: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: scored.length,
        totalPages: Math.ceil(scored.length / limitNum),
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Internal server error', detail: String(error) });
  }
});

// ─── GET /api/products/:barcode ───────────────────────────────────────────────
router.get('/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;
    const { city } = req.query;

    const product = await prisma.product.findUnique({
      where: { itemCode: barcode },
      include: {
        prices: {
          where: city ? { store: { city: city as string } } : undefined,
          include: { store: true },
          orderBy: { itemPrice: 'asc' },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const promotions = await prisma.promotion.findMany({
      where: {
        items: { some: { itemCode: barcode } },
        clubId: { not: '2' },
        promotionEndDate: { gte: new Date() },
        store: city ? { city: city as string } : undefined,
      },
      include: { store: true },
    });

    return res.json({ product, prices: product.prices, promotions });
  } catch (error) {
    console.error('Product detail error:', error);
    return res.status(500).json({ error: 'Internal server error', detail: String(error) });
  }
});

export default router;
