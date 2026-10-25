import { memo } from 'react';

const MenuPlatoCard = memo(function MenuPlatoCard({ plato, stock, atajoNumero, onAgregarPlato }) {
    return (
        <button
            type="button"
            onClick={() => onAgregarPlato(plato)}
            disabled={stock === 0}
            className={`p-3.5 sm:p-4 rounded-xl shadow-sm text-center border transition relative flex flex-col justify-between min-h-[132px] min-w-[44px] ${
                stock > 0
                    ? 'bg-white border-slate-200 hover:border-orange-500 hover:shadow-md active:scale-[0.98]'
                    : 'bg-slate-50 opacity-60 cursor-not-allowed border-slate-200'
            }`}
        >
            {atajoNumero && stock > 0 && (
                <span
                    className="hidden sm:inline-flex items-center justify-center absolute top-2 left-2 w-6 h-6 rounded-md bg-slate-800 text-white text-[11px] font-bold shadow-sm"
                    title={`Atajo de teclado: tecla ${atajoNumero} o Alt+${atajoNumero}`}
                >
                    {atajoNumero}
                </span>
            )}
            <div className="w-full pt-1">
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug mb-1 break-words line-clamp-2 px-2">
                    {plato.nombre}
                </h3>
                {plato.id_padre && (
                    <span className="text-[10px] bg-sky-500 text-white px-1.5 py-0.5 rounded mb-1 inline-block font-semibold">
                        Porción
                    </span>
                )}
                <p className="text-[11px] text-slate-500 mb-1.5 truncate">{plato.categoria}</p>
            </div>
            <div className="w-full pt-1.5 border-t border-slate-100">
                <p className="text-slate-900 font-bold text-base sm:text-lg leading-tight">
                    ${plato.precio.toFixed(2)}
                </p>
                <div
                    className={`mt-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block ${
                        stock === 0
                            ? 'bg-red-500 text-white'
                            : stock < 5
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-500 text-white'
                    }`}
                >
                    {stock === 0 ? 'AGOTADO' : `Stock: ${stock}`}
                </div>
            </div>
        </button>
    );
});

const MenuGrid = memo(function MenuGrid({
    busqueda,
    onBusquedaChange,
    categoriaSeleccionada,
    onCategoriaChange,
    categorias,
    platosFiltrados,
    cargandoMenu = false,
    obtenerStockVisual,
    onAgregarPlato
}) {
    return (
        <div className="w-full lg:flex-1 bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:max-h-[calc(100vh-110px)] min-w-0">
            <div className="mb-3 flex flex-col sm:flex-row gap-2.5 border-b border-slate-200 pb-3.5">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="Buscar plato..."
                        className="w-full min-h-[48px] px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                        value={busqueda}
                        onChange={e => onBusquedaChange(e.target.value)}
                    />
                </div>

                <select
                    className="min-h-[48px] px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm text-slate-900 sm:w-52 focus:ring-2 focus:ring-orange-500 outline-none"
                    value={categoriaSeleccionada}
                    onChange={e => onCategoriaChange(e.target.value)}
                >
                    <option value="">Todas las categorías</option>
                    {categorias.map(cat => (
                        <option key={cat.id} value={cat.nombre}>
                            {cat.nombre}
                        </option>
                    ))}
                </select>
            </div>

            <div className="hidden sm:flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 mb-3">
                <span>Atajos rápidos de teclado para cajero:</span>
                <div className="flex items-center gap-3 font-semibold text-slate-900">
                    <span>[1-9] Agregar plato</span>
                    <span>[Ctrl+Enter] Confirmar pedido</span>
                    <span>[Esc] Limpiar</span>
                </div>
            </div>

            <div className="overflow-y-auto flex-1 max-h-[52vh] lg:max-h-none pr-0.5">
                {cargandoMenu ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-2.5 sm:gap-3.5">
                        {[1, 2, 3, 4, 5, 6].map(item => (
                            <div
                                key={item}
                                className="p-4 rounded-xl border border-slate-200 bg-slate-50 animate-pulse min-h-[132px] flex flex-col justify-between"
                            >
                                <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto" />
                                <div className="h-3 bg-slate-200 rounded w-1/2 mx-auto" />
                                <div className="h-6 bg-slate-200 rounded w-1/3 mx-auto" />
                            </div>
                        ))}
                    </div>
                ) : platosFiltrados.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-sm">No se encontraron platos disponibles.</div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-2.5 sm:gap-3.5">
                        {platosFiltrados.map((plato, idx) => (
                            <MenuPlatoCard
                                key={plato.id}
                                plato={plato}
                                stock={obtenerStockVisual(plato)}
                                atajoNumero={idx < 9 ? idx + 1 : null}
                                onAgregarPlato={onAgregarPlato}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});

export default MenuGrid;
