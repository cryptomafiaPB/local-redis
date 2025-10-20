import { RESLEncoder, RESPParser, type RESPValue } from 'redis-parser-ts';

export class Protocol {
  private parser: RESPParser;
  public readonly encoder: typeof RESLEncoder;

  constructor() {
    this.parser = new RESPParser();
    this.encoder = RESLEncoder;
  }

  feed(data: Buffer | string) {
    this.parser.feed(data);
  }

  onMessage(callback: (msg: RESPValue) => void) {
    this.parser.on('message', callback);
  }

  onError(callback: (err: Error) => void) {
    this.parser.on('error', callback);
  }
}
