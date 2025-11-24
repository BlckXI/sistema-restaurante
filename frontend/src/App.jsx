import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Cajero from './Cajero';
import Cocina from './Cocina';
import Reportes from './Reportes';
import Inventario from './Inventario';
import Repartidor from './Repartidor';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100 font-sans">
        
        <nav className="bg-slate-800 text-white p-4 shadow-md sticky top-0 z-50">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
                <span className="text-2xl">🍔</span>
                <h1 className="text-xl font-bold hidden md:block">Monte Sion Variedades</h1>
            </div>
            <div className="space-x-1 md:space-x-4 flex text-sm md:text-base">
              <Link to="/" className="px-3 py-2 rounded hover:bg-slate-700 hover:text-yellow-400 transition">💰 Caja</Link>
              <Link to="/cocina" className="px-3 py-2 rounded hover:bg-slate-700 hover:text-yellow-400 transition">👨‍🍳 Cocina</Link>
              <Link to="/repartidor" className="px-3 py-2 rounded hover:bg-slate-700 hover:text-yellow-400 transition">🛵 Repartidor</Link>
              <Link to="/reportes" className="px-3 py-2 rounded hover:bg-slate-700 hover:text-yellow-400 transition">📊 Reportes</Link>
              <Link to="/inventario" className="px-3 py-2 rounded hover:bg-slate-700 hover:text-yellow-400 transition">📦 Inventario</Link>
            </div>
          </div>
        </nav>

        <div className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<Cajero />} />
            <Route path="/cocina" element={<Cocina />} />
            <Route path="/reportes" element={<Reportes />} /> {}
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/repartidor" element={<Repartidor />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;