import { memo } from 'react';

const GastosEIngresos = memo(function GastosEIngresos({
    descGasto,
    onDescGastoChange,
    montoGasto,
    onMontoGastoChange,
    esGastoValido = false,
    guardandoGasto = false,
    onRegistrarGasto,
    listaGastos,
    onEliminarGasto,
    descIngreso,
    onDescIngresoChange,
    montoIngreso,
    onMontoIngresoChange,
    esIngresoValido = false,
    guardandoIngreso = false,
    onRegistrarIngreso,
    listaIngresos,
    onSolicitarEliminarIngreso
}) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* GASTOS OPERATIVOS */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col">
                <h2 className="font-bold text-base sm:text-lg mb-2 text-slate-900">Gastos Operativos</h2>
                <form onSubmit={onRegistrarGasto} className="space-y-2 mb-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            placeholder="Descripción (solo texto)"
                            className="flex-1 min-h-[48px] px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-orange-500"
                            value={descGasto}
                            onChange={onDescGastoChange}
                        />
                        <div className="flex gap-2">
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="Monto 0.00"
                                className="flex-1 sm:w-28 min-h-[48px] px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-orange-500"
                                value={montoGasto}
                                onChange={onMontoGastoChange}
                            />
                            <button
                                type="submit"
                                disabled={!esGastoValido || guardandoGasto}
                                className={`min-h-[48px] min-w-[44px] px-4 py-2.5 rounded-lg font-bold text-sm shrink-0 transition flex items-center justify-center gap-1.5 ${
                                    esGastoValido && !guardandoGasto
                                        ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                            >
                                {guardandoGasto && (
                                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />
                                )}
                                <span>{guardandoGasto ? 'Guardando...' : 'Guardar Gasto'}</span>
                            </button>
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                        {esGastoValido
                            ? 'Datos válidos. Presiona "Guardar Gasto" para descontar de caja.'
                            : 'Ingresa una descripción en texto y un monto positivo mayor a $0.00 para habilitar el registro.'}
                    </p>
                </form>
                <div className="overflow-x-auto overflow-y-auto max-h-48 border-t border-slate-200 pt-1">
                    <table className="w-full text-sm">
                        <tbody className="divide-y divide-slate-100">
                            {listaGastos.length > 0 ? (
                                listaGastos.map(g => (
                                    <tr key={g.id} className="hover:bg-slate-50">
                                        <td className="py-2.5 pr-2 text-slate-900 break-words">{g.descripcion}</td>
                                        <td className="py-2.5 px-2 text-right font-bold text-red-500 whitespace-nowrap">
                                            -${(g.monto || 0).toFixed(2)}
                                        </td>
                                        <td className="py-2.5 pl-2 text-right w-12">
                                            <button
                                                type="button"
                                                onClick={() => onEliminarGasto(g.id)}
                                                className="min-w-[44px] min-h-[40px] text-slate-400 hover:text-red-500 font-bold px-2 py-1 rounded hover:bg-red-50 inline-flex items-center justify-center"
                                                aria-label="Eliminar gasto"
                                            >
                                                &times;
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" className="text-center text-slate-500 py-4 text-xs">
                                        Sin gastos registrados hoy
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* INGRESOS EXTRAS */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col">
                <h2 className="font-bold text-base sm:text-lg mb-2 text-slate-900">Ingresos Extras</h2>
                <form onSubmit={onRegistrarIngreso} className="space-y-2 mb-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            placeholder="Descripción (solo texto)"
                            className="flex-1 min-h-[48px] px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-orange-500"
                            value={descIngreso}
                            onChange={onDescIngresoChange}
                        />
                        <div className="flex gap-2">
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="Monto 0.00"
                                className="flex-1 sm:w-28 min-h-[48px] px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-orange-500"
                                value={montoIngreso}
                                onChange={onMontoIngresoChange}
                            />
                            <button
                                type="submit"
                                disabled={!esIngresoValido || guardandoIngreso}
                                className={`min-h-[48px] min-w-[44px] px-4 py-2.5 rounded-lg font-bold text-sm shrink-0 transition flex items-center justify-center gap-1.5 ${
                                    esIngresoValido && !guardandoIngreso
                                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                            >
                                {guardandoIngreso && (
                                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />
                                )}
                                <span>{guardandoIngreso ? 'Guardando...' : 'Guardar Ingreso'}</span>
                            </button>
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                        {esIngresoValido
                            ? 'Datos válidos. Presiona "Guardar Ingreso" para sumar a caja.'
                            : 'Ingresa una descripción en texto y un monto positivo mayor a $0.00 para habilitar el registro.'}
                    </p>
                </form>
                <div className="overflow-x-auto overflow-y-auto max-h-48 border-t border-slate-200 pt-1">
                    <table className="w-full text-sm">
                        <tbody className="divide-y divide-slate-100">
                            {listaIngresos.length > 0 ? (
                                listaIngresos.map(i => (
                                    <tr key={i.id} className="hover:bg-slate-50">
                                        <td className="py-2.5 pr-2 text-slate-900 break-words">{i.descripcion}</td>
                                        <td className="py-2.5 px-2 text-right font-bold text-emerald-600 whitespace-nowrap">
                                            +${(i.monto || 0).toFixed(2)}
                                        </td>
                                        <td className="py-2.5 pl-2 text-right w-12">
                                            <button
                                                type="button"
                                                onClick={() => onSolicitarEliminarIngreso(i.id)}
                                                className="min-w-[44px] min-h-[40px] text-slate-400 hover:text-red-500 font-bold px-2 py-1 rounded hover:bg-red-50 inline-flex items-center justify-center"
                                                aria-label="Eliminar ingreso extra"
                                            >
                                                &times;
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" className="text-center text-slate-500 py-4 text-xs">
                                        Sin ingresos extras registrados hoy
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
});

export default GastosEIngresos;
