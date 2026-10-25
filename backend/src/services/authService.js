const supabase = require('../config/supabase');

/**
 * Autentica un usuario mediante correo y contraseña a través de Supabase Auth.
 */
const iniciarSesion = async (email, password) => {
    const correoLimpio = String(email || '').trim();
    const { data, error } = await supabase.auth.signInWithPassword({
        email: correoLimpio,
        password
    });

    if (error) {
        const msg =
            error.message === 'Invalid login credentials'
                ? 'Correo o contraseña incorrectos. Verifica el usuario registrado en Supabase Auth.'
                : error.message || 'Credenciales inválidas';
        const err = new Error(msg);
        err.statusCode = 401;
        throw err;
    }

    return data;
};

/**
 * Cierra la sesión del dispositivo cliente sin afectar a otros dispositivos autenticados.
 */
const cerrarSesion = async () => {
    return { message: 'Sesión cerrada correctamente' };
};

module.exports = {
    iniciarSesion,
    cerrarSesion
};
