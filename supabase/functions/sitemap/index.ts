// supabase/functions/sitemap/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejo de la petición OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Creamos un cliente de Supabase para poder hacer consultas
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? '',
      Deno.env.get("SUPABASE_ANON_KEY") ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Obtenemos todos los productos de la base de datos
    const { data: products, error } = await supabaseClient
      .from('productos')
      .select('id, created_at') // Solo necesitamos el ID y la fecha

    if (error) {
      throw error
    }

    const hostname = "https://www.tapiceriaivar.com.uy";

    // 2. Definimos las rutas estáticas de nuestra web
    const staticRoutes = [
      "", // Para la página de inicio
      "/catalogo",
      "/telas",
      "/nosotros",
      "/faq",
      "/contacto"
    ];

    // 3. Generamos el contenido XML del sitemap
    const sitemapContent = `
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${staticRoutes.map(route => `
          <url>
            <loc>${hostname}${route}</loc>
            <changefreq>weekly</changefreq>
            <priority>0.8</priority>
          </url>
        `).join('')}
        ${products.map(product => `
          <url>
            <loc>${hostname}/producto/${product.id}</loc>
            <lastmod>${new Date(product.created_at).toISOString()}</lastmod>
            <changefreq>monthly</changefreq>
            <priority>1.0</priority>
          </url>
        `).join('')}
      </urlset>
    `;

    // 4. Devolvemos el XML
    return new Response(sitemapContent.trim(), {
      headers: { ...corsHeaders, "Content-Type": "application/xml" },
      status: 200,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Error desconocido";
    console.error(errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})