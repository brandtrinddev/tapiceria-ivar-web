export const IMAGENES_BUCKET = "imagenes-productos";

const STORAGE_PUBLIC_MARKER = `/storage/v1/object/public/${IMAGENES_BUCKET}/`;

/** Ruta relativa en el bucket (p. ej. productos/foo.webp) desde URL pública de Supabase. */
export function extractImagenesProductosPath(fullUrl) {
  if (!fullUrl || typeof fullUrl !== "string") return null;
  const idx = fullUrl.indexOf(STORAGE_PUBLIC_MARKER);
  if (idx === -1) return null;
  return fullUrl.slice(idx + STORAGE_PUBLIC_MARKER.length).split("?")[0];
}

/**
 * Corrige doble codificación en URLs públicas de Storage (%2520 → %20).
 * Ocurre cuando el basename ya venía percent-encoded (telas legacy con espacios).
 */
export function normalizeStoragePublicUrl(url) {
  if (!url || typeof url !== "string") return url ?? "";
  let normalized = url;
  while (/%25[0-9a-f]{2}/i.test(normalized)) {
    const next = normalized.replace(/%25([0-9a-f]{2})/gi, "%$1");
    if (next === normalized) break;
    normalized = next;
  }
  return normalized;
}
