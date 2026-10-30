const supabase = require('../config/supabase');
const { COSTO_DOMICILIO } = require('../config/constants');
const {
    esTextoValido,
    esTextoOpcionalValido,
    esEnteroPositivoValido
} = require('../utils/validators');

/**
 * Calcula el total monetario de una orden a partir de sus detalles, tipo de entrega y si es pedido extra.
 */
const calcularTotalOrden = ({ detalles = [], tipo_entrega = 'mesa', es_extra = false }) => {
    if (tipo_entrega === 'personal') {
        return 0;
    }

    const subtotal = detalles.reduce((acc, item) => {
        const precio = parseFloat(item.precio) || 0;
        const cantidad = parseInt(item.cantidad, 10) || 0;
        return acc + precio * cantidad;
    }, 0);

    const cargoDomicilio = tipo_entrega === 'domicilio' && !es_extra ? COSTO_DOMICILIO : 0;
    return Number((subtotal + cargoDomicilio).toFixed(2));
};

/**
 * Ajusta el stock de un plato (o de su plato padre si tiene id_padre configurado) aplicando un delta (+ o -).
 * Retorna la información del plato original y del plato cuyo inventario fue afectado.
 */
const ajustarStockPlato = async (idPlato, delta) => {
    const { data: plato, error: errPlato } = await supabase
        .from('platos')
        .select('id, nombre, precio, stock, id_padre')
        .eq('id', idPlato)
        .single();

    if (errPlato || !plato) {
        const err = new Error(`El plato solicitado (ID ${idPlato}) no existe en el inventario`);
        err.statusCode = 400;
        throw err;
    }

    const idAfectado = plato.id_padre ? plato.id_padre : plato.id;
    let platoStock = plato;

    if (plato.id_padre) {
        const { data: padre, error: errPadre } = await supabase
            .from('platos')
            .select('id, nombre, stock')
            .eq('id', idAfectado)
            .single();

        if (errPadre || !padre) {
            const err = new Error(`Plato principal no encontrado para ${plato.nombre}`);
            err.statusCode = 400;
            throw err;
        }
        platoStock = padre;
    }

    const stockDisponible = Number(platoStock.stock) || 0;
    const nuevoStock = stockDisponible + delta;

    if (delta < 0 && nuevoStock < 0) {
        const err = new Error(
            `Stock insuficiente para ${platoStock.nombre} (Disponible: ${stockDisponible})`
        );
        err.statusCode = 400;
        throw err;
    }

    const { error: errUpdate } = await supabase
        .from('platos')
        .update({ stock: Math.max(0, nuevoStock) })
        .eq('id', idAfectado);

    if (errUpdate) {
        throw errUpdate;
    }

    return {
        plato,
        platoStock,
        idAfectado,
        delta
    };
};

/**
 * Valida, descuenta stock (soportando platos hijos con id_padre) y registra una nueva orden en Supabase.
 * Siempre calcula el total en el servidor a partir de los precios reales de la base de datos.
 */
