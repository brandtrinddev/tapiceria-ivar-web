import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import './styles.css';
import { CartProvider } from './context/CartContext.jsx';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
/* Debe ir después del CSS de la librería para ganar la cascada (--toastify-z-index) */
import './toastify-overrides.css';

const toastContainer = (
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
  />
);

/** Montaje al final de body para ganar orden DOM frente a ReactModalPortal */
function getToastMountNode() {
  let mount = document.getElementById('toast-root');
  if (!mount) {
    mount = document.createElement("div");
    mount.id = "toast-root";
    document.body.appendChild(mount);
  } else {
    document.body.appendChild(mount);
  }
  return mount;
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <CartProvider>
      <App />
      {createPortal(toastContainer, getToastMountNode())}
    </CartProvider>
  </BrowserRouter>,
);
