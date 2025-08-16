import React from 'react';
import { Link } from 'react-router-dom'; // 1. Importa Link
import { formatPriceUYU } from '../utils/formatters';

function ProductCard({ product }) {
  if (!product) {
    return null;
  }

  const formattedPrice = formatPriceUYU(product.precioBase);

  const imageStyle = {
    // Si el producto tiene una posición definida en el JSON, la usamos. Si no, se usa el default del CSS.
    objectPosition: product.posicionImagen || 'center',
  };

  return (
    // 2. Envuelve toda la tarjeta con Link. La prop 'to' usa el 'id' del producto.
    <Link to={`/producto/${product.id}`} className="product-card-link"> 
      <div className="product-card">
        <div className="product-card-image-container">
          <img
            src={product.imagenPrincipal}
            alt={product.nombre}
            className="product-card-image"
            style={imageStyle}
            loading="lazy"
          />
        </div>
        <div className="product-card-content">
          <h3 className="product-card-name">{product.nombre}</h3>
          <p className="product-card-description">{product.descripcionCorta}</p>
          <p className="product-card-price">{formattedPrice}
              {product.mostrarUnidad && <span className="price-unit">c/u</span>}
          </p>

          {
            product.promo && (
              <p className="product-card-promo-price">
                ✨ Lleva {product.promo.cantidad} por ${product.promo.precio.toLocaleString('es-UY')}
              </p>
            )}
          {/* Podrías añadir un botón visual si prefieres, aunque toda la tarjeta sea clickeable */}
          {/* <span className="product-card-button">Ver Detalles</span> */}
        </div>
      </div>
    </Link>
  );
}

export default ProductCard;