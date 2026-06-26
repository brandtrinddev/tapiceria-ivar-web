import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPriceUYU } from '../utils/formatters';
import { getProductCardImageUrl } from '../utils/productImages';

function ProductCard({ product }) {
  const descriptionRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const description = product?.descripcion?.trim() || '';

  useEffect(() => {
    const element = descriptionRef.current;
    if (!element || !description) {
      setIsTruncated(false);
      return undefined;
    }

    const checkTruncation = () => {
      setIsTruncated(element.scrollHeight > element.clientHeight + 1);
    };

    checkTruncation();

    const resizeObserver = new ResizeObserver(checkTruncation);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, [description]);

  if (!product) {
    return null;
  }

  const formattedPrice = formatPriceUYU(product.precio_base);

  const imageStyle = {
    objectPosition: product.detalles?.posicion_imagen || 'center',
  };

  const descriptionWrapClass = [
    'product-card-description-wrap',
    description ? 'has-text' : '',
    isTruncated ? 'is-truncated' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Link to={`/producto/${product.slug}`} className="product-card-link">
      <div className="product-card">
        <div className="product-card-image-container">
          <img
            src={getProductCardImageUrl(product)}
            alt={product.nombre}
            className="product-card-image"
            style={imageStyle}
            loading="lazy"
          />
        </div>
        <div className="product-card-content">
          <h3 className="product-card-name">{product.nombre}</h3>

          {description ? (
            <div
              className={descriptionWrapClass}
              tabIndex={isTruncated ? 0 : undefined}
              aria-label={isTruncated ? description : undefined}
            >
              <p
                ref={descriptionRef}
                className="product-card-description"
                title={isTruncated ? description : undefined}
              >
                {description}
              </p>
            </div>
          ) : (
            <div className="product-card-description-wrap product-card-description-wrap--empty" />
          )}

          <div className="product-card-footer">
            <p className="product-card-price">
              {formattedPrice}
              {product.detalles?.mostrarUnidad && (
                <span className="price-unit">c/u</span>
              )}
            </p>

            {product.detalles?.promo && (
              <p className="product-card-promo-price">
                ✨ Lleva {product.detalles.promo.cantidad} por $
                {product.detalles.promo.precio.toLocaleString('es-UY')}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default ProductCard;
