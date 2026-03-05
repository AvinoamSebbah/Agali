'use client';

import { useState, useEffect } from 'react';
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { FiSearch, FiArrowLeft, FiArrowRight, FiTag, FiShoppingCart } from 'react-icons/fi';
import { Header } from '@/components/Header';
import { useLocation } from '@/contexts/LocationContext';
import toast from 'react-hot-toast';

interface Product {
  id: number;
  itemCode: string;
  itemName: string;
  manufacturerName: string;
  prices: Array<{
    id: number;
    itemPrice: string;
    store: {
      id: number;
      chainId: string;
      storeId: string;
      chainName: string;
      storeName: string;
      city: string;
    };
  }>;
  promotionItems: Array<{
    promotion: {
      id: number;
      promotionDescription: string;
      discountedPrice: string;
      minQty: string;
      rewardType: string;
      store: {
        id: number;
        chainId: string;
        storeId: string;
        chainName: string;
        storeName: string;
        city: string;
      };
    };
  }>;
}

interface PriceDisplay {
  storeId: number;
  storeName: string;
  chainName: string;
  city: string;
  regularPrice: number;
  promoPrice?: number;
  promoDescription?: string;
  promoMinQty?: number;
  hasPromo: boolean;
  effectivePrice: number;
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentQuery, setCurrentQuery] = useState('');
  const [page, setPage] = useState(1);
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [expandedStores, setExpandedStores] = useState<Record<number, boolean>>({});
  const { selectedCity } = useLocation();

  // Helper function to merge prices with promotions
  const mergePricesWithPromotions = (product: Product): PriceDisplay[] => {
    // Use chainId + storeId as unique key to identify same store
    const priceMap = new Map<string, PriceDisplay>();

    // Add all regular prices
    product.prices.forEach(price => {
      const storeKey = `${price.store.chainId}-${price.store.storeId}`;
      priceMap.set(storeKey, {
        storeId: price.store.id,
        storeName: price.store.storeName,
        chainName: price.store.chainName,
        city: price.store.city,
        regularPrice: parseFloat(price.itemPrice || '0'),
        hasPromo: false,
        effectivePrice: parseFloat(price.itemPrice || '0'),
      });
    });

    // Merge promotions for SAME store only
    product.promotionItems.forEach(item => {
      const storeKey = `${item.promotion.store.chainId}-${item.promotion.store.storeId}`;
      const existing = priceMap.get(storeKey);
      
      if (existing && item.promotion.discountedPrice) {
        const promoPrice = parseFloat(item.promotion.discountedPrice);
        const minQty = parseFloat(item.promotion.minQty || '1');
        const pricePerUnit = minQty > 1 ? promoPrice / minQty : promoPrice;
        
        if (pricePerUnit > 0 && pricePerUnit < existing.regularPrice) {
          existing.promoPrice = pricePerUnit;
          existing.promoDescription = item.promotion.promotionDescription;
          existing.promoMinQty = minQty;
          existing.hasPromo = true;
          existing.effectivePrice = pricePerUnit;
        }
      }
    });

    // Sort by effective price (cheapest first)
    return Array.from(priceMap.values()).sort((a, b) => a.effectivePrice - b.effectivePrice);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['products', currentQuery, page, selectedCity],
    queryFn: async () => {
      if (!currentQuery) return null;
      const cityParam = selectedCity ? `&city=${encodeURIComponent(selectedCity)}` : '';
      const res = await fetch(
        `/api/products/search?q=${encodeURIComponent(currentQuery)}&page=${page}&limit=5${cityParam}`
      );
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: !!currentQuery,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentQuery(searchQuery);
    setPage(1);
  };

  const fetchProductImage = async (barcode: string) => {
    if (productImages[barcode] !== undefined) return;
    
    // Set a loading state
    setProductImages(prev => ({ ...prev, [barcode]: 'loading' }));
    
    try {
      const res = await fetch(`/api/products/image/${barcode}`);
      const data = await res.json();
      setProductImages(prev => ({ 
        ...prev, 
        [barcode]: data.imageUrl || '' 
      }));
    } catch (error) {
      console.error('Failed to fetch image:', error);
      setProductImages(prev => ({ ...prev, [barcode]: '' }));
    }
  };

  // Fetch images when products change
  React.useEffect(() => {
    if (data?.products) {
      data.products.forEach((product: Product) => {
        fetchProductImage(product.itemCode);
      });
    }
  }, [data?.products]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300 page-transition">
      <Header showLocation={true} />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">חיפוש מוצרים</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">מצאו את המוצר שאתם מחפשים והשוו מחירים בין הרשתות</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חפשו מוצר לפי שם או ברקוד..."
              className="w-full px-6 py-4 pr-14 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-2xl focus:border-primary-500 dark:focus:border-primary-600 focus:outline-none shadow-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <button
              type="submit"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-primary-600 dark:bg-primary-700 text-white p-3 rounded-xl hover:bg-primary-700 dark:hover:bg-primary-800 transition-colors"
            >
              <FiSearch size={24} />
            </button>
          </div>
        </form>

        {/* Results */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-primary-500 dark:border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-300">מחפש מוצרים...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <div className="bg-red-50 text-red-600 px-6 py-4 rounded-lg inline-block">
              שגיאה בחיפוש. נסו שוב.
            </div>
          </div>
        )}

        {data && data.products && (
          <>
            <div className="mb-6 text-gray-600">
              נמצאו {data.pagination.total} תוצאות
            </div>

            <div className="space-y-6">
              {data.products.map((product: Product) => {
                const imageUrl = productImages[product.itemCode];
                const isLoadingImage = imageUrl === 'loading';

                const mergedPrices = mergePricesWithPromotions(product);
                const minPrice = mergedPrices.length > 0
                  ? mergedPrices[0].effectivePrice // Already sorted by effective price
                  : 0;

                const hasPromo = product.promotionItems.length > 0;

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-6"
                  >
                    <div className="flex gap-6">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        <div className="w-32 h-32 bg-gray-100 rounded-xl overflow-hidden relative">
                          {isLoadingImage ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                          ) : imageUrl && imageUrl !== '' ? (
                            <Image
                              src={imageUrl}
                              alt={product.itemName || ''}
                              fill
                              className="object-contain"
                              onError={() => {
                                setProductImages(prev => ({ ...prev, [product.itemCode]: '' }));
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                              <div className="text-3xl mb-1">📦</div>
                              <div className="text-xs">אין תמונה</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                          {product.itemName || 'ללא שם'}
                        </h3>
                        <p className="text-gray-600 mb-1">
                          יצרן: {product.manufacturerName || 'לא ידוע'}
                        </p>
                        <p className="text-sm text-gray-500 mb-4 font-mono">
                          ברקוד: {product.itemCode}
                        </p>

                        {/* Promotion Badge */}
                        {hasPromo && (
                          <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold mb-4">
                            <FiTag />
                            <span>במבצע!</span>
                          </div>
                        )}

                        {/* Price Range */}
                        {product.prices.length > 0 && (
                          <div className="mb-4">
                            <div className="text-3xl font-bold text-primary-600">
                              ₪{minPrice.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-500">
                              מחיר מינימום מבין {product.prices.length} חנויות
                            </div>
                          </div>
                        )}

                        {/* Stores */}
                        <div className="space-y-2">
                          <h4 className="font-semibold text-gray-700 mb-2">מחירים בחנויות:</h4>
                          <div className="grid md:grid-cols-2 gap-3">
                            {(() => {
                              const mergedPrices = mergePricesWithPromotions(product);
                              const displayPrices = expandedStores[product.id] 
                                ? mergedPrices 
                                : mergedPrices.slice(0, 4);
                              
                              return displayPrices.map((priceDisplay, idx) => (
                                <Link
                                  key={idx}
                                  href={`/store/${priceDisplay.storeId}`}
                                  className={`flex justify-between items-center rounded-lg px-4 py-3 transition-all hover:shadow-md cursor-pointer ${
                                    priceDisplay.hasPromo 
                                      ? 'bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200' 
                                      : 'bg-gray-50 hover:bg-gray-100'
                                  }`}
                                >
                                  <div>
                                    <div className="font-semibold text-gray-900">
                                      {priceDisplay.chainName}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {priceDisplay.storeName} - {priceDisplay.city}
                                    </div>
                                    {priceDisplay.hasPromo && priceDisplay.promoDescription && (
                                      <div className="mt-1 text-xs text-red-600 font-semibold flex items-start gap-1">
                                        <FiTag className="text-xs mt-0.5 flex-shrink-0" />
                                        <span className="line-clamp-2">{priceDisplay.promoDescription}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-left">
                                    {priceDisplay.hasPromo ? (
                                      <>
                                        <div className="text-sm text-gray-400 line-through">
                                          ₪{priceDisplay.regularPrice.toFixed(2)}
                                        </div>
                                        <div className="text-xl font-bold text-red-600">
                                          ₪{priceDisplay.promoPrice!.toFixed(2)}
                                        </div>
                                        {priceDisplay.promoMinQty && priceDisplay.promoMinQty > 1 && (
                                          <div className="text-xs text-red-600 font-bold bg-red-100 px-2 py-0.5 rounded mt-1 inline-block">
                                            {priceDisplay.promoMinQty} ב-₪{(priceDisplay.promoPrice! * priceDisplay.promoMinQty).toFixed(0)}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <div className="text-lg font-bold text-primary-600">
                                        ₪{priceDisplay.regularPrice.toFixed(2)}
                                      </div>
                                    )}
                                  </div>
                                </Link>
                              ));
                            })()}
                          </div>
                          {(() => {
                            const totalStores = mergePricesWithPromotions(product).length;
                            return totalStores > 4 && (
                              <button
                                onClick={() => setExpandedStores(prev => ({
                                  ...prev,
                                  [product.id]: !prev[product.id]
                                }))}
                                className="text-sm text-primary-600 hover:text-primary-700 font-semibold mt-2 w-full text-center py-2 hover:bg-primary-50 rounded-lg transition-colors"
                              >
                                {expandedStores[product.id]
                                  ? 'הסתר חנויות'
                                  : `+${totalStores - 4} חנויות נוספות`
                                }
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div className="flex flex-col items-center gap-4 mt-8">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <FiArrowRight />
                    <span>הקודם</span>
                  </button>
                  
                  <span className="text-gray-600">
                    עמוד {page} מתוך {data.pagination.totalPages}
                  </span>
                  
                  <button
                    onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                    disabled={page === data.pagination.totalPages}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <span>הבא</span>
                    <FiArrowLeft />
                  </button>
                </div>
                
                {page < data.pagination.totalPages && (
                  <button
                    onClick={() => setPage(p => p + 1)}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold transition-colors shadow-lg hover:shadow-xl"
                  >
                    טען עוד תוצאות ({data.pagination.total - (page * 5)} נותרו)
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {!isLoading && !error && !data && (
          <div className="text-center py-12">
            <FiSearch size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 text-lg">התחילו לחפש מוצרים</p>
          </div>
        )}
      </div>
    </div>
  );
}
