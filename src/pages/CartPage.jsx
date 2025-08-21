// src/pages/CartPage.jsx

import { useCart } from '../context/CartContext.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { formatPriceUYU } from '../utils/formatters.js';

const CartPage = () => {
  const { cart, removeFromCart, updateItemQuantity, cartTotal } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    navigate('/checkout');
  };

  return (
    <div className="section-container" style={{ paddingTop: '100px', paddingBottom: '50px' }}>
      <h1 className="section-title">Mi carrito de compras</h1>
      
      {cart.length === 0 ? (
        <div className="empty-cart-message">
          <p>Tu carrito está vacío.</p>
          <Link to="/catalogo" className="cta-button">
            Ver catálogo
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items-list">
            {cart.map(item => (
              <div key={item.productId} className="cart-item">
                <img src={item.imageUrl} alt={item.productName} className="cart-item-image" />
                <div className="cart-item-info">
                  
                  <div className="cart-item-details">
                    <h3 className="cart-item-name">{item.productName}</h3>
                    <p className="cart-item-fabric">Tela: {item.tela.nombre_tipo} - {item.tela.nombre_color}</p>
                    <p className="cart-item-price">Precio unitario: {formatPriceUYU(item.unitPrice)}</p>
                    
                    {/* El selector de cantidad fue movido de aquí... */}

                  </div>

                  <div className="cart-item-actions">
                    <p className="cart-item-subtotal">{formatPriceUYU(item.totalPrice)}</p>
                    <button type="button" onClick={() => removeFromCart(item.productId)} className="cart-item-remove-button">
                      Eliminar
                    </button>

                    {/* ...y pegado aquí, dentro de las acciones. */}
                    <div className="cart-item-quantity-selector">
                      <button 
                        type="button"
                        className="cart-item-quantity-btn" 
                        onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                      >-</button>
                      <span className="cart-item-quantity-value">{item.quantity}</span>
                      <button 
                        type="button"
                        className="cart-item-quantity-btn" 
                        onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                      >+</button>
                    </div>
                    
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <h2 className="summary-title">Resumen de compra</h2>
            <div className="summary-total">
              <span>Total</span>
              <span>{formatPriceUYU(cartTotal)}</span>
            </div>
            <button type="button" onClick={handleCheckout} className="cta-button checkout-button">
              Continuar con la compra
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;