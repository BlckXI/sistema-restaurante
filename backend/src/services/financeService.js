const supabase = require('../config/supabase');
const { getRangoDiario } = require('../utils/dateUtils');

const calcularFinanzasDia = async () => {
    const { inicio, fin, fechaStr } = getRangoDiario();

    // 1. Saldo Inicial (Cierre del día anterior registrado)
    const { data: ultimoCierre } = await supabase.from('cierres')
        .select('monto_final')
        .lt('fecha', fechaStr)
        .order('fecha', { ascending: false })
        .limit(1)
        .single();
    const saldoInicial = ultimoCierre ? ultimoCierre.monto_final : 0;

    // 2. Consultar datos usando el rango UTC corregido
    const { data: ordenes } = await supabase.from('ordenes').select('*').gte('created_at', inicio).lt('created_at', fin);
    const { data: gastos } = await supabase.from('gastos').select('*').gte('created_at', inicio).lt('created_at', fin);
    const { data: extras } = await supabase.from('ingresos_extras').select('*').gte('created_at', inicio).lt('created_at', fin);

    let ventas = 0, tGastos = 0, tExtras = 0, anulado = 0, validas = 0;
    const conteo = {};

    if(ordenes) {
        ordenes.forEach(o => {
            const estadoNormalizado = o.estado ? o.estado.toLowerCase().trim() : 'pendiente';

            if (estadoNormalizado === 'anulado') {
                anulado += o.total;
            } else {
                if (o.tipo_entrega !== 'personal') {
                    ventas += o.total; 
                }
                validas++;
                if (o.detalles && Array.isArray(o.detalles)) {
                    o.detalles.forEach(i => conteo[i.nombre] = (conteo[i.nombre] || 0) + i.cantidad);
                }
            }
        });
    }

    if(gastos) gastos.forEach(g => tGastos += g.monto);
    if(extras) extras.forEach(e => tExtras += e.monto);

    const dineroEnCaja = saldoInicial + ventas + tExtras - tGastos;

    return {
        saldoInicial, ventas, tGastos, tExtras, dineroEnCaja, anulado, validas, conteo, 
        ordenes: ordenes || [], gastos: gastos || [], extras: extras || [], fechaStr
    };
};

module.exports = { calcularFinanzasDia };