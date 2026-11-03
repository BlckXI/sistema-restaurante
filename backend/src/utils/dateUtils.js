// Zona horaria de El Salvador: UTC-6 fijo durante todo el año (sin horario de verano)
const OFFSET_EL_SALVADOR_MS = 6 * 60 * 60 * 1000;
const HORA_CORTE_REPARTIDOR_SV = 19; // 7:00 PM hora de El Salvador

/**
 * Convierte un objeto Date a componentes de fecha y hora en El Salvador (UTC-6).
 */
const obtenerComponentesElSalvador = (ahora = new Date()) => {
    const fechaSV = new Date(ahora.getTime() - OFFSET_EL_SALVADOR_MS);
    const año = fechaSV.getUTCFullYear();
    const mes = String(fechaSV.getUTCMonth() + 1).padStart(2, '0');
    const dia = String(fechaSV.getUTCDate()).padStart(2, '0');
    const hora = fechaSV.getUTCHours();
    const minuto = fechaSV.getUTCMinutes();
    const fechaStr = `${año}-${mes}-${dia}`;

    return { año, mes, dia, hora, minuto, fechaStr };
};

/**
 * Obtiene el rango completo del día operativo en El Salvador (00:00:00 SV a 23:59:59 SV).
 */
const getRangoDiario = (ahora = new Date()) => {
    const { fechaStr } = obtenerComponentesElSalvador(ahora);

    // 00:00:00 en El Salvador equivale a las 06:00:00.000Z en UTC
    const inicioDate = new Date(`${fechaStr}T06:00:00.000Z`);
    const finDate = new Date(inicioDate.getTime() + 24 * 60 * 60 * 1000);

    return {
        inicio: inicioDate.toISOString(),
        fin: finDate.toISOString(),
        fechaStr
    };
};

/**
 * Calcula la ventana horaria del panel de Repartidor para El Salvador (UTC-6).
 * A partir de las 7:00 PM (19:00 horas en El Salvador), enHorarioCorte es true para limpiar el panel.
 */
const getEstadoHorarioRepartidor = (ahora = new Date()) => {
    const { hora, minuto, fechaStr } = obtenerComponentesElSalvador(ahora);
    const inicioDate = new Date(`${fechaStr}T06:00:00.000Z`);
    const corte7PMDate = new Date(inicioDate.getTime() + HORA_CORTE_REPARTIDOR_SV * 60 * 60 * 1000);

    return {
        inicio: inicioDate.toISOString(),
        corte7PM: corte7PMDate.toISOString(),
        fechaStr,
        horaElSalvador: hora,
        minutoElSalvador: minuto,
        enHorarioCorte: hora >= HORA_CORTE_REPARTIDOR_SV
    };
};

module.exports = {
    OFFSET_EL_SALVADOR_MS,
    HORA_CORTE_REPARTIDOR_SV,
    obtenerComponentesElSalvador,
    getRangoDiario,
    getEstadoHorarioRepartidor
};