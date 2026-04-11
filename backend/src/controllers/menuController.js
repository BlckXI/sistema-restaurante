const supabase = require('../config/supabase');

const obtenerPlatos = async (req, res) => {
    const { data, error } = await supabase.from('platos').select('*').order('id', { ascending: true }); 
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
};

const crearPlato = async (req, res) => {
    const { nombre, precio, stock, categoria, id_padre } = req.body;
    const { data, error } = await supabase.from('platos').insert([{ nombre, precio, stock: id_padre ? 0 : stock, categoria, id_padre }]).select();
    if (error) return res.status(500).json({ error: error.message }); 
    req.io.emit('menu_actualizado'); // AVISO DE WEBSOCKET
    res.json(data[0]);
};

const actualizarPlato = async (req, res) => {
    const { id } = req.params; 
    const { nombre, precio, stock, categoria, id_padre } = req.body;
    const { error } = await supabase.from('platos').update({ nombre, precio, stock: id_padre ? 0 : stock, categoria, id_padre }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message }); 
    req.io.emit('menu_actualizado'); // AVISO DE WEBSOCKET
    res.json({ message: "Actualizado" });
};

const eliminarPlato = async (req, res) => {
    const { error } = await supabase.from('platos').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message }); 
    req.io.emit('menu_actualizado'); // AVISO DE WEBSOCKET
    res.json({ message: "Eliminado" });
};

const obtenerCategorias = async (req, res) => {
    const { data, error } = await supabase.from('categorias').select('*').order('nombre', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
};

const crearCategoria = async (req, res) => {
    const { nombre } = req.body;
    const { data, error } = await supabase.from('categorias').insert([{ nombre }]).select();
    if (error) return res.status(500).json({ error: error.message }); 
    req.io.emit('menu_actualizado'); // AVISO DE WEBSOCKET
    res.json(data[0]);
};

const eliminarCategoria = async (req, res) => {
    const { error } = await supabase.from('categorias').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    req.io.emit('menu_actualizado'); // AVISO DE WEBSOCKET
    res.json({ message: "Eliminado" });
};

const obtenerInventario = async (req, res) => {
    try {
        const { data: platos, error } = await supabase.from('platos').select('*').order('categoria', { ascending: true });
        if (error) throw error;

        const platosPrincipales = platos.filter(p => !p.id_padre);
        const porciones = platos.filter(p => p.id_padre);

        const platosConAlerta = platosPrincipales.map(plato => ({
            ...plato,
            alerta: plato.stock < 5 ? 'CRÍTICO' : plato.stock < 10 ? 'BAJO' : 'NORMAL'
        }));

        res.json({
            platos: platosConAlerta,
            porciones,
            totalPlatos: platosPrincipales.length,
            totalPorciones: porciones.length,
            stockBajo: platosConAlerta.filter(p => p.stock < 10).length,
            stockCritico: platosConAlerta.filter(p => p.stock < 5).length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    obtenerPlatos, crearPlato, actualizarPlato, eliminarPlato,
    obtenerCategorias, crearCategoria, eliminarCategoria, obtenerInventario
};