import { useState, useEffect } from 'react';
import axios from 'axios';

const URL_BACKEND = 'https://api-restaurante-yawj.onrender.com'; // CAMBIAR A TU URL DE RENDER EN PRODUCCIÓN

export default function Inventario() {
  // --- ESTADOS DE DATOS ---
  const [platos, setPlatos] = useState([]);
  const [categorias, setCategorias] = useState([]); 

  // --- ESTADOS DE FILTRO ---
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  // --- ESTADOS FORMULARIO PLATO ---
  const [idEdicion, setIdEdicion] = useState(null);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [categoria, setCategoria] = useState('');
  const [idPadre, setIdPadre] = useState(''); 
  
  // --- NUEVOS ESTADOS PARA EL BUSCADOR DE PADRE ---
  const [busquedaPadre, setBusquedaPadre] = useState('');
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  // --- ESTADO NUEVA CATEGORIA ---
  const [nuevaCat, setNuevaCat] = useState('');

  // --- ESTADOS VISUALES ---
  const [cargando, setCargando] = useState(false);
  const [notificacion, setNotificacion] = useState(null);
  const [modalEliminar, setModalEliminar] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [resPlatos, resCat] = await Promise.all([
        axios.get(`${URL_BACKEND}/platos`),
        axios.get(`${URL_BACKEND}/categorias`)
      ]);
      setPlatos(resPlatos.data);
      setCategorias(resCat.data);
      
      if (resCat.data.length > 0 && !categoria) {
        setCategoria(resCat.data[0].nombre);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // --- FILTRADO DE LISTA PRINCIPAL ---
  const platosFiltrados = platos.filter(plato => {
    const coincideTexto = plato.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria = filtroCategoria === '' || plato.categoria === filtroCategoria;
    return coincideTexto && coincideCategoria;
  });

  // --- FILTRADO PARA EL SELECTOR INTELIGENTE (PADRES) ---
  const posiblesPadres = platos.filter(p => 
    // 1. No puede ser él mismo
    p.id !== idEdicion && 
    // 2. No puede ser un plato que ya es hijo (para no hacer cadenas infinitas)
    !p.id_padre && 
    // 3. Que coincida con lo que escribimos
    p.nombre.toLowerCase().includes(busquedaPadre.toLowerCase())
  );

  // --- LOGICA FORMULARIO ---
  const prepararEdicion = (plato) => {
    setIdEdicion(plato.id);
    setNombre(plato.nombre);
    setPrecio(plato.precio);
    setStock(plato.stock);
    setCategoria(plato.categoria);
    
    // Lógica para cargar el nombre del padre en el buscador
    if (plato.id_padre) {
        const padre = platos.find(p => p.id === plato.id_padre);
        setIdPadre(plato.id_padre);
        setBusquedaPadre(padre ? padre.nombre : '');
    } else {
        setIdPadre('');
        setBusquedaPadre('');
    }
  };

  const cancelarEdicion = () => {
    setIdEdicion(null);
    setNombre('');
    setPrecio('');
    setStock('');
    setIdPadre('');
    setBusquedaPadre('');
    setMostrarSugerencias(false);
    if(categorias.length > 0) setCategoria(categorias[0].nombre);
  };

  const guardarPlato = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !precio || (!idPadre && !stock) || !categoria) {
        mostrarNotificacion("Completa todos los campos", "error");
        return;
    }
    setCargando(true);
    try {
      const datos = { 
          nombre, 
          precio: parseFloat(precio), 
          stock: idPadre ? 0 : parseInt(stock), 
          categoria,
          id_padre: idPadre || null 
      };
      
      if (idEdicion) {
        await axios.put(`${URL_BACKEND}/admin/platos/${idEdicion}`, datos);
        mostrarNotificacion("Plato actualizado", "exito");
      } else {
        await axios.post(`${URL_BACKEND}/admin/platos`, datos);
        mostrarNotificacion("Plato creado", "exito");
      }
      cancelarEdicion();
      cargarDatos(); 
    } catch (error) {
      mostrarNotificacion("Error al guardar", "error");
    } finally { setCargando(false); }
  };

  // Seleccionar un padre de la lista de sugerencias
  const seleccionarPadre = (platoPadre) => {
      setIdPadre(platoPadre.id);
      setBusquedaPadre(platoPadre.nombre);
      setMostrarSugerencias(false); // Cerrar lista
  };

  // Limpiar selección de padre
  const limpiarPadre = () => {
      setIdPadre('');
      setBusquedaPadre('');
  };

  // --- LOGICA DE ELIMINACIÓN ---
  const solicitarEliminar = (id, tipo, nombreItem) => {
    setModalEliminar({ id, tipo, nombre: nombreItem });
  };

  const confirmarEliminar = async () => {
    if (!modalEliminar) return;
    const { id, tipo } = modalEliminar;
    const url = tipo === 'plato' ? `/admin/platos/${id}` : `/categorias/${id}`;

    try {
        await axios.delete(`${URL_BACKEND}${url}`);
        mostrarNotificacion(`${tipo === 'plato' ? 'Plato' : 'Categoría'} eliminada`, "exito");
        cargarDatos();
    } catch (e) { 
        mostrarNotificacion("Error al eliminar", "error"); 
    } finally {
        setModalEliminar(null); 
    }
  };

  const crearCategoria = async (e) => {
    e.preventDefault();
    if (!nuevaCat.trim()) return;
    try {
        await axios.post(`${URL_BACKEND}/categorias`, { nombre: nuevaCat });
        setNuevaCat('');
        mostrarNotificacion("Categoría agregada", "exito");
        cargarDatos();
    } catch (e) { mostrarNotificacion("Error al crear categoría", "error"); }
  };

  const mostrarNotificacion = (mensaje, tipo) => {
    setNotificacion({ mensaje, tipo });
    setTimeout(() => setNotificacion(null), 3000);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-100px)] relative p-2">
      
      {/* MODAL ELIMINAR */}
      {modalEliminar && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden p-6 text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">¿Eliminar "{modalEliminar.nombre}"?</h3>
                <p className="text-gray-500 text-sm mb-6">Esta acción no se puede deshacer.</p>
                <div className="flex gap-3 justify-center">
                    <button onClick={() => setModalEliminar(null)} className="bg-white text-gray-700 border border-gray-300 font-bold py-2 px-6 rounded-lg hover:bg-gray-100">Cancelar</button>
                    <button onClick={confirmarEliminar} className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 shadow-md">Sí, Eliminar</button>
                </div>
            </div>
        </div>
      )}

      {notificacion && (
        <div className={`fixed top-20 right-5 px-6 py-3 rounded shadow-xl z-50 text-white font-bold animate-bounce
            ${notificacion.tipo === 'error' ? 'bg-red-500' : 'bg-green-600'}`}>
            {notificacion.mensaje}
        </div>
      )}

      {/* IZQUIERDA: FORMULARIOS */}
      <div className="w-full md:w-1/3 space-y-6 overflow-y-auto">
        <div className={`p-6 rounded-lg shadow-md border transition-colors h-fit ${idEdicion ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
            <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2 flex justify-between">
                {idEdicion ? '✏️ Editando' : '🍳 Nuevo Plato'}
                {idEdicion && <button onClick={cancelarEdicion} className="text-xs text-red-500 underline">Cancelar</button>}
            </h2>
            <form onSubmit={guardarPlato} className="space-y-3">
                <input type="text" placeholder="Nombre" className="w-full p-2 border rounded" value={nombre} onChange={e => setNombre(e.target.value)} />
                
                <div className="grid grid-cols-2 gap-2">
                    <input type="number" step="0.01" placeholder="Precio $" className="w-full p-2 border rounded" value={precio} onChange={e => setPrecio(e.target.value)} />
                    {/* Stock */}
                    <input type="number" placeholder="Stock" className={`w-full p-2 border rounded ${idPadre ? 'bg-gray-100 text-gray-400' : ''}`} value={stock} onChange={e => setStock(e.target.value)} disabled={!!idPadre} />
                </div>

                <div className="space-y-2">
                    <div>
                        <label className="text-xs font-bold text-gray-500">Categoría</label>
                        <select className="w-full p-2 border rounded bg-white text-sm" value={categoria} onChange={e => setCategoria(e.target.value)}>
                            {categorias.length === 0 && <option>Cargando...</option>}
                            {categorias.map(cat => <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>)}
                        </select>
                    </div>

                    {/* --- NUEVO BUSCADOR DE PADRE (AUTOCOMPLETE) --- */}
                    <div className="relative">
                        <label className="text-xs font-bold text-blue-600">🔗 Comparte Stock con (Opcional):</label>
                        <div className="flex gap-1">
                            <input 
                                type="text" 
                                placeholder="Buscar plato principal..." 
                                className={`w-full p-2 border rounded text-sm ${idPadre ? 'bg-blue-50 border-blue-300 text-blue-800 font-bold' : ''}`}
                                value={busquedaPadre}
                                onChange={(e) => {
                                    setBusquedaPadre(e.target.value);
                                    setIdPadre(''); // Si escribe, borramos la selección anterior
                                    setMostrarSugerencias(true);
                                }}
                                onFocus={() => setMostrarSugerencias(true)}
                            />
                            {idPadre && (
                                <button type="button" onClick={limpiarPadre} className="bg-red-100 text-red-500 px-3 rounded border border-red-200 hover:bg-red-200">
                                    ×
                                </button>
                            )}
                        </div>

                        {/* Lista desplegable de sugerencias */}
                        {mostrarSugerencias && busquedaPadre && !idPadre && (
                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto mt-1">
                                {posiblesPadres.length === 0 ? (
                                    <div className="p-2 text-gray-400 text-xs">No se encontraron platos.</div>
                                ) : (
                                    posiblesPadres.map(p => (
                                        <button 
                                            key={p.id}
                                            type="button"
                                            onClick={() => seleccionarPadre(p)}
                                            className="w-full text-left p-2 text-sm hover:bg-blue-50 border-b last:border-0"
                                        >
                                            {p.nombre} <span className="text-xs text-gray-400">({p.stock})</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <button type="submit" disabled={cargando} className={`w-full font-bold py-3 rounded text-white shadow mt-2 ${idEdicion ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                    {cargando ? '...' : (idEdicion ? 'ACTUALIZAR' : 'GUARDAR')}
                </button>
            </form>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-bold text-gray-700 mb-2 text-sm uppercase">📂 Gestionar Categorías</h3>
            <form onSubmit={crearCategoria} className="flex gap-2 mb-3">
                <input type="text" placeholder="Nueva Categoría..." className="flex-1 p-2 border rounded text-sm" value={nuevaCat} onChange={e => setNuevaCat(e.target.value)} />
                <button type="submit" className="bg-green-600 text-white px-3 rounded font-bold hover:bg-green-700">+</button>
            </form>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {categorias.map(cat => (
                    <div key={cat.id} className="bg-white px-3 py-1 rounded-full border text-xs flex items-center gap-2 shadow-sm group hover:border-red-200 transition-colors">
                        {cat.nombre}
                        <button onClick={() => solicitarEliminar(cat.id, 'categoria', cat.nombre)} className="text-gray-400 hover:text-red-500 font-bold">×</button>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* DERECHA: LISTA */}
      <div className="w-full md:w-2/3 bg-white rounded-lg shadow-md border border-gray-200 flex flex-col overflow-hidden">
        <div className="p-4 bg-gray-50 border-b space-y-3">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-700">Inventario</h2>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-bold">Viendo {platosFiltrados.length}</span>
            </div>
            <div className="flex gap-2">
                <input type="text" placeholder="🔍 Buscar..." className="flex-1 p-2 border rounded text-sm" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                <select className="p-2 border rounded text-sm bg-white" value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
                    <option value="">Todas las Categorías</option>
                    {categorias.map(cat => <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>)}
                </select>
            </div>
        </div>
        
        <div className="overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10">
                    <tr>
                        <th className="p-3 text-sm font-bold uppercase">Producto</th>
                        <th className="p-3 text-sm font-bold uppercase">Precio</th>
                        <th className="p-3 text-sm font-bold uppercase">Stock</th>
                        <th className="p-3 text-sm font-bold uppercase text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {platosFiltrados.map((plato) => (
                        <tr key={plato.id} className={`hover:bg-blue-50 transition-colors ${idEdicion === plato.id ? 'bg-yellow-50' : ''}`}>
                            <td className="p-3 font-medium text-gray-800">
                                {plato.nombre}
                                {plato.id_padre && <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-1 rounded font-bold">🔗 HIJO</span>}
                                <span className="block text-xs text-gray-400 bg-gray-100 w-fit px-1 rounded mt-1">{plato.categoria}</span>
                            </td>
                            <td className="p-3 font-bold text-green-600">${plato.precio.toFixed(2)}</td>
                            <td className="p-3"><span className={`font-bold ${plato.stock < 5 ? 'text-red-500' : 'text-gray-700'}`}>{plato.stock}</span></td>
                            <td className="p-3 text-right">
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => prepararEdicion(plato)} className="text-blue-600 font-bold text-sm">✏️</button>
                                    <button onClick={() => solicitarEliminar(plato.id, 'plato', plato.nombre)} className="text-red-600 font-bold text-sm">🗑️</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}