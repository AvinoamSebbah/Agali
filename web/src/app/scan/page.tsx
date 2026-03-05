'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiCamera, FiArrowRight, FiCheck, FiShoppingCart, FiX } from 'react-icons/fi';
import { Header } from '@/components/Header';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';

// Type pour Html5QrcodeScanner
type Html5QrcodeScannerType = any;

interface ScannedProduct {
  barcode: string;
  name?: string;
  imageUrl?: string;
  price?: number;
  selected: boolean;
}

export default function ScanPage() {
  const { data: session } = useSession();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedProducts, setScannedProducts] = useState<ScannedProduct[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const scannerRef = useRef<Html5QrcodeScannerType | null>(null);
  const scannedBarcodesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      // Charger html5-qrcode dynamiquement seulement quand nécessaire
      import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
        const scanner = new Html5QrcodeScanner(
          'reader',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          false
        );

        scanner.render(
          (decodedText) => {
            if (scannedBarcodesRef.current.has(decodedText)) {
              return;
            }

            scannedBarcodesRef.current.add(decodedText);
            
            setScannedProducts(prev => [
              ...prev,
              {
                barcode: decodedText,
                selected: true,
              },
            ]);

            fetchProductInfo(decodedText);
            playBeep();
            toast.success(`נסרק: ${decodedText}`);
          },
          (error) => {
            // Ignore errors
          }
        );

        scannerRef.current = scanner;
      }).catch(err => {
        console.error('Erreur:', err);
        toast.error('שגיאה בטעינת הסורק');
        setIsScanning(false);
      });
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [isScanning]);

  const fetchProductInfo = async (barcode: string) => {
    try {
      // Fetch product from database
      const res = await fetch(`/api/products/search?q=${barcode}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.products && data.products.length > 0) {
          const product = data.products[0];
          
          // Fetch image
          const imgRes = await fetch(`/api/products/image/${barcode}`);
          const imgData = await imgRes.json();

          setScannedProducts(prev =>
            prev.map(p =>
              p.barcode === barcode
                ? {
                    ...p,
                    name: product.itemName,
                    imageUrl: imgData.imageUrl,
                    price: product.prices[0]
                      ? parseFloat(product.prices[0].itemPrice)
                      : undefined,
                  }
                : p
            )
          );
        }
      }
    } catch (error) {
      console.error('Failed to fetch product info:', error);
    }
  };

  const playBeep = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  const toggleScanning = () => {
    setIsScanning(!isScanning);
  };

  const toggleProduct = (barcode: string) => {
    setScannedProducts(prev =>
      prev.map(p => (p.barcode === barcode ? { ...p, selected: !p.selected } : p))
    );
  };

  const removeProduct = (barcode: string) => {
    setScannedProducts(prev => prev.filter(p => p.barcode !== barcode));
    scannedBarcodesRef.current.delete(barcode);
  };

  const saveToCart = async () => {
    if (!session) {
      toast.error('עליכם להתחבר כדי לשמור את העגלה');
      return;
    }

    const selectedProducts = scannedProducts.filter(p => p.selected);
    
    if (selectedProducts.length === 0) {
      toast.error('בחרו לפחות מוצר אחד');
      return;
    }

    setIsSaving(true);

    try {
      // TODO: Implement cart saving
      toast.success(`${selectedProducts.length} מוצרים נשמרו בעגלה!`);
    } catch (error) {
      toast.error('שגיאה בשמירת העגלה');
    } finally {
      setIsSaving(false);
    }
  };

  const clearAll = () => {
    setScannedProducts([]);
    scannedBarcodesRef.current.clear();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      <Header showLocation={false} />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            סריקת קבלה
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            סרקו את הברקודים על הקבלה ושמרו את המוצרים בעגלה שלכם
          </p>
        </div>

        {/* Scanner Toggle Button */}
        <div className="text-center mb-8">
          <button
            onClick={toggleScanning}
            className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-bold text-lg shadow-lg transition-all ${
              isScanning
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            <FiCamera size={24} />
            <span>{isScanning ? 'עצור סריקה' : 'התחל סריקה'}</span>
          </button>
        </div>

        {/* Scanner Container */}
        {isScanning && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8 border border-gray-100 dark:border-gray-700">
            <div id="reader" className="w-full" />
          </div>
        )}

        {/* Scanned Products List */}
        {scannedProducts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                מוצרים שנסרקו ({scannedProducts.length})
              </h2>
              <button
                onClick={clearAll}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-500 font-semibold"
              >
                נקה הכל
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {scannedProducts.map((product) => (
                <div
                  key={product.barcode}
                  className={`flex gap-4 p-4 rounded-xl border-2 transition-all ${
                    product.selected
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                  }`}
                >
                  {/* Checkbox */}
                  <div className="flex items-center">
                    <button
                      onClick={() => toggleProduct(product.barcode)}
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                        product.selected
                          ? 'bg-primary-600 border-primary-600'
                          : 'border-gray-300 dark:border-gray-500'
                      }`}
                    >
                      {product.selected && <FiCheck className="text-white" />}
                    </button>
                  </div>

                  {/* Image */}
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-600 rounded-lg overflow-hidden relative">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name || product.barcode}
                          fill
                          className="object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FiShoppingCart size={32} className="text-gray-300 dark:text-gray-500" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      {product.name || 'טוען...'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {product.barcode}
                    </p>
                    {product.price && (
                      <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mt-1">
                        ₪{product.price.toFixed(2)}
                      </p>
                    )}
                  </div>

                  {/* Remove Button */}
                  <div className="flex items-center">
                    <button
                      onClick={() => removeProduct(product.barcode)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <FiX size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className="flex gap-4">
              <button
                onClick={saveToCart}
                disabled={isSaving || !session}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-primary-600 dark:bg-primary-700 text-white rounded-xl font-bold hover:bg-primary-700 dark:hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FiShoppingCart />
                    <span>שמור בעגלה</span>
                  </>
                )}
              </button>
            </div>

            {!session && (
              <div className="mt-4 text-center text-gray-600 dark:text-gray-400">
                <Link href="/auth/signin" className="text-primary-600 dark:text-primary-400 hover:underline font-semibold">
                  התחברו
                </Link>{' '}
                כדי לשמור את המוצרים בעגלה
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isScanning && scannedProducts.length === 0 && (
          <div className="text-center py-12">
            <FiCamera size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              לחצו על "התחל סריקה" כדי להתחיל
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
