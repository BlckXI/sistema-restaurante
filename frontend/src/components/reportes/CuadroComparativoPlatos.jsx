import { memo } from 'react';

const CuadroComparativoPlatos = memo(function CuadroComparativoPlatos({ platosDia }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5">
            <h2 className="font-bold text-base sm:text-lg mb-4 text-slate-900">
                Platos del Día (Movimiento de Inventario)
            </h2>

            {/* VISTA TARJETAS EN MÓVIL (< sm) */}
            <div className="sm:hidden space-y-2.5">
                {platosDia.length > 0 ? (
                    platosDia.map((p, idx) => (
                        <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                            <p className="font-bold text-slate-900 text-sm mb-2">{p.nombre}</p>
                            <div className="grid grid-cols-4 gap-1 text-center text-xs bg-white p-2 rounded border border-slate-200">
                                <div>
                                    <span className="text-[10px] text-slate-500 block uppercase">Inicial</span>
                                    <span className="font-semibold text-slate-900">{p.inicial || 0}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-orange-600 block uppercase font-bold">Vendidos</span>
                                    <span className="font-bold text-orange-600">{p.vendidos || 0}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-sky-600 block uppercase">Personal</span>
                                    <span className="font-semibold text-sky-600">{p.consumo || 0}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-emerald-600 block uppercase font-bold">Final</span>
                                    <span className="font-bold text-emerald-600">{p.final || 0}</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="py-4 text-center text-slate-500 italic text-xs">
                        No hay movimientos registrados hoy.
                    </p>
                )}
            </div>

            {/* VISTA TABLA CON SCROLL HORIZONTAL ENCAPSULADO (>= sm) */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm text-center min-w-[480px]">
                    <thead className="bg-slate-800 text-white">
                        <tr>
                            <th className="py-2.5 px-4 text-left rounded-l-lg">Plato</th>
                            <th className="py-2.5 px-4">Inicial</th>
                            <th className="py-2.5 px-4">Vendidos</th>
                            <th className="py-2.5 px-4">Consumo Personal</th>
                            <th className="py-2.5 px-4 rounded-r-lg">Final</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {platosDia.length > 0 ? (
                            platosDia.map((p, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="py-2.5 px-4 text-left font-medium text-slate-900">{p.nombre}</td>
                                    <td className="py-2.5 px-4 text-slate-500">{p.inicial || 0}</td>
                                    <td className="py-2.5 px-4 text-orange-600 font-bold">{p.vendidos || 0}</td>
                                    <td className="py-2.5 px-4 text-sky-600 font-medium">{p.consumo || 0}</td>
                                    <td className="py-2.5 px-4 font-bold text-emerald-600">{p.final || 0}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="py-6 text-slate-500 italic">
                                    No hay movimientos registrados hoy.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

export default CuadroComparativoPlatos;
