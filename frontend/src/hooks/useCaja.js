import { useState, useEffect, useCallback, useMemo } from 'react';
import { menuService } from '../api/menuService';
import { orderService } from '../api/orderService';
import { reportService } from '../api/reportService';
import { socketClient } from '../api/socketService';
import { COSTO_DOMICILIO } from '../api/config';
import { esSoloTexto } from '../utils/validators';

/**
 * Custom Hook que encapsula el estado, cálculos matemáticos, validaciones, atajos de teclado y comunicación API del módulo Caja.
 */
export function useCaja() {
    const [platos, setPlatos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [carrito, setCarrito] = useState([]);
    const [clientesActivos, setClientesActivos] = useState([]);
    const [cargandoMenu, setCargandoMenu] = useState(true);

    const [busqueda, setBusqueda] = useState('');
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');

    const [cliente, setCliente] = useState('');
    const [horaProgramada, setHoraProgramada] = useState('');
    const [comentarios, setComentarios] = useState('');

    const [esDomicilio, setEsDomicilio] = useState(false);
    const [esRetiro, setEsRetiro] = useState(false);
    const [esPersonal, setEsPersonal] = useState(false);
    const [esTransferencia, setEsTransferencia] = useState(false);

    const [direccion, setDireccion] = useState('');
    const [telefono, setTelefono] = useState('');

    const [modalClientes, setModalClientes] = useState(false);
    const [esExtra, setEsExtra] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [errores, setErrores] = useState({});
    const [notificacion, setNotificacion] = useState(null);

    const mostrarNotificacion = useCallback((mensaje, tipo) => {
        setNotificacion({ mensaje, tipo });
        setTimeout(() => setNotificacion(null), 3000);
    }, []);

    const cargarDatos = useCallback(async () => {
        try {
            const [resPlatos, resCat] = await Promise.all([
                menuService.getPlatos(),
                menuService.getCategorias()
            ]);
            setPlatos(Array.isArray(resPlatos.data) ? resPlatos.data : []);
            setCategorias(Array.isArray(resCat.data) ? resCat.data : []);
        } catch {
            mostrarNotificacion('Error conectando al servidor', 'error');
            setPlatos([]);
            setCategorias([]);
        } finally {
            setCargandoMenu(false);
        }
    }, [mostrarNotificacion]);

    const cargarClientesActivos = useCallback(async () => {
        try {
            const res = await reportService.getReporteHoy();
            const ordenes = Array.isArray(res.data?.listaOrdenes) ? res.data.listaOrdenes : [];
            const unicos = {};
            ordenes.forEach(o => {
                if (o.estado !== 'anulado') {
                    unicos[o.cliente] = {
                        nombre: o.cliente,
                        tipo: o.tipo_entrega,
                        direccion: o.direccion,
                        telefono: o.telefono
                    };
                }
            });
            setClientesActivos(Object.values(unicos));
        } catch {
            setClientesActivos([]);
        }
    }, []);

    useEffect(() => {
        cargarDatos();
        cargarClientesActivos();

        const actualizarPanel = () => {
            cargarDatos();
            cargarClientesActivos();
        };

        socketClient.on('nueva_orden', actualizarPanel);
        socketClient.on('orden_lista', actualizarPanel);
        socketClient.on('orden_anulada', actualizarPanel);
        socketClient.on('menu_actualizado', cargarDatos);

        return () => {
            socketClient.off('nueva_orden', actualizarPanel);
            socketClient.off('orden_lista', actualizarPanel);
            socketClient.off('orden_anulada', actualizarPanel);
            socketClient.off('menu_actualizado', cargarDatos);
        };
    }, [cargarDatos, cargarClientesActivos]);

    const formatearHoraInteligente = (hora24) => {
        if (!hora24) return null;
        const [horas, minutos] = hora24.split(':');
        let h = parseInt(horas, 10);
        if (h >= 1 && h <= 6) h += 12;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutos} ${ampm}`;
    };

    const obtenerStockVisual = useCallback(
        (plato) => {
            const listaPlatos = Array.isArray(platos) ? platos : [];
            if (plato.id_padre) {
                const padre = listaPlatos.find(p => p.id === plato.id_padre);
                return padre ? padre.stock : 0;
            }
            return plato.stock;
        },
        [platos]
    );

    const platosFiltrados = useMemo(() => {
        const listaPlatosSegura = Array.isArray(platos) ? platos : [];
        return listaPlatosSegura.filter(plato => {
            const stockDisponible = obtenerStockVisual(plato);
            const coincideTexto = (plato.nombre || '').toLowerCase().includes(busqueda.toLowerCase());
            const coincideCategoria = categoriaSeleccionada === '' || plato.categoria === categoriaSeleccionada;
            return stockDisponible > 0 && coincideTexto && coincideCategoria;
        });
    }, [platos, busqueda, categoriaSeleccionada, obtenerStockVisual]);

    const tipoEntregaActual = useMemo(() => {
        if (esDomicilio) return 'domicilio';
        if (esRetiro) return 'retiro';
        if (esPersonal) return 'personal';
        return 'mesa';
    }, [esDomicilio, esRetiro, esPersonal]);

    const seleccionarTipoEntrega = useCallback((tipo) => {
        setEsDomicilio(tipo === 'domicilio');
        setEsRetiro(tipo === 'retiro');
        setEsPersonal(tipo === 'personal');
        if (tipo === 'personal') {
            setEsTransferencia(false);
        }
        if (tipo !== 'domicilio') {
            setErrores(prev => ({ ...prev, direccion: false, telefono: false }));
        }
    }, []);

    const seleccionarClienteActivo = useCallback(
        (c) => {
            setCliente(c.nombre);
            if (c.tipo === 'domicilio') {
                seleccionarTipoEntrega('domicilio');
            } else if (c.tipo === 'retiro') {
                seleccionarTipoEntrega('retiro');
            } else {
                seleccionarTipoEntrega('mesa');
            }
            setDireccion(c.direccion || '');
            setTelefono(c.telefono || '');
            setEsExtra(true);
            setModalClientes(false);
            mostrarNotificacion(`Agregando extras para ${c.nombre}`, 'exito');
        },
        [mostrarNotificacion, seleccionarTipoEntrega]
    );

    const agregarPlato = useCallback(
        (plato) => {
            const stockDisponible = obtenerStockVisual(plato);
            if (stockDisponible <= 0) return;

            setCarrito(prevCarrito => {
                let enCarrito = 0;
                const idGrupo = plato.id_padre || plato.id;

                prevCarrito.forEach(item => {
                    const idItemGrupo = item.id_padre || item.id;
                    if (idItemGrupo === idGrupo) enCarrito += item.cantidad;
                });

                if (enCarrito + 1 > stockDisponible) {
                    mostrarNotificacion(`Solo quedan ${stockDisponible} unidades compartidas`, 'error');
                    return prevCarrito;
                }

                const existe = prevCarrito.find(item => item.id === plato.id);
                if (existe) {
                    return prevCarrito.map(item =>
                        item.id === plato.id ? { ...item, cantidad: item.cantidad + 1 } : item
                    );
                }
                return [...prevCarrito, { ...plato, cantidad: 1 }];
            });

            setErrores(prev => (prev.carrito ? { ...prev, carrito: false } : prev));
        },
        [obtenerStockVisual, mostrarNotificacion]
    );

    const quitarPlato = useCallback((id) => {
        setCarrito(prevCarrito => {
            const existe = prevCarrito.find(item => item.id === id);
            if (!existe) return prevCarrito;
            if (existe.cantidad > 1) {
                return prevCarrito.map(item =>
                    item.id === id ? { ...item, cantidad: item.cantidad - 1 } : item
                );
            }
            return prevCarrito.filter(item => item.id !== id);
        });
    }, []);

    const handleNombreChange = (e) => {
        const valor = e.target.value;
        if (esSoloTexto(valor)) {
            setCliente(valor);
            if (esExtra && valor === '') setEsExtra(false);
            if (errores.cliente) setErrores(prev => ({ ...prev, cliente: false }));
        }
    };

    const handleComentariosChange = (e) => {
        const valor = e.target.value;
        if (esSoloTexto(valor)) {
            setComentarios(valor);
        }
    };

    const handleTelefonoChange = (e) => {
        const valor = e.target.value;
        if (/^\d*$/.test(valor) && valor.length <= 8) {
            setTelefono(valor);
            if (errores.telefono && valor.length === 8) {
                setErrores(prev => ({ ...prev, telefono: false }));
            }
        }
    };

    const handleDireccionChange = useCallback((valor) => {
        setDireccion(valor);
        if (valor.trim()) {
            setErrores(prev => (prev.direccion ? { ...prev, direccion: false } : prev));
        }
    }, []);

    const toggleDomicilio = () => seleccionarTipoEntrega(esDomicilio ? 'mesa' : 'domicilio');
    const toggleRetiro = () => seleccionarTipoEntrega(esRetiro ? 'mesa' : 'retiro');
    const togglePersonal = () => seleccionarTipoEntrega(esPersonal ? 'mesa' : 'personal');

    const cancelarModoExtra = () => {
        setEsExtra(false);
        setCliente('');
    };

    const limpiarFormulario = useCallback(() => {
        setCarrito([]);
        setCliente('');
        setHoraProgramada('');
        setDireccion('');
        setTelefono('');
        setComentarios('');
        setBusqueda('');
        setEsDomicilio(false);
        setEsRetiro(false);
        setEsPersonal(false);
        setEsExtra(false);
        setEsTransferencia(false);
        setErrores({});
    }, []);

    const validarFormulario = useCallback(() => {
        const nuevosErrores = {};
        if (!cliente.trim()) nuevosErrores.cliente = true;
        if (carrito.length === 0) nuevosErrores.carrito = true;
        if (esDomicilio) {
            if (!direccion.trim()) nuevosErrores.direccion = true;
            if (!telefono.trim() || telefono.length !== 8) nuevosErrores.telefono = true;
        }
        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    }, [cliente, carrito.length, esDomicilio, direccion, telefono]);

    const subtotal = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    const costoEnvio = esDomicilio && !esExtra && !esPersonal ? COSTO_DOMICILIO : 0;
    const total = esPersonal ? 0 : subtotal + costoEnvio;

    const procesarOrden = useCallback(async () => {
        if (enviando) return;
        if (!validarFormulario()) {
            mostrarNotificacion('Completa los datos obligatorios marcados en rojo', 'error');
            return;
        }
        setEnviando(true);

        const nombreFinal = esExtra ? `${cliente} (EXTRA)` : cliente;
        let tipoFinal = 'mesa';
        if (esDomicilio) tipoFinal = 'domicilio';
        if (esRetiro) tipoFinal = 'retiro';
        if (esPersonal) tipoFinal = 'personal';

        const orden = {
            cliente: nombreFinal,
            total,
            detalles: carrito,
            tipo_entrega: tipoFinal,
            direccion: esDomicilio ? direccion : '',
            telefono,
            comentarios,
            metodo_pago: esTransferencia ? 'transferencia' : 'efectivo',
            hora_programada: formatearHoraInteligente(horaProgramada)
        };

        try {
            await orderService.createOrden(orden);
            mostrarNotificacion('Orden enviada a cocina', 'exito');
            limpiarFormulario();
            cargarDatos();
            cargarClientesActivos();
        } catch {
            mostrarNotificacion('Error al procesar la orden', 'error');
        } finally {
            setEnviando(false);
        }
    }, [
        enviando,
        validarFormulario,
        mostrarNotificacion,
        esExtra,
        cliente,
        esDomicilio,
        esRetiro,
        esPersonal,
        total,
        carrito,
        direccion,
        telefono,
        comentarios,
        esTransferencia,
        horaProgramada,
        limpiarFormulario,
        cargarDatos,
        cargarClientesActivos
    ]);

    // Flujo de teclado optimizado (Keybindings: Enter para confirmar, Esc para limpiar/cerrar, 1-9 o Alt+1-9 para platos rápidos)
    useEffect(() => {
        const handleKeyDown = (e) => {
            const tag = document.activeElement?.tagName?.toLowerCase();
            const esInputTexto = tag === 'input' || tag === 'textarea' || tag === 'select';

            if (e.key === 'Escape') {
                e.preventDefault();
                if (modalClientes) {
                    setModalClientes(false);
                } else {
                    if (document.activeElement && document.activeElement.blur) {
                        document.activeElement.blur();
                    }
                    limpiarFormulario();
                    mostrarNotificacion('Formulario limpiado (Esc)', 'exito');
                }
                return;
            }

            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || (!esInputTexto && carrito.length > 0))) {
                e.preventDefault();
                procesarOrden();
                return;
            }

            // Atajos numéricos 1-9 (directos cuando no se escribe en un input, o con Alt+1..9 en cualquier momento)
            if (/^[1-9]$/.test(e.key) && (!esInputTexto || e.altKey)) {
                const idx = parseInt(e.key, 10) - 1;
                if (platosFiltrados[idx]) {
                    e.preventDefault();
                    agregarPlato(platosFiltrados[idx]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [modalClientes, carrito.length, platosFiltrados, agregarPlato, limpiarFormulario, procesarOrden, mostrarNotificacion]);

    return {
        categorias,
        platosFiltrados,
        carrito,
        clientesActivos,
        cargandoMenu,
        busqueda,
        setBusqueda,
        categoriaSeleccionada,
        setCategoriaSeleccionada,
        cliente,
        horaProgramada,
        setHoraProgramada,
        comentarios,
        esDomicilio,
        esRetiro,
        esPersonal,
        tipoEntregaActual,
        seleccionarTipoEntrega,
        esTransferencia,
        setEsTransferencia,
        direccion,
        setDireccion: handleDireccionChange,
        telefono,
        modalClientes,
        setModalClientes,
        esExtra,
        enviando,
        errores,
        notificacion,
        subtotal,
        total,
        obtenerStockVisual,
        seleccionarClienteActivo,
        agregarPlato,
        quitarPlato,
        handleNombreChange,
        handleComentariosChange,
        handleTelefonoChange,
        toggleDomicilio,
        toggleRetiro,
        togglePersonal,
        cancelarModoExtra,
        limpiarFormulario,
        procesarOrden
    };
}
