// src/pages/AdminPage/AdminPage.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import { supabase } from '../../supabaseClient';
import { formatPriceUYU } from '../../utils/formatters';
import './AdminPage.css';

Modal.setAppElement('#root');

const ADMIN_SECRET_CODE = import.meta.env.VITE_ADMIN_SECRET_CODE;
const ORDER_STATUSES = [ 'Pendiente de transferencia', 'Pendiente de pago', 'Pago realizado', 'En fabricación', 'Pedido finalizado', 'Enviado', 'Completado', 'Cancelado' ];

const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // --- CÓDIGO DE DEPURACIÓN MOVIDO AL LUGAR CORRECTO ---
  // Todos los hooks deben estar al principio del componente, sin condiciones.
  useEffect(() => {
    if (selectedOrder) {
      console.log("Datos del pedido seleccionado:", selectedOrder);
    }
  }, [selectedOrder]);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchOrders = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('pedidos')
          .select(`*, cuentas_bancarias (nombre_banco, moneda), pedido_items ( cantidad, productos (nombre), telas (nombre_tipo, nombre_color) )`)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error al cargar los pedidos:", error);
          toast.error("No se pudieron cargar los pedidos.");
        } else {
          setOrders(data);
        }
        setLoading(false);
      };
      fetchOrders();
    }
  }, [isAuthenticated]);

  const handleLogin = (e) => { e.preventDefault(); if (inputCode === ADMIN_SECRET_CODE) { toast.success("Acceso concedido"); setIsAuthenticated(true); } else { toast.error("Código de acceso incorrecto"); } };

  const handleStatusChange = async (orderId, newStatus) => {
    setOrders(currentOrders => currentOrders.map(order => order.id === orderId ? { ...order, estado: newStatus } : order ));
    const updatePromise = supabase.from('pedidos').update({ estado: newStatus }).eq('id', orderId);
    toast.promise(updatePromise, { pending: 'Actualizando estado...', success: '¡Estado actualizado!', error: 'Error al actualizar.' });
  };

  const getStatusClass = (status) => { if (!status) return ''; return `status-${status.trim().toLowerCase().replace(/ /g, '-')}`; };
  
  if (!isAuthenticated) {
    return (
      <div className="admin-login-container">
        <form onSubmit={handleLogin} className="admin-form">
          <h1>Acceso al Panel</h1>
          <p>Por favor, introduce el código de acceso para continuar.</p>
          <input type="password" value={inputCode} onChange={(e) => setInputCode(e.target.value)} className="admin-input" placeholder="Código secreto" />
          <button type="submit" className="cta-button">Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container standard-page-padding">
      {/* ... (el resto del JSX de la tabla y el modal no cambia) ... */}
      <h1 className="section-title">Panel de administración de pedidos</h1>
      {loading ? ( <p>Cargando pedidos...</p> ) : (
        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Nº Pedido</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Pago / Entrega</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} onClick={() => setSelectedOrder(order)} className="order-row">
                  <td><strong>#{order.numero_pedido}</strong></td>
                  <td>{new Date(order.created_at).toLocaleDateString('es-UY')}</td>
                  <td>{order.datos_cliente?.nombre || 'N/A'} {order.datos_cliente?.apellido || ''}</td>
                  <td>{formatPriceUYU(order.total_pedido)}</td>
                  <td>
                    <div>{order.cuenta_bancaria_id ? 'Transferencia' : 'Mercado Pago'}</div>
                    <div className="delivery-method">{order.datos_cliente?.shippingMethod === 'envio' ? 'Envío' : 'Retiro'}</div>
                  </td>
                  <td>
                    <select value={order.estado || ''} onClick={(e) => e.stopPropagation()} onChange={(e) => handleStatusChange(order.id, e.target.value)} className={`status-select ${getStatusClass(order.estado)}`}>
                      {ORDER_STATUSES.map(status => ( <option key={status} value={status}>{status}</option> ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onRequestClose={() => setSelectedOrder(null)}
          className="order-detail-modal"
          overlayClassName="order-detail-overlay"
        >
          <div className="modal-header">
            <h2>Detalle del Pedido #{selectedOrder.numero_pedido}</h2>
            <button onClick={() => setSelectedOrder(null)} className="close-modal-btn">&times;</button>
          </div>
          <div className="modal-content">
            <div className="order-detail-section">
              <h3>Datos del Cliente</h3>
              <p><strong>Nombre:</strong> {selectedOrder.datos_cliente?.nombre} {selectedOrder.datos_cliente?.apellido}</p>
              <p><strong>Email:</strong> {selectedOrder.datos_cliente?.email}</p>
              <p><strong>Teléfono:</strong> {selectedOrder.datos_cliente?.telefono}</p>
            </div>
            {selectedOrder.datos_cliente?.shippingMethod === 'envio' && (
              <div className="order-detail-section">
                <h3>Detalles de Envío</h3>
                <p><strong>Dirección:</strong> {selectedOrder.datos_cliente?.direccion}</p>
                <p><strong>Localidad:</strong> {selectedOrder.datos_cliente?.ciudad}</p>
                <p><strong>Departamento:</strong> {selectedOrder.datos_cliente?.departamento}</p>
              </div>
            )}
            {selectedOrder.cuentas_bancarias && (
              <div className="order-detail-section">
                <h3>Detalles de Pago</h3>
                <p><strong>Transferencia a:</strong> {selectedOrder.cuentas_bancarias.nombre_banco} ({selectedOrder.cuentas_bancarias.moneda})</p>
              </div>
            )}
            {selectedOrder.datos_cliente?.aclaraciones && (
               <div className="order-detail-section">
                <h3>Aclaraciones del Cliente</h3>
                <p>{selectedOrder.datos_cliente.aclaraciones}</p>
              </div>
            )}
            <div className="order-detail-section">
              <h3>Productos del Pedido</h3>
              <ul className="modal-product-list">
                {selectedOrder.pedido_items?.map((item, index) => (
                  <li key={index}>
                    <strong>{item.productos?.nombre || 'Producto no encontrado'} (x{item.cantidad})</strong>
                    <br />
                    <span className="modal-product-fabric">
                      Tela: {`${item.telas?.nombre_tipo || 'N/A'} ${item.telas?.nombre_color || 'N/A'}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminPage;