import { RedisStore } from "../store/db.js";
import type { RESPValue } from "redis-parser-ts";

export class CommandDispatcher {
    private store: RedisStore;

    constructor(store: RedisStore) {
        this.store = store;
    }

    dispatch(cmdArr: Array<{ type: string; value: string }>): {
        type?: 'simple' | 'bulk' | 'integer';
        value?: string | number | null;
        error?: string;
    } {
        if (!Array.isArray(cmdArr) || cmdArr.length === 0)
            return { error: 'ERR empty command' };

        const command = cmdArr[0]?.value?.toUpperCase();
        const args = cmdArr.slice(1).map(arg => arg.value);

        switch (command) {
            case "PING":
                // If an argument is provided, echo it; otherwise "PONG"
                if (args.length > 1)
                    return { error: `ERR wrong number of arguments for 'PING' command` };
                return { type: 'simple', value: args[0] ?? "PONG" };

            case "SET":
                if (args.length !== 2)
                    return { error: `ERR wrong number of arguments for 'SET' command` };
                this.store.set(args[0]!, args[1]!);
                return { type: 'simple', value: 'OK' };

            case "GET":
                if (args.length !== 1)
                    return { error: `ERR wrong number of arguments for 'GET' command` };
                // If key does not exist, return bulk null
                const value = this.store.get(args[0]!);
                return { type: 'bulk', value: value };

            case "DEL":
                if (args.length < 1)
                    return { error: `ERR wrong number of arguments for 'DEL' command` };
                let deleted = 0;
                for (const key of args) {
                    deleted += this.store.del(key);
                }
                return { type: 'integer', value: deleted };

            default:
                return { error: `ERR unknown command '${command}'` };
        }
    }
}