import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import productData from '../data/productos.json';

// Iconos para "Por Qué Elegirnos"
import iconCraftUrl from '../assets/icons/icon-craftsmanship.svg';
import iconQualityUrl from '../assets/icons/icon-quality-materials.svg';
import iconCustomUrl from '../assets/icons/icon-custom-design.svg';

// Iconos para la sección "Cómo Trabajamos" (Font Awesome)
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import homeData from '../data/homeContent.json';
import { faCommentDots, faTools, faCheckCircle, faTruck } from '@fortawesome/free-solid-svg-icons';

const iconMap = {
  faCommentDots,
  faTools,
  faCheckCircle,
  faTruck
};

function HomePage() {
    useEffect(() => {
    document.title = 'Tapicería Ivar - Muebles de diseño y calidad en Uruguay';
  }, []);

  const featuredProducts = productData.filter(producto => producto.esDestacado === true);

  return (
    <div className="homepage-container">
      <Helmet>
        <meta name="description" content="Descubre sofás y sillones únicos, fabricados artesanalmente en Uruguay. Calidad insuperable, diseño 100% personalizado y atención directa." />
      </Helmet>

      {/* Sección Hero Renovada */}
      <section className="hero-section-v2">
        <div className="hero-overlay"></div>
        <div className="hero-content-v2 section-container">
          <h1 className="hero-title-v2">
            <span>Tu hogar,</span>
            <span>Tu esencia,</span>
            <span>Nuestro arte.</span>
          </h1>
          <p className="hero-subtitle-v2">
            Descubre sofás únicos, fabricados artesanalmente en Uruguay con materiales de la más alta calidad, diseñados para durar y reflejar tu estilo.
          </p>
          <Link to="/catalogo" className="hero-cta-button-v2">
            Explorar Colección
          </Link>
        </div>
      </section>

      {/* Sección "Por Qué Elegirnos" Renovada */}
      <section className="why-choose-us-section-v2">
        <div className="section-container">
          <h2 className="section-title">Nuestra diferencia, tu tranquilidad</h2>
          <div className="features-grid-v2">
            <div className="feature-item-v2">
              <div className="feature-icon-wrapper">
                {/* Asumiendo que el SVG es blanco o le cambiaste el color a blanco */}
                <img src={iconCraftUrl} alt="Pasión Artesanal" className="feature-icon-v2" />
              </div>
              <h3 className="feature-title-v2">Pasión artesanal</h3>
              <p className="feature-description-v2">Cada sofá es una pieza única, fabricada desde cero con atención meticulosa al detalle y el amor por un oficio transmitido por generaciones.</p>
            </div>
            <div className="feature-item-v2">
              <div className="feature-icon-wrapper">
                <img src={iconQualityUrl} alt="Calidad y Durabilidad" className="feature-icon-v2" />
              </div>
              <h3 className="feature-title-v2">Calidad insuperable</h3>
              <p className="feature-description-v2">Utilizamos armazones reforzados de eucalipto seleccionado y materiales de alta densidad para asegurar una inversión que perdura en el tiempo.</p>
            </div>
            <div className="feature-item-v2">
              <div className="feature-icon-wrapper">
                <img src={iconCustomUrl} alt="Diseño a Tu Medida" className="feature-icon-v2" />
              </div>
              <h3 className="feature-title-v2">Diseño 100% personalizado</h3>
              <p className="feature-description-v2">Adaptamos medidas, telas, colores y detalles para crear el sofá que siempre soñaste, perfectamente integrado a tu espacio y estilo de vida.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sección: Cómo Trabajamos / Nuestro Proceso Renovada */}
      <section className="how-we-work-section-v2">
        <div className="section-container">
          <h2 className="section-title">Tu sofá ideal en simples pasos</h2>
          <div className="process-steps-grid-v2">
            {homeData.map(step => (
              <div key={step.id} className="process-step-item-v2">
                <div className="process-step-icon-wrapper">
                  {/* Acá está el cambio clave */}
                  <FontAwesomeIcon icon={iconMap[step.icon]} className="process-step-icon-v2" />
                </div>
                {/* El resto sigue igual */}
                <h3 className="process-step-title-v2">{step.title}</h3>
                <p className="process-step-description-v2">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sección "Modelos Destacados" Renovada */}
      {featuredProducts.length > 0 && (
        <section className="featured-products-section-v2">
          <div className="section-container">
            <h2 className="section-title">Nuestras creaciones estrella</h2>
            <div className="product-grid homepage-product-grid"> {/* product-grid necesita que sus estilos permitan varias columnas */}
              {featuredProducts.map(producto => (
                <ProductCard key={producto.id} product={producto} />
              ))}
            </div>
            <div className="all-products-link-container-v2">
              <Link to="/catalogo" className="cta-button-secondary-v2">
                Ver todos los modelos
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Sección: Reconocimiento y Confianza Renovada */}
      <section className="recognition-section-v2">
        <div className="section-container">
          <h2 className="section-title">La confianza de nuestros clientes nos define</h2>
          <div className="recognition-content-v2">
            <div className="recognition-text-v2">
              <p>
                En Tapicería Ivar, nos enorgullece haber alcanzado rápidamente el nivel de <strong>MercadoLíder</strong> y ser reconocidos como una opción destacada en nuestra categoría dentro de Mercado Libre.
                Estos logros son el reflejo directo de la satisfacción y confianza de cientos de clientes que han elegido la calidad, el diseño y la atención personalizada que nos caracteriza.
              </p>
              <p>
                Tu tranquilidad es nuestra prioridad. Te invitamos a conocer las experiencias de quienes ya transformaron sus hogares con nosotros:
              </p>
              <div className="recognition-links-v2">
                <a
                  href="https://www.mercadolibre.com.uy/perfil/tapiceriaivar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cta-button-recognition-v2"
                >
                  Ver Opiniones en Mercado Libre
                </a>
              </div>
            </div>
            <div className="recognition-image-container-v2">
              <img
                src="/img/mercado-libre-reputacion.png"
                alt="Reputación Tapicería Ivar en Mercado Libre"
                className="mercado-libre-screenshot-v2"
              />
              <p className="image-caption-v2">Calificaciones 100% positivas que nos respaldan.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;