import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Items de navegación principal con iconos SVG limpios (sin emojis)
 */
const NAV_ITEMS = [
  {
    path: '/',
    label: 'Caja',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
  {
    path: '/cocina',
    label: 'Cocina',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    )
  },
  {
    path: '/repartidor',
    label: 'Repartidor',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0 2 2 0 00-4 0zm10 0a2 2 0 104 0 2 2 0 00-4 0z" />
      </svg>
    )
  },
  {
    path: '/inventario',
    label: 'Inventario',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    )
  },
  {
    path: '/reportes',
    label: 'Reporte',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  }
];

/**
 * MainLayout: Contenedor general responsivo (Mobile First).
 * - Menú izquierdo retraíble (Drawer oculto por defecto) para no ocupar espacio en pantalla.
 * - En móvil (< md): Barra inferior (Bottom Nav) fija además del menú desplegable.
 */
export default function MainLayout({ children, onLogout }) {
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const location = useLocation();

  const getTituloActual = () => {
    const itemActual = NAV_ITEMS.find(item => item.path === location.pathname);
    return itemActual ? itemActual.label : "D' La Casa";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* --- FONDO OSCURO (BACKDROP) CUANDO EL SIDEBAR ESTÁ ABIERTO --- */}
      {sidebarAbierto && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setSidebarAbierto(false)}
          aria-hidden="true"
        />
      )}

      {/* --- SIDEBAR RETRAÍBLE IZQUIERDO (OCULTO POR DEFECTO) --- */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-slate-800 text-white z-50 border-r border-slate-700 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          sidebarAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Menú lateral"
      >
        {/* Cabecera del Sidebar con botón para ocultar */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center font-black text-white text-lg shadow-md">
              D
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white leading-tight">D' La Casa</h1>
              <p className="text-[11px] text-slate-400 font-medium">Gestión de Restaurante</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSidebarAbierto(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
            aria-label="Ocultar menú"
            title="Ocultar menú"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Lista de Navegación Vertical */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const activo = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarAbierto(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  activo
                    ? 'bg-orange-500 text-white font-bold shadow-md'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className={activo ? 'text-white' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Pie del Sidebar: Cerrar Sesión */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/40">
          <button
            type="button"
            onClick={() => {
              setSidebarAbierto(false);
              onLogout();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-sm transition shadow"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* --- ÁREA PRINCIPAL (100% DEL ANCHO DE PANTALLA) --- */}
      <div className="flex-1 flex flex-col w-full min-w-0">
        {/* Barra Superior con botón para desplegar el menú */}
        <header className="bg-slate-800 text-white sticky top-0 z-30 shadow-md">
          <div className="px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Botón para abrir/retraer el menú izquierdo */}
              <button
                type="button"
                onClick={() => setSidebarAbierto(true)}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white transition flex items-center justify-center"
                aria-label="Abrir menú de navegación"
                title="Abrir menú"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center font-black text-white text-sm">
                  D
                </span>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block leading-none">
                    D' La Casa
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
                    {getTituloActual()}
                  </h2>
                </div>
              </div>
            </div>

            {/* Botón Salir Rápido */}
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg text-xs transition"
              aria-label="Cerrar Sesión"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Salir</span>
            </button>
          </div>
        </header>

        {/* Contenedor del contenido ocupando todo el ancho disponible */}
        <main className="flex-1 p-2 sm:p-4 md:p-6 pb-20 md:pb-6 overflow-x-hidden w-full">
          {children}
        </main>

        {/* --- BOTTOM NAVIGATION BAR MÓVIL (md:hidden) --- */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-800 border-t border-slate-700 shadow-2xl safe-area-bottom"
          aria-label="Navegación Móvil"
        >
          <div className="grid grid-cols-5 h-16">
            {NAV_ITEMS.map((item) => {
              const activo = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center py-1 px-1 transition-colors relative ${
                    activo
                      ? 'text-orange-500 font-bold bg-slate-900/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {activo && (
                    <span className="absolute top-0 inset-x-3 h-0.5 bg-orange-500 rounded-full" />
                  )}
                  <div className="p-1">
                    {item.icon}
                  </div>
                  <span className="text-[11px] leading-none mt-0.5 tracking-tight truncate max-w-full">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
