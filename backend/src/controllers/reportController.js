const supabase = require('../config/supabase');
const { getRangoDiario } = require('../utils/dateUtils');
const { calcularFinanzasDia } = require('../services/financeService');

const agregarGasto = async (req, res) => {
    try {
        const { descripcion, monto } = req.body;
        const { error } = await supabase.from('gastos').insert([{ descripcion, monto }]);
        
        if (error) throw error;
        
        req.io.emit('reporte_actualizado');
        res.status(201).json({ message: "Gasto registrado correctamente" });
    } catch (error) {
        console.error("Error en agregarGasto:", error);
        res.status(500).json({ error: error.message });
    }
};

const eliminarGasto = async (req, res) => {
    try {
        const { error } = await supabase.from('gastos').delete().eq('id', req.params.id);
        
        if (error) throw error;
        
        req.io.emit('reporte_actualizado');
        res.status(200).json({ message: "Gasto eliminado correctamente" });
    } catch (error) {
        console.error("Error en eliminarGasto:", error);
        res.status(500).json({ error: error.message });
    }
};

const agregarIngresoExtra = async (req, res) => {
    try {
        const { descripcion, monto } = req.body;
        const { error } = await supabase.from('ingresos_extras').insert([{ descripcion, monto }]);
        
        if (error) throw error;
        
        req.io.emit('reporte_actualizado');
        res.status(201).json({ message: "Ingreso extra registrado correctamente" });
    } catch (error) {
        console.error("Error en agregarIngresoExtra:", error);
        res.status(500).json({ error: error.message });
    }
};

const eliminarIngresoExtra = async (req, res) => {
    try {
        const { error } = await supabase.from('ingresos_extras').delete().eq('id', req.params.id);
        
        if (error) throw error;
        
        req.io.emit('reporte_actualizado');
        res.status(200).json({ message: "Ingreso extra eliminado correctamente" });
    } catch (error) {
        console.error("Error en eliminarIngresoExtra:", error);
        res.status(500).json({ error: error.message });
    }
};

const obtenerReporteHoy = async (req, res) => {
    try {
        const datos = await calcularFinanzasDia();

        res.status(200).json({
            saldoInicial: datos.saldoInicial || 0,
            ingresoVentas: datos.ventas || 0,
            totalGastos: datos.totalGastos || datos.tGastos || 0,
            totalIngresosExtras: datos.totalIngresosExtras || datos.tExtras || 0,
            dineroEnCaja: datos.dineroEnCaja || 0,
            totalAnulado: datos.anulado || 0,
            cantidadOrdenes: datos.validas || 0,
            platosDia: datos.platosDia || [],
            listaOrdenes: datos.ordenes || [],
            listaGastos: datos.gastos || [],
            listaIngresosExtras: datos.extras || []
        });
    } catch (error) {
        console.error("Error en obtenerReporteHoy:", error);
        res.status(500).json({ error: error.message });
    }
};

const guardarCierre = async (req, res) => {
    try {
        const datosReales = await calcularFinanzasDia();
        const montoReal = req.body.monto !== undefined ? parseFloat(req.body.monto) : datosReales.dineroEnCaja;
        const fecha = datosReales.fechaStr;

        const { data: existe } = await supabase.from('cierres').select('*').eq('fecha', fecha).single();
        
        if (existe) {
            const { error: errorUpdate } = await supabase.from('cierres').update({ monto_final: montoReal }).eq('fecha', fecha);
            if (errorUpdate) throw errorUpdate;
        } else {
            const { error: errorInsert } = await supabase.from('cierres').insert([{ fecha, monto_final: montoReal }]);
            if (errorInsert) throw errorInsert;
        }

        res.status(200).json({ message: "Cierre guardado exitosamente", monto: montoReal });
    } catch (error) {
        console.error("Error en guardarCierre:", error);
        res.status(500).json({ error: error.message });
    }
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

        let ventas = 0, gastosTotal = 0, extrasTotal = 0, anulado = 0, validas = 0;
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
                    o.detalles.forEach(i => conteoPlatos[i.nombre] = (conteoPlatos[i.nombre] || 0) + i.cantidad);
                }
            } else {
                anulado += o.total;
            }
        });

        gastos.forEach(g => gastosTotal += g.monto);
        extras.forEach(e => extrasTotal += e.monto);

        const saldoInicial = cierreAnterior ? cierreAnterior.monto_final : 0;
        const dineroEnCaja = saldoInicial + ventas + extrasTotal - gastosTotal;

        res.status(200).json({
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
            rankingPlatos: Object.entries(conteoPlatos).map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad),
            listaOrdenes: ordenes,
            listaGastos: gastos,
            listaIngresosExtras: extras
        });
    } catch (error) {
        console.error("Error en obtenerReportePorFecha:", error);
        res.status(500).json({ error: error.message });
    }
};

const obtenerConsumoPersonal = async (req, res) => {
    try {
        const { inicio, fin } = getRangoDiario();
        const { data: ordenesPersonales, error } = await supabase.from('ordenes')
            .select('*')
            .eq('tipo_entrega', 'personal')
            .gte('created_at', inicio)
            .lt('created_at', fin)
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (!ordenesPersonales) return res.status(200).json({ ordenes: [], totalPlatos: 0, resumenPlatos: [] });

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

        res.status(200).json({
            ordenes: ordenesPersonales,
            totalPlatos,
            resumenPlatos: Object.entries(resumenPlatos).map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad)
        });
    } catch (error) {
        console.error("Error en obtenerConsumoPersonal:", error);
        res.status(500).json({ error: error.message });
    }
};

const obtenerComparativa = async (req, res) => {
    try {
        const dias = parseInt(req.query.dias) || 7;
        const resultados = [];
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
                let ventas = 0, conteoOrdenes = 0;
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

        resultados.push(...await Promise.all(promesas));
        
        resultados.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        res.status(200).json(resultados);
    } catch (error) {
        console.error("Error en obtenerComparativa:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { 
    agregarGasto, 
    eliminarGasto, 
    agregarIngresoExtra, 
    eliminarIngresoExtra, 
    obtenerReporteHoy, 
    guardarCierre, 
    obtenerReportePorFecha, 
    obtenerConsumoPersonal, 
    obtenerComparativa 
};