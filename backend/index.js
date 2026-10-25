const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const { createApp } = require('./src/app');

process.on('uncaughtException', (err) => {
    if (err.code === 'ERR_HTTP_HEADERS_SENT') {
        return;
    }
    console.error('Error no capturado:', err);
});

const server = http.createServer();
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
const app = createApp(io);

server.on('request', app);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor ONLINE en puerto ${PORT}`);
});