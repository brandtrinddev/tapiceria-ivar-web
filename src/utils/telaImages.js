/**
 * URLs de swatches de tela. Preferir imagen_swatch_url pre-generada al subir (Plan Free).
 */

import { normalizeStoragePublicUrl } from "./imageProcessing.js";

export function getTelaThumbnailUrl(fullUrl, tela) {
  if (tela?.imagen_swatch_url) {
    return normalizeStoragePublicUrl(tela.imagen_swatch_url);
  }

  return normalizeStoragePublicUrl(fullUrl || "");
}
