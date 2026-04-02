// src/pages/AdminPage/AdminPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import Modal from "react-modal";
import { supabase } from "../../supabaseClient";
import { formatPriceUYU } from "../../utils/formatters";
import "./AdminPage.css";

Modal.setAppElement("#root");

const ADMIN_SECRET_CODE = import.meta.env.VITE_ADMIN_SECRET_CODE;
const ORDER_STATUSES = [
  "Pendiente de transferencia",
  "Pendiente de pago",
  "Pago realizado",
  "En fabricación",
  "Pedido finalizado",
  "Enviado",
  "Completado",
  "Cancelado",
];

// --- FUNCIONES DE APOYO ---
const generateSlug = (text) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quita tildes
    .replace(/[^\w ]+/g, "") // Quita caracteres especiales
    .replace(/ +/g, "-"); // Cambia espacios por guiones
};

const generateSKU = (name, category) => {
  const prefix = category ? category.substring(0, 3).toUpperCase() : "PROD";
  const namePart = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .substring(0, 3);
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
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200; // Tamaño ideal para web
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Convertimos a WebP con calidad 0.8 (80%)
        canvas.toBlob(
          (blob) => {
            resolve(
              new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
                type: "image/webp",
              }),
            );
          },
          "image/webp",
          0.8,
        );
      };
    };
  });
};

const uploadAdminImage = async (file, folder) => {
  // --- PASO DE OPTIMIZACIÓN AUTOMÁTICA ---
  const optimizedFile = await optimizeImage(file);

  const fileExt = optimizedFile.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  const { error } = await supabase.storage
    .from("imagenes-productos")
    .upload(filePath, optimizedFile);

  if (error) throw error;

  const { data } = supabase.storage
    .from("imagenes-productos")
    .getPublicUrl(filePath);
  return data.publicUrl;
};

