const supabase = require('../config/supabase');
const { getRangoDiario } = require('../utils/dateUtils');
const { calcularFinanzasDia } = require('../services/financeService');

const agregarGasto = async (req, res) => {
    const { descripcion, monto } = req.body;
    const { error } = await supabase.from('gastos').insert([{ descripcion, monto }]).select();
    if (error) return res.status(500).json({ error: error.message });
    req.io.emit('reporte_actualizado'); // AVISO DE WEBSOCKET
    res.json({ message: "OK" });
};

const eliminarGasto = async (req, res) => {
    const { error } = await supabase.from('gastos').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    req.io.emit('reporte_actualizado'); // AVISO DE WEBSOCKET
    res.json({ message: "OK" });
};

const agregarIngresoExtra = async (req, res) => {
    const { descripcion, monto } = req.body;
    const { error } = await supabase.from('ingresos_extras').insert([{ descripcion, monto }]).select();
    if (error) return res.status(500).json({ error: error.message });
    req.io.emit('reporte_actualizado'); // AVISO DE WEBSOCKET
    res.json({ message: "OK" });
};

const eliminarIngresoExtra = async (req, res) => {
    const { error } = await supabase.from('ingresos_extras').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    req.io.emit('reporte_actualizado'); // AVISO DE WEBSOCKET
    res.json({ message: "OK" });
};

