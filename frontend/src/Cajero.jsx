import { useState, useEffect } from 'react';
import axios from 'axios';
import socket from 'socket.io-client';

const URL_BACKEND = 'http://localhost:3000'; 
const io = socket(URL_BACKEND); 

export default function Cajero() {
  // --- ESTADOS DE DATOS ---
  const [platos, setPlatos] = useState([]);
  const [categorias, setCategorias] = useState([]); 
  const [carrito, setCarrito] = useState([]);
  const [clientesActivos, setClientesActivos] = useState([]);

  // --- ESTADOS DE FILTRO ---
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(''); // '' = Todas

  // --- ESTADOS FORMULARIO ---
  const [cliente, setCliente] = useState('');
  const [horaProgramada, setHoraProgramada] = useState('');
  const [esDomicilio, setEsDomicilio] = useState(false);
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');

  // --- ESTADOS UI ---
  const [modalClientes, setModalClientes] = useState(false);
  const [esExtra, setEsExtra] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState({});
  const [notificacion, setNotificacion] = useState(null);

  useEffect(() => {
    cargarDatos();
    cargarClientesActivos();

    io.on('nueva_orden', () => {
        cargarDatos();
        cargarClientesActivos();
    });

    return () => io.off('nueva_orden');
  }, []);

  const cargarDatos = async () => {
    try {
      const [resPlatos, resCat] = await Promise.all([
        axios.get(`${URL_BACKEND}/platos`),
        axios.get(`${URL_BACKEND}/categorias`)
      ]);
      setPlatos(resPlatos.data);
      setCategorias(resCat.data);
    } catch (error) {
      mostrarNotificacion('Error conectando al servidor', 'error');
    }
  };

  const cargarClientesActivos = async () => {
    try {
        const res = await axios.get(`${URL_BACKEND}/reportes/hoy`);
        const ordenes = res.data.listaOrdenes || [];
        const unicos = {};
        
        ordenes.forEach(o => {
            if (o.estado !== 'anulado') {
                unicos[o.cliente] = {
                    nombre: o.cliente,
                    tipo: o.tipo_entrega,
                    direccion: o.direccion,
                    telefono: o.telefono
                };
            }
        });
        setClientesActivos(Object.values(unicos));
    } catch (error) { console.log("Error cargando clientes"); }
  };

  // --- FILTRADO ---
  const platosFiltrados = platos.filter(plato => {
    const coincideTexto = plato.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria = categoriaSeleccionada === '' || plato.categoria === categoriaSeleccionada;
    return coincideTexto && coincideCategoria;
  });

  // --- CARRITO ---
  const seleccionarClienteActivo = (c) => {
    setCliente(c.nombre);
    setEsDomicilio(c.tipo === 'domicilio');
    setDireccion(c.direccion || '');
    setTelefono(c.telefono || '');
    setEsExtra(true);
    setModalClientes(false);
    mostrarNotificacion(`Agregando extras para ${c.nombre}`, 'exito');
  };

  const agregar = (plato) => {
    if (plato.stock <= 0) return;
    
    const enCarrito = carrito.find(item => item.id === plato.id);
    
    if (cantidadEnCarrito(plato.id) + 1 > plato.stock) {
        mostrarNotificacion(`Solo quedan ${plato.stock} unidades`, 'error');
        return;
    }

    if (enCarrito) {
      setCarrito(carrito.map(item => 
        item.id === plato.id ? {...item, cantidad: item.cantidad + 1} : item
      ));
    } else {
      setCarrito([...carrito, { ...plato, cantidad: 1 }]);
    }
    if (errores.carrito) setErrores({...errores, carrito: false});
  };

  const cantidadEnCarrito = (id) => {
      const item = carrito.find(i => i.id === id);
      return item ? item.cantidad : 0;
  };

  const quitar = (id) => {
    const existe = carrito.find(item => item.id === id);
    if (existe.cantidad > 1) {
        setCarrito(carrito.map(item => item.id === id ? {...item, cantidad: item.cantidad - 1} : item));
    } else {
        setCarrito(carrito.filter(item => item.id !== id));
    }
  };

  // --- FORMULARIO ---
  const handleNombreChange = (e) => {
    const valor = e.target.value;
    if (/^[a-zA-Z\sñÑáéíóúÁÉÍÓÚ]*$/.test(valor)) {
        setCliente(valor);
        if (esExtra && valor === '') setEsExtra(false);
        if(errores.cliente) setErrores({...errores, cliente: false});
    }
  };

  const handleTelefonoChange = (e) => {
    const valor = e.target.value;
    if (/^\d*$/.test(valor) && valor.length <= 8) {
        setTelefono(valor);
        if(errores.telefono) setErrores({...errores, telefono: false});
    }
  };

  const validarFormulario = () => {
    const nuevosErrores = {};
    if (!cliente.trim()) nuevosErrores.cliente = true;
    if (carrito.length === 0) nuevosErrores.carrito = true;
    
    if (esDomicilio) {
        if (!direccion.trim()) nuevosErrores.direccion = true;
        if (!telefono.trim() || telefono.length !== 8) nuevosErrores.telefono = true;
    }
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const procesarOrden = async () => {
    if (!validarFormulario()) {
        mostrarNotificacion('Verifica los campos marcados en rojo', 'error');
        return;
    }
    setEnviando(true);

    const costoEnvio = (esDomicilio && !esExtra) ? 0.50 : 0;
    const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const nombreFinal = esExtra ? `${cliente} (EXTRA)` : cliente;

    const orden = {
      cliente: nombreFinal,
      total: subtotal + costoEnvio,
      detalles: carrito,
      tipo_entrega: esDomicilio ? 'domicilio' : 'mesa',
      direccion,
      telefono,
      hora_programada: horaProgramada 
    };

    try {
      await axios.post(`${URL_BACKEND}/ordenes`, orden);
      mostrarNotificacion('¡Orden enviada a cocina! 👨‍🍳', 'exito');
      
      setCarrito([]);
      setCliente('');
      setHoraProgramada('');
      setDireccion('');
      setTelefono('');
      setEsDomicilio(false);
      setEsExtra(false);
      setErrores({});
      cargarDatos(); 
      cargarClientesActivos();

    } catch (error) {
      console.error(error);
      mostrarNotificacion('Error al procesar la orden', 'error');
    } finally {
      setEnviando(false);
    }
  };

  const mostrarNotificacion = (mensaje, tipo) => {
    setNotificacion({ mensaje, tipo });
    setTimeout(() => setNotificacion(null), 3000);
  };

  const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const costoEnvio = (esDomicilio && !esExtra) ? 0.50 : 0;
  const total = subtotal + costoEnvio;

  return (
    <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-80px)] relative">
      
      {/* MODAL CLIENTES ACTIVOS */}
      {modalClientes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="bg-blue-600 p-4 flex justify-between items-center">
                    <h3 className="text-white font-bold text-lg">Clientes Atendidos Hoy</h3>
                    <button onClick={() => setModalClientes(false)} className="text-white text-2xl leading-none">&times;</button>
                </div>
                <div className="p-4 max-h-80 overflow-y-auto">
                    {clientesActivos.length === 0 ? (
                        <p className="text-center text-gray-400">No hay clientes activos hoy.</p>
                    ) : (
                        <div className="space-y-2">
                            {clientesActivos.map((c, i) => (
                                <button 
                                    key={i}
                                    onClick={() => seleccionarClienteActivo(c)}
                                    className="w-full text-left p-3 rounded border hover:bg-blue-50 hover:border-blue-300 transition flex justify-between items-center group"
                                >
                                    <div>
                                        <p className="font-bold text-gray-800">{c.nombre}</p>
                                        <p className="text-xs text-gray-500">{c.tipo === 'domicilio' ? '🛵 Domicilio' : '🍽️ Mesa'}</p>
                                    </div>
                                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition">
                                        + Agregar
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {notificacion && (
        <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-xl z-50 text-white font-bold transition-all
            ${notificacion.tipo === 'error' ? 'bg-red-500' : 'bg-green-600'}`}>
            {notificacion.mensaje}
        </div>
      )}

      {/* --- IZQUIERDA: MENÚ CON BUSCADOR --- */}
      <div className="w-full md:w-2/3 bg-white p-4 rounded shadow flex flex-col h-full">
        
        {/* BARRA DE BÚSQUEDA Y FILTRO */}
        <div className="mb-4 flex flex-col md:flex-row gap-3 border-b pb-4">
            {/* Buscador */}
            <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
                <input 
                    type="text" 
                    placeholder="Buscar plato..." 
                    className="w-full pl-10 p-2 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                />
            </div>

            {/* MENÚ DESPLEGABLE DE CATEGORÍAS */}
            <select 
                className="p-2 border rounded-lg bg-white text-gray-700 font-medium focus:ring-2 focus:ring-blue-200 outline-none cursor-pointer shadow-sm md:w-1/3"
                value={categoriaSeleccionada}
                onChange={e => setCategoriaSeleccionada(e.target.value)}
            >
                <option value="">🍽️ Todas las Categorías</option>
                {categorias.map(cat => (
                    <option key={cat.id} value={cat.nombre}>
                        {cat.nombre}
                    </option>
                ))}
            </select>
        </div>

        {/* GRID DE PLATOS (CON SCROLL) */}
        <div className="overflow-y-auto flex-1 pr-1">
            {platosFiltrados.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                    <p className="text-4xl mb-2">🍽️</p>
                    <p>No se encontraron platos.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {platosFiltrados.map(plato => (
                    <button 
                    key={plato.id}
                    onClick={() => agregar(plato)}
                    disabled={plato.stock === 0}
                    className={`p-4 rounded-lg shadow-sm text-center border-2 transition relative group flex flex-col justify-between
                        ${plato.stock > 0 
                        ? 'border-blue-50 hover:border-blue-500 hover:shadow-md bg-white' 
                        : 'bg-gray-100 opacity-60 cursor-not-allowed border-gray-200'}`}
                    >
                    <div>
                        <h3 className="font-bold text-gray-800 leading-tight mb-1">{plato.nombre}</h3>
                        <p className="text-xs text-gray-400 mb-2">{plato.categoria}</p>
                    </div>
                    
                    <div>
                        <p className="text-blue-600 font-bold text-lg">${plato.precio.toFixed(2)}</p>
                        <div className={`mt-1 text-xs font-bold px-2 py-1 rounded-full inline-block
                            ${plato.stock === 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                            {plato.stock === 0 ? 'AGOTADO' : `Stock: ${plato.stock}`}
                        </div>
                    </div>
                    </button>
                ))}
                </div>
            )}
        </div>
      </div>

      {/* --- DERECHA: ORDEN --- */}
      <div className="w-full md:w-1/3 bg-gray-50 p-4 rounded shadow border border-gray-200 flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2 flex justify-between items-center">
            Nueva Orden
            <button 
                onClick={() => setModalClientes(true)}
                className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded hover:bg-blue-200 transition"
            >
                👥 Clientes Activos
            </button>
        </h2>
        
        {esExtra && (
            <div className="mb-2 bg-yellow-100 border border-yellow-300 text-yellow-800 px-2 py-1 rounded text-xs flex justify-between items-center">
                <span>⚡ Modo: <strong>Adicional / Extra</strong></span>
                <button onClick={() => {setEsExtra(false); setCliente('');}} className="text-yellow-600 font-bold ml-2">×</button>
            </div>
        )}

        <div className="mb-3">
            <input 
              type="text" placeholder="Nombre del Cliente *"
              className={`w-full p-3 border rounded focus:outline-none focus:ring-2 
                  ${errores.cliente ? 'border-red-500 ring-red-100 bg-red-50' : 'border-gray-300 focus:ring-blue-200'}`}
              value={cliente} onChange={handleNombreChange}
            />
        </div>

        <div className="mb-3 flex items-center gap-2 bg-blue-50 p-2 rounded border border-blue-100">
            <span className="text-xl">⏰</span>
            <div className="flex-1">
                <label className="block text-xs font-bold text-blue-800 mb-1">Hora (Opcional)</label>
                <input type="time" className="w-full p-1 border rounded text-sm text-gray-700" value={horaProgramada} onChange={e => setHoraProgramada(e.target.value)}/>
            </div>
        </div>

        <div className={`p-3 rounded mb-4 border transition-colors
            ${esDomicilio ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={esDomicilio} onChange={e => setEsDomicilio(e.target.checked)} className="w-5 h-5 accent-orange-500"/>
            <span className={`font-bold ${esDomicilio ? 'text-orange-700' : 'text-gray-600'}`}>¿Para Llevar?</span>
          </label>

          {esDomicilio && (
            <div className="mt-3 space-y-2 animate-fade-in-down">
              <input type="text" placeholder="Dirección *" className={`w-full p-2 border rounded text-sm ${errores.direccion ? 'border-red-500 bg-red-50' : 'border-orange-200'}`} value={direccion} onChange={e => setDireccion(e.target.value)}/>
              <div>
                  <input type="text" placeholder="Teléfono (8 dígitos) *" className={`w-full p-2 border rounded text-sm ${errores.telefono ? 'border-red-500 bg-red-50' : 'border-orange-200'}`} value={telefono} onChange={handleTelefonoChange}/>
              </div>
            </div>
          )}
        </div>

        <div className={`flex-1 overflow-y-auto mb-4 bg-white rounded border p-2 ${errores.carrito ? 'border-red-300' : 'border-gray-200'}`}>
          {carrito.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 flex-col opacity-60">
                <span>🛒</span>
                <p className="text-sm">Agrega platos</p>
            </div>
          ) : (
            carrito.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2">
                    <button onClick={() => quitar(item.id)} className="text-red-400 hover:text-red-600 font-bold px-2">-</button>
                    <span className="font-bold text-gray-700">{item.cantidad}x {item.nombre}</span>
                </div>
                <span className="text-gray-600 font-mono">${(item.precio * item.cantidad).toFixed(2)}</span>
              </div>
            ))
          )}
        </div>

        <div className="space-y-1 text-right mb-4 pt-2 border-t">
          <p className="text-gray-500 text-sm">Subtotal: ${subtotal.toFixed(2)}</p>
          {esDomicilio && !esExtra && <p className="text-orange-600 text-sm">+ Envío: $0.50</p>}
          <p className="text-3xl font-bold text-gray-800">${total.toFixed(2)}</p>
        </div>

        <button onClick={procesarOrden} disabled={enviando} className={`w-full font-bold py-4 rounded-lg text-lg transition-all transform active:scale-95 ${enviando ? 'bg-gray-400 cursor-wait text-gray-200' : 'bg-green-600 hover:bg-green-700 text-white shadow-lg'}`}>
          {enviando ? '🚀 ENVIANDO...' : (esExtra ? 'AGREGAR EXTRA (+)' : 'CONFIRMAR PEDIDO')}
        </button>
      </div>
    </div>
  );
}