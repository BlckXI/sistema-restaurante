import { useState, useEffect } from 'react';
import axios from 'axios';

const URL_BACKEND = 'https://api-restaurante-yawj.onrender.com';

export default function Reportes() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  
  // Estados para nuevo gasto
  const [descGasto, setDescGasto] = useState('');
  const [montoGasto, setMontoGasto] = useState('');

  // Estado para notificaciones
  const [notificacion, setNotificacion] = useState(null);

  // Estados para MODALES
  const [modalCierre, setModalCierre] = useState(false);
  const [modalAnular, setModalAnular] = useState(null); // Guardará el ID de la orden

  useEffect(() => {
    cargarReporte();
  }, []);

  const cargarReporte = async () => {
    try {
      const res = await axios.get(`${URL_BACKEND}/reportes/hoy`);
      setDatos(res.data);
    } catch (error) {
      console.error(error);
      mostrarNotificacion("Error de conexión", "error");
    } finally {
      setCargando(false);
    }
  };

  const mostrarNotificacion = (mensaje, tipo) => {
    setNotificacion({ mensaje, tipo });
    setTimeout(() => setNotificacion(null), 3000);
  };

  // --- LÓGICA DE ANULACIÓN (NUEVA) ---
  
  // 1. Abrir el modal
  const solicitarAnulacion = (id) => {
    setModalAnular(id);
  };

  // 2. Ejecutar la anulación real
  const ejecutarAnulacion = async () => {
    if (!modalAnular) return;

    try {
        await axios.patch(`${URL_BACKEND}/ordenes/${modalAnular}/anular`);
        mostrarNotificacion("Orden Anulada y Stock Restaurado", "exito");
        cargarReporte(); 
    } catch (error) {
        mostrarNotificacion("No se pudo anular la orden", "error");
    } finally {
        setModalAnular(null); // Cerrar modal
    }
  };

  const registrarGasto = async (e) => {
    e.preventDefault();
    if (!descGasto || !montoGasto) return;

    try {
        await axios.post(`${URL_BACKEND}/gastos`, {
            descripcion: descGasto,
            monto: parseFloat(montoGasto)
        });
        setDescGasto('');
        setMontoGasto('');
        mostrarNotificacion("Gasto registrado correctamente", "exito");
        cargarReporte();
    } catch (error) {
        mostrarNotificacion("Error al guardar. Verifica el monto.", "error");
    }
  };

  const eliminarGasto = async (id) => {
    if(!window.confirm("¿Borrar este gasto?")) return;
    try {
        await axios.delete(`${URL_BACKEND}/gastos/${id}`);
        mostrarNotificacion("Gasto eliminado", "exito");
        cargarReporte();
    } catch (error) { 
        mostrarNotificacion("Error al eliminar gasto", "error");
    }
  };

  const ejecutarCierre = async () => {
    const hoy = new Date().toISOString().split('T')[0];
    try {
        await axios.post(`${URL_BACKEND}/cierre`, {
            fecha: hoy,
            monto: parseFloat(datos.dineroEnCaja)
        });
        setModalCierre(false);
        mostrarNotificacion("✅ Día cerrado. Mañana iniciarás con este saldo.", "exito");
    } catch (error) {
        mostrarNotificacion("Error al cerrar el día", "error");
    }
  };

  if (cargando) return <div className="p-8 text-center text-gray-500 animate-pulse">Cargando finanzas...</div>;
  if (!datos) return <div className="p-8 text-center text-red-500">Error cargando datos. Revisa el servidor.</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 pb-20 relative">
      
      {/* --- MODAL ANULAR ORDEN (NUEVO) --- */}
      {modalAnular && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 transition-all">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 animate-fade-in-up border-t-8 border-red-500">
                <div className="p-8 text-center space-y-4">
                    <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-4">
                        <span className="text-4xl">🚫</span>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-800">¿Anular esta Orden?</h3>
                    
                    <div className="text-gray-600 text-sm space-y-2">
                        <p>Esta acción restará el dinero de la caja.</p>
                        <div className="bg-green-50 text-green-800 p-3 rounded border border-green-200 font-medium">
                            ♻️ Los productos se devolverán automáticamente al inventario.
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-5 flex gap-3 justify-center border-t border-gray-100">
                    <button 
                        onClick={() => setModalAnular(null)}
                        className="w-1/2 bg-white text-gray-700 border border-gray-300 font-bold py-3 rounded-xl hover:bg-gray-100 transition"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={ejecutarAnulacion}
                        className="w-1/2 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition transform active:scale-95"
                    >
                        SÍ, ANULAR
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL CIERRE DE CAJA --- */}
      {modalCierre && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-blue-900 bg-opacity-90 backdrop-blur-sm p-4 transition-all">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 animate-fade-in-up">
                <div className="bg-blue-600 p-6 text-center">
                    <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-blue-500 mb-4 shadow-inner">
                        <span className="text-4xl">🔒</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">Cierre de Caja</h3>
                    <p className="text-blue-100 text-sm">Confirmación requerida</p>
                </div>
                
                <div className="p-8 text-center space-y-4">
                    <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Monto final en caja</p>
                    <p className="text-5xl font-bold text-gray-800 tracking-tight">${datos.dineroEnCaja}</p>
                    
                    <div className="bg-yellow-50 border border-yellow-100 rounded p-3 text-sm text-yellow-800 mt-4">
                        ⚠️ <strong>Atención:</strong> Este monto se guardará como el <u>Saldo Inicial</u> para el día de mañana.
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-5 flex gap-3 justify-center border-t border-gray-100">
                    <button 
                        onClick={() => setModalCierre(false)}
                        className="w-1/2 bg-white text-gray-700 border border-gray-300 font-bold py-3 rounded-xl hover:bg-gray-100 transition"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={ejecutarCierre}
                        className="w-1/2 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition transform active:scale-95"
                    >
                        CONFIRMAR
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* NOTIFICACIÓN FLOTANTE */}
      {notificacion && (
        <div className={`fixed top-20 right-5 px-6 py-3 rounded shadow-xl z-50 text-white font-bold animate-bounce
            ${notificacion.tipo === 'error' ? 'bg-red-500' : 'bg-green-600'}`}>
            {notificacion.mensaje}
        </div>
      )}

      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">📊 Finanzas del Día</h1>
        <button 
            onClick={cargarReporte} 
            className="bg-white border border-gray-300 px-4 py-2 rounded hover:bg-gray-100 text-gray-700 font-bold shadow-sm transition"
        >
            🔄 Actualizar Datos
        </button>
      </div>

      {/* 1. TARJETAS DE RESUMEN FINANCIERO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* SALDO INICIAL */}
        <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 flex flex-col justify-between">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Saldo Inicial (Ayer)</p>
            <p className="text-2xl font-bold text-gray-700">${datos.saldoInicial}</p>
        </div>

        {/* VENTAS HOY */}
        <div className="bg-green-50 p-5 rounded-lg border border-green-200 flex flex-col justify-between">
            <p className="text-green-600 text-xs font-bold uppercase tracking-wider">+ Ventas de Hoy</p>
            <p className="text-2xl font-bold text-green-700">${datos.ingresoVentas}</p>
        </div>

        {/* GASTOS HOY */}
        <div className="bg-red-50 p-5 rounded-lg border border-red-200 flex flex-col justify-between">
            <p className="text-red-600 text-xs font-bold uppercase tracking-wider">- Gastos de Hoy</p>
            <p className="text-2xl font-bold text-red-700">${datos.totalGastos}</p>
        </div>

        {/* TOTAL CAJA */}
        <div className="bg-blue-600 p-5 rounded-lg shadow-lg text-white flex flex-col justify-between relative overflow-hidden group">
            <div className="relative z-10">
                <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">Dinero Total en Caja</p>
                <p className="text-4xl font-bold">${datos.dineroEnCaja}</p>
            </div>
            <button 
                onClick={() => setModalCierre(true)}
                className="mt-3 bg-white text-blue-700 text-xs font-bold py-2 px-4 rounded hover:bg-blue-50 transition shadow-sm relative z-10 w-full flex items-center justify-center gap-2"
            >
                <span>🔒</span> CERRAR DÍA
            </button>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-blue-500 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 2. SECCIÓN DE GASTOS */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="font-bold text-lg text-gray-700 mb-4 flex items-center gap-2">
                💸 Registrar Gastos / Compras
            </h2>
            
            <form onSubmit={registrarGasto} className="flex gap-2 mb-4">
                <input 
                    type="text" placeholder="Ej. Hielo, Servilletas..." 
                    className="flex-1 p-2 border rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
                    value={descGasto} onChange={e => setDescGasto(e.target.value)}
                />
                <input 
                    type="number" step="0.01" placeholder="$0.00" 
                    className="w-24 p-2 border rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
                    value={montoGasto} onChange={e => setMontoGasto(e.target.value)}
                />
                <button type="submit" className="bg-red-500 text-white px-4 rounded font-bold hover:bg-red-600 transition">
                    Agregar
                </button>
            </form>

            <div className="overflow-y-auto max-h-60 pr-2">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 sticky top-0">
                        <tr>
                            <th className="p-2 rounded-tl">Descripción</th>
                            <th className="p-2 text-right">Monto</th>
                            <th className="p-2 rounded-tr"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {datos.listaGastos.map(g => (
                            <tr key={g.id} className="hover:bg-gray-50">
                                <td className="p-2">{g.descripcion}</td>
                                <td className="p-2 text-right font-bold text-red-600">-${g.monto.toFixed(2)}</td>
                                <td className="p-2 text-right">
                                    <button onClick={() => eliminarGasto(g.id)} className="text-gray-300 hover:text-red-500 font-bold text-lg leading-none">×</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {datos.listaGastos.length === 0 && <p className="text-center text-gray-400 text-sm mt-8 italic">No hay gastos registrados hoy.</p>}
            </div>
        </div>

        {/* 3. RANKING PLATOS */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="font-bold text-lg text-gray-700 mb-4">🏆 Top Ventas Hoy</h2>
            <div className="overflow-y-auto max-h-80 pr-2">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 sticky top-0">
                        <tr>
                            <th className="p-2 rounded-tl">Plato</th>
                            <th className="p-2 text-right rounded-tr">Cant.</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {datos.rankingPlatos.map((p, i) => (
                            <tr key={i} className="hover:bg-blue-50">
                                <td className="p-2 font-medium text-gray-700">
                                    <span className="text-xs text-gray-400 mr-2">#{i+1}</span>
                                    {p.nombre}
                                </td>
                                <td className="p-2 text-right font-bold text-blue-600">{p.cantidad}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {datos.rankingPlatos.length === 0 && <p className="text-center text-gray-400 text-sm mt-8 italic">Aún no se ha vendido nada hoy.</p>}
            </div>
        </div>
      </div>

      {/* 4. HISTORIAL DE ORDENES (PARA ANULAR) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-10">
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
            <h3 className="font-bold text-lg text-gray-700">📜 Historial de Comandas (Hoy)</h3>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">Anulado: ${datos.totalAnulado}</span>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold tracking-wider">
                    <tr>
                        <th className="px-4 py-3">Ticket</th>
                        <th className="px-4 py-3">Hora</th>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {datos.listaOrdenes.map((orden) => (
                        <tr key={orden.id} className={`transition-colors ${orden.estado === 'anulado' ? 'bg-red-50 opacity-60' : 'hover:bg-gray-50'}`}>
                            <td className="px-4 py-3 font-bold text-gray-700">#{orden.numero_diario > 0 ? orden.numero_diario : orden.id}</td>
                            <td className="px-4 py-3 text-gray-500">{new Date(orden.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                            <td className="px-4 py-3 font-medium">{orden.cliente}</td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold border
                                    ${orden.estado === 'listo' ? 'bg-green-100 text-green-700 border-green-200' : 
                                      orden.estado === 'anulado' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                                    {orden.estado.toUpperCase()}
                                </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-gray-800">${orden.total.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right">
                                {orden.estado !== 'anulado' && (
                                    <button 
                                        onClick={() => solicitarAnulacion(orden.id)}
                                        className="text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1 ml-auto"
                                        title="Anular Venta y Devolver Stock"
                                    >
                                        <span>🚫</span> Anular
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {datos.listaOrdenes.length === 0 && (
                <div className="p-8 text-center text-gray-400 italic">
                    No hay ventas registradas hoy.
                </div>
            )}
        </div>
      </div>
    </div>
  );
}