import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from './api/authService';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensajeError, setMensajeError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensajeError('');

    try {
      await authService.login(email, password);
      navigate('/');
    } catch (error) {
      const msg = error?.response?.data?.error || error.message || 'Error al iniciar sesión';
      setMensajeError(
        msg === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos'
          : msg
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center font-black text-white text-2xl shadow-md mx-auto mb-3">
            D
          </div>
          <h1 className="text-2xl font-bold text-slate-900">D&apos; La Casa</h1>
          <p className="text-slate-500 text-sm mt-1">Acceso exclusivo para personal</p>
        </div>
        {mensajeError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500 text-white text-sm font-medium text-center">
            {mensajeError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="login-email" className="block text-sm font-bold text-slate-900 mb-1">
              Correo
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="admin@restaurante.com"
              className="w-full p-3 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-bold text-slate-900 mb-1">
              Contraseña
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="w-full p-3 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition shadow-md"
          >
            {cargando ? 'Verificando...' : 'ENTRAR AL SISTEMA'}
          </button>
        </form>
      </div>
    </div>
  );
}