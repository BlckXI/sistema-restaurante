const orderService = require('../services/orderService');
const { esTextoOpcionalValido } = require('../utils/validators');

const crearOrden = async (req, res, next) => {
    try {
        const { comentarios } = req.body;
        if (!esTextoOpcionalValido(comentarios)) {
            return res.status(400).json({ error: 'Las notas para cocina solo deben contener texto (sin números ni símbolos).' });
        }

        const ordenCreada = await orderService.procesarNuevaOrden(req.body);
        if (req.io) {
            req.io.emit('nueva_orden', ordenCreada);
            req.io.emit('menu_actualizado');
        }
        return res.status(201).json({ message: 'Creada', orden: ordenCreada });
    } catch (error) {
        return next(error);
    }
};

const completarOrden = async (req, res, next) => {
    try {
        const data = await orderService.marcarOrdenLista(req.params.id);
        if (req.io && data && data.tipo_entrega === 'domicilio') {
            req.io.emit('orden_lista', data);
        }
        return res.json({ message: 'OK' });
    } catch (error) {
        return next(error);
    }
};

const anularOrden = async (req, res, next) => {
    try {
        const ordenAnulada = await orderService.anularOrdenYRestaurarStock(req.params.id);
        if (req.io) {
            req.io.emit('orden_anulada', ordenAnulada);
            req.io.emit('menu_actualizado');
        }
        return res.json({ message: 'Anulada exitosamente' });
    } catch (error) {
        return next(error);
    }
};

const entregarOrden = async (req, res, next) => {
    try {
        const resultado = await orderService.marcarOrdenEntregada(req.params.id);
        if (req.io) {
            req.io.emit('orden_entregada', resultado);
        }
        return res.status(200).json({ message: 'Orden entregada correctamente' });
    } catch (error) {
        return next(error);
    }
};

const obtenerPendientes = async (req, res, next) => {
    try {
        const pendientes = await orderService.listarOrdenesPendientesCocina();
        return res.json(pendientes);
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    crearOrden,
    completarOrden,
    anularOrden,
    entregarOrden,
    obtenerPendientes
};