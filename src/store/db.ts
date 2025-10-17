export class RedisStore {
    private strings: Map<string, string> = new Map();
    private expiries: Map<string, number> = new Map(); // key => ms timestamp
    private hashes: Map<string, Map<string, string>> = new Map();
    private lists: Map<string, Array<string>> = new Map();
    private sets: Map<string, Set<string>> = new Map();

    private checkExpiry(key: string): boolean {
        const ts = this.expiries.get(key);
        if (typeof ts === "number" && Date.now() >= ts) {
            this.strings.delete(key);
            this.expiries.delete(key);
            return true;
        }
        return false;
    }

    // String commands

    set(key: string, value: string): void {
        this.checkExpiry(key); // Optional: clean up before overwrite
        this.strings.set(key, value);
        // Preserve expiry if already set
    }

    get(key: string): string | null {
        if (this.checkExpiry(key)) return null;
        return this.strings.has(key) ? this.strings.get(key)! : null;
    }

    del(key: string): number {
        this.checkExpiry(key);
        let deleted = 0;
        if (this.strings.has(key)) {
            this.strings.delete(key);
            deleted = 1;
        }
        this.expiries.delete(key);
        return deleted;
    }

    // Expiry commands

    expire(key: string, seconds: number): number {
        if (!this.strings.has(key) || this.checkExpiry(key)) return 0;
        const expiryTs = Date.now() + seconds * 1000;
        this.expiries.set(key, expiryTs);
        return 1;
    }

    ttl(key: string): number {
        if (!this.strings.has(key) || this.checkExpiry(key)) return -2; // key does not exist
        const ts = this.expiries.get(key);
        if (ts == null) return -1; // no expiry
        const ttlMs = ts - Date.now();
        return ttlMs > 0 ? Math.floor(ttlMs / 1000) : -2; // expired
    }

    // Hash commands

    hset(key: string, field: string, value: string): number {
        if (this.checkExpiry(key)) return 0;
        let hash = this.hashes.get(key);
        if (!hash) {
            hash = new Map();
            this.hashes.set(key, hash);
        }
        const isNew = !hash.has(field);
        hash.set(field, value);
        return isNew ? 1 : 0;
    }

    hget(key: string, field: string): string | null {
        if (this.checkExpiry(key)) return null;
        const hash = this.hashes.get(key);
        return hash ? hash.get(field) ?? null : null;
    }

    hgetall(key: string): Record<string, string> | null {
        if (this.checkExpiry(key)) return null;
        const hash = this.hashes.get(key);
        if (!hash) return null;
        const obj: Record<string, string> = {};
        for (const [f, v] of hash.entries()) obj[f] = v;
        return obj;
    }

    hdel(key: string, field: string): number {
        if (this.checkExpiry(key)) return 0;
        const hash = this.hashes.get(key);
        if (hash && hash.has(field)) {
            hash.delete(field);
            if (hash.size === 0) this.hashes.delete(key);
            return 1;
        }
        return 0;
    }

    // List commands 

    lpush(key: string, ...values: string[]): number {
        if (this.checkExpiry(key)) return 0;
        let list = this.lists.get(key);
        if (!list) {
            list = [];
            this.lists.set(key, list);
        }
        list.unshift(...values);
        return list.length;
    }

    rpush(key: string, ...values: string[]): number {
        if (this.checkExpiry(key)) return 0;
        let list = this.lists.get(key);
        if (!list) {
            list = [];
            this.lists.set(key, list);
        }
        list.push(...values);
        return list.length;
    }

    lpop(key: string): string | null {
        if (this.checkExpiry(key)) return null;
        const list = this.lists.get(key);
        if (!list || list.length === 0) return null;
        const val = list.shift()!;
        if (list.length === 0) this.lists.delete(key);
        return val;
    }

    rpop(key: string): string | null {
        if (this.checkExpiry(key)) return null;
        const list = this.lists.get(key);
        if (!list || list.length === 0) return null;
        const val = list.pop()!;
        if (list.length === 0) this.lists.delete(key);
        return val;
    }

    lrange(key: string, start: number, end: number): string[] {
        if (this.checkExpiry(key)) return [];
        const list = this.lists.get(key);
        if (!list) return [];
        // Redis LRANGE semantics
        const len = list.length;
        start = start < 0 ? len + start : start;
        end = end < 0 ? len + end : end;
        start = Math.max(start, 0);
        end = Math.min(end, len - 1);
        if (start > end || start >= len) return [];
        return list.slice(start, end + 1);
    }

    // Set commands

    sadd(key: string, ...members: string[]): number {
        if (this.checkExpiry(key)) return 0;
        let set = this.sets.get(key);
        if (!set) {
            set = new Set();
            this.sets.set(key, set);
        }
        let added = 0;
        for (const m of members) {
            if (!set.has(m)) {
                set.add(m);
                added++;
            }
        }
        return added;
    }

    smembers(key: string): string[] {
        if (this.checkExpiry(key)) return [];
        const set = this.sets.get(key);
        if (!set) return [];
        return Array.from(set);
    }

    srem(key: string, ...members: string[]): number {
        if (this.checkExpiry(key)) return 0;
        const set = this.sets.get(key);
        if (!set) return 0;
        let removed = 0;
        for (const m of members) {
            if (set.delete(m)) removed++;
        }
        if (set.size === 0) this.sets.delete(key);
        return removed;
    }
}
