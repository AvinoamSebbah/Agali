'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FiMapPin, FiClock, FiNavigation } from 'react-icons/fi';
import Image from 'next/image';

interface Store {
  id: number;
  chainName: string;
  storeName: string;
  address: string;
  city: string;
  zipCode?: string;
  storeType?: string;
}

export default function StorePage() {
  const params = useParams();
  const storeId = params.id as string;
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const res = await fetch(`/api/store/${storeId}`);
        const data = await res.json();
        setStore(data);
      } catch (error) {
        console.error('Failed to fetch store:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStore();
  }, [storeId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">חנות לא נמצאה</h1>
        <a href="/search" className="text-primary-600 hover:underline">
          חזרה לחיפוש
        </a>
      </div>
    );
  }

  const fullAddress = `${store.address || ''}, ${store.city || ''}`.trim().replace(/^,\s*/, '');
  const encodedAddress = encodeURIComponent(fullAddress);

  // Navigation links
  const wazeUrl = `https://waze.com/ul?q=${encodedAddress}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  const appleMapsUrl = `https://maps.apple.com/?address=${encodedAddress}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {store.chainName}
          </h1>
          <h2 className="text-2xl text-gray-600 mb-6">
            {store.storeName}
          </h2>

          {/* Store Type Badge */}
          {store.storeType && (
            <div className="inline-block bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-semibold mb-4">
              {store.storeType}
            </div>
          )}

          {/* Address */}
          <div className="flex items-start gap-3 mb-6">
            <FiMapPin className="text-primary-600 text-xl mt-1" />
            <div>
              <div className="font-semibold text-gray-900">כתובת:</div>
              <div className="text-gray-700">
                {store.address || 'כתובת לא זמינה'}
              </div>
              <div className="text-gray-600">
                {store.city} {store.zipCode && `· ${store.zipCode}`}
              </div>
            </div>
          </div>

          {/* Opening Hours (placeholder - would need real data) */}
          <div className="flex items-start gap-3 mb-6">
            <FiClock className="text-primary-600 text-xl mt-1" />
            <div>
              <div className="font-semibold text-gray-900">שעות פתיחה:</div>
              <div className="text-gray-700">
                ראשון-חמישי: 08:00-22:00
              </div>
              <div className="text-gray-700">
                שישי: 08:00-15:00
              </div>
              <div className="text-gray-700">
                שבת: סגור
              </div>
              <div className="text-xs text-gray-500 mt-1">
                * שעות לדוגמה - מומלץ לוודא מראש
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FiMapPin className="text-primary-600" />
            מיקום
          </h3>
          <div className="w-full h-64 bg-gray-100 rounded-xl overflow-hidden relative">
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 0 }}
              src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&q=${encodedAddress}`}
              allowFullScreen
            />
          </div>
        </div>

        {/* Navigation Apps */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FiNavigation className="text-primary-600" />
            נווט לחנות
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {/* Waze */}
            <a
              href={wazeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all hover:scale-105"
            >
              <div className="text-4xl mb-2">🗺️</div>
              <div className="font-bold">Waze</div>
            </a>

            {/* Google Maps */}
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg transition-all hover:scale-105"
            >
              <div className="text-4xl mb-2">🗺️</div>
              <div className="font-bold">Google Maps</div>
            </a>

            {/* Apple Maps */}
            <a
              href={appleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-700 to-gray-800 text-white rounded-xl hover:shadow-lg transition-all hover:scale-105"
            >
              <div className="text-4xl mb-2">🗺️</div>
              <div className="font-bold">Apple Maps</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
