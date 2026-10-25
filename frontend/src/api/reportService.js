import { apiClient } from './config';

export const reportService = {
    getReporteHoy: (params = {}) => apiClient.get('/reportes/hoy', { params }),
    getMovimientosPaginados: (page = 1, limit = 10) =>
        apiClient.get('/reportes/movimientos', { params: { page, limit } }),
    addGasto: (data) => apiClient.post('/gastos', data),
    deleteGasto: (id) => apiClient.delete(`/gastos/${id}`),
    addIngresoExtra: (data) => apiClient.post('/ingresos-extras', data),
    deleteIngresoExtra: (id) => apiClient.delete(`/ingresos-extras/${id}`),
    cerrarCaja: (data) => apiClient.post('/cierre', data)
};