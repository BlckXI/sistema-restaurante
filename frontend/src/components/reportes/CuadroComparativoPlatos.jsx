import { memo } from 'react';

const CuadroComparativoPlatos = memo(function CuadroComparativoPlatos({ platosDia }) {
    return (
        <div className="bg-surface rounded-xl shadow-sm border border-line p-4 sm:p-5">
            <h2 className="font-bold text-base sm:text-lg mb-4 text-ink">
                Platos del Día (Movimiento de Inventario)
            </h2>

            {/* VISTA TARJETAS EN MÓVIL (< sm) */}
            <div className="sm:hidden space-y-2.5">
                {platosDia.length > 0 ? (
                    platosDia.map((p, idx) => (
                        <div key={idx} className="p-3 rounded-lg border border-line bg-app">
                            <p className="font-bold text-ink text-sm mb-2">{p.nombre}</p>
                            <div className="grid grid-cols-4 gap-1 text-center text-xs bg-surface p-2 rounded border border-line tabular-nums">
                                <div>
                                    <span className="text-[10px] text-ink-muted block uppercase">Inicial</span>
                                    <span className="font-semibold text-ink">{p.inicial || 0}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-brand-text block uppercase font-bold">Vendidos</span>
                                    <span className="font-bold text-brand-text">{p.vendidos || 0}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-info-ink block uppercase">Personal</span>
                                    <span className="font-semibold text-info-ink">{p.consumo || 0}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-success-ink block uppercase font-bold">Final</span>
                                    <span className="font-bold text-success-ink">{p.final || 0}</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="py-4 text-center text-ink-muted italic text-xs">
                        No hay movimientos registrados hoy.
                    </p>
                )}
            </div>

            {/* VISTA TABLA CON SCROLL HORIZONTAL ENCAPSULADO (>= sm) */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm text-center min-w-[480px] tabular-nums">
                    <thead className="bg-surface-muted text-ink border-b border-line">
                        <tr>
                            <th className="py-2.5 px-4 text-left rounded-tl-lg">Plato</th>
                            <th className="py-2.5 px-4">Inicial</th>
                            <th className="py-2.5 px-4">Vendidos</th>
                            <th className="py-2.5 px-4">Consumo Personal</th>
                            <th className="py-2.5 px-4 rounded-tr-lg">Final</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                        {platosDia.length > 0 ? (
                            platosDia.map((p, idx) => (
                                <tr key={idx} className="hover:bg-app">
                                    <td className="py-2.5 px-4 text-left font-medium text-ink">{p.nombre}</td>
                                    <td className="py-2.5 px-4 text-ink-muted">{p.inicial || 0}</td>
                                    <td className="py-2.5 px-4 text-brand-text font-bold">{p.vendidos || 0}</td>
                                    <td className="py-2.5 px-4 text-info-ink font-medium">{p.consumo || 0}</td>
                                    <td className="py-2.5 px-4 font-bold text-success-ink">{p.final || 0}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="py-6 text-ink-muted italic">
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
