import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';

function FloatingButtons() {
  const numeroWhatsApp = '59897531335';
  const linkWhatsApp = `https://wa.me/${numeroWhatsApp}`;

  return (
    <div className="botones-flotantes">
      <a href={linkWhatsApp} className="btn-float whatsapp" target="_blank" rel="noopener noreferrer" aria-label="Contactar por WhatsApp">
        <FontAwesomeIcon icon={faWhatsapp} />
      </a>
      {/* Aquí podrías añadir Instagram o Facebook en el futuro */}
    </div>
  );
}
export default FloatingButtons;