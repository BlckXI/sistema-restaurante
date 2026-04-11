const supabase = require('../config/supabase');
const { getRangoDiario } = require('../utils/dateUtils');

// COLA DE PROCESAMIENTO (MUTEX)
// Obliga al servidor a procesar las órdenes una por una en estricto orden de llegada.
let colaDeOrdenes = Promise.resolve();

const crearOrden = (req, res) => {
    // Enganchamos esta nueva solicitud a la cola
    colaDeOrdenes = colaDeOrdenes.then(async () => {
        console.log('SOLICITUD POST /ordenes RECIBIDA (Procesando en Cola)');
        const { cliente, total, detalles, tipo_entrega, direccion, telefono, hora_programada, comentarios, metodo_pago } = req.body;

        try {
            // 1. Validar stock (Nadie más puede comprar mientras esto se ejecuta)
            for (const item of detalles) {
                const { data: plato } = await supabase.from('platos').select('stock, nombre, id_padre').eq('id', item.id).single();
                let stockReal = plato.stock;
                if (plato.id_padre) {
                    const { data: padre } = await supabase.from('platos').select('stock').eq('id', plato.id_padre).single();
                    stockReal = padre ? padre.stock : 0;
                }
                if (stockReal < item.cantidad) {
                    // Si la Caja 1 ya compró las sopas, la Caja 2 recibirá este error
                    return res.status(400).json({ error: `Stock insuficiente de ${plato?.nombre}. Alguien más lo acaba de comprar.` });
                }
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

            // 2. Descontar stock
            for (const item of detalles) {
                const { data: p } = await supabase.from('platos').select('id, id_padre').eq('id', item.id).single();
                if (p) {
                    const idTarget = p.id_padre || p.id;
                    const { data: obj } = await supabase.from('platos').select('stock').eq('id', idTarget).single();
                    if (obj) await supabase.from('platos').update({ stock: obj.stock - item.cantidad }).eq('id', idTarget);
                }
            }

            console.log(`ORDEN #${numeroTicket} GUARDADA EXITOSAMENTE`);
            
            // 3. Avisar a todas las pantallas
            req.io.emit('nueva_orden', ordenData[0]); 
            req.io.emit('menu_actualizado'); // ESTO ACTUALIZA EL STOCK EN LAS OTRAS CAJAS AL INSTANTE

            return res.status(201).json({ message: 'Creada', orden: ordenData[0] });
        } catch (error) {
            console.error('ERROR INTERNO:', error);
            return res.status(500).json({ error: "Error interno" });
        }
    }).catch(err => {
        console.error("Error en la cola", err);
        if (!res.headersSent) res.status(500).json({ error: "Error fatal en cola de procesamiento" });
    });
};