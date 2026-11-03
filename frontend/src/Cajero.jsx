import { useCaja } from './hooks/useCaja';
import MenuGrid from './components/caja/MenuGrid';
import FormularioCliente from './components/caja/FormularioCliente';
import ResumenOrden from './components/caja/ResumenOrden';

export default function Cajero() {
    const {
        categorias,
        platosFiltrados,
        carrito,
        clientesActivos,
        cargandoMenu,
        busqueda,
        setBusqueda,
        categoriaSeleccionada,
        setCategoriaSeleccionada,
        cliente,
        horaProgramada,
        setHoraProgramada,
        comentarios,
        esDomicilio,
        esPersonal,
        tipoEntregaActual,
        seleccionarTipoEntrega,
        esTransferencia,
        setEsTransferencia,
        direccion,
        setDireccion,
        telefono,
        modalClientes,
        setModalClientes,
        esExtra,
        enviando,
        errores,
        notificacion,
        subtotal,
        total,
        obtenerStockVisual,
        seleccionarClienteActivo,
        agregarPlato,
        quitarPlato,
        handleNombreChange,
        handleComentariosChange,
        handleTelefonoChange,
        cancelarModoExtra,
        procesarOrden
    } = useCaja();

    return (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-stretch lg:items-start relative w-full">
            {modalClientes && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-line">
                        <div className="bg-surface-muted px-4 py-3.5 flex justify-between items-center border-b border-line">
                            <h3 className="text-ink font-bold text-base sm:text-lg">Clientes Atendidos Hoy</h3>
                            <button
                                type="button"
                                onClick={() => setModalClientes(false)}
                                className="min-w-[44px] min-h-[44px] text-ink-muted hover:text-ink text-2xl leading-none px-2 hover:bg-surface rounded flex items-center justify-center"
                            >
                                &times;
                            </button>
                        </div>
                        <div className="p-4 max-h-80 overflow-y-auto space-y-2">
                            {clientesActivos.length === 0 && (
                                <p className="text-center text-ink-muted py-4 text-sm">No hay clientes activos.</p>
                            )}
                            {clientesActivos.map((c, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => seleccionarClienteActivo(c)}
                                    className="w-full min-h-[48px] text-left p-3 rounded-lg bg-app border border-line hover:border-brand-accent flex justify-between items-center group transition"
                                >
                                    <div className="min-w-0 pr-2">
                                        <p className="font-bold text-ink truncate">{c.nombre}</p>
                                        <p className="text-xs text-ink-muted uppercase">{c.tipo}</p>
                                    </div>
                                    <span className="bg-brand text-white text-xs font-bold px-2.5 py-1.5 rounded shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        + Agregar
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {notificacion && (
                <div
                    className={`fixed top-16 sm:top-5 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-xl shadow-xl z-50 font-bold text-sm sm:text-base max-w-[90vw] text-center text-white ${
                        notificacion.tipo === 'error' ? 'bg-danger' : 'bg-success'
                    }`}
                >
                    {notificacion.mensaje}
                </div>
            )}

            <MenuGrid
                busqueda={busqueda}
                onBusquedaChange={setBusqueda}
                categoriaSeleccionada={categoriaSeleccionada}
                onCategoriaChange={setCategoriaSeleccionada}
                categorias={categorias}
                platosFiltrados={platosFiltrados}
                cargandoMenu={cargandoMenu}
                obtenerStockVisual={obtenerStockVisual}
                onAgregarPlato={agregarPlato}
            />

            <div className="w-full lg:w-[390px] xl:w-[430px] shrink-0 bg-surface p-4 sm:p-5 rounded-xl shadow-sm border border-line flex flex-col">
                <FormularioCliente
                    cliente={cliente}
                    onNombreChange={handleNombreChange}
                    horaProgramada={horaProgramada}
                    onHoraChange={setHoraProgramada}
                    esExtra={esExtra}
                    onCancelarExtra={cancelarModoExtra}
                    onAbrirClientesActivos={() => setModalClientes(true)}
                    tipoEntregaActual={tipoEntregaActual}
                    onSeleccionarTipoEntrega={seleccionarTipoEntrega}
                    esDomicilio={esDomicilio}
                    direccion={direccion}
                    onDireccionChange={setDireccion}
                    telefono={telefono}
                    onTelefonoChange={handleTelefonoChange}
                    errores={errores}
                />

                <ResumenOrden
                    carrito={carrito}
                    errores={errores}
                    onAgregarPlato={agregarPlato}
                    onQuitarPlato={quitarPlato}
                    comentarios={comentarios}
                    onComentariosChange={handleComentariosChange}
                    esPersonal={esPersonal}
                    esTransferencia={esTransferencia}
                    onToggleTransferencia={() => setEsTransferencia(!esTransferencia)}
                    esDomicilio={esDomicilio}
                    esExtra={esExtra}
                    subtotal={subtotal}
                    total={total}
                    enviando={enviando}
                    onProcesarOrden={procesarOrden}
                />
            </div>
        </div>
    );
}