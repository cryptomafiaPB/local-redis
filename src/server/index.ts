import net from 'node:net';
import { Connection } from './connection.js';
import { RedisStore } from '../store/db.js';
import { StorePersistence } from '../store/persistence.js';
import { PubSubManager } from '../store/pubsub.js';

const PORT = Number(process.env.PORT) || 6380; // Default Redis port is 6379

// global config
const PERSISTENCE_ENABLED =
  process.env.REDIS_PERSISTENCE === 'false' ? false : true;
const SNAPSHOT_FILE = process.env.REDIS_SNAPSHOT_FILE || './redis_dump.json';

const store = new RedisStore();
const persistence = new StorePersistence(store, SNAPSHOT_FILE);
const pubsub = new PubSubManager();

let totalCommandsProcessed = 0;
let totalConnectionsReceived = 0;
let startTimestamp = Date.now();
const serverStartTimestamp = Date.now()

const connectedSockets = new Set<net.Socket>();

// On startup, load existing snapshot if persistence is enabled
if (PERSISTENCE_ENABLED) {
  persistence.load();
}

// On shutdown, save snapshot if persistence is enabled
async function handleShutdown() {
  if (PERSISTENCE_ENABLED) {
    console.log('[Local Redis] Saving data before shutdown...');
    try {
      // log current in-memory snapshot for debugging
      try {
        console.log(
          '[Local Redis] Current in-memory snapshot:',
          JSON.stringify(store.toJSON(), null, 2),
        );
      } catch (e) {
        console.error('[Local Redis] Failed to stringify store snapshot:', e);
      }
      await persistence.save();
      console.log('[Local Redis] Data saved successfully.');
    } catch (error) {
      console.error('[Local Redis] Error saving data:', error);
    }
  }
  process.exit(0);
}
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

const server = net.createServer((socket) => {
  totalConnectionsReceived++;
  connectedSockets.add(socket);
  console.log('New client connected');
  new Connection(socket, store, persistence, pubsub, () => { totalCommandsProcessed++; },
    () => {
      const mem = process.memoryUsage();
      return {
        uptime: Math.floor((Date.now() - serverStartTimestamp) / 1000),
        connectedClients: connectedSockets.size,
        totalCommandsProcessed,
        totalConnectionsReceived,
        usedMemory: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
        external: mem.external
      };
    }
  );

  socket.on('close', () => {
    connectedSockets.delete(socket);
  });
});

server.on('error', (err) => {
  console.error('[Local Redis] server error:', err);
});

server.listen(PORT, () => {
  console.log(`[Local Redis] Server listening on ${PORT}`);
});
