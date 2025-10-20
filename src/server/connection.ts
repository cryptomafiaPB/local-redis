import net from 'net';
import { Protocol } from './protocol.js';
import { RedisStore } from '../store/db.js';
import { CommandDispatcher } from '../commands/index.js';
import { StorePersistence } from '../store/persistence.js';
import type { PubSubManager } from '../store/pubsub.js';

// const sharedStore = new RedisStore();

export class Connection {
  private socket: net.Socket;
  private protocol: Protocol;
  private dispatcher: CommandDispatcher;
  public subscribedChannels: Set<string> = new Set();
  private pubsub: PubSubManager;

  constructor(
    socket: net.Socket,
    store: RedisStore,
    persistence: StorePersistence,
    pubsub: PubSubManager,
  ) {
    this.socket = socket;
    this.protocol = new Protocol();
    this.dispatcher = new CommandDispatcher(store, persistence, pubsub, this);
    this.pubsub = pubsub;

    this.protocol.onMessage(async (msg) => await this.handleMessage(msg));
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

  private async handleMessage(msg: any): Promise<void> {
    if (
      typeof msg === 'object' &&
      msg &&
      'type' in msg &&
      msg.type === 'array' &&
      Array.isArray(msg.value)
    ) {
      const resp = await this.dispatcher.dispatch(msg.value);

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
      } else if (resp.type === 'array' && Array.isArray(resp.value)) {
        const arr = resp.value.map((item: any) => {
          if (item === null || item === undefined) return null;
          else if (typeof item === 'number') return item.toString();
          else if (typeof item === 'string' || Buffer.isBuffer(item))
            return item;
          else return String(item);
        });
        this.writeResponse(this.protocol.encoder.array(arr));
      } else {
        this.writeResponse(
          this.protocol.encoder.error('ERR unknown response type'),
        );
      }
    } else {
      this.writeResponse(this.protocol.encoder.error('ERR invalid input'));
    }
  }

  private handleError(err: Error): void {
    console.error('Connection error:', err);
    this.writeResponse(
      this.protocol.encoder.error(`ERR protocol error: ${err.message}`),
    );
  }

  private handleEnd(): void {
    console.log('Connection ended');
    if (this.pubsub) {
      this.pubsub.unsubscribeAll(this);
    }
  }

  // Helper for PUB/SUB
  sendPubSubMessage(msg: any[]) {
    this.writeResponse(this.protocol.encoder.array(msg));
  }
}
