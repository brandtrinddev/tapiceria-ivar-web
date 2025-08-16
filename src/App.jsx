// src/App.jsx
import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import FloatingButtons from './components/FloatingButtons.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';

import HomePage from './pages/HomePage.jsx';
import CatalogoPage from './pages/CatalogoPage.jsx';
import TelasPage from './pages/TelasPage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';
import ContactoPage from './pages/ContactoPage.jsx';
import FAQPage from './pages/FAQPage.jsx';
import NosotrosPage from './pages/NosotrosPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';


function App() {
  const location = useLocation();

  return (
    <div className="app-container">
      <Header />
      <ScrollToTop />
      <main className="page-content-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/catalogo" element={<CatalogoPage />} />
          <Route path="/producto/:productId" element={<ProductDetailPage />} />
          <Route path="/telas" element={<TelasPage />} />
          <Route path="/contacto" element={<ContactoPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/nosotros" element={<NosotrosPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      <FloatingButtons />
    </div>
  );
}

export default App;