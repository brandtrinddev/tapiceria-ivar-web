// supabase/functions/crear-preferencia-pago/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { MercadoPagoConfig, Preference } from 'npm:mercadopago'

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId, items, total, datosCliente } = await req.json()
    
    const siteUrl = Deno.env.get('SITE_URL');
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    if (!accessToken || !siteUrl) {
      throw new Error("Faltan variables de entorno (ACCESS_TOKEN o SITE_URL).");
    }

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    const itemsSubtotal = items.reduce((sum: number, item: CartItem) => sum + (item.unitPrice * item.quantity), 0);
    const shippingCost = total - itemsSubtotal;
    
    const preferenceItems = items.map((item: CartItem) => ({
      id: item.productId,
      title: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    }));

    if (shippingCost > 0) {
      preferenceItems.push({
        id: "envio",
        title: "Costo de Envío",
        quantity: 1,
        unit_price: shippingCost,
      });
    }

    const result = await preference.create({
      body: {
        items: preferenceItems,
        payer: {
          name: datosCliente.nombre,
          surname: datosCliente.apellido,
          email: datosCliente.email,
        },
        back_urls: {
          success: `${siteUrl}/orden-confirmada/${orderId}`,
          failure: `${siteUrl}/carrito`,
          pending: `${siteUrl}/carrito`,
        },
        // auto_return: 'approved', // <-- LÍNEA ELIMINADA
        external_reference: orderId,
      },
    })

    return new Response(JSON.stringify({ preferenceId: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    const err = error as Error
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})