const AdminPage = () => {
  const ITEMS_PER_PAGE = 10;
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true); // Inicia en true para mostrar carga inicial
  const [selectedOrder, setSelectedOrder] = useState(null);

  // --- NUEVOS ESTADOS PARA GESTIÓN ---
  const [activeTab, setActiveTab] = useState("orders"); // Controla la pestaña activa: 'orders', 'products', 'fabrics'
  const [products, setProducts] = useState([]);
  const [fabrics, setFabrics] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Control de Modales y Edición
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isFabricModalOpen, setIsFabricModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingFabric, setEditingFabric] = useState(null);

  // Agrupamos las telas por tipo para la visualización en la tabla
  const groupedFabrics = React.useMemo(() => {
    return fabrics.reduce((acc, tela) => {
      const tipo = tela.nombre_tipo;
      if (!acc[tipo]) {
        acc[tipo] = {
          ...tela, // Tomamos los datos base del primer registro
          colores: [],
        };
      }
      acc[tipo].colores.push(tela);
      return acc;
    }, {});
  }, [fabrics]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from("pedidos")
      .select(
        "*, cuentas_bancarias (nombre_banco, moneda), pedido_items ( cantidad, productos (nombre), telas (nombre_tipo, nombre_color) )",
        { count: "exact" },
      );

    if (searchTerm) {
      // Buscamos por Nº de pedido o por nombre/apellido dentro del JSONB datos_cliente
      query = query.or(
        `numero_pedido.ilike.%${searchTerm}%,datos_cliente->>nombre.ilike.%${searchTerm}%,datos_cliente->>apellido.ilike.%${searchTerm}%`,
      );
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!error) {
      setOrders(data);
      setTotalItems(count || 0);
    }
    setLoading(false);
  }, [currentPage, searchTerm, ITEMS_PER_PAGE]);

  const fetchProducts = useCallback(async () => {
    setLoadingItems(true);
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase.from("productos").select("*", { count: "exact" });

    if (searchTerm) {
      // Busca en nombre O en SKU
      query = query.or(
        `nombre.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`,
      );
    }

    const { data, error, count } = await query
      .order("nombre", { ascending: true })
      .range(from, to);

    if (!error) {
      setProducts(data);
      setTotalItems(count || 0);
    }
    setLoadingItems(false);
  }, [currentPage, searchTerm, ITEMS_PER_PAGE]);

  const fetchFabrics = useCallback(async () => {
    setLoadingItems(true);

    let query = supabase.from("telas").select("*"); // Traemos todo para agrupar las familias correctamente

    if (searchTerm) {
      query = query.or(
        `nombre_tipo.ilike.%${searchTerm}%,nombre_color.ilike.%${searchTerm}%`,
      );
    }

    const { data, error } = await query
      .order("nombre_tipo", { ascending: true })
      .order("nombre_color", { ascending: true });

    if (!error) {
      setFabrics(data);
      // No seteamos totalItems aquí, lo haremos en un useEffect basado en el agrupamiento
    }
    setLoadingItems(false);
  }, [searchTerm]); // Ya no depende de currentPage para recargar

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === "orders") fetchOrders();
      if (activeTab === "products") fetchProducts();
      if (activeTab === "fabrics") fetchFabrics();
    }
  }, [isAuthenticated, activeTab, fetchOrders, fetchProducts, fetchFabrics]);

  useEffect(() => {
    setSearchTerm("");
    setCurrentPage(1);
  }, [activeTab]);

  // Sincroniza el total de items para la paginación de telas (basado en familias)
  useEffect(() => {
    if (activeTab === "fabrics") {
      setTotalItems(Object.keys(groupedFabrics).length);
    }
  }, [groupedFabrics, activeTab]);

  // Manejador genérico para cambios en inputs de productos
  const handleProductInputChange = (field, value) => {
    setEditingProduct((prev) => ({ ...prev, [field]: value }));
  };

  // Manejador específico para el JSONB de 'detalles'
  const handleProductDetailChange = (subField, value, parent = "medidas") => {
    setEditingProduct((prev) => {
      // 1. Aseguramos que 'detalles' sea un objeto
      const newDetails = { ...(prev.detalles || {}) };

      if (parent === "medidas") {
        // 2. Aseguramos que 'medidas' y 'sofa' existan antes de escribir
        newDetails.medidas = { ...(newDetails.medidas || {}) };
        newDetails.medidas.sofa = { ...(newDetails.medidas.sofa || {}) };

        newDetails.medidas.sofa[subField] = value;
      } else if (parent === "descripcion_larga") {
        // 3. Aseguramos que 'descripcion_larga' exista
        newDetails.descripcion_larga = {
          ...(newDetails.descripcion_larga || {}),
        };

        newDetails.descripcion_larga[subField] = value;
      }

      return { ...prev, detalles: newDetails };
    });
  };

  // Agregar imagen a la galería
  const handleAddGalleryImage = (url) => {
    setEditingProduct((prev) => {
      const newDetails = { ...prev.detalles };
      newDetails.galeria = [...(newDetails.galeria || []), url];
      return { ...prev, detalles: newDetails };
    });
  };

  // Eliminar imagen de la galería
  const handleRemoveGalleryImage = (index) => {
    setEditingProduct((prev) => {
      const newDetails = { ...prev.detalles };
      newDetails.galeria = newDetails.galeria.filter((_, i) => i !== index);
      return { ...prev, detalles: newDetails };
    });
  };

  // Mover imagen en la galería (izquierda/derecha)
  const handleMoveGalleryImage = (index, direction) => {
    setEditingProduct((prev) => {
      const newGaleria = [...(prev.detalles.galeria || [])];
      const newIndex = direction === "left" ? index - 1 : index + 1;

      if (newIndex < 0 || newIndex >= newGaleria.length) return prev;

      // Intercambio de posiciones (Swap)
      [newGaleria[index], newGaleria[newIndex]] = [
        newGaleria[newIndex],
        newGaleria[index],
      ];

      return {
        ...prev,
        detalles: { ...prev.detalles, galeria: newGaleria },
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
        const url = await uploadAdminImage(
          updatedProduct.imagen_url,
          "productos",
        );
        updatedProduct.imagen_url = url;
      }

      // 2. Si hay imágenes nuevas en la galería (objetos File), subirlas todas
      if (
        updatedProduct.detalles.galeria &&
        updatedProduct.detalles.galeria.some((img) => img instanceof File)
      ) {
        toast.info("Subiendo galería...");
        const updatedGaleria = await Promise.all(
          updatedProduct.detalles.galeria.map(async (img) => {
            if (img instanceof File) {
              return await uploadAdminImage(img, "productos");
            }
            return img; // Mantener la URL si ya era un string
          }),
        );
        updatedProduct.detalles.galeria = updatedGaleria;
      }

      const isNew = !updatedProduct.id;
      const payload = {
        ...updatedProduct,
        slug: updatedProduct.slug || generateSlug(updatedProduct.nombre),
        sku:
          updatedProduct.sku ||
          generateSKU(updatedProduct.nombre, updatedProduct.category),
      };

      const { error } = await supabase.from("productos").upsert(payload);
      if (error) throw error;

      toast.success(
        isNew ? "Producto creado con éxito" : "Producto actualizado",
      );
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
    setEditingFabric((prev) => {
      const updated = { ...prev, [field]: value };

      // LÓGICA MAESTRA: Si cambias el precio global, se aplica a todos los colores de la lista
      if (field === "costo_adicional_por_metro") {
        const nuevoPrecio = parseFloat(value) || 0;
        updated.colores = prev.colores.map((col) => ({
          ...col,
          costo_adicional_por_metro: nuevoPrecio,
        }));
      }

      return updated;
    });
  };

  // Cambiar un dato de un color específico en la lista
  const handleFabricColorChange = (index, field, value) => {
    setEditingFabric((prev) => {
      const newColores = [...(prev.colores || [])];
      newColores[index] = { ...newColores[index], [field]: value };
      return { ...prev, colores: newColores };
    });
  };

  // Añadir un nuevo espacio de color vacío a la familia
  const handleAddFabricColor = () => {
    const newColor = {
      nombre_tipo: editingFabric?.nombre_tipo || "",
      nombre_color: "",
      imagen_url: "",
      costo_adicional_por_metro: editingFabric?.costo_adicional_por_metro || 0,
      disponible: true,
      descripcion: editingFabric?.descripcion || "",
    };
    setEditingFabric((prev) => ({
      ...prev,
      colores: [...(prev.colores || []), newColor],
    }));
  };

  // Quitar un color de la lista (localmente)
  const handleRemoveFabricColor = (index) => {
    setEditingFabric((prev) => ({
      ...prev,
      colores: prev.colores.filter((_, i) => i !== index),
    }));
  };

  const handleSaveFabric = async () => {
    try {
      setLoadingItems(true);
      const { nombre_tipo, descripcion, colores } = editingFabric;

      if (!nombre_tipo || !colores || colores.length === 0) {
        toast.error("Debes incluir al menos un nombre de tipo y un color.");
        return;
      }

      toast.info("Procesando cambios en la familia de telas...");

      // 1. Procesar cada color: subir imágenes si son nuevas y unificar datos globales
      const coloresProcesados = await Promise.all(
        colores.map(async (col) => {
          let finalUrl = col.imagen_url;

          // Si la imagen es un archivo nuevo, subirla
          if (col.imagen_url instanceof File) {
            finalUrl = await uploadAdminImage(col.imagen_url, "telas");
          }

          return {
            ...col,
            id: col.id || undefined, // Si no tiene ID, Supabase crea uno nuevo
            nombre_tipo, // Unificamos el tipo
            descripcion, // Unificamos la descripción en todos
            imagen_url: finalUrl,
            // Si el color no tiene un precio específico, usamos el global del modal
            costo_adicional_por_metro: col.costo_adicional_por_metro,
          };
        }),
      );

      // 2. Guardado masivo (Upsert)
      const { error } = await supabase.from("telas").upsert(coloresProcesados);

      if (error) throw error;

      toast.success("Familia de telas actualizada correctamente");
      setIsFabricModalOpen(false);
      fetchFabrics();
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar los cambios");
    } finally {
      setLoadingItems(false);
    }
  };

  const handleDeleteItem = async (id, table) => {
    if (
      window.confirm(
        "¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer.",
      )
    ) {
      try {
        setLoadingItems(true);
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (error) throw error;

        toast.success("Eliminado correctamente");
        table === "productos" ? fetchProducts() : fetchFabrics();
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
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId ? { ...order, estado: newStatus } : order,
      ),
    );

    try {
      const response = await fetch("/api/update-order-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, newStatus }),
      });

      if (!response.ok) {
        // Si la respuesta del servidor no es exitosa, lanzamos un error
        const errorResult = await response.json();
        throw new Error(
          errorResult.error || "Falló la comunicación con el servidor.",
        );
      }

      toast.success("¡Estado actualizado con éxito!");
    } catch (error) {
      console.error("Error en handleStatusChange:", error);
      toast.error(`Error al actualizar: ${error.message}`);
      // Opcional: Revertir el estado visual si falla la actualización
      // fetchOrders(); // Vuelve a cargar los pedidos para mostrar el estado real
    }
  };

  const getStatusClass = (status) => {
    if (!status) return "";
    return `status-${status.trim().toLowerCase().replace(/ /g, "-")}`;
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
          <button type="submit" className="cta-button">
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container standard-page-padding">
      {/* --- SISTEMA DE PESTAÑAS (TABS) --- */}
      <div className="admin-nav-tabs">
        <button
          className={activeTab === "orders" ? "active" : ""}
          onClick={() => setActiveTab("orders")}
        >
          Gestión de Pedidos
        </button>
        <button
          className={activeTab === "products" ? "active" : ""}
          onClick={() => setActiveTab("products")}
        >
          Catálogo de Muebles
        </button>
        <button
          className={activeTab === "fabrics" ? "active" : ""}
          onClick={() => setActiveTab("fabrics")}
        >
          Muestrario de Telas
        </button>
      </div>
      {/* --- CABECERA GLOBAL --- */}
      {(activeTab === "orders" ||
        activeTab === "products" ||
        activeTab === "fabrics") && (
        <div className="admin-view-controls">
          <h2>
            {activeTab === "orders"
              ? "Gestión de Pedidos"
              : activeTab === "products"
                ? "Catálogo de Muebles"
                : "Muestrario de Telas"}
          </h2>

          <div className="admin-global-search">
            <input
              type="text"
              placeholder={
                activeTab === "orders"
                  ? "Buscar por Nº pedido o cliente..."
                  : activeTab === "products"
                    ? "Buscar por nombre o SKU..."
                    : "Buscar telas..."
              }
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* El botón de 'Nuevo' solo aparece en Productos y Telas */}
          {activeTab !== "orders" && (
            <button
              className="cta-button"
              onClick={() => {
                if (activeTab === "products") {
                  setEditingProduct({
                    nombre: "",
                    precio_base: 0,
                    metros_tela_base: 0,
                    categoria: "sofas",
                    activo: true,
                    sku: "",
                    descripcion: "",
                    detalles: {
                      medidas: {
                        sofa: { alto: "", ancho: "", profundidad: "" },
                      },
                      descripcion_larga: { base: "", sabor: "", cta: "" },
                      galeria: [],
                    },
                  });
                  setIsProductModalOpen(true);
                } else {
                  setEditingFabric({
                    nombre_tipo: "",
                    nombre_color: "",
                    imagen_url: "",
                    costo_adicional_por_metro: 0,
                    disponible: true,
                  });
                  setIsFabricModalOpen(true);
                }
              }}
            >
              {activeTab === "products" ? "+ Nuevo Producto" : "+ Nueva Tela"}
            </button>
          )}
        </div>
      )}

      {/* --- INICIO VISTA PEDIDOS --- */}
      {activeTab === "orders" &&
        (loading ? (
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
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="order-row"
                  >
                    <td>
                      <strong>#{order.numero_pedido}</strong>
                    </td>
                    <td>
                      {new Date(order.created_at).toLocaleDateString("es-UY")}
                    </td>
                    <td>{`${order.datos_cliente?.nombre || "N/A"} ${order.datos_cliente?.apellido || ""}`}</td>
                    <td>{formatPriceUYU(order.total_pedido)}</td>
                    <td>
                      <div>
                        {order.cuenta_bancaria_id
                          ? "Transferencia"
                          : "Mercado Pago"}
                      </div>
                      <div className="delivery-method">
                        {order.datos_cliente?.shippingMethod === "envio"
                          ? "Envío"
                          : "Retiro"}
                      </div>
                    </td>
                    <td>
                      <select
                        value={order.estado || ""}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          handleStatusChange(order.id, e.target.value)
                        }
                        className={`status-select ${getStatusClass(order.estado)}`}
                      >
                        {ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {/* --- INICIO VISTA CATÁLOGO --- */}
      {activeTab === "products" && (
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
                  {products.map((prod) => (
                    <tr key={prod.id}>
                      <td>
                        <img
                          src={prod.imagen_url}
                          alt={prod.nombre}
                          style={{
                            width: "50px",
                            height: "50px",
                            objectFit: "cover",
                            borderRadius: "4px",
                          }}
                        />
                      </td>
                      <td>
                        <strong>{prod.nombre}</strong>
                        <br />
                        <small style={{ color: "#888" }}>
                          {prod.categoria}
                        </small>
                      </td>
                      <td>{formatPriceUYU(prod.precio_base)}</td>
                      <td>
                        <span
                          className={
                            prod.activo
                              ? "status-pago-realizado"
                              : "status-cancelado"
                          }
                          style={{
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "0.8rem",
                            fontWeight: "bold",
                          }}
                        >
                          {prod.activo ? "ACTIVO" : "OCULTO"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions-container">
                          <button
                            className="cta-button edit-btn-small"
                            onClick={() => {
                              setEditingProduct(prod);
                              setIsProductModalOpen(true);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className="cta-button delete-btn-small"
                            onClick={() =>
                              handleDeleteItem(prod.id, "productos")
                            }
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
      {activeTab === "fabrics" && (
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
                  {Object.values(groupedFabrics)
                    .slice(
                      (currentPage - 1) * ITEMS_PER_PAGE,
                      currentPage * ITEMS_PER_PAGE,
                    )
                    .map((grupo) => (
                      <tr key={grupo.nombre_tipo}>
                        <td>
                          <img
                            src={grupo.imagen_url}
                            alt={grupo.nombre_tipo}
                            style={{
                              width: "45px",
                              height: "45px",
                              objectFit: "cover",
                              borderRadius: "50%",
                              border: "1px solid #ddd",
                            }}
                          />
                        </td>
                        <td>
                          <strong>{grupo.nombre_tipo}</strong>
                          <br />
                          <small style={{ color: "#888" }}>
                            {grupo.colores.length} variantes de color
                          </small>
                        </td>
                        <td>
                          {/* Si hay precios distintos en la familia, avisamos con un '+' */}
                          {new Set(
                            grupo.colores.map(
                              (c) => c.costo_adicional_por_metro,
                            ),
                          ).size > 1
                            ? `Desde ${formatPriceUYU(Math.min(...grupo.colores.map((c) => c.costo_adicional_por_metro)))}`
                            : formatPriceUYU(grupo.costo_adicional_por_metro)}
                        </td>
                        <td>
                          <span
                            className={
                              grupo.colores.some((c) => c.disponible)
                                ? "status-pago-realizado"
                                : "status-cancelado"
                            }
                            style={{
                              padding: "4px 8px",
                              borderRadius: "12px",
                              fontSize: "0.8rem",
                              fontWeight: "bold",
                            }}
                          >
                            {grupo.colores.some((c) => c.disponible)
                              ? "CON STOCK"
                              : "SIN STOCK"}
                          </span>
                        </td>
                        <td>
                          <div className="admin-actions-container">
                            <button
                              className="cta-button edit-btn-small"
                              onClick={() => {
                                // Calculamos cuál es el precio que más se repite (el valor 'madre' real)
                                const precios = grupo.colores.map(
                                  (c) => c.costo_adicional_por_metro,
                                );
                                const precioMasFrecuente = precios
                                  .sort(
                                    (a, b) =>
                                      precios.filter((v) => v === a).length -
                                      precios.filter((v) => v === b).length,
                                  )
                                  .pop();

                                setEditingFabric({
                                  ...grupo,
                                  costo_adicional_por_metro: precioMasFrecuente, // Seteamos el predominante como base
                                  colores: grupo.colores,
                                });
                                setIsFabricModalOpen(true);
                              }}
                            >
                              Gestionar
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
          <h2>{editingProduct?.id ? "Editar Producto" : "Nuevo Producto"}</h2>
          <button
            className="close-button"
            onClick={() => setIsProductModalOpen(false)}
          >
            &times;
          </button>
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
                  if (file) handleProductInputChange("imagen_url", file);
                }}
              />
              {editingProduct?.imagen_url ? (
                <img
                  src={
                    editingProduct.imagen_url instanceof File
                      ? URL.createObjectURL(editingProduct.imagen_url)
                      : editingProduct.imagen_url
                  }
                  className="image-preview-img"
                  style={{ width: "150px", height: "150px" }}
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: "15px",
                marginBottom: "15px",
              }}
            >
              {editingProduct?.detalles?.galeria?.map((img, index) => (
                <div key={index} className="gallery-item-wrapper">
                  <img
                    src={img instanceof File ? URL.createObjectURL(img) : img}
                    style={{
                      width: "100%",
                      height: "100px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      border: "1px solid var(--color-borde)",
                    }}
                  />
                  <div className="gallery-controls">
                    <button
                      type="button"
                      className="control-btn"
                      title="Mover izquierda"
                      onClick={() => handleMoveGalleryImage(index, "left")}
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      className="control-btn"
                      title="Eliminar"
                      onClick={() => handleRemoveGalleryImage(index)}
                    >
                      🗑️
                    </button>
                    <button
                      type="button"
                      className="control-btn"
                      title="Mover derecha"
                      onClick={() => handleMoveGalleryImage(index, "right")}
                    >
                      ▶
                    </button>
                  </div>
                </div>
              ))}

              {/* Dropzone para añadir más fotos */}
              <label
                className="custom-file-upload"
                style={{
                  padding: "10px",
                  height: "100px",
                  borderStyle: "dashed",
                }}
              >
                <input
                  type="file"
                  multiple
                  className="hidden-file-input"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    files.forEach((file) => handleAddGalleryImage(file));
                  }}
                />
                <span style={{ fontSize: "0.8rem" }}>+ Añadir fotos</span>
              </label>
            </div>
            <small
              style={{ color: "#666", display: "block", marginBottom: "10px" }}
            >
              Usa las flechas para definir el orden en el que aparecerán las
              fotos en la web.
            </small>
          </div>
          <div className="form-group-grid">
            <div className="admin-field-group">
              <label>Nombre del Producto</label>
              <input
                type="text"
                className="admin-field-input"
                value={editingProduct?.nombre || ""}
                onChange={(e) =>
                  handleProductInputChange("nombre", e.target.value)
                }
              />
            </div>
            <div className="admin-field-group">
              <label>SKU (Opcional)</label>
              <input
                type="text"
                className="admin-field-input"
                placeholder="Se generará automáticamente si queda vacío"
                value={editingProduct?.sku || ""}
                onChange={(e) =>
                  handleProductInputChange("sku", e.target.value)
                }
              />
            </div>
          </div>

          <div className="form-group-grid">
            <div className="admin-field-group">
              <label>Precio Base (UYU)</label>
              <input
                type="number"
                className="admin-field-input"
                value={editingProduct?.precio_base || ""}
                onChange={(e) =>
                  handleProductInputChange("precio_base", e.target.value)
                }
              />
            </div>
            <div className="admin-field-group">
              <label>Metros de Tela Base</label>
              <input
                type="number"
                className="admin-field-input"
                value={editingProduct?.metros_tela_base || ""}
                onChange={(e) =>
                  handleProductInputChange("metros_tela_base", e.target.value)
                }
              />
            </div>
          </div>

          <div className="admin-field-group">
            <label>Descripción Corta (Catálogo)</label>
            <textarea
              className="admin-field-textarea"
              value={editingProduct?.descripcion || ""}
              onChange={(e) =>
                handleProductInputChange("descripcion", e.target.value)
              }
            />
          </div>

          <div className="form-group-grid">
            <div className="admin-field-group">
              <label>Categoría</label>
              <select
                className="admin-field-select"
                value={editingProduct?.categoria || "sofas"}
                onChange={(e) =>
                  handleProductInputChange("categoria", e.target.value)
                }
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
                value={editingProduct?.activo ? "true" : "false"}
                onChange={(e) =>
                  handleProductInputChange("activo", e.target.value === "true")
                }
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
                  type="text"
                  className="admin-field-input"
                  value={editingProduct?.detalles?.medidas?.sofa?.ancho || ""}
                  onChange={(e) =>
                    handleProductDetailChange(
                      "ancho",
                      e.target.value,
                      "medidas",
                    )
                  }
                />
              </div>
              <div className="admin-field-group">
                <label>Altura</label>
                <input
                  type="text"
                  className="admin-field-input"
                  value={editingProduct?.detalles?.medidas?.sofa?.alto || ""}
                  onChange={(e) =>
                    handleProductDetailChange("alto", e.target.value, "medidas")
                  }
                />
              </div>
              <div className="admin-field-group">
                <label>Profundidad</label>
                <input
                  type="text"
                  className="admin-field-input"
                  value={
                    editingProduct?.detalles?.medidas?.sofa?.profundidad || ""
                  }
                  onChange={(e) =>
                    handleProductDetailChange(
                      "profundidad",
                      e.target.value,
                      "medidas",
                    )
                  }
                />
              </div>
            </div>
          </div>

          <div className="admin-field-group">
            <label>Descripción de Marketing (Sabor)</label>
            <textarea
              className="admin-field-textarea"
              placeholder="Ej: Para quienes buscan un confort sin límites..."
              value={editingProduct?.detalles?.descripcion_larga?.sabor || ""}
              onChange={(e) =>
                handleProductDetailChange(
                  "sabor",
                  e.target.value,
                  "descripcion_larga",
                )
              }
            />
          </div>

          <div className="admin-field-group">
            <label>Descripción Técnica (Base)</label>
            <textarea
              className="admin-field-textarea"
              placeholder="Ej: Su estructura está pensada para perdurar..."
              value={editingProduct?.detalles?.descripcion_larga?.base || ""}
              onChange={(e) =>
                handleProductDetailChange(
                  "base",
                  e.target.value,
                  "descripcion_larga",
                )
              }
            />
          </div>

          <div className="admin-form-actions">
            <button
              className="cta-button secondary"
              onClick={() => setIsProductModalOpen(false)}
            >
              Cancelar
            </button>
            <button className="cta-button" onClick={handleSaveProduct}>
              {editingProduct?.id ? "Actualizar Producto" : "Crear Producto"}
            </button>
          </div>
        </div>
      </Modal>

      {/* --- MODAL DE TELAS (GESTIÓN AGRUPADA) --- */}
      <Modal
        isOpen={isFabricModalOpen}
        onRequestClose={() => setIsFabricModalOpen(false)}
        className="order-detail-modal"
        overlayClassName="order-detail-overlay"
      >
        <div className="modal-header">
          <h2>
            {editingFabric?.id
              ? `Gestionar Tela: ${editingFabric.nombre_tipo}`
              : "Nueva Familia de Tela"}
          </h2>
          <button
            className="close-button"
            onClick={() => setIsFabricModalOpen(false)}
          >
            &times;
          </button>
        </div>

        <div className="admin-form-container">
          {/* 1. INFORMACIÓN GLOBAL (Se aplica a todos los colores) */}
          <div className="order-detail-section">
            <h3>Información General (Tipo)</h3>
            <div className="form-group-grid">
              <div className="admin-field-group">
                <label>Nombre del Tipo (Ej: Pané)</label>
                <input
                  type="text"
                  className="admin-field-input"
                  value={editingFabric?.nombre_tipo || ""}
                  onChange={(e) =>
                    handleFabricInputChange("nombre_tipo", e.target.value)
                  }
                />
              </div>
              <div className="admin-field-group">
                <label>Costo Extra por Metro (UYU)</label>
                <input
                  type="number"
                  className="admin-field-input"
                  value={editingFabric?.costo_adicional_por_metro || 0}
                  onChange={(e) =>
                    handleFabricInputChange(
                      "costo_adicional_por_metro",
                      e.target.value,
                    )
                  }
                />
              </div>
            </div>

            <div className="admin-field-group">
              <label>Descripción de la Tela (Aparece en la web)</label>
              <textarea
                className="admin-field-textarea"
                placeholder="Ej: Tela con proceso anti-manchas, tacto suave y gran resistencia..."
                value={editingFabric?.descripcion || ""}
                onChange={(e) =>
                  handleFabricInputChange("descripcion", e.target.value)
                }
              />
            </div>
          </div>

          {/* 2. GESTIÓN DE VARIANTES DE COLOR (LISTA POR FILAS) */}
          <div className="order-detail-section">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <h3>Variantes de Color</h3>
              <button
                type="button"
                className="cta-button"
                style={{ padding: "5px 15px", fontSize: "0.8rem" }}
                onClick={handleAddFabricColor}
              >
                + Añadir Color
              </button>
            </div>

            <div
              style={{
                maxHeight: "350px",
                overflowY: "auto",
                border: "1px solid #eee",
                borderRadius: "8px",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.85rem",
                }}
              >
                <thead
                  style={{ background: "#f5f5f5", position: "sticky", top: 0 }}
                >
                  <tr>
                    <th style={{ padding: "10px" }}>Muestra</th>
                    <th style={{ padding: "10px" }}>Nombre del Color</th>
                    <th style={{ padding: "10px" }}>Precio Extra</th>
                    <th style={{ padding: "10px" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {editingFabric?.colores?.map((col, index) => (
                    <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <label style={{ cursor: "pointer" }}>
                          <input
                            type="file"
                            hidden
                            onChange={(e) => {
                              if (e.target.files[0])
                                handleFabricColorChange(
                                  index,
                                  "imagen_url",
                                  e.target.files[0],
                                );
                            }}
                          />
                          <img
                            src={
                              col.imagen_url instanceof File
                                ? URL.createObjectURL(col.imagen_url)
                                : col.imagen_url ||
                                  "https://via.placeholder.com/40"
                            }
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "50%",
                              objectFit: "cover",
                              border: "1px solid #ddd",
                            }}
                          />
                        </label>
                      </td>
                      <td style={{ padding: "8px" }}>
                        <input
                          type="text"
                          className="admin-field-input"
                          style={{ padding: "5px" }}
                          placeholder="Ej: Beige"
                          value={col.nombre_color || ""}
                          onChange={(e) =>
                            handleFabricColorChange(
                              index,
                              "nombre_color",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <input
                          type="number"
                          className="admin-field-input"
                          style={{ padding: "5px", width: "80px" }}
                          value={col.costo_adicional_por_metro}
                          onChange={(e) =>
                            handleFabricColorChange(
                              index,
                              "costo_adicional_por_metro",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <button
                          onClick={() => handleRemoveFabricColor(index)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#dc3545",
                            fontSize: "1.1rem",
                          }}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="admin-form-actions">
            <button
              className="cta-button secondary"
              onClick={() => setIsFabricModalOpen(false)}
            >
              Cancelar
            </button>
            <button className="cta-button" onClick={handleSaveFabric}>
              Guardar Cambios Globales
            </button>
          </div>
          <small style={{ color: "#888", textAlign: "center" }}>
            * Al guardar, el precio y descripción se actualizarán en todos los
            colores de esta familia.
          </small>
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
            <button
              onClick={() => setSelectedOrder(null)}
              className="close-modal-btn"
            >
              &times;
            </button>
          </div>
          <div className="modal-content">
            <div className="order-detail-section">
              <h3>Datos del Cliente</h3>
              <p>
                <strong>Nombre:</strong> {selectedOrder.datos_cliente?.nombre}{" "}
                {selectedOrder.datos_cliente?.apellido}
              </p>
              <p>
                <strong>Email:</strong> {selectedOrder.datos_cliente?.email}
              </p>
              <p>
                <strong>Teléfono:</strong>{" "}
                {selectedOrder.datos_cliente?.telefono}
              </p>
            </div>
            {selectedOrder.datos_cliente?.shippingMethod === "envio" && (
              <div className="order-detail-section">
                <h3>Detalles de Envío</h3>
                <p>
                  <strong>Dirección:</strong>{" "}
                  {selectedOrder.datos_cliente?.direccion}
                </p>
                <p>
                  <strong>Localidad:</strong>{" "}
                  {selectedOrder.datos_cliente?.ciudad}
                </p>
                <p>
                  <strong>Departamento:</strong>{" "}
                  {selectedOrder.datos_cliente?.departamento}
                </p>
              </div>
            )}
            {selectedOrder.cuentas_bancarias && (
              <div className="order-detail-section">
                <h3>Detalles de Pago</h3>
                <p>
                  <strong>Transferencia a:</strong>{" "}
                  {selectedOrder.cuentas_bancarias.nombre_banco} (
                  {selectedOrder.cuentas_bancarias.moneda})
                </p>
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
                    <strong>
                      {item.productos?.nombre || "Producto no encontrado"} (x
                      {item.cantidad})
                    </strong>
                    <br />
                    <span className="modal-product-fabric">
                      Tela:{" "}
                      {`${item.telas?.nombre_tipo || "N/A"} ${item.telas?.nombre_color || "N/A"}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Modal>
      )}
      {/* --- PAGINACIÓN GLOBAL --- */}
      {(activeTab === "orders" ||
        activeTab === "products" ||
        activeTab === "fabrics") &&
        !(activeTab === "orders" ? loading : loadingItems) &&
        totalItems > ITEMS_PER_PAGE && (
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
            >
              Anterior
            </button>
            <span className="page-indicator">
              Página {currentPage} de {Math.ceil(totalItems / ITEMS_PER_PAGE)}
            </span>
            <button
              className="pagination-btn"
              disabled={currentPage >= Math.ceil(totalItems / ITEMS_PER_PAGE)}
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              Siguiente
            </button>
          </div>
        )}
    </div>
  );
};

export default AdminPage;
