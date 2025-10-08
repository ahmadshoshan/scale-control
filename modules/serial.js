// modules/serial.js
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
require('dotenv').config();


function createSerial(path) {
const port = new SerialPort({
path,
baudRate: parseInt(process.env.BAUDRATE || '9600', 10),
dataBits: 8,
parity: 'none',
stopBits: 1,
autoOpen: true
});


const parser = port.pipe(new ReadlineParser({ delimiter: '\\r\\n' }));


port.on('error', (err) => console.error(`${path} error:`, err.message));


return { port, parser };
}


module.exports = { createSerial };