import axios from 'axios';

const resolverUrlBackend = () => {
    const envUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL;
    if (envUrl) {
        return envUrl.replace(/\/+$/, '');
    }

    if (typeof window !== 'undefined') {
        const { hostname, origin, port } = window.location;
        if (hostname.endsWith('.run.app') || port === '3000') {
            return origin;
        }
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }
    }

    return 'https://api-restaurante-yawj.onrender.com';
};

export const URL_BACKEND = resolverUrlBackend();

export const COSTO_DOMICILIO = 1.00;

export const apiClient = axios.create({
    baseURL: URL_BACKEND
});