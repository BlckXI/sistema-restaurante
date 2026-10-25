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
        <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center border-b border-slate-200 pb-4 gap-3 mb-5">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Resumen de Caja</h1>
                    <p className="text-xs text-slate-500">Balance financiero en tiempo real</p>
                </div>
                <button
                    type="button"
                    onClick={onGenerarPDF}
                    className="w-full sm:w-auto min-h-[48px] min-w-[44px] bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-2 text-sm transition"
                >
                    Imprimir PDF
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <p className="text-[11px] font-bold uppercase text-slate-500">Saldo Inicial</p>
                    <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">${saldoInicial.toFixed(2)}</p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <p className="text-[11px] font-bold uppercase text-slate-500">Ventas Efectivo</p>
                    <p className="text-base sm:text-lg font-bold text-emerald-600 mt-0.5">${ventasEfectivo.toFixed(2)}</p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <p className="text-[11px] font-bold uppercase text-slate-500">Ingresos Extras</p>
                    <p className="text-base sm:text-lg font-bold text-emerald-600 mt-0.5">
                        ${totalIngresosExtras.toFixed(2)}
                    </p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <p className="text-[11px] font-bold uppercase text-slate-500">Subtotal Domicilios</p>
                    <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">${totalDomicilios.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-500">{pedidosDomicilio} pedidos x $1.00</p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <p className="text-[11px] font-bold uppercase text-slate-500">Gastos Operativos</p>
                    <p className="text-base sm:text-lg font-bold text-red-500 mt-0.5">-${totalGastos.toFixed(2)}</p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col justify-center">
                    <p className="text-[11px] font-bold uppercase text-slate-500">Subtotal Transferencias</p>
                    <p className="text-base sm:text-lg font-bold text-sky-600 mt-0.5">${totalBanco.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-500">{cantidadTransferencias} movimientos en banco</p>
                </div>

                {/* TOTAL DE EFECTIVO REAL DESTACADO EN TAMAÑO TIPOGRÁFICO MAYOR Y COLOR PRIMARIO */}
                <div className="bg-slate-800 p-4 sm:p-5 rounded-xl shadow-md text-white col-span-2 lg:col-span-2 flex flex-col sm:flex-row justify-between items-center gap-3 border-2 border-orange-500">
                    <div className="text-center sm:text-left">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-300">
                            Total de Efectivo Real (Caja Física)
                        </p>
                        <p className="text-3xl sm:text-4xl font-black mt-1 text-orange-500 leading-none">
                            ${totalEfectivo.toFixed(2)}
                        </p>
                        {totalEfectivo < 0 ? (
                            <p className="text-[11px] text-red-400 font-semibold mt-1">
                                El saldo en efectivo es negativo. Revisa los gastos antes de cerrar caja.
                            </p>
                        ) : (
                            <p className="text-[11px] text-slate-300 mt-1">
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
                                ? 'bg-orange-500 text-white hover:bg-orange-600'
                                : 'bg-slate-600 text-slate-300 cursor-not-allowed'
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
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex flex-wrap justify-between items-center text-xs font-bold text-slate-900 mb-2 gap-2">
                    <span>Distribución de Ingresos del Día</span>
                    <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                            Efectivo ({pctEfectivo}%)
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                            Transferencias ({pctBanco}%)
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
                            Extras ({pctExtras}%)
                        </span>
                    </div>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                    <div
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${pctEfectivo}%` }}
                    />
                    <div
                        className="bg-sky-500 h-full transition-all duration-300"
                        style={{ width: `${pctBanco}%` }}
                    />
                    <div
                        className="bg-orange-500 h-full transition-all duration-300"
                        style={{ width: `${pctExtras}%` }}
                    />
                </div>
            </div>
        </div>
    );
});

export default ResumenCaja;
