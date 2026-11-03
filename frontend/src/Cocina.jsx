import { useCocina } from './hooks/useCocina';
import TarjetaComanda from './components/cocina/TarjetaComanda';

export default function Cocina() {
    const {
        ordenes,
        cargando,
        ordenEnUndo,
        playNotificationSound,
        terminarOrden,
        deshacerTerminarOrden
    } = useCocina();

    return (
        <div className="w-full relative">
            {ordenEnUndo && (
                <div className="fixed bottom-20 md:bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-600 flex items-center justify-between gap-3 w-[92vw] max-w-md">
                    <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-white truncate">
                            Comanda #{ordenEnUndo.numero_diario || ordenEnUndo.id} ({ordenEnUndo.cliente}) completada
                        </p>
                        <p className="text-[11px] text-slate-300">Tienes 3 segundos para revertir esta acción</p>
                    </div>
                    <button
                        type="button"
                        onClick={deshacerTerminarOrden}
                        className="min-h-[38px] px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg shrink-0 shadow transition"
                    >
                        DESHACER
                    </button>
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-white px-3.5 py-2.5 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2.5">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900">Comandas en Cocina</h1>
                    <span className="text-xs bg-amber-500 text-white px-2.5 py-0.5 rounded-full font-bold shrink-0 shadow-sm">
                        {ordenes.length} Pendientes
                    </span>
                </div>

                <button
                    type="button"
                    onClick={playNotificationSound}
                    className="bg-slate-800 text-white px-3.5 py-2 rounded-lg shadow-sm hover:bg-slate-700 active:bg-slate-900 text-xs font-bold flex justify-center items-center transition"
                >
                    Activar Sonido
                </button>
            </div>

            {cargando ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 landscape:grid-cols-4 gap-2.5">
                    {[1, 2, 3, 4].map(item => (
                        <div
                            key={item}
                            className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-sm animate-pulse min-h-[170px] flex flex-col justify-between"
                        >
                            <div className="space-y-2">
                                <div className="h-5 bg-slate-200 rounded w-1/3" />
                                <div className="h-3.5 bg-slate-200 rounded w-2/3" />
                                <div className="h-12 bg-slate-100 rounded w-full" />
                            </div>
                            <div className="h-9 bg-slate-200 rounded-lg w-full" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 landscape:grid-cols-4 gap-2.5">
                    {ordenes.length === 0 && (
                        <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 px-4">
                            <p className="text-slate-500 text-sm sm:text-base font-medium">
                                Todo limpio. Esperando comandas...
                            </p>
                        </div>
                    )}

                    {ordenes.map(orden => (
                        <TarjetaComanda
                            key={orden.id}
                            orden={orden}
                            onTerminarOrden={terminarOrden}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}