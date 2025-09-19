// Ruta: /api/update-order-status.js  -- CÓDIGO TEMPORAL DE DEPURACIÓN

export default async function handler(req, res) {
  try {
    console.log("--- INICIANDO DEPURACIÓN DE VARIABLES DE ENTORNO ---");
    
    // Imprimimos el objeto process.env completo para ver qué contiene.
    console.log(process.env);
    
    console.log("--- FIN DE LA DEPURACIÓN ---");

    // También devolvemos las variables en la respuesta para verlas en el navegador.
    res.status(200).json({
      message: "Depuración de variables de entorno completada.",
      environment_variables: process.env
    });

  } catch (error) {
    console.error('Error durante la depuración:', error);
    res.status(500).json({ error: 'Error al intentar leer las variables de entorno.' });
  }
}