import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient'; // Importamos el cliente

// Importamos las vistas
import Cajero from './Cajero';
import Cocina from './Cocina';
import Reportes from './Reportes';
import Inventario from './Inventario';
import Repartidor from './Repartidor';
import Login from './Login'; // <--- Importamos Login

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Verificar sesión actual al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Escuchar cambios (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-gray-500">Cargando sistema...</div>;

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100 font-sans">
        
        {/* Si NO hay sesión, mostramos SOLO las rutas públicas (Login) */}
        {!session ? (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        ) : (
          /* Si HAY sesión, mostramos la App completa */
          <>
            <nav className="bg-slate-800 text-white p-4 shadow-md sticky top-0 z-50">
              <div className="container mx-auto flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🍔</span>
                    <h1 className="text-xl font-bold hidden md:block">Variedades Monte Sion</h1>
                </div>
                
                {/* Menú de Navegación */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 text-sm font-medium scrollbar-hide">
                  <Link to="/" className="px-3 py-2 hover:bg-slate-700 rounded text-yellow-300">💰 Caja</Link>
                  <Link to="/cocina" className="px-3 py-2 hover:bg-slate-700 rounded">👨‍🍳 Cocina</Link>
                  <Link to="/repartidor" className="px-3 py-2 hover:bg-slate-700 rounded">🛵 Moto</Link>
                  <Link to="/inventario" className="px-3 py-2 hover:bg-slate-700 rounded">📦 Stock</Link>
                  <Link to="/reportes" className="px-3 py-2 hover:bg-slate-700 rounded">📊 Finanzas</Link>
                  
                  {/* Botón Salir */}
                  <button onClick={cerrarSesion} className="ml-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-white font-bold text-xs">
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
    </BrowserRouter>
  );
}

export default App;