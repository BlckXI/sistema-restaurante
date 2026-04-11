// --- 🕒 CORRECCIÓN DE ZONA HORARIA (El Salvador GMT-6) ---
const getRangoDiario = () => {
    const ahora = new Date();
    const fechaElSalvador = new Date(ahora.toLocaleString("en-US", {timeZone: "America/El_Salvador"}));
    
    const año = fechaElSalvador.getFullYear();
    const mes = String(fechaElSalvador.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaElSalvador.getDate()).padStart(2, '0');
    
    const fechaStr = `${año}-${mes}-${dia}`;
    
    const inicio = new Date(`${fechaStr}T06:00:00.000Z`).toISOString();
    
    const finDate = new Date(`${fechaStr}T06:00:00.000Z`);
    finDate.setDate(finDate.getDate() + 1);
    const fin = finDate.toISOString();
    
    return { inicio, fin, fechaStr };
};

module.exports = { getRangoDiario };