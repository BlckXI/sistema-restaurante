const supabase = require('../config/supabase');
const { getRangoDiario } = require('../utils/dateUtils');

const calcularFinanzasDia = async () => {
    try {
        const { inicio, fin, fechaStr } = getRangoDiario();

        // 1. Saldo Inicial
        const { data: ultimoCierre, error: errorCierre } = await supabase.from('cierres')
            .select('monto_final')
            .lt('fecha', fechaStr)
            .order('fecha', { ascending: false })
            .limit(1)
            .single();

        // Justificación: El código PGRST116 ocurre al no encontrar registros (ej. primer día de uso). No es un error crítico.
        if (errorCierre && errorCierre.code !== 'PGRST116') {
            console.error('Error al obtener el saldo inicial:', errorCierre);
            throw new Error('Fallo al obtener el saldo inicial de la base de datos.');
        }

        const saldoInicial = ultimoCierre ? ultimoCierre.monto_final : 0;

        // 2. Consultas concurrentes (Rendimiento)
        const [reqOrdenes, reqGastos, reqExtras, reqPlatos] = await Promise.all([
            supabase.from('ordenes').select('*').gte('created_at', inicio).lt('created_at', fin),
            supabase.from('gastos').select('*').gte('created_at', inicio).lt('created_at', fin),
            supabase.from('ingresos_extras').select('*').gte('created_at', inicio).lt('created_at', fin),
            supabase.from('platos').select('nombre, stock, id_padre')
        ]);

        const ordenes = reqOrdenes.data || [];
        const gastos = reqGastos.data || [];
        const extras = reqExtras.data || [];
        const platos = reqPlatos.data || [];

        let ventasEfectivo = 0, ventasTransferencia = 0, totalGastos = 0, totalExtras = 0, totalAnulado = 0, validas = 0;
        const conteoVentas = {};
        const conteoPersonal = {};

        ordenes.forEach(orden => {
            const estadoNormalizado = orden.estado ? orden.estado.toLowerCase().trim() : 'pendiente';

            if (estadoNormalizado === 'anulado') {
                totalAnulado += (orden.total || 0);
            } else {
                if (orden.tipo_entrega !== 'personal') {
                    if (orden.metodo_pago === 'transferencia') {
                        ventasTransferencia += orden.total;
                    } else {
                        ventasEfectivo += orden.total;
                    }
                }
                
                validas++;

                if (orden.detalles && Array.isArray(orden.detalles)) {
                    orden.detalles.forEach(item => {
                        if (orden.tipo_entrega === 'personal') {
                            conteoPersonal[item.nombre] = (conteoPersonal[item.nombre] || 0) + item.cantidad;
                        } else {
                            conteoVentas[item.nombre] = (conteoVentas[item.nombre] || 0) + item.cantidad;
                        }
                    });
                }
            }
        });

        gastos.forEach(gasto => { totalGastos += gasto.monto; });
        extras.forEach(extra => { totalExtras += extra.monto; });

        // Lógica contable corregida (Responsabilidad Única)
        const dineroEnCaja = saldoInicial + ventasEfectivo + totalExtras - totalGastos;

        const platosDia = [];
        platos.filter(plato => !plato.id_padre).forEach(plato => {
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
            saldoInicial, 
            ventas: ventasEfectivo + ventasTransferencia, 
            ventasEfectivo,
            ventasTransferencia,
            tGastos: totalGastos, // Retrocompatibilidad
            totalGastos,          // Nueva nomenclatura exacta para Reportes.jsx
            tExtras: totalExtras, // Retrocompatibilidad
            totalIngresosExtras: totalExtras, // Nueva nomenclatura exacta para Reportes.jsx
            dineroEnCaja, 
            anulado: totalAnulado, 
            validas, 
            platosDia, 
            ordenes, 
            gastos, 
            extras, 
            fechaStr
        };
    } catch (error) {
        console.error('Error durante la ejecucion de calcularFinanzasDia:', error);
        throw error;
    }
};

module.exports = { calcularFinanzasDia };