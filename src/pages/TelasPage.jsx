// src/pages/TelasPage.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { formatPriceUYU } from '../utils/formatters.js';

// Define el orden deseado para las telas
const ORDEN_TELAS = ['Alpha', 'Carla', 'Tach', 'Pané'];

function TelasPage() {
  const [telas, setTelas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [colorSeleccionado, setColorSeleccionado] = useState(null);

  useEffect(() => {
    document.title = 'Muestrario de Telas - Tapicería Ivar';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Explora nuestra colección de telas para sofás y sillones. Elige entre Chenille, Pané Anti-Manchas, Lino y más en una amplia variedad de colores.');
    }

    const fetchTelas = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('telas')
        .select('*');
      
      if (error) {
        console.error("Error al cargar las telas:", error);
      } else {
        setTelas(data);
      }
      setLoading(false);
    };

    fetchTelas();
  }, []);

  if (loading) {
    return <div className="lazy-fallback">Cargando muestrario...</div>;
  }

  // Agrupa las telas por tipo para no repetir encabezados
  const telasAgrupadas = telas.reduce((acc, tela) => {
    const tipo = tela.nombre_tipo;
    if (!acc[tipo]) {
      acc[tipo] = {
        descripcion: tela.descripcion,
        caracteristicas: tela.caracteristicas,
        costoAdicionalPorMetro: tela.costo_adicional_por_metro,
        colores: []
      };
    }
    acc[tipo].colores.push(tela);
    return acc;
  }, {});

  return (
    <div className="telas-page-container standard-page-padding">
      <header className="telas-page-header section-container">
        <h1 className="telas-main-title">Nuestra colección de telas</h1>
        <p className="telas-page-subtitle">
          Descubre la variedad de texturas y colores que tenemos para ofrecerte. Cada tela tiene propiedades únicas y un posible costo adicional por metro.
        </p>
      </header>

      <div className="telas-grid section-container">
        {Object.entries(telasAgrupadas)
          .sort(([tipoA], [tipoB]) => ORDEN_TELAS.indexOf(tipoA) - ORDEN_TELAS.indexOf(tipoB))
          .map(([tipo, data]) => (
            <div key={tipo} className="tela-block">
              <h2 className="tela-nombre">{tipo}</h2>
              
              <p className="tela-descripcion">{data.descripcion}</p>
              
              {data.caracteristicas && data.caracteristicas.length > 0 && (
                <>
                  <h4 className="tela-caracteristicas-titulo">Características Clave:</h4>
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
                      <span className="cerrar-seleccion" onClick={(e) => { e.stopPropagation(); setColorSeleccionado(null); }}>
                        ×
                      </span>
                    </p>
                  )}
                <div className="colores-muestrario">
                  {data.colores.map(color => (
                    <button key={color.id} className="color-swatch-item" title={color.nombre_color} onClick={() => setColorSeleccionado({ tipo: tipo, nombre: color.nombre_color})}>
                      <img
                        src={color.imagen_url}
                        alt={color.nombre_color}
                        className="color-swatch texture-swatch"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {data.costoAdicionalPorMetro > 0 ? (
                <p className="tela-precio-adicional">
                  <strong>+{formatPriceUYU(data.costoAdicionalPorMetro)} por metro</strong>
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