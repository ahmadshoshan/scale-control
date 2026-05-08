// core/SerialManager.js
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const EventEmitter = require('events');

class SerialManager extends EventEmitter {
    constructor({ port1, port2, baudRate = 9600 }) {
        super();
        this.baudRate = baudRate;
        this.ports = {};
        this.parsers = {};
        
        this._initPort('printer', port1);
        this._initPort('sensor', port2);
    }

    _initPort(name, portPath) {
        if (!portPath) {
            console.warn(`⚠️ ${name} port path not provided`);
            return;
        }

        try {
            this.ports[name] = new SerialPort({ path: portPath, baudRate: this.baudRate });
            this.parsers[name] = this.ports[name].pipe(new ReadlineParser({ delimiter: '\r\n' }));

            this.ports[name].on('error', (err) => {
                console.error(`❌ ${name} SerialPort error:`, err.message);
                this.emit('error', { port: name, error: err });
            });

            console.log(`✅ ${name} port initialized: ${portPath}`);
        } catch (err) {
            console.error(`❌ Failed to initialize ${name} port:`, err.message);
        }
    }

    // 🖨️ الاستماع لبيانات الطابعة
    onPrinterData(callback) {
        if (this.parsers.printer) {
            this.parsers.printer.on('data', callback);
        }
        return this;
    }

    // ⚖️ الاستماع لبيانات الميزان
    onSensorData(callback) {
        if (this.parsers.sensor) {
            this.parsers.sensor.on('data', callback);
        }
        return this;
    }

    // 📡 إرسال أمر للميزان
    sendCommand(command, callback) {
        if (this.ports.sensor) {
            this.ports.sensor.write(`${command}\r`, (err) => {
                if (err) {
                    console.error('خطأ في إرسال command:', err.message);
                }
                if (callback) callback(err);
            });
        } else {
            console.error('❌ Sensor port not available');
            if (callback) callback(new Error('Sensor port not available'));
        }
    }

    // 🔌 إغلاق جميع المنافذ
    async close() {
        for (const [name, port] of Object.entries(this.ports)) {
            if (port && port.isOpen) {
                await new Promise((resolve) => {
                    port.close((err) => {
                        if (err) console.error(`Error closing ${name}:`, err.message);
                        console.log(`🔌 ${name} port closed`);
                        resolve();
                    });
                });
            }
        }
    }
}

module.exports = SerialManager;