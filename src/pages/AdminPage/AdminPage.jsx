// src/pages/AdminPage/AdminPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import { supabase } from '../../supabaseClient';
import { formatPriceUYU } from '../../utils/formatters';
import './AdminPage.css';

Modal.setAppElement('#root');

const ADMIN_SECRET_CODE = import.meta.env.VITE_ADMIN_SECRET_CODE;
const ORDER_STATUSES = [ 'Pendiente de transferencia', 'Pendiente de pago', 'Pago realizado', 'En fabricación', 'Pedido finalizado', 'Enviado', 'Completado', 'Cancelado' ];

// --- FUNCIONES DE APOYO ---
const generateSlug = (text) => {
  return text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quita tildes
    .replace(/[^\w ]+/g, '') // Quita caracteres especiales
    .replace(/ +/g, '-'); // Cambia espacios por guiones
};

const generateSKU = (name, category) => {
  const prefix = category ? category.substring(0, 3).toUpperCase() : 'PROD';
  const namePart = name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 3);
  const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${namePart}-${randomPart}`;
};

const optimizeImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200; // Tamaño ideal para web
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convertimos a WebP con calidad 0.8 (80%)
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
            type: 'image/webp'
          }));
        }, 'image/webp', 0.8);
      };
    };
  });
};

const uploadAdminImage = async (file, folder) => {

  // --- PASO DE OPTIMIZACIÓN AUTOMÁTICA ---
  const optimizedFile = await optimizeImage(file);

  const fileExt = optimizedFile.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  const { error } = await supabase.storage
    .from('imagenes-productos')
    .upload(filePath, optimizedFile);

  if (error) throw error;

  const { data } = supabase.storage.from('imagenes-productos').getPublicUrl(filePath);
  return data.publicUrl;
};

const AdminPage = () => {
  const ITEMS_PER_PAGE = 10;
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true); // Inicia en true para mostrar carga inicial
  const [selectedOrder, setSelectedOrder] = useState(null);

  // --- NUEVOS ESTADOS PARA GESTIÓN ---
  const [activeTab, setActiveTab] = useState('orders'); // Controla la pestaña activa: 'orders', 'products', 'fabrics'
  const [products, setProducts] = useState([]);
  const [fabrics, setFabrics] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Control de Modales y Edición
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isFabricModalOpen, setIsFabricModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingFabric, setEditingFabric] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pedidos')
      .select('*, cuentas_bancarias (nombre_banco, moneda), pedido_items ( cantidad, productos (nombre), telas (nombre_tipo, nombre_color) )')
      .order('created_at', { ascending: false });
    if (!error) setOrders(data);
    setLoading(false);
  }, []);

const fetchProducts = useCallback(async () => {
    setLoadingItems(true);
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('productos')
      .select('*', { count: 'exact' });

    if (searchTerm) {
      // Busca en nombre O en SKU
      query = query.or(`nombre.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
    }

    const { data, error, count } = await query
      .order('nombre', { ascending: true })
      .range(from, to);

    if (!error) {
      setProducts(data);
      setTotalItems(count || 0);
    }
    setLoadingItems(false);
  }, [currentPage, searchTerm, ITEMS_PER_PAGE]);

  const fetchFabrics = useCallback(async () => {
    setLoadingItems(true);
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('telas')
      .select('*', { count: 'exact' });

    if (searchTerm) {
      query = query.or(`nombre_tipo.ilike.%${searchTerm}%,nombre_color.ilike.%${searchTerm}%`);
    }

    const { data, error, count } = await query
      .order('nombre_tipo', { ascending: true })
      .range(from, to);

    if (!error) {
      setFabrics(data);
      setTotalItems(count || 0);
    }
    setLoadingItems(false);
  }, [currentPage, searchTerm, ITEMS_PER_PAGE]);

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'orders') fetchOrders();
      if (activeTab === 'products') fetchProducts();
      if (activeTab === 'fabrics') fetchFabrics();
    }
  }, [isAuthenticated, activeTab, fetchOrders, fetchProducts, fetchFabrics]);

  useEffect(() => {
    setSearchTerm('');
    setCurrentPage(1);
  }, [activeTab]);

  // Manejador genérico para cambios en inputs de productos
  const handleProductInputChange = (field, value) => {
    setEditingProduct(prev => ({ ...prev, [field]: value }));
  };

  // Manejador específico para el JSONB de 'detalles'
  const handleProductDetailChange = (subField, value, parent = 'medidas') => {
    setEditingProduct(prev => {
      const newDetails = { ...prev.detalles };
      if (parent === 'medidas') {
        newDetails.medidas.sofa[subField] = value;
      } else if (parent === 'descripcion_larga') {
        newDetails.descripcion_larga[subField] = value;
      }
      return { ...prev, detalles: newDetails };
    });
  };

  // Agregar imagen a la galería
  const handleAddGalleryImage = (url) => {
    setEditingProduct(prev => {
      const newDetails = { ...prev.detalles };
      newDetails.galeria = [...(newDetails.galeria || []), url];
      return { ...prev, detalles: newDetails };
    });
  };

  // Eliminar imagen de la galería
  const handleRemoveGalleryImage = (index) => {
    setEditingProduct(prev => {
      const newDetails = { ...prev.detalles };
      newDetails.galeria = newDetails.galeria.filter((_, i) => i !== index);
      return { ...prev, detalles: newDetails };
    });
  };

  // Mover imagen en la galería (izquierda/derecha)
  const handleMoveGalleryImage = (index, direction) => {
    setEditingProduct(prev => {
      const newGaleria = [...(prev.detalles.galeria || [])];
      const newIndex = direction === 'left' ? index - 1 : index + 1;
      
      if (newIndex < 0 || newIndex >= newGaleria.length) return prev;

      // Intercambio de posiciones (Swap)
      [newGaleria[index], newGaleria[newIndex]] = [newGaleria[newIndex], newGaleria[index]];
      
      return {
        ...prev,
        detalles: { ...prev.detalles, galeria: newGaleria }
      };
    });
  };

