export class RedisStore {
    private strings: Map<string, string> = new Map();

    set(key: string, value: string): void {
        this.strings.set(key, value);
    }

    get(key: string): string | null {
        return this.strings.has(key) ? this.strings.get(key)! : null;
    }

    del(key: string): number {
        if (this.strings.has(key)) {
            this.strings.delete(key);
            return 1;
        }
        return 0;
    }
}