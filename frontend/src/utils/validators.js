const SOLO_TEXTO_REGEX = /^[a-zA-Z\sñÑáéíóúÁÉÍÓÚüÜ]*$/;
const MONTO_DECIMAL_POSITIVO_REGEX = /^\d*(\.\d{0,2})?$/;
const ENTERO_POSITIVO_REGEX = /^\d*$/;

/**
 * Valida que una cadena contenga únicamente letras y espacios (sin números ni símbolos).
 * @param {string} valor - Texto a evaluar.
 * @returns {boolean}
 */
export const esSoloTexto = (valor) => {
    return SOLO_TEXTO_REGEX.test(valor);
};

/**
 * Valida que el valor en edición sea un número positivo o decimal válido (hasta 2 decimales, sin signos negativos ni letras).
 * @param {string} valor - Valor numérico en texto.
 * @returns {boolean}
 */
export const esEntradaMontoPositivo = (valor) => {
    return MONTO_DECIMAL_POSITIVO_REGEX.test(valor);
};

/**
 * Verifica que el monto final sea un número estrictamente mayor a cero.
 * @param {string|number} valor - Monto a validar.
 * @returns {boolean}
 */
export const esMontoPositivoValido = (valor) => {
    const numero = parseFloat(valor);
    return !Number.isNaN(numero) && numero > 0;
};

/**
 * Valida que el valor en edición contenga únicamente dígitos enteros (sin decimales, signos ni letras).
 * @param {string} valor - Valor en texto.
 * @returns {boolean}
 */
export const esEntradaEnteroPositivo = (valor) => {
    return ENTERO_POSITIVO_REGEX.test(valor);
};

/**
 * Verifica que el valor final sea un número entero estrictamente positivo (> 0).
 * @param {string|number} valor - Número entero a validar.
 * @returns {boolean}
 */
export const esEnteroPositivoValido = (valor) => {
    if (valor === '' || valor === null || valor === undefined) return false;
    if (!/^\d+$/.test(String(valor))) return false;
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0;
};

/**
 * Verifica que el valor final sea un número entero no negativo (>= 0).
 * @param {string|number} valor - Número entero a validar.
 * @returns {boolean}
 */
export const esEnteroNoNegativoValido = (valor) => {
    if (valor === '' || valor === null || valor === undefined) return false;
    if (!/^\d+$/.test(String(valor))) return false;
    const numero = Number(valor);
    return Number.isInteger(numero) && numero >= 0;
};
