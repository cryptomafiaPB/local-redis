import net from 'net';
import { Protocol } from './protocol.js';

export class Connection {
    private socket: net.Socket;
    private protocol: Protocol;

    constructor(socket: net.Socket) {
        this.socket = socket;
        this.protocol = new Protocol();

        // Setup event handlers
        this.protocol.onMessage((msg) => this.handleMessage(msg));
        this.protocol.onError((err) => this.handleError(err));
        socket.on('data', (chunk) => this.protocol.feed(chunk));
        socket.on('error', (err) => this.handleError(err));
        socket.on('end', () => this.handleEnd());
    }

    private handleMessage(msg: unknown) {
        if (typeof msg === "object" && msg && 'type' in msg && msg.type === 'array') {
            console.log("Received cmd:", msg);

            // const response = this.protocol.encoder.encode("OK");
            // this.socket.write(response);

            const arr = (msg as any).value as any[];

            const command = arr[0]?.value?.toString().toUpperCase();

            if (command === "PING") {
                const response = this.protocol.encoder.simple("PONG");
                this.socket.write(response);
            } else {
                const response = this.protocol.encoder.error(`ERR unknown command`);
                this.socket.write(response);
            }
        }
        else {
            console.log("Received non-array message:", msg);
            const response = this.protocol.encoder.error(`ERR invalid input`);
            this.socket.write(response);
        }
    }

    private handleError(err: Error) {
        console.error("Connection error:", err);
        const response = this.protocol.encoder.error(`ERR protocol error: ${err.message}`);
        this.socket.write(response);
    }

    private handleEnd() {
        console.log("Connection ended");
    }
}