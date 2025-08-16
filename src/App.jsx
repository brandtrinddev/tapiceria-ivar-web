// --- EL CÓDIGO App.jsx DEFINITIVO Y CORREGIDO ---

// 1. MANTENEMOS la importación de 'lazy', 'Suspense' Y 'useLocation'
import React, { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

// Las importaciones "lazy" de las páginas se mantienen igual
const HomePage = lazy(() => import('./pages/HomePage'));
const CatalogoPage = lazy(() => import('./pages/CatalogoPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const NosotrosPage = lazy(() => import('./pages/NosotrosPage'));
const TelasPage = lazy(() => import('./pages/TelasPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const ContactoPage = lazy(() => import('./pages/ContactoPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Las importaciones de componentes fijos se mantienen igual
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import FloatingButtons from './components/FloatingButtons.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import './App.css';


function App() {
  // 2. VOLVEMOS a obtener la ubicación para usarla en la 'key'
  const location = useLocation();

  return (
    // Tu div contenedor original. Puedes mantenerlo si tienes estilos aplicados.
    <div className="app-container"> 
      <ScrollToTop />
      <Header />
      {/* 3. RE-AGREGAMOS la 'key' al <main> para las animaciones */}
      <main key={location.pathname} className="page-content-container">
        <Suspense fallback={<div className="lazy-fallback">Cargando página...</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/catalogo" element={<CatalogoPage />} />
            {/* OJO: Corregí tu ruta de producto para que coincida con la del código anterior */}
            <Route path="/producto/:productId" element={<ProductDetailPage />} />
            <Route path="/nosotros" element={<NosotrosPage />} />
            <Route path="/telas" element={<TelasPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/contacto" element={<ContactoPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      <FloatingButtons />
      <Footer />
    </div>
  );
}

export default App;