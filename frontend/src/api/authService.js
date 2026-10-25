import { apiClient } from './config';

const STORAGE_KEY = 'dlacasa_auth_session_v2';
const LEGACY_STORAGE_KEY = 'dlacasa_auth_session';
const listeners = new Set();

const notifyListeners = (session) => {
    listeners.forEach(cb => cb(session));
};

export const authService = {
    getSession: () => {
        try {
            // Eliminar cualquier sesión automática antigua que se haya guardado sin login real
            localStorage.removeItem(LEGACY_STORAGE_KEY);

            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;

            const parsed = JSON.parse(raw);
            if (
                !parsed ||
                !parsed.access_token ||
                parsed.access_token === 'local-session-token' ||
                parsed.access_token === 'session-token' ||
                !parsed.user?.email
            ) {
                localStorage.removeItem(STORAGE_KEY);
                return null;
            }
            return parsed;
        } catch {
            return null;
        }
    },

    onSessionChange: (callback) => {
        listeners.add(callback);
        return () => listeners.delete(callback);
    },

    login: async (email, password) => {
        const { data } = await apiClient.post('/auth/login', { email, password });
        if (!data || !data.session || !data.session.access_token) {
            throw new Error('No se pudo establecer una sesión válida');
        }
        const session = data.session;
        try {
            localStorage.removeItem(LEGACY_STORAGE_KEY);
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
                localStorage.removeItem(LEGACY_STORAGE_KEY);
                localStorage.removeItem(STORAGE_KEY);
            } catch {
                // Ignorar errores de limpieza
            }
            notifyListeners(null);
        }
    }
};
