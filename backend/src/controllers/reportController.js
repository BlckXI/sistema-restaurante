const obtenerReporteHoy = async (req, res) => {
    try {
        const datos = await calcularFinanzasDia();

        // Enviamos el objeto completamente limpio y listo para el nuevo frontend
        res.json({
            saldoInicial: datos.saldoInicial.toFixed(2), 
            ingresoVentas: datos.ventas.toFixed(2), // Total bruto
            totalGastos: datos.tGastos.toFixed(2), 
            totalIngresosExtras: datos.tExtras.toFixed(2),
            dineroEnCaja: datos.dineroEnCaja.toFixed(2), // Efectivo real
            totalAnulado: datos.anulado.toFixed(2),
            cantidadOrdenes: datos.validas, 
            platosDia: datos.platosDia, // La nueva tabla
            listaOrdenes: datos.ordenes, 
            listaGastos: datos.gastos, 
            listaIngresosExtras: datos.extras
        });
    } catch (e) { 
        console.error("Error en obtenerReporteHoy:", e);
        res.status(500).json({ error: e.message }); 
    }
};

const guardarCierre = async (req, res) => {
    try {
        // Ahora si el frontend envía un monto (req.body.monto), le damos prioridad,
        // de lo contrario usamos el calculado por seguridad.
        const datosReales = await calcularFinanzasDia();
        const montoReal = req.body.monto !== undefined ? parseFloat(req.body.monto) : datosReales.dineroEnCaja;
        const fecha = datosReales.fechaStr;

        const { data: existe } = await supabase.from('cierres').select('*').eq('fecha', fecha).single();
        if (existe) {
            await supabase.from('cierres').update({ monto_final: montoReal }).eq('fecha', fecha);
        } else {
            await supabase.from('cierres').insert([{ fecha, monto_final: montoReal }]);
        }

        res.json({ message: "Cierre guardado exitosamente", monto: montoReal });
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
};