// src/components/AccordionItem.jsx
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMinus } from '@fortawesome/free-solid-svg-icons'; // Iconos para abrir/cerrar

// Recibe la pregunta (title), la respuesta (content), un índice (opcional para keys),
// si está abierto (isOpen) y una función para alternar (toggleAccordion)
function AccordionItem({ title, content, index, isOpen, toggleAccordion }) {
  return (
    <div className={`accordion-item ${isOpen ? 'active' : ''}`}>
      <button
        className={`accordion-title ${isOpen ? 'active' : ''}`}
        onClick={() => toggleAccordion(index)} // Llama a la función del padre para manejar el estado
        aria-expanded={isOpen} // Para accesibilidad
        aria-controls={`accordion-content-${index}`}
      >
        {title}
        <span className="icon">
          <FontAwesomeIcon icon={isOpen ? faMinus : faPlus} />
        </span>
      </button>
      <div
          id={`accordion-content-${index}`}
          className={`accordion-content ${isOpen ? 'active' : ''}`}
          aria-hidden={!isOpen}
        >
          <div>
              <p>{content}</p>
          </div>
        </div>
      </div>
  );
}

export default AccordionItem;