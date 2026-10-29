import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        decoder: 'index.html',
        encoder: 'encoder.html',
      },
    },
  },
  server: { proxy: { '/api': 'http://localhost:8500' } },
});
