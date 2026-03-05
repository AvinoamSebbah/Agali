import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, XCircle } from 'react-feather';
import Header from '../components/Header';

export default function ScanPage() {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setError(null);
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          // Stop scanning and navigate to product
          scanner.stop().then(() => {
            navigate(`/product/${decodedText}`);
          });
        },
        (_errorMessage) => {
          // Ignore errors during scanning
        }
      );

      setScanning(true);
    } catch (err: any) {
      setError(err.message || 'Failed to start camera');
      console.error('Scanner error:', err);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setScanning(false);
      } catch (err) {
        console.error('Stop error:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8 text-center">
          סורק ברקודים
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          {/* Scanner container */}
          <div id="qr-reader" className="mb-6 rounded-lg overflow-hidden"></div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-3">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Instructions */}
          {!scanning && (
            <div className="text-center mb-6">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                סרוק את הברקוד של המוצר כדי לראות את המחירים בכל החנויות
              </p>
              <button
                onClick={startScanning}
                className="inline-flex items-center gap-3 px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
              >
                <Camera className="w-5 h-5" />
                <span>התחל לסרוק</span>
              </button>
            </div>
          )}

          {/* Stop button */}
          {scanning && (
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                מכוון את הברקוד מול המצלמה...
              </p>
              <button
                onClick={stopScanning}
                className="inline-flex items-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                <XCircle className="w-5 h-5" />
                <span>עצור סריקה</span>
              </button>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2">
            טיפים לסריקה טובה:
          </h3>
          <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-400">
            <li>• ודא שהברקוד מואר היטב</li>
            <li>• החזק את המכשיר יציב</li>
            <li>• הקפד על מרחק של 10-15 ס"מ מהברקוד</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

