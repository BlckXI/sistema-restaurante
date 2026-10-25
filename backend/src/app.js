const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const supabase = require('./config/supabase');

const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const menuRoutes = require('./routes/menuRoutes');
const reportRoutes = require('./routes/reportRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');

const TOKENS_LOCALES_INVALIDOS = new Set([
    'local-session-token',
    'session-token',
    'mock-session-token',
    'null',
    'undefined'
]);

/**
 * Verifica si un token JWT tiene formato válido y no ha expirado (con margen de 60 segundos).
 */
const esJwtExpiradoOInvalido = (token) => {
    try {
        const partes = String(token || '').split('.');
        if (partes.length !== 3) return true;
        const payload = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'));
        if (!payload.exp) return false;
        const ahoraSegundos = Math.floor(Date.now() / 1000);
        return payload.exp <= ahoraSegundos + 60;
    } catch {
        return true;
    }
};

/**
 * Middleware global de manejo de errores para estandarizar respuestas HTTP ante fallos.
 */
const errorHandler = (err, req, res, _next) => {
    if (res.headersSent) return;
    res.setHeader('Access-Control-Allow-Origin', '*');

    const rawMessage = err.message || 'Error interno del servidor';
    const isJwtError =
        rawMessage.includes('JWT expired') ||
        rawMessage.includes('invalid JWT') ||
        rawMessage.includes('invalid claim: missing sub claim');
    const isRlsError = rawMessage.includes('row-level security policy');

    let statusCode = err.statusCode || 500;
    let message = rawMessage;

    if (isJwtError || (isRlsError && !req.accessToken)) {
        statusCode = 401;
        message = 'Sesión expirada o no autenticada. Por favor, inicie sesión nuevamente.';
    } else if (isRlsError && req.accessToken) {
        statusCode = 403;
        message = 'Permiso denegado por política de seguridad (RLS) en Supabase para este usuario.';
    }

    console.error(`[Error ${statusCode}] ${req.method} ${req.originalUrl}: ${rawMessage}`);
    res.status(statusCode).json({ error: message });
};

/**
 * Construye y configura la instancia de Express inyectando Socket.IO y montando rutas y middlewares.
 */
const createApp = (io) => {
    const app = express();

    // Excluir rutas de Socket.IO del ciclo de vida de Express para evitar colisión de cabeceras
    app.use((req, res, next) => {
        if (req.url.startsWith('/socket.io') || req.originalUrl.startsWith('/socket.io')) {
            return;
        }
        next();
    });

    app.use(
        cors({
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token'],
            exposedHeaders: ['x-access-token', 'x-refresh-token']
        })
    );
    app.use(express.json());

    app.use((req, _res, next) => {
        req.io = io;
        next();
    });

    // Inyectar el token JWT del usuario por petición para que Supabase RLS se ejecute con el rol autenticado
    app.use(async (req, res, next) => {
        const esRutaPublica =
            req.path === '/' ||
            req.path === '/health' ||
            req.path.startsWith('/auth') ||
            req.method === 'OPTIONS';

        if (esRutaPublica || supabase.isMock) {
            return next();
        }

        try {
            const authHeader = req.headers.authorization || '';
            const refreshTokenHeader = req.headers['x-refresh-token'];
            let accessToken = null;

            if (authHeader.startsWith('Bearer ')) {
                const candidate = authHeader.slice(7).trim();
                if (candidate && !TOKENS_LOCALES_INVALIDOS.has(candidate)) {
                    accessToken = candidate;
                }
            }

            // Si el token falta o está vencido, intentar renovarlo con X-Refresh-Token
            if ((!accessToken || esJwtExpiradoOInvalido(accessToken)) && refreshTokenHeader) {
                const cleanRefresh = String(refreshTokenHeader).trim();
                if (cleanRefresh && !TOKENS_LOCALES_INVALIDOS.has(cleanRefresh)) {
                    const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession({
                        refresh_token: cleanRefresh
                    });
                    if (!refreshErr && refreshed?.session?.access_token) {
                        accessToken = refreshed.session.access_token;
                        res.setHeader('x-access-token', refreshed.session.access_token);
                        if (refreshed.session.refresh_token) {
                            res.setHeader('x-refresh-token', refreshed.session.refresh_token);
                        }
                    }
                }
            }

            // Respaldo: si hay una sesión válida recién autenticada en memoria del servidor
            if (!accessToken || esJwtExpiradoOInvalido(accessToken)) {
                const cached = supabase.getCachedSession?.();
                if (cached?.access_token && !esJwtExpiradoOInvalido(cached.access_token)) {
                    accessToken = cached.access_token;
                }
            }

            if (!accessToken || esJwtExpiradoOInvalido(accessToken)) {
                return res.status(401).json({
                    error: 'Sesión no iniciada o expirada. Por favor, inicie sesión.'
                });
            }

            req.accessToken = accessToken;
            return supabase.runWithToken(accessToken, () => next());
        } catch (err) {
            console.warn('Aviso al verificar token de sesión en Supabase:', err.message);
            return res.status(401).json({
                error: 'No se pudo validar la sesión. Por favor, inicie sesión nuevamente.'
            });
        }
    });

    // Enrutadores de API
    app.use('/auth', authRoutes);
    app.use('/ordenes', orderRoutes);
    app.use('/', menuRoutes);
    app.use('/', reportRoutes);
    app.use('/repartidor', deliveryRoutes);

    // Archivos estáticos del Frontend compilado (cuando se despliega de forma unificada)
    const frontendDistPath = path.join(__dirname, '../../frontend/dist');
    const indexHtmlPath = path.join(frontendDistPath, 'index.html');
    const hasFrontendBuild = fs.existsSync(indexHtmlPath);

    if (hasFrontendBuild) {
        app.use(express.static(frontendDistPath));
    }

    // Fallback SPA o respuesta de salud para despliegues de API independiente (Render)
    app.use((req, res, next) => {
        if (req.method !== 'GET') {
            return next();
        }
        if (req.url.startsWith('/socket.io') || req.originalUrl.startsWith('/socket.io') || res.headersSent) {
            return;
        }
        if (hasFrontendBuild) {
            return res.sendFile(indexHtmlPath);
        }
        if (req.path === '/' || req.path === '/health') {
            return res.status(200).json({
                status: 'ok',
                service: "API Restaurante D' La Casa"
            });
        }
        return res.status(404).json({ error: 'Ruta no encontrada' });
    });

    // Middleware de manejo global de errores
    app.use(errorHandler);

    return app;
};

module.exports = {
    createApp,
    errorHandler
};
