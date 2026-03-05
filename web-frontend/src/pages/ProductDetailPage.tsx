import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiMapPin, FiPackage, FiTag, FiTrendingDown, FiShoppingCart } from 'react-icons/fi';
import Header from '../components/Header';
import { useCity } from '../contexts/CityContext';
import { API_BASE_URL } from '../config';

interface Store {
  id: number;
  chainName: string;
  storeName: string;
  city: string;
  address: string;
}

interface Price {
  itemPrice: string;
  store: Store;
}

interface Promotion {
  id: number;
  promotionDescription: string;
  promotionStartDate: string;
  promotionEndDate: string;
  store: Store;
  items: any[];
}

interface Product {
  id: number;
  itemCode: string;
  itemName: string;
  manufacturerName: string;
  manufacturerItemDescription: string;
}

export default function ProductDetailPage() {
  const { barcode } = useParams<{ barcode: string }>();
  const { city } = useCity();

  const [product, setProduct] = useState<Product | null>(null);
  const [prices, setPrices] = useState<Price[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProduct();
    fetchImage();
  }, [barcode]);

  const fetchProduct = async () => {
    try {
      const query = city ? `?city=${encodeURIComponent(city)}` : '';
      const response = await fetch(`${API_BASE_URL}/api/products/${barcode}${query}`);
      const data = await response.json();
      setProduct(data.product);
      setPrices(data.prices || []);
      setPromotions(data.promotions || []);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchImage = async () => {
    try {
      const imgRes = await fetch(`${API_BASE_URL}/api/products/image/${barcode}`);
      const imgData = await imgRes.json();
      if (imgData.imageUrl) {
        setImageUrl(imgData.imageUrl);
      }
    } catch (error) {
      console.error('Error fetching image:', error);
    }
  };

  const sortedPrices = [...prices].sort((a, b) => parseFloat(a.itemPrice) - parseFloat(b.itemPrice));
  const cheapestPrice = sortedPrices[0]?.itemPrice;

  const chainColors: Record<string, string> = {
    'שופרסל': 'text-red-400 border-red-500/30 bg-red-500/10',
    'רמי לוי': 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    'ויקטורי': 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    'יינות ביתן': 'text-pink-400 border-pink-500/30 bg-pink-500/10',
    'מחסני השוק': 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    'default': 'text-primary-400 border-primary-500/30 bg-primary-500/10',
  };

  const getChainStyle = (name: string) => {
    const key = Object.keys(chainColors).find(k => name.includes(k));
    return chainColors[key || 'default'];
  };

  if (loading) {
    return (
      <div className="min-h-screen animated-gradient grid-bg">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-5xl mt-20">
          <div className="glass border border-white/10 rounded-3xl p-8 flex gap-8">
            <div className="w-64 h-64 rounded-2xl shimmer flex-shrink-0" />
            <div className="flex-1 space-y-4">
              <div className="h-8 w-2/3 rounded-xl shimmer" />
              <div className="h-6 w-1/3 rounded-xl shimmer" />
              <div className="h-24 w-full rounded-xl shimmer mt-8" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen animated-gradient grid-bg">
        <Header />
        <div className="container mx-auto px-4 py-8 mt-20 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-3xl font-black text-white mb-4">מוצר לא נמצא</h2>
          <Link to="/search" className="btn-primary px-6 py-3 rounded-xl inline-flex items-center gap-2">
            <FiArrowRight /> חזרה לחיפוש
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animated-gradient grid-bg">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-5xl mt-20 relative z-10">

        {/* Back navigation */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <Link
            to="/search"
            className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors glass px-4 py-2 rounded-xl border border-white/5 hover:border-white/20"
          >
            <FiArrowRight className="w-4 h-4" />
            <span className="text-sm font-medium">חזרה לתוצאות</span>
          </Link>
        </motion.div>

        {/* Hero Product Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong border border-white/10 rounded-3xl p-6 md:p-10 mb-8 relative overflow-hidden"
        >
          {/* Decorative blur */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary-500/20 rounded-full blur-[100px] pointer-events-none" />

          <div className="flex flex-col md:flex-row gap-8 relative z-10">

            {/* Image */}
            <div className="w-full md:w-72 md:h-72 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center p-6 flex-shrink-0 relative group">
              {imageUrl ? (
                <img src={imageUrl} alt={product.itemName} className="w-full h-full object-contain filter drop-shadow-2xl group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <FiPackage className="w-20 h-20 text-primary-400/50" />
              )}
              <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-xs font-mono text-white/70">
                {product.itemCode}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col justify-center">
              <h1 className="text-3xl md:text-5xl font-black text-white mb-3 tracking-tight">
                {product.itemName}
              </h1>
              {product.manufacturerName && (
                <p className="text-xl text-primary-300 font-medium mb-4">
                  {product.manufacturerName}
                </p>
              )}
              {product.manufacturerItemDescription && (
                <p className="text-white/60 text-sm md:text-base leading-relaxed mb-6 max-w-2xl">
                  {product.manufacturerItemDescription}
                </p>
              )}

              {/* Best Price Banner */}
              {cheapestPrice && (
                <div className="inline-flex items-center gap-4 bg-gradient-to-r from-accent-emerald/20 to-transparent border border-accent-emerald/30 p-4 rounded-2xl self-start mt-auto">
                  <div className="bg-accent-emerald/20 p-3 rounded-xl">
                    <FiTrendingDown className="w-6 h-6 text-accent-emerald" />
                  </div>
                  <div>
                    <div className="text-accent-emerald text-sm font-bold uppercase tracking-wider">המחיר הזול ביותר</div>
                    <div className="text-3xl font-black text-white">
                      ₪{parseFloat(cheapestPrice).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Prices List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex flex-col sm:flex-row items-baseline justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <FiShoppingCart className="text-primary-400" />
              השוואת מחירים במרכולים
            </h2>
            <p className="text-white/40 text-sm mt-2 sm:mt-0">
              נמצאו {sortedPrices.length} תוצאות באזור <span className="text-white/80">{city}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedPrices.map((priceItem, index) => {
              const promo = promotions.find(p => p.store.id === priceItem.store.id);
              const isCheapest = index === 0;

              return (
                <motion.div
                  key={priceItem.store.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className={`glass p-5 rounded-2xl border transition-all duration-300 hover:bg-white/5 ${isCheapest ? 'border-accent-emerald/50 shadow-[0_0_30px_rgba(16,185,129,0.15)]' : 'border-white/10 hover:border-primary-500/50'
                    }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getChainStyle(priceItem.store.chainName)}`}>
                          {priceItem.store.chainName}
                        </span>
                        {isCheapest && (
                          <span className="px-2 py-1 bg-accent-emerald/20 text-accent-emerald text-xs font-bold rounded-lg border border-accent-emerald/30">
                            מקום 1
                          </span>
                        )}
                      </div>
                      <Link
                        to={`/store/${priceItem.store.id}`}
                        className="text-white font-bold text-lg hover:text-primary-400 transition-colors mt-1 inline-block"
                      >
                        {priceItem.store.storeName || priceItem.store.chainName}
                      </Link>
                      <div className="flex items-center gap-1.5 text-white/40 text-xs mt-1">
                        <FiMapPin size={12} />
                        <span>{priceItem.store.city}</span>
                      </div>
                    </div>

                    <div className="text-left">
                      <div className={`text-3xl font-black ${isCheapest ? 'text-accent-emerald' : 'text-white'}`}>
                        ₪{parseFloat(priceItem.itemPrice).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Active Promotion */}
                  {promo && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <div className="flex items-start gap-2 bg-accent-pink/10 border border-accent-pink/20 rounded-xl p-3">
                        <FiTag className="w-5 h-5 text-accent-pink flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-accent-pink text-sm font-bold">מבצע פעיל!</p>
                          <p className="text-white/70 text-sm mt-0.5">{promo.promotionDescription}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
