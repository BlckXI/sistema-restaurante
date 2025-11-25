import { useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault(); // 1. ESTO DEBE IR PRIMERO SIEMPRE
    setCargando(true);

    try {
      // Intentamos iniciar sesión con la llave correcta que ya pusiste
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error; // Si Supabase da error, saltamos al catch

      // Si todo sale bien:
      navigate('/'); 
      
    } catch (error) {
      console.error("Error de Login:", error);
      // Mostramos el mensaje real para saber qué pasa
      alert(error.message === "Invalid login credentials" 
        ? "Correo o contraseña incorrectos" 
        : "Error: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
            <span className="text-4xl">🍔</span>
            <h1 className="text-2xl font-bold text-gray-800 mt-2">Variedades Monte Sion</h1>
            <p className="text-gray-500 text-sm">Acceso exclusivo para personal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Correo</label>
            <input
              type="email"
              placeholder="admin@restaurante.com"
              className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 transition shadow-lg"
          >
            {cargando ? 'Verificando...' : 'ENTRAR AL SISTEMA'}
          </button>
        </form>
      </div>
    </div>
  );
}