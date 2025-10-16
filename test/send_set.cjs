const net = require('net');

const client = new net.Socket();
client.connect(6380, '127.0.0.1', () => {
    console.log('Connected to server');
    const cmd = '*3\r\n$3\r\nSET\r\n$1\r\nh\r\n$1\r\nj\r\n';
    console.log('Sending:', JSON.stringify(cmd));
    client.write(cmd);
});

client.on('data', (data) => {
    console.log('Received from server:', data.toString());
    console.log('Hex:', data.toString('hex'));
    client.destroy();
});

client.on('close', () => {
    console.log('Connection closed');
});

client.on('error', (err) => {
    console.error('Client error:', err);
});
