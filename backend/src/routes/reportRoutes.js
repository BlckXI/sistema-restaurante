const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// Finanzas (Gastos e Ingresos Extras)
router.post('/gastos', reportController.agregarGasto);
router.delete('/gastos/:id', reportController.eliminarGasto);
router.post('/ingresos-extras', reportController.agregarIngresoExtra);
router.delete('/ingresos-extras/:id', reportController.eliminarIngresoExtra);

// Cierres, Reporte de Hoy y Movimientos Paginados
router.get('/reportes/hoy', reportController.obtenerReporteHoy);
router.get('/reportes/movimientos', reportController.obtenerMovimientosHoy);
router.post('/cierre', reportController.guardarCierre);

// Reportes Avanzados
router.get('/reportes/por-fecha', reportController.obtenerReportePorFecha);
router.get('/reportes/consumo-personal', reportController.obtenerConsumoPersonal);
router.get('/reportes/comparativa', reportController.obtenerComparativa);

module.exports = router;