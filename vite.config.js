import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    hmr: {
      port: 5000
    },
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    // Configuration pour Replit - permettre tous les hosts
    allowedHosts: 'all'
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
    'process.env': {
      SUPABASE_URL: JSON.stringify(process.env.SUPABASE_URL || 'https://lcbvjrukxjnenzficeci.supabase.co'),
      SUPABASE_ANON_KEY: JSON.stringify(process.env.SUPABASE_ANON_KEY || ''),
      SUPABASE_SERVICE_ROLE_KEY: JSON.stringify(process.env.SUPABASE_SERVICE_ROLE_KEY || ''),
      SESSION_SECRET: JSON.stringify(process.env.SESSION_SECRET || '')
    }
  }
});