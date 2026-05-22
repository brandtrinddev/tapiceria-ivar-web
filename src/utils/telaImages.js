import { supabase } from "../supabaseClient";

const BUCKET = "imagenes-productos";
const PUBLIC_OBJECT_MARKER = `/storage/v1/object/public/${BUCKET}/`;
const RENDER_IMAGE_MARKER = `/storage/v1/render/image/public/${BUCKET}/`;

const SWATCH_TRANSFORM = {
  width: 96,
  height: 96,
  resize: "cover",
  quality: 80,
};

/**
 * Extrae el path relativo dentro del bucket (ej: "telas/1234-abc.webp")
 * desde una URL pública o de render de Supabase Storage.
 */
export function extractImagenesProductosPath(fullUrl) {
  if (!fullUrl || typeof fullUrl !== "string") {
    return null;
  }

  const trimmed = fullUrl.trim();
  if (!trimmed) return null;

  try {
    const pathname = trimmed.startsWith("http")
      ? new URL(trimmed).pathname
      : trimmed.split("?")[0];

    let relativePath = null;

    if (pathname.includes(RENDER_IMAGE_MARKER)) {
      relativePath = pathname.split(RENDER_IMAGE_MARKER)[1];
    } else if (pathname.includes(PUBLIC_OBJECT_MARKER)) {
      relativePath = pathname.split(PUBLIC_OBJECT_MARKER)[1];
    } else if (!trimmed.startsWith("http") && !trimmed.startsWith("/storage")) {
      relativePath = trimmed.replace(/^\/+/, "");
    }

    if (!relativePath) return null;

    relativePath = relativePath.split("?")[0].replace(/^\/+/, "");
    return decodeURIComponent(relativePath);
  } catch {
    return null;
  }
}

/**
 * URL optimizada para swatches (~48px en pantalla, 96px para retina).
 * Si no es una URL de nuestro bucket, devuelve la original.
 */
export function getTelaThumbnailUrl(fullUrl) {
  if (!fullUrl) return "";

  const storagePath = extractImagenesProductosPath(fullUrl);
  if (!storagePath) {
    return fullUrl;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath, {
    transform: SWATCH_TRANSFORM,
  });

  return data?.publicUrl ?? fullUrl;
}
