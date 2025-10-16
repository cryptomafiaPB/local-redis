export class RedisStore {
    private strings: Map<string, string> = new Map();
    private expiries: Map<string, number> = new Map(); // key -> ms timestamp

    // Helper to check & remove expired key (called before any access)
    private checkExpiry(key: string): boolean {
        const ts = this.expiries.get(key);
        if (typeof ts === "number" && Date.now() >= ts) {
            this.strings.delete(key);
            this.expiries.delete(key);
            return true;
        }
        return false;
    }

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
}
