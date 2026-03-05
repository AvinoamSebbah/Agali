import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiShoppingCart, FiCamera, FiMap, FiHome, FiMapPin, FiChevronDown, FiX } from 'react-icons/fi';
import { useCity } from '../contexts/CityContext';
import CartLogo from './CartLogo';

const ISRAEL_CITIES = [
  'תל אביב', 'ירושלים', 'חיפה', 'ראשון לציון', 'פתח תקווה',
  'אשדוד', 'נתניה', 'באר שבע', 'בני ברק', 'חולון',
  'רמת גן', 'רמת השרון', 'כפר סבא', 'מודיעין', 'הרצליה',
  'רעננה', 'לוד', 'רמלה', 'הוד השרון', 'עכו',
];

const navItems = [
  { icon: FiHome, label: 'בית', path: '/' },
  { icon: FiSearch, label: 'חיפוש', path: '/search' },
  { icon: FiCamera, label: 'סריקה', path: '/receipt-scan' },
  { icon: FiShoppingCart, label: 'עגלה', path: '/compare' },
  { icon: FiMap, label: 'מפת חנות', path: '/store-3d' },
];

export default function Header() {
  const location = useLocation();
  const { city, setCity } = useCity();
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  const filteredCities = ISRAEL_CITIES.filter(c =>
    c.includes(citySearch) || citySearch === ''
  );

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="glass border-b border-white/8 px-4 md:px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group relative z-50">
              <CartLogo size={42} animate={true} />
              <div className="flex flex-col">
                <span className="text-xl font-black gradient-text hidden sm:block">עגלי</span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link key={item.path} to={item.path}>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                        ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                    >
                      <Icon size={16} />
                      <span className="hidden md:block">{item.label}</span>
                    </motion.div>
                  </Link>
                );
              })}
            </nav>

            {/* City Selector */}
            <button
              onClick={() => setShowCityPicker(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl glass border border-white/10 text-white/80 hover:text-white hover:border-primary-500/50 transition-all duration-200 text-sm"
            >
              <FiMapPin size={14} className="text-primary-400" />
              <span>{city || 'בחר עיר'}</span>
              <FiChevronDown size={14} className="text-white/40" />
            </button>
          </div>
        </div>
      </header>

      {/* City Picker Modal */}
      <AnimatePresence>
        {showCityPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCityPicker(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md glass-strong rounded-2xl p-4 border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg">בחר את עירך</h3>
                <button
                  onClick={() => setShowCityPicker(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>

              <input
                type="text"
                value={citySearch}
                onChange={e => setCitySearch(e.target.value)}
                placeholder="חפש עיר..."
                className="w-full input-dark rounded-xl px-4 py-3 mb-3 text-sm"
                autoFocus
              />

              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {filteredCities.map(c => (
                  <button
                    key={c}
                    onClick={() => {
                      setCity(c);
                      setShowCityPicker(false);
                      setCitySearch('');
                    }}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${city === c
                      ? 'bg-primary-500/30 text-primary-300 border border-primary-500/50'
                      : 'glass text-white/70 hover:text-white hover:bg-white/10 border border-white/5'
                      }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
