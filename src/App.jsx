// src/App.jsx

import React, { lazy, Suspense, useEffect } from 'react'; // Asegúrate de que useEffect esté importado
import { Routes, Route, useLocation } from 'react-router-dom';
import ReactPixel from 'react-facebook-pixel';

// --- INICIO DE LA LÓGICA DEL PÍXEL CORREGIDA ---
const PIXEL_ID = '1111607510484951';
const options = {
  autoConfig: false, // <-- 1. CAMBIAMOS ESTO A 'false' PARA TENER CONTROL MANUAL
  debug: false,
};
ReactPixel.init(PIXEL_ID, null, options);
// --- FIN DE LA LÓGICA DEL PÍXEL CORREGIDA ---


// Importaciones "lazy" de las páginas
const HomePage = lazy(() => import('./pages/HomePage'));
const CatalogoPage = lazy(() => import('./pages/CatalogoPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderSuccessPage = lazy(() => import('./pages/OrderSucessPage.jsx'));
const NosotrosPage = lazy(() => import('./pages/NosotrosPage'));
const TelasPage = lazy(() => import('./pages/TelasPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const ContactoPage = lazy(() => import('./pages/ContactoPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AdminPage = lazy(() => import('./pages/AdminPage/AdminPage'));
const PoliticasPage = lazy(() => import('./pages/PoliticasPage/PoliticasPage'));

// ... (resto de importaciones sin cambios)
import Header from './components/Header.jsx';
import Footer from './components/Footer/Footer.jsx';
import FloatingButtons from './components/FloatingButtons.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import './App.css';

function App() {
  const location = useLocation();

  // --- AÑADIDO: VIGILANTE DE NAVEGACIÓN PARA EL PÍXEL ---
  useEffect(() => {
    // Esta línea se ejecutará en la carga inicial Y CADA VEZ que la URL cambie.
    ReactPixel.pageView();
  }, [location]); // La dependencia [location] es la clave.
  // --------------------------------------------------------

  return (
    <div className="app-container"> 
      <ScrollToTop />
      <Header />
      <main key={location.pathname} className="page-content-container">
        <Suspense fallback={<div className="lazy-fallback">Cargando página...</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/catalogo" element={<CatalogoPage />} />
            <Route path="/producto/:productId" element={<ProductDetailPage />} />
            <Route path="/carrito" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orden-confirmada/:orderId" element={<OrderSuccessPage />} />
            <Route path="/nosotros" element={<NosotrosPage />} />
            <Route path="/telas" element={<TelasPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/contacto" element={<ContactoPage />} />
            <Route path="/gestion-pedidos-ivar" element={<AdminPage />} /> {/* <-- AÑADIDO: La nueva ruta secreta */}
            <Route path="/politicas-devolucion-garantia" element={<PoliticasPage />} />
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