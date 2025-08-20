// src/pages/CatalogoPage.jsx

import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { supabase } from '../supabaseClient.js';

const PRODUCTS_PER_PAGE = 12;

const categoryNames = {
  juegos_living: 'Juegos de Living',
  modulares: 'Esquineros y Modulares',
  sofas: 'Sofás',
  butacas: 'Sillones y Butacas',
  complementos: 'Complementos',
};

const rankingCategorias = ['juegos_living', 'modulares', 'sofas', 'butacas', 'complementos'];

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function CatalogoPage() {
  const query = useQuery();
  const location = useLocation();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getProducts = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('productos').select('*');
      if (error) {
        console.error("Error al obtener productos:", error);
      } else {
        setProducts(data);
      }
      setLoading(false);
    };
    getProducts();
  }, []);

  const categoriaActual = query.get('categoria');
  const paginaActual = parseInt(query.get('pagina'), 10) || 1;
  const ordenActual = query.get('orden') || 'default';

  let productosFiltrados = categoriaActual ? products.filter(p => p.categoria === categoriaActual) : [...products];

  const productosOrdenados = [...productosFiltrados];
  // ... Lógica de ordenamiento (sin cambios) ...
  switch (ordenActual) {
    case 'name-asc': productosOrdenados.sort((a, b) => a.nombre.localeCompare(b.nombre)); break;
    case 'name-desc': productosOrdenados.sort((a, b) => b.nombre.localeCompare(a.nombre)); break;
    case 'price-asc': productosOrdenados.sort((a, b) => a.precio_base - b.precio_base); break;
    case 'price-desc': productosOrdenados.sort((a, b) => b.precio_base - a.precio_base); break;
    default: if (!categoriaActual) { productosOrdenados.sort((a, b) => { const getRank = (cat) => rankingCategorias.indexOf(cat) === -1 ? Infinity : rankingCategorias.indexOf(cat); return getRank(a.categoria) - getRank(b.categoria); }); } break;
  }

  const totalPages = Math.ceil(productosOrdenados.length / PRODUCTS_PER_PAGE);
  const currentProductsToDisplay = productosOrdenados.slice((paginaActual - 1) * PRODUCTS_PER_PAGE, paginaActual * PRODUCTS_PER_PAGE);
  const pageTitle = categoriaActual ? categoryNames[categoriaActual] || 'Categoría' : 'Todos los Productos';
  
  const handleSortChange = (e) => {
    const params = new URLSearchParams(location.search);
    params.set('orden', e.target.value);
    params.set('pagina', '1');
    navigate(`${location.pathname}?${params.toString()}`);
  };

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages && pageNumber !== paginaActual) {
      const params = new URLSearchParams(location.search);
      params.set('pagina', pageNumber);
      navigate(`${location.pathname}?${params.toString()}`);
      document.querySelector('.catalogo-main-content')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    document.title = `Catálogo - ${pageTitle} | Tapicería Ivar`;
  }, [pageTitle]);

  if (loading) {
    return <div className="lazy-fallback">Cargando productos...</div>;
  }

  return (
    <div className="catalogo-page-container">
      <div className="catalogo-layout">
        
        {/* --- COLUMNA IZQUIERDA: BARRA LATERAL DE FILTROS --- */}
        <aside className="catalogo-sidebar">
          <div className="category-filter-block">
            <h3>Categorías</h3>
            <ul className="category-filter-list">
              <li>
                <Link to="/catalogo" className={!categoriaActual ? 'active' : ''}>
                  Todos los Productos
                </Link>
              </li>
              {rankingCategorias.map(catKey => (
                <li key={catKey}>
                  <Link 
                    to={`/catalogo?categoria=${catKey}`} 
                    className={categoriaActual === catKey ? 'active' : ''}
                  >
                    {categoryNames[catKey]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

{/* --- COLUMNA DERECHA: CONTENIDO PRINCIPAL --- */}
        <main className="catalogo-main-content">
          <div className="catalog-page-header">
            {/* El div intermedio <div className="section-container"> ha sido eliminado */}
            <div className="catalog-breadcrumb">
              <Link to="/">Inicio</Link> <span>/ </span> 
              <Link to="/catalogo">Catálogo</Link>
              {categoriaActual && <span>/ {pageTitle}</span>}
            </div>
            <h1 className="catalog-main-title">{pageTitle}</h1>
            {productosOrdenados.length > 0 && (
              <div className="catalog-controls">
                <p className="product-count">
                  Mostrando {currentProductsToDisplay.length} de {productosOrdenados.length} productos
                </p>
                <div className="sort-control">
                  <label htmlFor="sort-select">Ordenar por:</label>
                  <select id="sort-select" value={ordenActual} onChange={handleSortChange} className="sort-select">
                    <option value="default">Relevancia</option>
                    <option value="name-asc">Nombre (A-Z)</option>
                    <option value="name-desc">Nombre (Z-A)</option>
                    <option value="price-asc">Precio (Menor a Mayor)</option>
                    <option value="price-desc">Precio (Mayor a Menor)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {currentProductsToDisplay.length > 0 ? (
            /* La clase 'section-container' ha sido eliminada de aquí */
            <div className="product-grid">
              {currentProductsToDisplay.map(producto => (
                <ProductCard key={producto.id} product={producto} />
              ))}
            </div>
          ) : (
            /* La clase 'section-container' ha sido eliminada de aquí */
            <div className="no-products-message">
              <p>No se encontraron productos en esta categoría.</p>
              <Link to="/catalogo" className="cta-button-secondary-v2">Ver Todos los Productos</Link>
            </div>
          )}

          {totalPages > 1 && (
            /* La clase 'section-container' ha sido eliminada de aquí */
            <div className="pagination-controls">
              {/* --- Lógica de Paginación --- */}
              <button onClick={() => paginate(paginaActual - 1)} disabled={paginaActual === 1} className="pagination-button prev-button">Anterior</button>
              {[...Array(totalPages).keys()].map(number => {
                const pageNumber = number + 1;
                // Lógica para mostrar puntos suspensivos si hay muchas páginas
                const showEllipsis = totalPages > 5 && (pageNumber === paginaActual - 2 || pageNumber === paginaActual + 2);
                const showPage = totalPages <= 5 || (pageNumber === 1 || pageNumber === totalPages || (pageNumber >= paginaActual - 1 && pageNumber <= paginaActual + 1));
                if (showPage) {
                  return (<button key={pageNumber} onClick={() => paginate(pageNumber)} className={`pagination-button page-number ${paginaActual === pageNumber ? 'active' : ''}`}>{pageNumber}</button>);
                } else if (showEllipsis) {
                  return <span key={`ellipsis-${pageNumber}`} className="pagination-ellipsis">...</span>;
                }
                return null;
              })}
              <button onClick={() => paginate(paginaActual + 1)} disabled={paginaActual === totalPages} className="pagination-button next-button">Siguiente</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default CatalogoPage;