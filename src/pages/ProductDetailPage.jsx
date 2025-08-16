// src/pages/ProductDetailPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { formatPriceUYU } from '../utils/formatters.js';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import productData from '../data/productos.json';
import ProductCard from '../components/ProductCard.jsx';
import { useDrag } from '@use-gesture/react';

const NOMBRES_COMPONENTES = { sofa: 'Sofá', sofa_xl: 'Sofá XL', sofa_estandar: 'Sofá Estándar', sofa_2c: 'Sofá 2 Cuerpos', sofa_3c: 'Sofá 3 Cuerpos', butaca: 'Butaca', isla: 'Isla', modulo: 'Módulo', modulo_chaise: "Módulo Chaise", modulo_con_brazo: "Modulo con brazo", modulo_sin_brazo: "Modulo sin brazo", respaldo: 'Respaldo', modulo_sofa: "Modulo Sofá", sofa_completo: "Sofá Completo" };

const NOMBRES_MEDIDAS = {
  ancho: 'Ancho',
  profundidad: 'Profundidad',
  alto: 'Altura',
  profundidadTotalChaise: 'Profundidad Total Chaise',
  profundidadChaise: 'Profundidad Chaise',
  profundidadTotal: 'Profundidad Total'
};

function ProductDetailPage() {
  const { productId } = useParams();
  const product = productData.find(p => p.id === productId);
  const relatedProducts = (product && product.modelo)
    ? productData.filter(item => item.modelo === product.modelo && item.id !== product.id)
    : [];

  const [selectedImage, setSelectedImage] = useState(null);
  
  const allImages = [product?.imagenPrincipal, ...(product?.imagenesGaleria || [])].filter(Boolean);
  const currentIndex = allImages.indexOf(selectedImage);

  const goToPreviousImage = useCallback(() => {
    if (allImages.length > 1) {
      const isFirstImage = currentIndex === 0;
      const newIndex = isFirstImage ? allImages.length - 1 : currentIndex - 1;
      setSelectedImage(allImages[newIndex]);
    }
  }, [currentIndex, allImages]);

  const goToNextImage = useCallback(() => {
    if (allImages.length > 1) {
      const isLastImage = currentIndex === allImages.length - 1;
      const newIndex = isLastImage ? 0 : currentIndex + 1;
      setSelectedImage(allImages[newIndex]);
    }
  }, [currentIndex, allImages]);
  
  useEffect(() => {
    if (product) {
      setSelectedImage(product.imagenPrincipal);
    }
  }, [product]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowLeft') goToPreviousImage();
      if (event.key === 'ArrowRight') goToNextImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPreviousImage, goToNextImage]);
  
  const bind = useDrag(({ swipe: [swipeX] }) => {
    if (swipeX === -1) goToNextImage();
    if (swipeX === 1) goToPreviousImage();
  }, { axis: 'x' });

  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h1>Producto no encontrado</h1>
        <p>El producto que buscas no existe o la URL es incorrecta.</p>
        <Link to="/catalogo" style={{ color: '#032f55', textDecoration: 'underline' }}>Volver al Catálogo</Link>
      </div>
    );
  }

  const formattedPrice = formatPriceUYU(product.precioBase);

  const handleThumbnailClick = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  const numeroWhatsApp = '59897531335';
  const mensajeWhatsApp = `¡Hola! Quisiera hacer una consulta sobre el modelo *${product.nombre}* que vi en la página web.`;
  const linkWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensajeWhatsApp)}`;

  return (
    <>
      <Helmet>
        <title>Tapicería Ivar - {product.nombre}</title>
        <meta name="description" content={product.descripcionCorta} />
      </Helmet>
      <div className="product-detail-container">
        <div className="product-detail-layout">
          <div className="product-detail-images">
            <div className="main-image-wrapper">
              <div {...bind()} style={{ touchAction: 'pan-y', cursor: 'grab', width: '100%', height: '100%' }}> 
                <img
                  src={selectedImage}
                  alt={product.nombre}
                  className="product-detail-main-image"
                />
              </div>
              {allImages.length > 1 && (
                <>
                  <button onClick={goToPreviousImage} className="gallery-arrow prev-arrow" aria-label="Imagen anterior">&#10094;</button>
                  <button onClick={goToNextImage} className="gallery-arrow next-arrow" aria-label="Siguiente imagen">&#10095;</button>
                </>
              )}
            </div>
            {allImages && allImages.length > 1 && (
              <div className="product-detail-thumbnail-gallery">
                {allImages.map((imgUrl, index) => (
                  <img
                    key={index}
                    src={imgUrl}
                    alt={`${product.nombre} - vista ${index + 1}`}
                    className={`product-detail-thumbnail ${selectedImage === imgUrl ? 'active' : ''}`}
                    onClick={() => handleThumbnailClick(imgUrl)}
                    loading="lazy"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="product-detail-info">
            <h1 className="product-detail-name">{product.nombre}</h1>
            <p className="product-detail-price">{formattedPrice}
              {product.mostrarUnidad && <span className="price-unit">c/u</span>}
            </p>

            {product.promo && (
              <p className="product-detail-promo-price">
                ¡Oferta Especial! Llévate {product.promo.cantidad} por {formatPriceUYU(product.promo.precio)}
              </p>
            )}
            
            <div className="product-info-section">
              <h2>Descripción</h2>
              <div className="product-detail-description">
                <p>{product.descripcionLarga.sabor}</p>
              </div>
            </div>

            <div className="product-info-section">
              <h2>Calidad y fabricación</h2>
              <div className="product-detail-description">
                <p>{product.descripcionLarga.base}</p>
              </div>
            </div>
            
            {product.medidas && Object.keys(product.medidas).length > 0 && (
              <div className="product-info-section product-detail-dimensions">
                <h2>Medidas</h2>
                {Object.keys(product.medidas).length === 1 ? (
                  <div className="dimension-block">
                    <ul>
                      {Object.entries(Object.values(product.medidas)[0]).map(([medida, valor]) => (
                        <li key={medida}>
                          <strong>{NOMBRES_MEDIDAS[medida] || medida}:</strong> {valor}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="dimensions-grid">
                    {Object.entries(product.medidas).map(([componenteKey, medidasComponente]) => {
                      const displayName = NOMBRES_COMPONENTES[componenteKey] || componenteKey;
                      return (
                        <div key={componenteKey} className="dimension-block">
                          <h3 className="dimension-component-title">{displayName}</h3>
                          <ul>
                            {Object.entries(medidasComponente).map(([medida, valor]) => (
                              <li key={medida}>
                                <strong>{NOMBRES_MEDIDAS[medida] || medida}:</strong> {valor}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {product.aclaracionFoto && (
              <div className="product-info-section">
                  <p style={{fontSize: '0.9rem', color: '#777', fontStyle: 'italic', lineHeight: 1.5}}>
                      <strong>Nota:</strong> {product.aclaracionFoto}
                  </p>
              </div>
            )}

            <div className="customization-cta-section">
              <h2>Hecho a tu medida</h2>
              <p>
                ¿Te gustó este modelo? Lo fabricamos para ti, 100% personalizado. Elige la tela y el color que quieras para que tu sillón sea único.
              </p>
              <div className="customization-cta-buttons">
                <Link to="/telas" className="product-detail-cta-button secondary">
                  Ver Catálogo de Telas
                </Link>
                <a href={linkWhatsApp} target="_blank" rel="noopener noreferrer" className="product-detail-cta-button">
                  Consultar por WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <div className="variants-section">
            <h2 className="variants-section-title">Completa la Colección</h2>
            <div className="product-grid variants-grid">
              {relatedProducts.map(relatedProduct => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default ProductDetailPage;