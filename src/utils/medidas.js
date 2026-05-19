/** Dimensiones estándar por módulo (orden de visualización). */
export const DIMENSIONES_ESTANDAR = ['ancho', 'alto', 'profundidad'];

export const NOMBRES_DIMENSIONES = {
  ancho: 'Ancho',
  alto: 'Altura',
  profundidad: 'Profundidad',
};

/**
 * Convierte un nombre legible en clave slug para JSONB (ej: "Mesa Puente" → "mesa_puente").
 */
export function slugifyModulo(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

/**
 * Convierte una clave slug en etiqueta legible (ej: "mesa_puente" → "Mesa Puente").
 */
export function humanizeModuloKey(key) {
  if (!key || typeof key !== 'string') return '';
  return key
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const hasDimensionValue = (value) =>
  value != null && String(value).trim() !== '';

/**
 * Entradas de dimensiones con valor, ordenadas: estándar primero, extras después.
 */
export function getDimensionEntriesForDisplay(dimensions) {
  if (!dimensions || typeof dimensions !== 'object' || Array.isArray(dimensions)) {
    return [];
  }

  const entries = Object.entries(dimensions).filter(([, val]) =>
    hasDimensionValue(val),
  );

  const orderIndex = (key) => {
    const idx = DIMENSIONES_ESTANDAR.indexOf(key);
    return idx === -1 ? DIMENSIONES_ESTANDAR.length : idx;
  };

  return entries.sort(([keyA], [keyB]) => {
    const diff = orderIndex(keyA) - orderIndex(keyB);
    return diff !== 0 ? diff : keyA.localeCompare(keyB);
  });
}

/**
 * Etiqueta visible del módulo: alias conocido o humanize del slug.
 */
export function getModuloDisplayName(moduleKey, aliases = {}) {
  if (!moduleKey) return '';
  return aliases[moduleKey] || humanizeModuloKey(moduleKey);
}

/**
 * Módulos que tienen al menos una dimensión con valor (para vitrina).
 */
export function getModulosConMedidas(medidas) {
  if (!medidas || typeof medidas !== 'object' || Array.isArray(medidas)) {
    return [];
  }

  return Object.entries(medidas).filter(
    ([, dims]) => getDimensionEntriesForDisplay(dims).length > 0,
  );
}

/**
 * Elimina módulos vacíos y normaliza claves/valores antes de persistir en Supabase.
 * Conserva dimensiones extra (ej. profundidadTotalChaise) si tienen valor.
 */
export function sanitizeMedidas(medidas) {
  if (!medidas || typeof medidas !== 'object' || Array.isArray(medidas)) {
    return {};
  }

  const cleaned = {};

  for (const [rawKey, dimensions] of Object.entries(medidas)) {
    const moduleKey = slugifyModulo(rawKey) || rawKey;
    if (!moduleKey || typeof dimensions !== 'object' || dimensions === null) {
      continue;
    }

    const dims = {};
    let hasValue = false;

    for (const dim of DIMENSIONES_ESTANDAR) {
      if (hasDimensionValue(dimensions[dim])) {
        dims[dim] = String(dimensions[dim]).trim();
        hasValue = true;
      }
    }

    for (const [dim, val] of Object.entries(dimensions)) {
      if (DIMENSIONES_ESTANDAR.includes(dim)) continue;
      if (hasDimensionValue(val)) {
        dims[dim] = String(val).trim();
        hasValue = true;
      }
    }

    if (hasValue) {
      cleaned[moduleKey] = dims;
    }
  }

  return cleaned;
}

/**
 * Genera un slug único dentro del objeto medidas existente.
 */
export function getUniqueModuloSlug(baseLabel, medidas = {}) {
  const base = slugifyModulo(baseLabel) || 'modulo';
  let candidate = base;
  let counter = 2;

  while (medidas[candidate]) {
    candidate = `${base}_${counter}`;
    counter += 1;
  }

  return candidate;
}
