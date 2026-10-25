import { useState, useEffect } from 'react';
import { deliveryService } from './api/deliveryService';
import { orderService } from './api/orderService';
import { socketClient } from './api/socketService';

export default function Repartidor() {
    const [pestana, setPestana] = useState('pendientes');
    const [pedidos, setPedidos] = useState([]);
    const [historial, setHistorial] = useState([]);

    const [notificacion, setNotificacion] = useState(null);
    const [modalEntregar, setModalEntregar] = useState(null);

    const cargarDatos = async () => {
        try {
            const resPendientes = await deliveryService.getPedidos();
            setPedidos(Array.isArray(resPendientes.data) ? resPendientes.data : []);

            const resHistorial = await deliveryService.getHistorial();
            setHistorial(Array.isArray(resHistorial.data) ? resHistorial.data : []);
        } catch {
            setPedidos([]);
            setHistorial([]);
        }
    };

    const playNotificationSound = () => {
        const audio = new Audio('https://actions.google.com/sounds/v1/transport_transportation/car_horn.ogg');
        audio.play().catch(() => {});
    };

    useEffect(() => {
        cargarDatos();

        const handleOrdenLista = (orden) => {
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

        return () => {
            socketClient.off('orden_lista', handleOrdenLista);
            socketClient.off('orden_entregada', handleOrdenEntregada);
        };
    }, []);

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
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="bg-emerald-500 p-5 text-center">
                            <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">Confirmar Entrega</h3>
                            <p className="text-emerald-50 text-xs sm:text-sm">¿Ya entregaste este pedido?</p>
                        </div>

                        <div className="p-5 text-center">
                            <p className="text-slate-500 text-sm">
                                Al confirmar, la orden pasará al historial de entregas realizadas hoy.
                            </p>
                        </div>

                        <div className="bg-slate-50 px-5 py-4 flex gap-3 justify-center border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setModalEntregar(null)}
                                className="w-1/2 bg-white text-slate-900 border border-slate-300 font-bold py-3 rounded-xl hover:bg-slate-100 text-sm transition"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmarEntrega}
                                className="w-1/2 bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 shadow-md text-sm transition active:scale-95"
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
                        notificacion.tipo === 'error' ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                >
                    {notificacion.mensaje}
                </div>
            )}

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Panel de Repartidor</h1>

                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => setPestana('pendientes')}
                        className={`flex-1 sm:flex-initial sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition ${
                            pestana === 'pendientes'
                                ? 'bg-orange-500 shadow text-white'
                                : 'text-slate-500 hover:bg-slate-200'
                        }`}
                    >
                        Por Entregar ({pedidos.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setPestana('historial')}
                        className={`flex-1 sm:flex-initial sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition ${
                            pestana === 'historial'
                                ? 'bg-emerald-500 shadow text-white'
                                : 'text-slate-500 hover:bg-slate-200'
                        }`}
                    >
                        Entregados Hoy ({historial.length})
                    </button>
                </div>
            </div>

            {pestana === 'pendientes' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pedidos.length === 0 && (
                        <div className="col-span-full text-center py-14 bg-white rounded-xl border border-dashed border-slate-300 px-4">
                            <p className="text-slate-500 font-semibold">Todo entregado. Esperando a cocina...</p>
                        </div>
                    )}

                    {pedidos.map(orden => {
                        const esPagadoTransferencia = orden.metodo_pago === 'transferencia';

                        return (
                            <div
                                key={orden.id}
                                className={`w-full bg-white border-l-8 rounded-xl shadow-sm ring-1 ring-slate-200 p-4 sm:p-5 flex flex-col justify-between ${
                                    esPagadoTransferencia ? 'border-emerald-500' : 'border-orange-500'
                                }`}
                            >
                                <div>
                                    <div className="flex justify-between items-start gap-2 mb-3">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="bg-slate-800 text-white text-xs font-bold px-2.5 py-1 rounded-md inline-block">
                                                    Ticket #{orden.numero_diario > 0 ? orden.numero_diario : orden.id}
                                                </span>
                                                {esPagadoTransferencia ? (
                                                    <span className="bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-md inline-block shadow-sm">
                                                        PAGADO (TRANSFERENCIA)
                                                    </span>
                                                ) : (
                                                    <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-md inline-block shadow-sm">
                                                        POR COBRAR (EFECTIVO)
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-1.5 break-words">
                                                {orden.cliente}
                                            </h3>
                                        </div>
                                        {orden.hora_programada && (
                                            <div className="text-right bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300 shrink-0">
                                                <p className="text-[10px] text-amber-700 font-bold uppercase">Entrega</p>
                                                <p className="font-bold text-slate-900 text-sm">{orden.hora_programada}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-3.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                                            Dirección de Entrega
                                        </p>
                                        <p className="text-base sm:text-lg font-semibold text-slate-900 break-words mt-1">
                                            {orden.direccion}
                                        </p>

                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                                orden.direccion || ''
                                            )}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 text-sky-700 text-xs sm:text-sm font-bold hover:text-sky-800 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-200 mt-2.5"
                                        >
                                            Ver en Mapa
                                        </a>
                                    </div>

                                    {orden.comentarios && orden.comentarios.trim() !== '' && (
                                        <div className="mb-3.5 bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-lg text-sm break-words">
                                            <span className="font-bold text-amber-700 text-xs block mb-0.5">
                                                NOTAS DEL CLIENTE:
                                            </span>
                                            <p className="text-slate-500 font-semibold">{orden.comentarios}</p>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap justify-between items-center gap-2 mb-4 pt-2 border-t border-slate-100">
                                        <a
                                            href={`tel:${orden.telefono}`}
                                            className="flex items-center gap-2 text-slate-900 font-bold bg-slate-100 px-3.5 py-2 rounded-lg hover:bg-slate-200 text-xs sm:text-sm transition"
                                        >
                                            Tel: {orden.telefono || 'Sin número'}
                                        </a>
                                        {esPagadoTransferencia ? (
                                            <div className="text-right bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                                                <p className="text-[11px] text-emerald-700 uppercase font-black">
                                                    PAGADO (NO COBRAR)
                                                </p>
                                                <p className="text-sm sm:text-base font-bold text-emerald-600 leading-tight">
                                                    Transferencia (${(orden.total || 0).toFixed(2)})
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="text-right">
                                                <p className="text-[11px] text-amber-600 uppercase font-bold">
                                                    Por Cobrar en Efectivo
                                                </p>
                                                <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-none">
                                                    ${(orden.total || 0).toFixed(2)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => solicitarEntrega(orden.id)}
                                    className="w-full bg-emerald-500 text-white font-bold py-3.5 rounded-xl shadow hover:bg-emerald-600 transition flex justify-center items-center text-sm sm:text-base active:scale-[0.99]"
                                >
                                    MARCAR COMO ENTREGADO
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {pestana === 'historial' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-800 px-4 py-3.5 border-b border-slate-700 flex justify-between items-center">
                        <h3 className="font-bold text-white text-sm sm:text-base">Entregas Realizadas</h3>
                        <span className="bg-emerald-500 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">
                            {historial.length} Total
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[480px]">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                                <tr>
                                    <th className="p-3">Hora</th>
                                    <th className="p-3">Cliente</th>
                                    <th className="p-3">Dirección</th>
                                    <th className="p-3 text-right">Estado de Pago / Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {historial.map(orden => {
                                    const esPagadoTransferencia = orden.metodo_pago === 'transferencia';
                                    return (
                                        <tr key={orden.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-3 text-xs sm:text-sm text-slate-500 font-mono whitespace-nowrap">
                                                {new Date(orden.created_at).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="p-3 font-bold text-slate-900">{orden.cliente}</td>
                                            <td className="p-3 text-xs sm:text-sm text-slate-500 max-w-[200px] truncate">
                                                {orden.direccion}
                                            </td>
                                            <td className="p-3 text-right whitespace-nowrap">
                                                <div className="inline-flex items-center justify-end gap-2">
                                                    <span
                                                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                                            esPagadoTransferencia
                                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                                                        }`}
                                                    >
                                                        {esPagadoTransferencia ? 'PAGADO (TRANSFERENCIA)' : 'COBRADO (EFECTIVO)'}
                                                    </span>
                                                    <span className="font-bold text-emerald-600">
                                                        ${(orden.total || 0).toFixed(2)}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {historial.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-slate-500 italic">
                                            Aún no has entregado pedidos hoy.
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