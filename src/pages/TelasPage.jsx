// src/pages/TelasPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { formatPriceUYU } from '../utils/formatters.js';
import { getTelaThumbnailUrl } from '../utils/telaImages.js';
import { useAvailableTelas } from '../hooks/useAvailableTelas.js';
import { formatSupabaseFetchError } from '../hooks/useActiveProducts.js';

// Define el orden deseado para las telas
const ORDEN_TELAS = ['Alpha', 'Carla', 'Tach', 'Pané'];

function agruparTelasDisponibles(telas) {
  return telas.reduce((acc, tela) => {
    if (tela.disponible !== true) return acc;

    const tipo = tela.nombre_tipo;
    if (!tipo) return acc;

    if (!acc[tipo]) {
      acc[tipo] = {
        descripcion: tela.descripcion,
        caracteristicas: tela.caracteristicas,
        colores: [],
      };
    }
    acc[tipo].colores.push(tela);
    return acc;
  }, {});
}

function TelasPage() {
  const [colorSeleccionado, setColorSeleccionado] = useState(null);
  const {
    data: telas = [],
    isLoading: loading,
    error,
  } = useAvailableTelas();

  const fetchError = Boolean(error);

  useEffect(() => {
    document.title = 'Muestrario de Telas - Tapicería Ivar';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        'Explora nuestra colección de telas para sofás y sillones. Elige entre Chenille, Pané Anti-Manchas, Lino y más en una amplia variedad de colores.',
      );
    }
  }, []);

  useEffect(() => {
    if (error) {
      console.error(
        'Error al cargar las telas:',
        formatSupabaseFetchError(error),
      );
    }
  }, [error]);

  const telasAgrupadas = useMemo(
    () => agruparTelasDisponibles(telas),
    [telas],
  );

  const familiasOrdenadas = useMemo(
    () =>
      Object.entries(telasAgrupadas)
        .filter(([, data]) => data.colores.length > 0)
        .sort(([tipoA], [tipoB]) => {
          const indexA = ORDEN_TELAS.indexOf(tipoA);
          const indexB = ORDEN_TELAS.indexOf(tipoB);
          const orderA = indexA === -1 ? ORDEN_TELAS.length : indexA;
          const orderB = indexB === -1 ? ORDEN_TELAS.length : indexB;
          return orderA - orderB || tipoA.localeCompare(tipoB);
        }),
    [telasAgrupadas],
  );

  if (loading) {
    return <div className="lazy-fallback">Cargando muestrario...</div>;
  }

  return (
    <div className="telas-page-container standard-page-padding">
      <header className="telas-page-header section-container">
        <h1 className="telas-main-title">Nuestra colección de telas</h1>
        <p className="telas-page-subtitle">
          Descubre la variedad de texturas y colores que tenemos para ofrecerte.
          Cada tela tiene propiedades únicas y un posible costo adicional por metro.
        </p>
      </header>

      {fetchError && (
        <div className="lazy-fallback section-container" role="alert">
          <p>No pudimos cargar el muestrario. Por favor, intenta de nuevo más tarde.</p>
        </div>
      )}

      {!fetchError && familiasOrdenadas.length === 0 && (
        <div className="lazy-fallback section-container">
          <p>
            No hay telas visibles en el muestrario en este momento. Contáctanos para
            conocer opciones disponibles bajo pedido.
          </p>
        </div>
      )}

      {!fetchError && familiasOrdenadas.length > 0 && (
        <div className="telas-grid section-container">
          {familiasOrdenadas.map(([tipo, data]) => {
            const costoReferencia = Math.min(
              ...data.colores.map((c) => c.costo_adicional_por_metro ?? 0),
            );

            return (
              <div key={tipo} className="tela-block">
                <h2 className="tela-nombre">{tipo}</h2>

                <p className="tela-descripcion">{data.descripcion}</p>

                {data.caracteristicas && data.caracteristicas.length > 0 && (
                  <>
                    <h4 className="tela-caracteristicas-titulo">
                      Características Clave:
                    </h4>
                    <ul className="tela-caracteristicas-list">
                      {data.caracteristicas.map((caracteristica, index) => (
                        <li key={index}>{caracteristica}</li>
                      ))}
                    </ul>
                  </>
                )}

                <div className="colores-muestrario-container">
                  <h3 className="colores-muestrario-titulo">Colores Disponibles:</h3>
                  {colorSeleccionado && colorSeleccionado.tipo === tipo && (
                    <p className="color-nombre-seleccionado">
                      {colorSeleccionado.nombre}
                      <span
                        className="cerrar-seleccion"
                        onClick={(e) => {
                          e.stopPropagation();
                          setColorSeleccionado(null);
                        }}
                      >
                        ×
                      </span>
                    </p>
                  )}
                  <div className="colores-muestrario">
                    {data.colores.map((color) => (
                      <button
                        key={color.id}
                        type="button"
                        className="color-swatch-item"
                        title={color.nombre_color}
                        onClick={() =>
                          setColorSeleccionado({
                            tipo,
                            nombre: color.nombre_color,
                          })
                        }
                      >
                        <img
                          src={getTelaThumbnailUrl(color.imagen_url, color)}
                          alt={color.nombre_color}
                          className="texture-swatch"
                          loading="lazy"
                          decoding="async"
                          width={48}
                          height={48}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {costoReferencia > 0 ? (
                  <p className="tela-precio-adicional">
                    <strong>+{formatPriceUYU(costoReferencia)} por metro</strong>
                  </p>
                ) : (
                  <p className="tela-precio-adicional">
                    <strong>Incluida en el precio base</strong>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TelasPage;
