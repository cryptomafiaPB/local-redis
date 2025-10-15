import type { error } from "console";
import { RedisStore } from "../store/db.js";

export class CommandDispatcher {
    private store: RedisStore;

    constructor(store: RedisStore) {
        this.store = store;
    }

    dispatch(cmdArr: Array<{
        type: string; value:
        string
    }>) {
        const command = cmdArr[0]?.value?.toUpperCase();
        const args = cmdArr.slice(1).map(arg => arg.value);

        switch (command) {
            case "SET":
                if (args.length !== 2) {
                    return { error: 'ERR wrong number of arguments for \'SET\' command' };
                }

                this.store.set(args[0]!, args[1]!);
                return { type: 'simple', value: 'OK' };

            case "GET":
                if (args.length !== 1) {
                    return { error: 'ERR wrong number of arguments for \'GET\' command' };
                }

                const value = this.store.get(args[0]!);
                return { type: 'bulk', value: value };

            case "DEL":
                if (args.length < 1) {
                    return { error: 'ERR wrong number of arguments for \'DEL\' command' };
                }

                let deleted = 0
                for (const key of args) {
                    deleted += this.store.del(key);
                }
                return { type: 'integer', value: deleted };

            default:
                return { error: `ERR unknown command '${command}'` };
        }
    }

}