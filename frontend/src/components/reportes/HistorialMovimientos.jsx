import { memo } from 'react';

const HistorialMovimientos = memo(function HistorialMovimientos({
    listaOrdenes,
    totalAnulado,
    onSolicitarAnularOrden,
    paginacion,
    paginaActual = 1,
    limitePorPagina = 10,
    cargandoPagina = false,
    onCambiarPagina,
    onCambiarLimite
}) {
    const totalItems = paginacion?.totalItems ?? listaOrdenes.length;
    const totalPages = paginacion?.totalPages ?? 1;
    const hasPrev = paginacion?.hasPrevPage ?? paginaActual > 1;
    const hasNext = paginacion?.hasNextPage ?? paginaActual < totalPages;

    const desdeItem = totalItems === 0 ? 0 : (paginaActual - 1) * limitePorPagina + 1;
    const hastaItem = Math.min(paginaActual * limitePorPagina, totalItems);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-800 px-4 sm:px-6 py-3.5 border-b border-slate-700 flex flex-wrap justify-between items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white">Historial de Movimientos</h3>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs bg-red-500 text-white px-2.5 py-1 rounded-full font-bold">
                        Anulado: ${totalAnulado || '0.00'}
                    </span>
                    <span className="text-xs bg-orange-500 text-white px-2.5 py-1 rounded-full font-bold">
                        Total: {totalItems}
                    </span>
                </div>
            </div>

            {/* VISTA TARJETAS EN MÓVIL (< sm) */}
            <div className={`sm:hidden divide-y divide-slate-100 max-h-96 overflow-y-auto ${cargandoPagina ? 'opacity-60' : ''}`}>
                {listaOrdenes.length > 0 ? (
                    listaOrdenes.map(orden => (
                        <div
                            key={orden.id}
                            className={`p-3.5 flex flex-col gap-2 ${
                                orden.estado === 'anulado' ? 'bg-red-50/60 opacity-60' : 'bg-white'
                            }`}
                        >
                            <div className="flex justify-between items-start gap-2">
                                <div>
                                    <span className="font-bold text-slate-900 text-sm">
                                        #{orden.numero_diario || orden.id} - {orden.cliente}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        <span className="text-[11px] bg-slate-100 text-slate-900 px-2 py-0.5 rounded capitalize">
                                            {orden.tipo_entrega}
                                        </span>
                                        <span
                                            className={`px-2 py-0.5 text-[11px] rounded-full font-medium text-white ${
                                                orden.metodo_pago === 'transferencia'
                                                    ? 'bg-sky-500'
                                                    : 'bg-emerald-500'
                                            }`}
                                        >
                                            {orden.metodo_pago || 'efectivo'}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-bold text-slate-900 text-base">
                                        ${(orden.total || 0).toFixed(2)}
                                    </p>
                                    {orden.estado !== 'anulado' ? (
                                        <button
                                            type="button"
                                            onClick={() => onSolicitarAnularOrden(orden.id)}
                                            className="mt-1 bg-red-500 hover:bg-red-600 text-white text-xs px-2.5 py-1 rounded-lg font-bold transition"
                                        >
                                            Anular
                                        </button>
                                    ) : (
                                        <span className="text-[10px] font-bold text-red-500 uppercase">Anulada</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center p-6 text-slate-500 text-xs">No hay órdenes registradas hoy.</div>
                )}
            </div>

            {/* VISTA TABLA CON SCROLL HORIZONTAL ENCAPSULADO (>= sm) */}
            <div className={`hidden sm:block overflow-x-auto max-h-96 ${cargandoPagina ? 'opacity-60' : ''}`}>
                <table className="w-full text-left text-sm min-w-[540px]">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-xs sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Cliente</th>
                            <th className="px-4 py-3">Tipo</th>
                            <th className="px-4 py-3">Pago</th>
                            <th className="px-4 py-3">Total</th>
                            <th className="px-4 py-3 text-right">Opción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {listaOrdenes.length > 0 ? (
                            listaOrdenes.map(orden => (
                                <tr
                                    key={orden.id}
                                    className={`transition-colors ${
                                        orden.estado === 'anulado'
                                            ? 'bg-red-50/60 opacity-60'
                                            : 'hover:bg-slate-50'
                                    }`}
                                >
                                    <td className="px-4 py-3 font-bold text-slate-900">
                                        #{orden.numero_diario || orden.id}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-900">{orden.cliente}</td>
                                    <td className="px-4 py-3 capitalize text-slate-500">{orden.tipo_entrega}</td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`px-2.5 py-1 text-xs rounded-full font-medium text-white ${
                                                orden.metodo_pago === 'transferencia'
                                                    ? 'bg-sky-500'
                                                    : 'bg-emerald-500'
                                            }`}
                                        >
                                            {orden.metodo_pago || 'efectivo'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-bold text-slate-900">
                                        ${(orden.total || 0).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {orden.estado !== 'anulado' ? (
                                            <button
                                                type="button"
                                                onClick={() => onSolicitarAnularOrden(orden.id)}
                                                className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded-lg font-bold transition"
                                                title="Anular"
                                            >
                                                Anular
                                            </button>
                                        ) : (
                                            <span className="text-xs font-bold text-red-500">ANULADA</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="text-center p-6 text-slate-500">
                                    No hay órdenes registradas hoy.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* CONTROLES DE PAGINACIÓN REAL */}
            <div className="bg-slate-50 px-4 sm:px-6 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs text-slate-500 w-full sm:w-auto justify-between sm:justify-start">
                    <span>
                        Mostrando <strong className="text-slate-900">{desdeItem}</strong> -{' '}
                        <strong className="text-slate-900">{hastaItem}</strong> de{' '}
                        <strong className="text-slate-900">{totalItems}</strong> movimientos
                    </span>
                    {onCambiarLimite && (
                        <div className="flex items-center gap-1.5">
                            <label htmlFor="select-limite-movimientos" className="text-slate-500 font-medium">
                                Filas:
                            </label>
                            <select
                                id="select-limite-movimientos"
                                value={limitePorPagina}
                                onChange={e => onCambiarLimite(Number(e.target.value))}
                                disabled={cargandoPagina}
                                className="px-2 py-1 border border-slate-300 rounded-md bg-white text-slate-900 font-semibold text-xs outline-none focus:ring-2 focus:ring-orange-500"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <button
                        type="button"
                        onClick={() => onCambiarPagina && onCambiarPagina(paginaActual - 1)}
                        disabled={!hasPrev || cargandoPagina}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            hasPrev && !cargandoPagina
                                ? 'bg-slate-800 text-white hover:bg-slate-700'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        Anterior
                    </button>

                    <span className="text-xs font-bold text-slate-900 px-2">
                        Página {paginaActual} de {totalPages}
                    </span>

                    <button
                        type="button"
                        onClick={() => onCambiarPagina && onCambiarPagina(paginaActual + 1)}
                        disabled={!hasNext || cargandoPagina}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            hasNext && !cargandoPagina
                                ? 'bg-orange-500 text-white hover:bg-orange-600'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        Siguiente
                    </button>
                </div>
            </div>
        </div>
    );
});

export default HistorialMovimientos;
