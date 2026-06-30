import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/courses': { target: 'http://localhost:3001', changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/courses/, '') },
      '/api/answers': { target: 'http://localhost:3002', changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/answers/, '') },
    },
  },
});
