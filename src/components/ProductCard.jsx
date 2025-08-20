import React from 'react';
import { Link } from 'react-router-dom';
import { formatPriceUYU } from '../utils/formatters';

function ProductCard({ product }) {
  if (!product) {
    return null;
  }

  // CAMBIO: Usamos 'precio_base' en lugar de 'precioBase'
  const formattedPrice = formatPriceUYU(product.precio_base);

  const imageStyle = {
    // CAMBIO: Leemos 'posicion_imagen' desde el objeto 'detalles'
    // Usamos 'optional chaining' (?.) por si algún producto no tuviera este dato
    objectPosition: product.detalles?.posicion_imagen || 'center',
  };

  return (
    // INFO: El enlace ya usa product.id (el nuevo UUID), lo cual es perfecto. No lo cambiamos.
    <Link to={`/producto/${product.id}`} className="product-card-link"> 
      <div className="product-card">
        <div className="product-card-image-container">
          <img
            // CAMBIO: Usamos 'imagen_url' en lugar de 'imagenPrincipal'
            src={product.imagen_url}
            alt={product.nombre}
            className="product-card-image"
            style={imageStyle}
            loading="lazy"
          />
        </div>
        <div className="product-card-content">
          <h3 className="product-card-name">{product.nombre}</h3>
          {/* CAMBIO: Usamos 'descripcion' en lugar de 'descripcionCorta' */}
          <p className="product-card-description">{product.descripcion}</p>
          <p className="product-card-price">{formattedPrice}
            {/* CAMBIO: Leemos 'mostrarUnidad' desde 'detalles' */}
            {product.detalles?.mostrarUnidad && <span className="price-unit">c/u</span>}
          </p>
          
          {/* CAMBIO: Leemos 'promo' desde el objeto 'detalles' */}
          {product.detalles?.promo && (
            <p className="product-card-promo-price">
              ✨ Lleva {product.detalles.promo.cantidad} por ${product.detalles.promo.precio.toLocaleString('es-UY')}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export default ProductCard;