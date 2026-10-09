// ═══════════════════════════════════════════════════════════════════
// 🚀 نقطة الدخول وتحميل المكتبات الأساسية
// ═══════════════════════════════════════════════════════════════════
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { io } = require('socket.io-client'); // ✅ استبدال SerialPort بـ Socket.io Client

const app = express();
const server = http.createServer(app);
const ioLocal = require('socket.io')(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

let type_id = '';
let customer_id = '';
let type_p = '';
let customer_p = '';

// ✅ 1. خدمة المجلد public كامل
app.use(express.static(path.join(__dirname, 'public')));
app.use('/webfonts', express.static(path.join(__dirname, 'public/css/webfonts')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));

app.get('/webfonts/:file', (req, res) => {
    res.redirect(`/public/css/webfonts/${req.params.file}`);
});

require('dotenv').config();
const pool = require('./modules/db');
const { playSoundAlert } = require('./modules/audio');

// ═══════════════════════════════════════════════════════════════════
// 🔌 الاتصال بجسر الشبكة (Bridge.js) بدلاً من المنافذ المحلية
// ═══════════════════════════════════════════════════════════════════
// غيّر هذا الرابط إلى عنوان IP الخاص بالجهاز الذي يشغل bridge.js
const BRIDGE_URL = process.env.BRIDGE_URL || 'http://192.168.1.222:3333'; 

const remoteSocket = io(BRIDGE_URL, {
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: Infinity,
    transports: ['websocket', 'polling']
});

remoteSocket.on('connect', () => console.log(`✅ متصل بنجاح بجسر الأجهزة: ${BRIDGE_URL}`));
remoteSocket.on('connect_error', (err) => console.error(`❌ فشل الاتصال بالجسر: ${err.message}`));

// ═══════════════════════════════════════════════════════════════════
// 🖨️ معالج بيانات الطابعة (قادم من Bridge.js)
// ═══════════════════════════════════════════════════════════════════
remoteSocket.on('printer:ticket', async (ticket) => {
    const { date, time, sn, number, gross, tare, net } = ticket;
    console.log(`🖨️ استلام تذكرة من الجسر: السيارة ${number}`);

    const images = `${Date.now()}_${number}_${net}`;
    const query = `
        INSERT INTO printer 
        (date, time, sn, number, gross, tare, net, type, customer, note, images) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    pool.query(query, [date, time, sn, number, gross, tare, net, type_p, customer_p, '', images], async (err, results) => {
        if (err) {
            console.error('printer err db:', err.message);
        } else {
            console.log('printer: save local db');

            ioLocal.emit('printer:new', {
                id: results.insertId, date, time, sn, number, gross, tare, net,
                customer: customer_p || '', type: type_p || '', images
            });

            // التقاط الصور (نفس الوظيفة الأصلية)
            captureImage(images, 'print');

            pool.query("SELECT print FROM control WHERE id = 1", async (err, rows) => {
                if (err) console.error("خطأ في قراءة جدول control:", err.message);
            });
            
            type_p = '';
            customer_p = '';
        }
    });
});

// ═══════════════════════════════════════════════════════════════════
// ⚖️ معالج بيانات الميزان (قادم من Bridge.js)
// ═══════════════════════════════════════════════════════════════════
let match = "";
let match1 = "";
let lastMessage = '';
let NE = '00';
let lastSentWeight = null;
let sendInterval = null;
let sendInterval2 = null;
let sendInterval3 = null;

// دالة مساعدة لإرسال الأوامر للجسر (ليقوم الجسر بإرسالها للميزان الفعلي)
function sendCommandToScale(command) {
    remoteSocket.emit('scale:command', command);
}

remoteSocket.on('scale:data', (data) => {
    const currentMessage = data.raw;
    const weight = data.weight;

    // تحديث NE
    if (currentMessage.slice(-2).toUpperCase() === "NE") {
        NE = currentMessage;
        lastMessage = currentMessage;
    }

    // إرسال الوزن للواجهة المحلية
    if (!isNaN(weight)) {
        if (weight !== lastSentWeight) {
            lastSentWeight = weight;
            ioLocal.emit('response', currentMessage);
        }
    } else {
        ioLocal.emit('response', currentMessage);
    }

    // منطق التنبيهات والأوامر التلقائية (نفس الكود الأصلي تماماً)
    if (!isNaN(weight) && weight < -10 && (currentMessage.slice(-2).toUpperCase() !== "KN")) {
        playSoundIfEnabled("yagib_tasfier_almezan.mp3");
        if (!sendInterval2) {
            sendInterval2 = setInterval(() => {
                if (typeof sendMessageIfEnabled === 'function') {
                    sendMessageIfEnabled(`يجب تصفير الميزان ${weight}`);
                }
            }, 5000);
        }
    } else {
        if (sendInterval2) { clearInterval(sendInterval2); sendInterval2 = null; }
    }

    if (!isNaN(weight) && weight > 300) {
        playSoundIfEnabled("yogad_sayara_almezan1.mp3");
        if (!sendInterval) {
            sendInterval = setInterval(() => {
                sendCommandToScale('p\r'); // ✅ إرسال الأمر عبر الجسر
            }, 1000);
            if (!sendInterval3) {
                sendInterval3 = setInterval(() => {
                    if (typeof sendMessageIfEnabled === 'function') {
                        sendMessageIfEnabled(` يوجد سياره علي الميزان ${weight}`);
                    }
                }, 5000);
            }
        }
    } else {
        if (sendInterval) { clearInterval(sendInterval); sendInterval = null; }
        if (sendInterval3) { clearInterval(sendInterval3); sendInterval3 = null; }
    }

    // منطق GROSS و DATE (نفس الكود الأصلي)
    function startsWithGross(message) { return message.startsWith("GROSS{"); }
    function startsWithDate(dateStr) { return dateStr.startsWith("DATE{"); }

    if (startsWithGross(currentMessage) && match === "") {
        match = currentMessage.match(/^GROSS\{(.*)\}$/);
    }
    if (startsWithDate(currentMessage) && match1 === "") {
        match1 = currentMessage.match(/^DATE\{(.*)\}$/);
        
        if (match && match[1]) {
            let images = `${Date.now()}_${match[1]}_${NE}`;
            const query = 'INSERT INTO sensor_data (data_value, date, number, type, customer, images) VALUES (?,?,?,?,?,?)';
            pool.query(query, [match[1], match1[1], NE, type_id, customer_id, images], (err, results) => {
                if (err) {
                    console.error('err db:', err.message);
                } else {
                    captureImage(images, 'sensor');
                    ioLocal.emit('responseID', '');
                    ioLocal.emit('id:new', { gross: match[1], NE, images });
                    type_id = '';
                    customer_id = '';
                }
                match = ""; match1 = ""; NE = '';
            });
        }
    }
});

// ═══════════════════════════════════════════════════════════════════
// 🛠️ دوال المساعدة والواجهات (APIs)
// ═══════════════════════════════════════════════════════════════════
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function toArabicNumbers(input) {
    input = input.toString().trim();
    if (input.includes("/")) return input.replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
    let onlyNumbers = input.replace(/[^0-9]/g, '');
    return onlyNumbers.replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
}

function playSoundIfEnabled(file) {
    pool.query("SELECT sound FROM control WHERE id = 1", (err, rows) => {
        if (!err && rows[0].sound === 1) playSoundAlert(file, ioLocal);
    });
}

// ✅ معالجة الأوامر المرسلة من الواجهة (يتم توجيهها الآن للجسر)
app.get('/send-command', (req, res) => {
    type_id = req.query.type || '';
    customer_id = req.query.customer || '';
    type_p = req.query.type || '';
    customer_p = req.query.customer || '';
    const command = req.query.command;

    if (command) {
        sendCommandToScale(`${command}\r`); // ✅ إرسال عبر Socket للجسر
        res.send(`rec-: ${command} (Forwarded to Bridge)`);
    } else {
        res.status(400).send('الأمر غير صحيح');
    }
});

app.get("/get-weight", (req, res) => {
    // نعيد آخر وزن معروف أو رسالة فارغة
    res.send(lastMessage || "0");
});

app.get("/set-print/:status", (req, res) => {
    const status = req.params.status === "1" ? 1 : 0;
    pool.query("UPDATE control SET print = ? WHERE id = 1", [status], (err) => {
        if (err) return res.status(500).send("خطأ في قاعدة البيانات");
        res.send(`تم تغيير حالة الطباعة إلى: ${status}`);
    });
});

app.get("/get-print", (req, res) => {
    pool.query("SELECT print FROM control WHERE id = 1", (err, rows) => {
        if (err) return res.status(500).send("خطأ في قاعدة البيانات");
        res.json({ print: rows[0].print });
    });
});

app.get("/set-sound/:status", (req, res) => {
    const status = req.params.status === "1" ? 1 : 0;
    pool.query("UPDATE control SET sound = ? WHERE id = 1", [status], (err) => {
        if (err) return res.status(500).send("DB error");
        res.send(`sound status changed to ${status}`);
    });
});

app.get("/get-sound", (req, res) => {
    pool.query("SELECT sound FROM control WHERE id = 1", (err, rows) => {
        if (err) return res.status(500).send("DB error");
        res.json({ sound: rows[0].sound });
    });
});

// ═══════════════════════════════════════════════════════════════════
// 🗄️ مسارات جلب البيانات (Data Routes) - (نفس الكود الأصلي)
// ═══════════════════════════════════════════════════════════════════
app.get('/get-data2', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) return res.status(500).json({ error: 'فشل في الاتصال بقاعدة البيانات' });
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        const today = new Date();
        const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
        const query = 'SELECT `id`, `date`, `time`, `sn`, `number`, `gross`, `tare`, `tare2`, `net`, `customer`, `type`, `note`, `images`, `paid_amount` FROM printer WHERE date = ? ORDER BY id DESC LIMIT ? OFFSET ?';
        connection.query(query, [todayStr, limit, offset], (error, results) => {
            connection.release();
            if (error) return res.status(500).json({ error: 'خطأ في جلب البيانات' });
            res.json(results);
        });
    });
});

app.get('/get-data3', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) return res.status(500).json({ error: 'فشل في الاتصال بقاعدة البيانات' });
        const type = req.query.type;
        const value = req.query.value;
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        let query = "";
        if (type === "number") query = "SELECT * FROM printer WHERE number = ? ORDER BY id DESC LIMIT ?, ?";
        else if (type === "sn") query = "SELECT * FROM printer WHERE sn = ? ORDER BY id DESC LIMIT ?, ?";
        else if (type === "date") query = "SELECT * FROM printer WHERE date = ? ORDER BY id DESC LIMIT ?, ?";
        else { connection.release(); return res.status(400).json({ error: "نوع البحث غير صحيح" }); }
        connection.query(query, [value, offset, limit], (error, results) => {
            connection.release();
            if (error) return res.status(500).json({ error: 'خطأ في جلب البيانات' });
            res.json(results);
        });
    });
});

app.get('/get-data4', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) return res.status(500).json({ error: 'فشل في الاتصال بقاعدة البيانات' });
        const type = req.query.type;
        const value = req.query.value;
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        let query = "";
        if (type === "number") query = `SELECT * FROM sensor_data WHERE ${type} = ? ORDER BY id DESC LIMIT ? OFFSET ?`;
        else { connection.release(); return res.status(400).json({ error: "نوع البحث غير صحيح" }); }
        connection.query(query, [value, limit, offset], (error, results) => {
            connection.release();
            if (error) return res.status(500).json({ error: 'خطأ في جلب البيانات' });
            res.json(results);
        });
    });
});

app.get('/get-data', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) return res.status(500).json({ error: 'فشل في الاتصال بقاعدة البيانات' });
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        const query = 'SELECT * FROM sensor_data ORDER BY id DESC LIMIT ? OFFSET ?';
        connection.query(query, [limit, offset], (error, results) => {
            connection.release();
            if (error) return res.status(500).json({ error: 'خطأ في جلب البيانات' });
            res.json(results);
        });
    });
});

app.put('/update-ticket/:id', (req, res) => {
    const { id } = req.params;
    const { number, customer, type, gross, tare, tare2, net, note, paid_amount, extraWeightsTable } = req.body;
    let _tare2 = tare2;
    if (extraWeightsTable) {
        let extra = typeof extraWeightsTable === "string" ? JSON.parse(extraWeightsTable) : extraWeightsTable;
        _tare2 = extra.thirdWeight;
    }
    const sql = 'UPDATE printer SET number=?, customer=?, type=?, gross=?, tare=?, tare2=?, net=?, note=?, paid_amount=? WHERE id=?';
    pool.query(sql, [number, customer, type, gross, tare, _tare2, net, note, paid_amount, id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'حدث خطأ أثناء التحديث' });
        res.json({ success: true, message: 'تم تحديث البيانات بنجاح' });
    });
});

// ═══════════════════════════════════════════════════════════════════
// 📷 دالة التقاط الصور (نفس الكود الأصلي)
// ═══════════════════════════════════════════════════════════════════
const DigestFetch = require('digest-fetch').default;
const client = new DigestFetch('admin', 'admin100');

async function captureImage(car_No_Date_weight, path) {
    const urls = [
        'http://192.168.1.2/ISAPI/Streaming/channels/201/picture',
        'http://192.168.1.2/ISAPI/Streaming/channels/401/picture',
        'http://192.168.1.2/ISAPI/Streaming/channels/701/picture'
    ];
    try {
        const promises = urls.map(async (url, index) => {
            try {
                const response = await client.fetch(url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const buffer = await response.arrayBuffer();
                const fileName = `public/images/${path}/${car_No_Date_weight}_cam${index + 1}.jpg`;
                fs.writeFileSync(fileName, Buffer.from(buffer));
                return fileName;
            } catch (error) {
                console.error(`cam ${index + 1}:`, error.message || error);
                return null;
            }
        });
        return await Promise.all(promises);
    } catch (error) {
        console.error('خطأ في تحميل الصور:', error.message || error);
        return [null, null, null];
    }
}

app.get('/capture-images/:imageId/:type', async (req, res) => {
    const { imageId, type } = req.params;
    try {
        await captureImage(imageId, 'print');
        res.json({ success: true, message: `تم التقاط صور ${type}` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════
// 👥 إدارة العملاء والأنواع (CRUD APIs) - (نفس الكود الأصلي)
// ═══════════════════════════════════════════════════════════════════
app.get('/api/customers', (req, res) => {
    pool.query('SELECT * FROM customers ORDER BY name', (err, results) => {
        if (err) return res.status(500).json({ error: 'فشل في جلب العملاء' });
        res.json(results);
    });
});
app.post('/api/customers', express.json(), (req, res) => {
    const { name, phone, n_car, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'اسم العميل مطلوب' });
    pool.query('INSERT INTO customers (name, phone, n_car, notes) VALUES (?, ?, ?, ?)', [name, phone, n_car, notes], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'العميل موجود مسبقاً' });
            return res.status(500).json({ error: 'فشل في إضافة العميل' });
        }
        res.json({ success: true, id: result.insertId, message: 'تم إضافة العميل بنجاح' });
    });
});
app.put('/api/customers/:id', express.json(), (req, res) => {
    const { id } = req.params;
    const { name, phone, n_car, notes } = req.body;
    pool.query('UPDATE customers SET name = ?, phone = ?, n_car = ?, notes = ? WHERE id = ?', [name, phone, n_car, notes, id], (err) => {
        if (err) return res.status(500).json({ error: 'فشل في تعديل العميل' });
        res.json({ success: true, message: 'تم تعديل العميل بنجاح' });
    });
});
app.delete('/api/customers/:id', (req, res) => {
    pool.query('DELETE FROM customers WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'فشل في حذف العميل' });
        res.json({ success: true, message: 'تم حذف العميل بنجاح' });
    });
});

app.get('/api/types', (req, res) => {
    pool.query('SELECT * FROM types ORDER BY name', (err, results) => {
        if (err) return res.status(500).json({ error: 'فشل في جلب الأنواع' });
        res.json(results);
    });
});
app.post('/api/types', express.json(), (req, res) => {
    const { name, unit_weight, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'اسم النوع مطلوب' });
    pool.query('INSERT INTO types (name, unit_weight, notes) VALUES (?, ?, ?)', [name, unit_weight, notes], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'النوع موجود مسبقاً' });
            return res.status(500).json({ error: 'فشل في إضافة النوع' });
        }
        res.json({ success: true, id: result.insertId, message: 'تم إضافة النوع بنجاح' });
    });
});
app.put('/api/types/:id', express.json(), (req, res) => {
    const { id } = req.params;
    const { name, unit_weight, notes } = req.body;
    pool.query('UPDATE types SET name = ?, unit_weight = ?, notes = ? WHERE id = ?', [name, unit_weight, notes, id], (err) => {
        if (err) return res.status(500).json({ error: 'فشل في تعديل النوع' });
        res.json({ success: true, message: 'تم تعديل النوع بنجاح' });
    });
});
app.delete('/api/types/:id', (req, res) => {
    pool.query('DELETE FROM types WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'فشل في حذف النوع' });
        res.json({ success: true, message: 'تم حذف النوع بنجاح' });
    });
});

// ═══════════════════════════════════════════════════════════════════
// 🖨️ طباعة Xprinter مباشرة (نفس الكود الأصلي)
// ═══════════════════════════════════════════════════════════════════
const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');
const nodeHtmlToImage = require('node-html-to-image');

const printer_LAN = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: 'tcp://192.168.1.11:9100',
    characterSet: 'WPC1256_ARABIC',
    removeSpecialCharacters: false,
});

const windowsPrinterDriver = require('./windows-printer-driver'); // تأكد من وجود هذا الملف
const printer_USB = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: 'printer:XP-80',
    characterSet: 'WPC1256_ARABIC',
    removeSpecialCharacters: false,
    driver: windowsPrinterDriver
});

app.post('/print-ticket', async (req, res) => {
    try {
        const { html, printerType = 'lan' } = req.body;
        const tempPath = path.join(__dirname, 'final_ticket.png');
        const selectedPrinter = printerType === 'usb' ? printer_USB : printer_LAN;

        await nodeHtmlToImage({
            output: tempPath,
            html: html,
            transparent: false,
            puppeteerArgs: { args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=576,600'] },
            beforeScreenshot: async (page) => {
                await page.addStyleTag({ content: `body { width: 550px !important; filter: contrast(1000%) grayscale(100%); } * { color: black !important; -webkit-print-color-adjust: exact; }` });
                await page.setViewport({ width: 576, height: 500 });
            }
        });

        selectedPrinter.clear();
        selectedPrinter.alignCenter();
        selectedPrinter.beep(2, 2);
        await selectedPrinter.printImage('./public/logo/l1.png');
        await selectedPrinter.printImage('./public/logo/222.png');
        await selectedPrinter.printImage(tempPath);
        selectedPrinter.cut();
        await selectedPrinter.execute();

        // طباعة نسخة ثانية احتياطية (حسب كودك الأصلي)
        selectedPrinter.clear();
        selectedPrinter.alignCenter();
        selectedPrinter.beep(2, 2);
        await selectedPrinter.printImage('./public/logo/l1.png');
        await selectedPrinter.printImage('./public/logo/222.png');
        await selectedPrinter.printImage(tempPath);
        selectedPrinter.cut();
        await selectedPrinter.execute();

        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        res.json({ success: true });
    } catch (error) {
        console.error("خطأ:", error);
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════
// 📡 بث الفيديو عبر FFmpeg و WebSocket (نفس الكود الأصلي)
// ═══════════════════════════════════════════════════════════════════
const WebSocket = require('ws');
const { spawn } = require('child_process');

const wss = new WebSocket.Server({ server, path: '/video-ws', perMessageDeflate: false, maxPayload: 1024 * 1024 * 10 });
let currentCameraChannel = '201';
let ffmpeg = null;
const clients = new Set();
let isRestarting = false;

app.get('/switch-camera', (req, res) => {
    const camera = req.query.camera;
    switch (camera) {
        case '1': currentCameraChannel = '201'; break;
        case '2': currentCameraChannel = '701'; break;
        case '3': currentCameraChannel = '401'; break;
        default: currentCameraChannel = '201';
    }
    const newRtspUrl = `rtsp://admin:admin100@192.168.1.2:554/ISAPI/Streaming/Channels/${currentCameraChannel}`;
    if (ffmpeg) {
        isRestarting = true;
        ffmpeg.kill('SIGTERM');
        ffmpeg = null;
        setTimeout(() => { startFFmpeg(newRtspUrl); isRestarting = false; }, 1000);
    }
    res.json({ success: true, camera: camera, url: newRtspUrl });
});

function startFFmpeg(rtspUrlParam = null) {
    const rtspUrl = rtspUrlParam || `rtsp://admin:admin100@192.168.1.2:554/ISAPI/Streaming/Channels/${currentCameraChannel}`;
    if (ffmpeg) { try { ffmpeg.kill('SIGTERM'); } catch (e) {} }

    ffmpeg = spawn('C:\\ffmpeg\\bin\\ffmpeg.exe', [
        '-rtsp_transport', 'tcp', '-i', rtspUrl, '-f', 'mpegts', '-codec:v', 'mpeg1video',
        '-r', '25', '-b:v', '800k', '-bf', '0', '-an', '-sn', '-'
    ], { windowsHide: true, detached: false });

    let videoBuffer = Buffer.alloc(0);
    let lastSendTime = Date.now();
    let frameCount = 0;

    ffmpeg.on('close', (code) => {
        if (!isRestarting && clients.size > 0) setTimeout(() => startFFmpeg(), 3000);
    });

    setInterval(() => {
        if (global.gc) global.gc();
        if (videoBuffer.length > 1024 * 1024 * 5) videoBuffer = Buffer.alloc(0);
    }, 3600000);

    ffmpeg.stdout.on('data', (data) => {
        frameCount++;
        videoBuffer = videoBuffer.length === 0 ? Buffer.from(data) : Buffer.concat([videoBuffer, data], videoBuffer.length + data.length);
        const now = Date.now();
        if (now - lastSendTime >= 40 || videoBuffer.length >= 32768) {
            if (videoBuffer.length > 0 && clients.size > 0) {
                const dataToSend = videoBuffer;
                videoBuffer = Buffer.alloc(0);
                for (const client of clients) {
                    if (client.readyState === WebSocket.OPEN) {
                        try { client.send(dataToSend); } catch (e) {}
                    }
                }
            }
            lastSendTime = now;
        }
    });

    setInterval(() => {
        if (clients.size > 0) { frameCount = 0; }
    }, 60000);
}

wss.on('connection', (ws, req) => {
    clients.add(ws);
    if (!ffmpeg) startFFmpeg();
    ws.on('close', () => {
        clients.delete(ws);
        if (clients.size === 0 && ffmpeg) {
            isRestarting = true;
            try { ffmpeg.kill('SIGTERM'); ffmpeg = null; } catch (e) {}
            setTimeout(() => { isRestarting = false; }, 1000);
        }
    });
});

// ═══════════════════════════════════════════════════════════════════
// 🚀 تشغيل الخادم
// ═══════════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // تم التغيير لـ 0.0.0.0 للسماح بالوصول من الشبكة المحلية
server.listen(PORT, HOST, () => {
    console.log(`🚀 الخادم الثاني يعمل بنجاح على: http://${HOST}:${PORT}`);
});

const weighingTrucksRouter = require('./modules/weighingTrucks');
app.use('/api/weighing-trucks', weighingTrucksRouter);

process.on('SIGINT', () => {
    if (ffmpeg) ffmpeg.kill('SIGTERM');
    server.close(() => process.exit(0));
});