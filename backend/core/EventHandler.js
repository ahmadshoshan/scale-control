// core/EventHandler.js
class EventHandler {
    constructor({ io, db, serialManager, cameraService, notifications }) {
        this.io = io;
        this.db = db;
        this.serialManager = serialManager;
        this.cameraService = cameraService;
        this.notifications = notifications;

        // حالة المعالج
        this.printerBuffer = [];
        this.expectedPrinterLines = 7;
        
        this.sensorState = {
            match: "",
            match1: "",
            lastMessage: '',
            NE: '00',
            intervals: {
                sendInterval: null,
                sendInterval2: null,
                sendInterval3: null
            }
        };
    }

    // 🖨️ معالجة بيانات الطابعة
    handlePrinterData(data, state) {
        const line = this._cleanPrinterText(data);
        console.log(`print: ${line}`);

        if (!line || line.includes('') || !this._isValidPrinterLine(line)) {
            return;
        }

        this.printerBuffer.push(line);

        if (this.printerBuffer.length === this.expectedPrinterLines) {
            this._processPrinterRecord(state);
        }
    }

    // ⚖️ معالجة بيانات الميزان
    handleSensorData(data, state) {
        const currentMessage = data
            .replace(/[\x00-\x1F\x7F]/g, '')
            .trim();

        // منع التكرار
        if (currentMessage !== this.sensorState.lastMessage) {
            if (currentMessage.slice(-2).toUpperCase() === "NE") {
                this.sensorState.NE = currentMessage;
            }
            this.sensorState.lastMessage = currentMessage;
        }

        this.io.emit('response', data.trim());

        // تحليل الوزن
        const weight = this._parseWeight(data);
        this._handleWeightAlerts(weight);

        // معالجة GROSS و DATE
        this._processSensorCommands(currentMessage, state);
    }

    // 🔧 دوال مساعدة خاصة بـ EventHandler
    _cleanPrinterText(text) {
        return text
            .toString('utf8')
            .replace(/�/g, '')
            .replace(/[^\x20-\x7E\u0600-\u06FF]/g, '')
            .trim();
    }

    _isValidPrinterLine(line) {
        return (
            /^\d{2}\/\d{2}\/\d{4}$/.test(line) ||
            /^\d{2}:\d{2}[AP]M$/.test(line) ||
            /^\d+$/.test(line) ||
            /kg/i.test(line)
        );
    }

    _parseWeight(data) {
        const cleaned = data.replace(/[^0-9.-]/g, "");
        const weight = parseFloat(cleaned.trim());
        return isNaN(weight) ? null : weight;
    }

    _handleWeightAlerts(weight) {
        if (weight === null) return;

        // ⚠️ تنبيه: وزن سالب
        if (weight < -10) {
            this.notifications.playSoundIfEnabled("yagib_tasfier_almezan.mp3");
            
            if (!this.sensorState.intervals.sendInterval2) {
                this.sensorState.intervals.sendInterval2 = setInterval(() => {
                    this.notifications.sendTelegramIfEnabled(`يجب تصفير الميزان ${weight}`);
                }, 5000);
            }
        } else {
            this._clearInterval('sendInterval2');
        }

        // 🚗 تنبيه: وجود سيارة
        if (weight > 300) {
            this.notifications.playSoundIfEnabled("yogad_sayara_almezan1.mp3");
            
            if (!this.sensorState.intervals.sendInterval) {
                this.sensorState.intervals.sendInterval = setInterval(() => {
                    this.serialManager.sendCommand('p');
                }, 1000);
                
                if (!this.sensorState.intervals.sendInterval3) {
                    this.sensorState.intervals.sendInterval3 = setInterval(() => {
                        this.notifications.sendTelegramIfEnabled(`يوجد سياره علي الميزان ${weight}`);
                    }, 5000);
                }
            }
        } else {
            this._clearInterval('sendInterval');
            this._clearInterval('sendInterval3');
        }
    }

    _clearInterval(name) {
        if (this.sensorState.intervals[name]) {
            clearInterval(this.sensorState.intervals[name]);
            this.sensorState.intervals[name] = null;
        }
    }

    _processSensorCommands(message, state) {
        const startsWith = (prefix) => message.startsWith(prefix);

        if (startsWith("GROSS{") && this.sensorState.match === "") {
            this.sensorState.match = message.match(/^GROSS\{(.*)\}$/);
        }
        
        if (startsWith("DATE{") && this.sensorState.match1 === "") {
            this.sensorState.match1 = message.match(/^DATE\{(.*)\}$/);
            
            if (this.sensorState.match && this.sensorState.match1) {
                this._saveSensorData(state);
            }
        }
    }

    _saveSensorData(state) {
        const images = `${Date.now()}_${this.sensorState.match[1]}_${this.sensorState.NE}`;
        
        const query = 'INSERT INTO sensor_data (data_value,date,number,type,customer,images) VALUES (?,?,?,?,?,?)';
        
        this.db.query(query, [
            this.sensorState.match[1], 
            this.sensorState.match1[1], 
            this.sensorState.NE, 
            state.type_id, 
            state.customer_id, 
            images
        ], (err, results) => {
            if (err) {
                console.error('err db:', err.message);
            } else {
                this.cameraService.captureImage(images, 'sensor');
                this.io.emit('responseID', '');
                this.io.emit('id:new', {
                    gross: this.sensorState.match[1],
                    NE: this.sensorState.NE,
                    images
                });
                state.type_id = '';
                state.customer_id = '';
            }
            // إعادة تعيين الحالة
            this.sensorState.match = "";
            this.sensorState.match1 = "";
            this.sensorState.NE = '';
        });
    }

    _processPrinterRecord(state) {
        const [date, time, sn, number, gross, tare, net] = this.printerBuffer;
        const images = `${Date.now()}_${number}_${net}`;

        const query = `
            INSERT INTO printer 
            (date, time, sn, number, gross, tare, net, type, customer, note, images) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        this.db.query(query, [date, time, sn, number, gross, tare, net, '', '', '', images], async (err, results) => {
            if (err) {
                console.error('printer err db:', err.message);
            } else {
                console.log('printer: save');
                
                this.io.emit('printer:new', {
                    id: results.insertId, date, time, sn, number, gross, tare, net,
                    customer: '', type: '', images
                });

                await this.cameraService.captureImage(images, 'print');
            }

            // التحقق من حالة الطباعة
            this.db.query("SELECT print FROM control WHERE id = 1", async (err, rows) => {
                if (err) {
                    console.error("خطأ في قراءة جدول control:", err.message);
                    return;
                }
                // كود الطباعة (معلق)
            });

            // إعادة تعيين
            state.type_p = '';
            state.customer_p = '';
            this.printerBuffer = [];
        });
    }
}

module.exports = EventHandler;
