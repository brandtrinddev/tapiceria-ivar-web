// src/context/CartContext.jsx

import React, { createContext, useState, useContext, useMemo } from 'react';
import { calculateSubtotal } from '../utils/pricing.js'; // <-- IMPORTAMOS NUESTRO AYUDANTE

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  const addToCart = (item) => {
    // Lógica futura: Si el item ya existe (mismo producto y tela), sumar cantidad.
    // Por ahora, permitimos añadir el mismo producto varias veces como líneas separadas.
    setCart(prevCart => [...prevCart, item]);
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  };

  const updateItemQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart => 
      prevCart.map(item => 
        item.productId === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };
  
  const clearCart = () => {
    setCart([]);
  };

  // --- LÓGICA DE PRECIOS CENTRALIZADA ---

  // 1. Creamos un "carrito procesado" que calcula los subtotales correctos usando el ayudante
  const processedCart = useMemo(() => {
    return cart.map(item => ({
      ...item,
      totalPrice: calculateSubtotal(item) // <-- USAMOS EL AYUDANTE
    }));
  }, [cart]);

  // 2. El total general ahora se calcula sobre el carrito procesado
  const cartTotal = useMemo(() => 
    processedCart.reduce((sum, item) => sum + item.totalPrice, 0),
    [processedCart]
  );

  // 3. Exponemos el CARRITO PROCESADO al resto de la aplicación
  const value = {
    cart: processedCart, // <-- El cambio más importante
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