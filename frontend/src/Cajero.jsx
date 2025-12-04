import { useState, useEffect } from 'react';
import axios from 'axios';
import socket from 'socket.io-client';

const URL_BACKEND = import.meta.env.VITE_SUPABASE_URL ? 'https://api-restaurante-yawj.onrender.com' : 'http://localhost:3000'; 

const io = socket(URL_BACKEND); 

export default function Cajero() {
  // --- ESTADOS DE DATOS ---
  const [platos, setPlatos] = useState([]);
  const [categorias, setCategorias] = useState([]); 
  const [carrito, setCarrito] = useState([]);
  const [clientesActivos, setClientesActivos] = useState([]);

  // --- ESTADOS DE FILTRO ---
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [ordenStock, setOrdenStock] = useState(''); 

  // --- ESTADOS FORMULARIO ---
  const [cliente, setCliente] = useState('');
  const [horaProgramada, setHoraProgramada] = useState('');
  const [comentarios, setComentarios] = useState('');

  // TIPOS DE ENTREGA
  const [esDomicilio, setEsDomicilio] = useState(false);
  const [esRetiro, setEsRetiro] = useState(false);
  const [esPersonal, setEsPersonal] = useState(false);

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

    const actualizarPanel = () => {
        cargarDatos();
        cargarClientesActivos();
    };

    io.on('nueva_orden', actualizarPanel);
    io.on('orden_lista', actualizarPanel);
    io.on('orden_anulada', actualizarPanel);

    return () => {
        io.off('nueva_orden', actualizarPanel);
        io.off('orden_lista', actualizarPanel);
        io.off('orden_anulada', actualizarPanel);
    };
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

  const obtenerStockVisual = (plato) => {
      if (plato.id_padre) {
          const padre = platos.find(p => p.id === plato.id_padre);
          return padre ? padre.stock : 0;
      }
      return plato.stock;
  };

  const platosFiltrados = platos
    .filter(plato => {
        const coincideTexto = plato.nombre.toLowerCase().includes(busqueda.toLowerCase());
        const coincideCategoria = categoriaSeleccionada === '' || plato.categoria === categoriaSeleccionada;
        return coincideTexto && coincideCategoria;
    })
    .sort((a, b) => {
        if (!ordenStock) return 0;
        const stockA = obtenerStockVisual(a);
        const stockB = obtenerStockVisual(b);
        if (ordenStock === 'mayor') return stockB - stockA;
        if (ordenStock === 'menor') return stockA - stockB;
        return 0;
    });

  const seleccionarClienteActivo = (c) => {
    setCliente(c.nombre);
    if(c.tipo === 'domicilio') { setEsDomicilio(true); setEsRetiro(false); }
    else if(c.tipo === 'retiro') { setEsRetiro(true); setEsDomicilio(false); }
    else { setEsDomicilio(false); setEsRetiro(false); }
    setDireccion(c.direccion || '');
    setTelefono(c.telefono || '');
    setEsExtra(true);
    setModalClientes(false);
    mostrarNotificacion(`Agregando extras para ${c.nombre}`, 'exito');
  };

  const agregar = (plato) => {
    const stockDisponible = obtenerStockVisual(plato);
    if (stockDisponible <= 0) return;
    
    let enCarrito = 0;
    const idGrupo = plato.id_padre || plato.id;

    carrito.forEach(item => {
        const idItemGrupo = item.id_padre || item.id;
        if (idItemGrupo === idGrupo) enCarrito += item.cantidad;
    });

    if (enCarrito + 1 > stockDisponible) {
        mostrarNotificacion(`Solo quedan ${stockDisponible} unidades compartidas`, 'error');
        return;
    }

    const existe = carrito.find(item => item.id === plato.id);
    if (existe) {
        setCarrito(carrito.map(item => item.id === plato.id ? {...item, cantidad: item.cantidad + 1} : item));
    } else {
        setCarrito([...carrito, { ...plato, cantidad: 1 }]);
    }
    if (errores.carrito) setErrores({...errores, carrito: false});
  };

  const quitar = (id) => {
    const existe = carrito.find(item => item.id === id);
    if (existe.cantidad > 1) {
        setCarrito(carrito.map(item => item.id === id ? {...item, cantidad: item.cantidad - 1} : item));
    } else {
        setCarrito(carrito.filter(item => item.id !== id));
    }
  };

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

  // CORREGIDO: toggleDomicilio
  const toggleDomicilio = () => {
      setEsDomicilio(!esDomicilio);
      if(!esDomicilio) {
          setEsRetiro(false);
          setEsPersonal(false);
      }
  };

  const toggleRetiro = () => {
      setEsRetiro(!esRetiro);
      if(!esRetiro) {
          setEsDomicilio(false);
          setEsPersonal(false);
      }
  };

  const togglePersonal = () => {
      setEsPersonal(!esPersonal);
      if(!esPersonal) {
          setEsDomicilio(false);
          setEsRetiro(false);
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
        mostrarNotificacion('Verifica los campos marcados', 'error');
        return;
    }
    setEnviando(true);

    const costoEnvio = (esDomicilio && !esExtra && !esPersonal) ? 0.50 : 0;
    const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const nombreFinal = esExtra ? `${cliente} (EXTRA)` : cliente;

    let tipoFinal = 'mesa';
    if (esDomicilio) tipoFinal = 'domicilio';
    if (esRetiro) tipoFinal = 'retiro';
    if (esPersonal) tipoFinal = 'personal';

    // --- CORRECCIÓN CLAVE: SI ES PERSONAL, EL TOTAL A GUARDAR ES 0 ---
    const totalFinalParaGuardar = esPersonal ? 0 : (subtotal + costoEnvio);

    const orden = {
      cliente: nombreFinal,
      total: totalFinalParaGuardar, // Aquí forzamos el 0 si es personal
      detalles: carrito,
      tipo_entrega: tipoFinal,
      direccion: esDomicilio ? direccion : '', 
      telefono,
      hora_programada: horaProgramada,
      comentarios: comentarios
    };

    try {
      await axios.post(`${URL_BACKEND}/ordenes`, orden);
      mostrarNotificacion('¡Orden enviada a cocina! 👨‍🍳', 'exito');
      setCarrito([]); 
      setCliente(''); 
      setHoraProgramada(''); 
      setDireccion(''); 
      setTelefono('');
      setComentarios('');
      setEsDomicilio(false); 
      setEsRetiro(false);
      setEsPersonal(false);
      setEsExtra(false); 
      setErrores({});
      cargarDatos(); 
      cargarClientesActivos();
    } catch (error) {
      console.error('❌ ERROR AL ENVIAR ORDEN:', error);
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
  const total = esPersonal ? 0 : (subtotal + ((esDomicilio && !esExtra) ? 0.50 : 0));

  return (
    <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-80px)] relative">
      
      {modalClientes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="bg-blue-600 p-4 flex justify-between items-center">
                    <h3 className="text-white font-bold text-lg">Clientes Atendidos Hoy</h3>
                    <button onClick={() => setModalClientes(false)} className="text-white text-2xl">&times;</button>
                </div>
                <div className="p-4 max-h-80 overflow-y-auto space-y-2">
                    {clientesActivos.length === 0 && <p className="text-center text-gray-400">No hay clientes activos.</p>}
                    {clientesActivos.map((c, i) => (
                        <button key={i} onClick={() => seleccionarClienteActivo(c)} className="w-full text-left p-3 rounded border hover:bg-blue-50 flex justify-between group">
                            <div>
                                <p className="font-bold text-gray-800">{c.nombre}</p>
                                <p className="text-xs text-gray-500 uppercase">{c.tipo}</p>
                            </div>
                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100">+ Agregar</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {notificacion && (
        <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-xl z-50 text-white font-bold animate-bounce ${notificacion.tipo === 'error' ? 'bg-red-500' : 'bg-green-600'}`}>{notificacion.mensaje}</div>
      )}

      {/* MENÚ */}
      <div className="w-full md:w-2/3 bg-white p-4 rounded shadow flex flex-col h-full">
        <div className="mb-4 flex flex-col md:flex-row gap-3 border-b pb-4">
            <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
                <input type="text" placeholder="Buscar plato..." className="w-full pl-10 p-2 border rounded-lg" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>
            
            <select className="p-2 border rounded-lg bg-white md:w-1/4" value={categoriaSeleccionada} onChange={e => setCategoriaSeleccionada(e.target.value)}>
                <option value="">🍽️ Todas</option>
                {categorias.map(cat => <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>)}
            </select>

            <select 
                className="p-2 border rounded-lg bg-blue-50 text-blue-700 font-bold md:w-1/4 cursor-pointer hover:bg-blue-100 transition" 
                value={ordenStock} 
                onChange={e => setOrdenStock(e.target.value)}
            >
                <option value="">📦 Stock: Normal</option>
                <option value="mayor">⬆️ Mayor Cantidad</option>
                <option value="menor">⬇️ Menor Cantidad</option>
            </select>
        </div>

        <div className="overflow-y-auto flex-1 pr-1">
            {platosFiltrados.length === 0 ? <div className="text-center py-10 text-gray-400">No se encontraron platos.</div> : 
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {platosFiltrados.map(plato => {
                const stock = obtenerStockVisual(plato);
                return (
                    <button key={plato.id} onClick={() => agregar(plato)} disabled={stock === 0} className={`p-4 rounded-lg shadow-sm text-center border-2 transition relative flex flex-col justify-between ${stock > 0 ? 'border-blue-50 hover:border-blue-500 bg-white' : 'bg-gray-100 opacity-60 cursor-not-allowed border-gray-200'}`}>
                        <div>
                            <h3 className="font-bold text-gray-800 leading-tight mb-1">{plato.nombre}</h3>
                            {plato.id_padre && <span className="text-[10px] bg-purple-100 text-purple-800 px-1 rounded mb-1 inline-block">Porción</span>}
                            <p className="text-xs text-gray-400 mb-2">{plato.categoria}</p>
                        </div>
                        <div>
                            <p className="text-blue-600 font-bold text-lg">${plato.precio.toFixed(2)}</p>
                            <div className={`mt-1 text-xs font-bold px-2 py-1 rounded-full inline-block ${stock === 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                                {stock === 0 ? 'AGOTADO' : `Stock: ${stock}`}
                            </div>
                        </div>
                    </button>
                );
            })}
            </div>}
        </div>
      </div>

      {/* ORDEN (Columna Derecha) */}
      <div className="w-full md:w-1/3 bg-gray-50 p-4 rounded shadow border border-gray-200 flex flex-col h-full">
        <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2 flex justify-between items-center">
            Nueva Orden
            <button onClick={() => setModalClientes(true)} className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded hover:bg-blue-200">👥 Activos</button>
        </h2>
        {esExtra && <div className="mb-2 bg-yellow-100 border border-yellow-300 text-yellow-800 px-2 py-1 rounded text-xs flex justify-between"><span>⚡ Modo: <strong>Extra</strong></span><button onClick={() => {setEsExtra(false); setCliente('');}} className="text-yellow-600 font-bold">×</button></div>}

        <input type="text" placeholder="Nombre Cliente *" className="w-full p-3 border rounded mb-3" value={cliente} onChange={handleNombreChange} />
        <div className="mb-3 flex items-center gap-2 bg-blue-50 p-2 rounded border border-blue-100">
            <span className="text-xl">⏰</span>
            <div className="flex-1"><label className="block text-xs font-bold text-blue-800">Hora (Opcional)</label><input type="time" className="w-full p-1 border rounded text-sm" value={horaProgramada} onChange={e => setHoraProgramada(e.target.value)}/></div>
        </div>

        {/* OPCIONES ENTREGA - VERSIÓN CORREGIDA */}
        <div className="space-y-2 mb-4">
            {/* RETIRO */}
            <div className={`p-3 rounded border cursor-pointer transition-colors flex items-center gap-2 ${esRetiro ? 'bg-purple-50 border-purple-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`} onClick={toggleRetiro}>
                <input type="checkbox" checked={esRetiro} onChange={toggleRetiro} className="w-5 h-5 accent-purple-600 cursor-pointer"/>
                <span className={`font-bold ${esRetiro ? 'text-purple-700' : 'text-gray-600'}`}>🛍️ Retiro en Local</span>
            </div>

            {/* DOMICILIO */}
            <div className={`p-3 rounded border transition-colors ${esDomicilio ? 'bg-orange-50 border-orange-300' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-2 cursor-pointer" onClick={toggleDomicilio}>
                    <input type="checkbox" checked={esDomicilio} onChange={toggleDomicilio} className="w-5 h-5 accent-orange-500 cursor-pointer"/>
                    <span className={`font-bold ${esDomicilio ? 'text-orange-700' : 'text-gray-600'}`}>🛵 Domicilio (+$0.50)</span>
                </div>
                {esDomicilio && (
                    <div className="mt-3 space-y-2 animate-fade-in-down pl-7">
                        <input type="text" placeholder="Dirección *" className={`w-full p-2 border rounded text-sm ${errores.direccion ? 'border-red-500 bg-red-50' : 'border-orange-200'}`} value={direccion} onChange={e => setDireccion(e.target.value)}/>
                        <input type="text" placeholder="Teléfono *" className={`w-full p-2 border rounded text-sm ${errores.telefono ? 'border-red-500 bg-red-50' : 'border-orange-200'}`} value={telefono} onChange={handleTelefonoChange}/>
                    </div>
                )}
            </div>

            {/* PERSONAL */}
            <div className={`p-3 rounded border cursor-pointer transition-colors flex items-center gap-2 ${esPersonal ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`} onClick={togglePersonal}>
                <input type="checkbox" checked={esPersonal} onChange={togglePersonal} className="w-5 h-5 accent-red-600 cursor-pointer"/>
                <span className={`font-bold ${esPersonal ? 'text-red-700' : 'text-gray-600'}`}>👨‍🍳 Personal (Gratis)</span>
            </div>
        </div>

        {/* COMENTARIOS */}
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-600 text-lg">📝</span>
            <label className="text-green-800 font-bold text-sm">Instrucciones Especiales (Opcional)</label>
          </div>
          <textarea 
            placeholder="Ej: Ensalada sin cebolla, Refresco poco hielo, etc..."
            className="w-full p-2 border border-green-300 rounded text-sm resize-none"
            rows="3"
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
          />
          <p className="text-xs text-green-600 mt-1">Estas instrucciones se enviarán a cocina</p>
        </div>

        {/* CARRITO */}
        <div className="mb-4" style={{height: '300px'}}>
          <div className={`bg-white rounded border p-2 h-full overflow-y-auto ${errores.carrito ? 'border-red-300' : ''}`}>
            {carrito.length === 0 ? 
              <div className="h-full flex items-center justify-center text-gray-400 flex-col opacity-60">
                <span>🛒</span>
                <p className="text-sm">Vacío</p>
              </div> : 
              carrito.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <button onClick={() => quitar(item.id)} className="text-red-400 font-bold px-2">-</button>
                    <span className="font-bold">{item.cantidad}x {item.nombre}</span>
                  </div>
                  <span className="font-mono">${(item.precio * item.cantidad).toFixed(2)}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="space-y-1 text-right mb-4 pt-2 border-t">
          {!esPersonal && <p className="text-gray-500 text-sm">Subtotal: ${subtotal.toFixed(2)}</p>}
          {esDomicilio && !esExtra && !esPersonal && <p className="text-orange-600 text-sm">+ Envío: $0.50</p>}
          {esPersonal && <p className="text-red-600 font-bold text-sm">✓ CONSUMO PERSONAL (GRATIS)</p>}
          <p className="text-3xl font-bold text-gray-800">${total.toFixed(2)}</p>
        </div>

        <button onClick={procesarOrden} disabled={enviando} className={`w-full font-bold py-4 rounded-lg text-lg ${enviando ? 'bg-gray-400' : esPersonal ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white shadow-lg`}>
          {enviando ? '🚀 ENVIANDO...' : (esPersonal ? 'CONFIRMAR CONSUMO PERSONAL' : (esExtra ? 'AGREGAR EXTRA (+)' : 'CONFIRMAR'))}
        </button>
      </div> 
    </div>
  );
}