const procesarNuevaOrden = async (datosOrden) => {
    const { cliente, detalles, tipo_entrega, direccion, telefono, metodo_pago } = datosOrden;

    const esExtra =
        Boolean(datosOrden.es_extra) || String(cliente || '').includes('(EXTRA)');
    const nombreLimpio = String(cliente || '').replace(' (EXTRA)', '').trim();

    if (!esTextoValido(nombreLimpio)) {
        const err = new Error('El nombre del cliente es obligatorio y solo debe contener letras');
        err.statusCode = 400;
        throw err;
    }

    if (direccion && !esTextoOpcionalValido(direccion)) {
        const err = new Error('La dirección contiene símbolos no permitidos');
        err.statusCode = 400;
        throw err;
    }

    if (!Array.isArray(detalles) || detalles.length === 0) {
        const err = new Error('La orden debe contener al menos un producto');
        err.statusCode = 400;
        throw err;
    }

    const ajustesAplicados = [];
    const detallesVerificados = [];

    try {
        for (const item of detalles) {
            if (!esEnteroPositivoValido(item.cantidad)) {
                const err = new Error(
                    `Cantidad inválida para ${item.nombre || 'producto'}: debe ser un entero positivo`
                );
                err.statusCode = 400;
                throw err;
            }

            if (item.nota && !esTextoOpcionalValido(item.nota)) {
                const err = new Error(
                    `La nota en ${item.nombre || 'producto'} contiene símbolos no permitidos`
                );
                err.statusCode = 400;
                throw err;
            }

            const cantidad = Number(item.cantidad);

            if (item.id !== undefined && item.id !== null) {
                const ajuste = await ajustarStockPlato(item.id, -cantidad);
                ajustesAplicados.push({ idPlato: item.id, cantidad });

                detallesVerificados.push({
                    ...item,
                    id: ajuste.plato.id,
                    nombre: ajuste.plato.nombre || item.nombre,
                    precio: Number(ajuste.plato.precio),
                    cantidad
                });
            } else {
                detallesVerificados.push({
                    ...item,
                    precio: Number(item.precio) || 0,
                    cantidad
                });
            }
        }
    } catch (err) {
        // Revertir descuentos previos si falla algún ítem a mitad del pedido
        for (const previo of ajustesAplicados) {
            try {
                await ajustarStockPlato(previo.idPlato, previo.cantidad);
            } catch {
                // Ignorar error de reversión secundaria
            }
        }
        throw err;
    }

    const totalCalculado = calcularTotalOrden({
        detalles: detallesVerificados,
        tipo_entrega,
        es_extra: esExtra
    });

    const clienteNormalizado = esExtra && !String(cliente || '').includes('(EXTRA)')
        ? `${nombreLimpio} (EXTRA)`
        : String(cliente).trim();

    const { data, error } = await supabase
        .from('ordenes')
        .insert([
            {
                cliente: clienteNormalizado,
                total: totalCalculado,
                detalles: detallesVerificados,
                tipo_entrega: tipo_entrega || 'mesa',
                direccion: direccion ? String(direccion).trim() : null,
                telefono: telefono ? String(telefono).trim() : null,
                metodo_pago: metodo_pago || 'efectivo',
                estado: 'pendiente'
            }
        ])
        .select();

    if (error) throw error;
    return data[0];
};

/**
 * Obtiene la lista de órdenes pendientes de preparación en cocina ordenadas por antigüedad.
 */
const obtenerOrdenesPendientes = async () => {
    const { data, error } = await supabase
        .from('ordenes')
        .select('*')
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
};

/**
 * Marca una orden como lista desde el panel de cocina.
 */
const marcarOrdenCompletada = async (idOrden) => {
    const { data, error } = await supabase
        .from('ordenes')
        .update({ estado: 'listo' })
        .eq('id', idOrden)
        .select();

    if (error) throw error;
    return data?.[0] || null;
};

/**
 * Anula una orden existente y restaura el stock de todos sus productos (incluyendo relación id_padre).
 */
const anularOrdenYRestaurarStock = async (idOrden) => {
    const { data: orden, error: findError } = await supabase
        .from('ordenes')
        .select('*')
        .eq('id', idOrden)
        .single();

    if (findError || !orden) {
        const err = new Error('Orden no encontrada');
        err.statusCode = 404;
        throw err;
    }

    if (orden.estado === 'anulado') {
        const err = new Error('Esta orden ya fue anulada');
        err.statusCode = 400;
        throw err;
    }

    const { data, error: updateError } = await supabase
        .from('ordenes')
        .update({ estado: 'anulado' })
        .eq('id', idOrden)
        .select();

    if (updateError) throw updateError;

    if (Array.isArray(orden.detalles)) {
        for (const item of orden.detalles) {
            if (item.id !== undefined && item.id !== null) {
                await ajustarStockPlato(item.id, Number(item.cantidad) || 0);
            }
        }
    }

    return data[0];
};

/**
 * Marca un pedido a domicilio como entregado.
 */
const marcarOrdenEntregada = async (idOrden) => {
    const { data, error } = await supabase
        .from('ordenes')
        .update({ estado: 'entregado' })
        .eq('id', idOrden)
        .select();

    if (error) throw error;
    return data?.[0] || null;
};

module.exports = {
    COSTO_DOMICILIO,
    calcularTotalOrden,
    ajustarStockPlato,
    procesarNuevaOrden,
    obtenerOrdenesPendientes,
    marcarOrdenCompletada,
    anularOrdenYRestaurarStock,
    marcarOrdenEntregada
};
