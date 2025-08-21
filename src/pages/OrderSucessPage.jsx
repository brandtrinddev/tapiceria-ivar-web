// src/pages/OrderSuccessPage.jsx

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
    const fetchOrderDetails = async () => {
      setLoading(true);
      const { data: orderData, error: orderError } = await supabase
        .from('pedidos')
        .select('*, cuentas_bancarias(instrucciones)')
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error("Error al buscar el pedido:", orderError);
        setOrder(null);
      } else {
        setOrder(orderData);
      }
      setLoading(false);
    };
    fetchOrderDetails();
  }, [orderId]);

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
          <p className="order-id-message">
            Es muy importante que incluyas tu número de pedido en la referencia: <strong>#{order.numero_pedido}</strong>
          </p>
          <Link to="/catalogo" className="cta-button" style={{ marginTop: '20px' }}>
            Seguir comprando
          </Link>
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
        <Link to="/catalogo" className="cta-button">
          Seguir comprando
        </Link>
      </div>
    </div>
  );
};
export default OrderSuccessPage;