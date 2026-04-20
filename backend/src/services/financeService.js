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

    // 2. Consultar datos usando el rango UTC
    const { data: ordenes } = await supabase.from('ordenes').select('*').gte('created_at', inicio).lt('created_at', fin);
    const { data: gastos } = await supabase.from('gastos').select('*').gte('created_at', inicio).lt('created_at', fin);
    const { data: extras } = await supabase.from('ingresos_extras').select('*').gte('created_at', inicio).lt('created_at', fin);
    const { data: platos } = await supabase.from('platos').select('nombre, stock, id_padre'); // Necesario para la tabla nueva

    let ventasEfectivo = 0, ventasTransferencia = 0, tGastos = 0, tExtras = 0, anulado = 0, validas = 0, domiciliosCount = 0;
    const conteoVentas = {};
    const conteoPersonal = {};

    if(ordenes) {
        ordenes.forEach(o => {
            const estadoNormalizado = o.estado ? o.estado.toLowerCase().trim() : 'pendiente';

            if (estadoNormalizado === 'anulado') {
                anulado += (o.total || 0);
            } else {
                // Sumar ingresos separando por método de pago
                if (o.tipo_entrega !== 'personal') {
                    if (o.metodo_pago === 'transferencia') {
                        ventasTransferencia += o.total;
                    } else {
                        ventasEfectivo += o.total;
                    }
                }
                
                // Contar domicilios para el recargo
                if (o.tipo_entrega === 'domicilio') domiciliosCount++;
                validas++;

                // Separar ventas regulares vs consumo personal para los Platos del Día
                if (o.detalles && Array.isArray(o.detalles)) {
                    o.detalles.forEach(i => {
                        if (o.tipo_entrega === 'personal') {
                            conteoPersonal[i.nombre] = (conteoPersonal[i.nombre] || 0) + i.cantidad;
                        } else {
                            conteoVentas[i.nombre] = (conteoVentas[i.nombre] || 0) + i.cantidad;
                        }
                    });
                }
            }
        });
    }

    if(gastos) gastos.forEach(g => tGastos += g.monto);
    if(extras) extras.forEach(e => tExtras += e.monto);

    // NUEVA LÓGICA CONTABLE (Solo efectivo físico)
    const totalDomicilios = domiciliosCount * 0.50;
    const dineroEnCaja = saldoInicial + ventasEfectivo + tExtras + totalDomicilios - tGastos;

    // 3. Construir arreglo para "Platos del Día"
    const platosDia = [];
    if (platos) {
        // Filtramos para mostrar solo los platos principales (ignoramos sub-porciones si tienen id_padre)
        platos.filter(p => !p.id_padre).forEach(p => {
            const vendidos = conteoVentas[p.nombre] || 0;
            const consumo = conteoPersonal[p.nombre] || 0;
            const final = p.stock || 0;
            
            // Fórmula inversa: si al final tengo X, y vendí Y, entonces empecé con X+Y
            const inicial = final + vendidos + consumo;

            // Solo enviar si hubo movimiento o si hay stock
            if (inicial > 0 || vendidos > 0 || consumo > 0) {
                platosDia.push({
                    nombre: p.nombre,
                    inicial,
                    vendidos,
                    consumo,
                    final
                });
            }
        });
    }

    return {
        saldoInicial, 
        ventas: ventasEfectivo + ventasTransferencia, // Se envía total para info general
        ventasEfectivo,
        ventasTransferencia,
        tGastos, 
        tExtras, 
        dineroEnCaja, 
        anulado, 
        validas, 
        platosDia, // <--- Nueva data inyectada
        ordenes: ordenes || [], 
        gastos: gastos || [], 
        extras: extras || [], 
        fechaStr
    };
};

module.exports = { calcularFinanzasDia };