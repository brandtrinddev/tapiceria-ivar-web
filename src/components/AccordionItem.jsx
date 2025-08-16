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
        style={{ maxHeight: isOpen ? '500px' : '0' }} // O un valor suficientemente grande para tu contenido
        // El max-height se puede controlar mejor con CSS si conoces la altura, o usando JS para medir.
        // Aquí '500px' es un placeholder para la altura máxima cuando está abierto.
        aria-hidden={!isOpen}
      >
        <p>{content}</p>
      </div>
    </div>
  );
}

export default AccordionItem;