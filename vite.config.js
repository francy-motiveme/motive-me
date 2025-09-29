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
    'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || 'https://eiaxdfkkfhkixnuckkma.supabase.co'),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpYXhkZmtraGhraXhudWNra21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYxMDA1MDMsImV4cCI6MjA1MTY3NjUwM30.4U-PmBEeCjMJ6s74T3WJb0oCWNE-8lUE6fJ6JQpnrco'),
    'process.env.SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(process.env.SUPABASE_SERVICE_ROLE_KEY || ''),
    'process.env.SESSION_SECRET': JSON.stringify(process.env.SESSION_SECRET || 'default-session-secret'),
    global: 'globalThis'
  },
  envPrefix: ['VITE_', 'SUPABASE_'],
});