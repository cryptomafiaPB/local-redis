import type { Connection } from '../server/connection.js';

export class PubSubManager {
  private channelMap: Map<string, Set<Connection>> = new Map();

  subscribe(conn: Connection, channel: string) {
    let conns = this.channelMap.get(channel);
    if (!conns) {
      conns = new Set();
      this.channelMap.set(channel, conns);
    }
    conns.add(conn);
    conn.subscribedChannels.add(channel);
  }

  unsubscribe(conn: Connection, channel?: string) {
    if (channel) {
      const conns = this.channelMap.get(channel);
      if (conns) {
        conns.delete(conn);
        if (conns.size === 0) this.channelMap.delete(channel);
      }
      conn.subscribedChannels.delete(channel);
    } else {
      for (const ch of conn.subscribedChannels) {
        this.unsubscribe(conn, ch);
      }
    }
  }

  unsubscribeAll(conn: Connection) {
    for (const ch of conn.subscribedChannels) {
      this.unsubscribe(conn, ch);
    }
  }

  publish(channel: string, message: string): number {
    const conns = this.channelMap.get(channel);
    if (!conns) return 0;
    for (const conn of conns) {
      // Send pub/sub message: ["message", channel, message]
      conn.sendPubSubMessage(['message', channel, message]);
    }
    return conns.size;
  }

  getSubscriptions(conn: Connection): string[] {
    return Array.from(conn.subscribedChannels);
  }
}
