import { useState, useEffect, useCallback, useMemo } from 'react';
import { menuService } from './api/menuService';
import { socketClient } from './api/socketService';
import {
    esSoloTexto,
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
        setTimeout(() => setNotificacion(null), 3000);
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

    const listaPlatosSegura = useMemo(() => (Array.isArray(platos) ? platos : []), [platos]);

    const platosFiltrados = useMemo(
        () =>
            listaPlatosSegura.filter(plato => {
                const coincideTexto = (plato.nombre || '').toLowerCase().includes(busqueda.toLowerCase());
                const coincideCategoria = filtroCategoria === '' || plato.categoria === filtroCategoria;

                let coincideEstado = true;
                if (filtroEstado === 'disponibles') {
                    coincideEstado = !plato.id_padre && plato.stock >= 5;
                } else if (filtroEstado === 'stockBajo') {
                    coincideEstado = !plato.id_padre && plato.stock > 0 && plato.stock < 5;
                } else if (filtroEstado === 'agotados') {
                    coincideEstado = !plato.id_padre && plato.stock === 0;
                } else if (filtroEstado === 'porciones') {
                    coincideEstado = !!plato.id_padre;
                }

                return coincideTexto && coincideCategoria && coincideEstado;
            }),
        [listaPlatosSegura, busqueda, filtroCategoria, filtroEstado]
    );

    const posiblesPadres = useMemo(
        () =>
            listaPlatosSegura.filter(
                p =>
                    p.id !== idEdicion &&
                    !p.id_padre &&
                    (p.nombre || '').toLowerCase().includes(busquedaPadre.toLowerCase())
            ),
        [listaPlatosSegura, idEdicion, busquedaPadre]
    );

    const handleNombreChange = (e) => {
        const valor = e.target.value;
        if (esSoloTexto(valor)) {
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
            setStock(plato.stock !== undefined && plato.stock !== null ? String(plato.stock) : '');
            setCategoria(plato.categoria);

            if (plato.id_padre) {
                const padre = listaPlatosSegura.find(p => p.id === plato.id_padre);
                setIdPadre(plato.id_padre);
                setBusquedaPadre(padre ? padre.nombre : '');
            } else {
                setIdPadre('');
                setBusquedaPadre('');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        [listaPlatosSegura]
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
        if (!nombre.trim() || !esSoloTexto(nombre.trim())) {
            mostrarNotificacion('El nombre solo debe contener texto', 'error');
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
        } catch {
            mostrarNotificacion('Error al guardar plato', 'error');
        } finally {
            setCargando(false);
        }
    };

    // Actualización rápida Inline de precio o stock
    const guardarInline = useCallback(
        async (plato, campo, nuevoValor) => {
            try {
                const valorNumerico = campo === 'precio' ? parseFloat(nuevoValor) : parseInt(nuevoValor, 10);
                const datos = {
                    ...plato,
                    [campo]: valorNumerico,
                    motivo_auditoria:
                        campo === 'stock'
                            ? `Ajuste rápido de stock a ${valorNumerico}`
                            : `Ajuste rápido de precio a $${valorNumerico.toFixed(2)}`
                };
                await menuService.updatePlato(plato.id, datos);
                mostrarNotificacion(
                    campo === 'stock'
                        ? `Stock de "${plato.nombre}" actualizado a ${valorNumerico}`
                        : `Precio de "${plato.nombre}" actualizado a $${valorNumerico.toFixed(2)}`,
                    'exito'
                );
                cargarDatos();
            } catch {
                mostrarNotificacion('Error al actualizar en línea', 'error');
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
        } catch {
            mostrarNotificacion('Error al reiniciar el stock diario', 'error');
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
        } catch {
            mostrarNotificacion('Error al eliminar', 'error');
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
        } catch {
            mostrarNotificacion('Error al crear categoría', 'error');
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:h-[calc(100vh-110px)] relative w-full">
            {/* MODAL DE ELIMINACIÓN */}
            {modalEliminar && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center border border-slate-200">
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                            ¿Eliminar &quot;{modalEliminar.nombre}&quot;?
                        </h3>
                        <p className="text-slate-500 text-sm mb-6">Esta acción no se puede deshacer.</p>
                        <div className="flex gap-3 justify-center">
                            <button
                                type="button"
                                onClick={() => setModalEliminar(null)}
                                className="flex-1 bg-white text-slate-900 border border-slate-300 font-bold py-2.5 px-4 rounded-lg hover:bg-slate-100 text-sm min-h-[44px]"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmarEliminar}
                                className="flex-1 bg-red-500 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-red-600 shadow-md text-sm min-h-[44px]"
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
                        notificacion.tipo === 'error' ? 'bg-red-500' : 'bg-emerald-500'
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
                        idEdicion ? 'bg-amber-50 border-amber-400' : 'bg-white border-slate-200'
                    }`}
                >
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2.5 mb-4">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                            {idEdicion ? 'Editando Plato' : 'Nuevo Plato'}
                        </h2>
                        {idEdicion && (
                            <button
                                type="button"
                                onClick={cancelarEdicion}
                                className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded hover:bg-red-100"
                            >
                                Cancelar edición
                            </button>
                        )}
                    </div>
                    <form onSubmit={guardarPlato} className="space-y-3">
                        <input
                            type="text"
                            placeholder="Nombre del plato"
                            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px]"
                            value={nombre}
                            onChange={handleNombreChange}
                        />

                        <div className="grid grid-cols-2 gap-2.5">
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="Precio $"
                                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px]"
                                value={precio}
                                onChange={handlePrecioChange}
                            />
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="Stock"
                                className={`w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm outline-none min-h-[44px] ${
                                    idPadre ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900 focus:ring-2 focus:ring-orange-500'
                                }`}
                                value={stock}
                                onChange={handleStockChange}
                                disabled={!!idPadre}
                            />
                        </div>

                        <div className="space-y-2.5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Categoría</label>
                                <select
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm text-slate-900 outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px]"
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
                                <label className="block text-xs font-bold text-sky-600 mb-1">
                                    Comparte Stock con (Opcional):
                                </label>
                                <div className="flex gap-1.5">
                                    <input
                                        type="text"
                                        placeholder="Buscar plato principal..."
                                        className={`w-full px-3 py-2 border rounded-lg text-sm outline-none min-h-[44px] ${
                                            idPadre
                                                ? 'bg-sky-50 border-sky-400 text-sky-800 font-bold'
                                                : 'border-slate-300 bg-white text-slate-900'
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
                                            className="bg-red-50 text-red-500 px-3 rounded-lg border border-red-200 hover:bg-red-100 font-bold min-h-[44px]"
                                        >
                                            &times;
                                        </button>
                                    )}
                                </div>

                                {mostrarSugerencias && busquedaPadre && !idPadre && (
                                    <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto mt-1">
                                        {posiblesPadres.length === 0 ? (
                                            <div className="p-2.5 text-slate-500 text-xs">No se encontraron platos.</div>
                                        ) : (
                                            posiblesPadres.map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => seleccionarPadre(p)}
                                                    className="w-full text-left p-2.5 text-sm text-slate-900 hover:bg-orange-50 border-b border-slate-100 last:border-0 flex justify-between items-center"
                                                >
                                                    <span className="truncate">{p.nombre}</span>
                                                    <span className="text-xs text-slate-500 shrink-0 ml-2">
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
                            className={`w-full font-bold py-3 rounded-xl text-white shadow-sm mt-2 transition min-h-[48px] ${
                                idEdicion ? 'bg-amber-500 hover:bg-amber-600' : 'bg-orange-500 hover:bg-orange-600'
                            }`}
                        >
                            {cargando ? 'GUARDANDO...' : idEdicion ? 'ACTUALIZAR PLATO' : 'GUARDAR PLATO'}
                        </button>
                    </form>
                </div>

                {/* GESTIÓN DE CATEGORÍAS */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-900 mb-2.5 text-xs uppercase tracking-wider">
                        Gestionar Categorías
                    </h3>
                    <form onSubmit={crearCategoria} className="flex gap-2 mb-3">
                        <input
                            type="text"
                            placeholder="Nueva Categoría..."
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px]"
                            value={nuevaCat}
                            onChange={e => setNuevaCat(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="bg-emerald-500 text-white px-4 rounded-lg font-bold hover:bg-emerald-600 transition min-h-[44px]"
                        >
                            +
                        </button>
                    </form>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {categorias.map(cat => (
                            <div
                                key={cat.id}
                                className="bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 text-xs flex items-center gap-2 shadow-sm"
                            >
                                <span className="font-medium text-slate-900">{cat.nombre}</span>
                                <button
                                    type="button"
                                    onClick={() => solicitarEliminar(cat.id, 'categoria', cat.nombre)}
                                    className="text-slate-400 hover:text-red-500 font-bold text-sm leading-none"
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ACCIONES AVANZADAS / PROTEGIDAS DE INVENTARIO */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                            Acciones Avanzadas de Stock
                        </h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Operación protegida para inicio de turno o reapertura. Requiere confirmación explícita para evitar errores operativos.
                    </p>
                    <button
                        type="button"
                        onClick={() => setModalReiniciar(true)}
                        className="w-full py-2.5 px-3 bg-white border border-amber-300 hover:border-red-400 text-slate-700 hover:text-red-600 font-bold text-xs sm:text-sm rounded-lg shadow-sm transition flex items-center justify-center gap-2 min-h-[44px]"
                    >
                        <span>Restablecer todo el inventario a 0</span>
                    </button>
                </div>
            </div>

            {/* COLUMNA DERECHA: CATÁLOGO CON ALERTAS, EDICIÓN INLINE, AUDITORÍA Y FILTROS RÁPIDOS */}
            <CatalogoPlatosInventario
                platos={platosFiltrados}
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