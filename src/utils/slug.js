/**
 * Genera un slug URL-friendly a partir de un texto (p. ej. nombre del producto).
 */
export function generateSlug(text) {
  if (!text) return "";

  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Normaliza lo que el usuario escribe en el campo slug.
 * Con `forInput: true` conserva un guión al final mientras se escribe (p. ej. "sofa-").
 */
export function normalizeProductSlug(value, { forInput = false } = {}) {
  if (!value) return "";

  let result = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/g, "");

  if (!forInput) {
    result = result.replace(/-+$/g, "");
  }

  return result;
}

export const PRODUCT_PAGE_BASE_URL = "https://www.tapiceriaivar.com.uy/producto";
