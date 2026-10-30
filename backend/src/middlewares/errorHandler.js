/**
 * Middleware global de manejo de errores para estandarizar respuestas HTTP ante fallos.
 */
const errorHandler = (err, req, res, _next) => {
    if (res.headersSent) return;
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');

    const rawMessage = err.message || 'Error interno del servidor';
    const isJwtError =
        rawMessage.includes('JWT expired') ||
        rawMessage.includes('invalid JWT') ||
        rawMessage.includes('invalid claim: missing sub claim');
    const isRlsError = rawMessage.includes('row-level security policy');

    let statusCode = err.statusCode || 500;
    let message = rawMessage;

    if (isJwtError || (isRlsError && !req.accessToken && !req.user)) {
        statusCode = 401;
        message = 'Sesión expirada o no autenticada. Por favor, inicie sesión nuevamente.';
    } else if (isRlsError && (req.accessToken || req.user)) {
        statusCode = 403;
        message = 'Permiso denegado por política de seguridad (RLS) en Supabase para este usuario.';
    } else if (statusCode === 500 && err.code) {
        // Ocultar detalles técnicos de base de datos cuando no es un error de negocio controlado
        message = 'Error interno al procesar la operación en la base de datos.';
    }

    console.error(`[Error ${statusCode}] ${req.method} ${req.originalUrl}: ${rawMessage}`);
    res.status(statusCode).json({ error: message });
};

module.exports = {
    errorHandler
};
