const supabase = require('../config/supabase');
const { getRangoDiario } = require('../utils/dateUtils');

const COSTO_DOMICILIO = 1.0;

// Cola de procesamiento (Mutex) para evitar condiciones de carrera en el stock
let colaDeOrdenes = Promise.resolve();

/**
 * Calcula el total de una orden considerando el tipo de entrega y si es orden extra.
 */
const calcularTotalOrden = ({ detalles = [], tipo_entrega = 'mesa', es_extra = false }) => {
    if (tipo_entrega === 'personal') return 0;
    const subtotal = detalles.reduce((acc, item) => acc + (Number(item.precio) || 0) * (Number(item.cantidad) || 0), 0);
    const costoEnvio = tipo_entrega === 'domicilio' && !es_extra ? COSTO_DOMICILIO : 0;
    return Number((subtotal + costoEnvio).toFixed(2));
};

/**
 * Procesa la creación de una orden de forma secuencial validando y descontando stock.
 */
const procesarNuevaOrden = (datosOrden) => {
    return new Promise((resolve, reject) => {
        colaDeOrdenes = colaDeOrdenes
            .then(async () => {
                try {
                    const {
                        cliente,
                        total,
                        detalles = [],
                        tipo_entrega,
                        direccion,
                        telefono,
                        hora_programada,
                        comentarios,
                        metodo_pago
                    } = datosOrden;

                    for (const item of detalles) {
                        const { data: plato } = await supabase
                            .from('platos')
                            .select('stock, nombre, id_padre')
                            .eq('id', item.id)
                            .single();

                        if (!plato) {
                            const err = new Error('Plato no encontrado');
                            err.statusCode = 404;
                            throw err;
                        }

                        let stockReal = plato.stock;
                        if (plato.id_padre) {
                            const { data: padre } = await supabase
                                .from('platos')
                                .select('stock')
                                .eq('id', plato.id_padre)
                                .single();
                            stockReal = padre ? padre.stock : 0;
                        }

                        if (stockReal < item.cantidad) {
                            const err = new Error(`Stock insuficiente de ${plato.nombre}. Alguien más lo acaba de comprar.`);
                            err.statusCode = 400;
                            throw err;
                        }
                    }

                    const { inicio, fin } = getRangoDiario();
                    const { count: conteoDia } = await supabase
                        .from('ordenes')
                        .select('*', { count: 'exact', head: true })
                        .gte('created_at', inicio)
                        .lt('created_at', fin);

                    const numeroTicket = (conteoDia || 0) + 1;
                    const esExtra = String(cliente || '').includes('(EXTRA)');
                    const totalCalculado =
                        total !== undefined && total !== null
                            ? Number(total)
                            : calcularTotalOrden({ detalles, tipo_entrega, es_extra: esExtra });

                    const ordenParaGuardar = {
                        cliente,
                        total: totalCalculado,
                        detalles,
                        tipo_entrega,
                        direccion: direccion || '',
                        telefono: telefono || '',
                        numero_diario: numeroTicket,
                        hora_programada: hora_programada || null,
                        comentarios: comentarios ? String(comentarios).trim() : '',
                        estado: 'pendiente',
                        metodo_pago: metodo_pago || 'efectivo'
                    };

                    const { data: ordenData, error: ordenError } = await supabase
                        .from('ordenes')
                        .insert([ordenParaGuardar])
                        .select();

                    if (ordenError) throw new Error(ordenError.message);

                    for (const item of detalles) {
                        const { data: platoRef } = await supabase
                            .from('platos')
                            .select('id, id_padre')
                            .eq('id', item.id)
                            .single();

                        if (platoRef) {
                            const idTarget = platoRef.id_padre || platoRef.id;
                            const { data: obj } = await supabase
                                .from('platos')
                                .select('stock')
                                .eq('id', idTarget)
                                .single();

                            if (obj) {
                                await supabase
                                    .from('platos')
                                    .update({ stock: obj.stock - item.cantidad })
                                    .eq('id', idTarget);
                            }
                        }
                    }

                    resolve(ordenData[0]);
                } catch (err) {
                    reject(err);
                }
            })
            .catch(err => reject(err));
    });
};

const marcarOrdenLista = async (id) => {
    const { data, error } = await supabase
        .from('ordenes')
        .update({ estado: 'listo' })
        .eq('id', id)
        .select('id, tipo_entrega, cliente')
        .single();

    if (error) throw new Error(error.message);
    return data;
};

const anularOrdenYRestaurarStock = async (id) => {
    const { data: orden, error: fetchError } = await supabase.from('ordenes').select('*').eq('id', id).single();
    if (fetchError || !orden || orden.estado === 'anulado') {
        const err = new Error('Orden no encontrada o ya anulada');
        err.statusCode = 400;
        throw err;
    }

    const detalles = orden.detalles || [];
    for (const item of detalles) {
        if (item.id) {
            const { data: platoRef } = await supabase.from('platos').select('id, id_padre').eq('id', item.id).single();
            if (platoRef) {
                const idTarget = platoRef.id_padre || platoRef.id;
                const { data: obj } = await supabase.from('platos').select('stock').eq('id', idTarget).single();
                if (obj) {
                    await supabase.from('platos').update({ stock: obj.stock + item.cantidad }).eq('id', idTarget);
                }
            }
        }
    }

    const { error: updateError } = await supabase.from('ordenes').update({ estado: 'anulado' }).eq('id', id);
    if (updateError) throw new Error(updateError.message);

    return orden;
};

const marcarOrdenEntregada = async (id) => {
    const { error } = await supabase.from('ordenes').update({ estado: 'entregado' }).eq('id', id);
    if (error) throw new Error(error.message);
    return { id };
};

const listarOrdenesPendientesCocina = async () => {
    const { data, error } = await supabase
        .from('ordenes')
        .select('*')
        .eq('estado', 'pendiente')
        .order('numero_diario', { ascending: true })
        .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
};

const listarPedidosDomicilioListos = async () => {
    const { data, error } = await supabase
        .from('ordenes')
        .select('*')
        .eq('estado', 'listo')
        .eq('tipo_entrega', 'domicilio')
        .order('id', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
};

const listarHistorialEntregasHoy = async () => {
    const { inicio, fin } = getRangoDiario();
    const { data, error } = await supabase
        .from('ordenes')
        .select('*')
        .eq('estado', 'entregado')
        .gte('created_at', inicio)
        .lt('created_at', fin)
        .order('id', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
};

module.exports = {
    calcularTotalOrden,
    procesarNuevaOrden,
    marcarOrdenLista,
    anularOrdenYRestaurarStock,
    marcarOrdenEntregada,
    listarOrdenesPendientesCocina,
    listarPedidosDomicilioListos,
    listarHistorialEntregasHoy
};
