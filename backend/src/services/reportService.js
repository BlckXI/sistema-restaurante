const supabase = require('../config/supabase');
const { getRangoDiario } = require('../utils/dateUtils');
const { calcularFinanzasDia } = require('./financeService');

/**
 * Ensambla la estructura de tablas y totales lista para la generación del reporte PDF.
 */
const ensamblarEstructuraPDF = (datosFinancieros) => {
    const saldoInicial = Number(datosFinancieros.saldoInicial || 0);
    const ventasEfectivoNeto = Number(datosFinancieros.ventasEfectivoNeto || 0);
    const totalIngresosExtras = Number(datosFinancieros.totalIngresosExtras || 0);
    const totalDomicilios = Number(datosFinancieros.totalDomicilios || 0);
    const totalGastos = Number(datosFinancieros.totalGastos || 0);
    const totalBanco = Number(datosFinancieros.ventasTransferencia || 0);
    const totalEfectivo = Number(datosFinancieros.dineroEnCaja || 0);

    return {
        resumenCaja: [
            ['Saldo Inicial', `$${saldoInicial.toFixed(2)}`],
            ['+ Ventas en Efectivo', `$${ventasEfectivoNeto.toFixed(2)}`],
            ['+ Ingresos Extras', `$${totalIngresosExtras.toFixed(2)}`],
            ['+ Total Domicilios', `$${totalDomicilios.toFixed(2)}`],
            ['- Gastos Operativos', `-$${totalGastos.toFixed(2)}`]
        ],
        totalBanco: `$${totalBanco.toFixed(2)}`,
        totalEfectivo: `$${totalEfectivo.toFixed(2)}`,
        detalleGastos: (datosFinancieros.gastos || []).map(g => [
            g.descripcion || 'S/D',
            `-$${Number(g.monto || 0).toFixed(2)}`
        ]),
        detalleIngresos: (datosFinancieros.extras || []).map(i => [
            i.descripcion || 'S/D',
            `+$${Number(i.monto || 0).toFixed(2)}`
        ]),
        detallePlatos: (datosFinancieros.platosDia || []).map(p => [
            p.nombre,
            p.inicial || 0,
            p.vendidos || 0,
            p.consumo || 0,
            p.final || 0
        ])
    };
};

const registrarGastoOperativo = async ({ descripcion, monto }) => {
    const { error } = await supabase.from('gastos').insert([{ descripcion: descripcion.trim(), monto: Number(monto) }]);
    if (error) throw new Error(error.message);
    return { message: 'Gasto registrado correctamente' };
};

const eliminarGastoPorId = async (id) => {
    const { error } = await supabase.from('gastos').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { message: 'Gasto eliminado correctamente' };
};

const registrarIngresoAdicional = async ({ descripcion, monto }) => {
    const { error } = await supabase.from('ingresos_extras').insert([{ descripcion: descripcion.trim(), monto: Number(monto) }]);
    if (error) throw new Error(error.message);
    return { message: 'Ingreso extra registrado correctamente' };
};

const eliminarIngresoAdicionalPorId = async (id) => {
    const { error } = await supabase.from('ingresos_extras').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { message: 'Ingreso extra eliminado correctamente' };
};

/**
 * Función pura auxiliar para calcular metadatos de paginación y recortar colecciones si es necesario.
 */
const calcularMetaPaginacion = (totalItems, page = 1, limit = 10) => {
    const paginaActual = Math.max(1, parseInt(page, 10) || 1);
    const limitePorPagina = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const total = Math.max(0, Number(totalItems) || 0);
    const totalPages = Math.max(1, Math.ceil(total / limitePorPagina));
    const paginaSegura = Math.min(paginaActual, totalPages);
    const from = (paginaSegura - 1) * limitePorPagina;
    const to = from + limitePorPagina - 1;

    return {
        page: paginaSegura,
        limit: limitePorPagina,
        totalItems: total,
        totalPages,
        hasPrevPage: paginaSegura > 1,
        hasNextPage: paginaSegura < totalPages,
        from,
        to
    };
};

/**
 * Obtiene el historial de movimientos (órdenes del día) paginado directamente desde la base de datos.
 */
