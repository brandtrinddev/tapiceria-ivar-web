// src/pages/CheckoutPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useCart } from '../context/CartContext';
import { formatPriceUYU } from '../utils/formatters';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import { toast } from 'react-toastify'; // <-- AÑADIDO: Importamos toast

initMercadoPago(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY, {
  locale: 'es-UY'
});

const departamentosUruguay = [
  "Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores",
  "Florida", "Lavalleja", "Maldonado", "Montevideo", "Paysandú", "Río Negro",
  "Rivera", "Rocha", "Salto", "San José", "Soriano", "Tacuarembó", "Treinta y Tres"
];

const CheckoutPage = () => {
  const { cart, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    departamento: '',
    aclaraciones: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preferenceId, setPreferenceId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('mercadopago');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  
  const [shippingMethod, setShippingMethod] = useState('retiro');
  const [shippingCost, setShippingCost] = useState(0);
  const MONTEVIDEO_SHIPPING_COST = 1200;

  useEffect(() => {
    if (shippingMethod === 'envio' && formData.departamento.trim().toLowerCase() === 'montevideo') {
      setShippingCost(MONTEVIDEO_SHIPPING_COST);
    } else {
      setShippingCost(0);
    }
  }, [shippingMethod, formData.departamento]);

  const finalTotal = cartTotal + shippingCost;

  useEffect(() => {
    const fetchBankAccounts = async () => {
      const { data, error } = await supabase
        .from('cuentas_bancarias')
        .select('*')
        .eq('activo', true);
      
      if (error) {
        console.error("Error al cargar las cuentas bancarias:", error);
      } else {
        setBankAccounts(data);
      }
    };
    fetchBankAccounts();
  }, []);

  const groupedAccounts = useMemo(() => {
    return bankAccounts.reduce((acc, account) => {
      const bankName = account.nombre_banco;
      if (!acc[bankName]) {
        acc[bankName] = [];
      }
      acc[bankName].push(account);
      return acc;
    }, {});
  }, [bankAccounts]);

  const availableBanks = Object.keys(groupedAccounts);

  useEffect(() => {
    if (availableBanks.length > 0 && !selectedBank) {
      setSelectedBank(availableBanks[0]);
    }
  }, [availableBanks, selectedBank]);

  useEffect(() => {
    if (selectedBank && groupedAccounts[selectedBank] && groupedAccounts[selectedBank].length > 0) {
      setSelectedAccount(groupedAccounts[selectedBank][0].id);
    }
  }, [selectedBank, groupedAccounts]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  // --- FUNCIÓN handleSubmit TOTALMENTE MEJORADA CON TOAST ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (paymentMethod === 'transferencia' && !selectedAccount) {
      toast.error("Por favor, selecciona una cuenta bancaria para la transferencia.");
      return;
    }
    
    setIsSubmitting(true);
    const toastId = toast.loading("Procesando tu pedido..."); // Mostramos toast de carga

    try {
      const fullFormData = {
        ...formData,
        shippingMethod: shippingMethod,
        shippingCost: shippingCost,
      };
      const params = {
        datos_cliente: fullFormData,
        items: cart.map(item => ({
          productId: item.productId,
          tela: item.tela,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          productName: item.productName
        })),
        total_pedido: finalTotal,
        cuenta_bancaria_id: paymentMethod === 'transferencia' ? selectedAccount : null
      };
      
      const { data: newOrderId, error: orderError } = await supabase.rpc('crear_pedido', params);
      
      if (orderError) throw orderError;
      
      if (paymentMethod === 'transferencia') {
        toast.update(toastId, { 
          render: "¡Pedido reservado! Redirigiendo...", 
          type: "success", 
          isLoading: false, 
          autoClose: 3000 
        });
        clearCart();
        navigate(`/orden-confirmada/${newOrderId}`);
      } else {
        toast.update(toastId, { 
          render: "Creando preferencia de pago...", 
          type: "info", 
          isLoading: true 
        });

        const { data: preferenceData, error: functionError } = await supabase.functions.invoke('crear-preferencia-pago', {
            body: { 
              orderId: newOrderId,
              items: cart,
              total: finalTotal,
              datosCliente: formData
            }
        });

        if (functionError) throw functionError;
        
        toast.dismiss(toastId); // Cerramos el toast de carga
        setPreferenceId(preferenceData.preferenceId);
      }
    } catch (error) {
      console.error('Error al procesar el pedido:', error);
      toast.update(toastId, { 
        render: `Error al procesar el pedido: ${error.message}`, 
        type: "error", 
        isLoading: false, 
        autoClose: 5000 
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="section-container" style={{ paddingTop: '100px', paddingBottom: '50px' }}>
      <h1 className="section-title">Finalizar compra</h1>
      
      {!preferenceId && (
        <form onSubmit={handleSubmit} className="checkout-layout">
          <div className="checkout-form-container">
            {/* ...resto del formulario sin cambios... */}
            <div className="payment-method-container">
              <h2>Método de Pago</h2>
              <div className="payment-options">
                <div className={`payment-option ${paymentMethod === 'mercadopago' ? 'selected' : ''}`} onClick={() => setPaymentMethod('mercadopago')}>
                  <input type="radio" id="mercadopago" name="paymentMethod" value="mercadopago" checked={paymentMethod === 'mercadopago'} onChange={() => {}} />
                  <label htmlFor="mercadopago">Mercado Pago (tarjetas de crédito/débito, redes de cobranza)</label>
                </div>
                <div className={`payment-option ${paymentMethod === 'transferencia' ? 'selected' : ''}`} onClick={() => setPaymentMethod('transferencia')}>
                  <input type="radio" id="transferencia" name="paymentMethod" value="transferencia" checked={paymentMethod === 'transferencia'} onChange={() => {}} />
                  <label htmlFor="transferencia">Transferencia bancaria</label>
                </div>
              </div>
              {paymentMethod === 'transferencia' && availableBanks.length > 0 && (
                <div className="bank-account-selector">
                  <div className="form-group">
                    <label htmlFor="bank-select">Banco:</label>
                    <select id="bank-select" value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)}>
                      {availableBanks.map(bankName => (
                        <option key={bankName} value={bankName}>{bankName}</option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedBank && groupedAccounts[selectedBank] && (
                    <div className="form-group">
                      <label htmlFor="account-select">Moneda:</label>
                      <select id="account-select" value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
                        {groupedAccounts[selectedBank].map(account => (
                          <option key={account.id} value={account.id}>
                            {account.moneda === 'UYU' ? 'Pesos (UYU)' : 'Dólares (USD)'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="shipping-method-container">
              <h2>Método de Entrega</h2>
              <div className="shipping-options">
                <div className={`shipping-option ${shippingMethod === 'retiro' ? 'selected' : ''}`} onClick={() => setShippingMethod('retiro')}>
                  <input type="radio" id="retiro" name="shippingMethod" value="retiro" checked={shippingMethod === 'retiro'} readOnly />
                  <label htmlFor="retiro">Retirar en taller (sin costo)</label>
                </div>
                <div className={`shipping-option ${shippingMethod === 'envio' ? 'selected' : ''}`} onClick={() => setShippingMethod('envio')}>
                  <input type="radio" id="envio" name="shippingMethod" value="envio" checked={shippingMethod === 'envio'} readOnly />
                  <label htmlFor="envio">Envío a domicilio</label>
                </div>
              </div>
            </div>
            
            <h2>Tus Datos</h2>
            <div className="form-grid">
              <div className="form-group"><label htmlFor="nombre">Nombre</label><input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} required /></div>
              <div className="form-group"><label htmlFor="apellido">Apellido</label><input type="text" id="apellido" name="apellido" value={formData.apellido} onChange={handleChange} required /></div>
              <div className="form-group full-width"><label htmlFor="email">Email</label><input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required /></div>
              <div className="form-group full-width"><label htmlFor="telefono">Teléfono</label><input type="tel" id="telefono" name="telefono" value={formData.telefono} onChange={handleChange} required /></div>
              
              {shippingMethod === 'envio' && (
                <>
                  <div className="form-group full-width">
                    <label htmlFor="direccion">Dirección de Envío</label>
                    <input type="text" id="direccion" name="direccion" value={formData.direccion} onChange={handleChange} required={shippingMethod === 'envio'} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="ciudad">Barrio / Localidad</label>
                    <input type="text" id="ciudad" name="ciudad" placeholder="Ej: Pocitos, Ciudad de la Costa" value={formData.ciudad} onChange={handleChange} required={shippingMethod === 'envio'} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="departamento">Departamento</label>
                    <select id="departamento" name="departamento" value={formData.departamento} onChange={handleChange} required={shippingMethod === 'envio'}>
                      <option value="" disabled>Selecciona un departamento</option>
                      {departamentosUruguay.map(depto => (
                        <option key={depto} value={depto}>{depto}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              
              <div className="form-group full-width">
                <label htmlFor="aclaraciones">Aclaraciones (Opcional)</label>
                <textarea id="aclaraciones" name="aclaraciones" value={formData.aclaraciones} onChange={handleChange} rows="3"></textarea>
              </div>
            </div>
          </div>

          <div className="order-summary-container">
            <h2>Resumen del pedido</h2>
            <div className="summary-items-list">
              {cart.map(item => (<div key={item.productId} className="summary-item"><span className="summary-item-name">{item.productName} (x{item.quantity})</span><span className="summary-item-price">{formatPriceUYU(item.totalPrice)}</span></div>))}
            </div>
            <div className="summary-shipping">
              <span>Costo de envío</span>
              <span>{shippingMethod === 'envio' ? (shippingCost > 0 ? formatPriceUYU(shippingCost) : 'A coordinar') : 'Sin costo'}</span>
            </div>
            <div className="summary-total"><span>Total</span><span>{formatPriceUYU(finalTotal)}</span></div>
            <button type="submit" className="cta-button checkout-button" disabled={isSubmitting}>
              {isSubmitting ? 'Procesando...' : 'Realizar pedido'}
            </button>
          </div>
        </form>
      )}

      {preferenceId && (
        <div className="payment-container">
          <h2>Casi listo, finaliza tu pago</h2>
          <p>Serás redirigido a la página segura de Mercado Pago para completar tu compra.</p>
          <div id="wallet_container">
            <Wallet initialization={{ preferenceId: preferenceId }} />
          </div>
          <button 
            type="button" 
            className="go-back-button" 
            onClick={() => {
              setIsSubmitting(false);
              setPreferenceId(null);
            }}
          >
            ← Cambiar método de pago o datos
          </button>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;