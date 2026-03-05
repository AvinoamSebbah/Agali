import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { CityProvider } from './contexts/CityContext';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import ComparePage from './pages/ComparePage';
import ReceiptScanPage from './pages/ReceiptScanPage';
import Store3DPage from './pages/Store3DPage';
import StoreDetailPage from './pages/StoreDetailPage';
import ProductDetailPage from './pages/ProductDetailPage';

function App() {
  return (
    <CityProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/receipt-scan" element={<ReceiptScanPage />} />
          <Route path="/store-3d" element={<Store3DPage />} />
          <Route path="/store/:id" element={<StoreDetailPage />} />
          <Route path="/product/:barcode" element={<ProductDetailPage />} />
        </Routes>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'rgba(13, 13, 43, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              borderRadius: '12px',
            },
          }}
        />
      </BrowserRouter>
    </CityProvider>
  );
}

export default App;
