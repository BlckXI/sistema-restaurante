import { useState, memo } from 'react';
import { esEntradaEnteroPositivo, esEntradaMontoPositivo, esEnteroNoNegativoValido, esMontoPositivoValido } from '../../utils/validators';

function formatearTiempoRelativo(fechaIso) {
    if (!fechaIso) return 'Sin registro';
    try {
        const fecha = new Date(fechaIso);
        if (Number.isNaN(fecha.getTime())) return 'Sin registro';
        const ahora = new Date();
        const diffMs = ahora - fecha;
        const diffSeg = Math.floor(diffMs / 1000);
        if (diffSeg < 30) return 'Hace un momento';
        if (diffSeg < 60) return `Hace ${diffSeg} seg`;
        const diffMin = Math.floor(diffSeg / 60);
        if (diffMin < 60) return `Hace ${diffMin} min`;
        const diffHoras = Math.floor(diffMin / 60);
        if (diffHoras < 24) return `Hace ${diffHoras} h`;
        return fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return 'Sin registro';
    }
}

function formatearFechaCompleta(fechaIso) {
    if (!fechaIso) return 'No disponible';
    try {
        const fecha = new Date(fechaIso);
        if (Number.isNaN(fecha.getTime())) return 'No disponible';
        return fecha.toLocaleString('es-ES', {
            dateStyle: 'medium',
            timeStyle: 'medium'
        });
    } catch {
        return 'No disponible';
    }
}

