import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL || 'http://localhost:3001';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('[PROXY] Error:', err);
            });
            proxy.on('proxyReq', (_proxyReq, req, _res) => {
              console.log('[PROXY] Sending Request:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('[PROXY] Received Response:', proxyRes.statusCode, req.url);
            });
          },
        },
      },
    },
    // En production, définit la base URL de l'API pour que le frontend puisse l'utiliser
    define: {
      __API_URL__: JSON.stringify(apiTarget),
    },
  };
})

