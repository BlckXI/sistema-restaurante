const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { Server } = require("socket.io");
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app); 
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- UTILIDADES ---
const getFechaLocal = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' });
};

// FUNCIÓN MAESTRA DE CÁLCULO (Reutilizable)
const calcularFinanzasDia = async (fecha) => {
    const inicio = `${fecha}T00:00:00`;
    const fin = `${fecha}T23:59:59`;

    // 1. Saldo Inicial
    const { data: ultimoCierre } = await supabase.from('cierres').select('monto_final').lt('fecha', fecha).order('fecha', { ascending: false }).limit(1).single();
    const saldoInicial = ultimoCierre ? ultimoCierre.monto_final : 0;

    // 2. Datos del día
    const { data: ordenes } = await supabase.from('ordenes').select('*').gte('created_at', inicio).lte('created_at', fin);
    const { data: gastos } = await supabase.from('gastos').select('*').gte('created_at', inicio).lte('created_at', fin);
    const { data: extras } = await supabase.from('ingresos_extras').select('*').gte('created_at', inicio).lte('created_at', fin);

    let ventas = 0, tGastos = 0, tExtras = 0, anulado = 0, validas = 0;
    const conteo = {};

    ordenes.forEach(o => {
        if (o.estado === 'anulado') anulado += o.total;
        else {
            ventas += o.total; validas++;
            o.detalles.forEach(i => conteo[i.nombre] = (conteo[i.nombre] || 0) + i.cantidad);
        }
    });

    if(gastos) gastos.forEach(g => tGastos += g.monto);
    if(extras) extras.forEach(e => tExtras += e.monto);

    const dineroEnCaja = saldoInicial + ventas + tExtras - tGastos;
    
    return {
        saldoInicial, 
        ventas, 
        tGastos, 
        tExtras, 
        dineroEnCaja, 
        anulado, 
        validas, 
        conteo, 
        ordenes, 
        gastos, 
        extras 
    };
};

// --- RUTAS ---

app.get('/', (req, res) => { res.send('Servidor Restaurante V3.0 (Smart Close) 🚀'); });

app.get('/platos', async (req, res) => {
    const { data, error } = await supabase.from('platos').select('*').order('id', { ascending: true }); 
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// CREAR ORDEN
app.post('/ordenes', async (req, res) => {
    const { cliente, total, detalles, tipo_entrega, direccion, telefono, hora_programada } = req.body;
    try {
        for (const item of detalles) {
            const { data: plato } = await supabase.from('platos').select('stock, nombre, id_padre').eq('id', item.id).single();
            let stockReal = plato.stock;
            if (plato.id_padre) {
                const { data: padre } = await supabase.from('platos').select('stock').eq('id', plato.id_padre).single();
                stockReal = padre ? padre.stock : 0;
            }
            if (stockReal < item.cantidad) return res.status(400).json({ error: `Stock insuficiente de ${plato?.nombre}.` });
        }

        const hoy = getFechaLocal(); 
        const { count } = await supabase.from('ordenes').select('*', { count: 'exact', head: true }).gte('created_at', `${hoy}T00:00:00`).lte('created_at', `${hoy}T23:59:59`);
        const numeroTicket = (count || 0) + 1;

        const { data: ordenData, error: ordenError } = await supabase.from('ordenes')
            .insert([{ cliente, total, detalles, tipo_entrega, direccion, telefono, numero_diario: numeroTicket, hora_programada }]).select();
        if (ordenError) throw ordenError;

        for (const item of detalles) {
            const { data: p } = await supabase.from('platos').select('id, id_padre').eq('id', item.id).single();
            if (p) {
                const idTarget = p.id_padre || p.id;
                const { data: obj } = await supabase.from('platos').select('stock').eq('id', idTarget).single();
                if (obj) await supabase.from('platos').update({ stock: obj.stock - item.cantidad }).eq('id', idTarget);
            }
        }

        io.emit('nueva_orden', ordenData[0]);
        res.status(201).json({ message: 'Creada', orden: ordenData[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error interno" });
    }
});

// FINANZAS
app.post('/gastos', async (req, res) => {
    const { descripcion, monto } = req.body;
    if (monto <= 0) return res.status(400).json({ error: "Monto inválido" });
    const { error } = await supabase.from('gastos').insert([{ descripcion, monto }]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "OK" });
});
app.delete('/gastos/:id', async (req, res) => {
    const { error } = await supabase.from('gastos').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "OK" });
});
app.post('/ingresos-extras', async (req, res) => {
    const { descripcion, monto } = req.body;
    if (monto <= 0) return res.status(400).json({ error: "Monto inválido" });
    const { error } = await supabase.from('ingresos_extras').insert([{ descripcion, monto }]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "OK" });
});
app.delete('/ingresos-extras/:id', async (req, res) => {
    const { error } = await supabase.from('ingresos_extras').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "OK" });
});

