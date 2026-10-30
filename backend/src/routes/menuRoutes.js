const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { requireRole } = require('../middlewares/roles');

// Platos (lectura general para Caja/Cocina y escritura protegida por rol admin)
router.get('/platos', menuController.obtenerPlatos);
router.post('/admin/platos', requireRole('admin'), menuController.crearPlato);
router.post('/admin/platos/reiniciar-stock', requireRole('admin'), menuController.reiniciarStock);
router.put('/admin/platos/:id', requireRole('admin'), menuController.actualizarPlato);
router.delete('/admin/platos/:id', requireRole('admin'), menuController.eliminarPlato);

// Categorías
router.get('/categorias', menuController.obtenerCategorias);
router.post('/categorias', requireRole('admin'), menuController.crearCategoria);
router.delete('/categorias/:id', requireRole('admin'), menuController.eliminarCategoria);

// Inventario
router.get('/inventario', menuController.obtenerInventario);

module.exports = router;