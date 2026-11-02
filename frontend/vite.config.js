import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/app/',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        timeout: 30000,
        proxyTimeout: 30000,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            // Silently and gracefully handle backend startup delay or client navigation aborts
            if (res && !res.headersSent && typeof res.writeHead === 'function') {
              try {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  status: 'UNAVAILABLE',
                  detail: 'Backend server is starting up or connection was reset.'
                }));
              } catch (_) {
                // Client socket closed
              }
            }
          });
        }
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
        configure: (proxy) => {
          proxy.on('error', () => {
            // Ignore normal WebSocket close / reset on page reload
          });
        }
      }
    }
  }
})
