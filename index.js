const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { Server } = require("socket.io");
const http = require('http');
require('dotenv').config();

// 2. CONFIGURACIÓN INICIAL
const app = express();
const server = http.createServer(app); 
const io = new Server(server, {
    cors: { origin: "*" } 
});

// Middleware
app.use(cors());
app.use(express.json());

// 3. CONEXIÓN A BASE DE DATOS SUPABASE
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 4. RUTAS (Endpoints)

// RUTA A: Verificar
app.get('/', (req, res) => {
    res.send('Servidor del Restaurante Funcionando 🚀');
});

// RUTA B: Obtener el Menú
app.get('/platos', async (req, res) => {
    const { data, error } = await supabase
        .from('platos')
        .select('*')
        .order('id', { ascending: true }); 

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// RUTA C: Crear Orden
app.post('/ordenes', async (req, res) => {
    const { cliente, total, detalles, tipo_entrega, direccion, telefono, hora_programada } = req.body;

    try {
        // 1. Validar Stock
        for (const item of detalles) {
            const { data: plato } = await supabase
                .from('platos')
                .select('stock, nombre')
                .eq('id', item.id)
                .single();
            
            if (!plato || plato.stock < item.cantidad) {
                return res.status(400).json({ 
                    error: `No hay suficiente stock de ${plato?.nombre || 'un producto'}. Solo quedan ${plato?.stock || 0}.` 
                });
            }
        }

        // 2. Calcular Número de Ticket Diario
        const hoy = new Date().toISOString().split('T')[0];
        const { count } = await supabase
            .from('ordenes')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', `${hoy}T00:00:00`)
            .lte('created_at', `${hoy}T23:59:59`);
        
        const numeroTicket = (count || 0) + 1;

        // 3. Crear la orden
        const { data: ordenData, error: ordenError } = await supabase
            .from('ordenes')
            .insert([{ 
                cliente, total, detalles, tipo_entrega, direccion, telefono, 
                numero_diario: numeroTicket, hora_programada
            }])
            .select();

        if (ordenError) throw ordenError;
        if (!ordenData || ordenData.length === 0) throw new Error("Error al recuperar la orden creada");

        // 4. Restar Inventario
        for (const item of detalles) {
            const { data: platoActual } = await supabase.from('platos').select('stock').eq('id', item.id).single();
            if (platoActual) {
                await supabase.from('platos')
                    .update({ stock: platoActual.stock - item.cantidad })
                    .eq('id', item.id);
            }
        }

        // 5. Avisar a todos
        io.emit('nueva_orden', ordenData[0]);
        res.status(201).json({ message: 'Orden creada', orden: ordenData[0] });

    } catch (error) {
        console.error("Error procesando orden:", error);
        if (error.message && error.message.includes('stock_positivo')) {
             return res.status(400).json({ error: "Stock insuficiente" });
        }
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// --- RUTAS DE GASTOS ---
app.post('/gastos', async (req, res) => {
    const { descripcion, monto } = req.body;
    if (!descripcion || !monto || monto <= 0) return res.status(400).json({ error: "Datos inválidos" });

    const { error } = await supabase.from('gastos').insert([{ descripcion, monto }]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Gasto registrado" });
});

app.delete('/gastos/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('gastos').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Gasto eliminado" });
});

// --- RUTAS DE INGRESOS EXTRAS (NUEVO) ---
app.post('/ingresos-extras', async (req, res) => {
    const { descripcion, monto } = req.body;
    if (!descripcion || !monto || monto <= 0) return res.status(400).json({ error: "Datos inválidos" });

    const { error } = await supabase.from('ingresos_extras').insert([{ descripcion, monto }]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Ingreso extra registrado" });
});

app.delete('/ingresos-extras/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('ingresos_extras').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Ingreso extra eliminado" });
});

// --- CONTROL DE ORDENES ---
app.patch('/ordenes/:id/completar', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from('ordenes').update({ estado: 'listo' }).eq('id', id).select();
    if (error) return res.status(500).json({ error: error.message });
    io.emit('orden_lista', data[0]); 
    res.json({ message: 'Orden completada' });
});

app.patch('/ordenes/:id/anular', async (req, res) => {
    const { id } = req.params;
    try {
        const { data: orden, error: errorOrden } = await supabase.from('ordenes').select('*').eq('id', id).single();
        if (errorOrden || !orden) return res.status(404).json({ error: "No encontrada" });
        if (orden.estado === 'anulado') return res.status(400).json({ error: "Ya anulada" });

        for (const item of orden.detalles) {
            const { data: plato } = await supabase.from('platos').select('stock').eq('id', item.id).single();
            if (plato) {
                await supabase.from('platos').update({ stock: plato.stock + item.cantidad }).eq('id', item.id);
            }
        }
        const { error: updateError } = await supabase.from('ordenes').update({ estado: 'anulado' }).eq('id', id);
        if (updateError) throw updateError;
        res.json({ message: "Anulada" });
    } catch (error) { res.status(500).json({ error: "Error al anular" }); }
});

// --- REPORTE FINANCIERO COMPLETO ---
app.get('/reportes/hoy', async (req, res) => {
    const hoy = new Date().toISOString().split('T')[0];
    
    // 1. Saldo Inicial
    const { data: ultimoCierre } = await supabase
        .from('cierres').select('monto_final').lt('fecha', hoy).order('fecha', { ascending: false }).limit(1).single();
    const saldoInicial = ultimoCierre ? ultimoCierre.monto_final : 0;

    // 2. Ordenes
    const { data: ordenes } = await supabase
        .from('ordenes').select('*').gte('created_at', `${hoy}T00:00:00`).lte('created_at', `${hoy}T23:59:59`).order('id', { ascending: false });

    // 3. Gastos
    const { data: gastos } = await supabase
        .from('gastos').select('*').gte('created_at', `${hoy}T00:00:00`).lte('created_at', `${hoy}T23:59:59`).order('id', { ascending: false });

    // 4. Ingresos Extras (NUEVO)
    const { data: ingresosExtras } = await supabase
        .from('ingresos_extras').select('*').gte('created_at', `${hoy}T00:00:00`).lte('created_at', `${hoy}T23:59:59`).order('id', { ascending: false });

    let ingresoVentas = 0;
    let totalGastos = 0;
    let totalIngresosExtras = 0; // Nuevo acumulador
    let totalAnulado = 0;
    let ordenesValidas = 0;
    const conteoPlatos = {};

    ordenes.forEach(orden => {
        if (orden.estado === 'anulado') {
            totalAnulado += orden.total;
        } else {
            ingresoVentas += orden.total;
            ordenesValidas++;
            orden.detalles.forEach(item => {
                conteoPlatos[item.nombre] = (conteoPlatos[item.nombre] || 0) + item.cantidad;
            });
        }
    });

    if(gastos) gastos.forEach(g => totalGastos += g.monto);
    if(ingresosExtras) ingresosExtras.forEach(i => totalIngresosExtras += i.monto); // Sumamos extras

    // FÓRMULA MAESTRA ACTUALIZADA: 
    // Saldo Ayer + Ventas Comida + Ingresos Extras - Gastos
    const dineroEnCaja = saldoInicial + ingresoVentas + totalIngresosExtras - totalGastos;

    const rankingPlatos = Object.entries(conteoPlatos)
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad);

    res.json({
        saldoInicial: saldoInicial.toFixed(2),
        ingresoVentas: ingresoVentas.toFixed(2),
        totalGastos: totalGastos.toFixed(2),
        totalIngresosExtras: totalIngresosExtras.toFixed(2), // Enviamos al frontend
        dineroEnCaja: dineroEnCaja.toFixed(2),
        totalAnulado: totalAnulado.toFixed(2),
        cantidadOrdenes: ordenesValidas,
        rankingPlatos,
        listaOrdenes: ordenes,
        listaGastos: gastos || [],
        listaIngresosExtras: ingresosExtras || [] // Enviamos lista
    });
});

// RUTA CIERRE
app.post('/cierre', async (req, res) => {
    const { fecha, monto } = req.body;
    const { data: existe } = await supabase.from('cierres').select('*').eq('fecha', fecha).single();
    let error;
    if (existe) {
        const { error: err } = await supabase.from('cierres').update({ monto_final: monto }).eq('fecha', fecha);
        error = err;
    } else {
        const { error: err } = await supabase.from('cierres').insert([{ fecha, monto_final: monto }]);
        error = err;
    }
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Cierre guardado" });
});

// REPARTIDOR Y OTROS
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
    const hoy = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.from('ordenes').select('*').eq('estado', 'entregado').gte('created_at', `${hoy}T00:00:00`).lte('created_at', `${hoy}T23:59:59`).order('id', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.patch('/ordenes/:id/entregar', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('ordenes').update({ estado: 'entregado' }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Entrega registrada' });
});

// ADMINISTRACIÓN
app.post('/admin/platos', async (req, res) => {
    const { nombre, precio, stock, categoria } = req.body;
    if (!nombre || precio < 0 || stock < 0 || !categoria) return res.status(400).json({ error: "Datos inválidos" });
    const { data, error } = await supabase.from('platos').insert([{ nombre, precio, stock, categoria }]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});
app.delete('/admin/platos/:id', async (req, res) => {
    const { id } = req.params; const { error } = await supabase.from('platos').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message }); res.json({ message: "Eliminado" });
});
app.put('/admin/platos/:id', async (req, res) => {
    const { id } = req.params; const { nombre, precio, stock, categoria } = req.body;
    const { error } = await supabase.from('platos').update({ nombre, precio, stock, categoria }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message }); res.json({ message: "Actualizado" });
});
app.get('/categorias', async (req, res) => {
    const { data, error } = await supabase.from('categorias').select('*').order('nombre', { ascending: true });
    if (error) return res.status(500).json({ error: error.message }); res.json(data);
});
app.post('/categorias', async (req, res) => {
    const { nombre } = req.body; if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
    const { data, error } = await supabase.from('categorias').insert([{ nombre }]).select();
    if (error) return res.status(500).json({ error: error.message }); res.json(data[0]);
});
app.delete('/categorias/:id', async (req, res) => {
    const { id } = req.params; const { error } = await supabase.from('categorias').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message }); res.json({ message: "Eliminado" });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`✅ Servidor corriendo en http://localhost:${PORT}`); });