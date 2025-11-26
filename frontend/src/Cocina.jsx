import { useState, useEffect } from 'react';
import axios from 'axios';
import socket from 'socket.io-client';

const URL_BACKEND = 'https://api-restaurante-yawj.onrender.com';
const io = socket(URL_BACKEND);

export default function Cocina() {
  const [ordenes, setOrdenes] = useState([]);

  useEffect(() => {
    cargarOrdenesPendientes();
    io.on('nueva_orden', (nuevaOrden) => {
      setOrdenes(prev => [...prev, nuevaOrden]);
      playNotificationSound();
    });
    return () => io.off('nueva_orden');
  }, []);

  const cargarOrdenesPendientes = async () => {
    try {
      const { data } = await axios.get(`${URL_BACKEND}/ordenes/pendientes`);
      setOrdenes(data);
    } catch (e) { console.log("Esperando ordenes..."); }
  };
  
  const terminarOrden = async (id) => {
    try {
        await axios.patch(`${URL_BACKEND}/ordenes/${id}/completar`);
        setOrdenes(ordenes.filter(o => o.id !== id));
    } catch (error) {
        alert('Error al completar orden');
    }
  };

  const playNotificationSound = () => {
    const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    audio.play().catch(e => console.log("Audio bloqueado"));
  };

  const getCardStyle = (tipo) => {
      if (tipo === 'domicilio') return 'border-orange-500 bg-orange-50';
      if (tipo === 'retiro') return 'border-purple-500 bg-purple-50';
      return 'border-blue-500 bg-white';
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-2">
        👨‍🍳 Comandas en Cocina <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{ordenes.length} Pendientes</span>
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {ordenes.length === 0 && (
          <div className="col-span-full text-center py-20 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-400 text-xl">Todo limpio. Esperando comandas...</p>
          </div>
        )}

        {ordenes.map((orden) => (
          <div 
            key={orden.id} 
            className={`border-l-8 rounded-lg p-4 shadow-md relative animate-fade-in-up ${getCardStyle(orden.tipo_entrega)}`}
          >
            {/* CABECERA */}
            <div className="flex justify-between items-start mb-2 border-b pb-2 border-gray-200">
                <div>
                    <span className="font-bold text-3xl block text-gray-800">
                        #{orden.numero_diario > 0 ? orden.numero_diario : orden.id}
                    </span>
                    <span className="text-sm font-bold text-gray-600 uppercase">
                         {orden.cliente}
                    </span>
                    <span className="text-xs text-gray-500 font-mono block mt-1">
                         {new Date(orden.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                </div>
                
                {/* ETIQUETAS DE TIPO */}
                {orden.tipo_entrega === 'domicilio' && (
                    <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-1 rounded flex items-center gap-1 border border-orange-200">
                        🛵 MOTO
                    </span>
                )}
                {orden.tipo_entrega === 'retiro' && (
                    <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded flex items-center gap-1 border border-purple-200">
                        🛍️ RETIRO
                    </span>
                )}
            </div>

            {/* HORA PROGRAMADA */}
            {orden.hora_programada && (
                <div className="mb-3 bg-yellow-100 border-l-4 border-yellow-500 p-2 text-yellow-900 rounded-r shadow-sm flex items-center gap-2">
                    <span className="text-xl">⏰</span>
                    <div>
                        <p className="text-xs font-bold uppercase opacity-70">Hora Programada</p>
                        <p className="font-bold text-lg leading-none">{orden.hora_programada}</p>
                    </div>
                </div>
            )}

            {/* INFO DOMICILIO (Solo si es domicilio) */}
            {orden.tipo_entrega === 'domicilio' && (
                <div className="bg-white bg-opacity-60 p-2 rounded text-xs mb-3 text-gray-700 border border-gray-200">
                    <p className="font-bold">📍 {orden.direccion}</p>
                    <p>📞 {orden.telefono}</p>
                </div>
            )}

            {/* COMENTARIOS ESPECIALES (Si existen) */}
            {orden.comentarios && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 rounded-r text-sm mb-3">
                    <div className="flex items-center gap-1 mb-1">
                        <span className="text-yellow-600">💡</span>
                        <span className="font-bold text-yellow-800 text-xs">INSTRUCCIONES:</span>
                    </div>
                    <p className="text-yellow-900 font-semibold">{orden.comentarios}</p>
                </div>
            )}

            <ul className="space-y-1 mb-4">
              {orden.detalles.map((item, index) => (
                <li key={index} className="flex justify-between font-bold text-gray-700 text-lg border-b border-gray-200 last:border-0 pb-1">
                  <span>{item.cantidad}x</span>
                  <span>{item.nombre}</span>
                </li>
              ))}
            </ul>

            <button 
                onClick={() => terminarOrden(orden.id)}
                className="w-full bg-white border border-gray-300 hover:bg-green-600 hover:text-white hover:border-green-600 text-gray-600 font-bold py-2 rounded transition-all flex justify-center items-center gap-2 shadow-sm"
            >
                MARCAR LISTO ✅
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}