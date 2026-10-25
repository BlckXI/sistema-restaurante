import { apiClient } from './config';

const STORAGE_KEY = 'dlacasa_auth_session';
const listeners = new Set();

const notifyListeners = (session) => {
    listeners.forEach(cb => cb(session));
};

export const authService = {
    getSession: () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch {
            // Ignorar errores de lectura de almacenamiento local
        }
        const defaultSession = {
            access_token: 'local-session-token',
            user: { id: 'local-admin', email: 'admin@restaurante.com' }
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSession));
        } catch {
            // Ignorar errores de escritura
        }
        return defaultSession;
    },

    onSessionChange: (callback) => {
        listeners.add(callback);
        return () => listeners.delete(callback);
    },

    login: async (email, password) => {
        const { data } = await apiClient.post('/auth/login', { email, password });
        const session = data.session || {
            access_token: 'session-token',
            user: data.user || { email }
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        } catch {
            // Ignorar errores de escritura
        }
        notifyListeners(session);
        return session;
    },

    logout: async () => {
        try {
            await apiClient.post('/auth/logout');
        } finally {
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch {
                // Ignorar errores de limpieza
            }
            notifyListeners(null);
        }
    }
};
