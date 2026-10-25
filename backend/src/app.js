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

/**
 * Middleware global de manejo de errores para estandarizar respuestas HTTP ante fallos.
 */
const errorHandler = (err, req, res, _next) => {
    if (res.headersSent) return;
    res.setHeader('Access-Control-Allow-Origin', '*');

    const rawMessage = err.message || 'Error interno del servidor';
    const isRlsOrJwtError =
        rawMessage.includes('row-level security policy') ||
        rawMessage.includes('JWT expired') ||
        rawMessage.includes('invalid JWT');

    const statusCode = isRlsOrJwtError ? 401 : (err.statusCode || 500);
    const message = isRlsOrJwtError
        ? 'Sesión de base de datos expirada. Por favor, inicie sesión nuevamente.'
        : rawMessage;

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
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token']
        })
    );
    app.use(express.json());

    app.use((req, _res, next) => {
        req.io = io;
        next();
    });

    // Restaurar y verificar sesión autenticada en Supabase tras reinicios del contenedor en Render
    app.use(async (req, res, next) => {
        const esRutaPublica =
            req.path === '/' ||
            req.path === '/health' ||
            req.path.startsWith('/auth') ||
            req.method === 'OPTIONS';

        if (esRutaPublica || typeof supabase?.auth?.getSession !== 'function') {
            return next();
        }

        try {
            const { data: current } = await supabase.auth.getSession();
            let sesionActiva = current?.session || null;

            if (!sesionActiva) {
                const authHeader = req.headers.authorization;
                const refreshToken = req.headers['x-refresh-token'];
                if (authHeader && authHeader.startsWith('Bearer ') && refreshToken) {
                    const accessToken = authHeader.slice(7).trim();
                    if (
                        accessToken &&
                        accessToken !== 'mock-session-token' &&
                        accessToken !== 'local-session-token'
                    ) {
                        const { data: restaurada } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: String(refreshToken)
                        });
                        sesionActiva = restaurada?.session || null;
                    }
                }
            }

            if (!sesionActiva) {
                return res.status(401).json({
                    error: 'Sesión no iniciada o expirada en el servidor. Por favor, inicie sesión.'
                });
            }
        } catch (err) {
            console.warn('Aviso al sincronizar sesión de Supabase:', err.message);
        }
        return next();
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
