import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    hmr: {
      port: 5000,
      host: 'localhost'
    },
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
      'ETag': false,
      'Last-Modified': false
    },
    // Configuration critique pour Replit - accepter TOUS les hosts
    allowedHosts: true,
    // Configuration spécifique Replit pour éviter les blocages
    origin: 'http://localhost:5000'
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
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''),
    'import.meta.env.VITE_EMAILJS_PUBLIC_KEY': JSON.stringify(process.env.EMAILJS_PUBLIC_KEY || process.env.VITE_EMAILJS_PUBLIC_KEY || ''),
    'import.meta.env.VITE_EMAILJS_SERVICE_ID': JSON.stringify(process.env.EMAILJS_SERVICE_ID || process.env.VITE_EMAILJS_SERVICE_ID || ''),
    global: 'globalThis'
  },
});