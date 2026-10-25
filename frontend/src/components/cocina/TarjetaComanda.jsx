import { memo } from 'react';

const getBorderStyle = (tipo) => {
    if (tipo === 'domicilio') return 'border-orange-500';
    if (tipo === 'retiro') return 'border-sky-500';
    if (tipo === 'personal') return 'border-sky-500';
    return 'border-slate-800';
};

const obtenerEstadoTiempo = (createdAt, ahora) => {
    const fechaCreacion = createdAt ? new Date(createdAt).getTime() : ahora;
    const minutos = Math.max(0, Math.floor((ahora - fechaCreacion) / 60000));

    if (minutos >= 25) {
        return {
            minutos,
            cardBg: 'bg-red-50/90 ring-red-300',
            badgeClass: 'bg-red-500 text-white',
            etiqueta: `Urgente · ${minutos} min`
        };
    }
    if (minutos >= 15) {
        return {
            minutos,
            cardBg: 'bg-amber-50/90 ring-amber-300',
            badgeClass: 'bg-amber-500 text-white',
            etiqueta: `Demora · ${minutos} min`
        };
    }
    return {
        minutos,
        cardBg: 'bg-white ring-slate-200',
        badgeClass: 'bg-emerald-500 text-white',
        etiqueta: `En tiempo · ${minutos} min`
    };
};

const TarjetaComanda = memo(function TarjetaComanda({ orden, ahora = Date.now(), onTerminarOrden }) {
    const estadoTiempo = obtenerEstadoTiempo(orden.created_at, ahora);

    return (
        <div
            className={`w-full border-l-8 rounded-xl p-4 shadow-sm ring-1 flex flex-col justify-between transition-colors duration-300 ${getBorderStyle(
                orden.tipo_entrega
            )} ${estadoTiempo.cardBg}`}
        >
            <div>
                <div className="flex justify-between items-start gap-2 mb-3 border-b pb-2.5 border-slate-200">
                    <div className="min-w-0">
                        <span className="font-black text-2xl sm:text-3xl block text-slate-900 leading-none">
                            #{orden.numero_diario || orden.id}
                        </span>
                        <span className="text-sm font-bold text-slate-900 uppercase block mt-1 break-words">
                            {orden.cliente}
                        </span>
                        <span className="text-xs text-slate-500 font-mono block mt-0.5">
                            Ingreso: {new Date(orden.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {orden.tipo_entrega === 'domicilio' && (
                            <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-md">
                                DOMICILIO
                            </span>
                        )}
                        {orden.tipo_entrega === 'retiro' && (
                            <span className="bg-sky-500 text-white text-xs font-bold px-2.5 py-1 rounded-md">
                                RETIRO
                            </span>
                        )}
                        {orden.tipo_entrega === 'personal' && (
                            <span className="bg-sky-500 text-white text-xs font-bold px-2.5 py-1 rounded-md">
                                PERSONAL
                            </span>
                        )}
                        {(!orden.tipo_entrega || orden.tipo_entrega === 'mesa') && (
                            <span className="bg-slate-800 text-white text-xs font-bold px-2.5 py-1 rounded-md">
                                MESA
                            </span>
                        )}
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm ${estadoTiempo.badgeClass}`}>
                            {estadoTiempo.etiqueta}
                        </span>
                    </div>
                </div>

                {orden.hora_programada && (
                    <div className="mb-3 bg-amber-50 border-l-4 border-amber-500 p-2.5 text-amber-900 rounded-r-lg shadow-sm">
                        <p className="text-[11px] font-bold uppercase text-amber-700">Hora Programada</p>
                        <p className="font-bold text-base sm:text-lg leading-tight text-slate-900">{orden.hora_programada}</p>
                    </div>
                )}

                {orden.tipo_entrega === 'domicilio' && (
                    <div className="bg-white/80 p-2.5 rounded-lg text-xs mb-3 text-slate-900 border border-slate-200 break-words space-y-0.5">
                        <p className="font-bold">Dirección: {orden.direccion}</p>
                        <p className="text-slate-500">Tel: {orden.telefono}</p>
                    </div>
                )}

                {orden.comentarios && orden.comentarios.trim() !== '' ? (
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-2.5 rounded-r-lg text-sm mb-3 break-words">
                        <span className="font-bold text-amber-700 text-xs block mb-0.5">INSTRUCCIONES:</span>
                        <p className="text-slate-900 font-semibold">{orden.comentarios}</p>
                    </div>
                ) : (
                    <div className="bg-slate-50/80 p-2 rounded-lg text-xs mb-3 text-slate-500">
                        Sin instrucciones especiales
                    </div>
                )}

                <ul className="space-y-1.5 mb-4 bg-white/90 p-2.5 rounded-lg border border-slate-200/80">
                    {(orden.detalles || []).map((item, index) => (
                        <li
                            key={index}
                            className="flex justify-between items-start gap-2 font-bold text-slate-900 text-base sm:text-lg border-b border-slate-200/70 last:border-0 pb-1 last:pb-0"
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
                className="w-full min-h-[48px] min-w-[44px] bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-bold py-3 rounded-xl transition-all flex justify-center items-center shadow-sm text-sm sm:text-base"
            >
                COMPLETADO / MARCAR LISTO
            </button>
        </div>
    );
});

export default TarjetaComanda;