const obtenerReporteHoy = async (req, res) => {
    try {
        const datos = await calcularFinanzasDia();
        const conteoPorTipo = { domicilio: 0, retiro: 0, mesa: 0, personal: 0 };
        const ventasPorTipo = { domicilio: 0, retiro: 0, mesa: 0, personal: 0 };

        if(datos.ordenes) {
            datos.ordenes.forEach(o => {
                if (o.estado !== 'anulado') {
                    conteoPorTipo[o.tipo_entrega] = (conteoPorTipo[o.tipo_entrega] || 0) + 1;
                    ventasPorTipo[o.tipo_entrega] = (ventasPorTipo[o.tipo_entrega] || 0) + o.total;
                }
            });
        }

        const rankingPlatos = Object.entries(datos.conteo)
            .map(([nombre, cantidad]) => ({ nombre, cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad);

        res.json({
            saldoInicial: datos.saldoInicial.toFixed(2), ingresoVentas: datos.ventas.toFixed(2),
            totalGastos: datos.tGastos.toFixed(2), totalIngresosExtras: datos.tExtras.toFixed(2),
            dineroEnCaja: datos.dineroEnCaja.toFixed(2), totalAnulado: datos.anulado.toFixed(2),
            cantidadOrdenes: datos.validas, conteoPorTipo, ventasPorTipo, rankingPlatos,
            listaOrdenes: datos.ordenes, listaGastos: datos.gastos, listaIngresosExtras: datos.extras
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const guardarCierre = async (req, res) => {
    try {
        const datosReales = await calcularFinanzasDia();
        const montoReal = datosReales.dineroEnCaja;
        const fecha = datosReales.fechaStr;

        const { data: existe } = await supabase.from('cierres').select('*').eq('fecha', fecha).single();
        if (existe) await supabase.from('cierres').update({ monto_final: montoReal }).eq('fecha', fecha);
        else await supabase.from('cierres').insert([{ fecha, monto_final: montoReal }]);

        res.json({ message: "Cierre guardado", monto: montoReal });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const obtenerReportePorFecha = async (req, res) => {
    const { fecha } = req.query;
    try {
        const fechaObj = new Date(fecha);
        const año = fechaObj.getFullYear();
        const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
        const dia = String(fechaObj.getDate()).padStart(2, '0');

        const fechaStr = `${año}-${mes}-${dia}`;
        const inicio = new Date(`${fechaStr}T06:00:00.000Z`).toISOString();
        const finDate = new Date(`${fechaStr}T06:00:00.000Z`);
        finDate.setDate(finDate.getDate() + 1);
        const fin = finDate.toISOString();

        const { data: ordenes } = await supabase.from('ordenes').select('*').gte('created_at', inicio).lt('created_at', fin);
        const { data: gastos } = await supabase.from('gastos').select('*').gte('created_at', inicio).lt('created_at', fin);
        const { data: extras } = await supabase.from('ingresos_extras').select('*').gte('created_at', inicio).lt('created_at', fin);

        let ventas = 0, gastosTotal = 0, extrasTotal = 0, anulado = 0, validas = 0;
        const conteoPorTipo = { domicilio: 0, retiro: 0, mesa: 0, personal: 0 };
        const ventasPorTipo = { domicilio: 0, retiro: 0, mesa: 0, personal: 0 };
        const conteoPlatos = {};

        if(ordenes) {
            ordenes.forEach(o => {
                if (o.estado !== 'anulado') {
                    if (o.tipo_entrega !== 'personal') ventas += o.total;
                    validas++;
                    conteoPorTipo[o.tipo_entrega] = (conteoPorTipo[o.tipo_entrega] || 0) + 1;
                    ventasPorTipo[o.tipo_entrega] = (ventasPorTipo[o.tipo_entrega] || 0) + o.total;
                    o.detalles.forEach(i => conteoPlatos[i.nombre] = (conteoPlatos[i.nombre] || 0) + i.cantidad);
                } else {
                    anulado += o.total;
                }
            });
        }

        if(gastos) gastos.forEach(g => gastosTotal += g.monto);
        if(extras) extras.forEach(e => extrasTotal += e.monto);

        const { data: cierreAnterior } = await supabase.from('cierres').select('monto_final').lt('fecha', fechaStr).order('fecha', { ascending: false }).limit(1).single();
        const saldoInicial = cierreAnterior ? cierreAnterior.monto_final : 0;

        res.json({
            fecha: fechaStr, saldoInicial: saldoInicial.toFixed(2), ventas: ventas.toFixed(2),
            gastosTotal: gastosTotal.toFixed(2), extrasTotal: extrasTotal.toFixed(2),
            dineroEnCaja: (saldoInicial + ventas + extrasTotal - gastosTotal).toFixed(2),
            anulado: anulado.toFixed(2), cantidadOrdenes: validas, conteoPorTipo, ventasPorTipo,
            rankingPlatos: Object.entries(conteoPlatos).map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad),
            listaOrdenes: ordenes || [], listaGastos: gastos || [], listaIngresosExtras: extras || []
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

const obtenerConsumoPersonal = async (req, res) => {
    try {
        const { inicio, fin } = getRangoDiario();
        const { data: ordenesPersonales } = await supabase.from('ordenes').select('*').eq('tipo_entrega', 'personal').gte('created_at', inicio).lt('created_at', fin).order('created_at', { ascending: false });

        if (!ordenesPersonales) return res.json({ ordenes: [], totalPlatos: 0, resumenPlatos: [] });

        const resumenPlatos = {};
        let totalPlatos = 0;

        ordenesPersonales.forEach(orden => {
            if (orden.estado !== 'anulado') {
                orden.detalles.forEach(item => {
                    resumenPlatos[item.nombre] = (resumenPlatos[item.nombre] || 0) + item.cantidad;
                    totalPlatos += item.cantidad;
                });
            }
        });

        res.json({
            ordenes: ordenesPersonales, totalPlatos,
            resumenPlatos: Object.entries(resumenPlatos).map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad)
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

const obtenerComparativa = async (req, res) => {
    try {
        const dias = parseInt(req.query.dias) || 7;
        const resultados = [];

        for (let i = 0; i < dias; i++) {
            const fecha = new Date();
            fecha.setDate(fecha.getDate() - i);
            const fechaStr = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
            const inicio = new Date(`${fechaStr}T06:00:00.000Z`).toISOString();
            const finDate = new Date(`${fechaStr}T06:00:00.000Z`);
            finDate.setDate(finDate.getDate() + 1);
            
            const { data: ordenes } = await supabase.from('ordenes').select('*').gte('created_at', inicio).lt('created_at', finDate.toISOString());
            const { data: cierre } = await supabase.from('cierres').select('monto_final').eq('fecha', fechaStr).single();

            let ventas = 0, conteoOrdenes = 0;
            if(ordenes) {
                ordenes.forEach(o => {
                    if (o.estado !== 'anulado') {
                        if (o.tipo_entrega !== 'personal') ventas += o.total;
                        conteoOrdenes++;
                    }
                });
            }

            resultados.push({
                fecha: fechaStr, ventas: ventas.toFixed(2), ordenes: conteoOrdenes,
                cierre: cierre ? cierre.monto_final.toFixed(2) : '0.00',
                diaSemana: fecha.toLocaleDateString('es-ES', { weekday: 'short' })
            });
        }
        res.json(resultados.reverse());
    } catch (error) { res.status(500).json({ error: error.message }); }
};

module.exports = { agregarGasto, eliminarGasto, agregarIngresoExtra, eliminarIngresoExtra, obtenerReporteHoy, guardarCierre, obtenerReportePorFecha, obtenerConsumoPersonal, obtenerComparativa };