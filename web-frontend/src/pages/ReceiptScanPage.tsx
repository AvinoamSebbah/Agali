import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCamera, FiUpload, FiCheckCircle, FiAlertCircle,
  FiShoppingCart, FiZap, FiTrash2, FiRefreshCw,
} from 'react-icons/fi';
import Header from '../components/Header';
import { useCity } from '../contexts/CityContext';
import { API_BASE_URL } from '../config';

interface ScanResult {
  barcode: string;
  found: boolean;
  product: {
    itemCode: string;
    itemName: string;
    manufacturerName: string;
    price: number | null;
    storeName: string | null;
    lowestPrice?: number;
    lowestStore?: string;
  } | null;
}

// Scanning animation overlay
function ScanOverlay() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
      {/* Corner brackets */}
      {['top-3 right-3 border-t-2 border-r-2', 'top-3 left-3 border-t-2 border-l-2',
        'bottom-3 right-3 border-b-2 border-r-2', 'bottom-3 left-3 border-b-2 border-l-2'
      ].map((cls, i) => (
        <div key={i} className={`absolute w-8 h-8 ${cls} border-primary-400 rounded-sm`} />
      ))}

      {/* Scan line */}
      <motion.div
        className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-primary-400 to-transparent"
        animate={{ top: ['20%', '80%', '20%'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ boxShadow: '0 0 12px rgba(99,102,241,0.8)' }}
      />

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }}
      />
    </div>
  );
}

