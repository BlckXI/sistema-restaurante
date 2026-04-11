import { apiClient } from './config';

export const deliveryService = {
    getPedidos: () => apiClient.get('/repartidor/pedidos'),
    getHistorial: () => apiClient.get('/repartidor/historial')
};