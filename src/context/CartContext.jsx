// src/context/CartContext.jsx

import React, { createContext, useState, useContext, useMemo, useEffect } from 'react';
import { calculateSubtotal } from '../utils/pricing.js';

const CartContext = createContext();

// Definimos una clave única para guardar nuestro carrito en el navegador.
const LOCAL_STORAGE_KEY = 'tapiceriaIvarCart';

export const CartProvider = ({ children }) => {
  // 1. LECTURA INICIAL: El estado inicial del carrito ahora intenta leer desde localStorage.
  // Esta función solo se ejecuta una vez, cuando el componente se monta por primera vez.
  const [cart, setCart] = useState(() => {
    try {
      const storedCart = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      // Si encontramos un carrito guardado, lo usamos. Si no, empezamos con un array vacío.
      return storedCart ? JSON.parse(storedCart) : [];
    } catch (error) {
      console.error("Error al leer el carrito desde localStorage:", error);
      return [];
    }
  });

  // 2. GUARDADO AUTOMÁTICO: Este "vigilante" guarda el carrito en cada cambio.
  // Se ejecuta cada vez que el estado 'cart' se modifica.
  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error("Error al guardar el carrito en localStorage:", error);
    }
  }, [cart]);


  const addToCart = (item) => {
    const cartItemId = `${item.productId}-${item.tela.id}`;
    setCart(prevCart => {
      const existingItem = prevCart.find(i => i.cartItemId === cartItemId);
      if (existingItem) {
        return prevCart.map(i => 
          i.cartItemId === cartItemId 
            ? { ...i, quantity: i.quantity + item.quantity } 
            : i
        );
      } else {
        return [...prevCart, { ...item, cartItemId }];
      }
    });
  };

  const removeFromCart = (cartItemId) => {
    setCart(prevCart => prevCart.filter(item => item.cartItemId !== cartItemId));
  };

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

  // El resto del código no necesita cambios, ya que es reactivo a los datos del 'cart'.
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