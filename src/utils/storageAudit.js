import {
  IMAGENES_BUCKET,
  extractImagenesProductosPath,
} from "./storageUrls.js";

/** Carpetas/archivos usados en el sitio pero no referenciados en la BD. */
export const PROTECTED_STORAGE_PREFIXES = ["hero/"];

const PRODUCT_SELECT = "imagen_url, detalles";
const TELA_SELECT = "imagen_url, imagen_swatch_url";

function normalizeStoragePath(path) {
  if (!path || typeof path !== "string") return "";
  try {
    return decodeURIComponent(path).replace(/\\/g, "/");
  } catch {
    return path;
  }
}

function addReferencedPath(referenced, url) {
  const path = extractImagenesProductosPath(url);
  if (!path) return;
  referenced.add(path);
  referenced.add(normalizeStoragePath(path));
}

function isProtectedPath(path) {
  return PROTECTED_STORAGE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

async function listStorageFiles(supabase, folder = "") {
  const results = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage
      .from(IMAGENES_BUCKET)
      .list(folder, { limit, offset });

    if (error) throw error;
    if (!data?.length) break;

    for (const item of data) {
      const itemPath = folder ? `${folder}/${item.name}` : item.name;

      if (item.metadata) {
        results.push({
          path: itemPath,
          size: item.metadata.size ?? 0,
        });
      } else {
        const nested = await listStorageFiles(supabase, itemPath);
        results.push(...nested);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return results;
}

export async function collectReferencedStoragePaths(supabase) {
  const referenced = new Set();

  const { data: products, error: productsError } = await supabase
    .from("productos")
    .select(PRODUCT_SELECT);

  if (productsError) throw productsError;

  for (const product of products ?? []) {
    addReferencedPath(referenced, product.imagen_url);

    const detalles = product.detalles || {};
    addReferencedPath(referenced, detalles.imagen_card_url);
    addReferencedPath(referenced, detalles.imagen_thumb_url);

    if (Array.isArray(detalles.galeria)) {
      for (const url of detalles.galeria) {
        addReferencedPath(referenced, url);
      }
    }

    const thumbs = detalles.galeria_thumbs;
    if (thumbs && typeof thumbs === "object") {
      for (const url of Object.values(thumbs)) {
        addReferencedPath(referenced, url);
      }
    }
  }

  const { data: telas, error: telasError } = await supabase
    .from("telas")
    .select(TELA_SELECT);

  if (telasError) throw telasError;

  for (const tela of telas ?? []) {
    addReferencedPath(referenced, tela.imagen_url);
    addReferencedPath(referenced, tela.imagen_swatch_url);
  }

  return referenced;
}

function isReferenced(path, referenced) {
  if (isProtectedPath(path)) return true;
  if (referenced.has(path)) return true;
  return referenced.has(normalizeStoragePath(path));
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Compara archivos del bucket con URLs en productos/telas.
 * No elimina nada; devuelve lista de huérfanos candidatos.
 */
export async function auditStorageOrphans(
  supabase,
  { onProgress, isCancelled } = {},
) {
  onProgress?.({ phase: "db", label: "Leyendo referencias en la base de datos..." });

  const referenced = await collectReferencedStoragePaths(supabase);

  if (isCancelled?.()) {
    return null;
  }

  onProgress?.({ phase: "storage", label: "Listando archivos en Storage..." });

  const allFiles = await listStorageFiles(supabase);
  const orphans = [];
  let referencedCount = 0;
  let protectedCount = 0;

  for (const file of allFiles) {
    if (isCancelled?.()) return null;

    if (isProtectedPath(file.path)) {
      protectedCount += 1;
      continue;
    }

    if (isReferenced(file.path, referenced)) {
      referencedCount += 1;
      continue;
    }

    orphans.push(file);
  }

  const orphanBytes = orphans.reduce((sum, f) => sum + (f.size || 0), 0);

  return {
    totalFiles: allFiles.length,
    referencedCount,
    protectedCount,
    orphanCount: orphans.length,
    orphanBytes,
    orphanBytesLabel: formatBytes(orphanBytes),
    orphans: orphans.sort((a, b) => (b.size || 0) - (a.size || 0)),
  };
}

const DELETE_BATCH_SIZE = 50;

export async function deleteStorageOrphans(
  supabase,
  orphanPaths,
  { onProgress, isCancelled } = {},
) {
  const deleted = [];
  const errors = [];

  for (let i = 0; i < orphanPaths.length; i += DELETE_BATCH_SIZE) {
    if (isCancelled?.()) break;

    const batch = orphanPaths.slice(i, i + DELETE_BATCH_SIZE);
    onProgress?.({
      current: Math.min(i + batch.length, orphanPaths.length),
      total: orphanPaths.length,
      label: `Eliminando ${batch.length} archivo(s)...`,
    });

    const { error } = await supabase.storage
      .from(IMAGENES_BUCKET)
      .remove(batch);

    if (error) {
      errors.push(
        `Lote ${Math.floor(i / DELETE_BATCH_SIZE) + 1}: ${error.message}`,
      );
      continue;
    }

    deleted.push(...batch);
  }

  return {
    deletedCount: deleted.length,
    failedCount: orphanPaths.length - deleted.length,
    errors,
  };
}

export { formatBytes };
