// src/pages/TelasPage.jsx
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import telasData from '../data/telas.json';

function TelasPage() {

  useEffect(() => {
    document.title = 'Muestrario de Telas - Tapicería Ivar';
  }, []);


  const [colorSeleccionado, setColorSeleccionado] = useState(null);

  return (
    <>
      <Helmet>
        <meta name="description" content="Explora nuestra colección de telas para sofás y sillones. Elige entre Chenille, Pané Anti-Manchas, Lino y más en una amplia variedad de colores." />
      </Helmet>

    <div className="telas-page-container standard-page-padding">
      <header className="telas-page-header section-container">
        <h1 className="telas-main-title">Nuestra colección de telas</h1>
        <p className="telas-page-subtitle">
          Descubre la variedad de texturas y colores que tenemos para ofrecerte. Cada tela tiene propiedades únicas y un posible costo adicional que se suma por cuerpo de sofá.
        </p>
      </header>

      <div className="telas-grid section-container">
        {telasData.map(tela => (
          <div key={tela.id} className="tela-block">
            <h2 className="tela-nombre">{tela.nombre}</h2>
            {/* Opcional: Imagen general del muestrario de esta tela */}
            {/* {tela.imagenMuestrarioGeneral && (
              <img 
                src={tela.imagenMuestrarioGeneral} 
                alt={`Muestrario de tela ${tela.nombre}`} 
                className="tela-muestrario-general-img" 
              />
            )} */}
            <p className="tela-descripcion">{tela.descripcion}</p>
            
            <div className="colores-muestrario-container">
              <h3 className="colores-muestrario-titulo">Colores Disponibles:</h3>
              {colorSeleccionado && colorSeleccionado.telaId === tela.id && (
                 <p className="color-nombre-seleccionado">
                    {colorSeleccionado.nombre}
                    <span className="cerrar-seleccion" onClick={(e) => { e.stopPropagation(); setColorSeleccionado(null); }}>
                      ×
                    </span>
                  </p>
                )}
              <div className="colores-muestrario">
                {tela.colores.map(color => (
                  <button key={color.nombre} className="color-swatch-item" title={color.nombre} onClick={() => setColorSeleccionado({ telaId: tela.id, nombre: color.nombre})}>
                    {color.tipoMuestra === 'hex' ? (
                      <div
                        className="color-swatch"
                        style={{ backgroundColor: color.valorMuestra }}
                      ></div>
                    ) : (
                      <img
                        src={color.valorMuestra}
                        alt={color.nombre}
                        className="color-swatch texture-swatch"
                      />
                    )}
                    {/* <span className="color-name">{color.nombre}</span> = Mostrar color de texto debajo */}
                  </button>
                ))}
              </div>
            </div>

            {tela.costoAdicionalPorCuerpo > 0 ? (
              <p className="tela-precio-adicional">
                Costo adicional: <strong>+${tela.costoAdicionalPorCuerpo.toLocaleString('es-UY')} por cuerpo</strong>
              </p>
            ) : (
              <p className="tela-precio-adicional">
                <strong>Incluida en el precio base</strong>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
    </>
  );
}

export default TelasPage;