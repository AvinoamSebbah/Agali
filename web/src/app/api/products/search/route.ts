import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Calculate similarity score between two strings
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// Levenshtein distance (edit distance)
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

// Calculate search relevance score
function calculateRelevanceScore(product: any, searchTerms: string[]): number {
  const itemName = (product.itemName || '').toLowerCase();
  const manufacturerName = (product.manufacturerName || '').toLowerCase();
  const itemCode = product.itemCode || '';
  const itemWords = itemName.split(/\s+/);
  
  let score = 0;
  let matchedTerms = 0;
  
  // Exact barcode match - highest priority
  if (searchTerms.some(term => itemCode.includes(term))) {
    return 10000;
  }
  
  // Each search term must match at least one word in the product
  for (const term of searchTerms) {
    const lowerTerm = term.toLowerCase();
    let termMatched = false;
    let bestMatchScore = 0;
    
    // Try to match with each word in the product name
    for (const word of itemWords) {
      if (word === lowerTerm) {
        // Exact match
        bestMatchScore = Math.max(bestMatchScore, 100);
        termMatched = true;
      } else if (word.includes(lowerTerm) && lowerTerm.length >= 3) {
        // Word contains the search term (and term is at least 3 chars)
        bestMatchScore = Math.max(bestMatchScore, 60);
        termMatched = true;
      } else if (lowerTerm.includes(word) && word.length >= 3) {
        // Search term contains the word (and word is at least 3 chars)
        bestMatchScore = Math.max(bestMatchScore, 40);
        termMatched = true;
      } else {
        // Fuzzy match for typos - very strict threshold
        const sim = similarity(word, lowerTerm);
        if (sim > 0.85 && Math.min(word.length, lowerTerm.length) >= 3) {
          bestMatchScore = Math.max(bestMatchScore, Math.floor(sim * 30));
          termMatched = true;
        }
      }
    }
    
    // Check manufacturer if term didn't match in name
    if (!termMatched && manufacturerName.includes(lowerTerm)) {
      bestMatchScore = 25;
      termMatched = true;
    }
    
    if (termMatched) {
      score += bestMatchScore;
      matchedTerms++;
    }
  }
  
  // CRITICAL: Product must match ALL search terms
  if (matchedTerms < searchTerms.length) {
    return 0; // Disqualify products that don't match all terms
  }
  
  return score;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '5');
    const city = searchParams.get('city');
    const skip = (page - 1) * limit;

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Split search query into terms for better matching
    const searchTerms = query.trim().split(/\s+/).filter(t => t.length > 0);
    
    // Build search condition: product name must contain at least one search term
    // We'll do strict filtering in the scoring phase
    const searchConditions = searchTerms.map(term => ({
      itemName: { contains: term, mode: 'insensitive' as const }
    }));

    // Search products - require ALL terms to match in the database query
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          AND: searchConditions, // Changed from OR to AND - all terms must match
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
                  id: true,
                  chainId: true,
                  storeId: true,
                  chainName: true,
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
        skip: 0,
        take: Math.min(limit * 5, 50), // Get more results for better scoring
        orderBy: {
          itemName: 'asc',
        },
      }),
      prisma.product.count({
        where: {
          OR: searchConditions,
        },
      }),
    ]);

    // Filter active promotions in the application layer
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

    // Calculate relevance scores and sort by relevance
    const scoredProducts = productsWithActivePromotions
      .filter(product => product.prices.length > 0) // Only show products with prices
      .map(product => ({
        ...product,
        _score: calculateRelevanceScore(product, searchTerms),
      }))
      .filter(p => p._score > 0); // Remove products with 0 score (didn't match all terms)

    // Sort by relevance score (highest first)
    scoredProducts.sort((a, b) => b._score - a._score);

    // Apply pagination after sorting
    const paginatedProducts = scoredProducts
      .slice(skip, skip + limit)
      .map(({ _score, ...product }) => product);

    return NextResponse.json({
      products: paginatedProducts,
      pagination: {
        page,
        limit,
        total: scoredProducts.length,
        totalPages: Math.ceil(scoredProducts.length / limit),
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
