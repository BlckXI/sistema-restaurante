import { io } from 'socket.io-client';
import { URL_BACKEND, AUTH_STORAGE_KEY } from './config';

export const socketClient = io(URL_BACKEND, {
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    auth: (cb) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem(AUTH_STORAGE_KEY) : null;
        cb(token ? { token } : {});
    }
});