import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Navigation, ArrowLeft } from 'react-feather';
import Header from '../components/Header';
import { API_BASE_URL } from '../config';

interface Store {
  id: number;
  chainId: string;
  chainName: string;
  storeId: string;
  storeName: string;
  address: string;
  city: string;
  zipCode: string;
}

export default function StoreDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStore();
  }, [id]);

  const fetchStore = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stores/${id}`);
      const data = await response.json();
      setStore(data);
    } catch (error) {
      console.error('Error fetching store:', error);
    } finally {
      setLoading(false);
    }
  };

  const openInMaps = (type: 'google' | 'apple' | 'waze') => {
    if (!store) return;
    const address = encodeURIComponent(`${store.address}, ${store.city}`);

    const urls = {
      google: `https://www.google.com/maps/search/?api=1&query=${address}`,
      apple: `http://maps.apple.com/?q=${address}`,
      waze: `https://waze.com/ul?q=${address}&navigate=yes`
    };

    window.open(urls[type], '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              חנות לא נמצאה
            </h2>
            <Link
              to="/search"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              חזרה לחיפוש
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back button */}
        <Link
          to="/search"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>חזרה לחיפוש</span>
        </Link>

        {/* Store header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4">
            {/* Store logo placeholder */}
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-white">
                {store.chainName?.charAt(0) || '🏪'}
              </span>
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {store.storeName || store.chainName}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {store.chainName}
              </p>
            </div>
          </div>
        </div>

        {/* Store info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            פרטי החנות
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-gray-900 dark:text-white font-medium">
                  {store.address}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  {store.city} {store.zipCode && `• ${store.zipCode}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            ניווט לחנות
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => openInMaps('google')}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <Navigation className="w-5 h-5" />
              <span>Google Maps</span>
            </button>

            <button
              onClick={() => openInMaps('apple')}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
            >
              <MapPin className="w-5 h-5" />
              <span>Apple Maps</span>
            </button>

            <button
              onClick={() => openInMaps('waze')}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-[#33ccff] hover:bg-[#2bb8e8] text-white rounded-lg font-medium transition-colors"
            >
              <Navigation className="w-5 h-5" />
              <span>Waze</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
