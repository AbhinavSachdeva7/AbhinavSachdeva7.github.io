import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split Three.js into its own chunk — lazy-loaded after initial paint
          three: ['three'],
          // Split React + Framer Motion
          vendor: ['react', 'react-dom', 'framer-motion'],
        },
      },
    },
  },
  // In development, proxy /chat → wrangler dev on :8787
  server: {
    proxy: {
      '/chat': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
})
