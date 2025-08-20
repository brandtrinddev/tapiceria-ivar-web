// src/utils/pricing.js

/**
 * Calcula el subtotal de un item, aplicando la lógica de promoción si corresponde.
 * @param {object} item - El objeto del producto. Debe tener unitPrice, quantity y detalles.
 * @returns {number} - El subtotal calculado.
 */
export const calculateSubtotal = (item) => {
  // Verificación de seguridad para evitar errores si el item no es válido
  if (!item || typeof item.unitPrice !== 'number' || typeof item.quantity !== 'number') {
    return 0;
  }

  const promo = item.detalles?.promo;
  let subtotal = item.unitPrice * item.quantity; // Cálculo por defecto

  // Si existe una promo y la cantidad es EXACTAMENTE la de la promo...
  if (promo && item.quantity === promo.cantidad) {
    subtotal = promo.precio; // ...¡aplicamos el precio de la promoción!
  }
  
  return subtotal;
};