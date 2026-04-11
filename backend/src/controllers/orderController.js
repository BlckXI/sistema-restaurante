const supabase = require('../config/supabase');
const { getRangoDiario } = require('../utils/dateUtils');

const crearOrden = async (req, res) => {
    console.log('📨 SOLICITUD POST /ordenes RECIBIDA');
    const { cliente, total, detalles, tipo_entrega, direccion, telefono, hora_programada, comentarios, metodo_pago } = req.body;

    try {
        // Validar stock
        for (const item of detalles) {
            const { data: plato } = await supabase.from('platos').select('stock, nombre, id_padre').eq('id', item.id).single();
            let stockReal = plato.stock;
            if (plato.id_padre) {
                const { data: padre } = await supabase.from('platos').select('stock').eq('id', plato.id_padre).single();
                stockReal = padre ? padre.stock : 0;
            }
            if (stockReal < item.cantidad) return res.status(400).json({ error: `Stock insuficiente de ${plato?.nombre}.` });
        }

        const { inicio, fin } = getRangoDiario();
        const { count: conteoDia } = await supabase.from('ordenes').select('*', { count: 'exact', head: true }).gte('created_at', inicio).lt('created_at', fin);
        const numeroTicket = (conteoDia || 0) + 1;

        const ordenParaGuardar = { 
            cliente, total, detalles, tipo_entrega, direccion, telefono, 
            numero_diario: numeroTicket, hora_programada, 
            comentarios: comentarios ? String(comentarios).trim() : '', 
            estado: 'pendiente', metodo_pago: metodo_pago || 'efectivo'
        };

        const { data: ordenData, error: ordenError } = await supabase.from('ordenes').insert([ordenParaGuardar]).select();
        if (ordenError) throw ordenError;

        // Descontar stock
        for (const item of detalles) {
            const { data: p } = await supabase.from('platos').select('id, id_padre').eq('id', item.id).single();
            if (p) {
                const idTarget = p.id_padre || p.id;
                const { data: obj } = await supabase.from('platos').select('stock').eq('id', idTarget).single();
                if (obj) await supabase.from('platos').update({ stock: obj.stock - item.cantidad }).eq('id', idTarget);
            }
        }

        console.log(`✅ ORDEN #${numeroTicket} GUARDADA EXITOSAMENTE`);
        req.io.emit('nueva_orden', ordenData[0]); 
        res.status(201).json({ message: 'Creada', orden: ordenData[0] });
    } catch (error) {
        console.error('ERROR INTERNO:', error);
        res.status(500).json({ error: "Error interno" });
    }
};

const completarOrden = async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from('ordenes').update({ estado: 'listo' }).eq('id', id).select('id, tipo_entrega, cliente').single();
    if (error) return res.status(500).json({ error: error.message });
    if (data.tipo_entrega === 'domicilio') req.io.emit('orden_lista', data); 
    res.json({ message: 'OK' });
};

const anularOrden = async (req, res) => {
    const id = req.params.id;
    try {
        const { data: orden, error: fetchError } = await supabase.from('ordenes').select('*').eq('id', id).single();
        if (fetchError || !orden || orden.estado === 'anulado') {
            return res.status(400).json({ error: "Orden no encontrada o ya anulada" });
        }

        // 🛡️ PROTECCIÓN: Si detalles viene vacío o null, usamos un arreglo vacío
        const detalles = orden.detalles || [];
        
        for (const item of detalles) {
            // Solo intentamos devolver stock si el item tiene un ID válido
            if (item.id) {
                const { data: p } = await supabase.from('platos').select('id, id_padre').eq('id', item.id).single();
                if (p) {
                    const idTarget = p.id_padre || p.id;
                    const { data: obj } = await supabase.from('platos').select('stock').eq('id', idTarget).single();
                    if(obj) {
                        await supabase.from('platos').update({ stock: obj.stock + item.cantidad }).eq('id', idTarget);
                    }
                }
            }
        }
        
        // Actualizar el estado a anulado
        const { error: updateError } = await supabase.from('ordenes').update({ estado: 'anulado' }).eq('id', id);
        if (updateError) throw updateError;

        // AVISOS DE WEBSOCKET (Sincronización en tiempo real)
        req.io.emit('orden_anulada', orden); // Para limpiar la cocina/caja
        req.io.emit('menu_actualizado');     // Para que el inventario recupere el stock visualmente

        res.json({ message: "Anulada exitosamente" });
    } catch (error) { 
        console.error("ERROR AL ANULAR ORDEN:", error);
        res.status(500).json({ error: error.message || "Error interno" }); 
    }
};

const entregarOrden = async (req, res) => {
    const { error } = await supabase.from('ordenes').update({ estado: 'entregado' }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'OK' });
};

const obtenerPendientes = async (req, res) => {
    const { data, error } = await supabase.from('ordenes').select('*').eq('estado', 'pendiente').order('numero_diario', { ascending: true }).order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
};

module.exports = { crearOrden, completarOrden, anularOrden, entregarOrden, obtenerPendientes };