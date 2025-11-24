import { useState, useEffect } from 'react';
import axios from 'axios';

const URL_BACKEND = 'https://api-restaurante-yawj.onrender.com';

export default function Reportes() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  
  // Estados para nuevo gasto
  const [descGasto, setDescGasto] = useState('');
  const [montoGasto, setMontoGasto] = useState('');

  // Estados para nuevo INGRESO EXTRA
  const [descIngreso, setDescIngreso] = useState('');
  const [montoIngreso, setMontoIngreso] = useState('');

  const [notificacion, setNotificacion] = useState(null);
  const [modalCierre, setModalCierre] = useState(false);
  const [modalAnular, setModalAnular] = useState(null);

  useEffect(() => {
    cargarReporte();
  }, []);

  const cargarReporte = async () => {
    try {
      const res = await axios.get(`${URL_BACKEND}/reportes/hoy`);
      setDatos(res.data);
    } catch (error) {
      mostrarNotificacion("Error de conexión", "error");
    } finally {
      setCargando(false);
    }
  };

  const mostrarNotificacion = (mensaje, tipo) => {
    setNotificacion({ mensaje, tipo });
    setTimeout(() => setNotificacion(null), 3000);
  };

  // --- GASTOS ---
  const registrarGasto = async (e) => {
    e.preventDefault();
    if (!descGasto || !montoGasto) return;
    try {
        await axios.post(`${URL_BACKEND}/gastos`, { descripcion: descGasto, monto: parseFloat(montoGasto) });
        setDescGasto(''); setMontoGasto('');
        mostrarNotificacion("Gasto registrado", "exito");
        cargarReporte();
    } catch (error) { mostrarNotificacion("Error al guardar gasto", "error"); }
  };

  const eliminarGasto = async (id) => {
    if(!window.confirm("¿Borrar este gasto?")) return;
    try {
        await axios.delete(`${URL_BACKEND}/gastos/${id}`);
        mostrarNotificacion("Gasto eliminado", "exito");
        cargarReporte();
    } catch (error) { mostrarNotificacion("Error al eliminar", "error"); }
  };

  // --- INGRESOS EXTRAS ---
  const registrarIngreso = async (e) => {
    e.preventDefault();
    if (!descIngreso || !montoIngreso) return;
    try {
        await axios.post(`${URL_BACKEND}/ingresos-extras`, { descripcion: descIngreso, monto: parseFloat(montoIngreso) });
        setDescIngreso(''); setMontoIngreso('');
        mostrarNotificacion("Ingreso extra registrado", "exito");
        cargarReporte();
    } catch (error) { mostrarNotificacion("Error al guardar ingreso", "error"); }
  };

  const eliminarIngreso = async (id) => {
    if(!window.confirm("¿Borrar este ingreso?")) return;
    try {
        await axios.delete(`${URL_BACKEND}/ingresos-extras/${id}`);
        mostrarNotificacion("Ingreso eliminado", "exito");
        cargarReporte();
    } catch (error) { mostrarNotificacion("Error al eliminar", "error"); }
  };

  // --- ORDENES Y CIERRE ---
  const anularOrden = async (id) => {
    setModalAnular(id); 
  };
  
  const ejecutarAnulacion = async () => {
    if (!modalAnular) return;
    try {
        await axios.patch(`${URL_BACKEND}/ordenes/${modalAnular}/anular`);
        mostrarNotificacion("Orden Anulada y Stock Restaurado", "exito");
        cargarReporte(); 
    } catch (error) { mostrarNotificacion("No se pudo anular", "error"); } 
    finally { setModalAnular(null); }
  };

  const ejecutarCierre = async () => {
    const hoy = new Date().toISOString().split('T')[0];
    try {
        await axios.post(`${URL_BACKEND}/cierre`, { fecha: hoy, monto: parseFloat(datos.dineroEnCaja) });
        setModalCierre(false);
        mostrarNotificacion("✅ Día cerrado correctamente", "exito");
    } catch (error) { mostrarNotificacion("Error al cerrar el día", "error"); }
  };

  if (cargando) return <div className="p-8 text-center animate-pulse">Cargando finanzas...</div>;
  if (!datos) return <div className="p-8 text-center text-red-500">Error cargando datos.</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 pb-20 relative">
      
      {/* MODALES Y NOTIFICACIONES */}
      {modalAnular && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6 text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">¿Anular Orden?</h3>
                <p className="text-gray-600 mb-6">El dinero se restará y el stock volverá al inventario.</p>
                <div className="flex gap-3 justify-center">
                    <button onClick={() => setModalAnular(null)} className="px-4 py-2 bg-gray-200 rounded-lg font-bold">Cancelar</button>
                    <button onClick={ejecutarAnulacion} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold">Sí, Anular</button>
                </div>
            </div>
        </div>
      )}
      {modalCierre && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-blue-900 bg-opacity-90 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6 text-center">
                <h3 className="text-2xl font-bold text-blue-800 mb-1">Cierre de Caja</h3>
                <p className="text-gray-500 text-sm mb-6">Monto final: <span className="text-3xl font-bold block mt-2">${datos.dineroEnCaja}</span></p>
                <div className="flex gap-3 justify-center">
                    <button onClick={() => setModalCierre(false)} className="px-4 py-2 bg-gray-200 rounded-lg font-bold">Cancelar</button>
                    <button onClick={ejecutarCierre} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">Confirmar Cierre</button>
                </div>
            </div>
        </div>
      )}
      {notificacion && (
        <div className={`fixed top-20 right-5 px-6 py-3 rounded shadow-xl z-50 text-white font-bold animate-bounce ${notificacion.tipo === 'error' ? 'bg-red-500' : 'bg-green-600'}`}>{notificacion.mensaje}</div>
      )}

      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">📊 Finanzas del Día</h1>
        <button onClick={cargarReporte} className="bg-white border border-gray-300 px-4 py-2 rounded hover:bg-gray-100 font-bold shadow-sm">🔄 Actualizar</button>
      </div>

      {/* 1. TARJETAS DE RESUMEN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-gray-500 text-xs font-bold uppercase">Saldo Ayer</p>
            <p className="text-xl font-bold text-gray-700">${datos.saldoInicial}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-green-600 text-xs font-bold uppercase">+ Ventas Comida</p>
            <p className="text-xl font-bold text-green-700">${datos.ingresoVentas}</p>
        </div>
        <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
            <p className="text-teal-600 text-xs font-bold uppercase">+ Ingresos Extras</p>
            <p className="text-xl font-bold text-teal-700">${datos.totalIngresosExtras}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-red-600 text-xs font-bold uppercase">- Gastos</p>
            <p className="text-xl font-bold text-red-700">${datos.totalGastos}</p>
        </div>
        <div className="bg-blue-600 p-4 rounded-lg shadow-lg text-white relative overflow-hidden">
            <p className="text-blue-100 text-xs font-bold uppercase">Total Caja</p>
            <p className="text-3xl font-bold">${datos.dineroEnCaja}</p>
            <button onClick={() => setModalCierre(true)} className="mt-2 bg-white text-blue-700 text-xs font-bold py-1 px-3 rounded w-full">🔒 CERRAR</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. SECCIÓN DE GASTOS */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            {/* CORRECCIÓN AQUÍ: Solo un color de texto */}
            <h2 className="font-bold text-lg mb-4 text-red-600">💸 Registrar Gastos</h2>
            <form onSubmit={registrarGasto} className="flex gap-2 mb-4">
                <input type="text" placeholder="Ej. Hielo..." className="flex-1 p-2 border rounded text-sm" value={descGasto} onChange={e => setDescGasto(e.target.value)} />
                <input type="number" step="0.01" placeholder="$" className="w-20 p-2 border rounded text-sm" value={montoGasto} onChange={e => setMontoGasto(e.target.value)} />
                <button type="submit" className="bg-red-500 text-white px-3 rounded font-bold text-sm">+</button>
            </form>
            <div className="overflow-y-auto max-h-40 pr-2">
                <table className="w-full text-sm text-left">
                    <tbody className="divide-y">
                        {datos.listaGastos.map(g => (
                            <tr key={g.id}>
                                <td className="py-2">{g.descripcion}</td>
                                <td className="py-2 text-right font-bold text-red-600">-${g.monto.toFixed(2)}</td>
                                <td className="py-2 text-right"><button onClick={() => eliminarGasto(g.id)} className="text-gray-300 hover:text-red-500">×</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* 3. SECCIÓN DE INGRESOS EXTRAS */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            {/* CORRECCIÓN AQUÍ: Solo un color de texto */}
            <h2 className="font-bold text-lg mb-4 text-teal-600">💰 Ingresos Extras</h2>
            <form onSubmit={registrarIngreso} className="flex gap-2 mb-4">
                <input type="text" placeholder="Ej. Propina..." className="flex-1 p-2 border rounded text-sm" value={descIngreso} onChange={e => setDescIngreso(e.target.value)} />
                <input type="number" step="0.01" placeholder="$" className="w-20 p-2 border rounded text-sm" value={montoIngreso} onChange={e => setMontoIngreso(e.target.value)} />
                <button type="submit" className="bg-teal-500 text-white px-3 rounded font-bold text-sm">+</button>
            </form>
            <div className="overflow-y-auto max-h-40 pr-2">
                <table className="w-full text-sm text-left">
                    <tbody className="divide-y">
                        {datos.listaIngresosExtras.map(i => (
                            <tr key={i.id}>
                                <td className="py-2">{i.descripcion}</td>
                                <td className="py-2 text-right font-bold text-teal-600">+${i.monto.toFixed(2)}</td>
                                <td className="py-2 text-right"><button onClick={() => eliminarIngreso(i.id)} className="text-gray-300 hover:text-red-500">×</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {datos.listaIngresosExtras.length === 0 && <p className="text-center text-gray-400 text-xs mt-4">Sin ingresos extras hoy.</p>}
            </div>
        </div>

        {/* 4. RANKING PLATOS */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="font-bold text-lg text-gray-700 mb-4">🏆 Top Ventas</h2>
            <div className="overflow-y-auto max-h-40 pr-2">
                <table className="w-full text-sm text-left">
                    <tbody className="divide-y">
                        {datos.rankingPlatos.map((p, i) => (
                            <tr key={i}>
                                <td className="py-2"><span className="text-xs text-gray-400 mr-2">#{i+1}</span>{p.nombre}</td>
                                <td className="py-2 text-right font-bold text-blue-600">{p.cantidad}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* 5. HISTORIAL DE ORDENES */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-10">
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
            <h3 className="font-bold text-lg text-gray-700">📜 Historial de Comandas</h3>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">Anulado: ${datos.totalAnulado}</span>
        </div>
        <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs sticky top-0">
                    <tr>
                        <th className="px-4 py-3">Ticket</th>
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
                                    <button onClick={() => anularOrden(orden.id)} className="text-red-500 hover:text-red-700 font-bold text-xs border border-red-200 px-2 py-1 rounded hover:bg-red-50">🚫 Anular</button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}