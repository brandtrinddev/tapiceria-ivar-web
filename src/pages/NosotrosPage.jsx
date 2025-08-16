// src/pages/NosotrosPage.jsx
import { Link } from 'react-router-dom';
import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

import IconArmazon from '../components/iconArmazon.jsx';
import IconConfort from '../components/iconConfort.jsx';
import IconAcabados from '../components/iconAcabados.jsx';


function NosotrosPage() {

    useEffect(() => {
    document.title = 'Sobre Nosotros - Tapicería Ivar';
  }, []);

  return (
    <>
      <Helmet>
        <meta name="description" content="Conoce la historia y el proceso artesanal de Tapicería Ivar. Combinamos tradición y calidad para crear muebles únicos en Uruguay." />
      </Helmet>

    <div className="nosotros-page"> {/* NO lleva .standard-page-padding, el hero manejará su espacio */}
      <section className="nosotros-hero">
        <div className="nosotros-hero-content section-container"> {/* Añadido section-container para consistencia del título y subtítulo del hero */}
          <h1 className="nosotros-page-title">La pasión por crear, la excelencia en cada detalle</h1>
          <p className="nosotros-page-subtitle">
            En Tapicería Ivar, combinamos la tradición artesanal con una visión moderna para transformar tus espacios con muebles que cuentan una historia: la tuya.
          </p>
        </div>
      </section>

      <section className="nosotros-section nosotros-historia">
        <div className="section-container"> {/* <<< Contenedor añadido aquí */}
          {/* El div .nosotros-section-content original se puede eliminar si el section-container ya maneja el padding y ancho */}
          <h2 className="section-title-left">Nuestra trayectoria: Del sueño a ser líderes</h2>
          <p>
            Fundada hace poco más de un año con la visión de ofrecer confort y diseño excepcionales, Tapicería Ivar rápidamente se ha consolidado como un referente de calidad y confianza. Este compromiso nos ha llevado a ser Mercado Líder en Mercado Libre y posicionarnos como la opción N°1 en nuestra categoría, un logro que refleja la satisfacción de cientos de clientes que han confiado en nosotros para amueblar sus hogares.
          </p>
          <p>
            Cada día, nos esforzamos por superar las expectativas, manteniendo la calidez de un taller artesanal con la eficiencia y profesionalismo que nuestros clientes merecen.
          </p>
        </div>
      </section>

      <section className="nosotros-section nosotros-calidad">
        <div className="section-container"> {/* <<< Contenedor añadido aquí */}
          {/* El div .nosotros-section-content.full-width-content original se puede eliminar o mantener si tiene estilos específicos adicionales */}
          <h2 className="section-title">Fabricación artesanal, calidad que perdura</h2>
          <div className="calidad-grid">
            <div className="calidad-item">
              <div className="calidad-icon">
                <IconArmazon />
              </div>
              <h3>Armazones Insuperables</h3>
              <p>Todo comienza con una base sólida. Fabricamos nuestros propios esqueletos en madera de eucalipto, cuidadosamente seleccionada y reforzada para garantizar una durabilidad excepcional.</p>
            </div>
            <div className="calidad-item">
              <div className="calidad-icon">
                <IconConfort />
              </div>
              <h3>Confort Detallado</h3>
              <p>Utilizamos cinchas de alta resistencia y espumas de alta densidad, adaptando los materiales para ofrecer el equilibrio perfecto entre firmeza y comodidad duradera.</p>
            </div>
            <div className="calidad-item">
              <div className="calidad-icon">
                <IconAcabados />
              </div>
              <h3>Acabados Impecables</h3>
              <p>La maestría se ve en los detalles. Nuestros tapizados son realizados con precisión, cuidando cada costura y ofreciendo opciones en telas de primera calidad, incluyendo Chenille y tejidos anti-mancha.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="nosotros-section nosotros-personalizacion">
        <div className="section-container"> {/* <<< Contenedor añadido aquí */}
          <div className="nosotros-section-content-flex">
            <div className="text-content">
              <h2 className="section-title-left">Tu sofá, exactamente como lo imaginaste</h2>
              <p>
                Creemos que tus muebles deben ser un reflejo de tu personalidad. Por eso, en Tapicería Ivar, te ofrecemos la libertad de personalizarlo todo: desde las medidas exactas para que encaje perfectamente en tu espacio, hasta la elección del color que armonice con tu decoración. Tú lo sueñas, nosotros lo hacemos realidad.
              </p>
              <Link to="/contacto" className="cta-button-nosotros">
                Cuéntanos tu Proyecto
              </Link>
            </div>
            <div className="image-content">
              {<img src="/img/nosotros-personalizacion-image.jpg" alt="Proceso de personalización de sofás" />}
            </div>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}

export default NosotrosPage;