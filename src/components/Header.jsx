// src/components/Header.jsx
import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import logoIvar from '../assets/logo.png';
import CartWidget from './CartWidget';

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

  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [menuOpen]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleLinkClick = () => {
    if (menuOpen) {
      setMenuOpen(false);
    }
  };

  return (
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="navbar-content section-container">
          <div className="logo">
            <Link to="/" onClick={handleLinkClick}>
              <img src={logoIvar} alt="Logo Tapicería Ivar" />
            </Link>
          </div>
          <button className="navbar-toggler" onClick={toggleMenu} aria-label="Toggle navigation" aria-expanded={menuOpen}>
            <span className="navbar-toggler-icon bar1"></span>
            <span className="navbar-toggler-icon bar2"></span>
            <span className="navbar-toggler-icon bar3"></span>
          </button>
          <ul className={`nav-links ${menuOpen ? 'active' : ''}`}>
            <li><NavLink to="/" onClick={handleLinkClick} className={({isActive}) => isActive ? "active-link" : ""}>INICIO</NavLink></li>
            <li className="dropdown">
              <NavLink to="/catalogo" onClick={handleLinkClick} className={({isActive}) => isActive ? "active-link" : ""}>CATÁLOGO</NavLink>
              <ul className="dropdown-menu">
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
            <li className="cart-widget-container">
              <CartWidget onLinkClick={handleLinkClick} />
            </li>
          </ul>
        </div>
      </nav>
  );
}
export default Header;