import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/v1/auth': {
        target: process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:8085',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if ('writeHead' in res && !res.headersSent) {
              (res as any).writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'Service Unavailable',
                message: 'Auth Service (port 8085) is offline or still starting up.'
              }));
            }
          });
        }
      },
      '/api/v1/wes': {
        target: process.env.WES_SERVICE_URL || 'http://127.0.0.1:8086',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if ('writeHead' in res && !res.headersSent) {
              (res as any).writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'Service Unavailable',
                message: 'WES Service (port 8086) is offline or still starting up.'
              }));
            }
          });
        }
      },
      '/api/v1/network': {
        target: process.env.WES_SERVICE_URL || 'http://127.0.0.1:8086',
        changeOrigin: true
      },
      '/api/v1/snippets': {
        target: process.env.WES_SERVICE_URL || 'http://127.0.0.1:8086',
        changeOrigin: true
      },
      '/api/v1/wcs': {
        target: process.env.WCS_SERVICE_URL || 'http://127.0.0.1:8084',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if ('writeHead' in res && !res.headersSent) {
              (res as any).writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'Service Unavailable',
                message: 'WCS Service (port 8084) is offline or still starting up.'
              }));
            }
          });
        }
      },
      '/swagger-ui': {
        target: process.env.WES_SERVICE_URL || 'http://127.0.0.1:8086',
        changeOrigin: true
      },
      '/v3/api-docs': {
        target: process.env.WES_SERVICE_URL || 'http://127.0.0.1:8086',
        changeOrigin: true
      },
      '/api': {
        target: process.env.GATEWAY_URL || 'http://127.0.0.1:8080',
        changeOrigin: true
      }
    }
  }
});
