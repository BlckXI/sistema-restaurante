const supabase = require('../config/supabase');

const listarPlatos = async () => {
    const { data, error } = await supabase.from('platos').select('*').order('id', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
};

const crearNuevoPlato = async ({ nombre, precio, stock, categoria, id_padre }) => {
    const ahora = new Date().toISOString();
    const registro = {
        nombre: nombre.trim(),
        precio: Number(precio),
        stock: id_padre ? 0 : parseInt(stock, 10),
        categoria,
        id_padre: id_padre || null,
        updated_at: ahora,
        ultimo_cambio: 'Creación de plato'
    };
    const { data, error } = await supabase.from('platos').insert([registro]).select();
    if (error) throw new Error(error.message);
    return data[0];
};

const actualizarPlatoExistente = async (id, datos) => {
    const { data: platosExistentes } = await supabase.from('platos').select('*').eq('id', id);
    const actual = platosExistentes && platosExistentes[0] ? platosExistentes[0] : {};

    const ahora = new Date().toISOString();
    const cambios = {
        nombre: datos.nombre !== undefined ? datos.nombre.trim() : actual.nombre,
        precio: datos.precio !== undefined ? Number(datos.precio) : actual.precio,
        stock: datos.id_padre ? 0 : (datos.stock !== undefined ? parseInt(datos.stock, 10) : actual.stock),
        categoria: datos.categoria !== undefined ? datos.categoria : actual.categoria,
        id_padre: datos.id_padre !== undefined ? (datos.id_padre || null) : (actual.id_padre || null),
        updated_at: ahora,
        ultimo_cambio: datos.motivo_auditoria || (datos.stock !== undefined && datos.precio === undefined ? `Ajuste de stock: ${datos.stock}` : (datos.precio !== undefined && datos.stock === undefined ? `Ajuste de precio: $${Number(datos.precio).toFixed(2)}` : 'Actualización de plato'))
    };
    const { error } = await supabase.from('platos').update(cambios).eq('id', id);
    if (error) throw new Error(error.message);
    return { message: 'Actualizado', plato: { id, ...cambios } };
};

const reiniciarTodoElStock = async (motivo = 'Reinicio diario de stock a 0') => {
    const ahora = new Date().toISOString();
    const { data: platosActuales, error: errorFetch } = await supabase.from('platos').select('*');
    if (errorFetch) throw new Error(errorFetch.message);

    const lista = platosActuales || [];
    let platosAfectados = 0;

    for (const plato of lista) {
        if (!plato.id_padre) {
            await supabase.from('platos').update({
                stock: 0,
                updated_at: ahora,
                ultimo_cambio: motivo
            }).eq('id', plato.id);
            platosAfectados++;
        }
    }

    return {
        message: 'Stock reiniciado a 0 exitosamente',
        platosAfectados,
        fecha: ahora
    };
};

const eliminarPlatoPorId = async (id) => {
    const { error } = await supabase.from('platos').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { message: 'Eliminado' };
};

const listarCategorias = async () => {
    const { data, error } = await supabase.from('categorias').select('*').order('nombre', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
};

const crearNuevaCategoria = async (nombre) => {
    const { data, error } = await supabase.from('categorias').insert([{ nombre: nombre.trim() }]).select();
    if (error) throw new Error(error.message);
    return data[0];
};

const eliminarCategoriaPorId = async (id) => {
    const { error } = await supabase.from('categorias').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { message: 'Eliminado' };
};

const calcularResumenInventario = async () => {
    const { data: platos, error } = await supabase.from('platos').select('*').order('categoria', { ascending: true });
    if (error) throw new Error(error.message);

    const lista = platos || [];
    const platosPrincipales = lista.filter(p => !p.id_padre);
    const porciones = lista.filter(p => p.id_padre);

    const platosConAlerta = platosPrincipales.map(plato => ({
        ...plato,
        alerta: plato.stock === 0 ? 'AGOTADO' : plato.stock < 5 ? 'BAJO' : 'NORMAL'
    }));

    return {
        platos: platosConAlerta,
        porciones,
        totalPlatos: platosPrincipales.length,
        totalPorciones: porciones.length,
        agotados: platosConAlerta.filter(p => p.stock === 0).length,
        stockBajo: platosConAlerta.filter(p => p.stock > 0 && p.stock < 5).length,
        disponibles: platosConAlerta.filter(p => p.stock >= 5).length
    };
};

module.exports = {
    listarPlatos,
    crearNuevoPlato,
    actualizarPlatoExistente,
    reiniciarTodoElStock,
    eliminarPlatoPorId,
    listarCategorias,
    crearNuevaCategoria,
    eliminarCategoriaPorId,
    calcularResumenInventario
};

