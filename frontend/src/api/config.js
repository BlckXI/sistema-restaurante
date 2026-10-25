import axios from 'axios';

export const URL_BACKEND = import.meta.env.VITE_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

export const COSTO_DOMICILIO = 1.00;

export const apiClient = axios.create({
    baseURL: URL_BACKEND
});