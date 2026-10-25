import { useReportes } from './hooks/useReportes';
import ResumenCaja from './components/reportes/ResumenCaja';
import GastosEIngresos from './components/reportes/GastosEIngresos';
import CuadroComparativoPlatos from './components/reportes/CuadroComparativoPlatos';
import HistorialMovimientos from './components/reportes/HistorialMovimientos';

export default function Reportes() {
    const {
        datos,
        cargando,
        descGasto,
        montoGasto,
        descIngreso,
        montoIngreso,
        esGastoValido,
        esIngresoValido,
        guardandoGasto,
        guardandoIngreso,
        procesandoCierre,
        puedeCerrarCaja,
        notificacion,
        modalCierre,
        setModalCierre,
        modalAnular,
        setModalAnular,
        ordenEnUndoAnular,
        deshacerAnulacion,
        modalEliminarIngreso,
        setModalEliminarIngreso,
        movimientosPaginados,
        metaPaginacion,
        paginaMovimientos,
        limiteMovimientos,
        cargandoMovimientos,
        cambiarPaginaMovimientos,
        cambiarLimiteMovimientos,
        listaGastosSegura,
        listaIngresosSegura,
        platosDia,
        saldoInicialUI,
        ventasEfectivoUI,
        totalIngresosExtrasUI,
        totalDomiciliosUI,
        pedidosDomicilio,
        totalGastosUI,
        totalBancoUI,
        cantidadTransferencias,
        totalEfectivoUI,
        generarPDF,
        handleDescGastoChange,
        handleMontoGastoChange,
        handleDescIngresoChange,
        handleMontoIngresoChange,
        registrarGasto,
        registrarIngreso,
        eliminarGasto,
        confirmarEliminarIngreso,
        ejecutarAnulacion,
        ejecutarCierre
    } = useReportes();

    if (cargando) {
        return (
            <div className="w-full max-w-7xl mx-auto space-y-5">
                <div className="bg-white p-5 rounded-xl border border-slate-200 animate-pulse space-y-4">
                    <div className="h-7 bg-slate-200 rounded w-1/4" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-20 bg-slate-100 rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }
    if (!datos) return <div className="p-10 text-center text-red-500 font-bold">Error: No se recibieron datos del servidor.</div>;

    return (
        <div className="w-full max-w-7xl mx-auto space-y-5 relative">
            {ordenEnUndoAnular && (
                <div className="fixed bottom-20 md:bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-slate-800 text-white px-5 py-3.5 rounded-xl shadow-2xl border border-slate-600 flex items-center justify-between gap-4 w-[92vw] max-w-md">
                    <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-white truncate">
                            Anulando orden #{ordenEnUndoAnular.numero_diario || ordenEnUndoAnular.id} ({ordenEnUndoAnular.cliente})
                        </p>
                        <p className="text-[11px] text-slate-300">Tienes 3 segundos para deshacer antes de devolver stock</p>
                    </div>
                    <button
                        type="button"
                        onClick={deshacerAnulacion}
                        className="min-h-[44px] min-w-[44px] px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm rounded-lg shrink-0 shadow transition"
                    >
                        DESHACER
                    </button>
                </div>
            )}

            {modalEliminarIngreso && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm text-center border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-900">¿Eliminar Ingreso Extra?</h3>
                        <p className="text-xs text-slate-500 mt-1">Esta acción actualizará el saldo de caja.</p>
                        <div className="flex gap-3 mt-5 justify-center">
                            <button
                                type="button"
                                onClick={() => setModalEliminarIngreso(null)}
                                className="flex-1 min-h-[48px] px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-bold rounded-lg text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmarEliminarIngreso}
                                className="flex-1 min-h-[48px] px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-sm"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {modalAnular && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm text-center border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-900">¿Anular Orden?</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            El stock de los platos será devuelto automáticamente al inventario tras 3 segundos.
                        </p>
                        <div className="flex gap-3 mt-5 justify-center">
                            <button
                                type="button"
                                onClick={() => setModalAnular(null)}
                                className="flex-1 min-h-[48px] px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-bold rounded-lg text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={ejecutarAnulacion}
                                className="flex-1 min-h-[48px] px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-sm"
                            >
                                Sí, Anular
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {modalCierre && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm text-center border border-slate-200">
                        <h3 className="text-xl font-bold text-slate-900">Cierre de Caja (Efectivo)</h3>
                        <p className="text-3xl font-black my-4 text-orange-500">${totalEfectivoUI.toFixed(2)}</p>
                        <p className="text-xs text-slate-500 mb-5">
                            Este monto quedará guardado como saldo inicial para el siguiente turno.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                type="button"
                                onClick={() => setModalCierre(false)}
                                disabled={procesandoCierre}
                                className="flex-1 min-h-[48px] px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-bold rounded-lg text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={ejecutarCierre}
                                disabled={!puedeCerrarCaja}
                                className="flex-1 min-h-[48px] px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-sm shadow-md flex items-center justify-center gap-2"
                            >
                                {procesandoCierre && (
                                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />
                                )}
                                <span>{procesandoCierre ? 'Cerrando...' : 'Confirmar'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {notificacion && (
                <div
                    className={`fixed top-16 sm:top-5 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-xl shadow-xl z-50 font-bold text-sm max-w-[90vw] text-center text-white ${
                        notificacion.tipo === 'error'
                            ? 'bg-red-500'
                            : notificacion.tipo === 'info'
                              ? 'bg-sky-500'
                              : 'bg-emerald-500'
                    }`}
                >
                    {notificacion.mensaje}
                </div>
            )}

            <ResumenCaja
                saldoInicial={saldoInicialUI}
                ventasEfectivo={ventasEfectivoUI}
                totalIngresosExtras={totalIngresosExtrasUI}
                totalDomicilios={totalDomiciliosUI}
                pedidosDomicilio={pedidosDomicilio}
                totalGastos={totalGastosUI}
                totalBanco={totalBancoUI}
                cantidadTransferencias={cantidadTransferencias}
                totalEfectivo={totalEfectivoUI}
                puedeCerrarCaja={puedeCerrarCaja}
                procesandoCierre={procesandoCierre}
                onAbrirModalCierre={() => setModalCierre(true)}
                onGenerarPDF={generarPDF}
            />

            <GastosEIngresos
                descGasto={descGasto}
                onDescGastoChange={handleDescGastoChange}
                montoGasto={montoGasto}
                onMontoGastoChange={handleMontoGastoChange}
                esGastoValido={esGastoValido}
                guardandoGasto={guardandoGasto}
                onRegistrarGasto={registrarGasto}
                listaGastos={listaGastosSegura}
                onEliminarGasto={eliminarGasto}
                descIngreso={descIngreso}
                onDescIngresoChange={handleDescIngresoChange}
                montoIngreso={montoIngreso}
                onMontoIngresoChange={handleMontoIngresoChange}
                esIngresoValido={esIngresoValido}
                guardandoIngreso={guardandoIngreso}
                onRegistrarIngreso={registrarIngreso}
                listaIngresos={listaIngresosSegura}
                onSolicitarEliminarIngreso={setModalEliminarIngreso}
            />

            <CuadroComparativoPlatos platosDia={platosDia} />

            <HistorialMovimientos
                listaOrdenes={movimientosPaginados}
                totalAnulado={datos.totalAnulado}
                onSolicitarAnularOrden={setModalAnular}
                paginacion={metaPaginacion}
                paginaActual={paginaMovimientos}
                limitePorPagina={limiteMovimientos}
                cargandoPagina={cargandoMovimientos}
                onCambiarPagina={cambiarPaginaMovimientos}
                onCambiarLimite={cambiarLimiteMovimientos}
            />
        </div>
    );
}