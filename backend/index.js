const express = require('express');
const cors = require('cors');
const { Server } = require("socket.io");
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app); 
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// Inyectar io globalmente para los controllers
app.use((req, res, next) => {
    req.io = io;
    next();
});

// --- RUTAS BASE ---
app.get('/', (req, res) => { res.send('Servidor Restaurante V5.0 (Clean Architecture)'); });

// --- ENRUTADORES ---
app.use('/ordenes', require('./src/routes/orderRoutes'));
app.use('/', require('./src/routes/menuRoutes'));
app.use('/', require('./src/routes/reportRoutes'));
app.use('/repartidor', require('./src/routes/deliveryRoutes'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`✅ Servidor ONLINE en puerto ${PORT}`); });