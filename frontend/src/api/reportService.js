import { apiClient } from './config';

export const reportService = {
    getReporteHoy: () => apiClient.get('/reportes/hoy'),
    addGasto: (data) => apiClient.post('/gastos', data),
    deleteGasto: (id) => apiClient.delete(`/gastos/${id}`),
    addIngresoExtra: (data) => apiClient.post('/ingresos-extras', data),
    deleteIngresoExtra: (id) => apiClient.delete(`/ingresos-extras/${id}`),
    cerrarCaja: (data) => apiClient.post('/cierre', data)
};