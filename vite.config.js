import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import sitemap from 'vite-plugin-sitemap'
import productData from './src/data/productos.json' // <-- 1. IMPORTAMOS LOS DATOS

// 2. CREAMOS LA LISTA DE RUTAS DE PRODUCTOS
const dynamicRoutes = productData.map(product => `/producto/${product.id}`)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sitemap({
      hostname: 'https://www.tapiceriaivar.com.uy',
      // 3. AÑADIMOS LAS RUTAS DINÁMICAS A LA CONFIGURACIÓN
      dynamicRoutes: dynamicRoutes
    })
  ],
})