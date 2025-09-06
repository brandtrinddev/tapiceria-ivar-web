// src/pages/ProductDetailPage.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient.js'; 
import { formatPriceUYU } from '../utils/formatters.js';
import { useParams, Link, useNavigate } from 'react-router-dom'; // Se añade useNavigate
import ProductCard from '../components/ProductCard.jsx';
import { useDrag } from '@use-gesture/react';
import { useCart } from '../context/CartContext.jsx';
import { calculateSubtotal } from '../utils/pricing.js';
import { toast } from 'react-toastify'; // Se añade import para toast

const NOMBRES_COMPONENTES = { sofa: 'Sofá', sofa_xl: 'Sofá XL', sofa_estandar: 'Sofá Estándar', sofa_2c: 'Sofá 2 Cuerpos', sofa_3c: 'Sofá 3 Cuerpos', butaca: 'Butaca', isla: 'Isla', modulo: 'Módulo', modulo_chaise: "Módulo Chaise", modulo_con_brazo: "Modulo con brazo", modulo_sin_brazo: "Modulo sin brazo", respaldo: 'Respaldo', modulo_sofa: "Modulo Sofá", sofa_completo: "Sofá Completo" };
const NOMBRES_MEDIDAS = { ancho: 'Ancho', profundidad: 'Profundidad', alto: 'Altura', profundidadTotalChaise: 'Profundidad Total Chaise', profundidadChaise: 'Profundidad Chaise', profundidadTotal: 'Profundidad Total' };
const ORDEN_TELAS = [ 'Alpha', 'Carla', 'Tach', 'Pané' ];

