import { useState, useEffect, useCallback } from 'react';
import { deliveryService } from './api/deliveryService';
import { orderService } from './api/orderService';
import { socketClient } from './api/socketService';

// Coordinado con hora de El Salvador (UTC-6 fijo): limpieza automática a las 7:00 PM (19:00 horas)
const OFFSET_EL_SALVADOR_MS = 6 * 60 * 60 * 1000;
const HORA_CORTE_REPARTIDOR_SV = 19;

const esHorarioCorte7PmElSalvador = (ahora = new Date()) => {
    const fechaSV = new Date(ahora.getTime() - OFFSET_EL_SALVADOR_MS);
    return fechaSV.getUTCHours() >= HORA_CORTE_REPARTIDOR_SV;
};

export default function Repartidor() {
    const [pestana, setPestana] = useState('pendientes');
    const [pedidos, setPedidos] = useState([]);
    const [historial, setHistorial] = useState([]);
    const [corte7PmActivo, setCorte7PmActivo] = useState(() => esHorarioCorte7PmElSalvador());

    const [notificacion, setNotificacion] = useState(null);
    const [modalEntregar, setModalEntregar] = useState(null);

    const limpiarPanelPorCorte = useCallback(() => {
        setPedidos([]);
        setHistorial([]);
        setModalEntregar(null);
    }, []);

    const cargarDatos = useCallback(async () => {
        if (esHorarioCorte7PmElSalvador()) {
            setCorte7PmActivo(true);
            limpiarPanelPorCorte();
            return;
        }

        setCorte7PmActivo(false);
        try {
            const [resPendientes, resHistorial] = await Promise.all([
                deliveryService.getPedidos(),
                deliveryService.getHistorial()
            ]);
            setPedidos(Array.isArray(resPendientes.data) ? resPendientes.data : []);
            setHistorial(Array.isArray(resHistorial.data) ? resHistorial.data : []);
        } catch {
            setPedidos([]);
            setHistorial([]);
        }
    }, [limpiarPanelPorCorte]);

    const playNotificationSound = () => {
        const audio = new Audio('https://actions.google.com/sounds/v1/transport_transportation/car_horn.ogg');
        audio.play().catch(() => {});
    };

    useEffect(() => {
        cargarDatos();

        const handleOrdenLista = (orden) => {
            if (esHorarioCorte7PmElSalvador()) {
                setCorte7PmActivo(true);
                limpiarPanelPorCorte();
                return;
            }
            if (orden.tipo_entrega === 'domicilio') {
                playNotificationSound();
                cargarDatos();
            }
        };

        const handleOrdenEntregada = () => {
            cargarDatos();
        };

        socketClient.on('orden_lista', handleOrdenLista);
        socketClient.on('orden_entregada', handleOrdenEntregada);

        // Verificación periódica para limpiar automáticamente el panel al llegar las 7:00 PM (El Salvador, UTC-6)
        const intervaloCorte = setInterval(() => {
            const enCorte = esHorarioCorte7PmElSalvador();
            setCorte7PmActivo(prev => {
                if (!prev && enCorte) {
                    limpiarPanelPorCorte();
                } else if (prev && !enCorte) {
                    cargarDatos();
                }
                return enCorte;
            });
        }, 15000);

        return () => {
            socketClient.off('orden_lista', handleOrdenLista);
            socketClient.off('orden_entregada', handleOrdenEntregada);
            clearInterval(intervaloCorte);
        };
    }, [cargarDatos, limpiarPanelPorCorte]);

    const solicitarEntrega = (id) => {
        setModalEntregar(id);
    };

    const confirmarEntrega = async () => {
        if (!modalEntregar) return;

        try {
            await orderService.entregarOrden(modalEntregar);
            mostrarNotificacion('Entrega registrada con éxito', 'exito');
            cargarDatos();
        } catch {
            mostrarNotificacion('Error al registrar la entrega', 'error');
        } finally {
            setModalEntregar(null);
        }
    };

    const mostrarNotificacion = (mensaje, tipo) => {
        setNotificacion({ mensaje, tipo });
        setTimeout(() => setNotificacion(null), 3000);
    };

    return (
        <div className="w-full max-w-5xl mx-auto relative">
            {modalEntregar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
                    <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-line">
                        <div className="bg-success p-5 text-center">
                            <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">Confirmar Entrega</h3>
                            <p className="text-white/90 text-xs sm:text-sm">¿Ya entregaste este pedido?</p>
                        </div>

                        <div className="p-5 text-center">
                            <p className="text-ink-muted text-sm">
                                Al confirmar, la orden pasará al historial de entregas realizadas hoy.
                            </p>
                        </div>

                        <div className="bg-app px-5 py-4 flex gap-3 justify-center border-t border-line">
                            <button
                                type="button"
                                onClick={() => setModalEntregar(null)}
                                className="w-1/2 min-h-[44px] bg-surface text-ink border border-line font-bold py-3 rounded-xl hover:bg-surface-muted text-sm transition"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmarEntrega}
                                className="w-1/2 min-h-[44px] bg-success text-white font-bold py-3 rounded-xl hover:opacity-90 shadow-md text-sm transition active:scale-95"
                            >
                                SÍ, ENTREGADO
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {notificacion && (
                <div
                    className={`fixed top-16 sm:top-5 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-xl shadow-xl z-[60] text-white font-bold text-sm max-w-[90vw] text-center ${
                        notificacion.tipo === 'error' ? 'bg-danger' : 'bg-success'
                    }`}
                >
                    {notificacion.mensaje}
                </div>
            )}

            <div className="bg-surface p-4 rounded-xl shadow-sm border border-line mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-ink">Panel de Repartidor</h1>
                    <p className="text-xs text-ink-muted">
                        Limpieza automática diaria a las 7:00 PM (hora de El Salvador, UTC-6)
                    </p>
                </div>

                <div className="flex gap-1.5 bg-surface-muted p-1 rounded-xl w-full sm:w-auto border border-line">
                    <button
                        type="button"
                        onClick={() => setPestana('pendientes')}
                        className={`flex-1 sm:flex-initial min-h-[44px] sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition ${
                            pestana === 'pendientes'
                                ? 'bg-brand shadow text-white'
                                : 'text-ink-muted hover:text-ink hover:bg-surface'
                        }`}
                    >
                        Por Entregar ({pedidos.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setPestana('historial')}
                        className={`flex-1 sm:flex-initial min-h-[44px] sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition ${
                            pestana === 'historial'
                                ? 'bg-success shadow text-white'
                                : 'text-ink-muted hover:text-ink hover:bg-surface'
                        }`}
                    >
                        Entregados Hoy ({historial.length})
                    </button>
                </div>
            </div>

            {pestana === 'pendientes' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pedidos.length === 0 && (
                        <div className="col-span-full text-center py-14 bg-surface rounded-xl border border-dashed border-line px-4">
                            <p className="text-ink-muted font-semibold">
                                {corte7PmActivo
                                    ? 'Panel limpiado automáticamente a las 7:00 PM (hora de El Salvador).'
                                    : 'Todo entregado. Esperando a cocina...'}
                            </p>
                        </div>
                    )}

                    {pedidos.map(orden => {
                        const esPagadoTransferencia = orden.metodo_pago === 'transferencia';

                        return (
                            <div
                                key={orden.id}
                                className="w-full bg-surface border border-line rounded-xl shadow-sm p-4 sm:p-5 flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex justify-between items-start gap-2 mb-3">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="bg-surface-muted text-ink border border-line text-xs font-bold px-2.5 py-1 rounded-md inline-block tabular-nums">
                                                    Ticket #{orden.numero_diario > 0 ? orden.numero_diario : orden.id}
                                                </span>
                                                {esPagadoTransferencia ? (
                                                    <span className="bg-info text-white text-xs font-bold px-2.5 py-1 rounded-md inline-block shadow-sm">
                                                        PAGADO (TRANSFERENCIA)
                                                    </span>
                                                ) : (
                                                    <span className="bg-warning text-slate-900 text-xs font-bold px-2.5 py-1 rounded-md inline-block shadow-sm">
                                                        POR COBRAR (EFECTIVO)
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-lg sm:text-xl font-bold text-ink mt-1.5 break-words">
                                                {orden.cliente}
                                            </h3>
                                        </div>
                                        {orden.hora_programada && (
                                            <div className="text-right bg-warning-soft px-2.5 py-1 rounded-lg border border-warning/40 shrink-0">
                                                <p className="text-[10px] text-warning-ink font-bold uppercase">Entrega</p>
                                                <p className="font-bold text-ink text-sm tabular-nums">{orden.hora_programada}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-3.5 bg-app p-3 rounded-lg border border-line">
                                        <p className="text-xs text-ink-muted font-bold uppercase tracking-wider">
                                            Dirección de Entrega
                                        </p>
                                        <p className="text-base sm:text-lg font-semibold text-ink break-words mt-1">
                                            {orden.direccion}
                                        </p>

                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                                orden.direccion || ''
                                            )}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex min-h-[44px] items-center gap-1.5 text-info-ink text-xs sm:text-sm font-bold hover:opacity-90 bg-info-soft px-3.5 py-2 rounded-lg border border-info/30 mt-2.5"
                                        >
                                            Ver en Mapa
                                        </a>
                                    </div>

                                    {orden.comentarios && orden.comentarios.trim() !== '' && (
                                        <div className="mb-3.5 bg-warning-soft border border-warning/40 p-3 rounded-lg text-sm break-words">
                                            <span className="font-bold text-warning-ink text-xs block mb-0.5">
                                                NOTAS DEL CLIENTE:
                                            </span>
                                            <p className="text-ink font-semibold">{orden.comentarios}</p>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap justify-between items-center gap-2 mb-4 pt-2 border-t border-line">
                                        <a
                                            href={`tel:${orden.telefono}`}
                                            className="flex min-h-[44px] items-center gap-2 text-ink font-bold bg-surface-muted border border-line px-3.5 py-2 rounded-lg hover:bg-app text-xs sm:text-sm transition tabular-nums"
                                        >
                                            Tel: {orden.telefono || 'Sin número'}
                                        </a>
                                        {esPagadoTransferencia ? (
                                            <div className="text-right bg-info-soft border border-info/30 px-3 py-1.5 rounded-lg">
                                                <p className="text-[11px] text-info-ink uppercase font-black">
                                                    PAGADO (NO COBRAR)
                                                </p>
                                                <p className="text-sm sm:text-base font-bold text-info-ink leading-tight tabular-nums">
                                                    Transferencia (${(orden.total || 0).toFixed(2)})
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="text-right">
                                                <p className="text-[11px] text-warning-ink uppercase font-bold">
                                                    Por Cobrar en Efectivo
                                                </p>
                                                <p className="text-xl sm:text-2xl font-bold text-ink leading-none tabular-nums">
                                                    ${(orden.total || 0).toFixed(2)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => solicitarEntrega(orden.id)}
                                    className="w-full min-h-[48px] bg-success text-white font-bold py-3.5 rounded-xl shadow hover:opacity-90 transition flex justify-center items-center text-sm sm:text-base active:scale-[0.99]"
                                >
                                    MARCAR COMO ENTREGADO
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {pestana === 'historial' && (
                <div className="bg-surface rounded-xl shadow-sm border border-line overflow-hidden">
                    <div className="bg-surface-muted px-4 py-3.5 border-b border-line flex justify-between items-center">
                        <h3 className="font-bold text-ink text-sm sm:text-base">Entregas Realizadas</h3>
                        <span className="bg-success text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-sm tabular-nums">
                            {historial.length} Total
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[480px]">
                            <thead className="bg-app text-ink-muted uppercase text-xs border-b border-line">
                                <tr>
                                    <th className="p-3">Hora</th>
                                    <th className="p-3">Cliente</th>
                                    <th className="p-3">Dirección</th>
                                    <th className="p-3 text-right">Estado de Pago / Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line text-sm">
                                {historial.map(orden => {
                                    const esPagadoTransferencia = orden.metodo_pago === 'transferencia';
                                    return (
                                        <tr key={orden.id} className="hover:bg-app transition-colors">
                                            <td className="p-3 text-xs sm:text-sm text-ink-muted font-mono tabular-nums whitespace-nowrap">
                                                {new Date(orden.created_at).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="p-3 font-bold text-ink">{orden.cliente}</td>
                                            <td className="p-3 text-xs sm:text-sm text-ink-muted max-w-[200px] truncate">
                                                {orden.direccion}
                                            </td>
                                            <td className="p-3 text-right whitespace-nowrap">
                                                <div className="inline-flex items-center justify-end gap-2">
                                                    <span
                                                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                                            esPagadoTransferencia
                                                                ? 'bg-info-soft text-info-ink border-info/30'
                                                                : 'bg-surface-muted text-ink border-line'
                                                        }`}
                                                    >
                                                        {esPagadoTransferencia ? 'PAGADO (TRANSFERENCIA)' : 'COBRADO (EFECTIVO)'}
                                                    </span>
                                                    <span className="font-bold text-success-ink tabular-nums">
                                                        ${(orden.total || 0).toFixed(2)}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {historial.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-ink-muted italic">
                                            {corte7PmActivo
                                                ? 'Historial limpiado automáticamente a las 7:00 PM (hora de El Salvador).'
                                                : 'Aún no has entregado pedidos hoy.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}