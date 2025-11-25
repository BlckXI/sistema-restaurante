const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { Server } = require("socket.io");
const http = require('http');
require('dotenv').config();

// 2. CONFIGURACIÓN INICIAL
const app = express();
const server = http.createServer(app); 
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// 3. CONEXIÓN A BASE DE DATOS SUPABASE
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- FUNCIÓN PARA OBTENER FECHA LOCAL (CRUCIAL PARA EL REINICIO DIARIO) ---
const getFechaLocal = () => {
    // Esto fuerza la fecha a la zona horaria de El Salvador (UTC-6)
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' });
};

// --- RUTAS BÁSICAS ---
app.get('/', (req, res) => { res.send('Servidor Restaurante Activo 🚀'); });

app.get('/platos', async (req, res) => {
    const { data, error } = await supabase.from('platos').select('*').order('id', { ascending: true }); 
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// --- CREAR ORDEN (Completa: Ticket, Hora, Stock Padre/Hijo) ---
app.post('/ordenes', async (req, res) => {
    const { cliente, total, detalles, tipo_entrega, direccion, telefono, hora_programada } = req.body;

    try {
        // 1. Validar Stock (Visual)
        for (const item of detalles) {
            const { data: plato } = await supabase.from('platos').select('stock, nombre, id_padre').eq('id', item.id).single();
            
            // Si tiene padre, verificamos el stock del padre
            let stockDisponible = plato.stock;
            if (plato.id_padre) {
                const { data: padre } = await supabase.from('platos').select('stock').eq('id', plato.id_padre).single();
                stockDisponible = padre ? padre.stock : 0;
            }

            if (stockDisponible < item.cantidad) {
                return res.status(400).json({ error: `Stock insuficiente de ${plato?.nombre}.` });
            }
        }

        // 2. Ticket Diario
        const hoy = getFechaLocal(); 
        const { count } = await supabase
            .from('ordenes')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', `${hoy}T00:00:00`)
            .lte('created_at', `${hoy}T23:59:59`);
        
        const numeroTicket = (count || 0) + 1;

        // 3. Guardar Orden
        const { data: ordenData, error: ordenError } = await supabase
            .from('ordenes')
            .insert([{ 
                cliente, total, detalles, tipo_entrega, direccion, telefono, 
                numero_diario: numeroTicket, hora_programada
            }])
            .select();

        if (ordenError) throw ordenError;
        if (!ordenData || ordenData.length === 0) throw new Error("Error al guardar orden");

        // 4. Restar Inventario (Lógica Padre/Hijo)
        for (const item of detalles) {
            const { data: platoVendido } = await supabase.from('platos').select('id, id_padre').eq('id', item.id).single();
            
            if (platoVendido) {
                // Si tiene padre, descontamos al padre. Si no, a sí mismo.
                const idParaDescontar = platoVendido.id_padre || platoVendido.id;
                const { data: objetivo } = await supabase.from('platos').select('stock').eq('id', idParaDescontar).single();
                
                if (objetivo) {
                    await supabase.from('platos')
                        .update({ stock: objetivo.stock - item.cantidad })
                        .eq('id', idParaDescontar);
                }
            }
        }

        // 5. Avisar a todos
        io.emit('nueva_orden', ordenData[0]);
        res.status(201).json({ message: 'Orden creada', orden: ordenData[0] });

    } catch (error) {
        console.error("Error:", error);
        if (error.message && error.message.includes('stock_positivo')) return res.status(400).json({ error: "Stock insuficiente" });
        res.status(500).json({ error: "Error interno" });
    }
});

// --- FINANZAS ---
app.post('/gastos', async (req, res) => {
    const { descripcion, monto } = req.body;
    if (!descripcion || !monto || monto <= 0) return res.status(400).json({ error: "Datos inválidos" });
    const { error } = await supabase.from('gastos').insert([{ descripcion, monto }]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Gasto registrado" });
});

app.delete('/gastos/:id', async (req, res) => {
    const { id } = req.params; const { error } = await supabase.from('gastos').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message }); res.json({ message: "Eliminado" });
});

app.post('/ingresos-extras', async (req, res) => {
    const { descripcion, monto } = req.body;
    if (!descripcion || !monto || monto <= 0) return res.status(400).json({ error: "Datos inválidos" });
    const { error } = await supabase.from('ingresos_extras').insert([{ descripcion, monto }]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Ingreso registrado" });
});

app.delete('/ingresos-extras/:id', async (req, res) => {
    const { id } = req.params; const { error } = await supabase.from('ingresos_extras').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message }); res.json({ message: "Eliminado" });
});

// --- CONTROL ORDENES ---
app.patch('/ordenes/:id/completar', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from('ordenes').update({ estado: 'listo' }).eq('id', id).select();
    if (error) return res.status(500).json({ error: error.message });
    io.emit('orden_lista', data[0]); 
    res.json({ message: 'Orden lista' });
});

app.patch('/ordenes/:id/anular', async (req, res) => {
    const { id } = req.params;
    try {
        const { data: orden } = await supabase.from('ordenes').select('*').eq('id', id).single();
        if (!orden) return res.status(404).json({ error: "No encontrada" });
        if (orden.estado === 'anulado') return res.status(400).json({ error: "Ya anulada" });

        // Devolver stock (considerando padre/hijo)
        for (const item of orden.detalles) {
            const { data: plato } = await supabase.from('platos').select('id, id_padre').eq('id', item.id).single();
            if (plato) {
                const idRestaurar = plato.id_padre || plato.id;
                const { data: objetivo } = await supabase.from('platos').select('stock').eq('id', idRestaurar).single();
                if(objetivo) {
                    await supabase.from('platos').update({ stock: objetivo.stock + item.cantidad }).eq('id', idRestaurar);
                }
            }
        }
        await supabase.from('ordenes').update({ estado: 'anulado' }).eq('id', id);
        res.json({ message: "Anulada" });
    } catch (error) { res.status(500).json({ error: "Error al anular" }); }
});

