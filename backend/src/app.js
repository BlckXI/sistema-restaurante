const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { authMiddleware } = require('./middlewares/auth');
const { errorHandler } = require('./middlewares/errorHandler');

const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const menuRoutes = require('./routes/menuRoutes');
const reportRoutes = require('./routes/reportRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');

/**
 * Construye y configura la instancia de Express inyectando Socket.IO y montando rutas y middlewares.
 */
const createApp = (ioInstance = null) => {
    const app = express();
    if (ioInstance) {
        app.set('io', ioInstance);
    }

    const corsOrigin = process.env.CORS_ORIGIN || '*';

    app.use(
        cors({
            origin: corsOrigin,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token'],
            exposedHeaders: ['x-access-token', 'x-refresh-token']
        })
    );
    app.use(express.json());

    app.use((req, _res, next) => {
        req.io = req.app.get('io') || ioInstance;
        next();
    });

    // Middleware de autenticación JWT
    app.use(authMiddleware);

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
        if (res.headersSent) {
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
