import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import sitemap from 'vite-plugin-sitemap'
import productData from './src/data/productos.json'

// Creamos la lista de rutas de productos
const productRoutes = productData.map(product => `/producto/${product.id}`)

// Creamos la lista de nuestras páginas estáticas
const staticRoutes = [
  '/catalogo',
  '/nosotros',
  '/telas',
  '/faq',
  '/contacto',
]

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sitemap({
      hostname: 'https://www.tapiceriaivar.com.uy',
      // Combinamos ambas listas de rutas
      dynamicRoutes: staticRoutes.concat(productRoutes)
    })
  ],
})