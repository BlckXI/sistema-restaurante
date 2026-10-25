const reportService = require('../services/reportService');
const { esTextoValido, esMontoPositivoValido } = require('../utils/validators');

const agregarGasto = async (req, res, next) => {
    try {
        const { descripcion, monto } = req.body;
        if (!esTextoValido(descripcion)) {
            return res.status(400).json({ error: 'La descripción solo debe contener letras y espacios' });
        }
        if (!esMontoPositivoValido(monto)) {
            return res.status(400).json({ error: 'El monto debe ser un número positivo mayor a 0' });
        }
        const resultado = await reportService.registrarGastoOperativo({ descripcion, monto });
        if (req.io) req.io.emit('reporte_actualizado');
        return res.status(201).json(resultado);
    } catch (error) {
        return next(error);
    }
};

const eliminarGasto = async (req, res, next) => {
    try {
        const resultado = await reportService.eliminarGastoPorId(req.params.id);
        if (req.io) req.io.emit('reporte_actualizado');
        return res.status(200).json(resultado);
    } catch (error) {
        return next(error);
    }
};

const agregarIngresoExtra = async (req, res, next) => {
    try {
        const { descripcion, monto } = req.body;
        if (!esTextoValido(descripcion)) {
            return res.status(400).json({ error: 'La descripción solo debe contener letras y espacios' });
        }
        if (!esMontoPositivoValido(monto)) {
            return res.status(400).json({ error: 'El monto debe ser un número positivo mayor a 0' });
        }
        const resultado = await reportService.registrarIngresoAdicional({ descripcion, monto });
        if (req.io) req.io.emit('reporte_actualizado');
        return res.status(201).json(resultado);
    } catch (error) {
        return next(error);
    }
};

const eliminarIngresoExtra = async (req, res, next) => {
    try {
        const resultado = await reportService.eliminarIngresoAdicionalPorId(req.params.id);
        if (req.io) req.io.emit('reporte_actualizado');
        return res.status(200).json(resultado);
    } catch (error) {
        return next(error);
    }
};

const obtenerReporteHoy = async (req, res, next) => {
    try {
        const { page, limit } = req.query;
        const reporte = await reportService.construirReporteHoy({ page, limit });
        return res.status(200).json(reporte);
    } catch (error) {
        return next(error);
    }
};

const obtenerMovimientosHoy = async (req, res, next) => {
    try {
        const { page, limit } = req.query;
        const resultado = await reportService.obtenerMovimientosPaginados({ page, limit });
        return res.status(200).json(resultado);
    } catch (error) {
        return next(error);
    }
};

const guardarCierre = async (req, res, next) => {
    try {
        const resultado = await reportService.registrarCierreCaja(req.body.monto);
        return res.status(200).json(resultado);
    } catch (error) {
        return next(error);
    }
};

const obtenerReportePorFecha = async (req, res, next) => {
    try {
        const reporte = await reportService.obtenerReporteDeFecha(req.query.fecha);
        return res.status(200).json(reporte);
    } catch (error) {
        return next(error);
    }
};

const obtenerConsumoPersonal = async (req, res, next) => {
    try {
        const reporte = await reportService.obtenerConsumoPersonalHoy();
        return res.status(200).json(reporte);
    } catch (error) {
        return next(error);
    }
};

const obtenerComparativa = async (req, res, next) => {
    try {
        const resultados = await reportService.obtenerComparativaDias(req.query.dias);
        return res.status(200).json(resultados);
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    agregarGasto,
    eliminarGasto,
    agregarIngresoExtra,
    eliminarIngresoExtra,
    obtenerReporteHoy,
    obtenerMovimientosHoy,
    guardarCierre,
    obtenerReportePorFecha,
    obtenerConsumoPersonal,
    obtenerComparativa
};