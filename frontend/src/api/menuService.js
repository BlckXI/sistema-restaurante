import { apiClient } from './config';

export const menuService = {
    getPlatos: () => apiClient.get('/platos'),
    createPlato: (data) => apiClient.post('/admin/platos', data),
    updatePlato: (id, data) => apiClient.put(`/admin/platos/${id}`, data),
    deletePlato: (id) => apiClient.delete(`/admin/platos/${id}`),
    getCategorias: () => apiClient.get('/categorias'),
    createCategoria: (data) => apiClient.post('/categorias', data),
    deleteCategoria: (id) => apiClient.delete(`/categorias/${id}`)
};