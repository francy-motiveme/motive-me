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
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
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
    'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || 'https://lcbvjrukxjnenzficeci.supabase.co'),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjYnZqcnVreGpuZW56ZmljZWNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5OTM0NjIsImV4cCI6MjA1MTU2OTQ2Mn0.FbZ1zDUyOmOJg9oN7bqy7Y8W7VU9l7J2mF5P9X8j3QE'),
    'process.env.SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(process.env.SUPABASE_SERVICE_ROLE_KEY || ''),
    'process.env.SESSION_SECRET': JSON.stringify(process.env.SESSION_SECRET || 'motiveMe2025SecretKey')
  }
});