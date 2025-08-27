// supabase/functions/enviar-notificacion-pedido/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend@1.0.0"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const ADMIN_EMAIL = "ivartapiceria@gmail.com"

// --- CABECERAS DE PERMISO (CORS) ---
// Le decimos al navegador que nuestra web en Vercel tiene permiso
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // --- MANEJO DE LA PREGUNTA DE PERMISO (OPTIONS) ---
  // Si el navegador solo está preguntando por permisos, le respondemos que sí y terminamos.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Si no era una pregunta, continuamos con la lógica de siempre...
  const resend = new Resend(RESEND_API_KEY)

  try {
    const orderData = await req.json()
    const { numero_pedido, total_pedido, datos_cliente } = orderData

    const emailHtml = `
      <div>
        <h1>¡Nuevo Pedido Recibido! - #${numero_pedido}</h1>
        <p>Se ha generado un nuevo pedido en la tienda online.</p>
        <hr>
        <h3>Detalles del Cliente:</h3>
        <ul>
          <li><strong>Nombre:</strong> ${datos_cliente.nombre} ${datos_cliente.apellido}</li>
          <li><strong>Email:</strong> ${datos_cliente.email}</li>
          <li><strong>Teléfono:</strong> ${datos_cliente.telefono}</li>
        </ul>
        <h3>Detalles del Pedido:</h3>
        <ul>
          <li><strong>Monto Total:</strong> $ ${total_pedido.toLocaleString('es-UY')}</li>
          <li><strong>Método de Entrega:</strong> ${datos_cliente.shippingMethod}</li>
        </ul>
        <hr>
        <p>Puedes ver todos los detalles del pedido en el panel de administración:</p>
        <a href="https://www.tapiceriaivar.com.uy/gestion-pedidos-ivar">Ir al Panel de Administración</a>
      </div>
    `
    await resend.emails.send({
      from: "Tapicería Ivar <notificaciones@tapiceriaivar.com.uy>",
      to: ADMIN_EMAIL,
      subject: `Nuevo Pedido #${numero_pedido} - ${datos_cliente.nombre} ${datos_cliente.apellido}`,
      html: emailHtml,
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, // Añadimos los headers a la respuesta final
      status: 200,
    })

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error al enviar el email:", errorMessage);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, // Añadimos los headers a la respuesta de error
      status: 500,
    });
  }
})