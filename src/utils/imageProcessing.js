import heic2any from "heic2any";

export const IMAGENES_BUCKET = "imagenes-productos";

const STORAGE_PUBLIC_MARKER = `/storage/v1/object/public/${IMAGENES_BUCKET}/`;

/** Ruta relativa en el bucket (p. ej. productos/foo.webp) desde URL pública de Supabase. */
export function extractImagenesProductosPath(fullUrl) {
  if (!fullUrl || typeof fullUrl !== "string") return null;
  const idx = fullUrl.indexOf(STORAGE_PUBLIC_MARKER);
  if (idx === -1) return null;
  return fullUrl.slice(idx + STORAGE_PUBLIC_MARKER.length).split("?")[0];
}

export const isHeicFile = (file) => {
  const type = (file.type || "").toLowerCase();
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    /\.heic$/i.test(file.name) ||
    /\.heif$/i.test(file.name)
  );
};

export const convertHeicToJpegFile = async (file) => {
  try {
    const result = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });
    const blob = Array.isArray(result) ? result[0] : result;
    if (!blob) {
      throw new Error("La conversión HEIC no produjo ninguna imagen.");
    }
    const baseName = file.name.replace(/\.(heic|heif)$/i, "") || "imagen";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "No se pudo convertir la imagen HEIC.";
    throw new Error(
      `${message} Prueba exportar como JPEG desde el iPhone o usa otro navegador.`,
    );
  }
};

export const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error("No se pudo leer el archivo de imagen."));
    reader.onload = (event) => resolve(event.target.result);
    reader.readAsDataURL(file);
  });

export const loadImageFromDataUrl = (dataUrl) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () =>
      reject(
        new Error("Formato de imagen no compatible o archivo corrupto."),
      );
    img.onload = () => resolve(img);
    img.src = dataUrl;
  });

export const canvasToWebpBlob = (canvas, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Error al comprimir la imagen a WebP."));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      quality,
    );
  });

export const createWebpFileFromImage = async (
  img,
  maxWidth,
  quality,
  outName,
) => {
  let width = img.width;
  let height = img.height;
  if (!width || !height) {
    throw new Error("La imagen no tiene dimensiones válidas.");
  }

  if (width > maxWidth) {
    height *= maxWidth / width;
    width = maxWidth;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo procesar la imagen en este navegador.");
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await canvasToWebpBlob(canvas, quality);
  return new File([blob], outName, { type: "image/webp" });
};

export const createSwatchWebpFromImage = async (img, size, quality, outName) => {
  const minDim = Math.min(img.width, img.height);
  if (!minDim) {
    throw new Error("La imagen no tiene dimensiones válidas.");
  }

  const sx = (img.width - minDim) / 2;
  const sy = (img.height - minDim) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo procesar la imagen en este navegador.");
  }

  ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

  const blob = await canvasToWebpBlob(canvas, quality);
  return new File([blob], outName, { type: "image/webp" });
};

export const loadImageFromFile = async (file) => {
  let inputFile = file;
  if (isHeicFile(file)) {
    inputFile = await convertHeicToJpegFile(file);
  }
  const dataUrl = await readFileAsDataUrl(inputFile);
  return loadImageFromDataUrl(dataUrl);
};

export const loadImageFromPublicUrl = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar la imagen (${response.status})`);
  }
  const blob = await response.blob();
  const dataUrl = await readFileAsDataUrl(
    new File([blob], "source.webp", { type: blob.type || "image/webp" }),
  );
  return loadImageFromDataUrl(dataUrl);
};

export const optimizeImageFile = async (file, isFabric = false) => {
  const MAX_WIDTH = isFabric ? 1400 : 1200;
  const quality = isFabric ? 0.9 : 0.8;
  const img = await loadImageFromFile(file);
  const outName = (file.name || "imagen").replace(/\.[^/.]+$/, ".webp");
  return createWebpFileFromImage(img, MAX_WIDTH, quality, outName);
};
