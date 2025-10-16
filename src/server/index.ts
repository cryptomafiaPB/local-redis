import net from 'node:net';
import { Connection } from './connection.js';

const PORT = Number(process.env.PORT) || 6380; // Default Redis port is 6379

const server = net.createServer((socket) => {
    console.log("New client connected");
    new Connection(socket);
});

server.on('error', (err) => {
    console.error("[Local Redis] server error:", err);
});

server.listen(PORT, () => {
    console.log(`[Local Redis] Server listening on ${PORT}`);
});