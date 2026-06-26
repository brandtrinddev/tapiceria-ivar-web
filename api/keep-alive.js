import { createClient } from "@supabase/supabase-js";

/**
 * Ping liviano a PostgREST para mantener actividad en el proyecto Supabase (Plan Free).
 * Invocado por Vercel Cron. Configurar CRON_SECRET en Vercel para proteger el endpoint.
 */
export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: "No autorizado" });
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: "Faltan SUPABASE_URL y SUPABASE_ANON_KEY (o SUPABASE_SERVICE_KEY)",
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from("productos")
    .select("id")
    .eq("activo", true)
    .limit(1);

  if (error) {
    console.error("keep-alive: error en consulta Supabase", error);
    return res.status(502).json({
      ok: false,
      code: error.code,
      message: error.message,
    });
  }

  return res.status(200).json({ ok: true, at: new Date().toISOString() });
}
