// src/pages/AdminPage/AdminPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import Modal from "react-modal";
import { supabase } from "../../supabaseClient";
import { formatPriceUYU } from "../../utils/formatters";
import {
  DIMENSIONES_ESTANDAR,
  NOMBRES_DIMENSIONES,
  humanizeModuloKey,
  sanitizeMedidas,
  slugifyModulo,
  getUniqueModuloSlug,
} from "../../utils/medidas";
import heic2any from "heic2any";
import "./AdminPage.css";

Modal.setAppElement("#root");

const ADMIN_AUTH_STORAGE_KEY = "ivarAdminAuth";
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

const isHeicFile = (file) => {
  const type = (file.type || "").toLowerCase();
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    /\.heic$/i.test(file.name) ||
    /\.heif$/i.test(file.name)
  );
};

const convertHeicToJpegFile = async (file) => {
  try {
    const result = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });
    const blob = Array.isArray(result) ? result[0] : result;
    if (!blob) {
      throw new Error("La conversión HEIC no produjo ninguna imagen.");
    }
    const baseName = file.name.replace(/\.(heic|heif)$/i, "") || "imagen";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "No se pudo convertir la imagen HEIC.";
    throw new Error(
      `${message} Prueba exportar como JPEG desde el iPhone o usa otro navegador.`,
    );
  }
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error("No se pudo leer el archivo de imagen."));
    reader.onload = (event) => resolve(event.target.result);
    reader.readAsDataURL(file);
  });

const loadImageFromDataUrl = (dataUrl) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () =>
      reject(
        new Error("Formato de imagen no compatible o archivo corrupto."),
      );
    img.onload = () => resolve(img);
    img.src = dataUrl;
  });

const canvasToWebpBlob = (canvas, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Error al comprimir la imagen a WebP."));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      quality,
    );
  });

/**
 * Master WebP para storage. Telas: más ancho y calidad (textura).
 * HEIC se normaliza a JPEG antes del canvas.
 */
