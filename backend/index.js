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

let app;

const server = http.createServer((req, res) => {
    if (req.url && req.url.startsWith('/socket.io')) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Refresh-Token');
        return;
    }
    if (app) {
        app(req, res);
    }
});

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS']
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
});

io.engine.on('headers', (headers) => {
    headers['Access-Control-Allow-Origin'] = '*';
});

app = createApp(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor ONLINE en puerto ${PORT}`);
});