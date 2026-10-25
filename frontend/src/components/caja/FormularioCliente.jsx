import { memo } from 'react';

const MODOS_ENTREGA = [
    { id: 'mesa', label: 'Local / Mesa' },
    { id: 'retiro', label: 'Retiro' },
    { id: 'domicilio', label: 'Domicilio (+$1)' },
    { id: 'personal', label: 'Personal' }
];

const FormularioCliente = memo(function FormularioCliente({
    cliente,
    onNombreChange,
    horaProgramada,
    onHoraChange,
    esExtra,
    onCancelarExtra,
    onAbrirClientesActivos,
    tipoEntregaActual = 'mesa',
    onSeleccionarTipoEntrega,
    esDomicilio,
    direccion,
    onDireccionChange,
    telefono,
    onTelefonoChange,
    errores
}) {
    const faltaCliente = Boolean(errores.cliente || !cliente.trim());
    const faltaDireccion = Boolean(esDomicilio && (errores.direccion || !direccion.trim()));
    const faltaTelefono = Boolean(esDomicilio && (errores.telefono || telefono.trim().length !== 8));

    return (
        <div className="w-full">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2.5 mb-3.5 gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">Nueva Orden</h2>
                <button
                    type="button"
                    onClick={onAbrirClientesActivos}
                    className="min-h-[44px] min-w-[44px] bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg hover:bg-slate-700 transition"
                >
                    Clientes Activos
                </button>
            </div>

            {esExtra && (
                <div className="mb-3 bg-amber-500 text-white px-3 py-2 rounded-lg text-xs flex justify-between items-center shadow-sm">
                    <span>
                        Modo: <strong>Orden Extra</strong>
                    </span>
                    <button
                        type="button"
                        onClick={onCancelarExtra}
                        className="min-w-[44px] min-h-[36px] text-white font-bold text-base leading-none px-2 hover:opacity-80"
                    >
                        &times;
                    </button>
                </div>
            )}

            <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-900">Nombre del Cliente *</label>
                    {faltaCliente && (
                        <span className="text-[11px] font-semibold text-red-500">Obligatorio (solo letras)</span>
                    )}
                </div>
                <input
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    className={`w-full min-h-[48px] px-3.5 py-2.5 border rounded-lg bg-white text-slate-900 text-sm sm:text-base outline-none transition focus:ring-2 focus:ring-orange-500 ${
                        errores.cliente
                            ? 'border-red-500 bg-red-50/40'
                            : !cliente.trim()
                              ? 'border-red-300'
                              : 'border-emerald-500'
                    }`}
                    value={cliente}
                    onChange={onNombreChange}
                />
            </div>

            <div className="mb-3.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 mb-1">Hora Programada (Opcional)</label>
                <input
                    type="time"
                    className="w-full min-h-[44px] px-2.5 py-1.5 border border-slate-300 rounded-md text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-orange-500"
                    value={horaProgramada}
                    onChange={e => onHoraChange(e.target.value)}
                />
            </div>

            {/* AGRUPACIÓN VISUAL DE ESTADOS DE ENTREGA (PESTAÑAS DE ALTO CONTRASTE >= 44x48px) */}
            <div className="mb-3.5">
                <label className="block text-xs font-bold text-slate-900 mb-1.5">Modalidad de Entrega</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                    {MODOS_ENTREGA.map(modo => {
                        const activo = tipoEntregaActual === modo.id;
                        let claseActiva = 'bg-slate-800 text-white shadow-sm';
                        if (activo && modo.id === 'domicilio') claseActiva = 'bg-orange-500 text-white shadow-sm';
                        if (activo && (modo.id === 'retiro' || modo.id === 'personal')) {
                            claseActiva = 'bg-sky-500 text-white shadow-sm';
                        }

                        return (
                            <button
                                key={modo.id}
                                type="button"
                                onClick={() => onSeleccionarTipoEntrega && onSeleccionarTipoEntrega(modo.id)}
                                className={`min-h-[48px] min-w-[44px] px-3 py-2 rounded-lg font-bold text-xs sm:text-sm transition flex items-center justify-center text-center ${
                                    activo ? claseActiva : 'bg-white text-slate-900 hover:bg-slate-50 border border-slate-200'
                                }`}
                            >
                                {modo.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {esDomicilio && (
                <div className="mb-4 p-3.5 rounded-xl bg-orange-50/60 border border-orange-300 space-y-3">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-slate-900">Dirección de entrega *</label>
                            {faltaDireccion && (
                                <span className="text-[11px] font-bold text-red-500">Requerida para domicilio</span>
                            )}
                        </div>
                        <input
                            type="text"
                            placeholder="Calle, referencia o número de casa *"
                            className={`w-full min-h-[48px] px-3.5 py-2.5 border rounded-lg text-sm text-slate-900 bg-white outline-none transition focus:ring-2 focus:ring-orange-500 ${
                                faltaDireccion ? 'border-red-500 bg-red-50/30' : 'border-emerald-500'
                            }`}
                            value={direccion}
                            onChange={e => onDireccionChange(e.target.value)}
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-slate-900">Teléfono de contacto (8 dígitos) *</label>
                            {faltaTelefono && (
                                <span className="text-[11px] font-bold text-red-500">
                                    Faltan {Math.max(0, 8 - telefono.length)} dígitos
                                </span>
                            )}
                        </div>
                        <input
                            type="tel"
                            inputMode="numeric"
                            placeholder="Ej: 77778888"
                            className={`w-full min-h-[48px] px-3.5 py-2.5 border rounded-lg text-sm text-slate-900 bg-white outline-none transition focus:ring-2 focus:ring-orange-500 ${
                                faltaTelefono ? 'border-red-500 bg-red-50/30' : 'border-emerald-500'
                            }`}
                            value={telefono}
                            onChange={onTelefonoChange}
                        />
                    </div>
                </div>
            )}
        </div>
    );
});

export default FormularioCliente;
