import React from 'react';

function Footer() {
  const currentYear = new Date().getFullYear(); // Para que el año se actualice solo

  return (
    <footer className="site-footer">
      <p>&copy; {currentYear} Tapicería Ivar. Todos los derechos reservados.</p>
      {/* Aquí podrías añadir más cosas en el futuro si quisieras, como links a redes sociales, etc. */}
    </footer>
  );
}

export default Footer;