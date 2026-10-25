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
                    <span className="text-xs font-bold text-slate-900">Detalle del Pedido *</span>
                    {carrito.length === 0 && (
                        <span className="text-[11px] font-semibold text-red-500">Agrega al menos 1 plato</span>
                    )}
                </div>
                <div
                    className={`bg-slate-50 rounded-lg border p-2.5 min-h-[125px] max-h-56 overflow-y-auto ${
                        errores.carrito ? 'border-red-500 bg-red-50/40' : 'border-slate-200'
                    }`}
                >
                    {carrito.length === 0 ? (
                        <div className="h-28 flex items-center justify-center text-slate-500 flex-col">
                            <p className="text-sm">Carrito vacío</p>
                        </div>
                    ) : (
                        carrito.map((item, index) => (
                            <div
                                key={index}
                                className="flex justify-between items-center py-2 border-b border-slate-200 last:border-0 gap-2"
                            >
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <button
                                        type="button"
                                        onClick={() => onQuitarPlato(item.id)}
                                        aria-label={`Disminuir cantidad de ${item.nombre}`}
                                        className="text-white font-bold min-w-[44px] min-h-[48px] flex items-center justify-center bg-red-500 hover:bg-red-600 active:scale-95 rounded-lg shrink-0 transition text-base shadow-sm"
                                    >
                                        -
                                    </button>
                                    {onAgregarPlato && (
                                        <button
                                            type="button"
                                            onClick={() => onAgregarPlato(item)}
                                            aria-label={`Aumentar cantidad de ${item.nombre}`}
                                            className="text-white font-bold min-w-[44px] min-h-[48px] flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 active:scale-95 rounded-lg shrink-0 transition text-base shadow-sm"
                                        >
                                            +
                                        </button>
                                    )}
                                    <span className="font-bold text-slate-900 text-sm truncate ml-1">
                                        {item.cantidad}x {item.nombre}
                                    </span>
                                </div>
                                <span className="font-mono text-sm font-semibold text-slate-900 shrink-0">
                                    ${(item.precio * item.cantidad).toFixed(2)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="mb-3">
                <label className="block text-xs font-bold text-slate-500 mb-1">Notas para Cocina y Repartidor</label>
                <textarea
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-orange-500 outline-none resize-none bg-white"
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
                            ? 'bg-emerald-50 border-emerald-500'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    <div className="flex items-center gap-2.5">
                        <input
                            type="checkbox"
                            checked={esTransferencia}
                            readOnly
                            className="w-5 h-5 accent-emerald-500 cursor-pointer shrink-0"
                        />
                        <span className={`font-bold text-sm ${esTransferencia ? 'text-emerald-700' : 'text-slate-900'}`}>
                            Pago con Transferencia
                        </span>
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                        {esTransferencia ? 'Transferencia' : 'Efectivo'}
                    </span>
                </button>
            )}

            <div className="space-y-1 text-right mb-4 pt-3 border-t border-slate-200">
                {!esPersonal && <p className="text-slate-500 text-xs sm:text-sm">Subtotal: ${subtotal.toFixed(2)}</p>}
                {esDomicilio && !esExtra && !esPersonal && (
                    <p className="text-orange-600 text-xs sm:text-sm font-bold">+ Envío: $1.00</p>
                )}
                {esPersonal && <p className="text-sky-600 font-bold text-xs sm:text-sm">CONSUMO PERSONAL (GRATIS)</p>}
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">${total.toFixed(2)}</p>
            </div>

            <button
                type="button"
                onClick={onProcesarOrden}
                disabled={enviando}
                className={`w-full min-h-[52px] min-w-[44px] font-bold py-3.5 px-4 rounded-xl text-base sm:text-lg text-white transition flex items-center justify-center gap-2 ${
                    enviando
                        ? 'bg-slate-400 cursor-not-allowed'
                        : 'bg-orange-500 hover:bg-orange-600 active:scale-[0.99]'
                } shadow-md`}
            >
                {enviando && (
                    <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />
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
