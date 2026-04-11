import { useState, useEffect, useRef } from 'react';
import { orderService } from './api/orderService';
import { socketClient } from './api/socketService';

export default function Cocina() {
  const [ordenes, setOrdenes] = useState([]);
  const audioRef = useRef(new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg'));

  // 1. Función ROBUSTA para convertir "1:30 PM" a minutos
  const convertirHoraAMinutos = (horaString) => {
    // Si no hay hora o no es un texto, lo ignoramos
    if (!horaString || typeof horaString !== 'string') return null;
    
    // ASPIRADORA: Quitamos espacios al inicio/final y dobles espacios
    const limpio = horaString.trim().replace(/\s+/g, ' ');
    const partes = limpio.split(' ');
    
    if (partes.length < 2) return null; 
    
    // Extraemos hora y minuto de forma segura
    const [horaStr, minutoStr] = partes[0].split(':');
    const hora = parseInt(horaStr, 10);
    const minuto = parseInt(minutoStr, 10);
    const ampm = partes[1].toUpperCase();
    
    // Si la matemática falló por algún símbolo raro, devolvemos null
    if (isNaN(hora) || isNaN(minuto)) return null;

    let hora24 = hora;
    if (ampm === 'PM' && hora !== 12) hora24 += 12;
    if (ampm === 'AM' && hora === 12) hora24 = 0;
    
    return (hora24 * 60) + minuto;
  };

  // 2. Lógica para ordenar las tarjetas
  const ordenarPedidos = (lista) => {
    if (!Array.isArray(lista)) return []; 

    return [...lista].sort((a, b) => {
      const minA = convertirHoraAMinutos(a.hora_programada);
      const minB = convertirHoraAMinutos(b.hora_programada);

      // Si AMBAS tienen hora programada, ordenar de la más temprana a la más tarde
      if (minA !== null && minB !== null) {
          if (minA !== minB) return minA - minB; // Cronológico
      }

      // Si solo una tiene hora programada, darle prioridad (ponerla al inicio)
      if (minA !== null && minB === null) return -1;
      if (minA === null && minB !== null) return 1;

      // Si tienen la misma hora (o si ninguna de las dos tiene hora), ordenamos por número de ticket
      return (a.numero_diario || a.id) - (b.numero_diario || b.id);
    });
  };

  useEffect(() => {
    cargarOrdenesPendientes();
    
    const manejarNuevaOrden = (nuevaOrden) => {
      setOrdenes(prev => ordenarPedidos([...prev, nuevaOrden]));
      playNotificationSound();
    };

    socketClient.on('nueva_orden', manejarNuevaOrden);
    return () => socketClient.off('nueva_orden', manejarNuevaOrden);
  }, []);

  const cargarOrdenesPendientes = async () => {
    try {
      const { data } = await orderService.getPendientes();
      setOrdenes(ordenarPedidos(data || [])); 
    } catch (e) { 
      console.log("❌ Error cargando órdenes:", e);
    }
  };

  const terminarOrden = async (id) => {
    try {
        await orderService.completarOrden(id);
        setOrdenes(prev => prev.filter(o => o.id !== id));
    } catch (error) {
        alert('Error al completar orden');
    }
  };

  const playNotificationSound = () => {
    if (audioRef.current) {
        audioRef.current.currentTime = 0; 
        audioRef.current.play().catch(e => console.log("Audio bloqueado - Presiona 'Activar Sonido'"));
    }
  };

  const getCardStyle = (tipo) => {
      if (tipo === 'domicilio') return 'border-orange-500 bg-orange-50';
      if (tipo === 'retiro') return 'border-purple-500 bg-purple-50';
      if (tipo === 'personal') return 'border-red-500 bg-red-50';
      return 'border-blue-500 bg-white';
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          👨‍🍳 Comandas en Cocina <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{ordenes.length} Pendientes</span>
        </h1>
        
        <button 
          onClick={playNotificationSound} 
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 text-sm font-bold flex gap-2 items-center"
        >
           🔔 Activar Sonido
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {ordenes.length === 0 && (
          <div className="col-span-full text-center py-20 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-400 text-xl">Todo limpio. Esperando comandas...</p>
          </div>
        )}

        {ordenes.map((orden) => {
          return (
            <div 
              key={orden.id} 
              className={`border-l-8 rounded-lg p-4 shadow-md relative animate-fade-in-up ${getCardStyle(orden.tipo_entrega)}`}
            >
              <div className="flex justify-between items-start mb-2 border-b pb-2 border-gray-200">
                  <div>
                      <span className="font-bold text-3xl block text-gray-800">
                          #{orden.numero_diario || orden.id}
                      </span>
                      <span className="text-sm font-bold text-gray-600 uppercase">
                            {orden.cliente}
                      </span>
                      <span className="text-xs text-gray-500 font-mono block mt-1">
                            {new Date(orden.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                  </div>
                  
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
                  {orden.tipo_entrega === 'personal' && (
                      <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded flex items-center gap-1 border border-red-200">
                          👨‍🍳 PERSONAL
                      </span>
                  )}
              </div>

              {orden.hora_programada && (
                  <div className="mb-3 bg-yellow-100 border-l-4 border-yellow-500 p-2 text-yellow-900 rounded-r shadow-sm flex items-center gap-2">
                      <span className="text-xl">⏰</span>
                      <div>
                          <p className="text-xs font-bold uppercase opacity-70">Hora Programada</p>
                          <p className="font-bold text-lg leading-none">{orden.hora_programada}</p>
                      </div>
                  </div>
              )}

              {orden.tipo_entrega === 'domicilio' && (
                  <div className="bg-white bg-opacity-60 p-2 rounded text-xs mb-3 text-gray-700 border border-gray-200">
                      <p className="font-bold">📍 {orden.direccion}</p>
                      <p>📞 {orden.telefono}</p>
                  </div>
              )}

              {orden.comentarios && orden.comentarios !== null && orden.comentarios.trim() !== '' ? (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 rounded-r text-sm mb-3">
                    <div className="flex items-center gap-1 mb-1">
                        <span className="text-yellow-600">💡</span>
                        <span className="font-bold text-yellow-800 text-xs">INSTRUCCIONES:</span>
                    </div>
                    <p className="text-yellow-900 font-semibold">{orden.comentarios}</p>
                </div>
              ) : (
                <div className="bg-gray-100 p-2 rounded text-xs mb-3 text-gray-500">
                  No hay instrucciones especiales
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
          );
        })}
      </div>
    </div>
  );
}