// src/pages/PoliticasPage/PoliticasPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './PoliticasPage.css'; // <-- 1. IMPORTAMOS LOS NUEVOS ESTILOS

const PoliticasPage = () => {
  return (
    <div className="section-container standard-page-padding">
      <h1 className="section-title">Políticas de garantía y devoluciones</h1>

      {/* 2. QUITAMOS EL STYLE EN LÍNEA, AHORA SE CONTROLA DESDE EL CSS */}
      <div className="policy-content">

        <h2>Garantía de calidad</h2>
        <p>
          En Tapicería Ivar, confiamos plenamente en la calidad de nuestro trabajo y los materiales que utilizamos. 
          Por eso, todos nuestros sofás y sillones nuevos cuentan con una <strong>garantía estructural de 1 (un) año</strong> a partir de la fecha de entrega.
        </p>
        <p>
          Esta garantía cubre exclusivamente defectos de fabricación en la estructura interna del mueble. 
          No cubre daños causados por mal uso, accidentes, negligencia, exposición a condiciones inadecuadas (humedad, sol directo), ni el desgaste natural de las telas y rellenos por el uso cotidiano.
        </p>

        <h2>Devoluciones y cambios</h2>
        <p>
          Al ser productos personalizados y fabricados bajo pedido específico para cada cliente, no se aceptan devoluciones o cambios por arrepentimiento, errores en la elección del color, tela o medidas por parte del cliente.
        </p>
        <p>
          Nuestra prioridad es tu satisfacción. Por ello, <strong>solo se aceptan devoluciones por fallas de fabricación</strong> que sean reportadas dentro de las <strong>48 horas</strong> siguientes a la recepción del producto.
        </p>

        <h2>Proceso de reclamo</h2>
        <p>
          Si tu producto presenta un defecto cubierto por nuestra garantía o una falla de fabricación dentro del plazo estipulado, por favor, sigue los siguientes pasos:
        </p>
        <ol>
          <li>Envía un correo electrónico a <strong>ivartapiceria@gmail.com</strong>.</li>
          <li>En el asunto del correo, indica "Reclamo de Garantía - Pedido #[Tu Número de Pedido]".</li>
          <li>En el cuerpo del correo, describe detalladamente el problema y adjunta fotografías claras del defecto.</li>
          <li>Nuestro equipo evaluará el caso y se pondrá en contacto contigo a la brevedad para coordinar los siguientes pasos, que podrán incluir la reparación del producto o su reemplazo, según corresponda.</li>
        </ol>
        <p>
          Para cualquier otra consulta, no dudes en <Link to="/contacto">contactarnos</Link>.
        </p>
      </div>
    </div>
  );
};

export default PoliticasPage;