const CatalogoPlatosInventario = memo(function CatalogoPlatosInventario({
    platos,
    todosLosPlatos,
    categorias,
    busqueda,
    onBusquedaChange,
    filtroCategoria,
    onFiltroCategoriaChange,
    filtroEstado,
    onFiltroEstadoChange,
    idEdicion,
    onPrepararEdicion,
    onSolicitarEliminar,
    onGuardarInline
}) {
    // Estado para edición inline { id, campo: 'precio' | 'stock', valorOriginal, valorActual }
    const [edicionInline, setEdicionInline] = useState(null);
    const [guardandoInlineId, setGuardandoInlineId] = useState(null);

    // Estado para tooltip de auditoría activo (ID del plato)
    const [auditoriaVisibleId, setAuditoriaVisibleId] = useState(null);

    const listaBaseConteos = Array.isArray(todosLosPlatos) ? todosLosPlatos : platos;

    // Contadores para pestañas de filtros rápidos (alineados con la visibilidad en Caja)
    const conteos = {
        todos: listaBaseConteos.length,
        disponibles: listaBaseConteos.filter(p => (p.stockEfectivo ?? p.stock) > 0).length,
        stockBajo: listaBaseConteos.filter(p => {
            const st = p.stockEfectivo ?? p.stock;
            return st > 0 && st < 5;
        }).length,
        agotados: listaBaseConteos.filter(p => (p.stockEfectivo ?? p.stock) === 0).length,
        porciones: listaBaseConteos.filter(p => Boolean(p.id_padre)).length
    };

    const iniciarEdicionInline = (plato, campo) => {
        const stockActual = plato.stockEfectivo ?? plato.stock ?? 0;
        setEdicionInline({
            id: plato.id,
            campo,
            valorOriginal: campo === 'precio' ? plato.precio : stockActual,
            valorActual: campo === 'precio' ? String(plato.precio) : String(stockActual)
        });
    };

    const ponerPlatoEnCero = async (plato) => {
        setGuardandoInlineId(plato.id);
        try {
            await onGuardarInline(plato, 'stock', 0);
        } finally {
            setGuardandoInlineId(null);
            setEdicionInline(null);
        }
    };

    const cancelarEdicionInline = () => {
        setEdicionInline(null);
    };

    const confirmarEdicionInline = async (plato) => {
        if (!edicionInline || edicionInline.id !== plato.id) return;
        const { campo, valorActual, valorOriginal } = edicionInline;

        if (String(valorActual).trim() === String(valorOriginal) && !plato.esHuerfano) {
            cancelarEdicionInline();
            return;
        }

        if (campo === 'precio') {
            if (!esMontoPositivoValido(valorActual)) {
                cancelarEdicionInline();
                return;
            }
        } else if (campo === 'stock') {
            if (!esEnteroNoNegativoValido(valorActual)) {
                cancelarEdicionInline();
                return;
            }
        }

        setGuardandoInlineId(plato.id);
        try {
            await onGuardarInline(plato, campo, valorActual);
        } finally {
            setGuardandoInlineId(null);
            setEdicionInline(null);
        }
    };

    const handleKeyDownInline = (e, plato) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmarEdicionInline(plato);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelarEdicionInline();
        }
    };

    const obtenerEstiloFila = (plato) => {
        const stockReal = plato.stockEfectivo ?? plato.stock ?? 0;
        if (idEdicion === plato.id) return 'bg-amber-100/70 border-l-4 border-l-amber-500';
        if (stockReal === 0) return 'bg-red-50/70 hover:bg-red-50/90 border-l-4 border-l-red-500';
        if (stockReal < 5) return 'bg-amber-50/70 hover:bg-amber-50/90 border-l-4 border-l-amber-400';
        return 'bg-white hover:bg-slate-50';
    };

    return (
        <div className="w-full lg:flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-w-0">
            {/* CABECERA CON BÚSQUEDA Y CATEGORÍAS */}
            <div className="p-3.5 sm:p-4 bg-slate-800 border-b border-slate-700 space-y-3">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-base sm:text-lg font-bold text-white">Catálogo e Inventario</h2>
                        <p className="text-xs text-slate-400">Control de existencias en tiempo real y edición rápida</p>
                    </div>
                    <span className="text-xs bg-orange-500 text-white px-2.5 py-1 rounded-full font-bold">
                        {platos.length} platos
                    </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Buscar plato por nombre..."
                            className="w-full pl-3 pr-8 py-2.5 border border-slate-600 rounded-lg text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px]"
                            value={busqueda}
                            onChange={e => onBusquedaChange(e.target.value)}
                        />
                        {busqueda && (
                            <button
                                type="button"
                                onClick={() => onBusquedaChange('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-sm w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100"
                                title="Limpiar búsqueda"
                            >
                                &times;
                            </button>
                        )}
                    </div>
                    <select
                        className="px-3 py-2.5 border border-slate-600 rounded-lg text-sm text-slate-900 bg-white sm:w-48 outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px]"
                        value={filtroCategoria}
                        onChange={e => onFiltroCategoriaChange(e.target.value)}
                    >
                        <option value="">Todas las Categorías</option>
                        {categorias.map(cat => (
                            <option key={cat.id} value={cat.nombre}>
                                {cat.nombre}
                            </option>
                        ))}
                    </select>
                </div>

                {/* FILTROS RÁPIDOS POR ESTADO DE STOCK */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 text-xs">
                    <button
                        type="button"
                        onClick={() => onFiltroEstadoChange('todos')}
                        className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition min-h-[36px] ${
                            filtroEstado === 'todos'
                                ? 'bg-orange-500 text-white shadow-sm'
                                : 'bg-slate-700/70 text-slate-200 hover:bg-slate-700'
                        }`}
                    >
                        Todos ({conteos.todos})
                    </button>
                    <button
                        type="button"
                        onClick={() => onFiltroEstadoChange('disponibles')}
                        className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition min-h-[36px] ${
                            filtroEstado === 'disponibles'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-700/70 text-emerald-300 hover:bg-slate-700'
                        }`}
                    >
                        Disponibles ({conteos.disponibles})
                    </button>
                    <button
                        type="button"
                        onClick={() => onFiltroEstadoChange('stockBajo')}
                        className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition min-h-[36px] ${
                            filtroEstado === 'stockBajo'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'bg-slate-700/70 text-amber-300 hover:bg-slate-700'
                        }`}
                    >
                        Stock Bajo ({conteos.stockBajo})
                    </button>
                    <button
                        type="button"
                        onClick={() => onFiltroEstadoChange('agotados')}
                        className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition min-h-[36px] ${
                            filtroEstado === 'agotados'
                                ? 'bg-red-600 text-white shadow-sm'
                                : 'bg-slate-700/70 text-red-300 hover:bg-slate-700'
                        }`}
                    >
                        Agotados ({conteos.agotados})
                    </button>
                    <button
                        type="button"
                        onClick={() => onFiltroEstadoChange('porciones')}
                        className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition min-h-[36px] ${
                            filtroEstado === 'porciones'
                                ? 'bg-sky-600 text-white shadow-sm'
                                : 'bg-slate-700/70 text-sky-300 hover:bg-slate-700'
                        }`}
                    >
                        Porciones ({conteos.porciones})
                    </button>
                </div>
            </div>

            {/* BARRA INFORMATIVA DE EDICIÓN INLINE */}
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
                <span>
                    <strong>Tip de rapidez:</strong> Haz clic sobre cualquier <strong>Precio</strong> o <strong>Stock</strong> para editarlo directamente sin abrir formularios.
                </span>
                <span className="font-semibold text-slate-700">Enter para guardar / Esc para cancelar</span>
            </div>

            {/* VISTA TARJETAS EN MÓVIL (< sm) */}
            <div className="sm:hidden divide-y divide-slate-100 overflow-y-auto max-h-[65vh]">
                {platos.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">No se encontraron platos con los filtros aplicados.</div>
                ) : (
                    platos.map(plato => {
                        const stockReal = plato.stockEfectivo ?? plato.stock ?? 0;
                        const esAgotado = stockReal === 0;
                        const esBajo = stockReal > 0 && stockReal < 5;
                        const editandoPrecio = edicionInline && edicionInline.id === plato.id && edicionInline.campo === 'precio';
                        const editandoStock = edicionInline && edicionInline.id === plato.id && edicionInline.campo === 'stock';

                        return (
                            <div
                                key={plato.id}
                                className={`p-3.5 flex flex-col gap-2.5 transition-colors ${obtenerEstiloFila(plato)}`}
                            >
                                <div className="flex justify-between items-start gap-2">
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-900 text-sm break-words flex items-center gap-1.5 flex-wrap">
                                            <span>{plato.nombre}</span>
                                            {plato.id_padre && (
                                                <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-bold border border-sky-200">
                                                    {plato.nombrePadre ? `PORCIÓN DE: ${plato.nombrePadre}` : 'PORCIÓN'}
                                                </span>
                                            )}
                                        </p>
                                        <span className="inline-block text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded mt-1">
                                            {plato.categoria}
                                        </span>
                                    </div>

                                    {/* PRECIO INLINE MÓVIL */}
                                    <div className="text-right shrink-0">
                                        {editandoPrecio ? (
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs font-bold text-slate-500">$</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    autoFocus
                                                    className="w-16 px-1.5 py-1 border-2 border-orange-500 rounded text-right font-bold text-sm outline-none bg-white text-slate-900"
                                                    value={edicionInline.valorActual}
                                                    onChange={e => {
                                                        if (esEntradaMontoPositivo(e.target.value)) {
                                                            setEdicionInline(prev => ({ ...prev, valorActual: e.target.value }));
                                                        }
                                                    }}
                                                    onBlur={() => confirmarEdicionInline(plato)}
                                                    onKeyDown={e => handleKeyDownInline(e, plato)}
                                                />
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => iniciarEdicionInline(plato, 'precio')}
                                                className="font-black text-slate-900 text-base hover:text-orange-600 transition flex items-center justify-end gap-1"
                                                title="Toca para editar precio inline"
                                            >
                                                <span>${plato.precio.toFixed(2)}</span>
                                                <span className="text-[10px] text-slate-400 font-normal">✎</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* STOCK INLINE Y ALERTAS MÓVIL */}
                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {editandoStock ? (
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs font-bold text-slate-500">Stock:</span>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    autoFocus
                                                    className="w-16 px-1.5 py-1 border-2 border-orange-500 rounded text-center font-bold text-sm outline-none bg-white text-slate-900"
                                                    value={edicionInline.valorActual}
                                                    onChange={e => {
                                                        if (esEntradaEnteroPositivo(e.target.value)) {
                                                            setEdicionInline(prev => ({ ...prev, valorActual: e.target.value }));
                                                        }
                                                    }}
                                                    onBlur={() => confirmarEdicionInline(plato)}
                                                    onKeyDown={e => handleKeyDownInline(e, plato)}
                                                />
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => iniciarEdicionInline(plato, 'stock')}
                                                className={`text-xs font-bold px-2.5 py-1 rounded-full transition flex items-center gap-1 min-h-[32px] ${
                                                    esAgotado
                                                        ? 'bg-red-500 text-white shadow-sm'
                                                        : esBajo
                                                          ? 'bg-amber-500 text-white shadow-sm'
                                                          : 'bg-emerald-500 text-white shadow-sm'
                                                }`}
                                                title="Toca para editar stock inline"
                                            >
                                                <span>
                                                    {plato.id_padre
                                                        ? `Compartido: ${stockReal}`
                                                        : esAgotado
                                                          ? 'AGOTADO (0)'
                                                          : esBajo
                                                            ? `Stock Bajo: ${stockReal}`
                                                            : `Stock: ${stockReal}`}
                                                </span>
                                                <span className="text-[10px] opacity-75 font-normal">✎</span>
                                            </button>
                                        )}

                                        {(stockReal > 0 || plato.esHuerfano) && !editandoStock && (
                                            <button
                                                type="button"
                                                onClick={() => ponerPlatoEnCero(plato)}
                                                disabled={guardandoInlineId === plato.id}
                                                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-red-100 text-slate-700 hover:text-red-600 transition min-h-[32px]"
                                                title="Poner stock en 0 inmediatamente"
                                            >
                                                Poner en 0
                                            </button>
                                        )}

                                        {guardandoInlineId === plato.id && (
                                            <span className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                                        )}
                                    </div>

                                    {/* AUDITORÍA RÁPIDA MÓVIL */}
                                    <div className="text-[11px] text-slate-500 text-right">
                                        <span title={formatearFechaCompleta(plato.updated_at)}>
                                            {formatearTiempoRelativo(plato.updated_at)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => onPrepararEdicion(plato)}
                                        className="flex-1 text-center text-orange-600 font-bold text-xs py-2.5 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 min-h-[44px]"
                                    >
                                        Editar Ficha
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onSolicitarEliminar(plato.id, 'plato', plato.nombre)}
                                        className="flex-1 text-center text-red-500 font-bold text-xs py-2.5 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 min-h-[44px]"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* VISTA TABLA EN ESCRITORIO (>= sm) CON SCROLL ENCAPSULADO */}
            <div className="hidden sm:block overflow-x-auto overflow-y-auto flex-1">
                <table className="w-full text-left border-collapse min-w-[620px]">
                    <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                            <th className="p-3 text-xs font-bold uppercase">Producto</th>
                            <th className="p-3 text-xs font-bold uppercase">Precio (Click inline)</th>
                            <th className="p-3 text-xs font-bold uppercase">Stock (Click inline)</th>
                            <th className="p-3 text-xs font-bold uppercase">Auditoría / Modificado</th>
                            <th className="p-3 text-xs font-bold uppercase text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {platos.map(plato => {
                            const stockReal = plato.stockEfectivo ?? plato.stock ?? 0;
                            const esAgotado = stockReal === 0;
                            const esBajo = stockReal > 0 && stockReal < 5;
                            const editandoPrecio = edicionInline && edicionInline.id === plato.id && edicionInline.campo === 'precio';
                            const editandoStock = edicionInline && edicionInline.id === plato.id && edicionInline.campo === 'stock';
                            const viendoAuditoria = auditoriaVisibleId === plato.id;

                            return (
                                <tr
                                    key={plato.id}
                                    className={`transition-colors ${obtenerEstiloFila(plato)}`}
                                >
                                    <td className="p-3 font-medium text-slate-900">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold">{plato.nombre}</span>
                                            {plato.id_padre && (
                                                <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-bold border border-sky-200">
                                                    {plato.nombrePadre ? `PORCIÓN DE: ${plato.nombrePadre}` : 'PORCIÓN'}
                                                </span>
                                            )}
                                        </div>
                                        <span className="inline-block text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded mt-1">
                                            {plato.categoria}
                                        </span>
                                    </td>

                                    {/* PRECIO INLINE */}
                                    <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                                        {editandoPrecio ? (
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm font-bold text-slate-500">$</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    autoFocus
                                                    className="w-20 px-2 py-1 border-2 border-orange-500 rounded text-left font-bold text-sm outline-none bg-white text-slate-900 shadow-sm"
                                                    value={edicionInline.valorActual}
                                                    onChange={e => {
                                                        if (esEntradaMontoPositivo(e.target.value)) {
                                                            setEdicionInline(prev => ({ ...prev, valorActual: e.target.value }));
                                                        }
                                                    }}
                                                    onBlur={() => confirmarEdicionInline(plato)}
                                                    onKeyDown={e => handleKeyDownInline(e, plato)}
                                                />
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => iniciarEdicionInline(plato, 'precio')}
                                                className="group inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-orange-50 hover:text-orange-700 transition"
                                                title="Haz clic para modificar el precio de forma rápida"
                                            >
                                                <span>${plato.precio.toFixed(2)}</span>
                                                <span className="opacity-0 group-hover:opacity-100 text-xs text-slate-400 group-hover:text-orange-600 transition">
                                                    ✎
                                                </span>
                                            </button>
                                        )}
                                    </td>

                                    {/* STOCK INLINE */}
                                    <td className="p-3 whitespace-nowrap">
                                        <div className="inline-flex items-center gap-1.5">
                                            {editandoStock ? (
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        autoFocus
                                                        className="w-16 px-2 py-1 border-2 border-orange-500 rounded text-center font-bold text-sm outline-none bg-white text-slate-900 shadow-sm"
                                                        value={edicionInline.valorActual}
                                                        onChange={e => {
                                                            if (esEntradaEnteroPositivo(e.target.value)) {
                                                                setEdicionInline(prev => ({ ...prev, valorActual: e.target.value }));
                                                            }
                                                        }}
                                                        onBlur={() => confirmarEdicionInline(plato)}
                                                        onKeyDown={e => handleKeyDownInline(e, plato)}
                                                    />
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => iniciarEdicionInline(plato, 'stock')}
                                                    className={`group inline-flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-full text-xs text-white transition ${
                                                        esAgotado
                                                            ? 'bg-red-500 hover:bg-red-600'
                                                            : esBajo
                                                              ? 'bg-amber-500 hover:bg-amber-600'
                                                              : 'bg-emerald-500 hover:bg-emerald-600'
                                                    }`}
                                                    title="Haz clic para modificar el stock de forma rápida"
                                                >
                                                    <span>
                                                        {plato.id_padre
                                                            ? `Compartido: ${stockReal}`
                                                            : esAgotado
                                                              ? 'AGOTADO'
                                                              : stockReal}
                                                    </span>
                                                    <span className="opacity-70 group-hover:opacity-100 text-[10px]">✎</span>
                                                </button>
                                            )}

                                            {(stockReal > 0 || plato.esHuerfano) && !editandoStock && (
                                                <button
                                                    type="button"
                                                    onClick={() => ponerPlatoEnCero(plato)}
                                                    disabled={guardandoInlineId === plato.id}
                                                    className="text-[11px] font-bold px-2 py-1 rounded bg-slate-200 hover:bg-red-100 text-slate-700 hover:text-red-600 transition"
                                                    title="Poner stock en 0 inmediatamente"
                                                >
                                                    Poner en 0
                                                </button>
                                            )}

                                            {guardandoInlineId === plato.id && (
                                                <span className="inline-block w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin align-middle" />
                                            )}
                                        </div>
                                    </td>

                                    {/* AUDITORÍA Y TRAZABILIDAD */}
                                    <td className="p-3 text-xs text-slate-500 whitespace-nowrap relative">
                                        <div className="flex items-center gap-1.5">
                                            <span>{formatearTiempoRelativo(plato.updated_at)}</span>
                                            <button
                                                type="button"
                                                onClick={() => setAuditoriaVisibleId(viendoAuditoria ? null : plato.id)}
                                                className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold"
                                                title="Ver detalle de auditoría"
                                            >
                                                i
                                            </button>
                                        </div>

                                        {viendoAuditoria && (
                                            <div className="absolute left-3 top-10 z-20 bg-slate-900 text-white rounded-lg p-3 shadow-xl text-xs w-64 border border-slate-700 animate-in fade-in duration-100">
                                                <div className="flex justify-between items-center mb-1 pb-1 border-b border-slate-700">
                                                    <span className="font-bold text-orange-400">Auditoría de Stock</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAuditoriaVisibleId(null)}
                                                        className="text-slate-400 hover:text-white"
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                                <p className="text-[11px] text-slate-300">
                                                    <strong>Motivo:</strong> {plato.ultimo_cambio || 'Ajuste manual'}
                                                </p>
                                                <p className="text-[11px] text-slate-300 mt-1">
                                                    <strong>Fecha:</strong> {formatearFechaCompleta(plato.updated_at)}
                                                </p>
                                                <p className="text-[11px] text-slate-400 mt-1">
                                                    Stock efectivo: {stockReal} | Precio: ${plato.precio.toFixed(2)}
                                                </p>
                                            </div>
                                        )}
                                    </td>

                                    {/* ACCIONES */}
                                    <td className="p-3 text-right whitespace-nowrap">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => onPrepararEdicion(plato)}
                                                className="text-orange-600 hover:bg-orange-100 font-bold text-xs px-3 py-1.5 bg-orange-50 rounded-lg transition min-h-[36px]"
                                            >
                                                Editar Ficha
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onSolicitarEliminar(plato.id, 'plato', plato.nombre)}
                                                className="text-red-500 hover:bg-red-100 font-bold text-xs px-3 py-1.5 bg-red-50 rounded-lg transition min-h-[36px]"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {platos.length === 0 && (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-slate-500">
                                    No se encontraron platos con los filtros aplicados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

export default CatalogoPlatosInventario;
