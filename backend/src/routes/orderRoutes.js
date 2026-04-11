const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.post('/', orderController.crearOrden);
router.get('/pendientes', orderController.obtenerPendientes);
router.patch('/:id/completar', orderController.completarOrden);
router.patch('/:id/anular', orderController.anularOrden);
router.patch('/:id/entregar', orderController.entregarOrden);

module.exports = router;