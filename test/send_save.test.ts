import net from "node:net"
import { describe, expect, it } from "vitest";
const client = new net.Socket();
// client.connect(6380, '127.0.0.1', () => {
//   const cmd = '*1\r\n$4\r\nSAVE\r\n';
//   client.write(cmd);
// });
// client.on('data', (data) => {
//   console.log('Received from server:', data.toString());
//   client.destroy();
// });
// client.on('error', (err) => console.error('Client error', err));

describe("send_save", () => {
  it("sends SAVE command to server", (done) => {
    client.connect(6380, '127.0.0.1', () => {
      const cmd = '*1\r\n$4\r\nSAVE\r\n';
      client.write(cmd);
      // expect(cmd).toBe('+OK\r\n'); // +OK
    });
    client.on('data', (data) => {
      console.log('Received from server:', data.toString());
      expect(data.toString()).toBe('+OK\r\n'); // +OK
      client.destroy();
      // done();
    });
    client.on('error', (err) => {
      console.error('Client error', err);
      // done(err);
    });
  })
});