const obtenerMovimientosPaginados = async ({ page = 1, limit = 10 } = {}) => {
    const { inicio, fin } = getRangoDiario();
    const paginaSolicitada = Math.max(1, parseInt(page, 10) || 1);
    const limiteSolicitado = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const from = (paginaSolicitada - 1) * limiteSolicitado;
    const to = from + limiteSolicitado - 1;

    const { data, count, error } = await supabase
        .from('ordenes')
        .select('*', { count: 'exact' })
        .gte('created_at', inicio)
        .lt('created_at', fin)
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) throw new Error(error.message);

    const totalItems = typeof count === 'number' ? count : (data || []).length;
    const meta = calcularMetaPaginacion(totalItems, paginaSolicitada, limiteSolicitado);

    // Si la página solicitada excedió el total de páginas tras una eliminación, consultamos la última página válida
    let items = data || [];
    if (paginaSolicitada > meta.totalPages && totalItems > 0) {
        const retry = await supabase
            .from('ordenes')
            .select('*')
            .gte('created_at', inicio)
            .lt('created_at', fin)
            .order('created_at', { ascending: false })
            .range(meta.from, meta.to);
        if (!retry.error) {
            items = retry.data || [];
        }
    }

    return {
        data: items,
        pagination: {
            page: meta.page,
            limit: meta.limit,
            totalItems: meta.totalItems,
            totalPages: meta.totalPages,
            hasPrevPage: meta.hasPrevPage,
            hasNextPage: meta.hasNextPage
        }
    };
};

const construirReporteHoy = async ({ page = 1, limit = 10 } = {}) => {
    const datos = await calcularFinanzasDia();
    const ordenesCompletas = datos.ordenes || [];
    const meta = calcularMetaPaginacion(ordenesCompletas.length, page, limit);
    const movimientosPaginados = ordenesCompletas.slice(meta.from, meta.to + 1);

    return {
        saldoInicial: datos.saldoInicial || 0,
        ingresoVentas: datos.ventas || 0,
        ventasEfectivo: datos.ventasEfectivo || 0,
        ventasEfectivoNeto: datos.ventasEfectivoNeto || 0,
        ventasTransferencia: datos.ventasTransferencia || 0,
        cantidadTransferencias: datos.cantidadTransferencias || 0,
        pedidosDomicilio: datos.pedidosDomicilio || 0,
        totalDomicilios: datos.totalDomicilios || 0,
        totalDomiciliosEfectivo: datos.totalDomiciliosEfectivo || 0,
        totalGastos: datos.totalGastos || 0,
        totalIngresosExtras: datos.totalIngresosExtras || 0,
        dineroEnCaja: datos.dineroEnCaja || 0,
        totalAnulado: datos.anulado || 0,
        cantidadOrdenes: datos.validas || 0,
        platosDia: datos.platosDia || [],
        listaOrdenes: ordenesCompletas,
        movimientosPaginados: {
            data: movimientosPaginados,
            pagination: {
                page: meta.page,
                limit: meta.limit,
                totalItems: meta.totalItems,
                totalPages: meta.totalPages,
                hasPrevPage: meta.hasPrevPage,
                hasNextPage: meta.hasNextPage
            }
        },
        listaGastos: datos.gastos || [],
        listaIngresosExtras: datos.extras || [],
        estructuraPDF: ensamblarEstructuraPDF(datos)
    };
};

const registrarCierreCaja = async (montoOpcional) => {
    const datosReales = await calcularFinanzasDia();
    const montoReal = montoOpcional !== undefined ? parseFloat(montoOpcional) : datosReales.dineroEnCaja;
    const fecha = datosReales.fechaStr;

    const { data: existe } = await supabase.from('cierres').select('*').eq('fecha', fecha).single();

    if (existe) {
        const { error: errorUpdate } = await supabase.from('cierres').update({ monto_final: montoReal }).eq('fecha', fecha);
        if (errorUpdate) throw new Error(errorUpdate.message);
    } else {
        const { error: errorInsert } = await supabase.from('cierres').insert([{ fecha, monto_final: montoReal }]);
        if (errorInsert) throw new Error(errorInsert.message);
    }

    return { message: 'Cierre guardado exitosamente', monto: montoReal };
};

