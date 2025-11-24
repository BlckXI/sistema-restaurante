import { useState, useEffect } from 'react';
import axios from 'axios';
import socket from 'socket.io-client';

const URL_BACKEND = 'http://localhost:3000'; 
const io = socket(URL_BACKEND);

export default function Repartidor() {
  const [pestana, setPestana] = useState('pendientes'); // 'pendientes' o 'historial'
  const [pedidos, setPedidos] = useState([]);
  const [historial, setHistorial] = useState([]);

  // --- ESTADOS PARA UI MEJORADA ---
  const [notificacion, setNotificacion] = useState(null);
  const [modalEntregar, setModalEntregar] = useState(null); // Guarda el ID de la orden a confirmar

  useEffect(() => {
    cargarDatos();

    // Escuchar cuando cocina termina algo
    io.on('orden_lista', (orden) => {
        if (orden.tipo_entrega === 'domicilio') {
            playNotificationSound();
            cargarDatos(); 
        }
    });

    return () => io.off('orden_lista');
  }, []);

  const cargarDatos = async () => {
    try {
        const resPendientes = await axios.get(`${URL_BACKEND}/repartidor/pedidos`);
        setPedidos(resPendientes.data);

        const resHistorial = await axios.get(`${URL_BACKEND}/repartidor/historial`);
        setHistorial(resHistorial.data);
    } catch (error) { console.error("Error cargando datos repartidor"); }
  };

  // --- LÓGICA DE ENTREGA CON MODAL ---
  
  // 1. Abrir modal (pregunta)
  const solicitarEntrega = (id) => {
    setModalEntregar(id);
  };

  // 2. Ejecutar acción (respuesta afirmativa)
  const confirmarEntrega = async () => {
    if (!modalEntregar) return;

    try {
        await axios.patch(`${URL_BACKEND}/ordenes/${modalEntregar}/entregar`);
        mostrarNotificacion("¡Entrega registrada con éxito! 🚀", "exito");
        cargarDatos(); // Mover de pendiente a historial
    } catch (error) { 
        mostrarNotificacion("Error al registrar la entrega", "error");
    } finally {
        setModalEntregar(null); // Cerrar modal
    }
  };

  const mostrarNotificacion = (mensaje, tipo) => {
    setNotificacion({ mensaje, tipo });
    setTimeout(() => setNotificacion(null), 3000);
  };

  const playNotificationSound = () => {
    const audio = new Audio('https://actions.google.com/sounds/v1/transport_transportation/car_horn.ogg');
    audio.play().catch(e => console.log("Audio bloqueado"));
  };

  return (
    <div className="max-w-4xl mx-auto p-4 relative">
      
      {/* --- MODAL DE CONFIRMACIÓN DE ENTREGA (NUEVO) --- */}
      {modalEntregar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-green-900 bg-opacity-90 backdrop-blur-sm p-4 transition-all animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform scale-100">
                <div className="bg-green-600 p-6 text-center">
                    <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-white bg-opacity-20 mb-4 backdrop-blur-md shadow-inner">
                        <span className="text-4xl text-white">📦</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">Confirmar Entrega</h3>
                    <p className="text-green-100 text-sm">¿Ya entregaste este pedido?</p>
                </div>
                
                <div className="p-6 text-center">
                    <p className="text-gray-600">Al confirmar, la orden pasará al historial de entregas realizadas.</p>
                </div>

                <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-center border-t border-gray-100">
                    <button 
                        onClick={() => setModalEntregar(null)}
                        className="w-1/2 bg-white text-gray-700 border border-gray-300 font-bold py-3 rounded-xl hover:bg-gray-100 transition"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={confirmarEntrega}
                        className="w-1/2 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition transform active:scale-95"
                    >
                        ¡SÍ, ENTREGADO!
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* NOTIFICACIÓN TOAST */}
      {notificacion && (
        <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-xl z-[60] text-white font-bold transition-all animate-bounce
            ${notificacion.tipo === 'error' ? 'bg-red-500' : 'bg-green-600'}`}>
            {notificacion.mensaje}
        </div>
      )}

      <h1 className="text-3xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        🛵 Panel de Repartidor
      </h1>

      {/* PESTAÑAS */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
        <button 
            onClick={() => setPestana('pendientes')}
            className={`flex-1 py-2 rounded-md font-bold transition ${pestana === 'pendientes' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
        >
            Por Entregar ({pedidos.length})
        </button>
        <button 
            onClick={() => setPestana('historial')}
            className={`flex-1 py-2 rounded-md font-bold transition ${pestana === 'historial' ? 'bg-white shadow text-green-600' : 'text-gray-500 hover:bg-gray-200'}`}
        >
            Entregados Hoy ({historial.length})
        </button>
      </div>

      {/* CONTENIDO PESTAÑA PENDIENTES */}
      {pestana === 'pendientes' && (
        <div className="grid gap-4 md:grid-cols-2">
            {pedidos.length === 0 && (
                <div className="col-span-full text-center py-12 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-4xl mb-2">😎</p>
                    <p className="text-blue-800 font-bold">Todo entregado. Esperando a cocina...</p>
                </div>
            )}

            {pedidos.map(orden => (
                <div key={orden.id} className="bg-white border-l-8 border-blue-500 rounded-lg shadow-md p-5 relative hover:shadow-lg transition">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">
                                Ticket #{orden.numero_diario > 0 ? orden.numero_diario : orden.id}
                            </span>
                            <h3 className="text-xl font-bold text-gray-800 mt-1">{orden.cliente}</h3>
                        </div>
                        {orden.hora_programada && (
                            <div className="text-right bg-yellow-100 px-2 py-1 rounded border border-yellow-200">
                                <p className="text-[10px] text-yellow-800 font-bold uppercase">Entrega</p>
                                <p className="font-bold text-yellow-900">{orden.hora_programada}</p>
                            </div>
                        )}
                    </div>

                    {/* DIRECCIÓN GIGANTE */}
                    <div className="mb-4 bg-gray-50 p-3 rounded border border-gray-200">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">📍 Dirección de Entrega</p>
                        <p className="text-lg font-medium text-gray-800 break-words mt-1">{orden.direccion}</p>
                        
                        <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(orden.direccion)}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-blue-600 text-sm font-bold hover:text-blue-800 hover:underline flex items-center gap-1 mt-3"
                        >
                            <span>🗺️</span> Ver en Mapa
                        </a>
                    </div>

                    <div className="flex justify-between items-center mb-4 bg-white">
                        <a href={`tel:${orden.telefono}`} className="flex items-center gap-2 text-gray-600 font-bold bg-gray-100 px-3 py-2 rounded hover:bg-gray-200 transition">
                            📞 {orden.telefono || 'Sin número'}
                        </a>
                        <div className="text-right">
                            <p className="text-xs text-gray-400 uppercase font-bold">Cobrar</p>
                            <p className="text-2xl font-bold text-gray-800 leading-none">${orden.total.toFixed(2)}</p>
                        </div>
                    </div>

                    <button 
                        onClick={() => solicitarEntrega(orden.id)}
                        className="w-full bg-green-600 text-white font-bold py-3 rounded-lg shadow hover:bg-green-700 transition flex justify-center items-center gap-2 transform active:scale-[0.98]"
                    >
                        📦 MARCAR COMO ENTREGADO
                    </button>
                </div>
            ))}
        </div>
      )}

      {/* CONTENIDO PESTAÑA HISTORIAL */}
      {pestana === 'historial' && (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
            <div className="bg-green-50 p-4 border-b border-green-100 flex justify-between items-center">
                <h3 className="font-bold text-green-800">Entregas Realizadas</h3>
                <span className="bg-white text-green-600 px-2 py-1 rounded text-xs font-bold shadow-sm">{historial.length} Total</span>
            </div>
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                        <th className="p-3">Hora</th>
                        <th className="p-3">Cliente</th>
                        <th className="p-3 hidden sm:table-cell">Dirección</th>
                        <th className="p-3 text-right">Cobrado</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {historial.map(orden => (
                        <tr key={orden.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-3 text-sm text-gray-500 font-mono">
                                {new Date(orden.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </td>
                            <td className="p-3 font-bold text-gray-700">{orden.cliente}</td>
                            <td className="p-3 text-sm text-gray-600 truncate max-w-xs hidden sm:table-cell">{orden.direccion}</td>
                            <td className="p-3 text-right font-bold text-green-600">${orden.total.toFixed(2)}</td>
                        </tr>
                    ))}
                    {historial.length === 0 && (
                        <tr><td colSpan="4" className="p-8 text-center text-gray-400 italic">Aún no has entregado nada hoy.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      )}
    </div>
  );
}