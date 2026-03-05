'use client';

import Link from 'next/link';
import { Header } from '@/components/Header';
import { Logo } from '@/components/Logo';
import { FiSearch, FiShoppingCart, FiCamera, FiTrendingDown, FiAward, FiClock } from 'react-icons/fi';
import { motion } from 'framer-motion';

export default function HomePage() {
  const features = [
    {
      icon: FiSearch,
      title: 'חיפוש מוצרים',
      description: 'חפשו מוצרים לפי שם והשוו מחירים בין הרשתות',
      href: '/search',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: FiShoppingCart,
      title: 'השוואת סל קניות',
      description: 'הזינו ברקודים והשוו את המחיר הכולל בכל רשת',
      href: '/compare',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: FiCamera,
      title: 'סריקת קבלה',
      description: 'צלמו את הקבלה ושמרו את המוצרים בעגלה',
      href: '/scan',
      color: 'from-green-500 to-emerald-500',
    },
  ];

  const benefits = [
    {
      icon: FiTrendingDown,
      title: 'חיסכון משמעותי',
      description: 'חסכו עד 30% בממוצע על סל הקניות השבועי'
    },
    {
      icon: FiAward,
      title: 'מבצעים מעודכנים',
      description: 'קבלו התראות על מבצעים והנחות בזמן אמת'
    },
    {
      icon: FiClock,
      title: 'חסכון בזמן',
      description: 'השוו מחירים במהירות מבלי לבזבז זמן בחנויות'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      <Header showLocation={false} />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-8 md:py-12">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Logo size={120} className="mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              ברוכים הבאים ל<span className="gradient-text">עגלי</span>
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8">
              השוו מחירים, מצאו מבצעים ותחסכו כסף בקניות השבועיות שלכם
            </p>
          </motion.div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {features.map((feature, index) => (
              <motion.div
                key={feature.href}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Link href={feature.href}>
                  <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg card-hover cursor-pointer overflow-hidden border border-gray-100 dark:border-gray-700">
                    {/* Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                    
                    {/* Icon */}
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon size={32} />
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                      {feature.description}
                    </p>
                    
                    {/* Arrow */}
                    <div className="text-primary-600 dark:text-primary-400 font-semibold flex items-center justify-center gap-2 group-hover:gap-4 transition-all">
                      <span>לחצו לכניסה</span>
                      <span className="text-xl">←</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-600 dark:from-primary-800 dark:to-secondary-800 text-white py-12">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-8">
            למה לבחור בעגלי?
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="text-center p-6"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                  <benefit.icon size={28} />
                </div>
                <h4 className="text-lg font-bold mb-2">{benefit.title}</h4>
                <p className="text-white/90">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white dark:bg-gray-800 py-10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="p-4">
              <div className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">100K+</div>
              <div className="text-lg text-gray-600 dark:text-gray-300">מוצרים במאגר</div>
            </div>
            <div className="p-4">
              <div className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">10+</div>
              <div className="text-lg text-gray-600 dark:text-gray-300">רשתות שיווק</div>
            </div>
            <div className="p-4">
              <div className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">30%</div>
              <div className="text-lg text-gray-600 dark:text-gray-300">חיסכון ממוצע</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <Logo size={50} className="mx-auto mb-3" />
          <h3 className="text-xl font-bold mb-2">עגלי</h3>
          <p className="text-gray-400 mb-4">חסכו בקניות, חיו טוב יותר</p>
          <div className="text-sm text-gray-500">
            © 2026 Agali. כל הזכויות שמורות.
          </div>
        </div>
      </footer>
    </div>
  );
}
