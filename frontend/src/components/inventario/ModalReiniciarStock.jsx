import { useState, memo } from 'react';

const ModalReiniciarStock = memo(function ModalReiniciarStock({
    abierto,
    onCerrar,
    onConfirmar,
    ejecutando
}) {
    const [texto, setTexto] = useState('');

    if (!abierto) return null;

    const palabraClave = 'REINICIAR';
    const esValido = texto.trim() === palabraClave;

    const handleConfirmar = (e) => {
        e.preventDefault();
        if (esValido && !ejecutando) {
            onConfirmar();
        }
    };

    return (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-line">
                <div className="p-5 sm:p-6 bg-danger-soft border-b border-danger/30 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-danger text-white flex items-center justify-center shrink-0 font-black text-lg">
                        !
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-ink leading-snug">
                            ¿Restablecer todo el inventario a 0?
                        </h3>
                        <p className="text-xs text-danger-ink mt-1 font-medium">
                            Acción crítica de inicio de jornada o reinicio de stock diario.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleConfirmar} className="p-5 sm:p-6 space-y-4">
                    <div className="text-xs sm:text-sm text-ink-muted space-y-2 leading-relaxed">
                        <p>
                            Esta operación pondrá el <strong>stock en 0</strong> de todos los platos principales del menú para que puedas iniciar el conteo diario desde cero.
                        </p>
                        <p className="bg-warning-soft text-warning-ink p-2.5 rounded-lg border border-warning/40 text-xs">
                            <strong>Aviso operativo:</strong> Todos los platillos pasarán automáticamente al estado <strong>Agotado</strong> en Caja hasta que ingreses las cantidades disponibles.
                        </p>
                    </div>

                    <div className="space-y-1.5 pt-1">
                        <label className="block text-xs font-bold text-ink">
                            Para confirmar, escribe la palabra <span className="text-danger-ink font-black">{palabraClave}</span>:
                        </label>
                        <input
                            type="text"
                            autoFocus
                            placeholder="Escribe REINICIAR"
                            value={texto}
                            onChange={(e) => setTexto(e.target.value.toUpperCase())}
                            className="w-full text-center tracking-widest font-black text-ink bg-surface border-2 border-line rounded-xl px-4 py-3 outline-none focus:border-danger focus:ring-2 focus:ring-danger/20 uppercase text-sm sm:text-base min-h-[48px]"
                        />
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-3">
                        <button
                            type="button"
                            onClick={() => {
                                setTexto('');
                                onCerrar();
                            }}
                            disabled={ejecutando}
                            className="w-full sm:flex-1 py-3 px-4 bg-surface border border-line hover:bg-app text-ink font-bold rounded-xl text-sm transition min-h-[48px]"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!esValido || ejecutando}
                            className={`w-full sm:flex-1 py-3 px-4 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 min-h-[48px] ${
                                esValido && !ejecutando
                                    ? 'bg-danger hover:opacity-90 text-white shadow-md active:scale-[0.98]'
                                    : 'bg-surface-muted text-ink-muted cursor-not-allowed'
                            }`}
                        >
                            {ejecutando ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Reiniciando...</span>
                                </>
                            ) : (
                                <span>Poner todo en 0</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
});

export default ModalReiniciarStock;
