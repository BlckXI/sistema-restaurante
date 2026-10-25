import { apiClient, AUTH_STORAGE_KEY, LEGACY_AUTH_STORAGE_KEY } from './config';

const listeners = new Set();

const notifyListeners = (session) => {
    listeners.forEach(cb => cb(session));
};

if (typeof window !== 'undefined') {
    window.addEventListener('dlacasa_force_logout', () => {
        notifyListeners(null);
    });
}

export const authService = {
    getSession: () => {
        try {
            localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);

            const raw = localStorage.getItem(AUTH_STORAGE_KEY);
            if (!raw) return null;

            const parsed = JSON.parse(raw);
            if (
                !parsed ||
                !parsed.access_token ||
                parsed.access_token === 'local-session-token' ||
                parsed.access_token === 'session-token' ||
                !parsed.user?.email
            ) {
                localStorage.removeItem(AUTH_STORAGE_KEY);
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
            localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
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
                localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
                localStorage.removeItem(AUTH_STORAGE_KEY);
            } catch {
                // Ignorar errores de limpieza
            }
            notifyListeners(null);
        }
    }
};
