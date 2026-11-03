import { memo } from 'react';

const ResumenOrden = memo(function ResumenOrden({
    carrito,
    errores,
    onAgregarPlato,
    onQuitarPlato,
    comentarios,
    onComentariosChange,
    esPersonal,
    esTransferencia,
    onToggleTransferencia,
    esDomicilio,
    esExtra,
    subtotal,
    total,
    enviando,
    onProcesarOrden
}) {
    return (
        <div className="w-full flex flex-col">
            <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-ink">Detalle del Pedido *</span>
                    {carrito.length === 0 && (
                        <span className="text-[11px] font-semibold text-danger-ink">Agrega al menos 1 plato</span>
                    )}
                </div>
                <div
                    className={`bg-app rounded-lg border p-2.5 min-h-[125px] max-h-56 overflow-y-auto ${
                        errores.carrito ? 'border-danger bg-danger-soft/40' : 'border-line'
                    }`}
                >
                    {carrito.length === 0 ? (
                        <div className="h-28 flex items-center justify-center text-ink-muted flex-col">
                            <p className="text-sm">Carrito vacío</p>
                        </div>
                    ) : (
                        carrito.map((item, index) => (
                            <div
                                key={index}
                                className="flex justify-between items-center py-2 border-b border-line last:border-0 gap-2"
                            >
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <button
                                        type="button"
                                        onClick={() => onQuitarPlato(item.id)}
                                        aria-label={`Disminuir cantidad de ${item.nombre}`}
                                        className="text-white font-bold min-w-[44px] min-h-[48px] flex items-center justify-center bg-danger hover:opacity-90 active:scale-95 rounded-lg shrink-0 transition text-base shadow-sm"
                                    >
                                        -
                                    </button>
                                    {onAgregarPlato && (
                                        <button
                                            type="button"
                                            onClick={() => onAgregarPlato(item)}
                                            aria-label={`Aumentar cantidad de ${item.nombre}`}
                                            className="text-white font-bold min-w-[44px] min-h-[48px] flex items-center justify-center bg-success hover:opacity-90 active:scale-95 rounded-lg shrink-0 transition text-base shadow-sm"
                                        >
                                            +
                                        </button>
                                    )}
                                    <span className="font-bold text-ink text-sm truncate ml-1">
                                        {item.cantidad}x {item.nombre}
                                    </span>
                                </div>
                                <span className="font-mono tabular-nums text-sm font-semibold text-ink shrink-0">
                                    ${(item.precio * item.cantidad).toFixed(2)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="mb-3">
                <label className="block text-xs font-bold text-ink-muted mb-1">Notas para Cocina y Repartidor</label>
                <textarea
                    className="w-full p-2.5 border border-line rounded-lg text-sm text-ink placeholder-ink-muted/70 focus:ring-2 focus:ring-brand-accent outline-none resize-none bg-surface"
                    rows="2"
                    placeholder="Ej: Sin cebolla"
                    value={comentarios}
                    onChange={onComentariosChange}
                />
            </div>

            {!esPersonal && (
                <button
                    type="button"
                    onClick={onToggleTransferencia}
                    className={`w-full min-h-[48px] flex items-center justify-between gap-2.5 mb-3.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                        esTransferencia
                            ? 'bg-info-soft border-info'
                            : 'bg-surface border-line hover:bg-app'
                    }`}
                >
                    <div className="flex items-center gap-2.5">
                        <input
                            type="checkbox"
                            checked={esTransferencia}
                            readOnly
                            className="w-5 h-5 accent-blue-600 cursor-pointer shrink-0"
                        />
                        <span className={`font-bold text-sm ${esTransferencia ? 'text-info-ink' : 'text-ink'}`}>
                            Pago con Transferencia
                        </span>
                    </div>
                    <span className="text-xs font-bold text-ink-muted">
                        {esTransferencia ? 'Transferencia' : 'Efectivo'}
                    </span>
                </button>
            )}

            <div className="space-y-1 text-right mb-4 pt-3 border-t border-line tabular-nums">
                {!esPersonal && <p className="text-ink-muted text-xs sm:text-sm">Subtotal: ${subtotal.toFixed(2)}</p>}
                {esDomicilio && !esExtra && !esPersonal && (
                    <p className="text-brand-text text-xs sm:text-sm font-bold">+ Envío: $1.00</p>
                )}
                {esPersonal && <p className="text-info-ink font-bold text-xs sm:text-sm">CONSUMO PERSONAL (GRATIS)</p>}
                <p className="text-2xl sm:text-3xl font-bold text-ink">${total.toFixed(2)}</p>
            </div>

            <button
                type="button"
                onClick={onProcesarOrden}
                disabled={enviando}
                className={`w-full min-h-[52px] min-w-[44px] font-bold py-3.5 px-4 rounded-xl text-base sm:text-lg text-white transition flex items-center justify-center gap-2 ${
                    enviando
                        ? 'bg-surface-muted text-ink-muted cursor-not-allowed'
                        : 'bg-brand hover:bg-brand-hover active:scale-[0.99]'
                } shadow-md`}
            >
                {enviando && (
                    <span className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
                )}
                <span>
                    {enviando
                        ? 'SINCRONIZANDO PEDIDO...'
                        : esPersonal
                          ? 'CONFIRMAR CONSUMO PERSONAL'
                          : esExtra
                            ? 'AGREGAR EXTRA (+)'
                            : 'CONFIRMAR PEDIDO'}
                </span>
            </button>
        </div>
    );
});

export default ResumenOrden;
