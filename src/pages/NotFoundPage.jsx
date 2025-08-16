import { Link } from 'react-router-dom';
import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

function NotFoundPage() {

    useEffect(() => {
    document.title = 'Página No Encontrada - Tapicería Ivar';
  }, []);

  return (
    <>
      <Helmet>
        <meta name="description" content="La página que buscas no existe en nuestro sitio." />
      </Helmet>

    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>404 - Página no encontrada</h1>
      <p>La página que buscas no existe o la URL es incorrecta.</p>
      <Link to="/" style={{ color: '#0A2F51', textDecoration: 'underline' }}>Volver al Inicio</Link>
    </div>
    </>
  );
}
export default NotFoundPage;