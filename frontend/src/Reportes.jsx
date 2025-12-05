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

useEffect(() => {
    cargarReporte();
}, []);

const cargarReporte = async () => {
    try {
        const res = await axios.get(`${URL_BACKEND}/reportes/hoy`);
        console.log("Datos recibidos:", res.data); 
        setDatos(res.data);
    } catch (error) {
        console.error("Error cargando reporte:", error);
        mostrarNotificacion("Error de conexión o datos corruptos", "error");
    } finally {
        setCargando(false);
    }
};

const mostrarNotificacion = (mensaje, tipo) => {
    setNotificacion({ mensaje, tipo });
    setTimeout(() => setNotificacion(null), 3000);
};

// --- FUNCIONES AUXILIARES SEGURAS ---
const calcularResumenPorTipo = (ordenes) => {
    const resumen = { domicilio: 0, retiro: 0, mesa: 0, personal: 0 };
    ordenes?.forEach(orden => {
        if (orden.estado !== 'anulado' && orden.tipo_entrega) {
            resumen[orden.tipo_entrega] = (resumen[orden.tipo_entrega] || 0) + 1;
        }
    });
    return resumen;
};

const calcularEfectivoPorTipo = (ordenes) => {
    const efectivo = { domicilio: 0, retiro: 0, mesa: 0, personal: 0 };
    ordenes?.forEach(orden => {
        if (orden.estado !== 'anulado' && orden.tipo_entrega) {
            efectivo[orden.tipo_entrega] = (efectivo[orden.tipo_entrega] || 0) + (orden.total || 0);
        }
    });
    return efectivo;
};

