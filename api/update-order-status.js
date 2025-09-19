// Ruta: /api/update-order-status.js
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Inicializamos el cliente de Supabase para el backend.
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Función para hashear datos.
const hash = (data) => {
  return data ? crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex') : undefined;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { orderId, newStatus } = req.body;

    // Paso 1: Actualizar el estado del pedido en la base de datos.
    const { error: updateError } = await supabase
      .from('pedidos')
      .update({ estado: newStatus })
      .eq('id', orderId);

    if (updateError) throw updateError;

    // Paso 2: Si el nuevo estado es "Pago realizado", construir y enviar el evento a Meta.
    if (newStatus === 'Pago realizado') {
      // Necesitamos los datos completos del pedido para enviar la info correcta.
      const { data: orderData, error: orderError } = await supabase
        .from('pedidos')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      
      const accessToken = process.env.META_ACCESS_TOKEN;
      const pixelId = process.env.META_PIXEL_ID;
      const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;

      // Construimos el payload COMPLETO para la API de Conversiones.
      const payload = {
        data: [{
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'physical_store',
          event_id: `manual_${orderData.id}`,
          user_data: {
            em: hash(orderData.datos_cliente?.email),
            ph: hash(orderData.datos_cliente?.telefono),
            fn: hash(orderData.datos_cliente?.nombre),
            ln: hash(orderData.datos_cliente?.apellido),
            // Asegúrate de guardar estos datos en el pedido si quieres mejorar el matching
            // client_ip_address: orderData.datos_cliente?.ip_address, 
            // client_user_agent: orderData.datos_cliente?.user_agent,
          },
          custom_data: {
            currency: 'UYU',
            value: orderData.total_pedido,
          },
        }],
      };
      
      // La lógica del "guardia de seguridad" con el "interruptor de prueba"
      if (process.env.VERCEL_ENV === 'production' || process.env.VITE_ENABLE_META_TRACKING_IN_PREVIEW === 'true') {
        // Enviamos el evento a Meta
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        console.log(`Evento Purchase para pedido ${orderData.numero_pedido} enviado a Meta.`);
      } else {
        // En previsualización (sin el interruptor), solo lo mostramos en la consola de Vercel.
        console.log(`Evento Purchase NO enviado a Meta (entorno de prueba). Pedido: ${orderData.numero_pedido}`);
      }
    }

    res.status(200).json({ status: 'success' });

  } catch (error) {
    console.error('Error en /api/update-order-status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}