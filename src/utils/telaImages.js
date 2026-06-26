/**
 * URLs de swatches de tela. Preferir imagen_swatch_url pre-generada al subir (Plan Free).
 */

export function getTelaThumbnailUrl(fullUrl, tela) {
  if (tela?.imagen_swatch_url) {
    return tela.imagen_swatch_url;
  }

  return fullUrl || "";
}
