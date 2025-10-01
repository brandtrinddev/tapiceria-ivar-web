import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';

function FloatingButtons() {
  const numeroWhatsApp = '59897531335';
  const linkWhatsApp = `https://wa.me/${numeroWhatsApp}`;

  const handleWhatsAppClick = () => {
    if (window.fbq) {
      window.fbq('track', 'Contact');
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'generate_lead',
      contact_method: 'whatsapp'
    });
  };

  return (
    <div className="botones-flotantes">
      <a href={linkWhatsApp} className="btn-float whatsapp" target="_blank" rel="noopener noreferrer" aria-label="Contactar por WhatsApp" onClick={handleWhatsAppClick}>
        <FontAwesomeIcon icon={faWhatsapp} />
      </a>
      {/* Aquí podrías añadir Instagram o Facebook en el futuro */}
    </div>
  );
}
export default FloatingButtons;