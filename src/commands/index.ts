import { RedisStore } from '../store/db.js';
import { StorePersistence } from '../store/persistence.js';
import type { PubSubManager } from '../store/pubsub.js';

export class CommandDispatcher {
  private store: RedisStore;
  private persistence: StorePersistence;
  private pubsub: PubSubManager;
  private connection: any;
  private stats: () => { [key: string]: number };

  constructor(
    store: RedisStore,
    persistence: StorePersistence,
    pubsub: PubSubManager,
    connection?: any,
    options: { getStats?: () => { [key: string]: number } } = {}
  ) {
    this.store = store;
    this.persistence = persistence ?? new StorePersistence(store);
    this.pubsub = pubsub;
    this.connection = connection;
    this.stats = options.getStats ?? (() => ({}));
  }

  setConnection(conn: any) {
    this.connection = conn;
  }

  async dispatch(cmdArr: Array<{ type: string; value: string }>): Promise<{
    type?: 'simple' | 'bulk' | 'integer' | 'array';
    value?: string | number | string[] | null | (string | number)[][];
    error?: string;
  }> {
    if (!Array.isArray(cmdArr) || cmdArr.length === 0)
      return { error: 'ERR empty command' };

    const command = cmdArr[0]?.value?.toUpperCase();
    const args = cmdArr.slice(1).map((arg) => arg.value);

    switch (command) {
      case 'PING':
        if (args.length > 1)
          return { error: `ERR wrong number of arguments for 'PING' command` };
        return { type: 'simple', value: args[0] ?? 'PONG' };

      case 'SET':
        if (args.length !== 2)
          return { error: `ERR wrong number of arguments for 'SET' command` };
        this.store.set(args[0]!, args[1]!);
        return { type: 'simple', value: 'OK' };

      case 'GET':
        if (args.length !== 1)
          return { error: `ERR wrong number of arguments for 'GET' command` };
        const value = this.store.get(args[0]!);
        return { type: 'bulk', value: value };

      case 'DEL':
        if (args.length < 1)
          return { error: `ERR wrong number of arguments for 'DEL' command` };
        let deleted = 0;
        for (const key of args) {
          deleted += this.store.del(key);
        }
        return { type: 'integer', value: deleted };

      case 'EXPIRE':
        if (args.length !== 2)
          return {
            error: `ERR wrong number of arguments for 'EXPIRE' command`,
          };
        if (isNaN(Number(args[1])))
          return { error: 'ERR value is not an integer or out of range' };
        const expireResult = this.store.expire(args[0]!, Number(args[1]));
        return { type: 'integer', value: expireResult };

      case 'TTL':
        if (args.length !== 1)
          return { error: `ERR wrong number of arguments for 'TTL' command` };
        const ttlResult = this.store.ttl(args[0]!);
        return { type: 'integer', value: ttlResult };

      case 'HSET':
        if (args.length !== 3)
          return { error: `ERR wrong number of arguments for 'HSET' command` };
        // HSET key field value
        const hsetResult = this.store.hset(args[0]!, args[1]!, args[2]!);
        return { type: 'integer', value: hsetResult };

      case 'HGET':
        if (args.length !== 2)
          return { error: `ERR wrong number of arguments for 'HGET' command` };
        // HGET key field
        const hgetResult = this.store.hget(args[0]!, args[1]!);
        return { type: 'bulk', value: hgetResult };

      case 'HGETALL':
        if (args.length !== 1)
          return {
            error: `ERR wrong number of arguments for 'HGETALL' command`,
          };
        // HGETALL key
        const hgetallResult = this.store.hgetall(args[0]!);
        if (!hgetallResult) return { type: 'array', value: [] };
        // RESP array alternating [field, value, field, value, ...]
        const flatArray = Object.entries(hgetallResult).flat();
        return { type: 'array', value: flatArray };

      case 'HDEL':
        if (args.length !== 2)
          return { error: `ERR wrong number of arguments for 'HDEL' command` };
        // HDEL key field
        const hdelResult = this.store.hdel(args[0]!, args[1]!);
        return { type: 'integer', value: hdelResult };

      // List commands

      case 'LPUSH':
        if (args.length < 2)
          return { error: `ERR wrong number of arguments for 'LPUSH'` };
        // LPUSH key value [value ...]
        const lpushResult = this.store.lpush(args[0]!, ...args.slice(1));
        return { type: 'integer', value: lpushResult };

      case 'RPUSH':
        if (args.length < 2)
          return { error: `ERR wrong number of arguments for 'RPUSH'` };
        // RPUSH key value [value ...]
        const rpushResult = this.store.rpush(args[0]!, ...args.slice(1));
        return { type: 'integer', value: rpushResult };

      case 'LPOP':
        if (args.length !== 1)
          return { error: `ERR wrong number of arguments for 'LPOP'` };
        // LPOP key
        const lpopResult = this.store.lpop(args[0]!);
        return { type: 'bulk', value: lpopResult };

      case 'RPOP':
        if (args.length !== 1)
          return { error: `ERR wrong number of arguments for 'RPOP'` };
        // RPOP key
        const rpopResult = this.store.rpop(args[0]!);
        return { type: 'bulk', value: rpopResult };

      case 'LRANGE':
        if (args.length !== 3)
          return { error: `ERR wrong number of arguments for 'LRANGE'` };
        // LRANGE key start end
        const start = Number(args[1]);
        const end = Number(args[2]);
        if (isNaN(start) || isNaN(end))
          return { error: `ERR index is not an integer` };
        const lrangeResult = this.store.lrange(args[0]!, start, end);
        return { type: 'array', value: lrangeResult };

      // Set commands

      case 'SADD':
        if (args.length < 2)
          return { error: `ERR wrong number of arguments for 'SADD'` };
        // SADD key member [member ...]
        const saddResult = this.store.sadd(args[0]!, ...args.slice(1));
        return { type: 'integer', value: saddResult };

      case 'SMEMBERS':
        if (args.length !== 1)
          return { error: `ERR wrong number of arguments for 'SMEMBERS'` };
        // SMEMBERS key
        const smembersResult = this.store.smembers(args[0]!);
        return { type: 'array', value: smembersResult };

      case 'SREM':
        if (args.length < 2)
          return { error: `ERR wrong number of arguments for 'SREM'` };
        // SREM key member [member...]
        const sremResult = this.store.srem(args[0]!, ...args.slice(1));
        return { type: 'integer', value: sremResult };

      case 'SAVE':
        await this.persistence.save();
        return { type: 'simple', value: 'OK' };

      //////////////////////////////// Pub/Sub Commands ////////////////////////////////

      case 'SUBSCRIBE':
        if (!this.connection || args.length < 1)
          return { error: 'ERR SUBSCRIBE must be tied to a connection' };
        for (const ch of args) {
          this.pubsub.subscribe(this.connection, ch);
        }
        // RESP format: ["subscribe", channel, total_subscriptions]
        return {
          type: 'array',
          value: args.map((ch) => [
            'subscribe',
            ch,
            this.pubsub.getSubscriptions(this.connection).length,
          ]),
        };

      case 'UNSUBSCRIBE':
        if (!this.connection)
          return { error: 'ERR UNSUBSCRIBE must be tied to a connection' };
        if (args.length > 0) {
          for (const ch of args) {
            this.pubsub.unsubscribe(this.connection, ch);
          }
        } else {
          this.pubsub.unsubscribeAll(this.connection);
        }
        return {
          type: 'array',
          value: args.map((ch) => [
            'unsubscribe',
            ch,
            this.pubsub.getSubscriptions(this.connection).length,
          ]),
        };

      case 'PUBLISH':
        if (args.length !== 2)
          return {
            error: "ERR wrong number of arguments for 'PUBLISH' command",
          };
        const receivers = this.pubsub.publish(args[0]!, args[1]!);
        return { type: 'integer', value: receivers };

      case "INFO": {
        const stats = this.stats();
        const keysCount = this.store.getStringsCount() + this.store.getHashesCount()
          + this.store.getListsCount() + this.store.getSetsCount();
        const pubsubChannels = this.pubsub.getChannelCount();
        const pubsubClients = this.pubsub.getUniqueConnectionsCount();

        const info = [
          "# Server",
          `redis_mock_version:1.0.0`,
          `uptime_in_seconds:${stats.uptime}`,
          `connected_clients:${stats.connectedClients}`,
          "",
          "# Stats",
          `total_commands_processed:${stats.totalCommandsProcessed}`,
          `total_connections_received:${stats.totalConnectionsReceived}`,
          "",
          "# Keys",
          `keys:${keysCount}`,
          "",
          "# PubSub",
          `pubsub_channels:${pubsubChannels}`,
          `pubsub_clients:${pubsubClients}`,
          ""
        ].join("\r\n");

        return { type: "bulk", value: info };
      }

      default:
        return { error: `ERR unknown command '${command}'` };
    }
  }
}
