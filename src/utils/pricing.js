// src/utils/pricing.js

/**
 * Calcula el subtotal de un item, aplicando la lógica de promoción y el costo de la tela.
 * @param {object} item - El objeto del producto.
 * @returns {number} - El subtotal calculado.
 */
export const calculateSubtotal = (item) => {
  // Verificación de seguridad
  if (!item || typeof item.unitPrice !== 'number' || typeof item.quantity !== 'number') {
    return 0;
  }

  // --- Paso 1: Calcular el precio base (ya sea el normal o el de la promoción) ---
  const promo = item.detalles?.promo;
  let precioBase = item.unitPrice * item.quantity; // Precio por defecto

  if (promo && item.quantity === promo.cantidad) {
    precioBase = promo.precio; // Se aplica el precio de la promoción
  }

  // --- Paso 2: Calcular el costo adicional de la tela (si aplica) ---
  let costoAdicionalTela = 0;
  // Verificamos si el item tiene una tela seleccionada y si esa tela tiene un costo adicional
  if (item.tela && typeof item.tela.costo_adicional_metro === 'number' && item.tela.costo_adicional_metro > 0) {
    // Verificamos que el producto tenga definidos los metros de tela
    if (typeof item.metros_tela_base === 'number') {
      // El costo extra es: (costo por metro) x (metros que usa el producto) x (cantidad de productos)
      costoAdicionalTela = item.tela.costo_adicional_metro * item.metros_tela_base * item.quantity;
    }
  }

  // --- Paso 3: Sumar el precio base + el costo de la tela para el subtotal final ---
  const subtotalFinal = precioBase + costoAdicionalTela;
  
  return subtotalFinal;
};