function ProductDetailPage() {
  const { addToCart } = useCart();
  const { productId } = useParams();
  const navigate = useNavigate(); // Se añade el hook useNavigate
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
      setActiveTab('personalizacion');
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
  const tiposDeTela = useMemo(() => {
  const tiposDisponibles = new Set(telas.map(t => t.nombre_tipo));
  return ORDEN_TELAS.filter(tipo => tiposDisponibles.has(tipo));
}, [telas]);

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
      toast.error("Por favor, selecciona un tipo y color de tela.");
      return;
    }
    const itemToAdd = {
      productId: product.id,
      productName: product.nombre,
      quantity: quantity,
      tela: selectedTela,
      unitPrice: product.precio_base,
      metros_tela_base: product.metros_tela_base,
      imageUrl: product.imagen_url,
      detalles: product.detalles
    };
    
    addToCart(itemToAdd);

    const ToastMessage = () => (
      <div>
        <p style={{ margin: 0, padding: 0 }}>¡Producto añadido al carrito!</p>
        <button 
          type="button"
          onClick={() => navigate('/carrito')}
          className="toast-go-to-cart-btn"
        >
          Ir al carrito
        </button>
      </div>
    );
    
    toast.success(<ToastMessage />);
  };

  if (loading) { return <div className="lazy-fallback">Cargando producto...</div>; }
  if (!product) { return ( <div style={{ textAlign: 'center', padding: '50px' }}> <h1>Producto no encontrado</h1> <Link to="/catalogo" style={{ color: '#032f55', textDecoration: 'underline' }}>Volver al Catálogo</Link> </div> ); }
  
  const formattedPrice = formatPriceUYU(precioFinalCalculado);
  const formattedBasePrice = formatPriceUYU(product.precio_base);
  const handleThumbnailClick = (imageUrl) => setSelectedImage(imageUrl);

  // Lógica para el Acordeón en móvil
  const handleTabClick = (tabName) => {
    if (window.innerWidth <= 768) {
      setActiveTab(activeTab === tabName ? null : tabName);
    } else {
      setActiveTab(tabName);
    }
  };


  return (
    <div className="product-detail-container">
      <div className="product-detail-layout">
        <div className="product-detail-images">
          {/* ...código de galería de imágenes sin cambios... */}
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
          <p className="product-detail-price">Desde {formattedBasePrice}</p>
          
          {product.detalles?.promo && (
            <p className="product-detail-promo-price">
              ¡Oferta Especial! Llévate {product.detalles.promo.cantidad} por {formatPriceUYU(product.detalles.promo.precio)}
            </p>
          )}

          {/* --- INICIA ESTRUCTURA JSX DEFINITIVA DE PESTAÑAS/ACORDEÓN --- */}
          <div className="product-tabs-container">
            
            {/* 1. La lista de botones siempre visible */}
            <div className="tab-list">
              <button 
                type="button" 
                className={`tab-button ${activeTab === 'personalizacion' ? 'active' : ''}`} 
                onClick={() => handleTabClick('personalizacion')}
              >
                Personalización
              </button>
              <button 
                type="button" 
                className={`tab-button ${activeTab === 'detalles' ? 'active' : ''}`} 
                onClick={() => handleTabClick('detalles')}
              >
                Detalles
              </button>
              <button 
                type="button" 
                className={`tab-button ${activeTab === 'envio' ? 'active' : ''}`} 
                onClick={() => handleTabClick('envio')}
              >
                Envío y Garantía
              </button>
            </div>

            {/* 2. El contenido de cada panel */}
            <div className="tab-content-wrapper">

              {/* Panel de Personalización */}
              <div className={`tab-panel ${activeTab === 'personalizacion' ? 'open' : ''}`}>
                <div className="tab-panel-content">
                  <div className="product-info-section">
                    <h2>Selecciona la tela</h2>
                    <div className="fabric-selector">
                      {tiposDeTela.map(tipo => {
                        // Buscamos la primera tela de este tipo para obtener su costo
                        const costoAdicional = telas.find(t => t.nombre_tipo === tipo)?.costo_adicional_por_metro;

                        return (
                          <div key={tipo} className="fabric-accordion-item">
                            <button type="button" className={`fabric-accordion-header ${openAccordion === tipo ? 'active' : ''}`} onClick={() => handleAccordionToggle(tipo)}>

                              {/* El nombre del tipo de tela */}
                              <span>{tipo}</span>

                              {/* El precio o etiqueta que se muestra a la derecha */}
                              {costoAdicional > 0 ? (
                                <span className="fabric-cost">+ {formatPriceUYU(costoAdicional)}/m</span>
                              ) : (
                                <span className="fabric-cost included">Incluida</span>
                              )}

                            </button>
                            <div className={`fabric-accordion-content ${openAccordion === tipo ? 'open' : ''}`}>
                              {/* ... el resto del contenido del acordeón no cambia ... */}
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
                        );
                      })}
                    </div>
                  </div>
                  {product.detalles?.aclaracion_foto && (
                    <div className="product-info-section">
                      <p style={{fontSize: '0.9rem', color: '#777', fontStyle: 'italic', lineHeight: 1.5}}>
                        <strong>Nota:</strong> {product.detalles.aclaracion_foto}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Panel de Detalles */}
              <div className={`tab-panel ${activeTab === 'detalles' ? 'open' : ''}`}>
                <div className="tab-panel-content">
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
              </div>
              
              {/* Panel de Envío y Garantía */}
              <div className={`tab-panel ${activeTab === 'envio' ? 'open' : ''}`}>
                <div className="tab-panel-content">
                  <div className="product-info-section">
                    <h2>Envíos y Retiros</h2>
                    <p>Coordinamos cada entrega para adaptarnos a tus necesidades. Estos son nuestros métodos:</p>
                    <ul>
                      <li>
                        <strong>Montevideo:</strong> Realizamos los envíos con nuestra propia logística. Tiene un costo fijo de <strong>$900</strong> que se añadirá en el checkout.
                      </li>
                      <li>
                        <strong>Interior del País:</strong> Los envíos se realizan a través de agencias de confianza (ej: DAC). El costo varía según el tamaño del producto y el destino, y se coordina contigo después de realizada la compra.
                      </li>
                      <li>
                        <strong>Retiro en Taller:</strong> Puedes retirar tu pedido sin costo en nuestro taller. Te notificaremos tan pronto como esté listo para que puedas pasar a buscarlo.
                      </li>
                    </ul>
                    <p><strong>Tiempos:</strong> Recuerda que cada pieza se fabrica bajo pedido. El tiempo de preparación es de aproximadamente 7 a 15 días, a lo que se suma el tiempo de transporte de la agencia (1 a 3 días hábiles).</p>
                  </div>
                  <div className="product-info-section">
                    <h2>Política de Garantía</h2>
                    <p>
                      Confiamos en la calidad de nuestro trabajo. Todos nuestros productos nuevos cuentan con una <strong>garantía estructural de 1 año</strong> por defectos de fabricación.
                    </p>
                    <p>
                      Para conocer todos los detalles sobre la cobertura y el proceso de reclamo, te invitamos a leer nuestra página dedicada.
                    </p>
                    <Link to="/politicas-devolucion-garantia" className="cta-button-secondary-v2" style={{ marginTop: '15px' }}>
                      Ver Política de Garantía y Devoluciones
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* --- FIN DE ESTRUCTURA JSX --- */}

          {/* Bloque de Acciones (siempre visible) */}
          <div className="product-detail-actions">
            <div className="actions-price">
              <span className="actions-price-label">Total: </span>
              <span className="actions-price-amount">{formattedPrice}</span>
            </div>
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