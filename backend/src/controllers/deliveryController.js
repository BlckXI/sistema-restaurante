const supabase = require('../config/supabase');
const { getRangoDiario } = require('../utils/dateUtils');

const obtenerPedidos = async (req, res) => {
    const { data } = await supabase.from('ordenes')
        .select('*')
        .eq('estado', 'listo')
        .eq('tipo_entrega', 'domicilio')
        .order('id', { ascending: true });
    res.json(data);
};

const obtenerHistorial = async (req, res) => {
    const { inicio, fin } = getRangoDiario();
    const { data } = await supabase.from('ordenes')
        .select('*')
        .eq('estado', 'entregado')
        .gte('created_at', inicio)
        .lt('created_at', fin)
        .order('id', { ascending: false });
    res.json(data);
};

module.exports = { obtenerPedidos, obtenerHistorial };