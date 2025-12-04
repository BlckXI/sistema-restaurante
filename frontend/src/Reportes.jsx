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

    // --- FUNCIONES AUXILIARES DE CÁLCULO ---
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
                efectivo[orden.tipo_entrega] = (efectivo[orden.tipo_entrega] || 0) + orden.total;
            }
        });
        return efectivo;
    };

    // --- GENERACIÓN DE PDF MODIFICADA ---
    const generarPDF = () => {
        if (!datos) {
            mostrarNotificacion("No hay datos para generar PDF", "error");
            return;
        }

        const doc = new jsPDF();
        const hoy = new Date().toLocaleDateString('es-ES', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        // Título
        doc.setFontSize(22);
        doc.setTextColor(41, 128, 185);
        doc.text("REPORTE FINANCIERO - MONTE SIÓN", 14, 20);

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Fecha: ${hoy}`, 14, 30);
        doc.text(`Generado: ${new Date().toLocaleTimeString()}`, 14, 36);

        let yPos = 45;

        // 1. RESUMEN FINANCIERO (Sin cambios)
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
                [{ content: 'TOTAL EN CAJA', styles: { fontStyle: 'bold', fillColor: [52, 152, 219] } },
                { content: `$${datos.dineroEnCaja}`, styles: { fontStyle: 'bold', fillColor: [52, 152, 219] } }]
            ],
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 11, cellPadding: 5 },
            columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
        });

        yPos = doc.lastAutoTable.finalY + 15;

        // 2. DETALLE DE VENTAS (MODIFICADO SEGÚN SOLICITUD)
        doc.setFontSize(16);
        doc.setTextColor(155, 89, 182);
        doc.text("2. DETALLE POR TIPO DE PEDIDO", 14, yPos);
        yPos += 10;

        // Función interna para calcular desgloses (Plato vs Envío)
        const obtenerDatosDesglosados = (tipo) => {
            let totalPlatos = 0;
            let totalEnvios = 0;
            let totalGeneral = 0;
            let cantidad = 0;

            datos.listaOrdenes.forEach(o => {
                if (o.estado !== 'anulado' && o.tipo_entrega === tipo) {
                    cantidad++;
                    // Recalculamos el subtotal de los items para saber cuánto es comida
                    const subtotalComida = o.detalles.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
                    const costoEnvio = o.total - subtotalComida; // La diferencia es el envío

                    totalPlatos += subtotalComida;
                    // Solo sumamos envío si es positivo (evita errores de redondeo pequeños)
                    totalEnvios += (costoEnvio > 0.01 ? costoEnvio : 0);
                    totalGeneral += o.total;
                }
            });

            return { totalPlatos, totalEnvios, totalGeneral, cantidad };
        };

        const datosDomicilio = obtenerDatosDesglosados('domicilio');
        const datosRetiro = obtenerDatosDesglosados('retiro');
        const datosMesa = obtenerDatosDesglosados('mesa');
        const datosPersonal = obtenerDatosDesglosados('personal'); // Solo nos importa cantidad

        // Construimos las filas según el formato solicitado
        const cuerpoTabla = [
            // FILA DOMICILIO
            [
                'Domicilio',
                datosDomicilio.cantidad,
                `$${datosDomicilio.totalPlatos.toFixed(2)} + $${datosDomicilio.totalEnvios.toFixed(2)} = $${datosDomicilio.totalGeneral.toFixed(2)}`
            ],
            // FILA RETIRO
            [
                'Retiro',
                datosRetiro.cantidad,
                `$${datosRetiro.totalGeneral.toFixed(2)}`
            ],
            // FILA MESA
            [
                'Mesa',
                datosMesa.cantidad,
                `$${datosMesa.totalGeneral.toFixed(2)}`
            ],
            // FILA PERSONAL
            [
                'Personal',
                datosPersonal.cantidad,
                'GRATUITO' // Formato solicitado
            ],
            // FILA TOTAL
            [
                { content: 'TOTAL GENERAL', styles: { fontStyle: 'bold' } },
                { content: datos.cantidadOrdenes, styles: { fontStyle: 'bold' } },
                { content: `$${datos.ingresoVentas.toFixed(2)}`, styles: { fontStyle: 'bold' } }
            ]
        ];

        autoTable(doc, {
            startY: yPos,
            head: [['Tipo de Pedido', 'Cant.', 'Detalle Monetario']], // Encabezados cambiados
            body: cuerpoTabla,
            theme: 'striped',
            headStyles: { fillColor: [155, 89, 182], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 4 },
            columnStyles: {
                0: { fontStyle: 'bold' },
                1: { halign: 'center' },
                2: { halign: 'right' } // Alineamos montos a la derecha
            }
        });

        const nombreArchivo = `Reporte_Financiero_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(nombreArchivo);
        mostrarNotificacion("✅ Reporte PDF generado correctamente", "exito");
    };

    // --- ACCIONES DE API ---
    const registrarGasto = async (e) => {
        e.preventDefault();
        if (!descGasto || !montoGasto) {
            mostrarNotificacion("Completa todos los campos", "error");
            return;
        }
        try {
            await axios.post(`${URL_BACKEND}/gastos`, {
                descripcion: descGasto,
                monto: parseFloat(montoGasto)
            });
            setDescGasto('');
            setMontoGasto('');
            cargarReporte();
            mostrarNotificacion("Gasto registrado", "exito");
        } catch (error) {
            mostrarNotificacion("Error registrando gasto", "error");
        }
    };

    const registrarIngreso = async (e) => {
        e.preventDefault();
        if (!descIngreso || !montoIngreso) {
            mostrarNotificacion("Completa todos los campos", "error");
            return;
        }
        try {
            await axios.post(`${URL_BACKEND}/ingresos-extras`, {
                descripcion: descIngreso,
                monto: parseFloat(montoIngreso)
            });
            setDescIngreso('');
            setMontoIngreso('');
            cargarReporte();
            mostrarNotificacion("Ingreso registrado", "exito");
        } catch (error) {
            mostrarNotificacion("Error registrando ingreso", "error");
        }
    };

    const eliminarGasto = async (id) => {
        try {
            await axios.delete(`${URL_BACKEND}/gastos/${id}`);
            cargarReporte();
            mostrarNotificacion("Gasto eliminado", "exito");
        } catch (error) {
            mostrarNotificacion("Error eliminando gasto", "error");
        }
    };

    const eliminarIngreso = (id) => {
        setModalEliminarIngreso(id);
    };

    const confirmarEliminarIngreso = async () => {
        if (!modalEliminarIngreso) return;
        try {
            await axios.delete(`${URL_BACKEND}/ingresos-extras/${modalEliminarIngreso}`);
            cargarReporte();
            mostrarNotificacion("Ingreso eliminado", "exito");
        } catch (error) {
            mostrarNotificacion("Error eliminando ingreso", "error");
        } finally {
            setModalEliminarIngreso(null);
        }
    };

    const anularOrden = (id) => {
        setModalAnular(id);
    };

    const ejecutarAnulacion = async () => {
        if (!modalAnular) return;
        try {
            await axios.put(`${URL_BACKEND}/ordenes/${modalAnular}/anular`);
            cargarReporte();
            mostrarNotificacion("Orden anulada", "exito");
        } catch (error) {
            mostrarNotificacion("Error anulando orden", "error");
        } finally {
            setModalAnular(null);
        }
    };

    const ejecutarCierre = async () => {
        try {
            await axios.post(`${URL_BACKEND}/reportes/cierre`, {
                monto: datos.dineroEnCaja
            });
            mostrarNotificacion("Cierre de caja exitoso", "exito");
            setModalCierre(false);
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            mostrarNotificacion("Error en cierre de caja", "error");
        }
    };

    // --- RENDERIZADO CONDICIONAL: LOADING ---
    if (cargando) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-100">
                <div className="text-xl font-bold text-gray-600 animate-pulse">Cargando Reportes...</div>
            </div>
        );
    }

    if (!datos) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-100">
                <div className="text-xl font-bold text-red-600">Error al cargar datos.</div>
                <button onClick={cargarReporte} className="ml-4 bg-blue-500 text-white px-4 py-2 rounded">Reintentar</button>
            </div>
        );
    }

    // Preparación de datos para la vista web (Mantenemos los emojis AQUÍ porque en web se ven bien)
    const resumenTipo = calcularResumenPorTipo(datos.listaOrdenes);
    const efectivoPorTipo = calcularEfectivoPorTipo(datos.listaOrdenes);

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

            {/* CABECERA */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4 mb-6">
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

            {/* TARJETAS DE RESUMEN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
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

            {/* RESUMEN POR TIPO DE ENTREGA CON EFECTIVO */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
                <h2 className="font-bold text-lg mb-4 text-gray-700">📊 Distribución por Tipo de Entrega</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* TABLA DE CANTIDADES */}
                    <div>
                        <h3 className="font-bold text-gray-600 mb-3 text-sm uppercase">Cantidad de Órdenes</h3>
                        <div className="space-y-3">
                            {Object.entries(tipoConfig).map(([tipo, config]) => (
                                <div key={tipo} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{config.emoji}</span>
                                        <span className="font-medium text-gray-700">{config.label}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold">{resumenTipo[tipo] || 0}</p>
                                        <p className="text-sm text-gray-500">
                                            {datos.cantidadOrdenes > 0
                                                ? `${((resumenTipo[tipo] || 0) / datos.cantidadOrdenes * 100).toFixed(1)}%`
                                                : '0%'}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {/* TOTAL */}
                            <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50 border border-blue-200 mt-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl font-bold">📊</span>
                                    <span className="font-bold text-gray-800">TOTAL</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-blue-700">{datos.cantidadOrdenes}</p>
                                    <p className="text-sm font-bold text-blue-600">100%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TABLA DE EFECTIVO */}
                    <div>
                        <h3 className="font-bold text-gray-600 mb-3 text-sm uppercase">Efectivo Recaudado</h3>
                        <div className="space-y-3">
                            {Object.entries(tipoConfig).map(([tipo, config]) => (
                                <div key={tipo} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{config.emoji}</span>
                                        <span className="font-medium text-gray-700">{config.label}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-green-600">
                                            ${(efectivoPorTipo[tipo] || 0).toFixed(2)}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {datos.ingresoVentas > 0
                                                ? `${((efectivoPorTipo[tipo] || 0) / datos.ingresoVentas * 100).toFixed(1)}% de ventas`
                                                : '0%'}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {/* TOTAL DE EFECTIVO */}
                            <div className="flex justify-between items-center p-3 rounded-lg bg-green-50 border border-green-200 mt-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl font-bold">💰</span>
                                    <span className="font-bold text-gray-800">TOTAL VENTAS</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-green-700">${datos.ingresoVentas.toFixed(2)}</p>
                                    <p className="text-sm font-bold text-green-600">100%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN DE GASTOS, INGRESOS Y RANKING (Sin cambios en JSX) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
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
                                        <td className="py-2"><span className="text-xs text-gray-400 mr-2">#{i + 1}</span>{p.nombre}</td>
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