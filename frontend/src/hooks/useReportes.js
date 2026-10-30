import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { reportService } from '../api/reportService';
import { orderService } from '../api/orderService';
import { socketClient } from '../api/socketService';
import { COSTO_DOMICILIO } from '../api/config';
import { esSoloTexto, esEntradaMontoPositivo, esMontoPositivoValido } from '../utils/validators';

/**
 * Custom Hook que encapsula el estado, cálculos financieros, paginación real, generación de PDF y llamadas API de Reportes.
 */
export function useReportes() {
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(true);

    // Estado de paginación real para el historial de movimientos
    const [paginaMovimientos, setPaginaMovimientos] = useState(1);
    const [limiteMovimientos, setLimiteMovimientos] = useState(10);
    const [movimientosPaginados, setMovimientosPaginados] = useState([]);
    const [metaPaginacion, setMetaPaginacion] = useState({
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 1,
        hasPrevPage: false,
        hasNextPage: false
    });
    const [cargandoMovimientos, setCargandoMovimientos] = useState(false);

    const [descGasto, setDescGasto] = useState('');
    const [montoGasto, setMontoGasto] = useState('');
    const [descIngreso, setDescIngreso] = useState('');
    const [montoIngreso, setMontoIngreso] = useState('');
    const [guardandoGasto, setGuardandoGasto] = useState(false);
    const [guardandoIngreso, setGuardandoIngreso] = useState(false);
    const [procesandoCierre, setProcesandoCierre] = useState(false);

    const [notificacion, setNotificacion] = useState(null);
    const [modalCierre, setModalCierre] = useState(false);
    const [modalAnular, setModalAnular] = useState(null);
    const [modalEliminarIngreso, setModalEliminarIngreso] = useState(null);

    // Estado para la barra de deshacer (Undo de 3s) al anular una orden
    const [ordenEnUndoAnular, setOrdenEnUndoAnular] = useState(null);
    const timerUndoAnularRef = useRef(null);

    const mostrarNotificacion = useCallback((mensaje, tipo) => {
        setNotificacion({ mensaje, tipo });
        setTimeout(() => setNotificacion(null), 3000);
    }, []);

    const cargarMovimientosPagina = useCallback(
        async (page = paginaMovimientos, limit = limiteMovimientos) => {
            setCargandoMovimientos(true);
            try {
                const res = await reportService.getMovimientosPaginados(page, limit);
                const payload = res.data || {};
                setMovimientosPaginados(Array.isArray(payload.data) ? payload.data : []);
                if (payload.pagination) {
                    setMetaPaginacion(payload.pagination);
                    setPaginaMovimientos(payload.pagination.page);
                }
            } catch {
                mostrarNotificacion('Error al cargar la página de movimientos', 'error');
            } finally {
                setCargandoMovimientos(false);
            }
        },
        [paginaMovimientos, limiteMovimientos, mostrarNotificacion]
    );

    const cargarReporte = useCallback(async () => {
        try {
            const res = await reportService.getReporteHoy({
                page: paginaMovimientos,
                limit: limiteMovimientos
            });
            const data = res.data;
            setDatos(data);
            if (data?.movimientosPaginados) {
                setMovimientosPaginados(Array.isArray(data.movimientosPaginados.data) ? data.movimientosPaginados.data : []);
                if (data.movimientosPaginados.pagination) {
                    setMetaPaginacion(data.movimientosPaginados.pagination);
                    setPaginaMovimientos(data.movimientosPaginados.pagination.page);
                }
            } else {
                const fallbackList = Array.isArray(data?.listaOrdenes) ? data.listaOrdenes : [];
                setMovimientosPaginados(fallbackList.slice(0, limiteMovimientos));
            }
        } catch {
            mostrarNotificacion('Error de conexión o datos corruptos', 'error');
        } finally {
            setCargando(false);
        }
    }, [paginaMovimientos, limiteMovimientos, mostrarNotificacion]);

    const cambiarPaginaMovimientos = useCallback(
        nuevaPagina => {
            setPaginaMovimientos(nuevaPagina);
            cargarMovimientosPagina(nuevaPagina, limiteMovimientos);
        },
        [cargarMovimientosPagina, limiteMovimientos]
    );

    const cambiarLimiteMovimientos = useCallback(
        nuevoLimite => {
            const lim = parseInt(nuevoLimite, 10) || 10;
            setLimiteMovimientos(lim);
            setPaginaMovimientos(1);
            cargarMovimientosPagina(1, lim);
        },
        [cargarMovimientosPagina]
    );

    useEffect(() => {
        cargarReporte();

        socketClient.on('nueva_orden', cargarReporte);
        socketClient.on('orden_anulada', cargarReporte);
        socketClient.on('orden_lista', cargarReporte);
        socketClient.on('reporte_actualizado', cargarReporte);

        return () => {
            socketClient.off('nueva_orden', cargarReporte);
            socketClient.off('orden_anulada', cargarReporte);
            socketClient.off('orden_lista', cargarReporte);
            socketClient.off('reporte_actualizado', cargarReporte);
        };
    }, [cargarReporte]);

    const listaOrdenesSegura = useMemo(() => datos?.listaOrdenes || [], [datos]);
    const validOrders = useMemo(
        () => listaOrdenesSegura.filter(o => o.estado !== 'anulado'),
        [listaOrdenesSegura]
    );
    const listaGastosSegura = useMemo(() => datos?.listaGastos || [], [datos]);
    const listaIngresosSegura = useMemo(() => datos?.listaIngresosExtras || [], [datos]);
    const platosDia = useMemo(() => datos?.platosDia || [], [datos]);

    const saldoInicialUI = parseFloat(datos?.saldoInicial || 0);
    const totalIngresosExtrasUI = parseFloat(datos?.totalIngresosExtras || 0);
    const totalGastosUI = parseFloat(datos?.totalGastos || 0);

    const ventasTransferenciaUI =
        datos?.ventasTransferencia !== undefined
            ? parseFloat(datos.ventasTransferencia) || 0
            : validOrders
                  .filter(o => o.metodo_pago === 'transferencia')
                  .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

    const cantidadTransferencias =
        datos?.cantidadTransferencias !== undefined
            ? Number(datos.cantidadTransferencias) || 0
            : validOrders.filter(o => o.metodo_pago === 'transferencia').length;

    const pedidosDomicilio =
        datos?.pedidosDomicilio !== undefined
            ? Number(datos.pedidosDomicilio) || 0
            : validOrders.filter(
                  o => o.tipo_entrega === 'domicilio' && !String(o.cliente || '').includes('(EXTRA)')
              ).length;

    const totalDomiciliosUI =
        datos?.totalDomicilios !== undefined
            ? parseFloat(datos.totalDomicilios) || 0
            : pedidosDomicilio * COSTO_DOMICILIO;

    const totalDomiciliosEfectivoUI =
        datos?.totalDomiciliosEfectivo !== undefined
            ? parseFloat(datos.totalDomiciliosEfectivo) || 0
            : validOrders.filter(
                  o =>
                      o.tipo_entrega === 'domicilio' &&
                      o.metodo_pago !== 'transferencia' &&
                      !String(o.cliente || '').includes('(EXTRA)')
              ).length * COSTO_DOMICILIO;

    const ventasEfectivoUI =
        datos?.ventasEfectivoNeto !== undefined
            ? parseFloat(datos.ventasEfectivoNeto) || 0
            : validOrders
                  .filter(o => o.metodo_pago !== 'transferencia')
                  .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0) - totalDomiciliosEfectivoUI;

    const totalBancoUI = ventasTransferenciaUI;
    const totalEfectivoUI =
        datos?.dineroEnCaja !== undefined
            ? parseFloat(datos.dineroEnCaja) || 0
            : saldoInicialUI + ventasEfectivoUI + totalIngresosExtrasUI + totalDomiciliosEfectivoUI - totalGastosUI;

    const generarPDF = async () => {
        if (!datos) {
            mostrarNotificacion('No hay datos para generar PDF', 'error');
            return;
        }
        mostrarNotificacion('Generando PDF...', 'info');

        try {
            const doc = new jsPDF();
            const fechaHoy = new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            doc.setFontSize(22);
            doc.setTextColor(41, 128, 185);
            doc.text('REPORTE FINANCIERO', 14, 20);
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text("Restaurante D' La Casa", 14, 26);
            doc.setTextColor(0);
            doc.text(`Fecha: ${fechaHoy}`, 14, 35);
            doc.text(`Generado: ${new Date().toLocaleTimeString()}`, 14, 40);

            let yPos = 50;

            doc.setFontSize(14);
            doc.setTextColor(52, 152, 219);
            doc.text('1. RESUMEN DE CAJA', 14, yPos);
            yPos += 5;

            const filasResumen = datos.estructuraPDF?.resumenCaja || [
                ['Saldo Inicial', `$${saldoInicialUI.toFixed(2)}`],
                ['+ Ventas en Efectivo', `$${ventasEfectivoUI.toFixed(2)}`],
                ['+ Ingresos Extras', `$${totalIngresosExtrasUI.toFixed(2)}`],
                ['+ Total Domicilios', `$${totalDomiciliosUI.toFixed(2)}`],
                ['- Gastos Operativos', `-$${totalGastosUI.toFixed(2)}`]
            ];

            autoTable(doc, {
                startY: yPos,
                head: [['Concepto', 'Monto ($)']],
                body: [
                    ...filasResumen,
                    ['', ''],
                    [
                        {
                            content: 'TOTAL EN BANCO (Transferencias)',
                            styles: { fontStyle: 'bold', fillColor: [240, 240, 240] }
                        },
                        {
                            content: `$${totalBancoUI.toFixed(2)}`,
                            styles: { fontStyle: 'bold', fillColor: [240, 240, 240] }
                        }
                    ],
                    [
                        {
                            content: 'TOTAL EN EFECTIVO (Caja Física)',
                            styles: { fontStyle: 'bold', fillColor: [235, 245, 251] }
                        },
                        {
                            content: `$${totalEfectivoUI.toFixed(2)}`,
                            styles: { fontStyle: 'bold', fillColor: [235, 245, 251], textColor: [41, 128, 185] }
                        }
                    ]
                ],
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
                columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
            });

            yPos = doc.lastAutoTable.finalY + 15;

            if (listaGastosSegura.length > 0) {
                if (yPos > 240) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.setFontSize(14);
                doc.setTextColor(192, 57, 43);
                doc.text('2. DETALLE DE GASTOS', 14, yPos);
                yPos += 5;
                const cuerpoGastos =
                    datos.estructuraPDF?.detalleGastos ||
                    listaGastosSegura.map(g => [g.descripcion || 'S/D', `-$${parseFloat(g.monto || 0).toFixed(2)}`]);
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

            if (listaIngresosSegura.length > 0) {
                if (yPos > 240) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.setFontSize(14);
                doc.setTextColor(22, 160, 133);
                doc.text('3. INGRESOS EXTRAS', 14, yPos);
                yPos += 5;
                const cuerpoIngresos =
                    datos.estructuraPDF?.detalleIngresos ||
                    listaIngresosSegura.map(i => [i.descripcion || 'S/D', `+$${parseFloat(i.monto || 0).toFixed(2)}`]);
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

            if (platosDia.length > 0) {
                if (yPos > 240) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.setFontSize(14);
                doc.setTextColor(243, 156, 18);
                doc.text('4. PLATOS DEL DÍA', 14, yPos);
                yPos += 5;

                const cuerpoPlatos =
                    datos.estructuraPDF?.detallePlatos ||
                    platosDia.map(p => [p.nombre, p.inicial || 0, p.vendidos || 0, p.consumo || 0, p.final || 0]);

                autoTable(doc, {
                    startY: yPos,
                    head: [['Plato', 'Inicial', 'Vendidos', 'Consumo', 'Final']],
                    body: cuerpoPlatos,
                    theme: 'striped',
                    headStyles: { fillColor: [243, 156, 18], textColor: 255 },
                    columnStyles: {
                        1: { halign: 'center' },
                        2: { halign: 'center' },
                        3: { halign: 'center' },
                        4: { halign: 'center' }
                    }
                });
            }

            const nombreArchivo = `Reporte_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(nombreArchivo);
            mostrarNotificacion('Reporte PDF generado', 'exito');
        } catch {
            mostrarNotificacion('Error al generar PDF', 'error');
        }
    };

    const handleDescGastoChange = (e) => {
        const valor = e.target.value;
        if (esSoloTexto(valor)) setDescGasto(valor);
    };

    const handleMontoGastoChange = (e) => {
        const valor = e.target.value;
        if (esEntradaMontoPositivo(valor)) setMontoGasto(valor);
    };

    const handleDescIngresoChange = (e) => {
        const valor = e.target.value;
        if (esSoloTexto(valor)) setDescIngreso(valor);
    };

    const handleMontoIngresoChange = (e) => {
        const valor = e.target.value;
        if (esEntradaMontoPositivo(valor)) setMontoIngreso(valor);
    };

    const esGastoValido = Boolean(
        descGasto.trim().length > 0 && esSoloTexto(descGasto.trim()) && esMontoPositivoValido(montoGasto)
    );
    const esIngresoValido = Boolean(
        descIngreso.trim().length > 0 && esSoloTexto(descIngreso.trim()) && esMontoPositivoValido(montoIngreso)
    );
    const puedeCerrarCaja = totalEfectivoUI >= 0 && !procesandoCierre;

    const registrarGasto = async (e) => {
        e.preventDefault();
        if (!esGastoValido || guardandoGasto) return;
        setGuardandoGasto(true);
        try {
            await reportService.addGasto({ descripcion: descGasto.trim(), monto: parseFloat(montoGasto) });
            setDescGasto('');
            setMontoGasto('');
            cargarReporte();
        } catch {
            mostrarNotificacion('Error al registrar gasto', 'error');
        } finally {
            setGuardandoGasto(false);
        }
    };

    const registrarIngreso = async (e) => {
        e.preventDefault();
        if (!esIngresoValido || guardandoIngreso) return;
        setGuardandoIngreso(true);
        try {
            await reportService.addIngresoExtra({
                descripcion: descIngreso.trim(),
                monto: parseFloat(montoIngreso)
            });
            setDescIngreso('');
            setMontoIngreso('');
            cargarReporte();
        } catch {
            mostrarNotificacion('Error al registrar ingreso', 'error');
        } finally {
            setGuardandoIngreso(false);
        }
    };

    const eliminarGasto = async (id) => {
        try {
            await reportService.deleteGasto(id);
            cargarReporte();
        } catch {
            mostrarNotificacion('Error al eliminar gasto', 'error');
        }
    };

    const confirmarEliminarIngreso = async () => {
        try {
            await reportService.deleteIngresoExtra(modalEliminarIngreso);
            cargarReporte();
            setModalEliminarIngreso(null);
        } catch {
            mostrarNotificacion('Error al eliminar ingreso', 'error');
        }
    };

    const confirmarAnulacionServidor = useCallback(
        async (idOrden) => {
            try {
                await orderService.anularOrden(idOrden);
                cargarReporte();
            } catch {
                mostrarNotificacion('Error al anular orden', 'error');
                cargarReporte();
            }
        },
        [cargarReporte, mostrarNotificacion]
    );

    const ejecutarAnulacion = useCallback(() => {
        if (!modalAnular) return;
        const idObjetivo = modalAnular;
        const ordenEncontrada =
            movimientosPaginados.find(o => o.id === idObjetivo) ||
            listaOrdenesSegura.find(o => o.id === idObjetivo) || { id: idObjetivo, cliente: 'Cliente' };

        setModalAnular(null);

        if (timerUndoAnularRef.current && ordenEnUndoAnular) {
            clearTimeout(timerUndoAnularRef.current);
            confirmarAnulacionServidor(ordenEnUndoAnular.id);
        }

        // Actualización visual optimista mientras corre la ventana de 3 segundos de Undo
        setMovimientosPaginados(prev =>
            prev.map(o => (o.id === idObjetivo ? { ...o, estado: 'anulado' } : o))
        );
        setOrdenEnUndoAnular(ordenEncontrada);

        timerUndoAnularRef.current = setTimeout(() => {
            setOrdenEnUndoAnular(null);
            timerUndoAnularRef.current = null;
            confirmarAnulacionServidor(idObjetivo);
        }, 3000);
    }, [modalAnular, movimientosPaginados, listaOrdenesSegura, ordenEnUndoAnular, confirmarAnulacionServidor]);

    const deshacerAnulacion = useCallback(() => {
        if (!ordenEnUndoAnular) return;
        if (timerUndoAnularRef.current) {
            clearTimeout(timerUndoAnularRef.current);
            timerUndoAnularRef.current = null;
        }
        const idRestaurar = ordenEnUndoAnular.id;
        setMovimientosPaginados(prev =>
            prev.map(o => (o.id === idRestaurar ? { ...o, estado: ordenEnUndoAnular.estado || 'pendiente' } : o))
        );
        setOrdenEnUndoAnular(null);
        mostrarNotificacion('Anulación cancelada a tiempo', 'exito');
    }, [ordenEnUndoAnular, mostrarNotificacion]);

    useEffect(() => {
        return () => {
            if (timerUndoAnularRef.current) {
                clearTimeout(timerUndoAnularRef.current);
            }
        };
    }, []);

    const ejecutarCierre = async () => {
        if (!puedeCerrarCaja) return;
        setProcesandoCierre(true);
        try {
            await reportService.cerrarCaja({ monto: totalEfectivoUI });
            setModalCierre(false);
            mostrarNotificacion('Cierre de caja realizado exitosamente', 'exito');
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch {
            mostrarNotificacion('Error al cerrar caja', 'error');
        } finally {
            setProcesandoCierre(false);
        }
    };

    return {
        datos,
        cargando,
        descGasto,
        montoGasto,
        descIngreso,
        montoIngreso,
        esGastoValido,
        esIngresoValido,
        guardandoGasto,
        guardandoIngreso,
        procesandoCierre,
        puedeCerrarCaja,
        notificacion,
        modalCierre,
        setModalCierre,
        modalAnular,
        setModalAnular,
        ordenEnUndoAnular,
        deshacerAnulacion,
        modalEliminarIngreso,
        setModalEliminarIngreso,
        listaOrdenesSegura,
        movimientosPaginados,
        metaPaginacion,
        paginaMovimientos,
        limiteMovimientos,
        cargandoMovimientos,
        cambiarPaginaMovimientos,
        cambiarLimiteMovimientos,
        listaGastosSegura,
        listaIngresosSegura,
        platosDia,
        saldoInicialUI,
        ventasEfectivoUI,
        totalIngresosExtrasUI,
        totalDomiciliosUI,
        pedidosDomicilio,
        totalGastosUI,
        totalBancoUI,
        cantidadTransferencias,
        totalEfectivoUI,
        generarPDF,
        handleDescGastoChange,
        handleMontoGastoChange,
        handleDescIngresoChange,
        handleMontoIngresoChange,
        registrarGasto,
        registrarIngreso,
        eliminarGasto,
        confirmarEliminarIngreso,
        ejecutarAnulacion,
        ejecutarCierre
    };
}
