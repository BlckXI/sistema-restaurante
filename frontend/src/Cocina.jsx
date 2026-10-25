import { useCocina } from './hooks/useCocina';
import TarjetaComanda from './components/cocina/TarjetaComanda';

export default function Cocina() {
    const {
        ordenes,
        cargando,
        ahora,
        ordenEnUndo,
        playNotificationSound,
        terminarOrden,
        deshacerTerminarOrden
    } = useCocina();

    return (
        <div className="w-full relative">
            {ordenEnUndo && (
                <div className="fixed bottom-20 md:bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-slate-800 text-white px-5 py-3.5 rounded-xl shadow-2xl border border-slate-600 flex items-center justify-between gap-4 w-[92vw] max-w-md">
                    <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-white truncate">
                            Comanda #{ordenEnUndo.numero_diario || ordenEnUndo.id} ({ordenEnUndo.cliente}) completada
                        </p>
                        <p className="text-[11px] text-slate-300">Tienes 3 segundos para revertir esta acción</p>
                    </div>
                    <button
                        type="button"
                        onClick={deshacerTerminarOrden}
                        className="min-h-[44px] min-w-[44px] px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm rounded-lg shrink-0 shadow transition"
                    >
                        DESHACER
                    </button>
                </div>
            )}

            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 mb-5 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Comandas en Cocina</h1>
                    <span className="text-xs sm:text-sm bg-amber-500 text-white px-3 py-1 rounded-full font-bold shrink-0 shadow-sm">
                        {ordenes.length} Pendientes
                    </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                            &lt; 15 min
                        </span>
                        <span className="inline-flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 text-slate-900">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                            15-24 min (Demora)
                        </span>
                        <span className="inline-flex items-center gap-1.5 bg-red-50 px-2.5 py-1 rounded-md border border-red-200 text-slate-900">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                            25+ min (Urgente)
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={playNotificationSound}
                        className="w-full sm:w-auto min-h-[48px] min-w-[44px] bg-slate-800 text-white px-4 py-2.5 rounded-lg shadow-sm hover:bg-slate-700 active:bg-slate-900 text-xs sm:text-sm font-bold flex justify-center items-center gap-2 transition"
                    >
                        Activar Sonido
                    </button>
                </div>
            </div>

            {cargando ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(item => (
                        <div
                            key={item}
                            className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm animate-pulse min-h-[240px] flex flex-col justify-between"
                        >
                            <div className="space-y-3">
                                <div className="h-7 bg-slate-200 rounded w-1/3" />
                                <div className="h-4 bg-slate-200 rounded w-2/3" />
                                <div className="h-16 bg-slate-100 rounded w-full" />
                            </div>
                            <div className="h-12 bg-slate-200 rounded-xl w-full" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {ordenes.length === 0 && (
                        <div className="col-span-full text-center py-16 sm:py-20 bg-white rounded-xl border border-dashed border-slate-300 px-4">
                            <p className="text-slate-500 text-base sm:text-xl font-medium">
                                Todo limpio. Esperando comandas...
                            </p>
                        </div>
                    )}

                    {ordenes.map(orden => (
                        <TarjetaComanda
                            key={orden.id}
                            orden={orden}
                            ahora={ahora}
                            onTerminarOrden={terminarOrden}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}