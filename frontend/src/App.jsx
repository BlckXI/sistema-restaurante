import { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './api/authService';
import MainLayout from './components/layout/MainLayout';

// Lazy Loading de las vistas principales para optimizar el tamaño del bundle inicial
const Cajero = lazy(() => import('./Cajero'));
const Cocina = lazy(() => import('./Cocina'));
const Reportes = lazy(() => import('./Reportes'));
const Inventario = lazy(() => import('./Inventario'));
const Repartidor = lazy(() => import('./Repartidor'));
const Login = lazy(() => import('./Login'));

function RouteLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-500">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
      <span className="text-sm font-medium">Cargando módulo...</span>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentSession = authService.getSession();
    setSession(currentSession);
    setLoading(false);

    const unsubscribe = authService.onSessionChange((newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const cerrarSesion = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    } finally {
      setSession(null);
    }
  };

  if (loading) return <div className="h-screen bg-slate-50 flex items-center justify-center text-slate-500 animate-pulse">Cargando sistema...</div>;

  return (
    <HashRouter>
      {!session ? (
        <Suspense fallback={<div className="h-screen bg-slate-800 flex items-center justify-center text-slate-300">Cargando acceso...</div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      ) : (
        <MainLayout onLogout={cerrarSesion}>
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route path="/" element={<Cajero />} />
              <Route path="/cocina" element={<Cocina />} />
              <Route path="/repartidor" element={<Repartidor />} />
              <Route path="/inventario" element={<Inventario />} />
              <Route path="/reportes" element={<Reportes />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </MainLayout>
      )}
    </HashRouter>
  );
}

export default App;