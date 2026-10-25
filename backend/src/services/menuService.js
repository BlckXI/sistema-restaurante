const supabase = require('../config/supabase');

// Registro de auditoría en memoria de ejecución (evita fallos si la tabla 'platos' en Supabase no posee columnas de auditoría)
const auditoriaMemoria = new Map();

const enriquecerPlatoConAuditoria = (plato) => {
    const info = auditoriaMemoria.get(Number(plato.id));
    return {
        ...plato,
        updated_at: info?.updated_at || plato.updated_at || plato.created_at || null,
        ultimo_cambio: info?.ultimo_cambio || plato.ultimo_cambio || 'Registro en sistema'
    };
};

const listarPlatos = async () => {
    const { data, error } = await supabase.from('platos').select('*').order('id', { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []).map(enriquecerPlatoConAuditoria);
};

const crearNuevoPlato = async ({ nombre, precio, stock, categoria, id_padre }) => {
    const ahora = new Date().toISOString();
    const registro = {
        nombre: nombre.trim(),
        precio: Number(precio),
        stock: id_padre ? 0 : parseInt(stock, 10),
        categoria,
        id_padre: id_padre ? Number(id_padre) : null
    };
    const { data, error } = await supabase.from('platos').insert([registro]).select();
    if (error) throw new Error(error.message);

    const creado = data && data[0] ? data[0] : registro;
    if (creado.id !== undefined) {
        auditoriaMemoria.set(Number(creado.id), {
            updated_at: ahora,
            ultimo_cambio: 'Creación de plato'
        });
    }
    return enriquecerPlatoConAuditoria(creado);
};

const actualizarPlatoExistente = async (id, datos) => {
    const { data: platosExistentes, error: errFetch } = await supabase.from('platos').select('*').eq('id', id);
    if (errFetch) throw new Error(errFetch.message);
    const actual = platosExistentes && platosExistentes[0] ? platosExistentes[0] : {};

    const ahora = new Date().toISOString();
    let idPadreCandidato =
        datos.id_padre !== undefined ? (datos.id_padre ? Number(datos.id_padre) : null) : (actual.id_padre ? Number(actual.id_padre) : null);

    // Verificar si el plato padre existe realmente en la base de datos
    let padreExistente = null;
    if (idPadreCandidato) {
        const { data: padres } = await supabase.from('platos').select('*').eq('id', idPadreCandidato);
        padreExistente = padres && padres[0] ? padres[0] : null;
        if (!padreExistente) {
            // Si el padre fue eliminado previamente (huérfano), limpiar la referencia id_padre
            idPadreCandidato = null;
        }
    }

    // Si se solicita un ajuste de stock sobre una porción que tiene un plato padre válido, actualizar el stock del padre
    if (datos.stock !== undefined && padreExistente && datos.id_padre === undefined) {
        const nuevoStockPadre = parseInt(datos.stock, 10);
        const { error: errorPadre } = await supabase
            .from('platos')
            .update({ stock: nuevoStockPadre })
            .eq('id', padreExistente.id);
        if (errorPadre) throw new Error(errorPadre.message);

        auditoriaMemoria.set(Number(padreExistente.id), {
            updated_at: ahora,
            ultimo_cambio: datos.motivo_auditoria || `Ajuste de stock compartido: ${nuevoStockPadre}`
        });
    }

    const cambios = {
        nombre: datos.nombre !== undefined ? datos.nombre.trim() : actual.nombre,
        precio: datos.precio !== undefined ? Number(datos.precio) : actual.precio,
        stock: idPadreCandidato ? 0 : (datos.stock !== undefined ? parseInt(datos.stock, 10) : (actual.stock ?? 0)),
        categoria: datos.categoria !== undefined ? datos.categoria : actual.categoria,
        id_padre: idPadreCandidato
    };

    const { error } = await supabase.from('platos').update(cambios).eq('id', id);
    if (error) throw new Error(error.message);

    const motivo =
        datos.motivo_auditoria ||
        (datos.stock !== undefined && datos.precio === undefined
            ? `Ajuste de stock: ${datos.stock}`
            : datos.precio !== undefined && datos.stock === undefined
              ? `Ajuste de precio: $${Number(datos.precio).toFixed(2)}`
              : 'Actualización de plato');

    auditoriaMemoria.set(Number(id), {
        updated_at: ahora,
        ultimo_cambio: motivo
    });

    return {
        message: 'Actualizado',
        plato: enriquecerPlatoConAuditoria({ id: Number(id), ...cambios })
    };
};

const reiniciarTodoElStock = async (motivo = 'Reinicio diario de stock a 0') => {
    const ahora = new Date().toISOString();
    const { data: platosActuales, error: errorFetch } = await supabase.from('platos').select('*');
    if (errorFetch) throw new Error(errorFetch.message);

    const lista = platosActuales || [];
    const idsExistentes = new Set(lista.map(p => Number(p.id)));
    let platosAfectados = 0;

    for (const plato of lista) {
        const esHuerfano = plato.id_padre && !idsExistentes.has(Number(plato.id_padre));
        const tieneStock = Number(plato.stock) > 0;

        if (tieneStock || esHuerfano) {
            const payload = { stock: 0 };
            if (esHuerfano) {
                payload.id_padre = null;
            }
            const { error: errorUpdate } = await supabase
                .from('platos')
                .update(payload)
                .eq('id', plato.id);

            if (errorUpdate) throw new Error(errorUpdate.message);

            auditoriaMemoria.set(Number(plato.id), {
                updated_at: ahora,
                ultimo_cambio: motivo
            });
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
    // 1. Desvincular porciones hijas que apunten a este plato para evitar error de llave foránea o porciones huérfanas
    const { error: errorHijos } = await supabase
        .from('platos')
        .update({ id_padre: null, stock: 0 })
        .eq('id_padre', id);

    if (errorHijos) {
        console.warn(`Aviso al desvincular porciones hijas de plato ${id}:`, errorHijos.message);
    }

    // 2. Eliminar el plato solicitado
    const { error } = await supabase.from('platos').delete().eq('id', id);
    if (error) throw new Error(error.message);

    auditoriaMemoria.delete(Number(id));
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

    const lista = (platos || []).map(enriquecerPlatoConAuditoria);
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