app.patch('/ordenes/:id/entregar', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('ordenes').update({ estado: 'entregado' }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Entregado' });
});

// --- REPORTES ---
app.get('/reportes/hoy', async (req, res) => {
    const hoy = getFechaLocal();
    
    const { data: ultimoCierre } = await supabase.from('cierres').select('monto_final').lt('fecha', hoy).order('fecha', { ascending: false }).limit(1).single();
    const saldoInicial = ultimoCierre ? ultimoCierre.monto_final : 0;

    const inicioDia = `${hoy}T00:00:00`;
    const finDia = `${hoy}T23:59:59`;

    const { data: ordenes } = await supabase.from('ordenes').select('*').gte('created_at', inicioDia).lte('created_at', finDia).order('id', { ascending: false });
    const { data: gastos } = await supabase.from('gastos').select('*').gte('created_at', inicioDia).lte('created_at', finDia).order('id', { ascending: false });
    const { data: ingresosExtras } = await supabase.from('ingresos_extras').select('*').gte('created_at', inicioDia).lte('created_at', finDia).order('id', { ascending: false });

    let ingresoVentas = 0, totalGastos = 0, totalIngresosExtras = 0, totalAnulado = 0, ordenesValidas = 0;
    const conteoPlatos = {};

    ordenes.forEach(orden => {
        if (orden.estado === 'anulado') totalAnulado += orden.total;
        else {
            ingresoVentas += orden.total;
            ordenesValidas++;
            orden.detalles.forEach(item => {
                conteoPlatos[item.nombre] = (conteoPlatos[item.nombre] || 0) + item.cantidad;
            });
        }
    });

    if(gastos) gastos.forEach(g => totalGastos += g.monto);
    if(ingresosExtras) ingresosExtras.forEach(i => totalIngresosExtras += i.monto);

    const dineroEnCaja = saldoInicial + ingresoVentas + totalIngresosExtras - totalGastos;
    const rankingPlatos = Object.entries(conteoPlatos).map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad);

    res.json({
        saldoInicial: saldoInicial.toFixed(2),
        ingresoVentas: ingresoVentas.toFixed(2),
        totalGastos: totalGastos.toFixed(2),
        totalIngresosExtras: totalIngresosExtras.toFixed(2),
        dineroEnCaja: dineroEnCaja.toFixed(2),
        totalAnulado: totalAnulado.toFixed(2),
        cantidadOrdenes: ordenesValidas,
        rankingPlatos,
        listaOrdenes: ordenes,
        listaGastos: gastos || [],
        listaIngresosExtras: ingresosExtras || []
    });
});

app.post('/cierre', async (req, res) => {
    const { monto } = req.body;
    const fecha = getFechaLocal();
    const { data: existe } = await supabase.from('cierres').select('*').eq('fecha', fecha).single();
    
    let error;
    if (existe) error = (await supabase.from('cierres').update({ monto_final: monto }).eq('fecha', fecha)).error;
    else error = (await supabase.from('cierres').insert([{ fecha, monto_final: monto }])).error;
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Cierre guardado" });
});

// --- OTROS ---
app.get('/ordenes/pendientes', async (req, res) => {
    const { data, error } = await supabase.from('ordenes').select('*').eq('estado', 'pendiente').order('id', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/repartidor/pedidos', async (req, res) => {
    const { data, error } = await supabase.from('ordenes').select('*').eq('estado', 'listo').eq('tipo_entrega', 'domicilio').order('id', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/repartidor/historial', async (req, res) => {
    const hoy = getFechaLocal();
    const { data, error } = await supabase.from('ordenes').select('*').eq('estado', 'entregado').gte('created_at', `${hoy}T00:00:00`).lte('created_at', `${hoy}T23:59:59`).order('id', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// --- ADMIN ---
app.post('/admin/platos', async (req, res) => {
    const { nombre, precio, stock, categoria, id_padre } = req.body;
    if (!nombre || precio < 0 || (!id_padre && stock < 0) || !categoria) return res.status(400).json({ error: "Datos inválidos" });
    const { data, error } = await supabase.from('platos').insert([{ nombre, precio, stock: id_padre ? 0 : stock, categoria, id_padre }]).select();
    if (error) return res.status(500).json({ error: error.message }); res.json(data[0]);
});

app.put('/admin/platos/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, precio, stock, categoria, id_padre } = req.body;
    const { error } = await supabase.from('platos').update({ nombre, precio, stock: id_padre ? 0 : stock, categoria, id_padre }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message }); res.json({ message: "Actualizado" });
});

app.delete('/admin/platos/:id', async (req, res) => {
    const { id } = req.params; const { error } = await supabase.from('platos').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message }); res.json({ message: "Eliminado" });
});

app.get('/categorias', async (req, res) => {
    const { data, error } = await supabase.from('categorias').select('*').order('nombre', { ascending: true });
    if (error) return res.status(500).json({ error: error.message }); res.json(data);
});

app.post('/categorias', async (req, res) => {
    const { nombre } = req.body; if (!nombre) return res.status(400).json({ error: "Requerido" });
    const { data, error } = await supabase.from('categorias').insert([{ nombre }]).select();
    if (error) return res.status(500).json({ error: error.message }); res.json(data[0]);
});

app.delete('/categorias/:id', async (req, res) => {
    const { id } = req.params; const { error } = await supabase.from('categorias').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message }); res.json({ message: "Eliminado" });
});

// 5. ENCENDER
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`✅ Servidor corriendo en http://localhost:${PORT}`); });