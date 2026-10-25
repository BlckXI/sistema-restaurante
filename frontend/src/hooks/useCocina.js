import { useState, useEffect, useRef, useCallback } from 'react';
import { orderService } from '../api/orderService';
import { socketClient } from '../api/socketService';

const convertirHoraAMinutos = (horaString) => {
    if (!horaString || typeof horaString !== 'string') return null;

    const limpio = horaString.trim().replace(/\s+/g, ' ');
    const partes = limpio.split(' ');
    if (partes.length < 2) return null;

    const [horaStr, minutoStr] = partes[0].split(':');
    const hora = parseInt(horaStr, 10);
    const minuto = parseInt(minutoStr, 10);
    const ampm = partes[1].toUpperCase();

    if (Number.isNaN(hora) || Number.isNaN(minuto)) return null;

    let hora24 = hora;
    if (ampm === 'PM' && hora !== 12) hora24 += 12;
    if (ampm === 'AM' && hora === 12) hora24 = 0;

    return hora24 * 60 + minuto;
};

const ordenarPedidos = (lista) => {
    if (!Array.isArray(lista)) return [];

    return [...lista].sort((a, b) => {
        const minA = convertirHoraAMinutos(a.hora_programada);
        const minB = convertirHoraAMinutos(b.hora_programada);

        if (minA !== null && minB !== null && minA !== minB) {
            return minA - minB;
        }
        if (minA !== null && minB === null) return -1;
        if (minA === null && minB !== null) return 1;

        return (a.numero_diario || a.id) - (b.numero_diario || b.id);
    });
};

/**
 * Custom Hook para la gestión de comandas pendientes en Cocina con jerarquía temporal y barra Undo de 3s.
 */
export function useCocina() {
    const [ordenes, setOrdenes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [ahora, setAhora] = useState(() => Date.now());
    const [ordenEnUndo, setOrdenEnUndo] = useState(null);
    const timerUndoRef = useRef(null);
    const audioRef = useRef(new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg'));

    const playNotificationSound = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
        }
    }, []);

    const cargarOrdenesPendientes = useCallback(async () => {
        try {
            const { data } = await orderService.getPendientes();
            setOrdenes(ordenarPedidos(data || []));
        } catch {
            // Silencioso en caso de reconexión
        } finally {
            setCargando(false);
        }
    }, []);

    // Actualizar reloj cada 15 segundos para recalcular el tiempo transcurrido de cada comanda
    useEffect(() => {
        const interval = setInterval(() => {
            setAhora(Date.now());
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        cargarOrdenesPendientes();

        const manejarNuevaOrden = () => {
            cargarOrdenesPendientes();
            playNotificationSound();
        };

        const manejarActualizacion = () => {
            cargarOrdenesPendientes();
        };

        socketClient.on('nueva_orden', manejarNuevaOrden);
        socketClient.on('orden_anulada', manejarActualizacion);
        socketClient.on('orden_lista', manejarActualizacion);

        return () => {
            socketClient.off('nueva_orden', manejarNuevaOrden);
            socketClient.off('orden_anulada', manejarActualizacion);
            socketClient.off('orden_lista', manejarActualizacion);
        };
    }, [cargarOrdenesPendientes, playNotificationSound]);

    const ejecutarCompletadoServidor = useCallback(
        async (orden) => {
            try {
                await orderService.completarOrden(orden.id);
            } catch {
                cargarOrdenesPendientes();
            }
        },
        [cargarOrdenesPendientes]
    );

    const terminarOrden = useCallback(
        (id) => {
            const ordenObjetivo = ordenes.find(o => o.id === id);
            if (!ordenObjetivo) return;

            // Si ya había otra orden esperando en la barra Undo, la confirmamos de inmediato
            if (timerUndoRef.current && ordenEnUndo) {
                clearTimeout(timerUndoRef.current);
                ejecutarCompletadoServidor(ordenEnUndo);
            }

            setOrdenes(prev => prev.filter(o => o.id !== id));
            setOrdenEnUndo(ordenObjetivo);

            timerUndoRef.current = setTimeout(() => {
                setOrdenEnUndo(null);
                timerUndoRef.current = null;
                ejecutarCompletadoServidor(ordenObjetivo);
            }, 3000);
        },
        [ordenes, ordenEnUndo, ejecutarCompletadoServidor]
    );

    const deshacerTerminarOrden = useCallback(() => {
        if (!ordenEnUndo) return;
        if (timerUndoRef.current) {
            clearTimeout(timerUndoRef.current);
            timerUndoRef.current = null;
        }
        setOrdenes(prev => ordenarPedidos([...prev, ordenEnUndo]));
        setOrdenEnUndo(null);
    }, [ordenEnUndo]);

    useEffect(() => {
        return () => {
            if (timerUndoRef.current) {
                clearTimeout(timerUndoRef.current);
            }
        };
    }, []);

    return {
        ordenes,
        cargando,
        ahora,
        ordenEnUndo,
        playNotificationSound,
        terminarOrden,
        deshacerTerminarOrden
    };
}
