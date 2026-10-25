import axios from 'axios';

export const AUTH_STORAGE_KEY = 'dlacasa_auth_session_v2';
export const LEGACY_AUTH_STORAGE_KEY = 'dlacasa_auth_session';

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

// Adjuntar automáticamente el token de sesión activo en cada petición al backend
apiClient.interceptors.request.use((config) => {
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (raw) {
            const session = JSON.parse(raw);
            if (session?.access_token) {
                config.headers.Authorization = `Bearer ${session.access_token}`;
            }
            if (session?.refresh_token) {
                config.headers['X-Refresh-Token'] = session.refresh_token;
            }
        }
    } catch {
        // Ignorar errores de lectura de localStorage
    }
    return config;
});

// Sincronizar tokens renovados por el backend y manejar expiración de sesión (401)
apiClient.interceptors.response.use(
    (response) => {
        try {
            const newAccessToken = response?.headers?.['x-access-token'];
            const newRefreshToken = response?.headers?.['x-refresh-token'];
            if (newAccessToken) {
                const raw = localStorage.getItem(AUTH_STORAGE_KEY);
                if (raw) {
                    const currentSession = JSON.parse(raw);
                    const updatedSession = {
                        ...currentSession,
                        access_token: newAccessToken,
                        refresh_token: newRefreshToken || currentSession.refresh_token
                    };
                    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedSession));
                }
            }
        } catch {
            // Ignorar errores de actualización de localStorage
        }
        return response;
    },
    (error) => {
        const status = error?.response?.status;
        const url = error?.config?.url || '';
        const isAuthRequest = url.includes('/auth/login') || url.includes('/auth/logout');
        if (status === 401 && !isAuthRequest) {
            try {
                localStorage.removeItem(AUTH_STORAGE_KEY);
                localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
                window.dispatchEvent(new Event('dlacasa_force_logout'));
            } catch {
                // Ignorar errores de limpieza
            }
        }
        return Promise.reject(error);
    }
);