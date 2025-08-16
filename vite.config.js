import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import sitemap from 'vite-plugin-sitemap' // <--- 1. AÑADE ESTA LÍNEA

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sitemap({ hostname: 'https://www.tapiceriaivar.com.uy' }) // <--- 2. AÑADE ESTA LÍNEA
  ],
})
