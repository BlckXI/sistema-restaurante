import { io } from 'socket.io-client';
import { URL_BACKEND } from './config';

export const socketClient = io(URL_BACKEND, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
});