// --- GENERACIÓN DE PDF FINAL ---
    const generarPDF = async () => {
        if (!datos) {
            mostrarNotificacion("No hay datos para generar PDF", "error");
            return;
        }

        mostrarNotificacion("⏳ Generando PDF...", "info");

        try {
            // 1. OBTENER INVENTARIO (Async)
            let inventario = [];
            try {
                const resInventario = await axios.get(`${URL_BACKEND}/platos`);
                inventario = resInventario.data || [];
            } catch (error) {
                console.error("Error obteniendo inventario", error);
            }

            const doc = new jsPDF();
            
            // Variables seguras
            const listaOrdenesSegura = datos.listaOrdenes || [];
            const listaGastosSegura = datos.listaGastos || [];
            const listaIngresosSegura = datos.listaIngresosExtras || [];
            
            const saldoInicial = parseFloat(datos.saldoInicial || 0);
            const ingresoVentas = parseFloat(datos.ingresoVentas || 0);
            const ingresosExtras = parseFloat(datos.totalIngresosExtras || 0);
            const gastos = parseFloat(datos.totalGastos || 0);
            const dineroEnCaja = parseFloat(datos.dineroEnCaja || 0);
            
            const fechaHoy = new Date().toLocaleDateString('es-ES', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });

            // --- CALCULAR TRANSFERENCIAS PARA PDF ---
            const transferencias = listaOrdenesSegura.filter(o => o.metodo_pago === 'transferencia' && o.estado !== 'anulado');
            const totalTransferencias = transferencias.reduce((sum, o) => sum + o.total, 0);
            const cantidadTransferencias = transferencias.length;

            // --- ENCABEZADO ---
            doc.setFontSize(22);
            doc.setTextColor(41, 128, 185);
            doc.text("REPORTE FINANCIERO", 14, 20);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text("Restaurante D' La Casa", 14, 26);
            doc.setTextColor(0);
            doc.text(`Fecha: ${fechaHoy}`, 14, 35);
            doc.text(`Generado: ${new Date().toLocaleTimeString()}`, 14, 40);

            let yPos = 50;

            // --- 1. RESUMEN DE CAJA ---
            doc.setFontSize(14);
            doc.setTextColor(52, 152, 219);
            doc.text("1. RESUMEN DE CAJA", 14, yPos);
            yPos += 5;

            autoTable(doc, {
                startY: yPos,
                head: [['Concepto', 'Monto ($)']],
                body: [
                    ['Saldo Inicial', `$${saldoInicial.toFixed(2)}`],
                    ['+ Ventas Totales', `$${ingresoVentas.toFixed(2)}`],
                    ['+ Ingresos Extras', `$${ingresosExtras.toFixed(2)}`],
                    ['- Gastos Operativos', `-$${gastos.toFixed(2)}`],
                    ['', ''],
                    [
                        { content: 'TOTAL EN CAJA', styles: { fontStyle: 'bold', fillColor: [235, 245, 251] } },
                        { content: `$${dineroEnCaja.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: [235, 245, 251], textColor: [41, 128, 185] } }
                    ]
                ],
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
                columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
            });

            yPos = doc.lastAutoTable.finalY + 15;

            // --- 2. DESGLOSE POR TIPO ---
            doc.setFontSize(14);
            doc.setTextColor(155, 89, 182);
            doc.text("2. DESGLOSE POR TIPO DE PEDIDO", 14, yPos);
            yPos += 5;

            const calcularDesglose = (tipo) => {
                let cant = 0;
                let totalComida = 0;
                let totalEnvio = 0;
                let totalGeneral = 0;

                listaOrdenesSegura.forEach(o => {
                    if (o.tipo_entrega === tipo && o.estado !== 'anulado') {
                        cant++;
                        const detalles = o.detalles || [];
                        const subtotalOrden = detalles.reduce((sum, item) => sum + ((item.precio || 0) * (item.cantidad || 1)), 0);
                        const totalOrden = parseFloat(o.total || 0);
                        
                        let envioOrden = totalOrden - subtotalOrden;
                        if (envioOrden < 0) envioOrden = 0;

                        totalComida += subtotalOrden;
                        totalEnvio += envioOrden;
                        totalGeneral += totalOrden;
                    }
                });
                return { cant, totalComida, totalEnvio, totalGeneral };
            };

            const dom = calcularDesglose('domicilio');
            const ret = calcularDesglose('retiro');
            const mes = calcularDesglose('mesa');
            const per = calcularDesglose('personal');

            const totalCantidad = dom.cant + ret.cant + mes.cant + per.cant;
            const sumaTotalComida = dom.totalComida + ret.totalGeneral + mes.totalGeneral; 
            const sumaTotalEnvio = dom.totalEnvio;
            const sumaSubtotal = dom.totalGeneral + ret.totalGeneral + mes.totalGeneral;

            autoTable(doc, {
                startY: yPos,
                head: [['Tipo', 'Cantidad', 'Total Comida', 'Total Envío', 'Subtotal']],
                body: [
                    ['Domicilio', dom.cant, `$${dom.totalComida.toFixed(2)}`, `$${dom.totalEnvio.toFixed(2)}`, `$${dom.totalGeneral.toFixed(2)}`],
                    ['Retiro', ret.cant, `$${ret.totalGeneral.toFixed(2)}`, `$0.00`, `$${ret.totalGeneral.toFixed(2)}`],
                    ['Mesa', mes.cant, `$${mes.totalGeneral.toFixed(2)}`, `$0.00`, `$${mes.totalGeneral.toFixed(2)}`],
                    ['Personal', per.cant, `$0.00`, `$0.00`, `$0.00`], 
                    
                    // --- FILA DE TRANSFERENCIAS ---
                    [
                        { content: 'Transferencias (Incluido)', styles: { textColor: [100, 100, 100], fontStyle: 'italic' } },
                        { content: cantidadTransferencias, styles: { halign: 'center', textColor: [100, 100, 100], fontStyle: 'italic' } },
                        '-', '-',
                        { content: `$${totalTransferencias.toFixed(2)}`, styles: { halign: 'right', textColor: [100, 100, 100], fontStyle: 'italic' } }
                    ],

                    [
                        { content: 'TOTAL VENTAS', styles: { fontStyle: 'bold' } }, 
                        { content: totalCantidad, styles: { fontStyle: 'bold', halign: 'center' } }, 
                        { content: `$${sumaTotalComida.toFixed(2)}`, styles: { fontStyle: 'bold' } },
                        { content: `$${sumaTotalEnvio.toFixed(2)}`, styles: { fontStyle: 'bold' } },
                        { content: `$${sumaSubtotal.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right' } }
                    ]
                ],
                theme: 'striped',
                headStyles: { fillColor: [142, 68, 173], textColor: 255 },
                styles: { fontSize: 9, cellPadding: 3 },
                columnStyles: { 
                    0: { fontStyle: 'bold', cellWidth: 35 }, 
                    1: { halign: 'center', cellWidth: 20 }, 
                    4: { halign: 'right', fontStyle: 'bold' } 
                }
            });

            // --- 3. GASTOS ---
            yPos = doc.lastAutoTable.finalY + 15;
            if (listaGastosSegura.length > 0) {
                if (yPos > 240) { doc.addPage(); yPos = 20; }
                doc.setFontSize(14);
                doc.setTextColor(192, 57, 43);
                doc.text("3. DETALLE DE GASTOS", 14, yPos);
                yPos += 5;
                const cuerpoGastos = listaGastosSegura.map(g => [g.descripcion || 'S/D', `-$${parseFloat(g.monto || 0).toFixed(2)}`]);
                autoTable(doc, {
                    startY: yPos,
                    head: [['Descripción', 'Monto']],
                    body: cuerpoGastos,
                    theme: 'plain',
                    headStyles: { fillColor: [231, 76, 60], textColor: 255 },
                    columnStyles: { 1: { halign: 'right', fontStyle: 'bold', textColor: [192, 57, 43] } }
                });
                yPos = doc.lastAutoTable.finalY + 15;
            }

            // --- 4. INGRESOS EXTRAS ---
            if (listaIngresosSegura.length > 0) {
                if (yPos > 240) { doc.addPage(); yPos = 20; }
                doc.setFontSize(14);
                doc.setTextColor(22, 160, 133);
                doc.text("4. INGRESOS EXTRAS", 14, yPos);
                yPos += 5;
                const cuerpoIngresos = listaIngresosSegura.map(i => [i.descripcion || 'S/D', `+$${parseFloat(i.monto || 0).toFixed(2)}`]);
                autoTable(doc, {
                    startY: yPos,
                    head: [['Descripción', 'Monto']],
                    body: cuerpoIngresos,
                    theme: 'plain',
                    headStyles: { fillColor: [26, 188, 156], textColor: 255 },
                    columnStyles: { 1: { halign: 'right', fontStyle: 'bold', textColor: [22, 160, 133] } }
                });
                yPos = doc.lastAutoTable.finalY + 15;
            }

            // --- 5. INVENTARIO ---
            const inventarioConStock = inventario.filter(p => (p.stock || 0) > 0);

            if (inventarioConStock.length > 0) {
                if (yPos > 220) { doc.addPage(); yPos = 20; }
                doc.setFontSize(14);
                doc.setTextColor(230, 126, 34);
                doc.text("5. INVENTARIO RESTANTE", 14, yPos);
                yPos += 5;
                const inventarioOrdenado = [...inventarioConStock].sort((a, b) => (a.stock || 0) - (b.stock || 0));
                const cuerpoInventario = inventarioOrdenado.map(p => {
                    const stock = p.stock || 0;
                    return [p.nombre, stock, stock <= 5 ? 'BAJO' : 'OK'];
                });
                autoTable(doc, {
                    startY: yPos,
                    head: [['Producto', 'Stock', 'Estado']],
                    body: cuerpoInventario,
                    theme: 'grid',
                    headStyles: { fillColor: [230, 126, 34], textColor: 255 },
                    didParseCell: function (data) {
                        if (data.section === 'body' && data.column.index === 1) {
                            if (parseInt(data.cell.raw) <= 5) {
                                data.cell.styles.textColor = [231, 76, 60];
                                data.cell.styles.fontStyle = 'bold';
                            }
                        }
                    },
                    columnStyles: { 1: { halign: 'center', fontStyle: 'bold' }, 2: { halign: 'center' } }
                });
            }

            const nombreArchivo = `Reporte_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(nombreArchivo);
            mostrarNotificacion("✅ Reporte PDF generado", "exito");

        } catch (error) {
            console.error(error);
            mostrarNotificacion("Error al generar PDF", "error");
        }
    };

// ACCIONES DE API
const registrarGasto = async (e) => {
    e.preventDefault();
    try {
        await axios.post(`${URL_BACKEND}/gastos`, { descripcion: descGasto, monto: parseFloat(montoGasto) });
        setDescGasto(''); setMontoGasto(''); cargarReporte();
    } catch (e) { mostrarNotificacion("Error", "error"); }
};
const registrarIngreso = async (e) => {
    e.preventDefault();
    try {
            await axios.post(`${URL_BACKEND}/ingresos-extras`, { descripcion: descIngreso, monto: parseFloat(montoIngreso) });
            setDescIngreso(''); setMontoIngreso(''); cargarReporte();
    } catch (e) { mostrarNotificacion("Error", "error"); }
};
const eliminarGasto = async (id) => { try { await axios.delete(`${URL_BACKEND}/gastos/${id}`); cargarReporte(); } catch (e) {} };
const eliminarIngreso = (id) => setModalEliminarIngreso(id);
const confirmarEliminarIngreso = async () => { try { await axios.delete(`${URL_BACKEND}/ingresos-extras/${modalEliminarIngreso}`); cargarReporte(); setModalEliminarIngreso(null); } catch (e) {} };
const anularOrden = (id) => setModalAnular(id);

const ejecutarAnulacion = async () => { 
    try { 
        await axios.patch(`${URL_BACKEND}/ordenes/${modalAnular}/anular`); 
        cargarReporte(); 
        setModalAnular(null); 
    } catch (e) { 
        console.error("Error anulando:", e);
        mostrarNotificacion("Error al anular orden", "error");
    } 
};

const ejecutarCierre = async () => { 
    try { 
        await axios.post(`${URL_BACKEND}/cierre`, { monto: datos.dineroEnCaja });
        setModalCierre(false);
        mostrarNotificacion("✅ Cierre de caja realizado exitosamente", "exito");
        setTimeout(() => {
            window.location.reload(); 
        }, 2000); 
        
    } catch (e) { 
        console.error("Error cerrando:", e);
        mostrarNotificacion("Error al cerrar caja", "error");
    } 
};


// --- RENDERIZADO CONDICIONAL ---
if (cargando) return <div className="p-10 text-center">Cargando Reportes...</div>;

if (!datos) return <div className="p-10 text-center text-red-500">Error: No se recibieron datos del servidor.</div>;

// PREPARACIÓN DE DATOS
const listaOrdenesSegura = datos.listaOrdenes || [];
const listaGastosSegura = datos.listaGastos || [];
const listaIngresosSegura = datos.listaIngresosExtras || [];
const rankingPlatosSeguro = datos.rankingPlatos || [];

const resumenTipo = calcularResumenPorTipo(listaOrdenesSegura);
const efectivoPorTipo = calcularEfectivoPorTipo(listaOrdenesSegura);

// CALCULAR TRANSFERENCIAS PARA UI
const transferencias = listaOrdenesSegura.filter(o => o.metodo_pago === 'transferencia' && o.estado !== 'anulado');
const totalTransferenciasUI = transferencias.reduce((sum, o) => sum + o.total, 0);

const tipoConfig = {
    domicilio: { emoji: '🛵', label: 'Domicilio' },
    retiro: { emoji: '🛍️', label: 'Retiro' },
    mesa: { emoji: '🍽️', label: 'Mesa' },
    personal: { emoji: '👨‍🍳', label: 'Personal' }
};

return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
        {/* MODALES */}
        {modalEliminarIngreso && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white p-6 rounded shadow-lg">
                    <h3 className="text-lg font-bold">¿Eliminar Ingreso?</h3>
                    <div className="flex gap-2 mt-4 justify-end">
                        <button onClick={() => setModalEliminarIngreso(null)} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                        <button onClick={confirmarEliminarIngreso} className="px-4 py-2 bg-red-600 text-white rounded">Eliminar</button>
                    </div>
                </div>
            </div>
        )}
        
        {modalAnular && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white p-6 rounded shadow-lg">
                    <h3 className="text-lg font-bold">¿Anular Orden?</h3>
                    <div className="flex gap-2 mt-4 justify-end">
                        <button onClick={() => setModalAnular(null)} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                        <button onClick={ejecutarAnulacion} className="px-4 py-2 bg-red-600 text-white rounded">Sí, Anular</button>
                    </div>
                </div>
            </div>
        )}

        {modalCierre && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-900/90">
                    <div className="bg-white p-6 rounded shadow-lg text-center">
                    <h3 className="text-xl font-bold">Cierre de Caja</h3>
                    <p className="text-2xl font-bold my-4">${datos.dineroEnCaja}</p>
                    <div className="flex gap-2 justify-center">
                        <button onClick={() => setModalCierre(false)} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                        <button onClick={ejecutarCierre} className="px-4 py-2 bg-blue-600 text-white rounded">Confirmar</button>
                    </div>
                </div>
            </div>
        )}

        {notificacion && (
            <div className={`fixed top-5 right-5 px-6 py-3 rounded shadow-xl z-50 text-white font-bold ${notificacion.tipo === 'error' ? 'bg-red-500' : 'bg-green-600'}`}>
                {notificacion.mensaje}
            </div>
        )}

        {/* CABECERA */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4 mb-6">
            <h1 className="text-3xl font-bold text-gray-800">📊 Finanzas del Día</h1>
            <div className="flex gap-2">
                <button onClick={generarPDF} className="bg-red-600 text-white px-4 py-2 rounded shadow flex items-center gap-2">🖨️ PDF</button>
                <button onClick={cargarReporte} className="bg-white border px-4 py-2 rounded shadow">🔄 Actualizar</button>
            </div>
        </div>

        {/* TARJETAS DE RESUMEN (AGREGADA TARJETA DE TRANSFERENCIA) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg border">
                <p className="text-xs font-bold uppercase text-gray-500">Saldo Ayer</p>
                <p className="text-xl font-bold">${datos.saldoInicial || "0.00"}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-xs font-bold uppercase text-green-600">+ Ventas Comida</p>
                <p className="text-xl font-bold text-green-700">${datos.ingresoVentas || "0.00"}</p>
            </div>
            <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                <p className="text-xs font-bold uppercase text-teal-600">+ Ingresos Extras</p>
                <p className="text-xl font-bold text-teal-700">${datos.totalIngresosExtras || "0.00"}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-xs font-bold uppercase text-red-600">- Gastos</p>
                <p className="text-xl font-bold text-red-700">${datos.totalGastos || "0.00"}</p>
            </div>
            
            {/* NUEVA TARJETA VISUAL DE TRANSFERENCIAS */}
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <p className="text-xs font-bold uppercase text-indigo-600">🏦 Transferencias</p>
                <p className="text-xl font-bold text-indigo-700">${totalTransferenciasUI.toFixed(2)}</p>
                <p className="text-[10px] text-indigo-400">{transferencias.length} movs.</p>
            </div>

            <div className="bg-blue-600 p-4 rounded-lg shadow-lg text-white">
                <p className="text-xs font-bold uppercase text-blue-100">Total Caja</p>
                <p className="text-3xl font-bold">${datos.dineroEnCaja || "0.00"}</p>
                <button onClick={() => setModalCierre(true)} className="mt-2 bg-white text-blue-700 text-xs font-bold py-1 px-3 rounded w-full">🔒 CERRAR</button>
            </div>
        </div>

        {/* RESUMEN POR TIPO */}
        <div className="bg-white rounded-lg shadow-sm border p-5 mb-6">
            <h2 className="font-bold text-lg mb-4 text-gray-700">📊 Distribución</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="font-bold text-gray-600 mb-3 text-sm uppercase">Cantidad</h3>
                    <div className="space-y-3">
                        {Object.entries(tipoConfig).map(([tipo, config]) => (
                            <div key={tipo} className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <span>{config.emoji}</span>
                                    <span>{config.label}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold">{resumenTipo[tipo] || 0}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h3 className="font-bold text-gray-600 mb-3 text-sm uppercase">Dinero</h3>
                    <div className="space-y-3">
                        {Object.entries(tipoConfig).map(([tipo, config]) => (
                            <div key={tipo} className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <span>{config.emoji}</span>
                                    <span>{config.label}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-green-600">
                                        ${(efectivoPorTipo[tipo] || 0).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm border p-5"><h2 className="font-bold text-lg mb-4 text-red-600">💸 Gastos</h2><form onSubmit={registrarGasto} className="flex gap-2 mb-4"><input type="text" placeholder="Ej.: Hielo..." className="flex-1 p-2 border rounded text-sm" value={descGasto} onChange={e => setDescGasto(e.target.value)} /><input type="number" placeholder="$" className="w-20 p-2 border rounded text-sm" value={montoGasto} onChange={e => setMontoGasto(e.target.value)} /><button type="submit" className="bg-red-500 text-white px-3 rounded font-bold">+</button></form><div className="overflow-y-auto max-h-40"><table className="w-full text-sm"><tbody className="divide-y">{listaGastosSegura.length > 0 ? (listaGastosSegura.map(g => (<tr key={g.id}><td className="py-2">{g.descripcion}</td><td className="py-2 text-right font-bold text-red-600">-${(g.monto || 0).toFixed(2)}</td><td className="py-2 text-right"><button onClick={() => eliminarGasto(g.id)} className="text-gray-300 hover:text-red-500">×</button></td></tr>))) : (<tr><td colSpan="3" className="text-center text-gray-400 py-2">Sin gastos</td></tr>)}</tbody></table></div></div>
            <div className="bg-white rounded-lg shadow-sm border p-5"><h2 className="font-bold text-lg mb-4 text-teal-600">💰 Ingresos Extras</h2><form onSubmit={registrarIngreso} className="flex gap-2 mb-4"><input type="text" placeholder="Ej.: Inyección de capital..." className="flex-1 p-2 border rounded text-sm" value={descIngreso} onChange={e => setDescIngreso(e.target.value)} /><input type="number" placeholder="$" className="w-20 p-2 border rounded text-sm" value={montoIngreso} onChange={e => setMontoIngreso(e.target.value)} /><button type="submit" className="bg-teal-500 text-white px-3 rounded font-bold">+</button></form><div className="overflow-y-auto max-h-40"><table className="w-full text-sm"><tbody className="divide-y">{listaIngresosSegura.length > 0 ? (listaIngresosSegura.map(i => (<tr key={i.id}><td className="py-2">{i.descripcion}</td><td className="py-2 text-right font-bold text-teal-600">+${(i.monto || 0).toFixed(2)}</td><td className="py-2 text-right"><button onClick={() => eliminarIngreso(i.id)} className="text-gray-300 hover:text-red-500">×</button></td></tr>))) : (<tr><td colSpan="3" className="text-center text-gray-400 py-2">Sin ingresos extras</td></tr>)}</tbody></table></div></div>
            <div className="bg-white rounded-lg shadow-sm border p-5"><h2 className="font-bold text-lg text-gray-700 mb-4">🏆 Top Ventas</h2><div className="overflow-y-auto max-h-40"><table className="w-full text-sm"><tbody className="divide-y">{rankingPlatosSeguro.length > 0 ? (rankingPlatosSeguro.map((p, i) => (<tr key={i}><td className="py-2"><span className="text-xs text-gray-400 mr-2">#{i + 1}</span>{p.nombre}</td><td className="py-2 text-right font-bold text-blue-600">{p.cantidad}</td></tr>))) : (<tr><td colSpan="2" className="text-center text-gray-400 py-2">Sin ventas aún</td></tr>)}</tbody></table></div></div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-10"><div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center"><h3 className="font-bold text-lg text-gray-700">📜 Historial</h3><div className="flex gap-2"><span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">Anulado: ${datos.totalAnulado || "0.00"}</span><span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">Cant: {listaOrdenesSegura.length}</span></div></div><div className="overflow-x-auto max-h-96"><table className="w-full text-left text-sm"><thead className="bg-gray-100 text-gray-600 uppercase text-xs sticky top-0"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Total</th><th className="px-4 py-3 text-right">Opción</th></tr></thead><tbody className="divide-y divide-gray-200">{listaOrdenesSegura.length > 0 ? (listaOrdenesSegura.map((orden) => (<tr key={orden.id} className={`transition-colors ${orden.estado === 'anulado' ? 'bg-red-50 opacity-60' : 'hover:bg-gray-50'}`}><td className="px-4 py-3 font-bold">#{orden.numero_diario || orden.id}</td><td className="px-4 py-3">{orden.cliente}</td><td className="px-4 py-3">{orden.tipo_entrega}</td><td className="px-4 py-3">{orden.estado}</td><td className="px-4 py-3 font-bold">${(orden.total || 0).toFixed(2)}</td><td className="px-4 py-3 text-right">{orden.estado !== 'anulado' && (<button onClick={() => anularOrden(orden.id)} className="text-red-500 hover:text-red-700 text-xs border border-red-200 px-2 py-1 rounded">🚫</button>)}</td></tr>))) : (<tr><td colSpan="6" className="text-center p-4">No hay órdenes registradas hoy.</td></tr>)}</tbody></table></div></div>
    </div>
);
}