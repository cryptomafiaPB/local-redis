export class Logger {
    static info(...args: any[]) {
        console.log(`[INFO]`, ...args);
    }
    static error(...args: any[]) {
        console.error(`[ERROR]`, ...args);
    }
    static debug(...args: any[]) {
        if (process.env.REDIS_MOCK_DEBUG === "true") {
            console.log(`[DEBUG]`, ...args);
        }
    }
}