const optimizeImage = async (file, isFabric = false) => {
  const MAX_WIDTH = isFabric ? 1400 : 1200;
  const quality = isFabric ? 0.9 : 0.8;

  let inputFile = file;
  if (isHeicFile(file)) {
    inputFile = await convertHeicToJpegFile(file);
  }

  const dataUrl = await readFileAsDataUrl(inputFile);
  const img = await loadImageFromDataUrl(dataUrl);

  let width = img.width;
  let height = img.height;
  if (!width || !height) {
    throw new Error("La imagen no tiene dimensiones válidas.");
  }

  if (width > MAX_WIDTH) {
    height *= MAX_WIDTH / width;
    width = MAX_WIDTH;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo procesar la imagen en este navegador.");
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await canvasToWebpBlob(canvas, quality);
  const outName = inputFile.name.replace(/\.[^/.]+$/, ".webp");

  return new File([blob], outName, { type: "image/webp" });
};

const uploadAdminImage = async (file, folder, isFabric = folder === "telas") => {
  const optimizedFile = await optimizeImage(file, isFabric);

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

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
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
  const [fabricFamilyPendingDelete, setFabricFamilyPendingDelete] =
    useState(null);
  const [newModuloLabel, setNewModuloLabel] = useState("");
  const [moduleLabelDrafts, setModuleLabelDrafts] = useState({});

  // Agrupamos las telas por tipo para la visualización en la tabla
  const groupedFabrics = React.useMemo(() => {
    return fabrics.reduce((acc, tela) => {
      const tipo = tela.nombre_tipo;
      if (!acc[tipo]) {
        acc[tipo] = {
          ...tela,
          nombre_tipo: tipo,
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

  // Manejador específico para el JSONB de 'detalles' (descripcion_larga, etc.)
  const handleProductDetailChange = (subField, value, parent = "descripcion_larga") => {
    setEditingProduct((prev) => {
      const newDetails = { ...(prev.detalles || {}) };

      if (parent === "descripcion_larga") {
        newDetails.descripcion_larga = {
          ...(newDetails.descripcion_larga || {}),
        };
        newDetails.descripcion_larga[subField] = value;
      }

      return { ...prev, detalles: newDetails };
    });
  };

  const handleMedidaDimensionChange = (moduleKey, dimension, value) => {
    setEditingProduct((prev) => {
      const newDetails = { ...(prev.detalles || {}) };
      const medidas = { ...(newDetails.medidas || {}) };
      medidas[moduleKey] = {
        ...(medidas[moduleKey] || {}),
        [dimension]: value,
      };
      newDetails.medidas = medidas;
      return { ...prev, detalles: newDetails };
    });
  };

  const handleAddMedidaModule = (label = "") => {
    const displayLabel = (label || newModuloLabel || "").trim() || "Nuevo módulo";
    const medidas = editingProduct?.detalles?.medidas || {};
    const moduleKey = getUniqueModuloSlug(displayLabel, medidas);

    setEditingProduct((prev) => {
      const newDetails = { ...(prev.detalles || {}) };
      const nextMedidas = { ...(newDetails.medidas || {}) };
      nextMedidas[moduleKey] = Object.fromEntries(
        DIMENSIONES_ESTANDAR.map((dim) => [dim, ""]),
      );
      newDetails.medidas = nextMedidas;
      return { ...prev, detalles: newDetails };
    });

    setNewModuloLabel("");
    toast.success(`Módulo "${humanizeModuloKey(moduleKey)}" agregado`);
  };

  const handleRemoveMedidaModule = (moduleKey) => {
    const moduleData = editingProduct?.detalles?.medidas?.[moduleKey];
    const hasData =
      moduleData &&
      Object.values(moduleData).some((v) => v != null && String(v).trim() !== "");

    if (
      hasData &&
      !window.confirm(
        `¿Eliminar el módulo "${humanizeModuloKey(moduleKey)}" y sus medidas?`,
      )
    ) {
      return;
    }

    setEditingProduct((prev) => {
      const newDetails = { ...(prev.detalles || {}) };
      const medidas = { ...(newDetails.medidas || {}) };
      delete medidas[moduleKey];
      newDetails.medidas = medidas;
      return { ...prev, detalles: newDetails };
    });

    setModuleLabelDrafts((prev) => {
      const next = { ...prev };
      delete next[moduleKey];
      return next;
    });
  };

  const handleRenameMedidaModule = (oldKey, newLabel) => {
    const trimmed = (newLabel || "").trim();
    if (!trimmed) {
      toast.error("El nombre del módulo no puede estar vacío.");
      return;
    }

    const newKey = slugifyModulo(trimmed);
    if (!newKey) {
      toast.error("El nombre del módulo no es válido.");
      return;
    }

    if (newKey === oldKey) return;

    const medidas = editingProduct?.detalles?.medidas || {};
    if (medidas[newKey]) {
      toast.error(`Ya existe un módulo llamado "${humanizeModuloKey(newKey)}".`);
      return;
    }

    setEditingProduct((prev) => {
      const newDetails = { ...(prev.detalles || {}) };
      const nextMedidas = { ...(newDetails.medidas || {}) };
      if (!nextMedidas[oldKey]) return prev;
      nextMedidas[newKey] = nextMedidas[oldKey];
      delete nextMedidas[oldKey];
      newDetails.medidas = nextMedidas;
      return { ...prev, detalles: newDetails };
    });

    setModuleLabelDrafts((prev) => {
      const next = { ...prev };
      delete next[oldKey];
      delete next[newKey];
      return next;
    });
  };

  const handleModuloLabelBlur = (moduleKey) => {
    const draft = moduleLabelDrafts[moduleKey];
    if (draft === undefined) return;
    handleRenameMedidaModule(moduleKey, draft);
    setModuleLabelDrafts((prev) => {
      const next = { ...prev };
      delete next[moduleKey];
      return next;
    });
  };

  useEffect(() => {
    if (!isProductModalOpen) {
      setNewModuloLabel("");
      setModuleLabelDrafts({});
    }
  }, [isProductModalOpen]);

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

      updatedProduct = {
        ...updatedProduct,
        detalles: {
          ...updatedProduct.detalles,
          medidas: sanitizeMedidas(updatedProduct.detalles?.medidas),
        },
      };

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
      const parsedValue = field === "disponible" ? value === true || value === "true" : value;
      newColores[index] = { ...newColores[index], [field]: parsedValue };
      return { ...prev, colores: newColores };
    });
  };

  const handleSetAllFabricColorsDisponible = (disponible) => {
    setEditingFabric((prev) => {
      if (!prev?.colores?.length) return prev;
      return {
        ...prev,
        colores: prev.colores.map((col) => ({ ...col, disponible })),
      };
    });
    toast.info(
      disponible
        ? "Todos los colores quedarán visibles en la tienda al guardar."
        : "Todos los colores quedarán ocultos en la tienda al guardar.",
    );
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

  // Quitar un color de la lista (solo en memoria, aún no guardado en BD)
  const handleRemoveFabricColor = (index) => {
    setEditingFabric((prev) => ({
      ...prev,
      colores: prev.colores.filter((_, i) => i !== index),
    }));
  };

  const openDeleteFabricFamilyConfirm = (grupo, event) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();

    const nombre_tipo = String(
      grupo?.nombre_tipo ?? grupo?.colores?.[0]?.nombre_tipo ?? "",
    ).trim();

    if (!nombre_tipo) {
      toast.error("No se pudo identificar la familia de tela a eliminar.");
      return;
    }

    setFabricFamilyPendingDelete({
      nombre_tipo,
      variantes: grupo?.colores?.length ?? 0,
    });
  };

  const closeDeleteFabricFamilyConfirm = () => {
    if (!loadingItems) {
      setFabricFamilyPendingDelete(null);
    }
  };

  const confirmDeleteFabricFamily = async () => {
    if (!fabricFamilyPendingDelete) return;

    const { nombre_tipo } = fabricFamilyPendingDelete;

    try {
      setLoadingItems(true);
      const { error } = await supabase
        .from("telas")
        .delete()
        .eq("nombre_tipo", nombre_tipo);

      if (error) {
        if (error.code === "23503") {
          toast.error(
            "No puedes eliminar esta tela porque tiene ventas asociadas, puedes ocultarla.",
          );
          return;
        }
        throw error;
      }

      setFabrics((prev) =>
        prev.filter((t) => t.nombre_tipo !== nombre_tipo),
      );
      if (editingFabric?.nombre_tipo === nombre_tipo) {
        setIsFabricModalOpen(false);
        setEditingFabric(null);
      }
      setFabricFamilyPendingDelete(null);
      toast.success(`Familia "${nombre_tipo}" eliminada correctamente`);
    } catch (err) {
      console.error(err);
      toast.error("Error al eliminar la familia de tela");
    } finally {
      setLoadingItems(false);
    }
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

      // 1. Procesar cada color: subir imágenes y armar filas (insert vs update separados)
      const coloresProcesados = await Promise.all(
        colores.map(async (col) => {
          let finalUrl = col.imagen_url;

          if (col.imagen_url instanceof File) {
            finalUrl = await uploadAdminImage(col.imagen_url, "telas", true);
          }

          const baseRow = {
            nombre_tipo,
            nombre_color: col.nombre_color,
            descripcion,
            imagen_url: finalUrl,
            costo_adicional_por_metro: col.costo_adicional_por_metro,
            disponible: col.disponible === true,
          };

          const existingId =
            col.id != null && String(col.id).trim().length > 0
              ? String(col.id).trim()
              : null;

          return existingId ? { ...baseRow, id: existingId } : baseRow;
        }),
      );

      const filasInsert = coloresProcesados.filter((row) => !row.id);
      const filasUpdate = coloresProcesados.filter((row) => row.id);

      // PostgREST no admite upsert en lote con filas con/sin id mezcladas (id ausente → NULL)
      if (filasInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("telas")
          .insert(filasInsert);
        if (insertError) throw insertError;
      }

      if (filasUpdate.length > 0) {
        const { error: updateError } = await supabase
          .from("telas")
          .upsert(filasUpdate, { onConflict: "id" });
        if (updateError) throw updateError;
      }

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
      try {
        localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, "true");
      } catch {
        /* storage bloqueado; sesión solo en memoria */
      }
      toast.success("Acceso concedido");
      setIsAuthenticated(true);
    } else {
      toast.error("Código de acceso incorrecto");
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setIsAuthenticated(false);
    setInputCode("");
    setSelectedOrder(null);
    setIsProductModalOpen(false);
    setIsFabricModalOpen(false);
    setFabricFamilyPendingDelete(null);
    toast.info("Sesión cerrada");
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
      <div className="admin-panel-topbar">
        <button
          type="button"
          className="admin-logout-btn"
          onClick={handleLogout}
        >
          Cerrar sesión
        </button>
        <div className="admin-nav-tabs-scroll" role="tablist" aria-label="Secciones del panel">
          <div className="admin-nav-tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "orders"}
              className={activeTab === "orders" ? "active" : ""}
              onClick={() => setActiveTab("orders")}
            >
              Gestión de Pedidos
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "products"}
              className={activeTab === "products" ? "active" : ""}
              onClick={() => setActiveTab("products")}
            >
              Catálogo de Muebles
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "fabrics"}
              className={activeTab === "fabrics" ? "active" : ""}
              onClick={() => setActiveTab("fabrics")}
            >
              Muestrario de Telas
            </button>
          </div>
        </div>
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
                      medidas: {},
                      descripcion_larga: { base: "", sabor: "", cta: "" },
                      galeria: [],
                    },
                  });
                  setIsProductModalOpen(true);
                } else {
                  setEditingFabric({
                    nombre_tipo: "",
                    descripcion: "",
                    costo_adicional_por_metro: 0,
                    colores: [],
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
          <div className="orders-table-container orders-table-scroll">
            <table className="orders-table orders-table--wide">
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
            <div className="orders-table-container admin-table-mobile-cards">
              <table className="orders-table admin-catalog-table">
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
                      <td data-label="Miniatura">
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
                      <td data-label="Nombre">
                        <strong>{prod.nombre}</strong>
                        <br />
                        <small style={{ color: "#888" }}>
                          {prod.categoria}
                        </small>
                      </td>
                      <td data-label="Precio base">
                        {formatPriceUYU(prod.precio_base)}
                      </td>
                      <td data-label="Estado">
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
                      <td data-label="Acciones">
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
            <div className="orders-table-container admin-table-mobile-cards">
              <table className="orders-table admin-catalog-table">
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
                        <td data-label="Muestra">
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
                        <td data-label="Tipo">
                          <strong>{grupo.nombre_tipo}</strong>
                          <br />
                          <small style={{ color: "#888" }}>
                            {grupo.colores.length} variantes de color
                          </small>
                        </td>
                        <td data-label="Costo extra (m)">
                          {/* Si hay precios distintos en la familia, avisamos con un '+' */}
                          {new Set(
                            grupo.colores.map(
                              (c) => c.costo_adicional_por_metro,
                            ),
                          ).size > 1
                            ? `Desde ${formatPriceUYU(Math.min(...grupo.colores.map((c) => c.costo_adicional_por_metro)))}`
                            : formatPriceUYU(grupo.costo_adicional_por_metro)}
                        </td>
                        <td data-label="Estado">
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
                        <td data-label="Acciones">
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
                                  colores: grupo.colores.map((c) => ({
                                    ...c,
                                    disponible: c.disponible !== false,
                                  })),
                                });
                                setIsFabricModalOpen(true);
                              }}
                            >
                              Gestionar
                            </button>
                            <button
                              type="button"
                              className="cta-button delete-btn-small admin-delete-family-btn"
                              onClick={(e) =>
                                openDeleteFabricFamilyConfirm(grupo, e)
                              }
                              disabled={loadingItems}
                              title={`Eliminar familia ${grupo.nombre_tipo}`}
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

          {/* --- MEDIDAS POR MÓDULO (JSONB dinámico) --- */}
          <div className="order-detail-section medidas-modulos-section">
            <div className="medidas-modulos-header">
              <h3>Medidas por módulo</h3>
              <div className="medidas-modulos-add-row">
                <input
                  type="text"
                  className="admin-field-input"
                  placeholder="Ej: Mesa Puente, Isla, Puff..."
                  value={newModuloLabel}
                  onChange={(e) => setNewModuloLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddMedidaModule();
                    }
                  }}
                />
                <button
                  type="button"
                  className="cta-button"
                  style={{ padding: "8px 16px", fontSize: "0.85rem", flexShrink: 0 }}
                  onClick={() => handleAddMedidaModule()}
                >
                  + Agregar módulo
                </button>
              </div>
            </div>

            {Object.keys(editingProduct?.detalles?.medidas || {}).length === 0 ? (
              <p className="medidas-modulos-empty">
                Sin módulos. Agrega uno (ej: Sofá, Isla, Butaca) e ingresa ancho,
                alto y profundidad.
              </p>
            ) : (
              <div className="medidas-modulos-list">
                {Object.entries(editingProduct?.detalles?.medidas || {}).map(
                  ([moduleKey, dimensiones]) => (
                    <div key={moduleKey} className="medidas-modulo-card">
                      <div className="medidas-modulo-card-header">
                        <div className="admin-field-group medidas-modulo-name-field">
                          <label>Nombre del módulo</label>
                          <input
                            type="text"
                            className="admin-field-input"
                            value={
                              moduleLabelDrafts[moduleKey] ??
                              humanizeModuloKey(moduleKey)
                            }
                            onChange={(e) =>
                              setModuleLabelDrafts((prev) => ({
                                ...prev,
                                [moduleKey]: e.target.value,
                              }))
                            }
                            onBlur={() => handleModuloLabelBlur(moduleKey)}
                          />
                          <span className="medidas-modulo-slug-hint">
                            Clave: <code>{moduleKey}</code>
                          </span>
                        </div>
                        <button
                          type="button"
                          className="cta-button secondary medidas-modulo-remove-btn"
                          onClick={() => handleRemoveMedidaModule(moduleKey)}
                        >
                          Eliminar
                        </button>
                      </div>

                      <div className="form-group-grid">
                        {DIMENSIONES_ESTANDAR.map((dim) => (
                          <div key={dim} className="admin-field-group">
                            <label>
                              {NOMBRES_DIMENSIONES[dim] || dim}
                              {dim === "ancho" ? " (ej: 170 cm)" : ""}
                            </label>
                            <input
                              type="text"
                              className="admin-field-input"
                              value={dimensiones?.[dim] || ""}
                              onChange={(e) =>
                                handleMedidaDimensionChange(
                                  moduleKey,
                                  dim,
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
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

            <div className="admin-field-group fabric-global-visibility">
              <label>Visibilidad en catálogo (toda la familia)</label>
              <p className="fabric-visibility-hint">
                Ocultar un color lo mantiene en la base de datos (pedidos antiguos) pero
                no aparece en la tienda.
              </p>
              <div className="fabric-visibility-actions">
                <button
                  type="button"
                  className="cta-button secondary fabric-visibility-btn"
                  onClick={() => handleSetAllFabricColorsDisponible(true)}
                  disabled={!editingFabric?.colores?.length}
                >
                  Mostrar todos
                </button>
                <button
                  type="button"
                  className="cta-button secondary fabric-visibility-btn fabric-visibility-btn--hide"
                  onClick={() => handleSetAllFabricColorsDisponible(false)}
                  disabled={!editingFabric?.colores?.length}
                >
                  Ocultar todos
                </button>
              </div>
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
                    <th style={{ padding: "10px" }}>Visible</th>
                    <th style={{ padding: "10px" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {editingFabric?.colores?.map((col, index) => (
                    <tr
                      key={col.id ?? `color-${index}`}
                      style={{
                        borderBottom: "1px solid #eee",
                        opacity: col.disponible === false ? 0.55 : 1,
                      }}
                    >
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
                        <label className="fabric-color-visibility-toggle">
                          <input
                            type="checkbox"
                            checked={col.disponible !== false}
                            onChange={(e) =>
                              handleFabricColorChange(
                                index,
                                "disponible",
                                e.target.checked,
                              )
                            }
                          />
                          <span>
                            {col.disponible === false ? "Oculto" : "Visible"}
                          </span>
                        </label>
                      </td>
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <button
                          type="button"
                          className="admin-fabric-remove-color-btn"
                          onClick={() => handleRemoveFabricColor(index)}
                          disabled={loadingItems}
                          title="Quitar de la lista (no borra en BD hasta guardar)"
                          aria-label="Quitar color de la lista"
                        >
                          ✕
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
            <button
              className="cta-button"
              onClick={handleSaveFabric}
              disabled={loadingItems}
            >
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
          <div className="modal-content order-detail-modal-content">
            <div className="order-detail-section order-detail-summary">
              <h3>Resumen del pedido</h3>
              <dl className="order-detail-dl">
                <div className="order-detail-dl-row">
                  <dt>Fecha</dt>
                  <dd>
                    {selectedOrder.created_at
                      ? new Date(selectedOrder.created_at).toLocaleString(
                          "es-UY",
                        )
                      : "—"}
                  </dd>
                </div>
                <div className="order-detail-dl-row">
                  <dt>Total</dt>
                  <dd>{formatPriceUYU(selectedOrder.total_pedido)}</dd>
                </div>
                <div className="order-detail-dl-row">
                  <dt>Estado</dt>
                  <dd>{selectedOrder.estado || "—"}</dd>
                </div>
                <div className="order-detail-dl-row">
                  <dt>Pago</dt>
                  <dd>
                    {selectedOrder.cuenta_bancaria_id
                      ? "Transferencia bancaria"
                      : "Mercado Pago"}
                  </dd>
                </div>
                <div className="order-detail-dl-row">
                  <dt>Entrega</dt>
                  <dd>
                    {selectedOrder.datos_cliente?.shippingMethod === "envio"
                      ? "Envío a domicilio"
                      : "Retiro en local"}
                  </dd>
                </div>
              </dl>
            </div>
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

      {/* Confirmación eliminar familia (al final, junto al resto de modales) */}
      <Modal
        isOpen={fabricFamilyPendingDelete !== null}
        onRequestClose={closeDeleteFabricFamilyConfirm}
        className="admin-delete-confirm-modal"
        overlayClassName="admin-delete-confirm-overlay"
        contentLabel="Confirmar eliminación de familia de tela"
        shouldCloseOnOverlayClick={!loadingItems}
        shouldCloseOnEsc={!loadingItems}
      >
        <div className="admin-delete-confirm-content">
          <div className="admin-delete-confirm-icon" aria-hidden="true">
            🗑️
          </div>
          <h3 className="admin-delete-confirm-title">
            ¿Eliminar familia de tela?
          </h3>
          <p className="admin-delete-confirm-message">
            Vas a eliminar permanentemente la familia{" "}
            <strong>{fabricFamilyPendingDelete?.nombre_tipo}</strong> y sus{" "}
            <strong>{fabricFamilyPendingDelete?.variantes}</strong>{" "}
            {fabricFamilyPendingDelete?.variantes === 1
              ? "variante de color"
              : "variantes de color"}
            . Esta acción no se puede deshacer.
          </p>
          <div className="admin-delete-confirm-actions">
            <button
              type="button"
              className="cta-button secondary"
              onClick={closeDeleteFabricFamilyConfirm}
              disabled={loadingItems}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="cta-button admin-delete-confirm-submit"
              onClick={confirmDeleteFabricFamily}
              disabled={loadingItems}
            >
              {loadingItems ? "Eliminando…" : "Sí, eliminar"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminPage;
