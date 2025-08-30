// src/pages/OrderSuccessPage.jsx - VERSIÓN FINAL CORREGIDA

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { formatPriceUYU } from '../utils/formatters.js';

const OrderSuccessPage = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    const fetchOrderDetailsWithRetries = async () => {
      setLoading(true);
      let orderData = null;
      let lastError = null;

      for (let attempt = 1; attempt <= 5; attempt++) {
        // ¡SINTAXIS DE CONSULTA CORREGIDA!
        // La clave es especificar la tabla foránea 'pedido_items' y luego, desde ella,
        // hacer la referencia a la tabla 'productos'.
        const { data, error } = await supabase
          .from('pedidos')
          .select(`
            *,
            datos_cliente,
            cuentas_bancarias(instrucciones),
            pedido_items (
              productos (sku)
            )
          `)
          .eq('id', orderId)
          .single();

        if (data) {
          orderData = data;
          break;
        }

        lastError = error;

        if (attempt < 5) {
          console.log(`Intento ${attempt}: Pedido no encontrado. Reintentando...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (orderData) {
        console.log("Datos del pedido recibidos para depuración:", orderData);
        setOrder(orderData);
      } else {
        console.error("Error final al buscar el pedido:", lastError);
        setOrder(null);
      }
      setLoading(false);
    };

    fetchOrderDetailsWithRetries();
  }, [orderId]);


  useEffect(() => {
    if (!order || !order.datos_cliente || !order.pedido_items) {
      return;
    }
    const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    };
    const enviarConversionAMeta = async () => {
      try {
        const userData = {
          email: order.datos_cliente.email,
          phone: order.datos_cliente.telefono,
          firstName: order.datos_cliente.nombre,
          lastName: order.datos_cliente.apellido,
          fbc: getCookie('_fbc') || null,
          fbp: getCookie('_fbp') || null,
        };
        const eventData = {
          value: order.total_pedido,
          currency: 'UYU',
          content_ids: order.pedido_items.map(item => item.productos.sku).filter(sku => sku),
          event_id: `pedido_${order.numero_pedido}`,
        };
        await fetch('/api/send-conversion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userData, eventData }),
        });
        console.log('✅ Evento de conversión "Purchase" enviado exitosamente a Meta.');
      } catch (error) {
        console.error('❌ Error al enviar el evento de conversión a Meta:', error);
      }
    };
    enviarConversionAMeta();
  }, [order]);

  if (loading) {
    return <div className="lazy-fallback">Cargando confirmación...</div>;
  }

  if (!order) {
    return (
      <div className="section-container" style={{ paddingTop: '100px', paddingBottom: '50px', textAlign: 'center' }}>
        <div className="order-success-box">
          <h1 className="order-success-title">Error</h1>
          <p className="order-success-message">No pudimos encontrar los detalles de tu pedido.</p>
          <Link to="/catalogo" className="cta-button">Volver al catálogo</Link>
        </div>
      </div>
    );
  }

  if (order.cuenta_bancaria_id && order.cuentas_bancarias) {
    return (
      <div className="section-container" style={{ paddingTop: '100px', paddingBottom: '50px' }}>
        <div className="order-success-box">
          <h1 className="order-success-title">¡Pedido reservado con éxito!</h1>
          <div className="order-success-total">
            <span>Total a transferir:</span>
            <span>{formatPriceUYU(order.total_pedido)}</span>
          </div>
          <p className="order-success-message">Para confirmar tu compra, realiza la transferencia con los siguientes datos:</p>
          <div className="order-instructions-box">
            <pre>{order.cuentas_bancarias.instrucciones}</pre>
          </div>
          <p className="order-id-message">Es muy importante que incluyas tu número de pedido en la referencia: <strong>#{order.numero_pedido}</strong></p>
          <Link to="/catalogo" className="cta-button" style={{ marginTop: '20px' }}>Seguir comprando</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="section-container" style={{ paddingTop: '100px', paddingBottom: '50px', textAlign: 'center' }}>
      <div className="order-success-box">
        <svg className="success-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
          <circle className="success-icon-circle" cx="26" cy="26" r="25" fill="none"/>
          <path className="success-icon-checkmark" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
        </svg>
        <h1 className="order-success-title">¡Gracias por tu compra!</h1>
        <p className="order-success-message">Hemos recibido tu pedido y ya estamos trabajando en él.</p>
        <p className="order-id-message">Tu número de pedido es: <strong>#{order.numero_pedido}</strong></p>
        <p className="next-steps-message">Nos pondremos en contacto contigo a la brevedad.</p>
        <Link to="/catalogo" className="cta-button">Seguir comprando</Link>
      </div>
    </div>
  );
};

export default OrderSuccessPage;