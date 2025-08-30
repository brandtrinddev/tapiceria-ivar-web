// src/pages/OrderSuccessPage.jsx - VERSIÓN DE PRUEBA SIMPLIFICADA

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
      
      // CONSULTA SIMPLIFICADA: Solo pedimos datos de la tabla 'pedidos'.
      const { data, error } = await supabase
        .from('pedidos')
        .select(`*, datos_cliente`) // Simplificamos la consulta al máximo
        .eq('id', orderId)
        .single();

      if (error) {
        console.error("Error en la consulta simplificada:", error);
        setOrder(null);
      } else {
        console.log("Pedido encontrado con la consulta simplificada:", data);
        setOrder(data);
      }
      setLoading(false);
    };

    fetchOrderDetails();
  }, [orderId]);

  // El useEffect para Meta está temporalmente desactivado para esta prueba.

  if (loading) {
    return <div className="lazy-fallback">Cargando confirmación...</div>;
  }

  if (!order) {
    return (
      <div className="section-container" style={{ paddingTop: '100px', paddingBottom: '50px', textAlign: 'center' }}>
        <div className="order-success-box">
          <h1 className="order-success-title">Error en la prueba</h1>
          <p className="order-success-message">La consulta simplificada falló. Revisa la consola.</p>
          <Link to="/catalogo" className="cta-button">Volver al catálogo</Link>
        </div>
      </div>
    );
  }

  // Si la página carga, mostrará esto:
  return (
    <div className="section-container" style={{ paddingTop: '100px', paddingBottom: '50px', textAlign: 'center' }}>
      <div className="order-success-box">
         <svg className="success-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
           <circle className="success-icon-circle" cx="26" cy="26" r="25" fill="none"/>
           <path className="success-icon-checkmark" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
         </svg>
        <h1 className="order-success-title">¡Prueba Exitosa! La página cargó.</h1>
        <p className="order-success-message">Hemos confirmado que la base del componente funciona.</p>
        <p className="order-id-message">Tu número de pedido es: <strong>#{order.numero_pedido}</strong></p>
        <Link to="/catalogo" className="cta-button">
          Seguir comprando
        </Link>
      </div>
    </div>
  );
};

export default OrderSuccessPage;