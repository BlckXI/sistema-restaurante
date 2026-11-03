import { useState, useEffect, useCallback, useMemo } from 'react';
import { menuService } from './api/menuService';
import { socketClient } from './api/socketService';
import {
    esNombrePlato,
    esEntradaMontoPositivo,
    esMontoPositivoValido,
    esEntradaEnteroPositivo,
    esEnteroNoNegativoValido
} from './utils/validators';
import CatalogoPlatosInventario from './components/inventario/CatalogoPlatosInventario';
import ModalReiniciarStock from './components/inventario/ModalReiniciarStock';

export default function Inventario() {
    const [platos, setPlatos] = useState([]);
    const [categorias, setCategorias] = useState([]);

    const [busqueda, setBusqueda] = useState('');
    const [filtroCategoria, setFiltroCategoria] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');

    const [idEdicion, setIdEdicion] = useState(null);
    const [nombre, setNombre] = useState('');
    const [precio, setPrecio] = useState('');
    const [stock, setStock] = useState('');
    const [categoria, setCategoria] = useState('');
    const [idPadre, setIdPadre] = useState('');

    const [busquedaPadre, setBusquedaPadre] = useState('');
    const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

    const [nuevaCat, setNuevaCat] = useState('');

    const [cargando, setCargando] = useState(false);
    const [notificacion, setNotificacion] = useState(null);
    const [modalEliminar, setModalEliminar] = useState(null);

    // Modal de acción protegida: Reinicio de stock a 0
    const [modalReiniciar, setModalReiniciar] = useState(false);
    const [ejecutandoReinicio, setEjecutandoReinicio] = useState(false);

    const mostrarNotificacion = useCallback((mensaje, tipo) => {
        setNotificacion({ mensaje, tipo });
        setTimeout(() => setNotificacion(null), 3500);
    }, []);

    const cargarDatos = useCallback(async () => {
        try {
            const [resPlatos, resCat] = await Promise.all([
                menuService.getPlatos(),
                menuService.getCategorias()
            ]);
            const listaPlatos = Array.isArray(resPlatos.data) ? resPlatos.data : [];
            const listaCategorias = Array.isArray(resCat.data) ? resCat.data : [];
            setPlatos(listaPlatos);
            setCategorias(listaCategorias);

            setCategoria(prev => (prev || (listaCategorias.length > 0 ? listaCategorias[0].nombre : '')));
        } catch (error) {
            console.error(error);
            setPlatos([]);
            setCategorias([]);
        }
    }, []);

    useEffect(() => {
        cargarDatos();

        socketClient.on('menu_actualizado', cargarDatos);

        return () => {
            socketClient.off('menu_actualizado', cargarDatos);
        };
    }, [cargarDatos]);

    const listaPlatosEnriquecida = useMemo(() => {
        const base = Array.isArray(platos) ? platos : [];
        const mapaPorId = new Map(base.map(p => [Number(p.id), p]));

        return base.map(plato => {
            const padre = plato.id_padre ? mapaPorId.get(Number(plato.id_padre)) : null;
            const esHuerfano = Boolean(plato.id_padre && !padre);
            const stockEfectivo = padre ? Number(padre.stock || 0) : Number(plato.stock || 0);
            return {
                ...plato,
                stockEfectivo,
                nombrePadre: padre ? padre.nombre : null,
                esHuerfano
            };
        });
    }, [platos]);

    const platosFiltrados = useMemo(
        () =>
            listaPlatosEnriquecida.filter(plato => {
                const coincideTexto = (plato.nombre || '').toLowerCase().includes(busqueda.toLowerCase());
                const coincideCategoria = filtroCategoria === '' || plato.categoria === filtroCategoria;

                let coincideEstado = true;
                if (filtroEstado === 'disponibles') {
                    coincideEstado = plato.stockEfectivo > 0;
                } else if (filtroEstado === 'stockBajo') {
                    coincideEstado = plato.stockEfectivo > 0 && plato.stockEfectivo < 5;
                } else if (filtroEstado === 'agotados') {
                    coincideEstado = plato.stockEfectivo === 0;
                } else if (filtroEstado === 'porciones') {
                    coincideEstado = Boolean(plato.id_padre);
                }

                return coincideTexto && coincideCategoria && coincideEstado;
            }),
        [listaPlatosEnriquecida, busqueda, filtroCategoria, filtroEstado]
    );

    const posiblesPadres = useMemo(
        () =>
            listaPlatosEnriquecida.filter(
                p =>
                    p.id !== idEdicion &&
                    !p.id_padre &&
                    (p.nombre || '').toLowerCase().includes(busquedaPadre.toLowerCase())
            ),
        [listaPlatosEnriquecida, idEdicion, busquedaPadre]
    );

    const handleNombreChange = (e) => {
        const valor = e.target.value;
        if (esNombrePlato(valor)) {
            setNombre(valor);
        }
    };

    const handlePrecioChange = (e) => {
        const valor = e.target.value;
        if (esEntradaMontoPositivo(valor)) {
            setPrecio(valor);
        }
    };

    const handleStockChange = (e) => {
        const valor = e.target.value;
        if (esEntradaEnteroPositivo(valor)) {
            setStock(valor);
        }
    };

    const prepararEdicion = useCallback(
        plato => {
            setIdEdicion(plato.id);
            setNombre(plato.nombre || '');
            setPrecio(plato.precio !== undefined && plato.precio !== null ? String(plato.precio) : '');
            setStock(
                plato.stockEfectivo !== undefined && plato.stockEfectivo !== null
                    ? String(plato.stockEfectivo)
                    : String(plato.stock ?? 0)
            );
            setCategoria(plato.categoria);

            if (plato.id_padre) {
                const padre = listaPlatosEnriquecida.find(p => Number(p.id) === Number(plato.id_padre));
                if (padre) {
                    setIdPadre(padre.id);
                    setBusquedaPadre(padre.nombre);
                } else {
                    setIdPadre('');
                    setBusquedaPadre('');
                }
            } else {
                setIdPadre('');
                setBusquedaPadre('');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        [listaPlatosEnriquecida]
    );

    const cancelarEdicion = () => {
        setIdEdicion(null);
        setNombre('');
        setPrecio('');
        setStock('');
        setIdPadre('');
        setBusquedaPadre('');
        setMostrarSugerencias(false);
        if (categorias.length > 0) setCategoria(categorias[0].nombre);
    };

    const guardarPlato = async (e) => {
        e.preventDefault();
        if (!nombre.trim() || !esNombrePlato(nombre.trim())) {
            mostrarNotificacion('El nombre del plato no es válido', 'error');
            return;
        }
        if (!esMontoPositivoValido(precio)) {
            mostrarNotificacion('El precio debe ser positivo con máximo 2 decimales', 'error');
            return;
        }
        if (!idPadre && !esEnteroNoNegativoValido(stock)) {
            mostrarNotificacion('El stock debe ser un número entero no negativo', 'error');
            return;
        }
        if (!categoria) {
            mostrarNotificacion('Selecciona una categoría', 'error');
            return;
        }
        setCargando(true);
        try {
            const datos = {
                nombre: nombre.trim(),
                precio: parseFloat(precio),
                stock: idPadre ? 0 : parseInt(stock, 10),
                categoria,
                id_padre: idPadre || null,
                motivo_auditoria: idEdicion ? 'Actualización desde ficha' : 'Creación de plato'
            };

            if (idEdicion) {
                await menuService.updatePlato(idEdicion, datos);
                mostrarNotificacion('Plato actualizado', 'exito');
            } else {
                await menuService.createPlato(datos);
                mostrarNotificacion('Plato creado', 'exito');
            }
            cancelarEdicion();
            cargarDatos();
        } catch (err) {
            mostrarNotificacion(err.response?.data?.error || 'Error al guardar plato', 'error');
        } finally {
            setCargando(false);
        }
    };

    // Actualización rápida Inline de precio o stock (soporta platos principales y porciones)
    const guardarInline = useCallback(
        async (plato, campo, nuevoValor) => {
            try {
                const valorNumerico = campo === 'precio' ? parseFloat(nuevoValor) : parseInt(nuevoValor, 10);
                const idObjetivo =
                    campo === 'stock' && plato.id_padre && !plato.esHuerfano ? plato.id_padre : plato.id;

                const datos = {
                    [campo]: valorNumerico,
                    motivo_auditoria:
                        campo === 'stock'
                            ? `Ajuste rápido de stock a ${valorNumerico}`
                            : `Ajuste rápido de precio a $${valorNumerico.toFixed(2)}`
                };

                if (plato.esHuerfano) {
                    datos.id_padre = null;
                }

                await menuService.updatePlato(idObjetivo, datos);
                mostrarNotificacion(
                    campo === 'stock'
                        ? `Stock de "${plato.nombrePadre || plato.nombre}" actualizado a ${valorNumerico}`
                        : `Precio de "${plato.nombre}" actualizado a $${valorNumerico.toFixed(2)}`,
                    'exito'
                );
                cargarDatos();
            } catch (err) {
                mostrarNotificacion(err.response?.data?.error || 'Error al actualizar en línea', 'error');
            }
        },
        [cargarDatos, mostrarNotificacion]
    );

    // Reinicio seguro de todo el stock a 0
    const confirmarReinicioStock = async () => {
        setEjecutandoReinicio(true);
        try {
            await menuService.reiniciarStock('REINICIAR');
            mostrarNotificacion('Todo el inventario ha sido restablecido a 0', 'exito');
            setModalReiniciar(false);
            cargarDatos();
        } catch (err) {
            mostrarNotificacion(err.response?.data?.error || 'Error al reiniciar el stock diario', 'error');
        } finally {
            setEjecutandoReinicio(false);
        }
    };

    const seleccionarPadre = (platoPadre) => {
        setIdPadre(platoPadre.id);
        setBusquedaPadre(platoPadre.nombre);
        setMostrarSugerencias(false);
    };

    const limpiarPadre = () => {
        setIdPadre('');
        setBusquedaPadre('');
    };

    const solicitarEliminar = useCallback((id, tipo, nombreItem) => {
        setModalEliminar({ id, tipo, nombre: nombreItem });
    }, []);

    const confirmarEliminar = async () => {
        if (!modalEliminar) return;
        const { id, tipo } = modalEliminar;
        try {
            if (tipo === 'plato') {
                await menuService.deletePlato(id);
            } else {
                await menuService.deleteCategoria(id);
            }
            mostrarNotificacion(`${tipo === 'plato' ? 'Plato' : 'Categoría'} eliminada`, 'exito');
            cargarDatos();
        } catch (err) {
            mostrarNotificacion(err.response?.data?.error || 'Error al eliminar', 'error');
        } finally {
            setModalEliminar(null);
        }
    };

    const crearCategoria = async (e) => {
        e.preventDefault();
        if (!nuevaCat.trim()) return;
        try {
            await menuService.createCategoria({ nombre: nuevaCat });
            setNuevaCat('');
            mostrarNotificacion('Categoría agregada', 'exito');
            cargarDatos();
        } catch (err) {
            mostrarNotificacion(err.response?.data?.error || 'Error al crear categoría', 'error');
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:h-[calc(100vh-110px)] relative w-full">
            {/* MODAL DE ELIMINACIÓN */}
            {modalEliminar && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-surface rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center border border-line">
                        <h3 className="text-lg sm:text-xl font-bold text-ink mb-2">
                            ¿Eliminar &quot;{modalEliminar.nombre}&quot;?
                        </h3>
                        <p className="text-ink-muted text-sm mb-6">Esta acción no se puede deshacer.</p>
                        <div className="flex gap-3 justify-center">
                            <button
                                type="button"
                                onClick={() => setModalEliminar(null)}
                                className="flex-1 bg-surface text-ink border border-line font-bold py-2.5 px-4 rounded-lg hover:bg-surface-muted text-sm min-h-[44px]"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmarEliminar}
                                className="flex-1 bg-danger text-white font-bold py-2.5 px-4 rounded-lg hover:opacity-90 shadow-md text-sm min-h-[44px]"
                            >
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL PROTEGIDO: REINICIO DE STOCK A CERO */}
            <ModalReiniciarStock
                abierto={modalReiniciar}
                onCerrar={() => setModalReiniciar(false)}
                onConfirmar={confirmarReinicioStock}
                ejecutando={ejecutandoReinicio}
            />

            {/* NOTIFICACIÓN FLOTANTE */}
            {notificacion && (
                <div
                    className={`fixed top-16 sm:top-5 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-xl shadow-xl z-50 text-white font-bold text-sm max-w-[90vw] text-center ${
                        notificacion.tipo === 'error' ? 'bg-danger' : 'bg-success'
                    }`}
                >
                    {notificacion.mensaje}
                </div>
            )}

            {/* COLUMNA IZQUIERDA: FORMULARIOS Y ACCIONES PROTEGIDAS */}
            <div className="w-full lg:w-[360px] xl:w-[400px] shrink-0 space-y-4 lg:overflow-y-auto pr-0.5">
                {/* FORMULARIO DE PLATO */}
                <div
                    className={`p-4 sm:p-5 rounded-xl shadow-sm border transition-colors ${
                        idEdicion ? 'bg-warning-soft border-warning' : 'bg-surface border-line'
                    }`}
                >
                    <div className="flex justify-between items-center border-b border-line pb-2.5 mb-4">
                        <h2 className="text-lg sm:text-xl font-bold text-ink">
                            {idEdicion ? 'Editando Plato' : 'Nuevo Plato'}
                        </h2>
                        {idEdicion && (
                            <button
                                type="button"
                                onClick={cancelarEdicion}
                                className="text-xs font-bold text-danger-ink bg-danger-soft border border-danger/30 px-2.5 py-1 rounded hover:opacity-90"
                            >
                                Cancelar edición
                            </button>
                        )}
                    </div>
                    <form onSubmit={guardarPlato} className="space-y-3">
                        <input
                            type="text"
                            placeholder="Nombre del plato"
                            className="w-full px-3.5 py-2.5 border border-line rounded-lg text-sm text-ink bg-surface outline-none focus:ring-2 focus:ring-brand-accent min-h-[44px]"
                            value={nombre}
                            onChange={handleNombreChange}
                        />

                        <div className="grid grid-cols-2 gap-2.5">
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="Precio $"
                                className="w-full px-3.5 py-2.5 border border-line rounded-lg text-sm text-ink bg-surface outline-none focus:ring-2 focus:ring-brand-accent min-h-[44px] tabular-nums"
                                value={precio}
                                onChange={handlePrecioChange}
                            />
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="Stock"
                                className={`w-full px-3.5 py-2.5 border border-line rounded-lg text-sm outline-none min-h-[44px] tabular-nums ${
                                    idPadre ? 'bg-surface-muted text-ink-muted cursor-not-allowed' : 'bg-surface text-ink focus:ring-2 focus:ring-brand-accent'
                                }`}
                                value={stock}
                                onChange={handleStockChange}
                                disabled={!!idPadre}
                            />
                        </div>

                        <div className="space-y-2.5">
                            <div>
                                <label className="block text-xs font-bold text-ink-muted mb-1">Categoría</label>
                                <select
                                    className="w-full px-3 py-2.5 border border-line rounded-lg bg-surface text-sm text-ink outline-none focus:ring-2 focus:ring-brand-accent min-h-[44px]"
                                    value={categoria}
                                    onChange={e => setCategoria(e.target.value)}
                                >
                                    {categorias.length === 0 && <option value="">Sin categorías</option>}
                                    {categorias.map(cat => (
                                        <option key={cat.id} value={cat.nombre}>
                                            {cat.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="relative">
                                <label className="block text-xs font-bold text-info-ink mb-1">
                                    Comparte Stock con (Opcional):
                                </label>
                                <div className="flex gap-1.5">
                                    <input
                                        type="text"
                                        placeholder="Buscar plato principal..."
                                        className={`w-full px-3 py-2 border rounded-lg text-sm outline-none min-h-[44px] ${
                                            idPadre
                                                ? 'bg-info-soft border-info text-info-ink font-bold'
                                                : 'border-line bg-surface text-ink'
                                        }`}
                                        value={busquedaPadre}
                                        onChange={e => {
                                            setBusquedaPadre(e.target.value);
                                            setIdPadre('');
                                            setMostrarSugerencias(true);
                                        }}
                                        onFocus={() => setMostrarSugerencias(true)}
                                    />
                                    {idPadre && (
                                        <button
                                            type="button"
                                            onClick={limpiarPadre}
                                            className="bg-danger-soft text-danger-ink px-3 rounded-lg border border-danger/30 hover:opacity-90 font-bold min-h-[44px]"
                                        >
                                            &times;
                                        </button>
                                    )}
                                </div>

                                {mostrarSugerencias && busquedaPadre && !idPadre && (
                                    <div className="absolute z-20 w-full bg-surface border border-line rounded-lg shadow-lg max-h-40 overflow-y-auto mt-1">
                                        {posiblesPadres.length === 0 ? (
                                            <div className="p-2.5 text-ink-muted text-xs">No se encontraron platos.</div>
                                        ) : (
                                            posiblesPadres.map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => seleccionarPadre(p)}
                                                    className="w-full text-left p-2.5 text-sm text-ink hover:bg-surface-muted border-b border-line last:border-0 flex justify-between items-center"
                                                >
                                                    <span className="truncate">{p.nombre}</span>
                                                    <span className="text-xs text-ink-muted shrink-0 ml-2 tabular-nums">
                                                        (Stock: {p.stock})
                                                    </span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={cargando}
                            className={`w-full font-bold py-3 rounded-xl shadow-sm mt-2 transition min-h-[48px] ${
                                idEdicion
                                    ? 'bg-warning hover:opacity-90 text-slate-900'
                                    : 'bg-brand hover:bg-brand-hover text-white'
                            }`}
                        >
                            {cargando ? 'GUARDANDO...' : idEdicion ? 'ACTUALIZAR PLATO' : 'GUARDAR PLATO'}
                        </button>
                    </form>
                </div>

                {/* GESTIÓN DE CATEGORÍAS */}
                <div className="bg-surface p-4 rounded-xl shadow-sm border border-line">
                    <h3 className="font-bold text-ink mb-2.5 text-xs uppercase tracking-wider">
                        Gestionar Categorías
                    </h3>
                    <form onSubmit={crearCategoria} className="flex gap-2 mb-3">
                        <input
                            type="text"
                            placeholder="Nueva Categoría..."
                            className="flex-1 px-3 py-2 border border-line rounded-lg text-sm text-ink bg-surface outline-none focus:ring-2 focus:ring-brand-accent min-h-[44px]"
                            value={nuevaCat}
                            onChange={e => setNuevaCat(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="bg-success text-white px-4 rounded-lg font-bold hover:opacity-90 transition min-h-[44px]"
                        >
                            +
                        </button>
                    </form>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {categorias.map(cat => (
                            <div
                                key={cat.id}
                                className="bg-app px-3 py-1.5 rounded-lg border border-line text-xs flex items-center gap-2 shadow-sm"
                            >
                                <span className="font-medium text-ink">{cat.nombre}</span>
                                <button
                                    type="button"
                                    onClick={() => solicitarEliminar(cat.id, 'categoria', cat.nombre)}
                                    className="text-ink-muted hover:text-danger-ink font-bold text-sm leading-none"
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ACCIONES AVANZADAS / PROTEGIDAS DE INVENTARIO */}
                <div className="bg-app p-4 rounded-xl border border-line shadow-sm space-y-2.5">
                    <h3 className="font-bold text-ink text-xs uppercase tracking-wider">
                        Acciones Avanzadas de Stock
                    </h3>
                    <p className="text-xs text-ink-muted leading-relaxed">
                        Operación protegida para inicio de turno o reapertura. Requiere confirmación explícita para evitar errores operativos.
                    </p>
                    <button
                        type="button"
                        onClick={() => setModalReiniciar(true)}
                        className="w-full py-2.5 px-3 bg-surface border border-warning hover:border-danger text-ink hover:text-danger-ink font-bold text-xs sm:text-sm rounded-lg shadow-sm transition flex items-center justify-center gap-2 min-h-[44px]"
                    >
                        <span>Restablecer todo el inventario a 0</span>
                    </button>
                </div>
            </div>

            {/* COLUMNA DERECHA: CATÁLOGO CON ALERTAS, EDICIÓN INLINE, AUDITORÍA Y FILTROS RÁPIDOS */}
            <CatalogoPlatosInventario
                platos={platosFiltrados}
                todosLosPlatos={listaPlatosEnriquecida}
                categorias={categorias}
                busqueda={busqueda}
                onBusquedaChange={setBusqueda}
                filtroCategoria={filtroCategoria}
                onFiltroCategoriaChange={setFiltroCategoria}
                filtroEstado={filtroEstado}
                onFiltroEstadoChange={setFiltroEstado}
                idEdicion={idEdicion}
                onPrepararEdicion={prepararEdicion}
                onSolicitarEliminar={solicitarEliminar}
                onGuardarInline={guardarInline}
            />
        </div>
    );
}