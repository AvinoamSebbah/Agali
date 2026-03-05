'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiPlus, FiX, FiArrowRight, FiTrendingDown, FiAward } from 'react-icons/fi';
import { Header } from '@/components/Header';
import { useLocation } from '@/contexts/LocationContext';
import toast from 'react-hot-toast';

interface ComparisonResult {
  storeKey: string;
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
}

interface IncompleteStore extends ComparisonResult {
  missingProducts: string[];
  missingCount: number;
}

export default function ComparePage() {
  const [barcodes, setBarcodes] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState(false);
  const [comparison, setComparison] = useState<ComparisonResult[] | null>(null);
  const [incompleteStores, setIncompleteStores] = useState<IncompleteStore[] | null>(null);
  const [cheapest, setCheapest] = useState<ComparisonResult | null>(null);
  const { selectedCity } = useLocation();

  const addBarcodeField = () => {
    setBarcodes([...barcodes, '']);
  };

  const removeBarcodeField = (index: number) => {
    if (barcodes.length > 1) {
      setBarcodes(barcodes.filter((_, i) => i !== index));
    }
  };

  const updateBarcode = (index: number, value: string) => {
    const newBarcodes = [...barcodes];
    newBarcodes[index] = value;
    setBarcodes(newBarcodes);
  };

  const handleCompare = async () => {
    const validBarcodes = barcodes.filter(b => b.trim().length > 0);
    
    if (validBarcodes.length === 0) {
      toast.error('הזינו לפחות ברקוד אחד');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/products/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          barcodes: validBarcodes,
          city: selectedCity || undefined,
        }),
      });

      if (!res.ok) throw new Error('Comparison failed');

      const data = await res.json();
      setComparison(data.comparison);
      setIncompleteStores(data.incompleteStores || []);
      setCheapest(data.cheapestStore);
      
      if (data.comparison.length === 0 && (!data.incompleteStores || data.incompleteStores.length === 0)) {
        toast.error('לא נמצאו מחירים עבור המוצרים');
      } else {
        toast.success('ההשוואה בוצעה בהצלחה!');
      }
    } catch (error) {
      toast.error('שגיאה בהשוואת מחירים');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300 page-transition">
      <Header showLocation={true} />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">השוואת סל קניות</h1>
          <p className="text-lg text-gray-600">
            הזינו ברקודים של מוצרים ונמצא עבורכם את הרשת הזולה ביותר
          </p>
        </div>

        {/* Barcode Input Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">רשימת מוצרים</h2>
          
          <div className="space-y-4 mb-6">
            {barcodes.map((barcode, index) => (
              <div key={index} className="flex gap-3">
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => updateBarcode(index, e.target.value)}
                  placeholder={`ברקוד ${index + 1}`}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  dir="ltr"
                />
                {barcodes.length > 1 && (
                  <button
                    onClick={() => removeBarcodeField(index)}
                    className="p-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <FiX size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={addBarcodeField}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FiPlus />
              <span>הוסף ברקוד</span>
            </button>

            <button
              onClick={handleCompare}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <FiTrendingDown />
                  <span>השווה מחירים</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        {comparison && comparison.length > 0 && (
          <div className="space-y-6">
            {/* Cheapest Store Highlight */}
            {cheapest && (
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl shadow-2xl p-8">
                <div className="flex items-center gap-3 mb-4">
                  <FiAward size={32} />
                  <h2 className="text-3xl font-bold">הרשת הזולה ביותר!</h2>
                </div>
                <div className="text-2xl font-semibold mb-2">{cheapest.chainName}</div>
                {cheapest.storeName && (
                  <div className="text-green-100 mb-4">
                    {cheapest.storeName} - {cheapest.city}
                  </div>
                )}
                <div className="text-5xl font-bold">₪{cheapest.total.toFixed(2)}</div>
                <div className="text-green-100 mt-2">סה"כ לסל קניות</div>
              </div>
            )}

            {/* All Stores Comparison */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">השוואת כל הרשתות</h2>
              
              <div className="space-y-4">
                {comparison.map((store, index) => {
                  const isCheapest = index === 0;
                  const savingsVsCheapest = store.total - (cheapest?.total || 0);
                  
                  return (
                    <div
                      key={store.storeKey}
                      className={`border-2 rounded-xl p-6 transition-all ${
                        isCheapest
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-gray-900">
                              {store.chainName}
                            </h3>
                            {isCheapest && (
                              <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                                הכי זול
                              </span>
                            )}
                          </div>
                          {store.storeName && (
                            <p className="text-gray-600">
                              {store.storeName} - {store.city}
                            </p>
                          )}
                        </div>
                        <div className="text-left">
                          <div className="text-3xl font-bold text-primary-600">
                            ₪{store.total.toFixed(2)}
                          </div>
                          {!isCheapest && savingsVsCheapest > 0 && (
                            <div className="text-sm text-red-600">
                              +₪{savingsVsCheapest.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Items in this store */}
                      <div className="space-y-2">
                        {store.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center bg-gray-50 rounded-lg px-4 py-2"
                          >
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">
                                {item.name || item.barcode}
                              </div>
                              {item.hasPromo && (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                  במבצע
                                </span>
                              )}
                            </div>
                            <div className="text-left">
                              {item.hasPromo && item.promoPrice ? (
                                <div>
                                  <div className="text-sm text-gray-500 line-through">
                                    ₪{item.price.toFixed(2)}
                                  </div>
                                  <div className="text-lg font-bold text-red-600">
                                    ₪{item.promoPrice.toFixed(2)}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-lg font-semibold text-gray-900">
                                  ₪{item.price.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Incomplete Stores Section */}
            {incompleteStores && incompleteStores.length > 0 && (
              <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="text-3xl">⚠️</div>
                  <h2 className="text-2xl font-bold text-orange-900">
                    חנויות עם מוצרים חסרים
                  </h2>
                </div>
                <p className="text-orange-700 mb-6">
                  החנויות הבאות לא מציעות את כל המוצרים בסל הקניות שלך:
                </p>
                
                <div className="space-y-4">
                  {incompleteStores.map((store) => (
                    <div
                      key={store.storeKey}
                      className="border-2 border-orange-200 rounded-xl p-6 bg-white"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {store.chainName}
                          </h3>
                          {store.storeName && (
                            <p className="text-gray-600">
                              {store.storeName} - {store.city}
                            </p>
                          )}
                          <p className="text-orange-700 font-semibold mt-2">
                            חסרים {store.missingCount} מוצר{store.missingCount > 1 ? 'ים' : ''}
                          </p>
                        </div>
                        <div className="text-left">
                          <div className="text-3xl font-bold text-gray-400">
                            ₪{store.total.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">
                            חלקי
                          </div>
                        </div>
                      </div>

                      {/* Items in this store */}
                      <div className="space-y-2">
                        {store.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center bg-gray-50 rounded-lg px-4 py-2"
                          >
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">
                                {item.name || item.barcode}
                              </div>
                            </div>
                            <div className="text-lg font-semibold text-gray-900">
                              ₪{(item.promoPrice || item.price).toFixed(2)}
                            </div>
                          </div>
                        ))}
                        
                        {/* Missing products */}
                        {store.missingProducts.map((barcode, idx) => (
                          <div
                            key={`missing-${idx}`}
                            className="flex justify-between items-center bg-red-50 border border-red-200 rounded-lg px-4 py-2"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-red-600 font-bold">✕</span>
                              <div className="font-semibold text-red-700">
                                מוצר חסר - {barcode}
                              </div>
                            </div>
                            <div className="text-sm text-red-600 font-semibold">
                              לא זמין
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!comparison && !isLoading && (
          <div className="text-center py-12">
            <FiTrendingDown size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 text-lg">הזינו ברקודים והשוו מחירים</p>
          </div>
        )}
      </div>
    </div>
  );
}
