// Ruta: /api/update-order-status.js -- Versión Limpia para Producción

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Usamos los nombres de variables correctos
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_KEY
);

const hash = (data) => {
  return data ? crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex') : undefined;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { orderId, newStatus } = req.body;

    if (!orderId || !newStatus) {
      return res.status(400).json({ error: 'orderId y newStatus son requeridos.' });
    }

    const { error: updateError } = await supabase
      .from('pedidos')
      .update({ estado: newStatus })
      .eq('id', orderId);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      throw new Error('Error al actualizar el estado en la base de datos.');
    }

    if (newStatus === 'Pago realizado') {
      const { data: orderData, error: orderError } = await supabase
        .from('pedidos')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('Supabase select error:', orderError);
        throw new Error('No se pudo encontrar el pedido para enviar el evento de compra.');
      }
      
      const accessToken = process.env.META_ACCESS_TOKEN;
      const pixelId = process.env.META_PIXEL_ID;
      
      // Si faltan las credenciales de Meta, no continuamos.
      if (!accessToken || !pixelId) {
        console.error("Faltan las credenciales de la API de Meta.");
        // Devolvemos éxito de todas formas, porque el estado SÍ se actualizó.
        return res.status(200).json({ status: 'success', message: 'Estado actualizado, pero no se pudo enviar el evento a Meta (faltan credenciales).' });
      }

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
          const errorBody = await metaResponse.json();
          console.error("Error al enviar el evento a Meta:", errorBody);
        }
      }
    }

    res.status(200).json({ status: 'success', message: 'Estado actualizado correctamente.' });

  } catch (error) {
    console.error('Error en /api/update-order-status:', error.message);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}