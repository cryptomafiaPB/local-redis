const net = require('net');
const client = new net.Socket();
client.connect(6380, '127.0.0.1', () => {
    const cmd = '*1\r\n$4\r\nSAVE\r\n';
    client.write(cmd);
});
client.on('data', (data) => {
    console.log('Received from server:', data.toString());
    client.destroy();
});
client.on('error', (err) => console.error('Client error', err));
