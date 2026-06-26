import { createClient } from "@supabase/supabase-js";

const BUCKET = "imagenes-productos";
const BATCH_SIZE = 50;

/**
 * Elimina archivos del bucket usando service role (el cliente anon no tiene política DELETE).
 *
 * Variables en Vercel:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY
 *   ADMIN_SECRET_CODE — mismo valor que VITE_ADMIN_SECRET_CODE del frontend
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const adminSecret = process.env.ADMIN_SECRET_CODE;
  if (!adminSecret) {
    return res.status(500).json({
      error:
        "Falta ADMIN_SECRET_CODE en Vercel (mismo valor que VITE_ADMIN_SECRET_CODE).",
    });
  }

  const { paths, adminCode } = req.body ?? {};
  if (adminCode !== adminSecret) {
    return res.status(401).json({ error: "No autorizado" });
  }

  if (!Array.isArray(paths) || paths.length === 0) {
    return res.status(400).json({ error: "Se requiere un array paths con al menos un archivo." });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({
      error: "Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en Vercel.",
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const deleted = [];
  const errors = [];

  for (let i = 0; i < paths.length; i += BATCH_SIZE) {
    const batch = paths.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);

    if (error) {
      errors.push(
        `Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`,
      );
      continue;
    }

    deleted.push(...batch);
  }

  return res.status(200).json({
    deletedCount: deleted.length,
    failedCount: paths.length - deleted.length,
    errors,
  });
}