// CONTROL
app.patch('/ordenes/:id/completar', async (req, res) => {
    const { data, error } = await supabase.from('ordenes').update({ estado: 'listo' }).eq('id', req.params.id).select();
    if (error) return res.status(500).json({ error: error.message });
    io.emit('orden_lista', data[0]); 
    res.json({ message: 'OK' });
});
app.patch('/ordenes/:id/anular', async (req, res) => {
    const id = req.params.id;
    try {
        const { data: orden } = await supabase.from('ordenes').select('*').eq('id', id).single();
        if (!orden || orden.estado === 'anulado') return res.status(400).json({ error: "Error" });

        for (const item of orden.detalles) {
            const { data: p } = await supabase.from('platos').select('id, id_padre').eq('id', item.id).single();
            if (p) {
                const idTarget = p.id_padre || p.id;
                const { data: obj } = await supabase.from('platos').select('stock').eq('id', idTarget).single();
                if(obj) await supabase.from('platos').update({ stock: obj.stock + item.cantidad }).eq('id', idTarget);
            }
        }
        await supabase.from('ordenes').update({ estado: 'anulado' }).eq('id', id);
        res.json({ message: "Anulada" });
    } catch (error) { res.status(500).json({ error: "Error" }); }
});
app.patch('/ordenes/:id/entregar', async (req, res) => {
    const { error } = await supabase.from('ordenes').update({ estado: 'entregado' }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'OK' });
});

// --- REPORTES (Usando función maestra) ---
app.get('/reportes/hoy', async (req, res) => {
    try {
        const hoy = getFechaLocal();
        const datos = await calcularFinanzasDia(hoy);

        const rankingPlatos = Object.entries(datos.conteo)
            .map(([nombre, cantidad]) => ({ nombre, cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad);

        res.json({
            saldoInicial: datos.saldoInicial.toFixed(2),
            ingresoVentas: datos.ventas.toFixed(2),
            totalGastos: datos.tGastos.toFixed(2),
            totalIngresosExtras: datos.tExtras.toFixed(2),
            dineroEnCaja: datos.dineroEnCaja.toFixed(2),
            totalAnulado: datos.anulado.toFixed(2),
            cantidadOrdenes: datos.validas,
            rankingPlatos,
            listaOrdenes: datos.ordenes,
            listaGastos: datos.gastos || [],
            listaIngresosExtras: datos.extras || []
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- CIERRE DE CAJA INTELIGENTE (LA SOLUCIÓN) ---
app.post('/cierre', async (req, res) => {
    try {
        const fecha = getFechaLocal();
        
        // 1. EL BACKEND CALCULA EL TOTAL REAL EN ESTE INSTANTE
        // (Ignoramos lo que envíe el frontend para evitar datos viejos)
        const datosReales = await calcularFinanzasDia(fecha);
        const montoReal = datosReales.dineroEnCaja;

        // 2. GUARDAMOS ESE MONTO REAL
        const { data: existe } = await supabase.from('cierres').select('*').eq('fecha', fecha).single();
        if (existe) await supabase.from('cierres').update({ monto_final: montoReal }).eq('fecha', fecha);
        else await supabase.from('cierres').insert([{ fecha, monto_final: montoReal }]);
        
        res.json({ message: "Cierre guardado", monto: montoReal });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- AUXILIARES ---
app.get('/ordenes/pendientes', async (req, res) => {
    const { data } = await supabase.from('ordenes').select('*').eq('estado', 'pendiente').order('id', { ascending: true });
    res.json(data);
});
app.get('/repartidor/pedidos', async (req, res) => {
    const { data } = await supabase.from('ordenes').select('*').eq('estado', 'listo').eq('tipo_entrega', 'domicilio').order('id', { ascending: true });
    res.json(data);
});
app.get('/repartidor/historial', async (req, res) => {
    const hoy = getFechaLocal();
    const { data } = await supabase.from('ordenes').select('*').eq('estado', 'entregado').gte('created_at', `${hoy}T00:00:00`).lte('created_at', `${hoy}T23:59:59`).order('id', { ascending: false });
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
    const { id } = req.params; const { nombre, precio, stock, categoria, id_padre } = req.body;
    const { error } = await supabase.from('platos').update({ nombre, precio, stock: id_padre ? 0 : stock, categoria, id_padre }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message }); res.json({ message: "Actualizado" });
});
app.delete('/admin/platos/:id', async (req, res) => {
    const { error } = await supabase.from('platos').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message }); res.json({ message: "Eliminado" });
});
app.get('/categorias', async (req, res) => {
    const { data } = await supabase.from('categorias').select('*').order('nombre', { ascending: true });
    res.json(data);
});
app.post('/categorias', async (req, res) => {
    const { nombre } = req.body; if (!nombre) return res.status(400).json({ error: "Requerido" });
    const { data } = await supabase.from('categorias').insert([{ nombre }]).select();
    if (error) return res.status(500).json({ error: error.message }); res.json(data[0]);
});
app.delete('/categorias/:id', async (req, res) => {
    await supabase.from('categorias').delete().eq('id', req.params.id);
    res.json({ message: "Eliminado" });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`✅ Servidor ONLINE en puerto ${PORT}`); });