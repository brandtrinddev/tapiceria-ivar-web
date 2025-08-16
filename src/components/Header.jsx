// src/components/Header.jsx
import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import logoIvar from '../assets/logo.png';

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
        if (window.scrollY > 10) {
            setIsScrolled(true);
        } else {
            setIsScrolled(false);
        }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
        window.removeEventListener('scroll', handleScroll);
     };
  }, []);

  // Este efecto se ejecuta cada vez que el estado 'menuOpen' cambia.
  useEffect(() => {
    // Si el menú está abierto, se añade la clase 'no-scroll' al body.
    if (menuOpen) {
      document.body.classList.add('no-scroll');
    } else {
      // Si el menú está cerrado, me aseguro de quitar la clase.
      document.body.classList.remove('no-scroll');
    }

    // Función de limpieza para asegurarme de que la clase se quite si el componente se desmonta.
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [menuOpen]); // El efecto depende del estado 'menuOpen'

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // Cierra el menú si un link es clickeado (para comportamiento SPA en móvil)
  const handleLinkClick = () => {
    if (menuOpen) {
      setMenuOpen(false);
    }
  };

  return (
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="navbar-content section-container"> {/* Usamos section-container para el ancho */}
          <div className="logo">
            <Link to="/" onClick={handleLinkClick}>
              <img src={logoIvar} alt="Logo Tapicería Ivar" />
            </Link>
          </div>

          {/* Botón Hamburguesa para celular */}
          <button className="navbar-toggler" onClick={toggleMenu} aria-label="Toggle navigation" aria-expanded={menuOpen}>
            {/* Puedes usar un icono de FontAwesome aquí o spans para las barras */}
            <span className="navbar-toggler-icon bar1"></span>
            <span className="navbar-toggler-icon bar2"></span>
            <span className="navbar-toggler-icon bar3"></span>
          </button>

          <ul className={`nav-links ${menuOpen ? 'active' : ''}`}>
            <li><NavLink to="/" onClick={handleLinkClick} className={({isActive}) => isActive ? "active-link" : ""}>INICIO</NavLink></li>
            <li className="dropdown">
              {/* Usamos NavLink para que el link principal "CATÁLOGO" también pueda tener un estado activo si es la ruta base */}
              <NavLink to="/catalogo" onClick={handleLinkClick} className={({isActive}) => isActive ? "active-link" : ""}>CATÁLOGO</NavLink>
              <ul className="dropdown-menu">
                {/* Estos links internos del dropdown no necesitan NavLink si no son rutas separadas que deban marcarse como activas */}
                <li><Link to="/catalogo?categoria=butacas" onClick={handleLinkClick}>SILLONES</Link></li>
                <li><Link to="/catalogo?categoria=sofas" onClick={handleLinkClick}>SOFÁS</Link></li>
                <li><Link to="/catalogo?categoria=modulares" onClick={handleLinkClick}>ESQUINEROS Y MODULARES</Link></li>
                <li><Link to="/catalogo?categoria=juegos_living" onClick={handleLinkClick}>JUEGOS DE LIVING</Link></li>
                <li><Link to="/catalogo?categoria=complementos" onClick={handleLinkClick}>COMPLEMENTOS</Link></li>
              </ul>
            </li>
            <li><NavLink to="/telas" onClick={handleLinkClick} className={({isActive}) => isActive ? "active-link" : ""}>TELAS</NavLink></li>
            <li><NavLink to="/nosotros" onClick={handleLinkClick} className={({isActive}) => isActive ? "active-link" : ""}>NOSOTROS</NavLink></li>
            <li><NavLink to="/faq" onClick={handleLinkClick} className={({isActive}) => isActive ? "active-link" : ""}>PREGUNTAS FRECUENTES</NavLink></li>
            <li><NavLink to="/contacto" onClick={handleLinkClick} className={({isActive}) => isActive ? "active-link" : ""}>CONTACTO</NavLink></li>
          </ul>
        </div>
      </nav>
  );
}

export default Header;