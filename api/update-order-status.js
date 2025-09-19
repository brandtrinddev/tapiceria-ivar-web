// Ruta: /api/update-order-status.js -- VERSIÓN FINAL Y CORRECTA

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Usamos los nombres de variables CORRECTOS que vimos en los logs
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_KEY
);

const hash = (data) => {
  return data ? crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex') : undefined;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') { /* ... */ }

  try {
    const { orderId, newStatus } = req.body;

    // --- MICRÓFONO 1: ¿Qué datos llegaron al backend? ---
    console.log(`Backend recibió la orden de actualizar pedido ID: ${orderId} a: ${newStatus}`);

    const { data, error: updateError } = await supabase
      .from('pedidos')
      .update({ estado: newStatus })
      .eq('id', orderId)
      .select(); // <-- AÑADIMOS .select() para que nos devuelva el resultado

    // --- MICRÓFONO 2: ¿Qué respondió Supabase al intento de UPDATE? ---
    console.log('Respuesta de Supabase al UPDATE:', { data, updateError });

    if (updateError) throw updateError;

    if (newStatus === 'Pago realizado') {
      const { data: orderData, error: orderError } = await supabase
        .from('pedidos')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      
      const accessToken = process.env.META_ACCESS_TOKEN;
      const pixelId = process.env.META_PIXEL_ID;
      const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;

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
          },
          custom_data: {
            currency: 'UYU',
            value: orderData.total_pedido,
          },
        }],
      };
      
      if (process.env.VERCEL_ENV === 'production' || process.env.VITE_ENABLE_META_TRACKING_IN_PREVIEW === 'true') {
        const metaResponse = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!metaResponse.ok) {
          console.error("Error sending event to Meta:", await metaResponse.json());
        } else {
          console.log(`Evento Purchase para pedido ${orderData.numero_pedido} enviado a Meta.`);
        }
      } else {
        console.log(`Evento Purchase NO enviado a Meta (entorno de prueba). Pedido: ${orderData.numero_pedido}`);
      }
    }

    res.status(200).json({ status: 'success', message: 'Estado actualizado correctamente.' });

  } catch (error) {
    console.error('Error en /api/update-order-status:', error.message);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}