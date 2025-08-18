// src/pages/NotFoundPage.jsx
import { Link } from 'react-router-dom';
import React, { useEffect } from 'react';

function NotFoundPage() {

  useEffect(() => {
    // 1. Manejar el Título
    const newTitle = 'Página No Encontrada - Tapicería Ivar';
    document.title = newTitle;
  
    // 2. Manejar la Meta Descripción
    const newDescription = 'La página que buscas no existe en nuestro sitio.';
    
    let metaDescription = document.querySelector('meta[name="description"]');
  
    if (!metaDescription) {
      // Si la etiqueta no existe, la crea y la añade al head
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    
    // Actualiza el contenido de la etiqueta existente o recién creada
    metaDescription.setAttribute('content', newDescription);
  
  }, []); // El array de dependencias vacío es correcto, solo se ejecuta una vez.

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>404 - Página no encontrada</h1>
      <p>La página que buscas no existe o la URL es incorrecta.</p>
      <Link to="/" style={{ color: '#0A2F51', textDecoration: 'underline' }}>Volver al Inicio</Link>
    </div>
  );
}

export default NotFoundPage;