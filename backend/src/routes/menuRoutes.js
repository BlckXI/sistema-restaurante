const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');

// Platos
router.get('/platos', menuController.obtenerPlatos);
router.post('/admin/platos', menuController.crearPlato);
router.put('/admin/platos/:id', menuController.actualizarPlato);
router.delete('/admin/platos/:id', menuController.eliminarPlato);

// Categorías
router.get('/categorias', menuController.obtenerCategorias);
router.post('/categorias', menuController.crearCategoria);
router.delete('/categorias/:id', menuController.eliminarCategoria);

// Inventario
router.get('/inventario', menuController.obtenerInventario);

module.exports = router;