import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiChevronDown, FiChevronUp, FiMapPin, FiPackage } from 'react-icons/fi';
import Header from '../components/Header';
import { useCity } from '../contexts/CityContext';
import { API_BASE_URL } from '../config';

interface Price {
  itemPrice: string;
  store: {
    id: number;
    chainName: string;
    storeName: string;
    city: string;
  };
}

interface Product {
  itemCode: string;
  itemName: string;
  manufacturerName: string;
  prices: Price[];
  promotionItems: any[];
}

function SearchBar({ onSearch, loading }: { onSearch: (q: string) => void; loading: boolean }) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
      <div className="relative group">
        {/* Blur/glow backdrop */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 via-accent-purple to-accent-pink rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300" />

        <div className="relative flex items-center glass-strong border border-white/10 rounded-2xl overflow-hidden">
          <FiSearch className="absolute right-5 text-primary-400 w-5 h-5" />
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="חפש מוצר — שם, ברקוד, מותג..."
            className="w-full bg-transparent text-white placeholder-white/30 px-6 pr-14 py-5 text-lg focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary m-2 px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : 'חפש'}
          </button>
        </div>
      </div>
    </form>
  );
}

function ProductCard({ product }: { product: Product }) {
  const [expanded, setExpanded] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/products/image/${product.itemCode}`)
      .then(res => res.json())
      .then(data => {
        if (data.imageUrl) setImageUrl(data.imageUrl);
      })
      .catch(() => { });
  }, [product.itemCode]);

  const getLowestPrice = () => {
    if (!product.prices.length) return null;
    return product.prices.reduce((min, p) =>
      parseFloat(p.itemPrice) < parseFloat(min.itemPrice) ? p : min
    );
  };

  const sortedPrices = [...product.prices].sort((a, b) =>
    parseFloat(a.itemPrice) - parseFloat(b.itemPrice)
  );

  const lowestPrice = getLowestPrice();
  const highestPrice = product.prices.length > 0
    ? product.prices.reduce((max, p) => parseFloat(p.itemPrice) > parseFloat(max.itemPrice) ? p : max)
    : null;

  const savingPercent = lowestPrice && highestPrice
    ? Math.round((1 - parseFloat(lowestPrice.itemPrice) / parseFloat(highestPrice.itemPrice)) * 100)
    : 0;

  const chainColors: Record<string, string> = {
    'שופרסל': 'from-red-500 to-orange-500',
    'רמי לוי': 'from-blue-500 to-cyan-500',
    'ויקטורי': 'from-green-500 to-emerald-500',
    'יינות ביתן': 'from-purple-500 to-pink-500',
    'מחסני השוק': 'from-yellow-500 to-orange-500',
    'default': 'from-primary-500 to-accent-purple',
  };

  const getChainColor = (name: string) => {
    const key = Object.keys(chainColors).find(k => name.includes(k));
    return chainColors[key || 'default'];
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass border border-white/8 rounded-2xl overflow-hidden card-hover"
    >
      <div className="p-5">
        <div className="flex gap-4">
          {/* Product icon / Image */}
          <div className="flex-shrink-0 w-20 h-20 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-2 overflow-hidden relative">
            {imageUrl ? (
              <img src={imageUrl} alt={product.itemName} className="w-full h-full object-contain drop-shadow-lg" />
            ) : (
              <FiPackage className="w-8 h-8 text-primary-400" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <Link to={`/product/${product.itemCode}`}>
              <h3 className="text-white font-bold text-lg hover:text-primary-400 transition-colors truncate">
                {product.itemName}
              </h3>
            </Link>
            <p className="text-white/40 text-sm truncate">{product.manufacturerName}</p>
            <p className="text-white/20 text-xs font-mono mt-0.5">{product.itemCode}</p>
          </div>

          {/* Price badge */}
          {lowestPrice && (
            <div className="flex-shrink-0 text-right">
              <div className="text-2xl font-black text-white">
                ₪{parseFloat(lowestPrice.itemPrice).toFixed(2)}
              </div>
              {savingPercent > 5 && (
                <div className="text-xs text-accent-emerald font-bold">
                  חיסכון עד {savingPercent}%
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top 3 stores */}
        {sortedPrices.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {sortedPrices.slice(0, 3).map((price, idx) => (
              <Link key={idx} to={`/store/${price.store.id}`}>
                <div className={`p-2.5 rounded-xl border transition-all duration-200 ${idx === 0
                  ? 'border-accent-emerald/40 bg-accent-emerald/10'
                  : 'border-white/5 bg-white/3 hover:bg-white/8'
                  }`}>
                  <div className={`w-full h-1 rounded-full mb-2 bg-gradient-to-r ${getChainColor(price.store.chainName)}`} />
                  <p className="text-white/80 text-xs font-semibold truncate">{price.store.chainName}</p>
                  <p className="text-white/40 text-xs truncate">{price.store.city}</p>
                  <p className={`text-sm font-bold mt-1 ${idx === 0 ? 'text-accent-emerald' : 'text-white'}`}>
                    ₪{parseFloat(price.itemPrice).toFixed(2)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Expand toggle */}
        {sortedPrices.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-3 flex items-center justify-center gap-2 text-primary-400 hover:text-primary-300 text-sm py-2 transition-colors"
          >
            {expanded ? (
              <><FiChevronUp size={16} /> הסתר חנויות</>
            ) : (
              <><FiChevronDown size={16} /> עוד {sortedPrices.length - 3} חנויות</>
            )}
          </button>
        )}

        {/* Expanded list */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-1.5">
                {sortedPrices.slice(3).map((price, idx) => (
                  <Link key={idx} to={`/store/${price.store.id}`}>
                    <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 transition-colors group">
                      <div className="flex items-center gap-2">
                        <FiMapPin size={12} className="text-white/30" />
                        <span className="text-white/60 text-sm group-hover:text-white transition-colors">
                          {price.store.chainName} · {price.store.city}
                        </span>
                      </div>
                      <span className="text-white/80 font-bold text-sm">
                        ₪{parseFloat(price.itemPrice).toFixed(2)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function SearchPage() {
  const { city } = useCity();
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const handleSearch = async (q: string, pageNum = 1) => {
    setLoading(true);
    setSearched(true);
    setQuery(q);
    setPage(pageNum);

    try {
      const cityParam = city ? `&city=${encodeURIComponent(city)}` : '';
      const res = await fetch(`${API_BASE_URL}/api/products/search?q=${encodeURIComponent(q)}&page=${pageNum}&limit=10${cityParam}`);
      const data = await res.json();
      setResults(data.products || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen animated-gradient grid-bg">
      <Header />

      <div className="relative z-10 pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h1 className="text-5xl font-black text-white mb-3">
              <span className="gradient-text">חיפוש</span> מוצרים
            </h1>
            <p className="text-white/40">
              מחירים מעודכנים מכל הסופרים ב<span className="text-primary-400">{city}</span>
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-10"
          >
            <SearchBar onSearch={handleSearch} loading={loading} />
          </motion.div>

          {/* Suggestions when empty */}
          {!searched && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <p className="text-white/30 text-sm text-center mb-4">חיפושים פופולריים</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['חלב', 'לחם', 'ביצים', 'עוף', 'יוגורט', 'גבינה', 'שמן', 'אורז'].map(term => (
                  <button
                    key={term}
                    onClick={() => handleSearch(term)}
                    className="px-4 py-2 glass rounded-xl text-white/50 hover:text-white hover:bg-white/10 text-sm transition-all duration-200 border border-white/5"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass border border-white/8 rounded-2xl p-5">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-xl shimmer" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-2/3 rounded-lg shimmer" />
                      <div className="h-4 w-1/3 rounded-lg shimmer" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/40 text-sm">
                  נמצאו תוצאות עבור "<span className="text-white/70">{query}</span>"
                </p>
                <p className="text-white/30 text-xs">עמוד {page}/{totalPages}</p>
              </div>

              <div className="space-y-4">
                {results.map((p, i) => (
                  <motion.div
                    key={p.itemCode}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <ProductCard product={p} />
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-8">
                  <button
                    onClick={() => handleSearch(query, page - 1)}
                    disabled={page === 1}
                    className="px-4 py-2 glass rounded-xl text-white/60 hover:text-white disabled:opacity-30 border border-white/10 text-sm transition-all"
                  >
                    הקודם
                  </button>
                  <span className="text-white/30 text-sm">{page} / {totalPages}</span>
                  <button
                    onClick={() => handleSearch(query, page + 1)}
                    disabled={page === totalPages}
                    className="px-4 py-2 glass rounded-xl text-white/60 hover:text-white disabled:opacity-30 border border-white/10 text-sm transition-all"
                  >
                    הבא
                  </button>
                </div>
              )}
            </>
          )}

          {/* No results */}
          {!loading && searched && results.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-white/40 text-xl">לא נמצאו מוצרים</p>
              <p className="text-white/20 text-sm mt-2">נסה מילות חיפוש שונות</p>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
