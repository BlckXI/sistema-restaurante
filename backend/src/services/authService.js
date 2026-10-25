const supabase = require('../config/supabase');

/**
 * Autentica un usuario mediante correo y contraseña a través de Supabase.
 */
const iniciarSesion = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        const err = new Error(error.message || 'Credenciales inválidas');
        err.statusCode = 401;
        throw err;
    }
    return data;
};

/**
 * Cierra la sesión activa en Supabase.
 */
const cerrarSesion = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        const err = new Error(error.message);
        err.statusCode = 400;
        throw err;
    }
    return { message: 'Sesión cerrada correctamente' };
};

module.exports = {
    iniciarSesion,
    cerrarSesion
};
