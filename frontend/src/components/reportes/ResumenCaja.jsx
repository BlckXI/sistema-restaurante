import { memo } from 'react';

const ResumenCaja = memo(function ResumenCaja({
    saldoInicial,
    ventasEfectivo,
    totalIngresosExtras,
    totalDomicilios,
    pedidosDomicilio,
    totalGastos,
    totalBanco,
    cantidadTransferencias,
    totalEfectivo,
    puedeCerrarCaja = true,
    procesandoCierre = false,
    onAbrirModalCierre,
    onGenerarPDF
}) {
    const totalFlujoPositivo = Math.max(
        ventasEfectivo + totalBanco + totalIngresosExtras + totalDomicilios,
        0.01
    );
    const pctEfectivo = Math.min(100, Math.round(((ventasEfectivo + totalDomicilios) / totalFlujoPositivo) * 100));
    const pctBanco = Math.min(100, Math.round((totalBanco / totalFlujoPositivo) * 100));
    const pctExtras = Math.max(0, 100 - pctEfectivo - pctBanco);

    return (
        <div className="bg-surface p-4 sm:p-5 rounded-xl shadow-sm border border-line">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center border-b border-line pb-4 gap-3 mb-5">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-ink">Resumen de Caja</h1>
                    <p className="text-xs text-ink-muted">Balance financiero en tiempo real</p>
                </div>
                <button
                    type="button"
                    onClick={onGenerarPDF}
                    className="w-full sm:w-auto min-h-[48px] min-w-[44px] bg-surface-muted hover:bg-surface text-ink border border-line font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-2 text-sm transition"
                >
                    Imprimir PDF
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
                <div className="bg-app p-3.5 rounded-xl border border-line">
                    <p className="text-[11px] font-bold uppercase text-ink-muted">Saldo Inicial</p>
                    <p className="text-base sm:text-lg font-bold text-ink mt-0.5 tabular-nums">${saldoInicial.toFixed(2)}</p>
                </div>
                <div className="bg-app p-3.5 rounded-xl border border-line">
                    <p className="text-[11px] font-bold uppercase text-ink-muted">Ventas Efectivo</p>
                    <p className="text-base sm:text-lg font-bold text-success-ink mt-0.5 tabular-nums">${ventasEfectivo.toFixed(2)}</p>
                </div>
                <div className="bg-app p-3.5 rounded-xl border border-line">
                    <p className="text-[11px] font-bold uppercase text-ink-muted">Ingresos Extras</p>
                    <p className="text-base sm:text-lg font-bold text-success-ink mt-0.5 tabular-nums">
                        ${totalIngresosExtras.toFixed(2)}
                    </p>
                </div>
                <div className="bg-app p-3.5 rounded-xl border border-line">
                    <p className="text-[11px] font-bold uppercase text-ink-muted">Subtotal Domicilios</p>
                    <p className="text-base sm:text-lg font-bold text-ink mt-0.5 tabular-nums">${totalDomicilios.toFixed(2)}</p>
                    <p className="text-[10px] text-ink-muted tabular-nums">{pedidosDomicilio} pedidos x $1.00</p>
                </div>
                <div className="bg-app p-3.5 rounded-xl border border-line">
                    <p className="text-[11px] font-bold uppercase text-ink-muted">Gastos Operativos</p>
                    <p className="text-base sm:text-lg font-bold text-danger-ink mt-0.5 tabular-nums">-${totalGastos.toFixed(2)}</p>
                </div>
                <div className="bg-app p-3.5 rounded-xl border border-line flex flex-col justify-center">
                    <p className="text-[11px] font-bold uppercase text-ink-muted">Subtotal Transferencias</p>
                    <p className="text-base sm:text-lg font-bold text-info-ink mt-0.5 tabular-nums">${totalBanco.toFixed(2)}</p>
                    <p className="text-[10px] text-ink-muted tabular-nums">{cantidadTransferencias} movimientos en banco</p>
                </div>

                {/* TOTAL DE EFECTIVO REAL DESTACADO EN TAMAÑO TIPOGRÁFICO MAYOR Y COLOR PRIMARIO */}
                <div className="bg-surface-muted p-4 sm:p-5 rounded-xl shadow-md text-ink col-span-2 lg:col-span-2 flex flex-col sm:flex-row justify-between items-center gap-3 border-2 border-brand-accent">
                    <div className="text-center sm:text-left">
                        <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">
                            Total de Efectivo Real (Caja Física)
                        </p>
                        <p className="text-3xl sm:text-4xl font-black mt-1 text-brand-text leading-none tabular-nums">
                            ${totalEfectivo.toFixed(2)}
                        </p>
                        {totalEfectivo < 0 ? (
                            <p className="text-[11px] text-danger-ink font-semibold mt-1">
                                El saldo en efectivo es negativo. Revisa los gastos antes de cerrar caja.
                            </p>
                        ) : (
                            <p className="text-[11px] text-ink-muted mt-1">
                                Monto físico disponible para cuadre de turno
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onAbrirModalCierre}
                        disabled={!puedeCerrarCaja || procesandoCierre}
                        className={`w-full sm:w-auto min-h-[48px] min-w-[44px] text-xs sm:text-sm font-bold py-3 px-6 rounded-xl shadow-md transition shrink-0 flex items-center justify-center gap-2 ${
                            puedeCerrarCaja && !procesandoCierre
                                ? 'bg-brand text-white hover:bg-brand-hover'
                                : 'bg-surface text-ink-muted border border-line cursor-not-allowed'
                        }`}
                    >
                        {procesandoCierre && (
                            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />
                        )}
                        <span>{procesandoCierre ? 'CERRANDO...' : 'CERRAR CAJA'}</span>
                    </button>
                </div>
            </div>

            {/* Contenedor de gráfico de proporción de ingresos adaptable a móvil y escritorio */}
            <div className="bg-app p-3.5 rounded-xl border border-line">
                <div className="flex flex-wrap justify-between items-center text-xs font-bold text-ink mb-2 gap-2">
                    <span>Distribución de Ingresos del Día</span>
                    <div className="flex flex-wrap gap-3 text-[11px] text-ink-muted tabular-nums">
                        <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-success inline-block" />
                            Efectivo ({pctEfectivo}%)
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-info inline-block" />
                            Transferencias ({pctBanco}%)
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-brand-accent inline-block" />
                            Extras ({pctExtras}%)
                        </span>
                    </div>
                </div>
                <div className="w-full h-3 bg-surface-muted rounded-full overflow-hidden flex border border-line">
                    <div
                        className="bg-success h-full transition-all duration-300"
                        style={{ width: `${pctEfectivo}%` }}
                    />
                    <div
                        className="bg-info h-full transition-all duration-300"
                        style={{ width: `${pctBanco}%` }}
                    />
                    <div
                        className="bg-brand-accent h-full transition-all duration-300"
                        style={{ width: `${pctExtras}%` }}
                    />
                </div>
            </div>
        </div>
    );
});

export default ResumenCaja;
