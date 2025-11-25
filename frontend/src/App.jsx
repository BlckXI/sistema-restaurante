import { useState, useEffect } from 'react';
// CAMBIO IMPORTANTE: Usamos HashRouter en lugar de BrowserRouter
import { HashRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Importamos las vistas
import Cajero from './Cajero';
import Cocina from './Cocina';
import Reportes from './Reportes';
import Inventario from './Inventario';
import Repartidor from './Repartidor';
import Login from './Login';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Verificar sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Escuchar cambios (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- FUNCIÓN DE LOGOUT BLINDADA ---
  const cerrarSesion = async () => {
    try {
        // Intentamos cerrar en el servidor
        const { error } = await supabase.auth.signOut();
        if (error) console.warn("Aviso al cerrar sesión:", error.message);
    } catch (error) {
        console.error("Error crítico cerrando sesión:", error);
    } finally {
        // PASE LO QUE PASE, borramos la sesión local y forzamos la salida
        setSession(null);
        localStorage.clear(); // Limpieza extra de seguridad
        window.location.href = '/'; // Recarga forzada para limpiar estados de memoria
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-gray-500 animate-pulse">Cargando sistema...</div>;

  return (
    // CAMBIO IMPORTANTE: Envolvemos todo en HashRouter
    <HashRouter>
      <div className="min-h-screen bg-gray-100 font-sans">
        
        {!session ? (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        ) : (
          <>
            <nav className="bg-slate-800 text-white p-4 shadow-md sticky top-0 z-50">
              <div className="container mx-auto flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🍔</span>
                    <h1 className="text-xl font-bold hidden md:block">Monte Sion Variedades</h1>
                </div>
                
                <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 text-sm font-medium scrollbar-hide">
                  <Link to="/" className="px-3 py-2 hover:bg-slate-700 rounded text-yellow-300">💰 Caja</Link>
                  <Link to="/cocina" className="px-3 py-2 hover:bg-slate-700 rounded">👨‍🍳 Cocina</Link>
                  <Link to="/repartidor" className="px-3 py-2 hover:bg-slate-700 rounded">🛵 Repartidor</Link>
                  <Link to="/inventario" className="px-3 py-2 hover:bg-slate-700 rounded">📦 Inventariok</Link>
                  <Link to="/reportes" className="px-3 py-2 hover:bg-slate-700 rounded">📊 Reporte</Link>
                  
                  <button onClick={cerrarSesion} className="ml-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-white font-bold text-xs transition">
                    SALIR
                  </button>
                </div>
              </div>
            </nav>

            <div className="container mx-auto p-4">
              <Routes>
                <Route path="/" element={<Cajero />} />
                <Route path="/cocina" element={<Cocina />} />
                <Route path="/repartidor" element={<Repartidor />} />
                <Route path="/inventario" element={<Inventario />} />
                <Route path="/reportes" element={<Reportes />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </>
        )}
      </div>
    </HashRouter>
  );
}

export default App;