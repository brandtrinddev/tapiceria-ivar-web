import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient.js";
import { formatSupabaseFetchError } from "./useActiveProducts.js";

/** Columnas necesarias para la página de detalle (sin select *). */
export const PRODUCT_DETAIL_COLUMNS =
  "id, nombre, slug, precio_base, imagen_url, metros_tela_base, detalles, sku, categoria";

const STALE_TIME_MS = 5 * 60 * 1000;

async function fetchProductBySlug(slug) {
  const { data, error } = await supabase
    .from("productos")
    .select(PRODUCT_DETAIL_COLUMNS)
    .eq("slug", slug)
    .single();

  if (error) {
    console.error(
      `Error al obtener producto "${slug}":`,
      formatSupabaseFetchError(error),
    );
    throw error;
  }

  return data;
}

export function useProductBySlug(slug) {
  return useQuery({
    queryKey: ["products", "slug", slug],
    queryFn: () => fetchProductBySlug(slug),
    enabled: Boolean(slug),
    staleTime: STALE_TIME_MS,
  });
}
