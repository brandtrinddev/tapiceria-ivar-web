import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import './styles.css';
import { CartProvider } from './context/CartContext.jsx'; // <-- AÑADIDO

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <CartProvider> {/* <-- ENVOLVEMOS LA APP */}
        <App />
      </CartProvider>
    </BrowserRouter>
  </StrictMode>
);