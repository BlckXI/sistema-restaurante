import { io } from 'socket.io-client';
import { URL_BACKEND } from './config';

export const socketClient = io(URL_BACKEND);