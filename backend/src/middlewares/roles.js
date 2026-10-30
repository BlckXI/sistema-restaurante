/**
 * Middleware de control de acceso basado en roles (RBAC).
 * Verifica que el usuario autenticado posea uno de los roles permitidos para la ruta.
 */
const requireRole = (...rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Sesión no iniciada. Por favor, inicie sesión.'
            });
        }

        const rolActual = req.user.role || 'admin';
        if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(rolActual)) {
            return res.status(403).json({
                error: 'No tiene permisos suficientes para realizar esta operación.'
            });
        }

        return next();
    };
};

module.exports = {
    requireRole
};
