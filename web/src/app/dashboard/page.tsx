'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { 
  FiShoppingCart, FiSettings, FiTrendingDown, FiCamera, FiSearch, FiEdit, FiTrash2 
} from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalCarts: 0,
    totalItems: 0,
    receipts: 0,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300 page-transition">
      <Header showLocation={false} />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            ברוכים הבאים, {session.user.name}!
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            נהל את העגלות שלך, צפה בהיסטוריה ובדוק חיסכונים
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <FiShoppingCart size={32} />
              <div className="text-right">
                <div className="text-3xl font-bold">{stats.totalCarts}</div>
                <div className="text-blue-100">עגלות פעילות</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <FiTrendingDown size={32} />
              <div className="text-right">
                <div className="text-3xl font-bold">{stats.totalItems}</div>
                <div className="text-purple-100">מוצרים בעגלות</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <FiCamera size={32} />
              <div className="text-right">
                <div className="text-3xl font-bold">{stats.receipts}</div>
                <div className="text-green-100">קבלות נשמרו</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">פעולות מהירות</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              href="/search"
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-all group"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-primary-500 transition-colors">
                <FiSearch className="text-blue-600 group-hover:text-white" size={24} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">חפש מוצרים</div>
                <div className="text-sm text-gray-600">מצא והשווה מחירים</div>
              </div>
            </Link>

            <Link
              href="/compare"
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all group"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-500 transition-colors">
                <FiTrendingDown className="text-purple-600 group-hover:text-white" size={24} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">השווה מחירים</div>
                <div className="text-sm text-gray-600">השווה סל קניות</div>
              </div>
            </Link>

            <Link
              href="/scan"
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all group"
            >
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-500 transition-colors">
                <FiCamera className="text-green-600 group-hover:text-white" size={24} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">סרוק קבלה</div>
                <div className="text-sm text-gray-600">סרוק ושמור מוצרים</div>
              </div>
            </Link>
          </div>
        </div>

        {/* User Profile */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">פרטי חשבון</h2>
            <button className="flex items-center gap-2 text-primary-600 hover:text-primary-700">
              <FiEdit />
              <span>ערוך</span>
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">שם מלא</label>
              <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                {session.user.name || 'לא הוגדר'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">אימייל</label>
              <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900" dir="ltr">
                {session.user.email}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold text-gray-900 mb-4">העדפות</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 text-primary-600 rounded" />
                <span className="text-gray-700">קבל התראות על מבצעים</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 text-primary-600 rounded" />
                <span className="text-gray-700">קבל התראות על שינויי מחיר</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 text-primary-600 rounded" />
                <span className="text-gray-700">שליחת ניוזלטר שבועי</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
