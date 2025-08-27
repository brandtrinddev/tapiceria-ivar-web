// src/components/Footer.jsx

import React from 'react';
import { Link } from 'react-router-dom'; // <-- 1. Importamos el componente Link
import './Footer.css';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-content">
        <p>
          <span>&copy; {currentYear} Tapicería Ivar. Todos los derechos reservados.</span>
          <span className="footer-separator">|</span>
          {/* --- 2. AÑADIMOS EL NUEVO ENLACE --- */}
          <Link to="/politicas-devolucion-garantia" className="footer-link">
            Garantía y Devoluciones
          </Link>
        </p>
      </div>
    </footer>
  );
}

export default Footer;