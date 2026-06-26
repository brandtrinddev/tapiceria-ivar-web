// Ruta: /api/product-feed.js

import { createClient } from "@supabase/supabase-js";

const SITE_BASE = "https://www.tapiceriaivar.com.uy";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

const convertToCsv = (data) => {
  if (!data || data.length === 0) {
    const headers = [
      "id",
      "title",
      "description",
      "availability",
      "condition",
      "price",
      "link",
      "image_link",
      "brand",
    ];
    return headers.join(",");
  }

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(",")];

  for (const row of data) {
    const values = headers.map((header) => {
      const escaped = ("" + (row[header] || "")).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
};

function getMetaProductLink(product) {
  const slug = product.slug?.trim();
  if (slug) {
    return `${SITE_BASE}/producto/${slug}`;
  }
  return `${SITE_BASE}/producto/${product.id}`;
}

function getMetaImageLink(product) {
  const card = product.detalles?.imagen_card_url;
  if (card && /^https?:\/\//i.test(card)) {
    return card;
  }
  if (product.imagen_url && /^https?:\/\//i.test(product.imagen_url)) {
    return product.imagen_url;
  }
  return "";
}

export default async function handler(req, res) {
  try {
    const { data: products, error } = await supabase
      .from("productos")
      .select("id, nombre, slug, detalles, precio_base, imagen_url")
      .eq("activo", true);

    if (error) {
      console.error("Error al consultar productos en Supabase:", error);
      throw new Error("No se pudieron obtener los productos de la base de datos.");
    }

    const formattedProducts = (products ?? []).map((product) => ({
      id: product.id,
      title: product.nombre,
      description:
        product.detalles?.descripcion_larga?.sabor ||
        `Sofá de diseño ${product.nombre}, fabricado artesanalmente en Uruguay. Calidad y confort garantizados.`,
      availability: "in stock",
      condition: "new",
      price: `${product.precio_base.toFixed(2)} UYU`,
      link: getMetaProductLink(product),
      image_link: getMetaImageLink(product),
      brand: "Tapicería Ivar",
    }));

    const csvData = convertToCsv(formattedProducts);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="product_feed.csv"',
    );
    res.status(200).send(csvData);
  } catch (error) {
    console.error("Error generando el feed de productos:", error.message);
    res.status(500).json({ error: "Error interno al generar el feed de productos." });
  }
}
