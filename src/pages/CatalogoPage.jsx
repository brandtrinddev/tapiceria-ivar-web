// src/pages/CatalogoPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ProductCard from '../components/ProductCard.jsx';
import productData from '../data/productos.json';

const PRODUCTS_PER_PAGE = 12;

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function CatalogoPage() {
  const query = useQuery();
  const location = useLocation();
  const navigate = useNavigate();

  console.log("--- COMPONENTE CatalogoPage RENDERIZANDO (INICIO) ---");

  const [allProducts] = useState(productData);
  const [currentPage, setCurrentPage] = useState(() => {
    const pageFromUrl = parseInt(query.get('pagina'), 10);
    return pageFromUrl > 0 ? pageFromUrl : 1;
  });
  const [sortOption, setSortOption] = useState('default');
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [pageTitle, setPageTitle] = useState('Todos los Productos'); // Título base
  const [categoryDisplayName, setCategoryDisplayName] = useState('Todos'); // Nombre para breadcrumb

    useEffect(() => {
    // Comillas invertidas (`) para poder insertar la variable ${pageTitle}
    document.title = `Catálogo - ${pageTitle} | Tapicería Ivar`;
  }, [pageTitle]);

  console.log("[ESTADO INICIAL] currentPage:", currentPage, "categoryFilter:", categoryFilter, "sortOption:", sortOption);

useEffect(() => {
    const categoryKey = query.get('categoria');
    const pageFromUrl = parseInt(query.get('pagina'), 10) || 1;
    
    let title = 'Todos los Productos';
    let displayCategoryName = 'Todos';

    if (categoryKey) {
      const categoryNames = {
        butacas: 'Sillones y Butacas',
        sofas: 'Sofás',
        modulares: 'Esquineros y Modulares',
        juegos_living: 'Juegos de Living',
        complementos: 'Complementos',
      };
      displayCategoryName = categoryNames[categoryKey] || 'Categoría';
      title = displayCategoryName;
    }
    
    // Si la categoría que leemos de la URL es diferente a la que tenemos en el estado,
    // actualizamos el filtro y FORZAMOS la página a 1.
    if (categoryKey !== categoryFilter) {
      setCategoryFilter(categoryKey);
      setCurrentPage(1); 
    } else {
      // Si la categoría no cambió, solo sincronizamos el número de página desde la URL.
      setCurrentPage(pageFromUrl);
    }
    
    setPageTitle(title);
    setCategoryDisplayName(displayCategoryName);

  }, [location.search]); // La dependencia clave ahora es location.search

  const filteredAndSortedProducts = useMemo(() => {
    // Usamos un nuevo nombre de variable para mayor claridad
    let productsToDisplay = [...allProducts];

    // --- PASO 1: FILTRAR PRIMERO (Esta parte es la misma, pero dentro de la nueva lógica) ---
    if (categoryFilter) {
      productsToDisplay = productsToDisplay.filter(product => {
        return Array.isArray(product.categoriaClave)
          ? product.categoriaClave.includes(categoryFilter)
          : product.categoriaClave === categoryFilter;
      });
    }

    // --- PASO 2: ORDENAR DESPUÉS ---
    // Hacemos una copia para no modificar la lista filtrada directamente
    const sortedProducts = [...productsToDisplay]; 

    switch (sortOption) {
      // Los casos para ordenar por nombre y precio no cambian
      case 'name-asc':
        sortedProducts.sort((a, b) => a.nombre.localeCompare(b.nombre));
        break;
      case 'name-desc':
        sortedProducts.sort((a, b) => b.nombre.localeCompare(a.nombre));
        break;
      case 'price-asc':
        sortedProducts.sort((a, b) => a.precioBase - b.precioBase);
        break;
      case 'price-desc':
        sortedProducts.sort((a, b) => b.precioBase - a.precioBase);
        break;
      default:
        // --- AQUÍ ESTÁ LA LÓGICA CORREGIDA ---
        // El orden por defecto (relevancia) solo se aplica si NO estamos dentro de una categoría.
        if (!categoryFilter) {
          const rankingCategorias = [
            'juegos_living',
            'modulares',
            'sofas',
            'butacas',
            'complementos',
          ];

          // Esta nueva lógica de sort es segura y sabe cómo manejar productos con múltiples categorías.
          sortedProducts.sort((a, b) => {
            const getRank = (categoriaClave) => {
              // Si un producto tiene varias categorías, toma la primera como principal para el ranking
              const primeraCategoria = Array.isArray(categoriaClave) ? categoriaClave[0] : categoriaClave;
              const index = rankingCategorias.indexOf(primeraCategoria);
              // Si por alguna razón la categoría no está en el ranking, la manda al final
              return index === -1 ? Infinity : index; 
            };
            return getRank(a.categoriaClave) - getRank(b.categoriaClave);
          });
        }
        // Si estamos DENTRO de una categoría, no se aplica un orden especial.
        // Los productos se mostrarán en el orden en que están en tu archivo JSON.
        break;
    }
    
    return sortedProducts;
  }, [allProducts, categoryFilter, sortOption]);

  const indexOfLastProduct = currentPage * PRODUCTS_PER_PAGE;
  const indexOfFirstProduct = indexOfLastProduct - PRODUCTS_PER_PAGE;
  const currentProductsToDisplay = filteredAndSortedProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  console.log("Paginación - indexOfFirst:", indexOfFirstProduct, "indexOfLast:", indexOfLastProduct);
  console.log("Paginación - currentProductsToDisplay:", currentProductsToDisplay.map(p=>p.nombre));


  const totalPages = Math.ceil(filteredAndSortedProducts.length / PRODUCTS_PER_PAGE);
  console.log("Paginación - totalPages:", totalPages);

  const paginate = (pageNumber) => {
    console.log("--- PAGINATE LLAMADO ---");
    console.log("Intentando ir a pageNumber:", pageNumber);
    console.log("currentPage ANTES de set:", currentPage);
    console.log("totalPages en paginate:", totalPages);

    if (pageNumber >= 1 && pageNumber <= totalPages && pageNumber !== currentPage) {
      console.log("PAGINATE: Estableciendo currentPage a:", pageNumber);
      const currentParams = new URLSearchParams(location.search);
      currentParams.set('pagina', pageNumber);
      navigate(`${location.pathname}?${currentParams.toString()}`);

      const catalogHeaderElement = document.querySelector('.catalog-page-header');
      if (catalogHeaderElement) {
        catalogHeaderElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      console.log("PAGINATE: Condiciones no cumplidas o misma página. No se cambia de página.");
    }
  };

  const handleSortChange = (e) => {
    const newSortOption = e.target.value;
    setSortOption(newSortOption);
    
    // Lógica nueva para resetear la página a 1 en la URL
    const currentParams = new URLSearchParams(location.search);
    currentParams.set('pagina', '1'); 
    navigate(`${location.pathname}?${currentParams.toString()}`);
  };

  console.log("--- RENDERIZANDO JSX ---");
  return (
    <>
      <Helmet>
        <meta name="description" content={`Explora nuestra colección de ${pageTitle}. Sillones, sofás y juegos de living fabricados artesanalmente en Uruguay.`} />
      </Helmet>

    <section className="product-list-container">
      <div className="catalog-page-header">
        <div className="section-container"> {/* <<< ESTE ES EL CONTENEDOR AÑADIDO */}
          <div className="catalog-breadcrumb">
            <Link to="/">Inicio</Link> <span>/ </span> 
            <Link to="/catalogo">Catálogo</Link>
            {categoryFilter && <span>/ {categoryDisplayName}</span>}
          </div>
          <h1 className="catalog-main-title">{pageTitle}</h1>
          {filteredAndSortedProducts.length > 0 && (
            <div className="catalog-controls">
              <p className="product-count">
                Mostrando {currentProductsToDisplay.length} de {filteredAndSortedProducts.length} productos
              </p>
              <div className="sort-control">
                <label htmlFor="sort-select">Ordenar por:</label>
                <select id="sort-select" value={sortOption} onChange={handleSortChange} className="sort-select">
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
        <div className="product-grid section-container"> {/* También añadimos section-container aquí para la grilla */}
          {currentProductsToDisplay.map(producto => (
            <ProductCard key={producto.id} product={producto} />
          ))}
        </div>
      ) : (
        <div className="no-products-message section-container"> {/* Y aquí para el mensaje */}
          <p>
            No se encontraron productos que coincidan con "{categoryDisplayName}".
          </p>
          <Link to="/catalogo" className="cta-button-secondary-v2">Ver Todos los Productos</Link>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination-controls section-container"> {/* Y aquí para la paginación */}
          <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-button prev-button"
            aria-label="Página anterior"
          >
            Anterior
          </button>
          {[...Array(totalPages).keys()].map(number => {
            const pageNumber = number + 1;
            const showPage = 
              (pageNumber === 1 || pageNumber === totalPages || 
              (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1) ||
              (currentPage <=3 && pageNumber <=3) ||
              (currentPage >= totalPages -2 && pageNumber >= totalPages -2 )
              );

            if (showPage) {
              return (
                <button
                  key={pageNumber}
                  onClick={() => paginate(pageNumber)}
                  className={`pagination-button page-number ${currentPage === pageNumber ? 'active' : ''}`}
                  aria-current={currentPage === pageNumber ? 'page' : undefined}
                >
                  {pageNumber}
                </button>
              );
            } else if (
                (pageNumber === currentPage - 2 && currentPage > 3 && totalPages > 5) || 
                (pageNumber === currentPage + 2 && currentPage < totalPages - 2 && totalPages > 5)
            ) {
                return <span key={`ellipsis-${pageNumber}`} className="pagination-ellipsis">...</span>;
            }
            return null;
          })}
          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-button next-button"
            aria-label="Página siguiente"
          >
            Siguiente
          </button>
        </div>
      )}
    </section>
    </>
  );
}
export default CatalogoPage;