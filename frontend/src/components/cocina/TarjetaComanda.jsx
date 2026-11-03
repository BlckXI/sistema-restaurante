import { memo } from 'react';

const TarjetaComanda = memo(function TarjetaComanda({ orden, onTerminarOrden }) {
    return (
        <div className="w-full rounded-xl p-3 bg-surface border border-line shadow-sm flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start gap-1.5 mb-2 border-b pb-1.5 border-line">
                    <div className="min-w-0">
                        <span className="font-black text-lg sm:text-xl block text-ink leading-none tabular-nums">
                            #{orden.numero_diario || orden.id}
                        </span>
                        <span className="text-xs font-bold text-ink uppercase block mt-0.5 break-words leading-tight">
                            {orden.cliente}
                        </span>
                    </div>

                    <div className="shrink-0">
                        {orden.tipo_entrega === 'domicilio' && (
                            <span className="bg-info text-white text-[10px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1">
                                DOMICILIO
                            </span>
                        )}
                        {orden.tipo_entrega === 'retiro' && (
                            <span className="bg-purple-700 text-white text-[10px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1">
                                RETIRO
                            </span>
                        )}
                        {orden.tipo_entrega === 'personal' && (
                            <span className="bg-surface-muted text-ink border border-line text-[10px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1">
                                PERSONAL
                            </span>
                        )}
                        {(!orden.tipo_entrega || orden.tipo_entrega === 'mesa') && (
                            <span className="bg-surface-muted text-ink border border-line text-[10px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1">
                                MESA
                            </span>
                        )}
                    </div>
                </div>

                {orden.hora_programada && (
                    <div className="mb-1.5 bg-warning-soft border border-warning/40 px-2 py-1 text-warning-ink rounded">
                        <p className="text-[10px] font-bold uppercase leading-none">
                            Entrega: <span className="text-ink text-xs tabular-nums">{orden.hora_programada}</span>
                        </p>
                    </div>
                )}

                {orden.tipo_entrega === 'domicilio' && (orden.direccion || orden.telefono) && (
                    <div className="bg-info-soft px-2 py-1.5 rounded text-[11px] mb-1.5 text-ink border border-info/30 break-words leading-tight">
                        {orden.direccion && <p className="font-semibold">{orden.direccion}</p>}
                        {orden.telefono && <p className="text-ink-muted tabular-nums">Tel: {orden.telefono}</p>}
                    </div>
                )}

                {orden.comentarios && orden.comentarios.trim() !== '' && (
                    <div className="bg-warning-soft border border-warning/40 px-2 py-1.5 rounded text-xs mb-1.5 break-words leading-tight">
                        <span className="font-bold text-warning-ink text-[10px] block">NOTA:</span>
                        <p className="text-ink font-semibold">{orden.comentarios}</p>
                    </div>
                )}

                <ul className="space-y-1 mb-2.5 bg-app p-2 rounded border border-line">
                    {(orden.detalles || []).map((item, index) => (
                        <li
                            key={index}
                            className="flex justify-between items-start gap-1.5 font-bold text-ink text-xs sm:text-sm border-b border-line last:border-0 pb-1 last:pb-0 leading-snug"
                        >
                            <span className="text-brand-text shrink-0 tabular-nums">{item.cantidad}x</span>
                            <span className="text-right break-words text-ink">{item.nombre}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <button
                type="button"
                onClick={() => onTerminarOrden(orden.id)}
                className="w-full min-h-[44px] bg-success hover:opacity-90 active:scale-[0.99] text-white font-bold py-2 px-2.5 rounded-lg transition-all flex justify-center items-center shadow-sm text-xs"
            >
                COMPLETADO / LISTO
            </button>
        </div>
    );
});

export default TarjetaComanda;