const handleSaveProduct = async () => {
    try {
      setLoadingItems(true);
      let updatedProduct = { ...editingProduct };

      // 1. Si la imagen principal es un objeto File (nueva), subirla ahora
      if (updatedProduct.imagen_url instanceof File) {
        toast.info("Subiendo imagen principal...");
        const url = await uploadAdminImage(updatedProduct.imagen_url, 'productos');
        updatedProduct.imagen_url = url;
      }

      // 2. Si hay imágenes nuevas en la galería (objetos File), subirlas todas
      if (updatedProduct.detalles.galeria && updatedProduct.detalles.galeria.some(img => img instanceof File)) {
        toast.info("Subiendo galería...");
        const updatedGaleria = await Promise.all(
          updatedProduct.detalles.galeria.map(async (img) => {
            if (img instanceof File) {
              return await uploadAdminImage(img, 'productos');
            }
            return img; // Mantener la URL si ya era un string
          })
        );
        updatedProduct.detalles.galeria = updatedGaleria;
      }

      const isNew = !updatedProduct.id;
      const payload = {
        ...updatedProduct,
        slug: updatedProduct.slug || generateSlug(updatedProduct.nombre),
        sku: updatedProduct.sku || generateSKU(updatedProduct.nombre, updatedProduct.category)
      };

      const { error } = await supabase.from('productos').upsert(payload);
      if (error) throw error;

      toast.success(isNew ? "Producto creado con éxito" : "Producto actualizado");
      setIsProductModalOpen(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar el producto");
    } finally {
      setLoadingItems(false);
    }
  };

  // --- LÓGICA PARA TELAS ---
  const handleFabricInputChange = (field, value) => {
    setEditingFabric(prev => ({ ...prev, [field]: value }));
  };

const handleSaveFabric = async () => {
    try {
      setLoadingItems(true);
      let updatedFabric = { ...editingFabric };

      // Si la imagen es un archivo nuevo, subirla primero
      if (updatedFabric.imagen_url instanceof File) {
        toast.info("Subiendo muestra de tela...");
        const url = await uploadAdminImage(updatedFabric.imagen_url, 'telas');
        updatedFabric.imagen_url = url;
      }

      const { error } = await supabase
        .from('telas')
        .upsert(updatedFabric);

      if (error) throw error;

      toast.success(editingFabric.id ? "Tela actualizada" : "Tela creada con éxito");
      setIsFabricModalOpen(false);
      fetchFabrics();
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar la tela");
    } finally {
      setLoadingItems(false);
    }
  };

  const handleDeleteItem = async (id, table) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer.")) {
      try {
        setLoadingItems(true);
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        
        toast.success("Eliminado correctamente");
        table === 'productos' ? fetchProducts() : fetchFabrics();
      } catch {
        toast.error("Error al eliminar");
      } finally {
        setLoadingItems(false);
      }
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (inputCode === ADMIN_SECRET_CODE) {
      toast.success("Acceso concedido");
      setIsAuthenticated(true);
    } else {
      toast.error("Código de acceso incorrecto");
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    // Actualización visual inmediata (Optimistic Update)
    setOrders(currentOrders => 
      currentOrders.map(order => 
        order.id === orderId ? { ...order, estado: newStatus } : order 
      )
    );

    try {
      const response = await fetch('/api/update-order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, newStatus }),
      });

      if (!response.ok) {
        // Si la respuesta del servidor no es exitosa, lanzamos un error
        const errorResult = await response.json();
        throw new Error(errorResult.error || 'Falló la comunicación con el servidor.');
      }
      
      toast.success('¡Estado actualizado con éxito!');

    } catch (error) {
      console.error("Error en handleStatusChange:", error);
      toast.error(`Error al actualizar: ${error.message}`);
      // Opcional: Revertir el estado visual si falla la actualización
      // fetchOrders(); // Vuelve a cargar los pedidos para mostrar el estado real
    }
  };

  const getStatusClass = (status) => {
    if (!status) return '';
    return `status-${status.trim().toLowerCase().replace(/ /g, '-')}`;
  };
  
  if (!isAuthenticated) {
    return (
      <div className="admin-login-container">
        <form onSubmit={handleLogin} className="admin-form">
          <h1>Acceso al Panel</h1>
          <p>Por favor, introduce el código de acceso para continuar.</p>
          <input
            type="password"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            className="admin-input"
            placeholder="Código secreto"
          />
          <button type="submit" className="cta-button">Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container standard-page-padding">
    {/* --- SISTEMA DE PESTAÑAS (TABS) --- */}
      <div className="admin-nav-tabs">
        <button 
          className={activeTab === 'orders' ? 'active' : ''} 
          onClick={() => setActiveTab('orders')}
        >
          Gestión de Pedidos
        </button>
        <button 
          className={activeTab === 'products' ? 'active' : ''} 
          onClick={() => setActiveTab('products')}
        >
          Catálogo de Muebles
        </button>
        <button 
          className={activeTab === 'fabrics' ? 'active' : ''} 
          onClick={() => setActiveTab('fabrics')}
        >
          Muestrario de Telas
        </button>
      </div>
      {/* --- CABECERA GLOBAL (SOLO PARA PRODUCTOS Y TELAS) --- */}
      {(activeTab === 'products' || activeTab === 'fabrics') && (
        <div className="admin-view-controls">
          <h2>{activeTab === 'products' ? 'Catálogo de Muebles' : 'Muestrario de Telas'}</h2>
          
          <div className="admin-global-search">
            <input 
              type="text" 
              placeholder={`Buscar en ${activeTab === 'products' ? 'productos' : 'telas'}...`}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset al buscar
              }}
            />
          </div>

          <button 
            className="cta-button" 
            onClick={() => {
              if (activeTab === 'products') {
                setEditingProduct({
                  nombre: '', precio_base: 0, metros_tela_base: 0, categoria: 'sofas', activo: true, sku: '', descripcion: '',
                  detalles: { medidas: { sofa: { alto: '', ancho: '', profundidad: '' } }, descripcion_larga: { base: '', sabor: '', cta: '' }, galeria: [] }
                });
                setIsProductModalOpen(true);
              } else {
                setEditingFabric({ nombre_tipo: '', nombre_color: '', imagen_url: '', costo_adicional_por_metro: 0, disponible: true });
                setIsFabricModalOpen(true);
              }
            }}
          >
            {activeTab === 'products' ? '+ Nuevo Producto' : '+ Nueva Tela'}
          </button>
        </div>
      )}

      {activeTab === 'orders' && (
        <>
          <h1 className="section-title">Panel de administración de pedidos</h1>
      {loading ? (
        <p>Cargando pedidos...</p>
      ) : (
        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Nº Pedido</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Pago / Entrega</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} onClick={() => setSelectedOrder(order)} className="order-row">
                  <td><strong>#{order.numero_pedido}</strong></td>
                  <td>{new Date(order.created_at).toLocaleDateString('es-UY')}</td>
                  <td>{`${order.datos_cliente?.nombre || 'N/A'} ${order.datos_cliente?.apellido || ''}`}</td>
                  <td>{formatPriceUYU(order.total_pedido)}</td>
                  <td>
                    <div>{order.cuenta_bancaria_id ? 'Transferencia' : 'Mercado Pago'}</div>
                    <div className="delivery-method">{order.datos_cliente?.shippingMethod === 'envio' ? 'Envío' : 'Retiro'}</div>
                  </td>
                  <td>
                    <select
                      value={order.estado || ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className={`status-select ${getStatusClass(order.estado)}`}
                    >
                      {ORDER_STATUSES.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </>
      )}

      {/* --- INICIO VISTA CATÁLOGO --- */}
      {activeTab === 'products' && (
        <div className="admin-catalog-section">
          {loadingItems ? (
            <p>Cargando catálogo...</p>
          ) : (
            <div className="orders-table-container">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Miniatura</th>
                    <th>Nombre</th>
                    <th>Precio Base</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(prod => (
                    <tr key={prod.id}>
                      <td>
                        <img 
                          src={prod.imagen_url} 
                          alt={prod.nombre} 
                          style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} 
                        />
                      </td>
                      <td><strong>{prod.nombre}</strong><br/><small style={{color: '#888'}}>{prod.categoria}</small></td>
                      <td>{formatPriceUYU(prod.precio_base)}</td>
                      <td>
                        <span className={prod.activo ? 'status-pago-realizado' : 'status-cancelado'} style={{padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold'}}>
                          {prod.activo ? 'ACTIVO' : 'OCULTO'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions-container">
                          <button 
                            className="cta-button edit-btn-small" 
                            onClick={() => { setEditingProduct(prod); setIsProductModalOpen(true); }}
                          >
                            Editar
                          </button>
                          <button 
                            className="cta-button delete-btn-small" 
                            onClick={() => handleDeleteItem(prod.id, 'productos')}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* --- FIN VISTA CATÁLOGO --- */}

      {/* --- INICIO VISTA TELAS --- */}
      {activeTab === 'fabrics' && (
        <div className="admin-fabrics-section">
          {loadingItems ? (
            <p>Cargando telas...</p>
          ) : (
            <div className="orders-table-container">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Muestra</th>
                    <th>Tipo / Color</th>
                    <th>Costo Extra (m)</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {fabrics.map(tela => (
                    <tr key={tela.id}>
                      <td>
                        <img 
                          src={tela.imagen_url} 
                          alt={tela.nombre_color} 
                          style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '50%', border: '1px solid #ddd' }} 
                        />
                      </td>
                      <td>
                        <strong>{tela.nombre_tipo}</strong><br/>
                        <span style={{color: '#666'}}>{tela.nombre_color}</span>
                      </td>
                      <td>{formatPriceUYU(tela.costo_adicional_por_metro)}</td>
                      <td>
                        <span className={tela.disponible ? 'status-pago-realizado' : 'status-cancelado'} style={{padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold'}}>
                          {tela.disponible ? 'DISPONIBLE' : 'AGOTADA'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions-container">
                          <button 
                            className="cta-button edit-btn-small" 
                            onClick={() => { setEditingFabric(tela); setIsFabricModalOpen(true); }}
                          >
                            Editar
                          </button>
                          <button 
                            className="cta-button delete-btn-small" 
                            onClick={() => handleDeleteItem(tela.id, 'telas')}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* --- FIN VISTA TELAS --- */}

      {/* --- MODAL DE PRODUCTO (NUEVO / EDITAR) --- */}
      <Modal
        isOpen={isProductModalOpen}
        onRequestClose={() => setIsProductModalOpen(false)}
        className="order-detail-modal"
        overlayClassName="order-detail-overlay"
      >
        <div className="modal-header">
          <h2>{editingProduct?.id ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <button className="close-button" onClick={() => setIsProductModalOpen(false)}>&times;</button>
        </div>

        <div className="admin-form-container">
        {/* --- GESTIÓN DE IMAGEN --- */}
          <div className="admin-field-group">
            <label>Imagen Principal (Card)</label>
            <label className="custom-file-upload">
              <input 
                type="file" 
                className="hidden-file-input"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) handleProductInputChange('imagen_url', file);
                }}
              />
              {editingProduct?.imagen_url ? (
                <img 
                  src={editingProduct.imagen_url instanceof File ? URL.createObjectURL(editingProduct.imagen_url) : editingProduct.imagen_url} 
                  className="image-preview-img" 
                  style={{ width: '150px', height: '150px' }}
                />
              ) : (
                <>
                  <i>📁</i>
                  <span>Haga clic para subir la imagen principal</span>
                </>
              )}
            </label>
          </div>
          <div className="order-detail-section">
            <h3>Galería de Detalles</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '15px', marginBottom: '15px' }}>
              {editingProduct?.detalles?.galeria?.map((img, index) => (
                <div key={index} className="gallery-item-wrapper">
                  <img 
                    src={img instanceof File ? URL.createObjectURL(img) : img} 
                    style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--color-borde)' }} 
                  />
                  <div className="gallery-controls">
                    <button type="button" className="control-btn" title="Mover izquierda" onClick={() => handleMoveGalleryImage(index, 'left')}>◀</button>
                    <button type="button" className="control-btn" title="Eliminar" onClick={() => handleRemoveGalleryImage(index)}>🗑️</button>
                    <button type="button" className="control-btn" title="Mover derecha" onClick={() => handleMoveGalleryImage(index, 'right')}>▶</button>
                  </div>
                </div>
              ))}
              
              {/* Dropzone para añadir más fotos */}
              <label className="custom-file-upload" style={{ padding: '10px', height: '100px', borderStyle: 'dashed' }}>
                <input 
                  type="file" 
                  multiple 
                  className="hidden-file-input"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    files.forEach(file => handleAddGalleryImage(file));
                  }}
                />
                <span style={{ fontSize: '0.8rem' }}>+ Añadir fotos</span>
              </label>
            </div>
            <small style={{color: '#666', display: 'block', marginBottom: '10px'}}>
              Usa las flechas para definir el orden en el que aparecerán las fotos en la web.
            </small>
          </div>
          <div className="form-group-grid">
            <div className="admin-field-group">
              <label>Nombre del Producto</label>
              <input 
                type="text" 
                className="admin-field-input"
                value={editingProduct?.nombre || ''}
                onChange={(e) => handleProductInputChange('nombre', e.target.value)}
              />
            </div>
            <div className="admin-field-group">
            <label>SKU (Opcional)</label>
            <input 
              type="text" 
              className="admin-field-input"
              placeholder="Se generará automáticamente si queda vacío"
              value={editingProduct?.sku || ''}
              onChange={(e) => handleProductInputChange('sku', e.target.value)}
            />
            </div>
          </div>

          <div className="form-group-grid">
            <div className="admin-field-group">
              <label>Precio Base (UYU)</label>
              <input 
                type="number" 
                className="admin-field-input"
                value={editingProduct?.precio_base || ''}
                onChange={(e) => handleProductInputChange('precio_base', e.target.value)}
              />
            </div>
            <div className="admin-field-group">
              <label>Metros de Tela Base</label>
              <input 
                type="number" 
                className="admin-field-input"
                value={editingProduct?.metros_tela_base || ''}
                onChange={(e) => handleProductInputChange('metros_tela_base', e.target.value)}
              />
            </div>
          </div>

          <div className="admin-field-group">
            <label>Descripción Corta (Catálogo)</label>
            <textarea 
              className="admin-field-textarea"
              value={editingProduct?.descripcion || ''}
              onChange={(e) => handleProductInputChange('descripcion', e.target.value)}
            />
          </div>

          <div className="form-group-grid">
            <div className="admin-field-group">
              <label>Categoría</label>
              <select 
                className="admin-field-select"
                value={editingProduct?.categoria || 'sofas'}
                onChange={(e) => handleProductInputChange('categoria', e.target.value)}
              >
                <option value="sofas">Sofás</option>
                <option value="modulares">Esquineros y Modulares</option>
                <option value="butacas">Sillones y Butacas</option>
                <option value="juegos_living">Juegos de Living</option>
                <option value="complementos">Complementos</option>
              </select>
            </div>
            <div className="admin-field-group">
              <label>Estado</label>
              <select 
                className="admin-field-select"
                value={editingProduct?.activo ? 'true' : 'false'}
                onChange={(e) => handleProductInputChange('activo', e.target.value === 'true')}
              >
                <option value="true">Activo (Visible)</option>
                <option value="false">Oculto</option>
              </select>
            </div>
          </div>

          {/* --- SECCIÓN TÉCNICA (JSONB) --- */}
          <div className="order-detail-section">
            <h3>Medidas Técnicas (Sofá)</h3>
            <div className="form-group-grid">
              <div className="admin-field-group">
                <label>Ancho (ej: 170 cm)</label>
                <input 
                  type="text" className="admin-field-input"
                  value={editingProduct?.detalles?.medidas?.sofa?.ancho || ''}
                  onChange={(e) => handleProductDetailChange('ancho', e.target.value, 'medidas')}
                />
              </div>
              <div className="admin-field-group">
                <label>Altura</label>
                <input 
                  type="text" className="admin-field-input"
                  value={editingProduct?.detalles?.medidas?.sofa?.alto || ''}
                  onChange={(e) => handleProductDetailChange('alto', e.target.value, 'medidas')}
                />
              </div>
              <div className="admin-field-group">
                <label>Profundidad</label>
                <input 
                  type="text" className="admin-field-input"
                  value={editingProduct?.detalles?.medidas?.sofa?.profundidad || ''}
                  onChange={(e) => handleProductDetailChange('profundidad', e.target.value, 'medidas')}
                />
              </div>
            </div>
          </div>

          <div className="admin-field-group">
            <label>Descripción de Marketing (Sabor)</label>
            <textarea 
              className="admin-field-textarea"
              placeholder="Ej: Para quienes buscan un confort sin límites..."
              value={editingProduct?.detalles?.descripcion_larga?.sabor || ''}
              onChange={(e) => handleProductDetailChange('sabor', e.target.value, 'descripcion_larga')}
            />
          </div>

          <div className="admin-field-group">
            <label>Descripción Técnica (Base)</label>
            <textarea 
              className="admin-field-textarea"
              placeholder="Ej: Su estructura está pensada para perdurar..."
              value={editingProduct?.detalles?.descripcion_larga?.base || ''}
              onChange={(e) => handleProductDetailChange('base', e.target.value, 'descripcion_larga')}
            />
          </div>

          <div className="admin-form-actions">
            <button className="cta-button secondary" onClick={() => setIsProductModalOpen(false)}>Cancelar</button>
            <button className="cta-button" onClick={handleSaveProduct}>
              {editingProduct?.id ? 'Actualizar Producto' : 'Crear Producto'}
            </button>
          </div>
        </div>
      </Modal>

      {/* --- MODAL DE TELAS (NUEVO / EDITAR) --- */}
      <Modal
        isOpen={isFabricModalOpen}
        onRequestClose={() => setIsFabricModalOpen(false)}
        className="order-detail-modal"
        overlayClassName="order-detail-overlay"
      >
        <div className="modal-header">
          <h2>{editingFabric?.id ? 'Editar Tela' : 'Nueva Tela'}</h2>
          <button className="close-button" onClick={() => setIsFabricModalOpen(false)}>&times;</button>
        </div>

        <div className="admin-form-container">
          <div className="admin-field-group">
            <label>Imagen de la Muestra</label>
            <label className="custom-file-upload">
              <input 
                type="file" 
                className="hidden-file-input"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) handleFabricInputChange('imagen_url', file);
                }}
              />
              {editingFabric?.imagen_url ? (
                <img 
                  src={editingFabric.imagen_url instanceof File ? URL.createObjectURL(editingFabric.imagen_url) : editingFabric.imagen_url} 
                  className="image-preview-img" 
                  style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover' }} 
                />
              ) : (
                <>
                  <i style={{ fontSize: '1.5rem', marginBottom: '5px' }}>🎨</i>
                  <span>Subir muestra de tela</span>
                </>
              )}
            </label>
          </div>

          <div className="form-group-grid">
            <div className="admin-field-group">
              <label>Tipo de Tela (Ej: Pané)</label>
              <input 
                type="text" className="admin-field-input"
                value={editingFabric?.nombre_tipo || ''}
                onChange={(e) => handleFabricInputChange('nombre_tipo', e.target.value)}
              />
            </div>
            <div className="admin-field-group">
              <label>Color (Ej: Beige)</label>
              <input 
                type="text" className="admin-field-input"
                value={editingFabric?.nombre_color || ''}
                onChange={(e) => handleFabricInputChange('nombre_color', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group-grid">
            <div className="admin-field-group">
              <label>Costo Extra por Metro (UYU)</label>
              <input 
                type="number" className="admin-field-input"
                value={editingFabric?.costo_adicional_por_metro || ''}
                onChange={(e) => handleFabricInputChange('costo_adicional_por_metro', e.target.value)}
              />
            </div>
            <div className="admin-field-group">
              <label>Disponibilidad</label>
              <select 
                className="admin-field-select"
                value={editingFabric?.disponible ? 'true' : 'false'}
                onChange={(e) => handleFabricInputChange('disponible', e.target.value === 'true')}
              >
                <option value="true">Disponible</option>
                <option value="false">Agotada / Sin Stock</option>
              </select>
            </div>
          </div>

          <div className="admin-form-actions">
            <button className="cta-button secondary" onClick={() => setIsFabricModalOpen(false)}>Cancelar</button>
            <button className="cta-button" onClick={handleSaveFabric}>
              {editingFabric?.id ? 'Actualizar Tela' : 'Crear Tela'}
            </button>
          </div>
        </div>
      </Modal>


      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onRequestClose={() => setSelectedOrder(null)}
          className="order-detail-modal"
          overlayClassName="order-detail-overlay"
        >
          <div className="modal-header">
            <h2>Detalle del Pedido #{selectedOrder.numero_pedido}</h2>
            <button onClick={() => setSelectedOrder(null)} className="close-modal-btn">&times;</button>
          </div>
          <div className="modal-content">
            <div className="order-detail-section">
              <h3>Datos del Cliente</h3>
              <p><strong>Nombre:</strong> {selectedOrder.datos_cliente?.nombre} {selectedOrder.datos_cliente?.apellido}</p>
              <p><strong>Email:</strong> {selectedOrder.datos_cliente?.email}</p>
              <p><strong>Teléfono:</strong> {selectedOrder.datos_cliente?.telefono}</p>
            </div>
            {selectedOrder.datos_cliente?.shippingMethod === 'envio' && (
              <div className="order-detail-section">
                <h3>Detalles de Envío</h3>
                <p><strong>Dirección:</strong> {selectedOrder.datos_cliente?.direccion}</p>
                <p><strong>Localidad:</strong> {selectedOrder.datos_cliente?.ciudad}</p>
                <p><strong>Departamento:</strong> {selectedOrder.datos_cliente?.departamento}</p>
              </div>
            )}
            {selectedOrder.cuentas_bancarias && (
              <div className="order-detail-section">
                <h3>Detalles de Pago</h3>
                <p><strong>Transferencia a:</strong> {selectedOrder.cuentas_bancarias.nombre_banco} ({selectedOrder.cuentas_bancarias.moneda})</p>
              </div>
            )}
            {selectedOrder.datos_cliente?.aclaraciones && (
               <div className="order-detail-section">
                <h3>Aclaraciones del Cliente</h3>
                <p>{selectedOrder.datos_cliente.aclaraciones}</p>
              </div>
            )}
            <div className="order-detail-section">
              <h3>Productos del Pedido</h3>
              <ul className="modal-product-list">
                {selectedOrder.pedido_items?.map((item, index) => (
                  <li key={index}>
                    <strong>{item.productos?.nombre || 'Producto no encontrado'} (x{item.cantidad})</strong>
                    <br />
                    <span className="modal-product-fabric">
                      Tela: {`${item.telas?.nombre_tipo || 'N/A'} ${item.telas?.nombre_color || 'N/A'}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Modal>
      )}
      {/* --- PAGINACIÓN GLOBAL --- */}
      {(activeTab === 'products' || activeTab === 'fabrics') && !loadingItems && totalItems > ITEMS_PER_PAGE && (
        <div className="pagination-controls">
          <button 
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            Anterior
          </button>
          <span className="page-indicator">
            Página {currentPage} de {Math.ceil(totalItems / ITEMS_PER_PAGE)}
          </span>
          <button 
            className="pagination-btn"
            disabled={currentPage >= Math.ceil(totalItems / ITEMS_PER_PAGE)}
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminPage;