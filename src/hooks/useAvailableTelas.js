import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient.js";
import { formatSupabaseFetchError } from "./useActiveProducts.js";

export const AVAILABLE_TELAS_QUERY_KEY = ["telas", "available"];

const TELA_LIST_COLUMNS =
  "id, nombre_tipo, nombre_color, imagen_url, imagen_swatch_url, costo_adicional_por_metro, disponible, descripcion, caracteristicas";

const STALE_TIME_MS = 5 * 60 * 1000;

async function fetchAvailableTelas() {
  const { data, error } = await supabase
    .from("telas")
    .select(TELA_LIST_COLUMNS)
    .eq("disponible", true);

  if (error) {
    console.error(
      "Error al obtener telas disponibles:",
      formatSupabaseFetchError(error),
    );
    throw error;
  }

  return data ?? [];
}

export function useAvailableTelas() {
  return useQuery({
    queryKey: AVAILABLE_TELAS_QUERY_KEY,
    queryFn: fetchAvailableTelas,
    staleTime: STALE_TIME_MS,
  });
}
