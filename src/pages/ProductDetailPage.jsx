// src/pages/ProductDetailPage.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient.js'; 
import { formatPriceUYU } from '../utils/formatters.js';
import { useParams, Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { useDrag } from '@use-gesture/react';
import { useCart } from '../context/CartContext.jsx';
import { calculateSubtotal } from '../utils/pricing.js';

const NOMBRES_COMPONENTES = { sofa: 'Sofá', sofa_xl: 'Sofá XL', sofa_estandar: 'Sofá Estándar', sofa_2c: 'Sofá 2 Cuerpos', sofa_3c: 'Sofá 3 Cuerpos', butaca: 'Butaca', isla: 'Isla', modulo: 'Módulo', modulo_chaise: "Módulo Chaise", modulo_con_brazo: "Modulo con brazo", modulo_sin_brazo: "Modulo sin brazo", respaldo: 'Respaldo', modulo_sofa: "Modulo Sofá", sofa_completo: "Sofá Completo" };
const NOMBRES_MEDIDAS = { ancho: 'Ancho', profundidad: 'Profundidad', alto: 'Altura', profundidadTotalChaise: 'Profundidad Total Chaise', profundidadChaise: 'Profundidad Chaise', profundidadTotal: 'Profundidad Total' };

function ProductDetailPage() {
  const { addToCart } = useCart();
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [telas, setTelas] = useState([]);
  const [selectedTela, setSelectedTela] = useState(null);
  const [precioUnitario, setPrecioUnitario] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [openAccordion, setOpenAccordion] = useState(null);
  const [activeTab, setActiveTab] = useState('personalizacion');

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setProduct(null);
      setActiveTab('personalizacion'); // Resetea la pestaña al cambiar de producto
      const { data, error } = await supabase.from('productos').select('*').eq('id', productId).single();
      if (error) { console.error("Error buscando el producto:", error); } else {
        setProduct(data);
        setSelectedImage(data.imagen_url);
        setPrecioUnitario(data.precio_base);
      }
      setLoading(false);
    };
    if (productId) fetchProduct();
  }, [productId]);

  useEffect(() => {
    const fetchTelas = async () => {
      const { data, error } = await supabase.from('telas').select('*');
      if (!error) setTelas(data);
    };
    fetchTelas();
  }, []);

  useEffect(() => {
    if (product) {
      if (selectedTela) {
        const precioFinal = product.precio_base + (product.metros_tela_base * selectedTela.costo_adicional_por_metro);
        setPrecioUnitario(precioFinal);
      } else {
        setPrecioUnitario(product.precio_base);
      }
    }
  }, [selectedTela, product]);

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      if (product && product.detalles?.modelo) {
        const { data, error } = await supabase.from('productos').select('*').eq('detalles->>modelo', product.detalles.modelo).neq('id', product.id).limit(4);
        if (!error) setRelatedProducts(data);
      }
    };
    fetchRelatedProducts();
  }, [product]);

  const precioFinalCalculado = useMemo(() => {
    if (!product) return 0;
    const currentItem = { unitPrice: precioUnitario, quantity: quantity, detalles: product.detalles };
    return calculateSubtotal(currentItem);
  }, [precioUnitario, quantity, product]);
  
  const allImages = useMemo(() => [product?.imagen_url, ...(product?.detalles?.galeria || [])].filter(Boolean), [product]);
  const currentIndex = useMemo(() => allImages.indexOf(selectedImage), [allImages, selectedImage]);
  const goToPreviousImage = useCallback(() => { if (allImages.length > 1) { const newIndex = currentIndex === 0 ? allImages.length - 1 : currentIndex - 1; setSelectedImage(allImages[newIndex]); } }, [currentIndex, allImages]);
  const goToNextImage = useCallback(() => { if (allImages.length > 1) { const newIndex = currentIndex === allImages.length - 1 ? 0 : currentIndex + 1; setSelectedImage(allImages[newIndex]); } }, [currentIndex, allImages]);
  useEffect(() => { const handleKeyDown = (event) => { if (event.key === 'ArrowLeft') goToPreviousImage(); if (event.key === 'ArrowRight') goToNextImage(); }; window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown); }, [goToPreviousImage, goToNextImage]);
  useEffect(() => { if (product) { document.title = `Tapicería Ivar - ${product.nombre}`; } }, [product]);
  const bind = useDrag(({ swipe: [swipeX] }) => { if (swipeX === -1) goToNextImage(); if (swipeX === 1) goToPreviousImage(); }, { axis: 'x' });
  const tiposDeTela = useMemo(() => [...new Set(telas.map(t => t.nombre_tipo))], [telas]);

  const handleAccordionToggle = (tipo) => {
    setOpenAccordion(openAccordion === tipo ? null : tipo);
  };

  const handleTelaSelect = (tela) => {
    setSelectedTela(tela);
  };
  
  const handleQuantityChange = (amount) => {
    setQuantity(prevQuantity => Math.max(1, prevQuantity + amount));
  };

  const handleAddToCart = () => {
    if (!selectedTela) {
      alert("Por favor, selecciona un tipo y color de tela.");
      return;
    }
    const itemToAdd = {
      productId: product.id,
      productName: product.nombre,
      quantity: quantity,
      tela: selectedTela,
      unitPrice: precioUnitario,
      imageUrl: product.imagen_url,
      detalles: product.detalles
    };
    addToCart(itemToAdd);
    alert('¡Producto añadido al carrito!');
  };

  if (loading) { return <div className="lazy-fallback">Cargando producto...</div>; }
  if (!product) { return ( <div style={{ textAlign: 'center', padding: '50px' }}> <h1>Producto no encontrado</h1> <Link to="/catalogo" style={{ color: '#032f55', textDecoration: 'underline' }}>Volver al Catálogo</Link> </div> ); }
  
  const formattedPrice = formatPriceUYU(precioFinalCalculado);
  const handleThumbnailClick = (imageUrl) => setSelectedImage(imageUrl);

  return (
    <div className="product-detail-container">
      <div className="product-detail-layout">
        <div className="product-detail-images">
          <div className="main-image-wrapper">
            <div {...bind()} style={{ touchAction: 'pan-y', cursor: 'grab', width: '100%', height: '100%' }}> 
              <img src={selectedImage} alt={product.nombre} className="product-detail-main-image" />
            </div>
            {allImages.length > 1 && (
              <>
                <button type="button" onClick={goToPreviousImage} className="gallery-arrow prev-arrow" aria-label="Imagen anterior">&#10094;</button>
                <button type="button" onClick={goToNextImage} className="gallery-arrow next-arrow" aria-label="Siguiente imagen">&#10095;</button>
              </>
            )}
          </div>
          {allImages.length > 1 && (
            <div className="product-detail-thumbnail-gallery">
              {allImages.map((imgUrl, index) => (
                <img key={index} src={imgUrl} alt={`${product.nombre} - vista ${index + 1}`} className={`product-detail-thumbnail ${selectedImage === imgUrl ? 'active' : ''}`} onClick={() => handleThumbnailClick(imgUrl)} loading="lazy" />
              ))}
            </div>
          )}
        </div>
        
        <div className="product-detail-info">
          <h1 className="product-detail-name">{product.nombre}</h1>
          <p className="product-detail-price">{formattedPrice}</p>
          
          {product.detalles?.promo && (
            <p className="product-detail-promo-price">
              ¡Oferta Especial! Llévate {product.detalles.promo.cantidad} por {formatPriceUYU(product.detalles.promo.precio)}
            </p>
          )}

          <div className="tabs-container">
            <div className="tab-list">
              <button type="button" className={`tab-button ${activeTab === 'personalizacion' ? 'active' : ''}`} onClick={() => setActiveTab('personalizacion')}>
                Personalización
              </button>
              <button type="button" className={`tab-button ${activeTab === 'detalles' ? 'active' : ''}`} onClick={() => setActiveTab('detalles')}>
                Detalles
              </button>
              <button type="button" className={`tab-button ${activeTab === 'envio' ? 'active' : ''}`} onClick={() => setActiveTab('envio')}>
                Envío y Garantía
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'personalizacion' && (
                <div className="tab-panel">
                  <div className="product-info-section">
                    <h2>Elige la Tela</h2>
                    <div className="fabric-selector">
                      {tiposDeTela.map(tipo => (
                        <div key={tipo} className="fabric-accordion-item">
                          <button type="button" className={`fabric-accordion-header ${openAccordion === tipo ? 'active' : ''}`} onClick={() => handleAccordionToggle(tipo)}>
                            {tipo}
                          </button>
                          <div className={`fabric-accordion-content ${openAccordion === tipo ? 'open' : ''}`}>
                            <div className="fabric-colors">
                              <p>Selecciona un color para la tela <strong>{tipo}</strong>:</p>
                              <div className="color-swatch-grid">
                                {telas.filter(t => t.nombre_tipo === tipo).map(tela => (
                                  <button type="button" key={tela.id} className={`color-swatch ${selectedTela?.id === tela.id ? 'active' : ''}`} onClick={() => handleTelaSelect(tela)} title={tela.nombre_color}>
                                    <img src={tela.imagen_url} alt={tela.nombre_color} />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {product.detalles?.aclaracion_foto && (
                    <div className="product-info-section">
                      <p style={{fontSize: '0.9rem', color: '#777', fontStyle: 'italic', lineHeight: 1.5}}>
                        <strong>Nota:</strong> {product.detalles.aclaracion_foto}
                      </p>
                    </div>
                  )}
                  <div className="product-detail-actions">
                    <div className="quantity-selector">
                      <button type="button" onClick={() => handleQuantityChange(-1)} className="quantity-btn">-</button>
                      <input type="number" value={quantity} readOnly className="quantity-input" />
                      <button type="button" onClick={() => handleQuantityChange(1)} className="quantity-btn">+</button>
                    </div>
                    <button type="button" onClick={handleAddToCart} className="add-to-cart-button">
                      Añadir al Carrito
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'detalles' && (
                <div className="tab-panel">
                  {product.detalles?.medidas && Object.keys(product.detalles.medidas).length > 0 && (
                    <div className="product-info-section product-detail-dimensions">
                      <h2>Medidas</h2>
                      {Object.keys(product.detalles.medidas).length === 1 ? (
                        <div className="dimension-block">
                          <ul>{Object.entries(Object.values(product.detalles.medidas)[0]).map(([medida, valor]) => (<li key={medida}><strong>{NOMBRES_MEDIDAS[medida] || medida}:</strong> {valor}</li>))}</ul>
                        </div>
                      ) : (
                        <div className="dimensions-grid">
                          {Object.entries(product.detalles.medidas).map(([componenteKey, medidasComponente]) => {
                            const displayName = NOMBRES_COMPONENTES[componenteKey] || componenteKey;
                            return (
                              <div key={componenteKey} className="dimension-block">
                                <h3 className="dimension-component-title">{displayName}</h3>
                                <ul>{Object.entries(medidasComponente).map(([medida, valor]) => (<li key={medida}><strong>{NOMBRES_MEDIDAS[medida] || medida}:</strong> {valor}</li>))}</ul>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                   <div className="product-info-section">
                    <h2>Descripción</h2>
                    <p>{product.detalles?.descripcion_larga?.sabor}</p>
                  </div>
                   <div className="product-info-section">
                    <h2>Calidad y Fabricación</h2>
                    <p>{product.detalles?.descripcion_larga?.base}</p>
                  </div>
                </div>
              )}

              {activeTab === 'envio' && (
                <div className="tab-panel">
                  <div className="product-info-section">
                    <h2>Envíos y Retiros</h2>
                    <p>Texto de marcador de posición sobre envíos y retiros. Aquí explicaremos las políticas, costos para Montevideo, coordinación para el interior, y la opción de retiro en el taller.</p>
                  </div>
                  <div className="product-info-section">
                    <h2>Política de Garantía</h2>
                    <p>Texto de marcador de posición para la garantía. Detallaremos la cobertura, duración y el proceso para hacerla efectiva.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {relatedProducts.length > 0 && (
        <div className="variants-section">
          <h2 className="variants-section-title">Completa la Colección</h2>
          <div className="product-grid variants-grid">
            {relatedProducts.map(relatedProduct => (<ProductCard key={relatedProduct.id} product={relatedProduct} />))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductDetailPage;