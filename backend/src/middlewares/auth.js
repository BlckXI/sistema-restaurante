const supabase = require('../config/supabase');

const TOKENS_LOCALES_INVALIDOS = new Set([
    'local-session-token',
    'session-token',
    'mock-session-token',
    'null',
    'undefined'
]);

/**
 * Verifica si un token JWT tiene estructura válida y no ha expirado (con margen de 60 segundos).
 */
const esJwtExpiradoOInvalido = (token) => {
    try {
        const partes = String(token || '').split('.');
        if (partes.length !== 3) return true;
        const payload = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'));
        if (payload.role && payload.role !== 'authenticated') return true;
        if (!payload.exp) return false;
        const ahoraSegundos = Math.floor(Date.now() / 1000);
        return payload.exp <= ahoraSegundos + 60;
    } catch {
        return true;
    }
};

/**
 * Extrae el rol de aplicación del usuario autenticado en Supabase.
 * Si el usuario no tiene un rol explícito en metadata, se asigna 'admin' por compatibilidad con cuentas únicas.
 */
const extraerRolUsuario = (user) => {
    return (
        user?.app_metadata?.role ||
        user?.user_metadata?.role ||
        'admin'
    );
};

/**
 * Middleware de autenticación HTTP que exige y verifica criptográficamente el JWT con Supabase Auth.
 */
const authMiddleware = async (req, res, next) => {
    const esRutaPublica =
        req.path === '/' ||
        req.path === '/health' ||
        req.path.startsWith('/auth') ||
        req.method === 'OPTIONS';

    if (esRutaPublica) {
        return next();
    }

    if (supabase.isMock) {
        req.user = { id: 'demo-user', email: 'demo@dlacasa.com', role: 'admin' };
        return next();
    }

    try {
        const authHeader = req.headers.authorization || '';
        const refreshTokenHeader = req.headers['x-refresh-token'];
        let accessToken = null;
        let verifiedUser = null;

        if (authHeader.startsWith('Bearer ')) {
            const candidate = authHeader.slice(7).trim();
            if (candidate && !TOKENS_LOCALES_INVALIDOS.has(candidate)) {
                accessToken = candidate;
            }
        }

        // Si hay un token con formato vigente, verificar su firma e identidad con Supabase Auth
        if (accessToken && !esJwtExpiradoOInvalido(accessToken)) {
            const { data, error } = await supabase.auth.getUser(accessToken);
            if (!error && data?.user) {
                verifiedUser = data.user;
            } else {
                accessToken = null;
            }
        } else {
            accessToken = null;
        }

        // Si el token falta, expiró o falló la verificación, intentar renovarlo con X-Refresh-Token
        if (!verifiedUser && refreshTokenHeader) {
            const cleanRefresh = String(refreshTokenHeader).trim();
            if (cleanRefresh && !TOKENS_LOCALES_INVALIDOS.has(cleanRefresh)) {
                const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession({
                    refresh_token: cleanRefresh
                });
                if (!refreshErr && refreshed?.session?.access_token) {
                    accessToken = refreshed.session.access_token;
                    verifiedUser = refreshed.session.user || refreshed.user || { id: 'authenticated-user' };
                    res.setHeader('x-access-token', refreshed.session.access_token);
                    if (refreshed.session.refresh_token) {
                        res.setHeader('x-refresh-token', refreshed.session.refresh_token);
                    }
                }
            }
        }

        if (!accessToken || !verifiedUser) {
            return res.status(401).json({
                error: 'Sesión no iniciada o expirada. Por favor, inicie sesión.'
            });
        }

        req.accessToken = accessToken;
        req.user = {
            ...verifiedUser,
            role: extraerRolUsuario(verifiedUser)
        };
        return next();
    } catch (err) {
        console.warn('Aviso al verificar token de sesión en Supabase:', err.message);
        return res.status(401).json({
            error: 'No se pudo validar la sesión. Por favor, inicie sesión nuevamente.'
        });
    }
};

/**
 * Verifica el token enviado en el handshake de Socket.IO cuando está disponible.
 */
const verificarTokenSocket = async (socket, next) => {
    if (supabase.isMock) {
        socket.user = { id: 'demo-user', role: 'admin' };
        return next();
    }

    try {
        const rawAuthToken =
            socket.handshake?.auth?.token ||
            socket.handshake?.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
            null;

        if (rawAuthToken && !TOKENS_LOCALES_INVALIDOS.has(rawAuthToken) && !esJwtExpiradoOInvalido(rawAuthToken)) {
            const { data, error } = await supabase.auth.getUser(rawAuthToken);
            if (!error && data?.user) {
                socket.user = {
                    ...data.user,
                    role: extraerRolUsuario(data.user)
                };
            }
        }
        return next();
    } catch {
        return next();
    }
};

module.exports = {
    authMiddleware,
    esJwtExpiradoOInvalido,
    extraerRolUsuario,
    verificarTokenSocket,
    TOKENS_LOCALES_INVALIDOS
};