const obtenerReporteDeFecha = async (fecha) => {
    const fechaObj = new Date(fecha);
    const año = fechaObj.getFullYear();
    const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaObj.getDate()).padStart(2, '0');

    const fechaStr = `${año}-${mes}-${dia}`;
    const inicio = new Date(`${fechaStr}T06:00:00.000Z`).toISOString();
    const finDate = new Date(`${fechaStr}T06:00:00.000Z`);
    finDate.setDate(finDate.getDate() + 1);
    const fin = finDate.toISOString();

    const [reqOrdenes, reqGastos, reqExtras, reqCierre] = await Promise.all([
        supabase.from('ordenes').select('*').gte('created_at', inicio).lt('created_at', fin),
        supabase.from('gastos').select('*').gte('created_at', inicio).lt('created_at', fin),
        supabase.from('ingresos_extras').select('*').gte('created_at', inicio).lt('created_at', fin),
        supabase.from('cierres').select('monto_final').lt('fecha', fechaStr).order('fecha', { ascending: false }).limit(1).single()
    ]);

    const ordenes = reqOrdenes.data || [];
    const gastos = reqGastos.data || [];
    const extras = reqExtras.data || [];
    const cierreAnterior = reqCierre.data;

    let ventas = 0;
    let gastosTotal = 0;
    let extrasTotal = 0;
    let anulado = 0;
    let validas = 0;
    const conteoPorTipo = { domicilio: 0, retiro: 0, mesa: 0, personal: 0 };
    const ventasPorTipo = { domicilio: 0, retiro: 0, mesa: 0, personal: 0 };
    const conteoPlatos = {};

    ordenes.forEach(o => {
        if (o.estado !== 'anulado') {
            if (o.tipo_entrega !== 'personal') ventas += o.total;
            validas++;
            conteoPorTipo[o.tipo_entrega] = (conteoPorTipo[o.tipo_entrega] || 0) + 1;
            ventasPorTipo[o.tipo_entrega] = (ventasPorTipo[o.tipo_entrega] || 0) + o.total;

            if (o.detalles && Array.isArray(o.detalles)) {
                o.detalles.forEach(i => {
                    conteoPlatos[i.nombre] = (conteoPlatos[i.nombre] || 0) + i.cantidad;
                });
            }
        } else {
            anulado += o.total;
        }
    });

    gastos.forEach(g => {
        gastosTotal += g.monto;
    });
    extras.forEach(e => {
        extrasTotal += e.monto;
    });

    const saldoInicial = cierreAnterior ? cierreAnterior.monto_final : 0;
    const dineroEnCaja = saldoInicial + ventas + extrasTotal - gastosTotal;

    return {
        fecha: fechaStr,
        saldoInicial,
        ventas,
        gastosTotal,
        extrasTotal,
        dineroEnCaja,
        anulado,
        cantidadOrdenes: validas,
        conteoPorTipo,
        ventasPorTipo,
        rankingPlatos: Object.entries(conteoPlatos)
            .map(([nombre, cantidad]) => ({ nombre, cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad),
        listaOrdenes: ordenes,
        listaGastos: gastos,
        listaIngresosExtras: extras
    };
};

const obtenerConsumoPersonalHoy = async () => {
    const { inicio, fin } = getRangoDiario();
    const { data: ordenesPersonales, error } = await supabase
        .from('ordenes')
        .select('*')
        .eq('tipo_entrega', 'personal')
        .gte('created_at', inicio)
        .lt('created_at', fin)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    if (!ordenesPersonales) return { ordenes: [], totalPlatos: 0, resumenPlatos: [] };

    const resumenPlatos = {};
    let totalPlatos = 0;

    ordenesPersonales.forEach(orden => {
        if (orden.estado !== 'anulado' && orden.detalles && Array.isArray(orden.detalles)) {
            orden.detalles.forEach(item => {
                resumenPlatos[item.nombre] = (resumenPlatos[item.nombre] || 0) + item.cantidad;
                totalPlatos += item.cantidad;
            });
        }
    });

    return {
        ordenes: ordenesPersonales,
        totalPlatos,
        resumenPlatos: Object.entries(resumenPlatos)
            .map(([nombre, cantidad]) => ({ nombre, cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad)
    };
};

const obtenerComparativaDias = async (diasQuery) => {
    const dias = parseInt(diasQuery, 10) || 7;
    const promesas = [];

    for (let i = 0; i < dias; i++) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);
        const fechaStr = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
        const inicio = new Date(`${fechaStr}T06:00:00.000Z`).toISOString();
        const finDate = new Date(`${fechaStr}T06:00:00.000Z`);
        finDate.setDate(finDate.getDate() + 1);

        const consultaDia = Promise.all([
            supabase.from('ordenes').select('*').gte('created_at', inicio).lt('created_at', finDate.toISOString()),
            supabase.from('cierres').select('monto_final').eq('fecha', fechaStr).single()
        ]).then(([reqOrdenes, reqCierre]) => {
            let ventas = 0;
            let conteoOrdenes = 0;
            const ordenes = reqOrdenes.data || [];

            ordenes.forEach(o => {
                if (o.estado !== 'anulado') {
                    if (o.tipo_entrega !== 'personal') ventas += o.total;
                    conteoOrdenes++;
                }
            });

            return {
                fecha: fechaStr,
                ventas,
                ordenes: conteoOrdenes,
                cierre: reqCierre.data ? reqCierre.data.monto_final : 0,
                diaSemana: fecha.toLocaleDateString('es-ES', { weekday: 'short' })
            };
        });

        promesas.push(consultaDia);
    }

    const resultados = await Promise.all(promesas);
    resultados.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    return resultados;
};

module.exports = {
    ensamblarEstructuraPDF,
    calcularMetaPaginacion,
    obtenerMovimientosPaginados,
    registrarGastoOperativo,
    eliminarGastoPorId,
    registrarIngresoAdicional,
    eliminarIngresoAdicionalPorId,
    construirReporteHoy,
    registrarCierreCaja,
    obtenerReporteDeFecha,
    obtenerConsumoPersonalHoy,
    obtenerComparativaDias
};
