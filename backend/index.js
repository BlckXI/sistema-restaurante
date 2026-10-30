const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const { createApp } = require('./src/app');
const { verificarTokenSocket } = require('./src/middlewares/auth');

const corsOrigin = process.env.CORS_ORIGIN || '*';

const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token']
    },
    transports: ['polling', 'websocket'],
    allowEIO3: true
});

app.set('io', io);
io.use(verificarTokenSocket);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor ONLINE en puerto ${PORT}`);
});