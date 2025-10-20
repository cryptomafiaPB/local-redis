import { promises as fs } from 'fs';
import type { RedisStore } from './db.js';

export class StorePersistence {
  private filePath: string;
  private store: RedisStore;

  constructor(store: RedisStore, filePath = './redis_dump.json') {
    this.store = store;
    this.filePath = filePath;
  }

  async save(): Promise<void> {
    console.log('[Persistence] Saving snapshot to', this.filePath);
    const tmpFile = this.filePath + '.tmp';
    const data = JSON.stringify(this.store.toJSON(), null, 2);
    await fs.writeFile(tmpFile, data, 'utf-8');
    console.log(
      '[Persistence] Snapshot written to temp file, renaming to',
      this.filePath,
    );
    await fs.rename(tmpFile, this.filePath);
    console.log('[Persistence] Snapshot saved successfully');
  }

  async load(): Promise<boolean> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      this.store.fromJSON(JSON.parse(data));
      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File does not exist, nothing to load
        console.log('[Persistence] No existing snapshot, starting fresh');
      } else {
        console.error('[Persistence] Failed to load snapshot:', error);
      }
      return false;
    }
  }
}
