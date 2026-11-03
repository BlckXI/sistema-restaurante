const OPCIONES = [
  { valor: 'sistema', etiqueta: 'Sistema' },
  { valor: 'claro', etiqueta: 'Claro' },
  { valor: 'oscuro', etiqueta: 'Oscuro' }
];

export default function SelectorTema({ preferencia, onElegir }) {
  return (
    <div
      role="group"
      aria-label="Tema de la interfaz"
      className="flex rounded-lg border border-line bg-surface-muted p-1 text-sm"
    >
      {OPCIONES.map(({ valor, etiqueta }) => (
        <button
          key={valor}
          type="button"
          aria-pressed={preferencia === valor}
          onClick={() => onElegir(valor)}
          className={`flex-1 rounded-md px-3 py-1.5 font-medium transition-colors ${
            preferencia === valor ? 'bg-brand text-white' : 'text-ink-muted hover:text-ink'
          }`}
        >
          {etiqueta}
        </button>
      ))}
    </div>
  );
}
