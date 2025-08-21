// src/context/CartContext.jsx

import React, { createContext, useState, useContext, useMemo } from 'react';
import { calculateSubtotal } from '../utils/pricing.js';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  const addToCart = (item) => {
    // CAMBIO: Creamos un ID único combinando el ID del producto y el ID de la tela.
    const cartItemId = `${item.productId}-${item.tela.id}`;

    setCart(prevCart => {
      // Buscamos si ya existe un item con este ID único en el carrito.
      const existingItem = prevCart.find(i => i.cartItemId === cartItemId);

      if (existingItem) {
        // Si existe, actualizamos su cantidad.
        return prevCart.map(i => 
          i.cartItemId === cartItemId 
            ? { ...i, quantity: i.quantity + item.quantity } 
            : i
        );
      } else {
        // Si no existe, añadimos el nuevo item junto con su ID único.
        return [...prevCart, { ...item, cartItemId }];
      }
    });
  };

  // CAMBIO: La función ahora usa el cartItemId único.
  const removeFromCart = (cartItemId) => {
    setCart(prevCart => prevCart.filter(item => item.cartItemId !== cartItemId));
  };

  // CAMBIO: La función ahora usa el cartItemId único.
  const updateItemQuantity = (cartItemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart(prevCart => 
      prevCart.map(item => 
        item.cartItemId === cartItemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };
  
  const clearCart = () => {
    setCart([]);
  };

  const processedCart = useMemo(() => {
    return cart.map(item => ({
      ...item,
      totalPrice: calculateSubtotal(item)
    }));
  }, [cart]);

  const cartTotal = useMemo(() => 
    processedCart.reduce((sum, item) => sum + item.totalPrice, 0),
    [processedCart]
  );

  const value = {
    cart: processedCart,
    cartTotal,
    addToCart,
    removeFromCart,
    updateItemQuantity,
    clearCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  return useContext(CartContext);
};