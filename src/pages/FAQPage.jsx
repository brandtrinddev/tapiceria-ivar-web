// src/pages/FAQPage.jsx
import AccordionItem from '../components/AccordionItem.jsx';
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';

const faqData = [
  {
    id: 'faq1',
    pregunta: "¿Hacen envíos a todo el país?",
    respuesta: "Sí, realizamos envíos a todo Uruguay. Coordinamos el flete y te avisamos el costo según la localidad."
  },
  {
    id: 'faq2',
    pregunta: "¿Puedo elegir la tela y el color del sillón?",
    respuesta: "¡Por supuesto! Todos nuestros modelos son personalizables. Te mostramos las opciones disponibles al hacer tu pedido."
  },
  {
    id: 'faq3',
    pregunta: "¿Cuánto demora la entrega?",
    respuesta: "Dependiendo del modelo y la demanda, el tiempo estimado es entre 7 a 15 días hábiles."
  },
  {
    id: 'faq4',
    pregunta: "¿Los sillones tienen garantía?",
    respuesta: "Sí. Todos nuestros productos tienen garantía de fábrica de 6 meses por defectos estructurales o fallas de tapicería."
  },
  {
    id: 'faq5',
    pregunta: "¿Puedo encargar un sillón a medida?",
    respuesta: "Claro que sí. Hacemos sillones personalizados según medidas especiales, ideal para espacios reducidos o necesidades específicas."
  }
];

function FAQPage() {

  useEffect (() => {
    document.title = 'Preguntas Frecuentes - Tapicería Ivar';
  }, []);
  // Estado para controlar qué ítem del acordeón está abierto.
  // null significa que ninguno está abierto. Un número (índice) significa que ese está abierto.
  // Si quiero permitir múltiples abiertos, este estado debería ser un array de índices.
  const [openIndex, setOpenIndex] = useState(null);

  // Función para manejar el clic en un título del acordeón
  const toggleAccordion = (index) => {
    // Si se hace clic en el que ya está abierto, se cierra. Si no, se abre el nuevo.
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    // Aplicamos la clase para el padding superior
    <section className="faq-section standard-page-padding"> 
      <Helmet>
        <meta name="description" content="Encuentra respuestas a las preguntas más comunes sobre nuestros sofás: envíos a todo Uruguay, personalización de telas, tiempos de entrega, garantía y más." />
      </Helmet>

      <h1 className="section-title">Preguntas Frecuentes</h1>
      <div className="faq-container">
        {faqData.map((faqItem, index) => (
          <AccordionItem
            key={faqItem.id}
            index={index} // Pasamos el índice
            title={faqItem.pregunta}
            content={faqItem.respuesta}
            isOpen={openIndex === index} // El ítem está abierto si su índice coincide con openIndex
            toggleAccordion={toggleAccordion} // Pasamos la función para alternar
          />
        ))}
      </div>
    </section>
  );
}

export default FAQPage;