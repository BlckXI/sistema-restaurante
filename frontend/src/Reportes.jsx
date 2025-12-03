import { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const URL_BACKEND = 'https://api-restaurante-yawj.onrender.com'; 

export default function Reportes() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  
  // Estados para formularios
  const [descGasto, setDescGasto] = useState('');
  const [montoGasto, setMontoGasto] = useState('');
  const [descIngreso, setDescIngreso] = useState('');
  const [montoIngreso, setMontoIngreso] = useState('');

  // Estados UI
  const [notificacion, setNotificacion] = useState(null);
  const [modalCierre, setModalCierre] = useState(false);
  const [modalAnular, setModalAnular] = useState(null); 
  const [modalEliminarIngreso, setModalEliminarIngreso] = useState(null); 

  // NUEVOS ESTADOS PARA FILTROS
  const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split('T')[0]);
  const [mostrarInventario, setMostrarInventario] = useState(false);
  const [inventario, setInventario] = useState(null);
  const [consumoPersonal, setConsumoPersonal] = useState(null);
  const [comparativa, setComparativa] = useState([]);
  const [reporteFechaEspecifica, setReporteFechaEspecifica] = useState(null);

  useEffect(() => {
    cargarReporte();
    cargarInventario();
    cargarConsumoPersonal();
    cargarComparativa();
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

  const cargarReportePorFecha = async (fecha) => {
    try {
      const res = await axios.get(`${URL_BACKEND}/reportes/por-fecha`, {
        params: { fecha }
      });
      setReporteFechaEspecifica(res.data);
      mostrarNotificacion(`Reporte cargado para ${fecha}`, "exito");
    } catch (error) {
      mostrarNotificacion("Error cargando reporte por fecha", "error");
    }
  };

  const cargarInventario = async () => {
    try {
      const res = await axios.get(`${URL_BACKEND}/inventario`);
      setInventario(res.data);
    } catch (error) {
      console.error("Error cargando inventario:", error);
    }
  };

  const cargarConsumoPersonal = async () => {
    try {
      const res = await axios.get(`${URL_BACKEND}/reportes/consumo-personal`);
      setConsumoPersonal(res.data);
    } catch (error) {
      console.error("Error cargando consumo personal:", error);
    }
  };

  const cargarComparativa = async (dias = 7) => {
    try {
      const res = await axios.get(`${URL_BACKEND}/reportes/comparativa`, {
        params: { dias }
      });
      setComparativa(res.data);
    } catch (error) {
      console.error("Error cargando comparativa:", error);
    }
  };

  const mostrarNotificacion = (mensaje, tipo) => {
    setNotificacion({ mensaje, tipo });
    setTimeout(() => setNotificacion(null), 3000);
  };

  // --- GENERACIÓN DE PDF MEJORADO ---
  const generarPDF = () => {
    if (!datos) return;
    const doc = new jsPDF();
    const hoy = new Date().toLocaleDateString();

    // Título
    doc.setFontSize(22);
    doc.text("Reporte de Cierre de Caja", 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Fecha: ${hoy}`, 14, 30);
    doc.text("Monte Sion Variedades", 14, 36);

    // Resumen Financiero
    autoTable(doc, {
        startY: 45,
        head: [['Concepto', 'Monto']],
        body: [
            ['Saldo Inicial (Ayer)', `$${datos.saldoInicial}`],
            ['+ Ventas Comida', `$${datos.ingresoVentas}`],
            ['+ Ingresos Extras', `$${datos.totalIngresosExtras}`],
            ['- Gastos Operativos', `-$${datos.totalGastos}`],
            ['TOTAL EN CAJA', `$${datos.dineroEnCaja}`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 12 },
        columnStyles: { 1: { fontStyle: 'bold', halign: 'right' } }
    });

    // NUEVO: Resumen por Tipo de Entrega
    if (datos.conteoPorTipo) {
        const startY = doc.lastAutoTable.finalY + 15;
        doc.text("Resumen por Tipo de Entrega", 14, startY);
        
        autoTable(doc, {
            startY: startY + 5,
            head: [['Tipo', 'Órdenes', 'Ventas']],
            body: [
                ['Domicilio', datos.conteoPorTipo.domicilio || 0, `$${(datos.ventasPorTipo?.domicilio || 0).toFixed(2)}`],
                ['Retiro', datos.conteoPorTipo.retiro || 0, `$${(datos.ventasPorTipo?.retiro || 0).toFixed(2)}`],
                ['Mesa', datos.conteoPorTipo.mesa || 0, `$${(datos.ventasPorTipo?.mesa || 0).toFixed(2)}`],
                ['Personal', datos.conteoPorTipo.personal || 0, `$${(datos.ventasPorTipo?.personal || 0).toFixed(2)}`],
            ],
            theme: 'striped',
            headStyles: { fillColor: [155, 89, 182] } // Morado
        });
    }

    // Tabla de Gastos
    if (datos.listaGastos.length > 0) {
        doc.text("Detalle de Gastos", 14, doc.lastAutoTable.finalY + 15);
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 20,
            head: [['Descripción', 'Monto']],
            body: datos.listaGastos.map(g => [g.descripcion, `-$${g.monto.toFixed(2)}`]),
            theme: 'striped',
            headStyles: { fillColor: [231, 76, 60] }
        });
    }

    // Tabla de Ventas (Ranking)
    doc.text("Resumen de Ventas (Top Platos)", 14, doc.lastAutoTable.finalY + 15);
    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Plato', 'Cantidad']],
        body: datos.rankingPlatos.map(p => [p.nombre, p.cantidad]),
        theme: 'striped',
        headStyles: { fillColor: [46, 204, 113] }
    });

    // NUEVO: Inventario Crítico
    if (inventario && inventario.stockCritico > 0) {
        doc.text("⚠️ ALERTA: Stock Crítico", 14, doc.lastAutoTable.finalY + 15);
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 20,
            head: [['Plato', 'Stock', 'Categoría']],
            body: inventario.platos
                .filter(p => p.stock < 5)
                .map(p => [p.nombre, p.stock, p.categoria]),
            theme: 'grid',
            headStyles: { fillColor: [231, 76, 60] },
            styles: { 
                fontSize: 10,
                cellPadding: 2
            }
        });
    }

    // Pie de página
    doc.setFontSize(10);
    doc.text("Reporte generado automáticamente por el sistema.", 14, doc.internal.pageSize.height - 10);

    doc.save(`Cierre_Caja_${hoy.replace(/\//g, '-')}.pdf`);
    mostrarNotificacion("PDF descargado", "exito");
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

  const eliminarIngreso = (id) => {
    setModalEliminarIngreso(id);
  };

  const confirmarEliminarIngreso = async () => {
    if(!modalEliminarIngreso) return;
    try {
        await axios.delete(`${URL_BACKEND}/ingresos-extras/${modalEliminarIngreso}`);
        mostrarNotificacion("Ingreso eliminado correctamente", "exito");
        cargarReporte();
    } catch (error) { 
        mostrarNotificacion("Error al eliminar", "error"); 
    } finally {
        setModalEliminarIngreso(null); 
    }
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
        cargarReporte();
        cargarComparativa();
    } catch (error) { mostrarNotificacion("Error al cerrar el día", "error"); }
  };

  // NUEVA FUNCIÓN: Calcular resumen por tipo
  const calcularResumenPorTipo = (ordenes) => {
    const resumen = { domicilio: 0, retiro: 0, mesa: 0, personal: 0 };
    ordenes?.forEach(orden => {
      if (orden.estado !== 'anulado' && orden.tipo_entrega) {
        resumen[orden.tipo_entrega] = (resumen[orden.tipo_entrega] || 0) + 1;
      }
    });
    return resumen;
  };

  if (cargando) return <div className="p-8 text-center animate-pulse">Cargando finanzas...</div>;
  if (!datos) return <div className="p-8 text-center text-red-500">Error cargando datos.</div>;

  const resumenTipo = calcularResumenPorTipo(datos.listaOrdenes);

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 pb-20 relative">
      
      {/* MODALES */}
      {modalEliminarIngreso && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                    <span className="text-3xl">🗑️</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">¿Eliminar Ingreso?</h3>
                <p className="text-gray-600 text-sm mb-6">Se restará del total en caja.</p>
                <div className="flex gap-3 justify-center">
                    <button onClick={() => setModalEliminarIngreso(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200">Cancelar</button>
                    <button onClick={confirmarEliminarIngreso} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-md">Eliminar</button>
                </div>
            </div>
        </div>
      )}

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

      {/* CABECERA CON FILTROS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📊 Finanzas del Día</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <button 
              onClick={() => setMostrarInventario(!mostrarInventario)}
              className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm font-bold hover:bg-gray-200"
            >
              {mostrarInventario ? '📊 Ocultar Inventario' : '📦 Ver Inventario'}
            </button>
            <button 
              onClick={cargarConsumoPersonal}
              className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm font-bold hover:bg-red-200"
            >
              👨‍🍳 Consumo Personal
            </button>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-2">
          {/* FILTRO POR FECHA */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
            <button 
              onClick={() => cargarReportePorFecha(filtroFecha)}
              className="bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 font-bold text-sm"
            >
              📅 Consultar
            </button>
          </div>
          
          <button onClick={generarPDF} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-bold shadow-sm flex items-center gap-2">
            🖨️ PDF
          </button>
          <button onClick={cargarReporte} className="bg-white border border-gray-300 px-4 py-2 rounded hover:bg-gray-100 font-bold shadow-sm">
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* TARJETAS DE RESUMEN MEJORADAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
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
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <p className="text-purple-600 text-xs font-bold uppercase">Órdenes Hoy</p>
            <p className="text-xl font-bold text-purple-700">{datos.cantidadOrdenes}</p>
        </div>
      </div>

      {/* RESUMEN POR TIPO DE ENTREGA */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="font-bold text-lg mb-4 text-gray-700">📊 Distribución por Tipo de Entrega</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-lg ${resumenTipo.domicilio > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
            <p className="text-orange-600 text-xs font-bold uppercase">🛵 Domicilio</p>
            <p className="text-2xl font-bold">{resumenTipo.domicilio || 0}</p>
          </div>
          <div className={`p-4 rounded-lg ${resumenTipo.retiro > 0 ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
            <p className="text-purple-600 text-xs font-bold uppercase">🛍️ Retiro</p>
            <p className="text-2xl font-bold">{resumenTipo.retiro || 0}</p>
          </div>
          <div className={`p-4 rounded-lg ${resumenTipo.mesa > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            <p className="text-blue-600 text-xs font-bold uppercase">🍽️ Mesa</p>
            <p className="text-2xl font-bold">{resumenTipo.mesa || 0}</p>
          </div>
          <div className={`p-4 rounded-lg ${resumenTipo.personal > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
            <p className="text-red-600 text-xs font-bold uppercase">👨‍🍳 Personal</p>
            <p className="text-2xl font-bold">{resumenTipo.personal || 0}</p>
          </div>
        </div>
      </div>

      {/* INVENTARIO (SOLO SI SE ACTIVA) */}
      {mostrarInventario && inventario && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg text-gray-700">📦 Control de Inventario</h2>
            <button onClick={cargarInventario} className="text-blue-600 text-sm font-bold">🔄 Actualizar</button>
          </div>
          
          {/* ALERTAS */}
          {inventario.stockCritico > 0 && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">⚠️</span>
                <h3 className="font-bold text-red-700">ALERTA: Stock Crítico ({inventario.stockCritico} productos)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {inventario.platos
                  .filter(p => p.stock < 5)
                  .map((plato, index) => (
                    <div key={index} className="bg-white p-3 rounded border border-red-200">
                      <p className="font-bold text-gray-800">{plato.nombre}</p>
                      <p className="text-red-600 font-bold">Stock: {plato.stock}</p>
                      <p className="text-xs text-gray-500">{plato.categoria}</p>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* RESUMEN INVENTARIO */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded border">
              <p className="text-gray-600 text-xs font-bold uppercase">Total Productos</p>
              <p className="text-2xl font-bold">{inventario.totalPlatos}</p>
            </div>
            <div className="bg-green-50 p-4 rounded border border-green-200">
              <p className="text-green-600 text-xs font-bold uppercase">Stock Normal</p>
              <p className="text-2xl font-bold">
                {inventario.platos.filter(p => p.stock >= 10).length}
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
              <p className="text-yellow-600 text-xs font-bold uppercase">Stock Bajo</p>
              <p className="text-2xl font-bold">{inventario.stockBajo}</p>
            </div>
            <div className="bg-red-50 p-4 rounded border border-red-200">
              <p className="text-red-600 text-xs font-bold uppercase">Stock Crítico</p>
              <p className="text-2xl font-bold">{inventario.stockCritico}</p>
            </div>
          </div>

          {/* TABLA DE INVENTARIO */}
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-600 uppercase sticky top-0">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {inventario.platos.map((plato) => (
                  <tr key={plato.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{plato.nombre}</td>
                    <td className="px-4 py-3 text-gray-500">{plato.categoria}</td>
                    <td className="px-4 py-3 font-bold">${plato.precio.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${
                        plato.stock < 5 ? 'text-red-600' : 
                        plato.stock < 10 ? 'text-orange-600' : 
                        'text-green-600'
                      }`}>
                        {plato.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        plato.stock < 5 ? 'bg-red-100 text-red-700' : 
                        plato.stock < 10 ? 'bg-orange-100 text-orange-700' : 
                        'bg-green-100 text-green-700'
                      }`}>
                        {plato.stock < 5 ? 'CRÍTICO' : plato.stock < 10 ? 'BAJO' : 'NORMAL'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONSUMO PERSONAL */}
      {consumoPersonal && consumoPersonal.ordenes.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg text-red-600">👨‍🍳 Consumo Personal del Día</h2>
            <button onClick={() => setConsumoPersonal(null)} className="text-gray-400">×</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-red-50 p-4 rounded border border-red-200">
              <p className="text-red-600 text-xs font-bold uppercase">Total Consumos</p>
              <p className="text-2xl font-bold">{consumoPersonal.ordenes.length}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded border border-orange-200">
              <p className="text-orange-600 text-xs font-bold uppercase">Platos Consumidos</p>
              <p className="text-2xl font-bold">{consumoPersonal.totalPlatos}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
              <p className="text-yellow-600 text-xs font-bold uppercase">Valor Estimado</p>
              <p className="text-2xl font-bold">$0.00</p>
            </div>
          </div>

          {consumoPersonal.resumenPlatos && consumoPersonal.resumenPlatos.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-600 mb-2">Platos más consumidos:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {consumoPersonal.resumenPlatos.slice(0, 8).map((item, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded border">
                    <p className="font-bold text-gray-800">{item.nombre}</p>
                    <p className="text-red-600 font-bold">{item.cantidad} unidades</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* REPORTE POR FECHA ESPECÍFICA */}
      {reporteFechaEspecifica && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg text-purple-600">📅 Reporte: {reporteFechaEspecifica.fecha}</h2>
            <button onClick={() => setReporteFechaEspecifica(null)} className="text-gray-400">×</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-purple-50 p-4 rounded border border-purple-200">
              <p className="text-purple-600 text-xs font-bold uppercase">Ventas</p>
              <p className="text-2xl font-bold">${reporteFechaEspecifica.ventas}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded border border-blue-200">
              <p className="text-blue-600 text-xs font-bold uppercase">Dinero en Caja</p>
              <p className="text-2xl font-bold">${reporteFechaEspecifica.dineroEnCaja}</p>
            </div>
            <div className="bg-red-50 p-4 rounded border border-red-200">
              <p className="text-red-600 text-xs font-bold uppercase">Anulado</p>
              <p className="text-2xl font-bold">${reporteFechaEspecifica.anulado}</p>
            </div>
            <div className="bg-green-50 p-4 rounded border border-green-200">
              <p className="text-green-600 text-xs font-bold uppercase">Total Órdenes</p>
              <p className="text-2xl font-bold">
                {Object.values(reporteFechaEspecifica.conteoPorTipo || {}).reduce((a, b) => a + b, 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN ORIGINAL DE GASTOS, INGRESOS Y RANKING */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GASTOS */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
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

        {/* INGRESOS EXTRAS */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
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
                                <td className="py-2 text-right">
                                    <button onClick={() => eliminarIngreso(i.id)} className="text-gray-300 hover:text-red-500 font-bold px-2">×</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {datos.listaIngresosExtras.length === 0 && <p className="text-center text-gray-400 text-xs mt-4">Sin ingresos extras hoy.</p>}
            </div>
        </div>

        {/* RANKING */}
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

      {/* HISTORIAL */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-10">
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
            <h3 className="font-bold text-lg text-gray-700">📜 Historial de Comandas</h3>
            <div className="flex gap-2">
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">Anulado: ${datos.totalAnulado}</span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">Total: {datos.listaOrdenes.length}</span>
            </div>
        </div>
        <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs sticky top-0">
                    <tr>
                        <th className="px-4 py-3">Ticket</th>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Tipo</th>
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
                                  ${orden.tipo_entrega === 'domicilio' ? 'bg-orange-100 text-orange-700 border-orange-200' : 
                                    orden.tipo_entrega === 'retiro' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                    orden.tipo_entrega === 'personal' ? 'bg-red-100 text-red-700 border-red-200' :
                                    'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                  {orden.tipo_entrega.toUpperCase()}
                              </span>
                            </td>
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