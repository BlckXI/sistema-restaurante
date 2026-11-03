import { memo } from 'react';

const getBorderStyle = (tipo) => {
    if (tipo === 'domicilio') return 'border-orange-500';
    if (tipo === 'retiro') return 'border-sky-500';
    if (tipo === 'personal') return 'border-sky-500';
    return 'border-slate-800';
};

const TarjetaComanda = memo(function TarjetaComanda({ orden, onTerminarOrden }) {
    return (
        <div
            className={`w-full border-l-4 rounded-lg p-2.5 bg-white shadow-sm ring-1 ring-slate-200 flex flex-col justify-between ${getBorderStyle(
                orden.tipo_entrega
            )}`}
        >
            <div>
                <div className="flex justify-between items-start gap-1.5 mb-2 border-b pb-1.5 border-slate-200">
                    <div className="min-w-0">
                        <span className="font-black text-lg sm:text-xl block text-slate-900 leading-none">
                            #{orden.numero_diario || orden.id}
                        </span>
                        <span className="text-xs font-bold text-slate-900 uppercase block mt-0.5 break-words leading-tight">
                            {orden.cliente}
                        </span>
                    </div>

                    <div className="shrink-0">
                        {orden.tipo_entrega === 'domicilio' && (
                            <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                DOMICILIO
                            </span>
                        )}
                        {orden.tipo_entrega === 'retiro' && (
                            <span className="bg-sky-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                RETIRO
                            </span>
                        )}
                        {orden.tipo_entrega === 'personal' && (
                            <span className="bg-sky-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                PERSONAL
                            </span>
                        )}
                        {(!orden.tipo_entrega || orden.tipo_entrega === 'mesa') && (
                            <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                MESA
                            </span>
                        )}
                    </div>
                </div>

                {orden.hora_programada && (
                    <div className="mb-1.5 bg-amber-50 border-l-2 border-amber-500 px-2 py-1 text-amber-900 rounded-r">
                        <p className="text-[10px] font-bold uppercase text-amber-700 leading-none">
                            Entrega: <span className="text-slate-900 text-xs">{orden.hora_programada}</span>
                        </p>
                    </div>
                )}

                {orden.tipo_entrega === 'domicilio' && (orden.direccion || orden.telefono) && (
                    <div className="bg-slate-50 px-2 py-1.5 rounded text-[11px] mb-1.5 text-slate-900 border border-slate-200 break-words leading-tight">
                        {orden.direccion && <p className="font-semibold">{orden.direccion}</p>}
                        {orden.telefono && <p className="text-slate-500">Tel: {orden.telefono}</p>}
                    </div>
                )}

                {orden.comentarios && orden.comentarios.trim() !== '' && (
                    <div className="bg-amber-50 border-l-2 border-amber-500 px-2 py-1.5 rounded-r text-xs mb-1.5 break-words leading-tight">
                        <span className="font-bold text-amber-700 text-[10px] block">NOTA:</span>
                        <p className="text-slate-900 font-semibold">{orden.comentarios}</p>
                    </div>
                )}

                <ul className="space-y-1 mb-2.5 bg-slate-50/70 p-2 rounded border border-slate-200/80">
                    {(orden.detalles || []).map((item, index) => (
                        <li
                            key={index}
                            className="flex justify-between items-start gap-1.5 font-bold text-slate-900 text-xs sm:text-sm border-b border-slate-200/70 last:border-0 pb-1 last:pb-0 leading-snug"
                        >
                            <span className="text-orange-500 shrink-0">{item.cantidad}x</span>
                            <span className="text-right break-words text-slate-900">{item.nombre}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <button
                type="button"
                onClick={() => onTerminarOrden(orden.id)}
                className="w-full min-h-[38px] bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-bold py-2 px-2.5 rounded-lg transition-all flex justify-center items-center shadow-sm text-xs"
            >
                COMPLETADO / LISTO
            </button>
        </div>
    );
});

export default TarjetaComanda;
