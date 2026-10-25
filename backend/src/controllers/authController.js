const authService = require('../services/authService');

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Correo y contraseña requeridos' });
        }
        const data = await authService.iniciarSesion(email, password);
        return res.status(200).json(data);
    } catch (error) {
        return next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        const resultado = await authService.cerrarSesion();
        return res.status(200).json(resultado);
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    login,
    logout
};
