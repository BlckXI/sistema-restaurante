const SOLO_TEXTO_REGEX = /^[a-zA-Z\sñÑáéíóúÁÉÍÓÚüÜ]+$/;
const NOMBRE_PLATO_REGEX = /^[a-zA-Z0-9\sñÑáéíóúÁÉÍÓÚüÜ().,/\-'"]+$/;

/**
 * Valida que una cadena no vacía contenga únicamente letras y espacios.
 * @param {string} valor
 * @returns {boolean}
 */
const esTextoValido = (valor) => {
    if (typeof valor !== 'string') return false;
    const limpio = valor.trim();
    return limpio.length > 0 && SOLO_TEXTO_REGEX.test(limpio);
};

/**
 * Valida nombres de platillos permitiendo letras, espacios, números y signos habituales como paréntesis o guiones.
 * @param {string} valor
 * @returns {boolean}
 */
const esNombrePlatoValido = (valor) => {
    if (typeof valor !== 'string') return false;
    const limpio = valor.trim();
    return limpio.length > 0 && /[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ]/.test(limpio) && NOMBRE_PLATO_REGEX.test(limpio);
};

/**
 * Valida que una cadena opcional contenga únicamente letras y espacios.
 * @param {string} valor
 * @returns {boolean}
 */
const esTextoOpcionalValido = (valor) => {
    if (!valor) return true;
    if (typeof valor !== 'string') return false;
    return /^[a-zA-Z\sñÑáéíóúÁÉÍÓÚüÜ]*$/.test(valor.trim());
};

/**
 * Valida que un monto sea un número finito positivo (> 0) con máximo 2 decimales.
 * @param {number|string} monto
 * @returns {boolean}
 */
const esMontoPositivoValido = (monto) => {
    const numero = Number(monto);
    if (!Number.isFinite(numero) || numero <= 0) return false;
    return /^\d+(\.\d{1,2})?$/.test(String(monto));
};

/**
 * Valida que un valor sea un número entero positivo (> 0).
 * @param {number|string} valor
 * @returns {boolean}
 */
const esEnteroPositivoValido = (valor) => {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0;
};

/**
 * Valida que un valor sea un número entero no negativo (>= 0).
 * @param {number|string} valor
 * @returns {boolean}
 */
const esEnteroNoNegativoValido = (valor) => {
    if (valor === '' || valor === null || valor === undefined) return false;
    if (!/^\d+$/.test(String(valor))) return false;
    const numero = Number(valor);
    return Number.isInteger(numero) && numero >= 0;
};

module.exports = {
    esTextoValido,
    esNombrePlatoValido,
    esTextoOpcionalValido,
    esMontoPositivoValido,
    esEnteroPositivoValido,
    esEnteroNoNegativoValido
};
