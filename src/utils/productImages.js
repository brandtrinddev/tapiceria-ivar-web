/**
 * URLs de producto por contexto de visualización.
 * Las variantes card/thumb se generan al subir en Admin (Plan Free sin transforms).
 * Si no existen, se usa la imagen principal (comportamiento previo).
 */

export function getProductCardImageUrl(product) {
  if (!product) return "";
  return product.detalles?.imagen_card_url || product.imagen_url || "";
}

export function getProductDetailImageUrl(masterUrl) {
  return masterUrl || "";
}

/**
 * Miniaturas (galería 80px, carrito 120px). ~320px de ancho = nitidez en retina.
 */
export function getProductThumbImageUrl(masterUrl, product) {
  if (!masterUrl) return "";

  if (
    product?.imagen_url === masterUrl &&
    product.detalles?.imagen_thumb_url
  ) {
    return product.detalles.imagen_thumb_url;
  }

  const galleryThumbs = product?.detalles?.galeria_thumbs;
  if (
    galleryThumbs &&
    typeof galleryThumbs === "object" &&
    galleryThumbs[masterUrl]
  ) {
    return galleryThumbs[masterUrl];
  }

  return masterUrl;
}
