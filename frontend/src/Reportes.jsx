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
  const [comparativa, setComparativa] = useState([]);

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
  if (!datos || !inventario) return;
  const doc = new jsPDF();
  const hoy = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Título
  doc.setFontSize(22);
  doc.setTextColor(41, 128, 185); // Azul
  doc.text("REPORTE COMPLETO - MONTE SIÓN VARIEDADES", 14, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Fecha: ${hoy}`, 14, 30);
  doc.text(`Generado: ${new Date().toLocaleTimeString()}`, 14, 36);

  let yPos = 45;

  // =========== SECCIÓN 1: RESUMEN FINANCIERO ===========
  doc.setFontSize(16);
  doc.setTextColor(52, 152, 219);
  doc.text("1. RESUMEN FINANCIERO", 14, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [['Concepto', 'Monto ($)']],
    body: [
      ['Saldo Inicial del Día', `$${datos.saldoInicial}`],
      ['+ Ventas Totales', `$${datos.ingresoVentas}`],
      ['+ Ingresos Extras', `$${datos.totalIngresosExtras}`],
      ['- Gastos Operativos', `-$${datos.totalGastos}`],
      ['', ''],
      [{content: 'TOTAL EN CAJA', styles: {fontStyle: 'bold', fillColor: [52, 152, 219]}}, 
       {content: `$${datos.dineroEnCaja}`, styles: {fontStyle: 'bold', fillColor: [52, 152, 219]}}]
    ],
    theme: 'grid',
    headStyles: { 
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: { 
      fontSize: 11,
      cellPadding: 5
    },
    columnStyles: { 
      1: { halign: 'right', fontStyle: 'bold' }
    }
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // =========== SECCIÓN 2: RESUMEN POR TIPO DE ENTREGA ===========
  doc.setFontSize(16);
  doc.setTextColor(155, 89, 182);
  doc.text("2. RESUMEN POR TIPO DE ENTREGA", 14, yPos);
  yPos += 10;

  // Calcular resumen por tipo
  const resumenTipo = calcularResumenPorTipo(datos.listaOrdenes);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Tipo', 'Cantidad Órdenes', 'Porcentaje']],
    body: [
      [
        {content: '🛵 Domicilio', styles: {textColor: [230, 126, 34]}},
        resumenTipo.domicilio || 0,
        {content: `${((resumenTipo.domicilio || 0) / datos.cantidadOrdenes * 100).toFixed(1)}%`, styles: {textColor: [46, 204, 113]}}
      ],
      [
        {content: '🛍️ Retiro', styles: {textColor: [142, 68, 173]}},
        resumenTipo.retiro || 0,
        {content: `${((resumenTipo.retiro || 0) / datos.cantidadOrdenes * 100).toFixed(1)}%`, styles: {textColor: [46, 204, 113]}}
      ],
      [
        {content: '🍽️ Mesa', styles: {textColor: [52, 152, 219]}},
        resumenTipo.mesa || 0,
        {content: `${((resumenTipo.mesa || 0) / datos.cantidadOrdenes * 100).toFixed(1)}%`, styles: {textColor: [46, 204, 113]}}
      ],
      [
        {content: '👨‍🍳 Personal', styles: {textColor: [231, 76, 60]}},
        resumenTipo.personal || 0,
        {content: `${((resumenTipo.personal || 0) / datos.cantidadOrdenes * 100).toFixed(1)}%`, styles: {textColor: [231, 76, 60]}}
      ],
      [
        {content: 'TOTAL', styles: {fontStyle: 'bold', fillColor: [241, 196, 15]}},
        {content: datos.cantidadOrdenes, styles: {fontStyle: 'bold'}},
        {content: '100%', styles: {fontStyle: 'bold'}}
      ]
    ],
    theme: 'striped',
    headStyles: { 
      fillColor: [155, 89, 182],
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: { 
      fontSize: 10,
      cellPadding: 4
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { halign: 'center' },
      2: { halign: 'center' }
    }
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // =========== SECCIÓN 3: CONSUMO PERSONAL ===========
  doc.setFontSize(16);
  doc.setTextColor(231, 76, 60);
  doc.text("3. CONSUMO PERSONAL", 14, yPos);
  yPos += 10;

  if (consumoPersonal && consumoPersonal.ordenes.length > 0) {
    // Resumen de consumo personal
    autoTable(doc, {
      startY: yPos,
      head: [['Concepto', 'Valor']],
      body: [
        ['Total Órdenes Personales', consumoPersonal.ordenes.length],
        ['Platos Consumidos', consumoPersonal.totalPlatos],
        ['Valor Estimado', '$0.00'],
        ['Ahorro Estimado', `$${(consumoPersonal.totalPlatos * 2.5).toFixed(2)}`]
      ],
      theme: 'grid',
      headStyles: { 
        fillColor: [231, 76, 60],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: { 
        fontSize: 10,
        cellPadding: 4
      },
      columnStyles: {
        1: { halign: 'right', fontStyle: 'bold' }
      }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // Top 5 platos más consumidos
    if (consumoPersonal.resumenPlatos && consumoPersonal.resumenPlatos.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text("Platos más consumidos por empleados:", 14, yPos);
      yPos += 7;

      autoTable(doc, {
        startY: yPos,
        head: [['#', 'Plato', 'Cantidad']],
        body: consumoPersonal.resumenPlatos.slice(0, 5).map((item, index) => [
          index + 1,
          item.nombre,
          {content: item.cantidad, styles: {fontStyle: 'bold', textColor: [231, 76, 60]}}
        ]),
        theme: 'plain',
        headStyles: { 
          fillColor: [245, 245, 245],
          textColor: [100, 100, 100],
          fontStyle: 'bold'
        },
        styles: { 
          fontSize: 9,
          cellPadding: 3,
          lineColor: [240, 240, 240]
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          2: { halign: 'center' }
        }
      });

      yPos = doc.lastAutoTable.finalY + 10;
    }
  } else {
    doc.setFontSize(11);
    doc.setTextColor(150, 150, 150);
    doc.text("No hubo consumo personal hoy.", 14, yPos);
    yPos += 15;
  }

  // =========== SECCIÓN 4: CONTROL DE INVENTARIO ===========
  doc.setFontSize(16);
  doc.setTextColor(46, 204, 113);
  doc.text("4. CONTROL DE INVENTARIO", 14, yPos);
  yPos += 10;

  // Resumen de inventario
  autoTable(doc, {
    startY: yPos,
    head: [['Estado', 'Cantidad Productos', 'Detalle']],
    body: [
      [
        {content: '✅ Stock Normal', styles: {textColor: [46, 204, 113]}},
        inventario.platos.filter(p => p.stock >= 10).length,
        'Stock ≥ 10 unidades'
      ],
      [
        {content: '⚠️ Stock Bajo', styles: {textColor: [230, 126, 34]}},
        inventario.stockBajo,
        'Stock < 10 unidades'
      ],
      [
        {content: '🚨 Stock Crítico', styles: {textColor: [231, 76, 60]}},
        inventario.stockCritico,
        'Stock < 5 unidades'
      ],
      [
        {content: '📦 Total Productos', styles: {fontStyle: 'bold'}},
        {content: inventario.totalPlatos, styles: {fontStyle: 'bold'}},
        {content: 'Principales + Porciones', styles: {fontStyle: 'bold'}}
      ]
    ],
    theme: 'grid',
    headStyles: { 
      fillColor: [46, 204, 113],
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: { 
      fontSize: 10,
      cellPadding: 4
    },
    columnStyles: {
      1: { halign: 'center' },
      2: { fontStyle: 'italic' }
    }
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // Alertas de stock crítico
  const stockCritico = inventario.platos.filter(p => p.stock < 5);
  if (stockCritico.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(231, 76, 60);
    doc.text("🚨 ALERTAS DE STOCK CRÍTICO:", 14, yPos);
    yPos += 7;

    autoTable(doc, {
      startY: yPos,
      head: [['Plato', 'Categoría', 'Stock Actual', 'Precio']],
      body: stockCritico.map(p => [
        p.nombre,
        p.categoria,
        {content: p.stock.toString(), styles: {fontStyle: 'bold', textColor: [231, 76, 60]}},
        `$${p.precio.toFixed(2)}`
      ]),
      theme: 'striped',
      headStyles: { 
        fillColor: [231, 76, 60],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: { 
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        2: { halign: 'center' },
        3: { halign: 'right' }
      }
    });

    yPos = doc.lastAutoTable.finalY + 10;
  }

  // Tabla completa de inventario (solo primera página)
  doc.setFontSize(12);
  doc.setTextColor(52, 73, 94);
  doc.text("Inventario Completo (Primeros 20 productos):", 14, yPos);
  yPos += 7;

  autoTable(doc, {
    startY: yPos,
    head: [['Producto', 'Categoría', 'Stock', 'Estado', 'Precio']],
    body: inventario.platos.slice(0, 20).map(p => [
      p.nombre,
      p.categoria,
      p.stock,
      {content: p.stock < 5 ? 'CRÍTICO' : p.stock < 10 ? 'BAJO' : 'NORMAL', 
       styles: {
         textColor: p.stock < 5 ? [231, 76, 60] : p.stock < 10 ? [230, 126, 34] : [46, 204, 113],
         fontStyle: 'bold'
       }},
      `$${p.precio.toFixed(2)}`
    ]),
    theme: 'grid',
    headStyles: { 
      fillColor: [52, 73, 94],
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: { 
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
      cellWidth: 'wrap'
    },
    columnStyles: {
      0: { cellWidth: 60 },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // =========== SECCIÓN 5: TOP VENTAS ===========
  if (datos.rankingPlatos && datos.rankingPlatos.length > 0) {
    doc.addPage();
    yPos = 20;
    
    doc.setFontSize(16);
    doc.setTextColor(52, 152, 219);
    doc.text("5. TOP VENTAS DEL DÍA", 14, yPos);
    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [['Posición', 'Plato', 'Cantidad Vendida', 'Popularidad']],
      body: datos.rankingPlatos.slice(0, 15).map((p, index) => [
        {content: `#${index + 1}`, styles: {fontStyle: 'bold'}},
        p.nombre,
        {content: p.cantidad.toString(), styles: {fontStyle: 'bold', textColor: [41, 128, 185]}},
        {content: '★'.repeat(Math.min(5, Math.floor(p.cantidad / 3))), styles: {textColor: [241, 196, 15]}}
      ]),
      theme: 'striped',
      headStyles: { 
        fillColor: [52, 152, 219],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: { 
        fontSize: 10,
        cellPadding: 4
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 30 },
        2: { halign: 'center', cellWidth: 40 },
        3: { halign: 'center' }
      }
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // Gráfico de barras simple (textual)
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text("Distribución de Ventas:", 14, yPos);
    yPos += 10;

    const maxVentas = datos.rankingPlatos[0]?.cantidad || 1;
    
    datos.rankingPlatos.slice(0, 8).forEach((p, index) => {
      const barWidth = (p.cantidad / maxVentas) * 100;
      doc.setFillColor(52 + (index * 20), 152, 219);
      doc.rect(30, yPos, barWidth, 6, 'F');
      
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(p.nombre.substring(0, 20), 30 + barWidth + 5, yPos + 4);
      
      doc.setTextColor(100, 100, 100);
      doc.text(p.cantidad.toString(), 14, yPos + 4);
      
      yPos += 10;
    });
  }

  // Pie de página en todas las páginas
  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
    doc.text("Sistema POS Monte Sión Variedades", 14, doc.internal.pageSize.height - 10);
  }

  // Guardar PDF
  const nombreArchivo = `Reporte_Completo_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(nombreArchivo);
  mostrarNotificacion("✅ Reporte PDF generado exitosamente", "exito");
};

// Función para calcular resumen por tipo
const calcularResumenPorTipo = (ordenes) => {
  const resumen = { domicilio: 0, retiro: 0, mesa: 0, personal: 0 };
  ordenes?.forEach(orden => {
    if (orden.estado !== 'anulado' && orden.tipo_entrega) {
      resumen[orden.tipo_entrega] = (resumen[orden.tipo_entrega] || 0) + 1;
    }
  });
  return resumen;
};

// Cargar consumo personal cuando generes el PDF
useEffect(() => {
  cargarReporte();
  cargarInventario();
  cargarConsumoPersonal(); // Asegúrate de cargarlo
}, []);

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
        </div>
        
        <div className="flex flex-col md:flex-row gap-2">
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