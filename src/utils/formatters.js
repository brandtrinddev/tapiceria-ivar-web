export function formatPriceUYU(price) {
  if (typeof price !== 'number') {
    return ''; // O un valor por defecto
  }
  return price.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}