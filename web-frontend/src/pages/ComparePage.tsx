import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiShoppingCart, FiPlus, FiTrash2, FiSearch,
  FiAward, FiChevronDown, FiChevronUp,
  FiMinus, FiZap,
} from 'react-icons/fi';
import Header from '../components/Header';
import { useCity } from '../contexts/CityContext';
import { API_BASE_URL } from '../config';

interface CartItem {
  itemCode: string;
  itemName: string;
  quantity: number;
}

interface StoreResult {
  storeId: number;
  storeName: string;
  chainName: string;
  city: string;
  totalPrice: number;
  coverage: number; // % of items found
  items: Array<{
    itemCode: string;
    itemName: string;
    price: number;
    quantity: number;
    hasPromo: boolean;
    originalPrice?: number;
  }>;
}

// Store result card
function StoreCard({
  store,
  rank,
  cheapest,
}: {
  store: StoreResult;
  rank: number;
  cheapest: StoreResult;
}) {
  const [expanded, setExpanded] = useState(rank === 0);
  const saving = store.totalPrice - cheapest.totalPrice;
  const isWinner = rank === 0;

  const rankColors = [
    'from-yellow-400 to-amber-500',
    'from-slate-300 to-slate-400',
    'from-amber-600 to-amber-700',
  ];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.05 }}
      className={`glass border rounded-2xl overflow-hidden transition-all duration-300 ${isWinner
        ? 'border-accent-emerald/40 shadow-neon-green'
        : 'border-white/8 hover:border-white/15'
        }`}
    >
      {/* Winner banner */}
      {isWinner && (
        <div className="bg-gradient-to-r from-accent-emerald/20 to-accent-cyan/20 px-4 py-2 border-b border-accent-emerald/20">
          <div className="flex items-center gap-2 text-accent-emerald text-sm font-bold">
            <FiAward size={16} />
            <span>הכי זול ב{store.city}!</span>
          </div>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start gap-4">

          {/* Rank badge */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${rankColors[rank] || 'from-primary-500 to-accent-purple'} flex items-center justify-center font-black text-white text-lg`}>
            {rank + 1}
          </div>

          {/* Store info */}
          <div className="flex-1 min-w-0">
            <Link to={`/store/${store.storeId}`}>
              <h3 className="text-white font-bold text-lg hover:text-primary-400 transition-colors">
                {store.chainName}
              </h3>
            </Link>
            <p className="text-white/40 text-sm">{store.storeName} · {store.city}</p>
            {store.coverage < 100 && (
              <p className="text-amber-400 text-xs mt-1">
                ⚠️ נמצאו {store.coverage}% מהמוצרים
              </p>
            )}
          </div>

          {/* Price */}
          <div className="text-right">
            <div className={`text-3xl font-black ${isWinner ? 'gradient-text-green' : 'text-white'}`}>
              ₪{store.totalPrice.toFixed(2)}
            </div>
            {!isWinner && (
              <div className="text-red-400 text-sm font-bold">
                +₪{saving.toFixed(2)}
              </div>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-2 mt-4 text-white/30 hover:text-white/60 text-xs py-1.5 transition-colors"
        >
          {expanded ? <><FiChevronUp size={14} /> הסתר פירוט</> : <><FiChevronDown size={14} /> הצג פירוט</>}
        </button>

        {/* Items breakdown */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/8 mt-2"
            >
              <div className="pt-3 space-y-1.5">
                {store.items.map(item => (
                  <div key={item.itemCode} className="flex items-center justify-between text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="text-white/60 truncate block">{item.itemName}</span>
                      {item.hasPromo && (
                        <span className="text-xs text-accent-amber">🏷️ מבצע</span>
                      )}
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <span className="text-white/40 text-xs">×{item.quantity}</span>
                      {item.hasPromo && item.originalPrice && (
                        <span className="text-white/20 line-through text-xs mr-2">
                          ₪{(item.originalPrice * item.quantity).toFixed(2)}
                        </span>
                      )}
                      <span className={item.hasPromo ? 'text-accent-amber font-bold' : 'text-white font-medium'}>
                        {' '}₪{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function ComparePage() {
  const { city } = useCity();
  const location = useLocation();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const [results, setResults] = useState<StoreResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);

  // Load from receipt scan
  useEffect(() => {
    if (location.state?.barcodes) {
      setCart(location.state.barcodes);
    }
  }, [location.state]);

  // Autocomplete search
  useEffect(() => {
    if (input.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/products/search?q=${encodeURIComponent(input)}&limit=6`);
        const data = await res.json();
        setSuggestions(data.products || []);
        setShowSugg(true);
      } catch { }
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  const addItem = (product?: any) => {
    const item = product
      ? { itemCode: product.itemCode, itemName: product.itemName, quantity: 1 }
      : { itemCode: input.trim(), itemName: '', quantity: 1 };

    if (item.itemCode && !cart.find(c => c.itemCode === item.itemCode)) {
      setCart(prev => [...prev, item]);
    }
    setInput('');
    setSuggestions([]);
    setShowSugg(false);
  };

  const removeItem = (code: string) => setCart(prev => prev.filter(c => c.itemCode !== code));
  const updateQty = (code: string, delta: number) => {
    setCart(prev => prev.map(c =>
      c.itemCode === code ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c
    ));
  };

  const compare = async () => {
    if (!cart.length) return;
    setComparing(true);
    setLoading(true);
    try {
      const cityParam = city ? `?city=${encodeURIComponent(city)}` : '';
      const res = await fetch(`${API_BASE_URL}/api/compare${cityParam}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: cart }),
      });
      const data = await res.json();
      setResults(data.stores || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const cheapest = results[0];

  return (
    <div className="min-h-screen animated-gradient grid-bg">
      <Header />

      <div className="relative z-10 pt-24 pb-20 px-4">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h1 className="text-5xl font-black mb-3">
              <span className="gradient-text">העגלה</span>
              <span className="text-white"> שלי</span>
            </h1>
            <p className="text-white/40">
              הוסף מוצרים וגלה את הסופר הכי משתלם ב<span className="text-primary-400">{city}</span>
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Cart builder — 2 cols */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass border border-white/10 rounded-2xl p-5 sticky top-20"
              >
                <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                  <FiShoppingCart className="text-primary-400" />
                  הסל שלי ({cart.length})
                </h2>

                {/* Search input */}
                <div className="relative mb-5">
                  <div className="relative">
                    <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                    <input
                      type="text"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addItem()}
                      onFocus={() => suggestions.length > 0 && setShowSugg(true)}
                      placeholder="שם מוצר או ברקוד..."
                      className="w-full input-dark rounded-xl px-4 py-3 pr-10 text-sm"
                    />
                  </div>

                  {/* Suggestions dropdown */}
                  <AnimatePresence>
                    {showSugg && suggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute top-full left-0 right-0 z-20 mt-1 glass-strong border border-white/10 rounded-xl overflow-hidden"
                      >
                        {suggestions.map(s => (
                          <button
                            key={s.itemCode}
                            onClick={() => addItem(s)}
                            className="w-full text-right px-4 py-2.5 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                          >
                            <p className="text-white text-sm font-medium truncate">{s.itemName}</p>
                            <p className="text-white/30 text-xs">{s.itemCode}</p>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={() => addItem()}
                  className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold mb-5"
                >
                  <FiPlus size={16} />
                  הוסף לסל
                </button>

                {/* Cart items */}
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">🛒</div>
                    <p className="text-white/20 text-sm">הסל ריק</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    <AnimatePresence>
                      {cart.map(item => (
                        <motion.div
                          key={item.itemCode}
                          layout
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/8"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">
                              {item.itemName || item.itemCode}
                            </p>
                            {item.itemName && (
                              <p className="text-white/30 text-xs font-mono">{item.itemCode}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => updateQty(item.itemCode, -1)}
                              className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                            >
                              <FiMinus size={10} className="text-white" />
                            </button>
                            <span className="text-white w-6 text-center text-sm font-bold">{item.quantity}</span>
                            <button
                              onClick={() => updateQty(item.itemCode, 1)}
                              className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                            >
                              <FiPlus size={10} className="text-white" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(item.itemCode)}
                            className="p-1 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Compare CTA */}
                {cart.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={compare}
                    disabled={loading}
                    className="w-full mt-4 btn-primary flex items-center justify-center gap-2 py-4 rounded-xl font-bold shadow-neon disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <FiZap size={18} />
                        השווה בין חנויות
                      </>
                    )}
                  </motion.button>
                )}
              </motion.div>
            </div>

            {/* Results — 3 cols */}
            <div className="lg:col-span-3">
              {!comparing && results.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-64 gap-4"
                >
                  <div className="text-6xl">🏆</div>
                  <p className="text-white/30 text-center">
                    הוסף מוצרים ולחץ "השווה"<br />
                    <span className="text-sm">לראות את המחיר הכי טוב ב{city}</span>
                  </p>
                </motion.div>
              )}

              {loading && (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="glass border border-white/8 rounded-2xl p-5">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl shimmer" />
                        <div className="flex-1 space-y-2">
                          <div className="h-5 w-1/2 rounded-lg shimmer" />
                          <div className="h-4 w-1/4 rounded-lg shimmer" />
                        </div>
                        <div className="h-8 w-20 rounded-lg shimmer" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && results.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-bold text-xl">
                      {results.length} חנויות ב{city}
                    </h2>
                    {cheapest && (
                      <div className="text-accent-emerald text-sm font-bold">
                        המחיר הטוב: ₪{cheapest.totalPrice.toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {results.map((store, i) => (
                      <StoreCard key={store.storeId} store={store} rank={i} cheapest={cheapest} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
