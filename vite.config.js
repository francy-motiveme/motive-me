import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    hmr: {
      port: 5000,
      host: '0.0.0.0',
      clientPort: 443,
      protocol: 'wss'
    },
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
      'ETag': false,
      'Last-Modified': false
    },
    allowedHosts: true,
    origin: 'http://localhost:5000',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  define: {
    'import.meta.env.VITE_EMAILJS_PUBLIC_KEY': JSON.stringify(process.env.VITE_EMAILJS_PUBLIC_KEY || ''),
    'import.meta.env.VITE_EMAILJS_SERVICE_ID': JSON.stringify(process.env.VITE_EMAILJS_SERVICE_ID || ''),
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:3000'),
    global: 'globalThis'
  },
});