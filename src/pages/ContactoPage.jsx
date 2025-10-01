// src/pages/ContactoPage.jsx
import React, { useState, useEffect } from 'react';
import { useForm, ValidationError } from '@formspree/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faEnvelope, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';

function ContactoPage() {

  const [state, handleSubmit] = useForm("mrbqwelb");
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    // Lógica condicional para el Título
    if (state.succeeded) {
      document.title = 'Mensaje Enviado - Tapicería Ivar';

      if (window.fbq) {
        window.fbq('track', 'Contact');
      }
      
    } else {
      document.title = 'Contacto - Tapicería Ivar';
    }


    // Lógica para la Meta Descripción (se ejecuta en ambos casos)
    const newDescription = 'Contáctanos para consultas, cotizaciones o para visitar nuestro taller. En Tapicería Ivar estamos listos para ayudarte a crear el mueble de tus sueños.';
    
    let metaDescription = document.querySelector('meta[name="description"]');

    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    
    metaDescription.setAttribute('content', newDescription);

  }, [state.succeeded]);

  // Si el formulario se envió con éxito, muestra este mensaje.
  if (state.succeeded) {
      return (
        <div className="contact-page-v2-container standard-page-padding">
          <section className="contact-hero">
            <h1 className="contact-page-title">¡Mensaje Enviado!</h1>
            <p className="contact-page-subtitle" style={{textAlign: 'center', maxWidth: '600px', margin: '20px auto'}}>
              Gracias por tu consulta, {nombre}. Nos pondremos en contacto contigo a la brevedad.
            </p>
          </section>
          <div style={{textAlign: 'center', marginTop: '30px'}}>
            <Link to="/" className="cta-button-secondary-v2">Volver al Inicio</Link>
          </div>
        </div>
      );
  }

  // Vista principal del formulario de contacto
  return (
    <div className="contact-page-v2-container standard-page-padding">
      <section className="contact-hero">
        <h1 className="contact-page-title">Hablemos sobre tu próximo living</h1>
        <p className="contact-page-subtitle">
          Estamos aquí para asesorarte y convertir tus ideas en realidad. ¡Contáctanos!
        </p>
      </section>

      <section className="contact-content-section">
        <div className="contact-main-grid">
          <div className="contact-info-column">
            <div className="contact-info-block">
              <FontAwesomeIcon icon={faPhone} className="contact-info-icon" />
              <div>
                <h3>Teléfono y WhatsApp</h3>
                <p><a href="tel:+59897531335">+598 97 531 335</a> (Lunes a Viernes, 9:00 - 18:00)</p>
              </div>
            </div>

            <div className="contact-info-block">
              <FontAwesomeIcon icon={faEnvelope} className="contact-info-icon" />
              <div>
                <h3>Correo Electrónico</h3>
                <p><a href="mailto:ivartapiceria@gmail.com">ivartapiceria@gmail.com</a></p>
              </div>
            </div>

            <div className="contact-info-block">
              <FontAwesomeIcon icon={faMapMarkerAlt} className="contact-info-icon" />
              <div>
                <h3>Visítanos (con agenda previa)</h3>
                <p>Chapicuy 3868, Montevideo, Uruguay.</p>
              </div>
            </div>
            
            <div className="contact-map-embed">
              <iframe
                title="Ubicacion Tapiceria Ivar"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3274.659972740942!2d-56.128525!3d-34.839886!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x959f8763b0213d29%3A0x6a5f973752e535e6!2sChapicuy%203868%2C%2012300%20Montevideo%2C%20Departamento%20de%20Montevideo!5e0!3m2!1ses-419!2suy!4v1620302300000!5m2!1ses-419!2suy" 
                width="100%"
                height="300"
                style={{ border: 0, borderRadius: '8px' }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>

          <div className="contact-form-column">
            <h2>Envíanos tu consulta directamente</h2>
            <p>Completa el formulario y te responderemos a la brevedad. Los campos marcados con <span className="required-asterisk">*</span> son obligatorios.</p>
            <form onSubmit={handleSubmit} className="contact-form-v2">
              <div className="form-group">
                <label htmlFor="nombre">Nombre y apellido <span className="required-asterisk">*</span></label>
                <input type="text" id="nombre" name="nombre" placeholder="Ejemplo: Pablo Perez" required value={nombre} onChange={e => setNombre(e.target.value)}/>
                <ValidationError prefix="Nombre" field="nombre" errors={state.errors} className="form-validation-error" />
              </div>

              <div className="form-group">
                <label htmlFor="email">Correo Electrónico <span className="required-asterisk">*</span></label>
                <input type="email" id="email" name="email" placeholder="Ejemplo: ivartapiceria@gmail.com" required />
                <ValidationError prefix="Email" field="email" errors={state.errors} className="form-validation-error" />
              </div>

              <div className="form-group">
                <label htmlFor="telefono">Teléfono (Opcional)</label>
                <input type="tel" id="telefono" name="telefono" placeholder="09X XXX XXX" />
                <ValidationError prefix="Teléfono" field="telefono" errors={state.errors} className="form-validation-error" />
              </div>

              <div className="form-group">
                <label htmlFor="asunto">Asunto <span className="required-asterisk">*</span></label>
                <input type="text" id="asunto" name="asunto" placeholder="Ejemplo: Consulta modelo Evan" required />
                <ValidationError prefix="Asunto" field="asunto" errors={state.errors} className="form-validation-error" />
              </div>

              <div className="form-group">
                <label htmlFor="mensaje">Tu mensaje <span className="required-asterisk">*</span></label>
                <textarea id="mensaje" name="mensaje" rows="6" placeholder="Escribe aquí los detalles de tu consulta..." required></textarea>
                <ValidationError prefix="Mensaje" field="mensaje" errors={state.errors} className="form-validation-error" />
              </div>

              <button type="submit" className="contact-submit-button-v2" disabled={state.submitting}>
                {state.submitting ? 'Enviando...' : 'Enviar Mensaje'}
              </button>
              
              {state.errors && state.errors.getFormErrors().length > 0 && (
                <div className="form-validation-error general-form-error">
                  {state.errors.getFormErrors().map(error => (
                    <p key={error.code}>{error.message}</p>
                  ))}
                </div>
              )}
            </form>
          </div>
        </div> {/* <--- Este era el </div> que probablemente causaba el error */}
      </section>
    </div>
  );
}

export default ContactoPage;