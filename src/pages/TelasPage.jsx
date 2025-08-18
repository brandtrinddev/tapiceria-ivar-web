// src/pages/TelasPage.jsx
import React, { useState, useEffect } from 'react';
import telasData from '../data/telas.json';

function TelasPage() {

  useEffect(() => {
    // 1. Manejar el Título
    const newTitle = 'Muestrario de Telas - Tapicería Ivar';
    document.title = newTitle;
  
    // 2. Manejar la Meta Descripción
    const newDescription = 'Explora nuestra colección de telas para sofás y sillones. Elige entre Chenille, Pané Anti-Manchas, Lino y más en una amplia variedad de colores.';
    
    let metaDescription = document.querySelector('meta[name="description"]');
  
    if (!metaDescription) {
      // Si la etiqueta no existe, la crea y la añade al head
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    
    // Actualiza el contenido de la etiqueta existente o recién creada
    metaDescription.setAttribute('content', newDescription);
  
  }, []); // El array de dependencias vacío es correcto, solo se ejecuta una vez.

  const [colorSeleccionado, setColorSeleccionado] = useState(null);

  return (
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
  );
}

export default TelasPage;