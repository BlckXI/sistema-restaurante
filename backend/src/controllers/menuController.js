const menuService = require('../services/menuService');
const { esTextoValido, esMontoPositivoValido, esEnteroNoNegativoValido } = require('../utils/validators');

const obtenerPlatos = async (req, res, next) => {
    try {
        const platos = await menuService.listarPlatos();
        return res.json(platos);
    } catch (error) {
        return next(error);
    }
};

const crearPlato = async (req, res, next) => {
    try {
        const { nombre, precio, stock, categoria, id_padre } = req.body;
        if (!esTextoValido(nombre)) {
            return res.status(400).json({ error: 'El nombre del plato solo debe contener texto' });
        }
        if (!esMontoPositivoValido(precio)) {
            return res.status(400).json({ error: 'El precio debe ser un valor positivo con máximo 2 decimales' });
        }
        if (!id_padre && !esEnteroNoNegativoValido(stock)) {
            return res.status(400).json({ error: 'El stock debe ser un número entero no negativo' });
        }

        const nuevoPlato = await menuService.crearNuevoPlato({ nombre, precio, stock, categoria, id_padre });
        if (req.io) req.io.emit('menu_actualizado');
        return res.json(nuevoPlato);
    } catch (error) {
        return next(error);
    }
};

const actualizarPlato = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nombre, precio, stock, categoria, id_padre, motivo_auditoria } = req.body;

        if (nombre !== undefined && !esTextoValido(nombre)) {
            return res.status(400).json({ error: 'El nombre del plato solo debe contener texto' });
        }
        if (precio !== undefined && !esMontoPositivoValido(precio)) {
            return res.status(400).json({ error: 'El precio debe ser un valor positivo con máximo 2 decimales' });
        }
        if (stock !== undefined && !id_padre && !esEnteroNoNegativoValido(stock)) {
            return res.status(400).json({ error: 'El stock debe ser un número entero no negativo' });
        }

        const resultado = await menuService.actualizarPlatoExistente(id, {
            nombre,
            precio,
            stock,
            categoria,
            id_padre,
            motivo_auditoria
        });
        if (req.io) req.io.emit('menu_actualizado');
        return res.json(resultado);
    } catch (error) {
        return next(error);
    }
};

const reiniciarStock = async (req, res, next) => {
    try {
        const { confirmacion } = req.body || {};
        if (confirmacion !== 'REINICIAR') {
            return res.status(400).json({ error: 'Confirmación inválida. Debe escribir REINICIAR.' });
        }

        const resultado = await menuService.reiniciarTodoElStock();
        if (req.io) req.io.emit('menu_actualizado');
        return res.json(resultado);
    } catch (error) {
        return next(error);
    }
};

const eliminarPlato = async (req, res, next) => {
    try {
        const resultado = await menuService.eliminarPlatoPorId(req.params.id);
        if (req.io) req.io.emit('menu_actualizado');
        return res.json(resultado);
    } catch (error) {
        return next(error);
    }
};

const obtenerCategorias = async (req, res, next) => {
    try {
        const categorias = await menuService.listarCategorias();
        return res.json(categorias);
    } catch (error) {
        return next(error);
    }
};

const crearCategoria = async (req, res, next) => {
    try {
        const { nombre } = req.body;
        if (!nombre || ! String(nombre).trim()) {
            return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
        }
        const categoria = await menuService.crearNuevaCategoria(nombre);
        if (req.io) req.io.emit('menu_actualizado');
        return res.json(categoria);
    } catch (error) {
        return next(error);
    }
};

const eliminarCategoria = async (req, res, next) => {
    try {
        const resultado = await menuService.eliminarCategoriaPorId(req.params.id);
        if (req.io) req.io.emit('menu_actualizado');
        return res.json(resultado);
    } catch (error) {
        return next(error);
    }
};

const obtenerInventario = async (req, res, next) => {
    try {
        const resumen = await menuService.calcularResumenInventario();
        return res.json(resumen);
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    obtenerPlatos,
    crearPlato,
    actualizarPlato,
    reiniciarStock,
    eliminarPlato,
    obtenerCategorias,
    crearCategoria,
    eliminarCategoria,
    obtenerInventario
};