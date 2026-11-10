import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    proxy: {
      '/api': 'http://127.0.0.1:3001',
      '/spring-api': {
        target: process.env.VITE_SPRING_API_TARGET ?? 'http://127.0.0.1:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/spring-api/, '/api'),
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3001',
      '/spring-api': {
        target: process.env.VITE_SPRING_API_TARGET ?? 'http://127.0.0.1:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/spring-api/, '/api'),
      },
    },
  },
})
