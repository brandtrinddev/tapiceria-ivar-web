import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient.js";

export const ACTIVE_PRODUCTS_QUERY_KEY = ["products", "active"];

/** Columnas necesarias para catálogo, tarjetas y destacados en home. */
const ACTIVE_PRODUCT_COLUMNS =
  "id, nombre, slug, precio_base, imagen_url, descripcion, categoria, sku, es_destacado, detalles";

const STALE_TIME_MS = 5 * 60 * 1000;

export function formatSupabaseFetchError(error) {
  if (!error) return null;
  return {
    status: error.status ?? null,
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
  };
}

async function fetchActiveProducts() {
  const { data, error } = await supabase
    .from("productos")
    .select(ACTIVE_PRODUCT_COLUMNS)
    .eq("activo", true);

  if (error) {
    console.error(
      "Error al obtener productos activos:",
      formatSupabaseFetchError(error),
    );
    throw error;
  }

  return data ?? [];
}

export function useActiveProducts() {
  return useQuery({
    queryKey: ACTIVE_PRODUCTS_QUERY_KEY,
    queryFn: fetchActiveProducts,
    staleTime: STALE_TIME_MS,
  });
}
