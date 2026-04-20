import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { reportService } from './api/reportService';
import { orderService } from './api/orderService';
import { socketClient } from './api/socketService';

export default function Reportes() {
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(true);

    const [descGasto, setDescGasto] = useState('');
    const [montoGasto, setMontoGasto] = useState('');
    const [descIngreso, setDescIngreso] = useState('');
    const [montoIngreso, setMontoIngreso] = useState('');
    const [notificacion, setNotificacion] = useState(null);
    const [modalCierre, setModalCierre] = useState(false);
    const [modalAnular, setModalAnular] = useState(null);
    const [modalEliminarIngreso, setModalEliminarIngreso] = useState(null);

    useEffect(() => {
        cargarReporte();

        // ESCUCHAR CAMBIOS EN TIEMPO REAL
        socketClient.on('nueva_orden', cargarReporte);
        socketClient.on('orden_anulada', cargarReporte);
        socketClient.on('orden_lista', cargarReporte);
        socketClient.on('reporte_actualizado', cargarReporte);

        return () => {
            socketClient.off('nueva_orden', cargarReporte);
            socketClient.off('orden_anulada', cargarReporte);
            socketClient.off('orden_lista', cargarReporte);
            socketClient.off('reporte_actualizado', cargarReporte); // Corrección de evento off
        };
    }, []);

    const cargarReporte = async () => {
        try {
            const res = await reportService.getReporteHoy();
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

    // --- GENERACIÓN DE PDF FINAL ---
    const generarPDF = async () => {
        if (!datos) { mostrarNotificacion("No hay datos para generar PDF", "error"); return; }
        mostrarNotificacion("⏳ Generando PDF...", "info");

        try {
            const doc = new jsPDF();
            const fechaHoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            // DATOS SEGUROS
            const listaOrdenesSegura = datos.listaOrdenes || [];
            const validOrders = listaOrdenesSegura.filter(o => o.estado !== 'anulado');
            const listaGastosSegura = datos.listaGastos || [];
            const listaIngresosSegura = datos.listaIngresosExtras || [];
            const platosDia = datos.platosDia || []; // Datos esperados del backend

            // LÓGICA CONTABLE CLARA
            const saldoInicial = parseFloat(datos.saldoInicial || 0);
            const totalIngresosExtras = parseFloat(datos.totalIngresosExtras || 0);
            const totalGastos = parseFloat(datos.totalGastos || 0);

            // Ventas por método de pago (Solo órdenes válidas)
            const ventasTransferencia = validOrders
                .filter(o => o.metodo_pago === 'transferencia')
                .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

            const ventasEfectivo = validOrders
                .filter(o => o.metodo_pago !== 'transferencia')
                .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

            // Domicilios
            const pedidosDomicilio = validOrders.filter(o => o.tipo_entrega === 'domicilio').length;
            const totalDomicilios = pedidosDomicilio * 0.50;

            // Totales Finales
            const totalBanco = ventasTransferencia;
            const totalEfectivo = saldoInicial + ventasEfectivo + totalIngresosExtras + totalDomicilios - totalGastos;

            // ENCABEZADO PDF
            doc.setFontSize(22); doc.setTextColor(41, 128, 185); doc.text("REPORTE FINANCIERO", 14, 20);
            doc.setFontSize(10); doc.setTextColor(100); doc.text("Restaurante D' La Casa", 14, 26);
            doc.setTextColor(0); doc.text(`Fecha: ${fechaHoy}`, 14, 35); doc.text(`Generado: ${new Date().toLocaleTimeString()}`, 14, 40);

            let yPos = 50;

            // 1. RESUMEN DE CAJA (REESTRUCTURADO)
            doc.setFontSize(14); doc.setTextColor(52, 152, 219); doc.text("1. RESUMEN DE CAJA", 14, yPos); yPos += 5;
            autoTable(doc, {
                startY: yPos,
                head: [['Concepto', 'Monto ($)']],
                body: [
                    ['Saldo Inicial', `$${saldoInicial.toFixed(2)}`],
                    ['+ Ventas en Efectivo', `$${ventasEfectivo.toFixed(2)}`],
                    ['+ Ingresos Extras', `$${totalIngresosExtras.toFixed(2)}`],
                    ['+ Total Domicilios', `$${totalDomicilios.toFixed(2)}`],
                    ['- Gastos Operativos', `-$${totalGastos.toFixed(2)}`],
                    ['', ''],
                    [{ content: 'TOTAL EN BANCO (Transferencias)', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, { content: `$${totalBanco.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
                    [{ content: 'TOTAL EN EFECTIVO (Caja Física)', styles: { fontStyle: 'bold', fillColor: [235, 245, 251] } }, { content: `$${totalEfectivo.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: [235, 245, 251], textColor: [41, 128, 185] } }]
                ],
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
                columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
            });

            yPos = doc.lastAutoTable.finalY + 15;

            // 2. GASTOS
            if (listaGastosSegura.length > 0) {
                if (yPos > 240) { doc.addPage(); yPos = 20; }
                doc.setFontSize(14); doc.setTextColor(192, 57, 43); doc.text("2. DETALLE DE GASTOS", 14, yPos); yPos += 5;
                const cuerpoGastos = listaGastosSegura.map(g => [g.descripcion || 'S/D', `-$${parseFloat(g.monto || 0).toFixed(2)}`]);
                autoTable(doc, {
                    startY: yPos, head: [['Descripción', 'Monto']], body: cuerpoGastos, theme: 'plain', headStyles: { fillColor: [231, 76, 60], textColor: 255 }, columnStyles: { 1: { halign: 'right', fontStyle: 'bold', textColor: [192, 57, 43] } }
                });
                yPos = doc.lastAutoTable.finalY + 15;
            }

            // 3. INGRESOS EXTRAS
            if (listaIngresosSegura.length > 0) {
                if (yPos > 240) { doc.addPage(); yPos = 20; }
                doc.setFontSize(14); doc.setTextColor(22, 160, 133); doc.text("3. INGRESOS EXTRAS", 14, yPos); yPos += 5;
                const cuerpoIngresos = listaIngresosSegura.map(i => [i.descripcion || 'S/D', `+$${parseFloat(i.monto || 0).toFixed(2)}`]);
                autoTable(doc, {
                    startY: yPos, head: [['Descripción', 'Monto']], body: cuerpoIngresos, theme: 'plain', headStyles: { fillColor: [26, 188, 156], textColor: 255 }, columnStyles: { 1: { halign: 'right', fontStyle: 'bold', textColor: [22, 160, 133] } }
                });
                yPos = doc.lastAutoTable.finalY + 15;
            }

            // 4. PLATOS DEL DÍA (NUEVA TABLA)
            if (platosDia.length > 0) {
                if (yPos > 240) { doc.addPage(); yPos = 20; }
                doc.setFontSize(14); doc.setTextColor(243, 156, 18); doc.text("4. PLATOS DEL DÍA", 14, yPos); yPos += 5;

                const cuerpoPlatos = platosDia.map(p => {
                    const inicial = p.inicial || 0; const vendidos = p.vendidos || 0;
                    const consumo = p.consumo || 0; const final = p.final || 0;
                    const diferencia = inicial - vendidos - consumo - final;
                    return [p.nombre, inicial, vendidos, consumo, final, diferencia];
                });

                autoTable(doc, {
                    startY: yPos,
                    head: [['Plato', 'Inicial', 'Vendidos', 'Consumo', 'Final', 'Diferencia']],
                    body: cuerpoPlatos,
                    theme: 'striped',
                    headStyles: { fillColor: [243, 156, 18], textColor: 255 },
                    didParseCell: function (data) {
                        if (data.section === 'body' && data.column.index === 5) {
                            const val = parseInt(data.cell.raw);
                            if (val !== 0) { data.cell.styles.textColor = [231, 76, 60]; data.cell.styles.fontStyle = 'bold'; }
                        }
                    },
                    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center', fontStyle: 'bold' } }
                });
            }

            const nombreArchivo = `Reporte_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(nombreArchivo);
            mostrarNotificacion("✅ Reporte PDF generado", "exito");

        } catch (error) { console.error(error); mostrarNotificacion("Error al generar PDF", "error"); }
    };

    // HANDLERS
    const registrarGasto = async (e) => { e.preventDefault(); try { await reportService.addGasto({ descripcion: descGasto, monto: parseFloat(montoGasto) }); setDescGasto(''); setMontoGasto(''); cargarReporte(); } catch (e) { mostrarNotificacion("Error", "error"); } };
    const registrarIngreso = async (e) => { e.preventDefault(); try { await reportService.addIngresoExtra({ descripcion: descIngreso, monto: parseFloat(montoIngreso) }); setDescIngreso(''); setMontoIngreso(''); cargarReporte(); } catch (e) { mostrarNotificacion("Error", "error"); } };
    const eliminarGasto = async (id) => { try { await reportService.deleteGasto(id); cargarReporte(); } catch (e) {} };
    const eliminarIngreso = (id) => setModalEliminarIngreso(id);
    const confirmarEliminarIngreso = async () => { try { await reportService.deleteIngresoExtra(modalEliminarIngreso); cargarReporte(); setModalEliminarIngreso(null); } catch (e) {} };
    const anularOrden = (id) => setModalAnular(id);
    const ejecutarAnulacion = async () => { try { await orderService.anularOrden(modalAnular); cargarReporte(); setModalAnular(null); } catch (e) { console.error("Error anulando:", e); mostrarNotificacion("Error al anular orden", "error"); } };
    
    // Cierre de caja enviará el Total en Efectivo real
    const ejecutarCierre = async () => {
        try {
            // Se asume que totalEfectivoUI se calcula antes del return
            await reportService.cerrarCaja({ monto: totalEfectivoUI });
            setModalCierre(false);
            mostrarNotificacion("✅ Cierre de caja realizado exitosamente", "exito");
            setTimeout(() => { window.location.reload(); }, 2000);
        } catch (e) { console.error("Error cerrando:", e); mostrarNotificacion("Error al cerrar caja", "error"); }
    };

    if (cargando) return <div className="p-10 text-center">Cargando Reportes...</div>;
    if (!datos) return <div className="p-10 text-center text-red-500">Error: No se recibieron datos del servidor.</div>;

    // --- CÁLCULOS PARA LA INTERFAZ ---
    const listaOrdenesSegura = datos.listaOrdenes || [];
    const validOrders = listaOrdenesSegura.filter(o => o.estado !== 'anulado');
    const listaGastosSegura = datos.listaGastos || [];
    const listaIngresosSegura = datos.listaIngresosExtras || [];
    const platosDia = datos.platosDia || []; // Asumiendo que vendrán del backend

    const saldoInicialUI = parseFloat(datos.saldoInicial || 0);
    const totalIngresosExtrasUI = parseFloat(datos.totalIngresosExtras || 0);
    const totalGastosUI = parseFloat(datos.totalGastos || 0);

    const ventasTransferenciaUI = validOrders.filter(o => o.metodo_pago === 'transferencia').reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    const ventasEfectivoUI = validOrders.filter(o => o.metodo_pago !== 'transferencia').reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    const cantidadTransferencias = validOrders.filter(o => o.metodo_pago === 'transferencia').length;

    const pedidosDomicilio = validOrders.filter(o => o.tipo_entrega === 'domicilio').length;
    const totalDomiciliosUI = pedidosDomicilio * 0.50;

    const totalBancoUI = ventasTransferenciaUI;
    const totalEfectivoUI = saldoInicialUI + ventasEfectivoUI + totalIngresosExtrasUI + totalDomiciliosUI - totalGastosUI;

    return (
        <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
            {/* MODALES */}
            {modalEliminarIngreso && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-white p-6 rounded shadow-lg"><h3 className="text-lg font-bold">¿Eliminar Ingreso?</h3><div className="flex gap-2 mt-4 justify-end"><button onClick={() => setModalEliminarIngreso(null)} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button><button onClick={confirmarEliminarIngreso} className="px-4 py-2 bg-red-600 text-white rounded">Eliminar</button></div></div></div>}
            {modalAnular && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-white p-6 rounded shadow-lg"><h3 className="text-lg font-bold">¿Anular Orden?</h3><div className="flex gap-2 mt-4 justify-end"><button onClick={() => setModalAnular(null)} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button><button onClick={ejecutarAnulacion} className="px-4 py-2 bg-red-600 text-white rounded">Sí, Anular</button></div></div></div>}
            {modalCierre && <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-900/90"><div className="bg-white p-6 rounded shadow-lg text-center"><h3 className="text-xl font-bold">Cierre de Caja (Efectivo)</h3><p className="text-2xl font-bold my-4 text-blue-600">${totalEfectivoUI.toFixed(2)}</p><div className="flex gap-2 justify-center"><button onClick={() => setModalCierre(false)} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button><button onClick={ejecutarCierre} className="px-4 py-2 bg-blue-600 text-white rounded">Confirmar</button></div></div></div>}
            {notificacion && <div className={`fixed top-5 right-5 px-6 py-3 rounded shadow-xl z-50 text-white font-bold ${notificacion.tipo === 'error' ? 'bg-red-500' : 'bg-green-600'}`}>{notificacion.mensaje}</div>}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4 mb-6">
                <h1 className="text-3xl font-bold text-gray-800">📊 Resumen de Caja</h1>
                <div className="flex gap-2"><button onClick={generarPDF} className="bg-red-600 text-white px-4 py-2 rounded shadow flex items-center gap-2">🖨️ Imprimir PDF</button></div>
            </div>

            {/* DASHBOARD Kpis - REESTRUCTURADO */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg border col-span-2 lg:col-span-1"><p className="text-xs font-bold uppercase text-gray-500">Saldo Inicial</p><p className="text-xl font-bold">${saldoInicialUI.toFixed(2)}</p></div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200 col-span-2 lg:col-span-1"><p className="text-xs font-bold uppercase text-green-600">Ventas Efectivo</p><p className="text-xl font-bold text-green-700">${ventasEfectivoUI.toFixed(2)}</p></div>
                <div className="bg-teal-50 p-4 rounded-lg border border-teal-200 col-span-2 lg:col-span-1"><p className="text-xs font-bold uppercase text-teal-600">Ingresos Extras</p><p className="text-xl font-bold text-teal-700">${totalIngresosExtrasUI.toFixed(2)}</p></div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 col-span-2 lg:col-span-1"><p className="text-xs font-bold uppercase text-yellow-600">Total Domicilios</p><p className="text-xl font-bold text-yellow-700">${totalDomiciliosUI.toFixed(2)}</p><p className="text-[10px] text-yellow-600">{pedidosDomicilio} pedidos x $0.50</p></div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200 col-span-2 lg:col-span-1"><p className="text-xs font-bold uppercase text-red-600">Gastos</p><p className="text-xl font-bold text-red-700">-${totalGastosUI.toFixed(2)}</p></div>
                
                {/* BANCO VS EFECTIVO */}
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-300 col-span-2 lg:col-span-1 flex flex-col justify-center"><p className="text-xs font-bold uppercase text-indigo-600">🏦 En Banco (Transf.)</p><p className="text-2xl font-bold text-indigo-700">${totalBancoUI.toFixed(2)}</p><p className="text-[10px] text-indigo-500">{cantidadTransferencias} movimientos</p></div>
                <div className="bg-blue-600 p-4 rounded-lg shadow-lg text-white col-span-4 lg:col-span-2 flex flex-col justify-center items-center"><p className="text-xs font-bold uppercase text-blue-100 mb-1">💵 Total Efectivo (Caja Física)</p><p className="text-3xl font-bold">${totalEfectivoUI.toFixed(2)}</p><button onClick={() => setModalCierre(true)} className="mt-2 bg-white text-blue-700 text-xs font-bold py-1.5 px-6 rounded shadow hover:bg-gray-100">🔒 CERRAR CAJA</button></div>
            </div>

            {/* TABLAS SECUNDARIAS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow-sm border p-5"><h2 className="font-bold text-lg mb-4 text-red-600">💸 Gastos Operativos</h2><form onSubmit={registrarGasto} className="flex gap-2 mb-4"><input type="text" placeholder="Ej.: Hielo..." className="flex-1 p-2 border rounded text-sm" value={descGasto} onChange={e => setDescGasto(e.target.value)} required /><input type="number" step="0.01" placeholder="$" className="w-24 p-2 border rounded text-sm" value={montoGasto} onChange={e => setMontoGasto(e.target.value)} required /><button type="submit" className="bg-red-500 text-white px-3 rounded font-bold">+</button></form><div className="overflow-y-auto max-h-40"><table className="w-full text-sm"><tbody className="divide-y">{listaGastosSegura.length > 0 ? (listaGastosSegura.map(g => (<tr key={g.id}><td className="py-2">{g.descripcion}</td><td className="py-2 text-right font-bold text-red-600">-${(g.monto || 0).toFixed(2)}</td><td className="py-2 text-right"><button onClick={() => eliminarGasto(g.id)} className="text-gray-300 hover:text-red-500">×</button></td></tr>))) : (<tr><td colSpan="3" className="text-center text-gray-400 py-2">Sin gastos</td></tr>)}</tbody></table></div></div>
                <div className="bg-white rounded-lg shadow-sm border p-5"><h2 className="font-bold text-lg mb-4 text-teal-600">💰 Ingresos Extras</h2><form onSubmit={registrarIngreso} className="flex gap-2 mb-4"><input type="text" placeholder="Ej.: Inyección de capital..." className="flex-1 p-2 border rounded text-sm" value={descIngreso} onChange={e => setDescIngreso(e.target.value)} required /><input type="number" step="0.01" placeholder="$" className="w-24 p-2 border rounded text-sm" value={montoIngreso} onChange={e => setMontoIngreso(e.target.value)} required /><button type="submit" className="bg-teal-500 text-white px-3 rounded font-bold">+</button></form><div className="overflow-y-auto max-h-40"><table className="w-full text-sm"><tbody className="divide-y">{listaIngresosSegura.length > 0 ? (listaIngresosSegura.map(i => (<tr key={i.id}><td className="py-2">{i.descripcion}</td><td className="py-2 text-right font-bold text-teal-600">+${(i.monto || 0).toFixed(2)}</td><td className="py-2 text-right"><button onClick={() => eliminarIngreso(i.id)} className="text-gray-300 hover:text-red-500">×</button></td></tr>))) : (<tr><td colSpan="3" className="text-center text-gray-400 py-2">Sin ingresos extras</td></tr>)}</tbody></table></div></div>
            </div>

            {/* PLATOS DEL DÍA (NUEVA ESTRUCTURA) */}
            <div className="bg-white rounded-lg shadow-sm border p-5 mb-6 overflow-x-auto">
                <h2 className="font-bold text-lg mb-4 text-orange-600">🍲 Platos del Día (Cuadre de Inventario)</h2>
                <table className="w-full text-sm text-center">
                    <thead className="bg-orange-50 text-orange-800">
                        <tr>
                            <th className="py-2 px-4 text-left">Plato</th>
                            <th className="py-2 px-4">Inicial</th>
                            <th className="py-2 px-4">Vendidos</th>
                            <th className="py-2 px-4">Consumo Personal</th>
                            <th className="py-2 px-4">Final</th>
                            <th className="py-2 px-4">Diferencia</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {platosDia.length > 0 ? platosDia.map((p, idx) => {
                            const inicial = p.inicial || 0; const vendidos = p.vendidos || 0;
                            const consumo = p.consumo || 0; const final = p.final || 0;
                            const diferencia = inicial - vendidos - consumo - final;
                            return (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="py-2 px-4 text-left font-medium">{p.nombre}</td>
                                    <td className="py-2 px-4">{inicial}</td>
                                    <td className="py-2 px-4 text-blue-600 font-bold">{vendidos}</td>
                                    <td className="py-2 px-4 text-gray-500">{consumo}</td>
                                    <td className="py-2 px-4">{final}</td>
                                    <td className={`py-2 px-4 font-bold ${diferencia === 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {diferencia}
                                    </td>
                                </tr>
                            )
                        }) : (
                            <tr><td colSpan="6" className="py-4 text-gray-400 italic">No hay datos de platos del día configurados desde el sistema/backend.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* HISTORIAL DE ÓRDENES */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-10">
                <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center"><h3 className="font-bold text-lg text-gray-700">📜 Historial de Movimientos</h3><div className="flex gap-2"><span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">Anulado: ${datos.totalAnulado || "0.00"}</span><span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">Cant: {listaOrdenesSegura.length}</span></div></div>
                <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs sticky top-0"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Pago</th><th className="px-4 py-3">Total</th><th className="px-4 py-3 text-right">Opción</th></tr></thead>
                        <tbody className="divide-y divide-gray-200">
                            {listaOrdenesSegura.length > 0 ? (listaOrdenesSegura.map((orden) => (
                                <tr key={orden.id} className={`transition-colors ${orden.estado === 'anulado' ? 'bg-red-50 opacity-60' : 'hover:bg-gray-50'}`}>
                                    <td className="px-4 py-3 font-bold">#{orden.numero_diario || orden.id}</td>
                                    <td className="px-4 py-3">{orden.cliente}</td>
                                    <td className="px-4 py-3 capitalize">{orden.tipo_entrega}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs rounded-full ${orden.metodo_pago === 'transferencia' ? 'bg-indigo-100 text-indigo-800' : 'bg-green-100 text-green-800'}`}>
                                            {orden.metodo_pago || 'efectivo'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-bold">${(orden.total || 0).toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right">{orden.estado !== 'anulado' && (<button onClick={() => anularOrden(orden.id)} className="text-red-500 hover:text-red-700 text-xs border border-red-200 px-2 py-1 rounded" title="Anular">🚫</button>)}</td>
                                </tr>
                            ))) : (<tr><td colSpan="6" className="text-center p-4">No hay órdenes registradas hoy.</td></tr>)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}