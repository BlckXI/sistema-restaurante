import { apiClient } from './config';

export const orderService = {
    createOrden: (data) => apiClient.post('/ordenes', data),
    getPendientes: () => apiClient.get('/ordenes/pendientes'),
    completarOrden: (id) => apiClient.patch(`/ordenes/${id}/completar`),
    entregarOrden: (id) => apiClient.patch(`/ordenes/${id}/entregar`),
    anularOrden: (id) => apiClient.patch(`/ordenes/${id}/anular`)
};