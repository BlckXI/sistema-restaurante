const supabase = require('../config/supabase');
const { getRangoDiario } = require('../utils/dateUtils');

const COSTO_DOMICILIO_DEFAULT = 1.0;

/**
 * Procesa de forma pura los registros financieros del día.
 * Separa la lógica contable del acceso a base de datos para facilitar pruebas unitarias (TDD).
 */
const procesarDatosFinancieros = ({
    saldoInicial = 0,
    ordenes = [],
    gastos = [],
    extras = [],
    platos = [],
    costoDomicilio = COSTO_DOMICILIO_DEFAULT,
    fechaStr = ''
}) => {
    let ventasEfectivo = 0;
    let ventasTransferencia = 0;
    let cantidadTransferencias = 0;
    let pedidosDomicilio = 0;
    let pedidosDomicilioEfectivo = 0;
    let totalGastos = 0;
    let totalExtras = 0;
    let totalAnulado = 0;
    let validas = 0;
    const conteoVentas = {};
    const conteoPersonal = {};

    ordenes.forEach(orden => {
        const estadoNormalizado = orden.estado ? orden.estado.toLowerCase().trim() : 'pendiente';
        const montoOrden = Number(orden.total) || 0;

        if (estadoNormalizado === 'anulado') {
            totalAnulado += montoOrden;
            return;
        }

        validas++;

        if (orden.tipo_entrega === 'domicilio') {
            pedidosDomicilio++;
            if (orden.metodo_pago !== 'transferencia') {
                pedidosDomicilioEfectivo++;
            }
        }

        if (orden.tipo_entrega !== 'personal') {
            if (orden.metodo_pago === 'transferencia') {
                ventasTransferencia += montoOrden;
                cantidadTransferencias++;
            } else {
                ventasEfectivo += montoOrden;
            }
        }

        if (orden.detalles && Array.isArray(orden.detalles)) {
            orden.detalles.forEach(item => {
                if (orden.tipo_entrega === 'personal') {
                    conteoPersonal[item.nombre] = (conteoPersonal[item.nombre] || 0) + item.cantidad;
                } else {
                    conteoVentas[item.nombre] = (conteoVentas[item.nombre] || 0) + item.cantidad;
                }
            });
        }
    });

    gastos.forEach(gasto => {
        totalGastos += Number(gasto.monto) || 0;
    });

    extras.forEach(extra => {
        totalExtras += Number(extra.monto) || 0;
    });

    const totalDomicilios = pedidosDomicilio * costoDomicilio;
    const totalDomiciliosEfectivo = pedidosDomicilioEfectivo * costoDomicilio;
    const ventasEfectivoNeto = ventasEfectivo - totalDomiciliosEfectivo;
    const saldoInicialNum = Number(saldoInicial) || 0;
    const dineroEnCaja = Number((saldoInicialNum + ventasEfectivo + totalExtras - totalGastos).toFixed(2));

    const platosDia = [];
    platos
        .filter(plato => !plato.id_padre)
        .forEach(plato => {
            const vendidos = conteoVentas[plato.nombre] || 0;
            const consumo = conteoPersonal[plato.nombre] || 0;
            const final = plato.stock || 0;
            const inicial = final + vendidos + consumo;

            if (inicial > 0 || vendidos > 0 || consumo > 0) {
                platosDia.push({
                    nombre: plato.nombre,
                    inicial,
                    vendidos,
                    consumo,
                    final
                });
            }
        });

    return {
        saldoInicial: saldoInicialNum,
        ventas: Number((ventasEfectivo + ventasTransferencia).toFixed(2)),
        ventasEfectivo: Number(ventasEfectivo.toFixed(2)),
        ventasEfectivoNeto: Number(ventasEfectivoNeto.toFixed(2)),
        ventasTransferencia: Number(ventasTransferencia.toFixed(2)),
        cantidadTransferencias,
        pedidosDomicilio,
        pedidosDomicilioEfectivo,
        totalDomicilios: Number(totalDomicilios.toFixed(2)),
        totalDomiciliosEfectivo: Number(totalDomiciliosEfectivo.toFixed(2)),
        tGastos: Number(totalGastos.toFixed(2)),
        totalGastos: Number(totalGastos.toFixed(2)),
        tExtras: Number(totalExtras.toFixed(2)),
        totalIngresosExtras: Number(totalExtras.toFixed(2)),
        dineroEnCaja,
        anulado: Number(totalAnulado.toFixed(2)),
        validas,
        platosDia,
        ordenes,
        gastos,
        extras,
        fechaStr
    };
};

/**
 * Obtiene los datos del día desde Supabase y calcula las finanzas diarias.
 */
const calcularFinanzasDia = async () => {
    const { inicio, fin, fechaStr } = getRangoDiario();

    const { data: ultimoCierre, error: errorCierre } = await supabase
        .from('cierres')
        .select('monto_final')
        .lt('fecha', fechaStr)
        .order('fecha', { ascending: false })
        .limit(1)
        .single();

    if (errorCierre && errorCierre.code !== 'PGRST116') {
        throw new Error('Fallo al obtener el saldo inicial de la base de datos.');
    }

    const saldoInicial = ultimoCierre ? ultimoCierre.monto_final : 0;

    const [reqOrdenes, reqGastos, reqExtras, reqPlatos] = await Promise.all([
        supabase.from('ordenes').select('*').gte('created_at', inicio).lt('created_at', fin),
        supabase.from('gastos').select('*').gte('created_at', inicio).lt('created_at', fin),
        supabase.from('ingresos_extras').select('*').gte('created_at', inicio).lt('created_at', fin),
        supabase.from('platos').select('nombre, stock, id_padre')
    ]);

    return procesarDatosFinancieros({
        saldoInicial,
        ordenes: reqOrdenes.data || [],
        gastos: reqGastos.data || [],
        extras: reqExtras.data || [],
        platos: reqPlatos.data || [],
        fechaStr
    });
};

module.exports = {
    calcularFinanzasDia,
    procesarDatosFinancieros
};