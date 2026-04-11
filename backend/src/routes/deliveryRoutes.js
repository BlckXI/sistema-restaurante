const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');

router.get('/pedidos', deliveryController.obtenerPedidos);
router.get('/historial', deliveryController.obtenerHistorial);

module.exports = router;