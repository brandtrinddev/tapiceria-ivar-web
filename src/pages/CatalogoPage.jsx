// src/pages/CatalogoPage.jsx
import React, { useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import productData from '../data/productos.json';

const PRODUCTS_PER_PAGE = 12;

const categoryNames = {
  butacas: 'Sillones y Butacas',
  sofas: 'Sofás',
  modulares: 'Esquineros y Modulares',
  juegos_living: 'Juegos de Living',
  complementos: 'Complementos',
};

const rankingCategorias = [
  'juegos_living',
  'modulares',
  'sofas',
  'butacas',
  'complementos',
];

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function CatalogoPage() {
  const query = useQuery();
  const location = useLocation();
  const navigate = useNavigate();

  // --- LÓGICA DIRECTA ---
  // 1. Leemos la "única fuente de verdad": la URL
  const categoriaActual = query.get('categoria');
  const paginaActual = parseInt(query.get('pagina'), 10) || 1;
  const ordenActual = query.get('orden') || 'default';

  // 2. Calculamos TODO directamente en cada render.
  
  // Filtrado de productos
  let productosFiltrados = [...productData];
  if (categoriaActual) {
    productosFiltrados = productosFiltrados.filter(product => {
      return Array.isArray(product.categoriaClave)
        ? product.categoriaClave.includes(categoriaActual)
        : product.categoriaClave === categoriaActual;
    });
  }

  // Ordenamiento de productos
  const productosOrdenados = [...productosFiltrados];
  switch (ordenActual) {
    case 'name-asc':
      productosOrdenados.sort((a, b) => a.nombre.localeCompare(b.nombre));
      break;
    case 'name-desc':
      productosOrdenados.sort((a, b) => b.nombre.localeCompare(a.nombre));
      break;
    case 'price-asc':
      productosOrdenados.sort((a, b) => a.precioBase - b.precioBase);
      break;
    case 'price-desc':
      productosOrdenados.sort((a, b) => b.precioBase - a.precioBase);
      break;
    default:
      if (!categoriaActual) {
        productosOrdenados.sort((a, b) => {
          const getRank = (categoriaClave) => {
            const primeraCategoria = Array.isArray(categoriaClave) ? categoriaClave[0] : categoriaClave;
            const index = rankingCategorias.indexOf(primeraCategoria);
            return index === -1 ? Infinity : index; 
          };
          return getRank(a.categoriaClave) - getRank(b.categoriaClave);
        });
      }
      break;
  }

  // Paginación
  const totalPages = Math.ceil(productosOrdenados.length / PRODUCTS_PER_PAGE);
  const indexOfLastProduct = paginaActual * PRODUCTS_PER_PAGE;
  const indexOfFirstProduct = indexOfLastProduct - PRODUCTS_PER_PAGE;
  const currentProductsToDisplay = productosOrdenados.slice(indexOfFirstProduct, indexOfLastProduct);

  // Información para la UI (títulos y breadcrumbs)
  const pageTitle = categoriaActual ? categoryNames[categoriaActual] || 'Categoría' : 'Todos los Productos';
  const categoryDisplayName = categoriaActual ? categoryNames[categoriaActual] || 'Categoría' : 'Todos';

  // 3. Las funciones que cambian la URL ahora son más simples

  const handleSortChange = (e) => {
    const newSortOption = e.target.value;
    const params = new URLSearchParams(location.search);
    params.set('orden', newSortOption);
    params.set('pagina', '1'); // Siempre reseteamos a la página 1 al cambiar el orden
    navigate(`${location.pathname}?${params.toString()}`);
  };

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages && pageNumber !== paginaActual) {
      const params = new URLSearchParams(location.search);
      params.set('pagina', pageNumber);
      navigate(`${location.pathname}?${params.toString()}`);

      // Scroll hacia arriba
      const catalogHeaderElement = document.querySelector('.catalog-page-header');
      if (catalogHeaderElement) {
        catalogHeaderElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // 4. Efecto para el título y meta descripción del documento (el único que necesitamos)
  useEffect(() => {
    // 1. Manejar el Título
    const newTitle = `Catálogo - ${pageTitle} | Tapicería Ivar`;
    document.title = newTitle;
  
    // 2. Manejar la Meta Descripción
    const newDescription = `Explora nuestra colección de ${pageTitle}. Sillones, sofás y juegos de living fabricados artesanalmente en Uruguay.`;
    
    let metaDescription = document.querySelector('meta[name="description"]');
  
    if (!metaDescription) {
      // Si la etiqueta no existe, la crea y la añade al head
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    
    // Actualiza el contenido de la etiqueta existente o recién creada
    metaDescription.setAttribute('content', newDescription);

  }, [pageTitle]); // La dependencia [pageTitle] asegura que se actualice al cambiar de categoría

  return (
    <section className="product-list-container">
      <div className="catalog-page-header">
        <div className="section-container">
          <div className="catalog-breadcrumb">
            <Link to="/">Inicio</Link> <span>/ </span> 
            <Link to="/catalogo">Catálogo</Link>
            {categoriaActual && <span>/ {categoryDisplayName}</span>}
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
      </div>

      {currentProductsToDisplay.length > 0 ? (
        <div className="product-grid section-container">
          {currentProductsToDisplay.map(producto => (
            <ProductCard key={producto.id} product={producto} />
          ))}
        </div>
      ) : (
        <div className="no-products-message section-container">
          <p>
            No se encontraron productos que coincidan con "{categoryDisplayName}".
          </p>
          <Link to="/catalogo" className="cta-button-secondary-v2">Ver Todos los Productos</Link>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination-controls section-container">
          <button
            onClick={() => paginate(paginaActual - 1)}
            disabled={paginaActual === 1}
            className="pagination-button prev-button"
            aria-label="Página anterior"
          >
            Anterior
          </button>
          {[...Array(totalPages).keys()].map(number => {
            const pageNumber = number + 1;
            const showPage = 
              (pageNumber === 1 || pageNumber === totalPages || 
              (pageNumber >= paginaActual - 1 && pageNumber <= paginaActual + 1) ||
              (paginaActual <=3 && pageNumber <=3) ||
              (paginaActual >= totalPages -2 && pageNumber >= totalPages -2 )
              );

            if (showPage) {
              return (
                <button
                  key={pageNumber}
                  onClick={() => paginate(pageNumber)}
                  className={`pagination-button page-number ${paginaActual === pageNumber ? 'active' : ''}`}
                  aria-current={paginaActual === pageNumber ? 'page' : undefined}
                >
                  {pageNumber}
                </button>
              );
            } else if (
                (pageNumber === paginaActual - 2 && paginaActual > 3 && totalPages > 5) || 
                (pageNumber === paginaActual + 2 && paginaActual < totalPages - 2 && totalPages > 5)
              ) {
                return <span key={`ellipsis-${pageNumber}`} className="pagination-ellipsis">...</span>;
              }
            return null;
          })}
          <button
            onClick={() => paginate(paginaActual + 1)}
            disabled={paginaActual === totalPages}
            className="pagination-button next-button"
            aria-label="Página siguiente"
          >
            Siguiente
          </button>
        </div>
      )}
    </section>
  );
}
export default CatalogoPage;