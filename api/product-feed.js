// Ruta: /api/product-feed.js

import { createClient } from '@supabase/supabase-js';

// Inicializamos el cliente de Supabase para el backend usando las variables de entorno seguras.
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Convierte un array de objetos (JSON) en un string con formato CSV.
 * Maneja correctamente las comillas dobles dentro de los campos para evitar errores.
 * @param {Array<Object>} data - El array de productos a convertir.
 * @returns {string} - Un string que representa el contenido del archivo CSV.
 */
const convertToCsv = (data) => {
  if (!data || data.length === 0) {
    // Si no hay productos, devuelve solo las cabeceras para tener un archivo CSV válido pero vacío.
    const headers = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand'];
    return headers.join(',');
  }
  
  const headers = Object.keys(data[0]);
  const csvRows = [];
  
  // 1. Añadimos la fila de las cabeceras al principio del archivo.
  csvRows.push(headers.join(','));

  // 2. Iteramos sobre cada producto para crear una fila en el CSV.
  for (const row of data) {
    const values = headers.map(header => {
      // Tomamos el valor, nos aseguramos de que sea un string y escapamos las comillas dobles.
      const escaped = ('' + (row[header] || '')).replace(/"/g, '""');
      // Envolvemos cada valor en comillas dobles para manejar de forma segura comas, saltos de línea, etc.
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  // 3. Unimos todas las filas con un salto de línea.
  return csvRows.join('\n');
};


export default async function handler(req, res) {
  try {
    // PASO 1: OBTENER LOS PRODUCTOS DE SUPABASE
    // Hacemos una consulta a la base de datos para traer los productos que queremos en el catálogo.
    const { data: products, error } = await supabase
      .from('productos')
      .select('id, nombre, detalles, precio_base, imagen_url')
      .eq('activo', true); // ¡Filtro clave! Solo incluimos productos marcados como 'activos'.

    if (error) {
      // Si hay un error con la base de datos, lo registramos y devolvemos un error.
      console.error('Error al consultar productos en Supabase:', error);
      throw new Error('No se pudieron obtener los productos de la base de datos.');
    }

    // PASO 2: TRANSFORMAR LOS DATOS AL FORMATO DE META
    // Mapeamos los datos de nuestra tabla a las columnas que el catálogo de Meta espera.
    const formattedProducts = products.map(product => ({
      id: product.id,
      title: product.nombre,
      description: product.detalles?.descripcion_larga?.sabor || `Sofá de diseño ${product.nombre}, fabricado artesanalmente en Uruguay. Calidad y confort garantizados.`,
      availability: 'in stock',
      condition: 'new',
      price: `${product.precio_base.toFixed(2)} UYU`, // Formato requerido: "10900.00 UYU"
      link: `https://www.tapiceriaivar.com.uy/producto/${product.id}`, // Enlace directo al producto
      image_link: `https://www.tapiceriaivar.com.uy${product.imagen_url}`,
      brand: 'Tapicería Ivar',
    }));

    // PASO 3: CONVERTIR LOS DATOS A CSV
    const csvData = convertToCsv(formattedProducts);

    // PASO 4: ENVIAR LA RESPUESTA
    // Configuramos las cabeceras para que Meta (y los navegadores) entiendan que esto es un archivo CSV descargable.
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="product_feed.csv"');
    res.status(200).send(csvData);

  } catch (error) {
    console.error('Error generando el feed de productos:', error.message);
    res.status(500).json({ error: 'Error interno al generar el feed de productos.' });
  }
}