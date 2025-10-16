import net from 'net';
import { Protocol } from './protocol.js';
import { RedisStore } from '../store/db.js';
import { CommandDispatcher } from '../commands/index.js';

const sharedStore = new RedisStore();

export class Connection {
    private socket: net.Socket;
    private protocol: Protocol;
    private dispatcher: CommandDispatcher;

    constructor(socket: net.Socket) {
        this.socket = socket;
        this.protocol = new Protocol();
        this.dispatcher = new CommandDispatcher(sharedStore);

        this.protocol.onMessage((msg) => this.handleMessage(msg));
        this.protocol.onError((err) => this.handleError(err));
        socket.on('data', (chunk) => this.protocol.feed(chunk));
        socket.on('error', (err) => this.handleError(err));
        socket.on('end', () => this.handleEnd());
    }

    private writeResponse(response: Buffer | string): void {
        try {
            this.socket.write(response);
        } catch (err) {
            console.error('Failed to write response:', err);
        }
    }

    private handleMessage(msg: any): void {
        if (
            typeof msg === "object" &&
            msg &&
            'type' in msg &&
            msg.type === 'array' &&
            Array.isArray(msg.value)
        ) {
            const resp = this.dispatcher.dispatch(msg.value);

            if ('error' in resp) {
                this.writeResponse(this.protocol.encoder.error(resp.error));
            } else if (resp.type === 'simple' && typeof resp.value === 'string') {
                this.writeResponse(this.protocol.encoder.simple(resp.value));
            } else if (resp.type === 'bulk') {
                const value = resp.value;
                let bulkArg: string | Buffer | null;
                if (value === null || value === undefined) {
                    bulkArg = null;
                } else if (typeof value === 'number') {
                    bulkArg = value.toString();
                } else if (typeof value === 'string' || Buffer.isBuffer(value)) {
                    bulkArg = value;
                } else {
                    // fallback to string representation for other types
                    bulkArg = String(value);
                }
                this.writeResponse(this.protocol.encoder.bulk(bulkArg));
            } else if (resp.type === 'integer' && typeof resp.value === 'number') {
                this.writeResponse(this.protocol.encoder.integer(resp.value));
            } else {
                this.writeResponse(
                    this.protocol.encoder.error('ERR unknown response type')
                );
            }
        } else {
            this.writeResponse(this.protocol.encoder.error('ERR invalid input'));
        }
    }

    private handleError(err: Error): void {
        console.error("Connection error:", err);
        this.writeResponse(
            this.protocol.encoder.error(`ERR protocol error: ${err.message}`)
        );
    }

    private handleEnd(): void {
        console.log("Connection ended");
    }
}
