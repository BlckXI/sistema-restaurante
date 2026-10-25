const orderService = require('../services/orderService');

const obtenerPedidos = async (req, res, next) => {
    try {
        const pedidos = await orderService.listarPedidosDomicilioListos();
        return res.json(pedidos);
    } catch (error) {
        return next(error);
    }
};

const obtenerHistorial = async (req, res, next) => {
    try {
        const historial = await orderService.listarHistorialEntregasHoy();
        return res.json(historial);
    } catch (error) {
        return next(error);
    }
};

module.exports = { obtenerPedidos, obtenerHistorial };