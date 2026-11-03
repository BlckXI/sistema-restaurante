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
            <div className="flex justify-between items-center border-b border-line pb-2.5 mb-3.5 gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-ink">Nueva Orden</h2>
                <button
                    type="button"
                    onClick={onAbrirClientesActivos}
                    className="min-h-[44px] min-w-[44px] bg-surface-muted text-ink border border-line text-xs font-bold px-3.5 py-2 rounded-lg hover:bg-app transition"
                >
                    Clientes Activos
                </button>
            </div>

            {esExtra && (
                <div className="mb-3 bg-warning text-slate-900 px-3 py-2 rounded-lg text-xs flex justify-between items-center shadow-sm">
                    <span>
                        Modo: <strong>Orden Extra</strong>
                    </span>
                    <button
                        type="button"
                        onClick={onCancelarExtra}
                        className="min-w-[44px] min-h-[36px] text-slate-900 font-bold text-base leading-none px-2 hover:opacity-80"
                    >
                        &times;
                    </button>
                </div>
            )}

            <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-ink">Nombre del Cliente *</label>
                    {faltaCliente && (
                        <span className="text-[11px] font-semibold text-danger-ink">Obligatorio (solo letras)</span>
                    )}
                </div>
                <input
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    className={`w-full min-h-[48px] px-3.5 py-2.5 border rounded-lg bg-surface text-ink text-sm sm:text-base outline-none transition focus:ring-2 focus:ring-brand-accent ${
                        errores.cliente
                            ? 'border-danger bg-danger-soft/40'
                            : !cliente.trim()
                              ? 'border-line'
                              : 'border-success'
                    }`}
                    value={cliente}
                    onChange={onNombreChange}
                />
            </div>

            <div className="mb-3.5 bg-app p-2.5 rounded-lg border border-line">
                <label className="block text-xs font-bold text-ink-muted mb-1">Hora Programada (Opcional)</label>
                <input
                    type="time"
                    className="w-full min-h-[44px] px-2.5 py-1.5 border border-line rounded-md text-sm text-ink bg-surface outline-none focus:ring-2 focus:ring-brand-accent"
                    value={horaProgramada}
                    onChange={e => onHoraChange(e.target.value)}
                />
            </div>

            {/* AGRUPACIÓN VISUAL DE ESTADOS DE ENTREGA (PESTAÑAS DE ALTO CONTRASTE >= 44x48px) */}
            <div className="mb-3.5">
                <label className="block text-xs font-bold text-ink mb-1.5">Modalidad de Entrega</label>
                <div className="grid grid-cols-2 gap-2 bg-surface-muted p-1.5 rounded-xl border border-line">
                    {MODOS_ENTREGA.map(modo => {
                        const activo = tipoEntregaActual === modo.id;
                        let claseActiva = 'bg-brand text-white shadow-sm';
                        if (activo && modo.id === 'domicilio') claseActiva = 'bg-info text-white shadow-sm';
                        if (activo && (modo.id === 'retiro' || modo.id === 'personal')) {
                            claseActiva = 'bg-brand text-white shadow-sm';
                        }

                        return (
                            <button
                                key={modo.id}
                                type="button"
                                onClick={() => onSeleccionarTipoEntrega && onSeleccionarTipoEntrega(modo.id)}
                                className={`min-h-[48px] min-w-[44px] px-3 py-2 rounded-lg font-bold text-xs sm:text-sm transition flex items-center justify-center text-center ${
                                    activo ? claseActiva : 'bg-surface text-ink hover:bg-app border border-line'
                                }`}
                            >
                                {modo.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {esDomicilio && (
                <div className="mb-4 p-3.5 rounded-xl bg-info-soft border border-info/30 space-y-3">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-ink">Dirección de entrega *</label>
                            {faltaDireccion && (
                                <span className="text-[11px] font-bold text-danger-ink">Requerida para domicilio</span>
                            )}
                        </div>
                        <input
                            type="text"
                            placeholder="Calle, referencia o número de casa *"
                            className={`w-full min-h-[48px] px-3.5 py-2.5 border rounded-lg text-sm text-ink bg-surface outline-none transition focus:ring-2 focus:ring-brand-accent ${
                                faltaDireccion ? 'border-danger bg-danger-soft/30' : 'border-success'
                            }`}
                            value={direccion}
                            onChange={e => onDireccionChange(e.target.value)}
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-ink">Teléfono de contacto (8 dígitos) *</label>
                            {faltaTelefono && (
                                <span className="text-[11px] font-bold text-danger-ink">
                                    Faltan {Math.max(0, 8 - telefono.length)} dígitos
                                </span>
                            )}
                        </div>
                        <input
                            type="tel"
                            inputMode="numeric"
                            placeholder="Ej: 77778888"
                            className={`w-full min-h-[48px] px-3.5 py-2.5 border rounded-lg text-sm text-ink bg-surface outline-none transition focus:ring-2 focus:ring-brand-accent ${
                                faltaTelefono ? 'border-danger bg-danger-soft/30' : 'border-success'
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
