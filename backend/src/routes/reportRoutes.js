const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { requireRole } = require('../middlewares/roles');

// Finanzas (Gastos e Ingresos Extras protegidos por rol admin/cajero)
router.post('/gastos', requireRole('admin', 'cajero'), reportController.agregarGasto);
router.delete('/gastos/:id', requireRole('admin'), reportController.eliminarGasto);
router.post('/ingresos-extras', requireRole('admin', 'cajero'), reportController.agregarIngresoExtra);
router.delete('/ingresos-extras/:id', requireRole('admin'), reportController.eliminarIngresoExtra);

// Cierres, Reporte de Hoy y Movimientos Paginados
router.get('/reportes/hoy', requireRole('admin', 'cajero'), reportController.obtenerReporteHoy);
router.get('/reportes/movimientos', requireRole('admin', 'cajero'), reportController.obtenerMovimientosHoy);
router.post('/cierre', requireRole('admin', 'cajero'), reportController.guardarCierre);

// Reportes Avanzados
router.get('/reportes/por-fecha', requireRole('admin', 'cajero'), reportController.obtenerReportePorFecha);
router.get('/reportes/consumo-personal', requireRole('admin', 'cajero'), reportController.obtenerConsumoPersonal);
router.get('/reportes/comparativa', requireRole('admin', 'cajero'), reportController.obtenerComparativa);

module.exports = router;