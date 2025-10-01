// vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import sitemap from 'vite-plugin-sitemap';
import { supabase } from './src/supabaseClient.js'; // Importamos nuestro cliente de Supabase

// Función asíncrona para obtener las rutas de productos desde Supabase
async function getProductRoutes() {
  // Consultamos la columna 'slug' de todos los productos
  const { data: productos, error } = await supabase.from('productos').select('slug');

  if (error) {
    console.error('Error fetching product slugs for sitemap:', error);
    return [];
  }

  // Transformamos el resultado en una lista de rutas, ej: ['/producto/sofa-apolo', '/producto/sillon-ivar']
  return productos.map(producto => `/producto/${producto.slug}`);
}

// La configuración ahora es una función asíncrona
export default defineConfig(async () => {
  // Esperamos a que la función nos devuelva la lista de rutas de productos
  const productRoutes = await getProductRoutes();
  
  const staticRoutes = [
    '/catalogo',
    '/nosotros',
    '/telas',
    '/faq',
    '/contacto',
  ];

  return {
    plugins: [
      react(),
      sitemap({
        hostname: 'https://www.tapiceriaivar.com.uy',
        // ¡Ahora volvemos a combinar ambas listas!
        dynamicRoutes: staticRoutes.concat(productRoutes),
      }),
    ],
  };
});