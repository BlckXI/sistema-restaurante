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
        <div className="bg-surface rounded-xl shadow-sm border border-line overflow-hidden">
            <div className="bg-surface-muted px-4 sm:px-6 py-3.5 border-b border-line flex flex-wrap justify-between items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-ink">Historial de Movimientos</h3>
                <div className="flex flex-wrap items-center gap-2 tabular-nums">
                    <span className="text-xs bg-danger text-white px-2.5 py-1 rounded-full font-bold">
                        Anulado: ${totalAnulado || '0.00'}
                    </span>
                    <span className="text-xs bg-brand text-white px-2.5 py-1 rounded-full font-bold">
                        Total: {totalItems}
                    </span>
                </div>
            </div>

            {/* VISTA TARJETAS EN MÓVIL (< sm) */}
            <div className={`sm:hidden divide-y divide-line max-h-96 overflow-y-auto ${cargandoPagina ? 'opacity-60' : ''}`}>
                {listaOrdenes.length > 0 ? (
                    listaOrdenes.map(orden => (
                        <div
                            key={orden.id}
                            className={`p-3.5 flex flex-col gap-2 ${
                                orden.estado === 'anulado' ? 'bg-danger-soft/60 opacity-60' : 'bg-surface'
                            }`}
                        >
                            <div className="flex justify-between items-start gap-2">
                                <div>
                                    <span className="font-bold text-ink text-sm">
                                        #{orden.numero_diario || orden.id} - {orden.cliente}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        <span className="text-[11px] bg-surface-muted text-ink px-2 py-0.5 rounded capitalize border border-line">
                                            {orden.tipo_entrega}
                                        </span>
                                        <span
                                            className={`px-2 py-0.5 text-[11px] rounded-full font-bold text-white ${
                                                orden.metodo_pago === 'transferencia'
                                                    ? 'bg-info'
                                                    : 'bg-success'
                                            }`}
                                        >
                                            {orden.metodo_pago || 'efectivo'}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-bold text-ink text-base tabular-nums">
                                        ${(orden.total || 0).toFixed(2)}
                                    </p>
                                    {orden.estado !== 'anulado' ? (
                                        <button
                                            type="button"
                                            onClick={() => onSolicitarAnularOrden(orden.id)}
                                            className="mt-1 min-h-[36px] bg-danger hover:opacity-90 text-white text-xs px-3 py-1 rounded-lg font-bold transition"
                                        >
                                            Anular
                                        </button>
                                    ) : (
                                        <span className="text-[10px] font-bold text-danger-ink uppercase">Anulada</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center p-6 text-ink-muted text-xs">No hay órdenes registradas hoy.</div>
                )}
            </div>

            {/* VISTA TABLA CON SCROLL HORIZONTAL ENCAPSULADO (>= sm) */}
            <div className={`hidden sm:block overflow-x-auto max-h-96 ${cargandoPagina ? 'opacity-60' : ''}`}>
                <table className="w-full text-left text-sm min-w-[540px]">
                    <thead className="bg-app text-ink-muted uppercase text-xs sticky top-0 z-10 border-b border-line">
                        <tr>
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Cliente</th>
                            <th className="px-4 py-3">Tipo</th>
                            <th className="px-4 py-3">Pago</th>
                            <th className="px-4 py-3">Total</th>
                            <th className="px-4 py-3 text-right">Opción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                        {listaOrdenes.length > 0 ? (
                            listaOrdenes.map(orden => (
                                <tr
                                    key={orden.id}
                                    className={`transition-colors ${
                                        orden.estado === 'anulado'
                                            ? 'bg-danger-soft/60 opacity-60'
                                            : 'hover:bg-app'
                                    }`}
                                >
                                    <td className="px-4 py-3 font-bold text-ink tabular-nums">
                                        #{orden.numero_diario || orden.id}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-ink">{orden.cliente}</td>
                                    <td className="px-4 py-3 capitalize text-ink-muted">{orden.tipo_entrega}</td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`px-2.5 py-1 text-xs rounded-full font-bold text-white ${
                                                orden.metodo_pago === 'transferencia'
                                                    ? 'bg-info'
                                                    : 'bg-success'
                                            }`}
                                        >
                                            {orden.metodo_pago || 'efectivo'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-bold text-ink tabular-nums">
                                        ${(orden.total || 0).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {orden.estado !== 'anulado' ? (
                                            <button
                                                type="button"
                                                onClick={() => onSolicitarAnularOrden(orden.id)}
                                                className="min-h-[36px] bg-danger hover:opacity-90 text-white text-xs px-3 py-1 rounded-lg font-bold transition"
                                                title="Anular"
                                            >
                                                Anular
                                            </button>
                                        ) : (
                                            <span className="text-xs font-bold text-danger-ink">ANULADA</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="text-center p-6 text-ink-muted">
                                    No hay órdenes registradas hoy.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* CONTROLES DE PAGINACIÓN REAL */}
            <div className="bg-app px-4 sm:px-6 py-3 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs text-ink-muted w-full sm:w-auto justify-between sm:justify-start tabular-nums">
                    <span>
                        Mostrando <strong className="text-ink">{desdeItem}</strong> -{' '}
                        <strong className="text-ink">{hastaItem}</strong> de{' '}
                        <strong className="text-ink">{totalItems}</strong> movimientos
                    </span>
                    {onCambiarLimite && (
                        <div className="flex items-center gap-1.5">
                            <label htmlFor="select-limite-movimientos" className="text-ink-muted font-medium">
                                Filas:
                            </label>
                            <select
                                id="select-limite-movimientos"
                                value={limitePorPagina}
                                onChange={e => onCambiarLimite(Number(e.target.value))}
                                disabled={cargandoPagina}
                                className="px-2 py-1 border border-line rounded-md bg-surface text-ink font-semibold text-xs outline-none focus:ring-2 focus:ring-brand-accent"
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
                        className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            hasPrev && !cargandoPagina
                                ? 'bg-surface hover:bg-surface-muted text-ink border border-line'
                                : 'bg-surface-muted text-ink-muted border border-line cursor-not-allowed opacity-60'
                        }`}
                    >
                        Anterior
                    </button>

                    <span className="text-xs font-bold text-ink px-2 tabular-nums">
                        Página {paginaActual} de {totalPages}
                    </span>

                    <button
                        type="button"
                        onClick={() => onCambiarPagina && onCambiarPagina(paginaActual + 1)}
                        disabled={!hasNext || cargandoPagina}
                        className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            hasNext && !cargandoPagina
                                ? 'bg-brand text-white hover:bg-brand-hover'
                                : 'bg-surface-muted text-ink-muted border border-line cursor-not-allowed opacity-60'
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
