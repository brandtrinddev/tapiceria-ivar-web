import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import './styles.css';
import { CartProvider } from './context/CartContext.jsx';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- AÑADIDO: Inicialización del Píxel de Meta ---
import ReactPixel from 'react-facebook-pixel';

const PIXEL_ID = '1111607510484951'; // Mi ID de Píxel

const options = {
  autoConfig: true,
  debug: false, // Cambia a 'true' durante el desarrollo para ver los eventos en la consola
};

ReactPixel.init(PIXEL_ID, null, options);
// ----------------------------------------------------


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <CartProvider>
        <App />
        
        {/* --- AÑADIDO: Contenedor para mostrar las notificaciones --- */}
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          zIndex={99999}
        />

      </CartProvider>
    </BrowserRouter>
  </StrictMode>
);