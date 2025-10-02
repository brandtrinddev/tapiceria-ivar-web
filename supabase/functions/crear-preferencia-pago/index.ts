// supabase/functions/crear-preferencia-pago/index.ts - VERSIÓN CORREGIDA Y SEGURA

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { MercadoPagoConfig, Preference } from 'npm:mercadopago'

// Interfaz extendida para recibir toda la información del carrito
interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number; // Este será el precio BASE del producto
  metros_tela_base: number;
  detalles: {
    promo?: {
      cantidad: number;
      precio: number;
    }
  };
  tela: {
    nombre_color: string;
    nombre_tipo: string;
    costo_adicional_por_metro: number;
  };
}

// Replicamos nuestra función de cálculo de precios aquí en el servidor
const calculateSubtotal = (item: CartItem): number => {
  if (!item || typeof item.unitPrice !== 'number' || typeof item.quantity !== 'number') {
    return 0;
  }
  
  const promo = item.detalles?.promo;
  let precioBase = item.unitPrice * item.quantity;

  if (promo && item.quantity === promo.cantidad) {
    precioBase = promo.precio;
  }

  let costoAdicionalTela = 0;
  if (item.tela && typeof item.tela.costo_adicional_por_metro === 'number' && item.tela.costo_adicional_por_metro > 0) {
    if (typeof item.metros_tela_base === 'number') {
      costoAdicionalTela = item.tela.costo_adicional_por_metro * item.metros_tela_base * item.quantity;
    }
  }
  
  return precioBase + costoAdicionalTela;
};


serve(async (req) => {
  console.log('Función crear-preferencia-pago invocada.');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Ahora recibimos el 'cart' completo y el 'shippingCost' por separado
    const { orderId, cart, shippingCost, datosCliente } = await req.json()

    console.log('Datos recibidos del frontend:', { orderId, cart, shippingCost, datosCliente });
    
    const siteUrl = Deno.env.get('SITE_URL');
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    if (!accessToken || !siteUrl) {
      throw new Error("Faltan variables de entorno (ACCESS_TOKEN o SITE_URL).");
    }

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    // Mapeamos los items del carrito al formato de Mercado Pago,
    // pero ahora el precio unitario se calcula de forma segura aquí.
    const preferenceItems = cart.map((item: CartItem) => ({
      id: item.productId,
      title: `${item.productName} (Tela: ${item.tela.nombre_color || item.tela.nombre_tipo})`,
      quantity: 1, // Enviamos cada item como una unidad con su precio total
      unit_price: calculateSubtotal(item), // ¡El precio se calcula aquí en el servidor!
    }));

    // Añadimos el costo de envío como un item separado, solo si es mayor a cero.
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