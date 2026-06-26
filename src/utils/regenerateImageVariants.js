import {
  getStorageBaseName,
  uploadProductCardThumbVariants,
  uploadProductThumbVariant,
  uploadTelaSwatchVariant,
} from "./storageImageVariants.js";
import { loadImageFromPublicUrl } from "./imageProcessing.js";

const PRODUCT_SELECT =
  "id, nombre, imagen_url, detalles";
const TELA_SELECT =
  "id, nombre_tipo, nombre_color, imagen_url, imagen_swatch_url";

function productNeedsRegeneration(product, force) {
  if (!product.imagen_url) return false;
  if (force) return true;

  const detalles = product.detalles || {};
  const missingMain =
    !detalles.imagen_card_url || !detalles.imagen_thumb_url;

  const galeria = Array.isArray(detalles.galeria) ? detalles.galeria : [];
  const thumbs = detalles.galeria_thumbs || {};
  const missingGallery = galeria.some(
    (url) => typeof url === "string" && url && !thumbs[url],
  );

  return missingMain || missingGallery;
}

function telaNeedsRegeneration(tela, force) {
  if (!tela.imagen_url) return false;
  return force || !tela.imagen_swatch_url;
}

async function regenerateProduct(supabase, product, force) {
  if (!productNeedsRegeneration(product, force)) {
    return { status: "skipped", label: product.nombre };
  }

  const masterUrl = product.imagen_url;
  const baseName = getStorageBaseName(masterUrl, "productos");
  if (!baseName) {
    throw new Error("URL de imagen principal no reconocida");
  }

  const img = await loadImageFromPublicUrl(masterUrl);
  const variants = await uploadProductCardThumbVariants(
    supabase,
    img,
    baseName,
  );

  const detalles = { ...(product.detalles || {}) };
  const galeria = Array.isArray(detalles.galeria) ? detalles.galeria : [];
  const galeriaThumbs = { ...(detalles.galeria_thumbs || {}) };

  for (const galleryUrl of galeria) {
    if (typeof galleryUrl !== "string" || !galleryUrl) continue;
    if (!force && galeriaThumbs[galleryUrl]) continue;

    const galleryBase = getStorageBaseName(galleryUrl, "productos");
    if (!galleryBase) continue;

    const galleryImg = await loadImageFromPublicUrl(galleryUrl);
    galeriaThumbs[galleryUrl] = await uploadProductThumbVariant(
      supabase,
      galleryImg,
      galleryBase,
    );
  }

  const updatedDetalles = {
    ...detalles,
    imagen_card_url: variants.card,
    imagen_thumb_url: variants.thumb,
    galeria_thumbs: galeriaThumbs,
  };

  const { error } = await supabase
    .from("productos")
    .update({ detalles: updatedDetalles })
    .eq("id", product.id);

  if (error) throw error;

  return { status: "updated", label: product.nombre };
}

async function regenerateTela(supabase, tela, force) {
  if (!telaNeedsRegeneration(tela, force)) {
    return {
      status: "skipped",
      label: `${tela.nombre_tipo} – ${tela.nombre_color}`,
    };
  }

  const baseName = getStorageBaseName(tela.imagen_url, "telas");
  if (!baseName) {
    throw new Error("URL de tela no reconocida");
  }

  const img = await loadImageFromPublicUrl(tela.imagen_url);
  const swatchUrl = await uploadTelaSwatchVariant(supabase, img, baseName);

  const { error } = await supabase
    .from("telas")
    .update({ imagen_swatch_url: swatchUrl })
    .eq("id", tela.id);

  if (error) throw error;

  return {
    status: "updated",
    label: `${tela.nombre_tipo} – ${tela.nombre_color}`,
  };
}

/**
 * Regenera variantes card/thumb de productos y swatch de telas desde las imágenes master existentes.
 */
export async function regenerateAllImageVariants(
  supabase,
  { force = false, onProgress, isCancelled } = {},
) {
  const summary = {
    productsUpdated: 0,
    productsSkipped: 0,
    productsFailed: 0,
    telasUpdated: 0,
    telasSkipped: 0,
    telasFailed: 0,
    errors: [],
  };

  const report = (current, total, label) => {
    onProgress?.({ current, total, label });
  };

  const { data: products, error: productsError } = await supabase
    .from("productos")
    .select(PRODUCT_SELECT);

  if (productsError) throw productsError;

  const { data: telas, error: telasError } = await supabase
    .from("telas")
    .select(TELA_SELECT);

  if (telasError) throw telasError;

  const productList = products ?? [];
  const telaList = telas ?? [];
  const totalSteps = productList.length + telaList.length;
  let step = 0;

  for (const product of productList) {
    if (isCancelled?.()) break;

    step += 1;
    report(step, totalSteps, `Producto: ${product.nombre}`);

    try {
      const result = await regenerateProduct(supabase, product, force);
      if (result.status === "updated") summary.productsUpdated += 1;
      else summary.productsSkipped += 1;
    } catch (err) {
      summary.productsFailed += 1;
      const message =
        err instanceof Error ? err.message : "Error desconocido";
      summary.errors.push(`${product.nombre}: ${message}`);
      console.error(`Regenerar producto "${product.nombre}":`, err);
    }
  }

  for (const tela of telaList) {
    if (isCancelled?.()) break;

    step += 1;
    const label = `${tela.nombre_tipo} – ${tela.nombre_color}`;
    report(step, totalSteps, `Tela: ${label}`);

    try {
      const result = await regenerateTela(supabase, tela, force);
      if (result.status === "updated") summary.telasUpdated += 1;
      else summary.telasSkipped += 1;
    } catch (err) {
      summary.telasFailed += 1;
      const message =
        err instanceof Error ? err.message : "Error desconocido";
      summary.errors.push(`${label}: ${message}`);
      console.error(`Regenerar tela "${label}":`, err);
    }
  }

  return summary;
}
