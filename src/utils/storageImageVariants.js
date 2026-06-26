import {
  IMAGENES_BUCKET,
  extractImagenesProductosPath,
  createSwatchWebpFromImage,
  createWebpFileFromImage,
  loadImageFromFile,
  loadImageFromPublicUrl,
} from "./imageProcessing.js";

export function getStorageBaseName(fullUrl, folder) {
  const path = extractImagenesProductosPath(fullUrl);
  if (!path || !path.startsWith(`${folder}/`)) {
    return null;
  }

  const filePart = path.slice(folder.length + 1);
  return filePart
    .replace(/\.webp$/i, "")
    .replace(/-(card|thumb|swatch)$/, "");
}

export async function uploadStorageFile(
  supabase,
  filePath,
  file,
  { upsert = false } = {},
) {
  const { error } = await supabase.storage
    .from(IMAGENES_BUCKET)
    .upload(filePath, file, upsert ? { upsert: true } : undefined);

  if (error) throw error;

  const { data } = supabase.storage
    .from(IMAGENES_BUCKET)
    .getPublicUrl(filePath);
  return data.publicUrl;
}

export async function uploadProductCardThumbVariants(
  supabase,
  img,
  baseName,
) {
  const cardFile = await createWebpFileFromImage(
    img,
    800,
    0.82,
    `${baseName}-card.webp`,
  );
  const thumbFile = await createWebpFileFromImage(
    img,
    320,
    0.8,
    `${baseName}-thumb.webp`,
  );

  const card = await uploadStorageFile(
    supabase,
    `productos/${baseName}-card.webp`,
    cardFile,
    { upsert: true },
  );
  const thumb = await uploadStorageFile(
    supabase,
    `productos/${baseName}-thumb.webp`,
    thumbFile,
    { upsert: true },
  );

  return { card, thumb };
}

/** Master 1200px + card 800px + thumb 320px. */
export async function uploadProductImageSet(supabase, file) {
  const img = await loadImageFromFile(file);
  const baseName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const variants = [
    { key: "master", suffix: "", maxWidth: 1200, quality: 0.82 },
    { key: "card", suffix: "-card", maxWidth: 800, quality: 0.82 },
    { key: "thumb", suffix: "-thumb", maxWidth: 320, quality: 0.8 },
  ];

  const urls = {};
  for (const variant of variants) {
    const fileName = `${baseName}${variant.suffix}.webp`;
    const webpFile = await createWebpFileFromImage(
      img,
      variant.maxWidth,
      variant.quality,
      fileName,
    );
    urls[variant.key] = await uploadStorageFile(
      supabase,
      `productos/${fileName}`,
      webpFile,
    );
  }

  return urls;
}

/** Master 1400px + swatch 192px. */
export async function uploadTelaImageSet(supabase, file) {
  const img = await loadImageFromFile(file);
  const baseName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const masterFile = await createWebpFileFromImage(
    img,
    1400,
    0.9,
    `${baseName}.webp`,
  );
  const swatchFile = await createSwatchWebpFromImage(
    img,
    192,
    0.85,
    `${baseName}-swatch.webp`,
  );

  const master = await uploadStorageFile(
    supabase,
    `telas/${baseName}.webp`,
    masterFile,
  );
  const swatch = await uploadStorageFile(
    supabase,
    `telas/${baseName}-swatch.webp`,
    swatchFile,
  );

  return { master, swatch };
}

export async function uploadProductThumbVariant(supabase, img, baseName) {
  const thumbFile = await createWebpFileFromImage(
    img,
    320,
    0.8,
    `${baseName}-thumb.webp`,
  );
  return uploadStorageFile(
    supabase,
    `productos/${baseName}-thumb.webp`,
    thumbFile,
    { upsert: true },
  );
}

export async function uploadTelaSwatchVariant(supabase, img, baseName) {
  const swatchFile = await createSwatchWebpFromImage(
    img,
    192,
    0.85,
    `${baseName}-swatch.webp`,
  );
  return uploadStorageFile(
    supabase,
    `telas/${baseName}-swatch.webp`,
    swatchFile,
    { upsert: true },
  );
}

export async function createVariantsFromMasterUrl(
  supabase,
  masterUrl,
  folder,
) {
  const baseName = getStorageBaseName(masterUrl, folder);
  if (!baseName) {
    throw new Error("URL de imagen no reconocida en el bucket");
  }

  const img = await loadImageFromPublicUrl(masterUrl);

  if (folder === "productos") {
    return uploadProductCardThumbVariants(supabase, img, baseName);
  }

  if (folder === "telas") {
    const swatch = await uploadTelaSwatchVariant(supabase, img, baseName);
    return { swatch };
  }

  throw new Error(`Carpeta no soportada: ${folder}`);
}