// Individual barcode result item
function BarcodeItem({ result, onRemove }: { result: ScanResult; onRemove: () => void }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (result.barcode) {
      fetch(`${API_BASE_URL}/api/products/image/${result.barcode}`)
        .then(res => res.json())
        .then(data => {
          if (data.imageUrl) setImageUrl(data.imageUrl);
        })
        .catch(() => { });
    }
  }, [result.barcode]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`p-4 rounded-xl border-2 ${result.found
        ? 'border-accent-emerald/30 bg-accent-emerald/5'
        : 'border-white/10 bg-white/3'
        }`}
    >
      <div className="flex items-center gap-4">
        {/* Status / Image */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center p-1 relative overflow-hidden ${result.found ? 'bg-white/10' : 'bg-white/5'}`}>
          {imageUrl && result.found ? (
            <img src={imageUrl} alt={result.product?.itemName || result.barcode} className="w-full h-full object-contain" />
          ) : result.found ? (
            <FiCheckCircle className="w-6 h-6 text-accent-emerald" />
          ) : (
            <FiAlertCircle className="w-6 h-6 text-white/40" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm font-bold text-white/80">{result.barcode}</span>
            {result.found && (
              <span className="text-xs bg-accent-emerald/20 text-accent-emerald px-2 py-0.5 rounded-full">נמצא</span>
            )}
          </div>

          {result.found && result.product ? (
            <div>
              <p className="text-white font-semibold text-sm truncate">{result.product.itemName}</p>
              {result.product.manufacturerName && (
                <p className="text-white/40 text-xs">{result.product.manufacturerName}</p>
              )}
            </div>
          ) : (
            <p className="text-white/30 text-xs">מוצר לא נמצא במאגר</p>
          )}
        </div>

        {/* Remove */}
        <button
          onClick={onRemove}
          className="flex-shrink-0 p-2 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all"
        >
          <FiTrash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
}

// AI Processing animation
function AIProcessing() {
  return (
    <div className="text-center py-12">
      <div className="relative inline-block mb-6">
        <div className="w-20 h-20 rounded-full border-4 border-primary-500/30 border-t-primary-500 animate-spin" />
        <div className="w-20 h-20 rounded-full border-4 border-accent-purple/20 border-b-accent-purple animate-spin absolute inset-0"
          style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <FiZap className="w-8 h-8 text-primary-400" />
        </div>
      </div>
      <p className="text-white font-bold text-lg">Gemini AI מנתח...</p>
      <p className="text-white/40 text-sm mt-2">מזהה ברקודים מהתמונה</p>
      <div className="flex justify-center gap-1 mt-4">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-primary-400"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ReceiptScanPage() {
  const { city } = useCity();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [dragging, setDragging] = useState(false);

  const analyzeImage = async (file: File) => {
    setScanning(true);
    setResults([]);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`${API_BASE_URL}/api/scan/analyze`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setResults(data.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      setImage(e.target?.result as string);
      analyzeImage(file);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  }, []);

  const foundProducts = results.filter(r => r.found);

  const goCompare = () => {
    navigate('/compare', {
      state: {
        barcodes: foundProducts.map(r => ({
          itemCode: r.barcode,
          itemName: r.product?.itemName || '',
          quantity: 1,
        })),
      },
    });
  };

  return (
    <div className="min-h-screen animated-gradient grid-bg">
      <Header />

      <div className="relative z-10 pt-24 pb-20 px-4">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-4 border border-accent-purple/30">
              <FiZap className="text-accent-purple w-4 h-4" />
              <span className="text-accent-purple text-sm font-semibold">Gemini AI</span>
            </div>
            <h1 className="text-5xl font-black mb-3">
              <span className="gradient-text">סריקת</span>
              <span className="text-white"> קבלות</span>
            </h1>
            <p className="text-white/40">
              העלה תמונת קבלה — ה-AI יזהה את כל הברקודים ויחשב את מחיר הסל ב{city}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Upload panel */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="glass border border-white/10 rounded-2xl overflow-hidden">

                {/* Image preview or drop zone */}
                <div
                  className={`relative aspect-[3/4] cursor-pointer transition-all duration-300 ${dragging ? 'bg-primary-500/10 border-primary-500/50' : ''
                    }`}
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onClick={() => !image && fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                    className="hidden"
                  />

                  {image ? (
                    <>
                      <img src={image} alt="Receipt" className="w-full h-full object-cover" />
                      {scanning && (
                        <div className="absolute inset-0 bg-dark-bg/70">
                          <ScanOverlay />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-purple/20 border border-white/10 flex items-center justify-center"
                      >
                        <FiCamera className="w-10 h-10 text-primary-400" />
                      </motion.div>
                      <div className="text-center">
                        <p className="text-white font-bold text-lg mb-1">צלם או העלה קבלה</p>
                        <p className="text-white/30 text-sm">גרור לכאן או לחץ לבחור קובץ</p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
                        >
                          <FiUpload size={16} />
                          העלה
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); (fileInputRef.current as any).capture = 'environment'; fileInputRef.current?.click(); }}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold glass border border-white/15 text-white hover:border-white/30 transition-all"
                        >
                          <FiCamera size={16} />
                          צלם
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Reset button */}
                {image && !scanning && (
                  <div className="p-3 border-t border-white/5">
                    <button
                      onClick={() => { setImage(null); setResults([]); }}
                      className="w-full flex items-center justify-center gap-2 py-2 text-white/40 hover:text-white text-sm transition-colors"
                    >
                      <FiRefreshCw size={14} />
                      סרוק קבלה חדשה
                    </button>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Results panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="glass border border-white/10 rounded-2xl p-5 min-h-80">

                {scanning && <AIProcessing />}

                {!scanning && results.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="w-16 h-16 rounded-2xl glass border border-white/10 flex items-center justify-center">
                      <FiShoppingCart className="w-7 h-7 text-white/20" />
                    </div>
                    <p className="text-white/20 text-center text-sm">
                      תוצאות הסריקה יופיעו כאן<br />
                      לאחר העלאת תמונה
                    </p>
                  </div>
                )}

                {!scanning && results.length > 0 && (
                  <>
                    {/* Summary */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-bold">
                        {results.length} ברקודים זוהו
                      </h3>
                    </div>

                    {/* Items list */}
                    <div className="space-y-2 max-h-80 overflow-y-auto mb-4">
                      <AnimatePresence>
                        {results.map((r, i) => (
                          <BarcodeItem
                            key={r.barcode + i}
                            result={r}
                            onRemove={() => setResults(prev => prev.filter((_, idx) => idx !== i))}
                          />
                        ))}
                      </AnimatePresence>
                    </div>

                    {/* CTA */}
                    {foundProducts.length > 0 && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={goCompare}
                        className="w-full btn-primary flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-base shadow-neon"
                      >
                        <FiShoppingCart className="w-5 h-5" />
                        השווה מחיר הסל ({foundProducts.length} פריטים)
                      </motion.button>
                    )}
                  </>
                )}
              </div>

              {/* Tips */}
              <div className="mt-4 glass border border-white/8 rounded-xl p-4">
                <p className="text-white/40 text-xs font-semibold mb-2 uppercase tracking-wider">טיפים לסריקה מוצלחת</p>
                <ul className="space-y-1.5">
                  {[
                    '📸 תמונה ברורה ומוארת היטב',
                    '📐 צלם ישר, לא באלכסון',
                    '🤖 Gemini AI מזהה מספרים אוטומטית',
                    '✅ המערכת בודקת מול מאגר נתוני מחירים',
                  ].map(tip => (
                    <li key={tip} className="text-white/30 text-xs">{tip}</li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
