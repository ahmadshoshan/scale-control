// ═══════════════════════════════════════════════════════════════════
// 🚀 نقطة الدخول وتحميل المكتبات الأساسية
// ═══════════════════════════════════════════════════════════════════
const express = require('express');
const http = require('http');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const path = require('path');
let type_id = '';
let customer_id = '';
let type_p = '';
let customer_p = '';
const app = express();



const server = http.createServer(app);

const io = require('socket.io')(server);

const fs = require('fs');

// ✅ 1. خدمة المجلد public كامل
app.use(express.static(path.join(__dirname, 'public')));

// ✅ 2. إضافة مسار إضافي لمجلد webfonts في الجذر
app.use('/webfonts', express.static(path.join(__dirname, 'public/css/webfonts')));

// ✅ 3. إضافة مسار إضافي لمجلد css في الجذر
app.use('/css', express.static(path.join(__dirname, 'public/css')));

// ✅ 4. إضافة مسار إضافي لمجلد js في الجذر
app.use('/js', express.static(path.join(__dirname, 'public/js')));

// ✅ 5. إضافة مسار للصور (اختياري)
// app.use('/images', express.static(path.join(__dirname, 'public/images')));

// ✅ 6. إعادة توجيه تلقائي للمسارات المفقودة (اختياري)
app.get('/webfonts/:file', (req, res) => {
    res.redirect(`/public/css/webfonts/${req.params.file}`);
});

require('dotenv').config();

// ═══════════════════════════════════════════════════════════════════
// 🔌 إعداد الاتصالات (Serial Ports)
// ═══════════════════════════════════════════════════════════════════
const port = new SerialPort({ path: process.env.COM_PORT1, baudRate: 9600 });
const port2 = new SerialPort({ path: process.env.COM_PORT2, baudRate: 9600 });

port.on('error', (err) => console.error('❌ SerialPort1 erroe', err.message));
port2.on('error', (err) => console.error('❌ SerialPort2 erroe', err.message));

const { playSoundAlert } = require('./modules/audio');
const pool = require('./modules/db');

// الاستماع للأخطاء
port.on('error', (err) => {
    console.error(' port1  :', err.message);
});

port2.on('error', (err) => {
    console.error('  port2 :', err.message);
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
const get_printer = port2.pipe(new ReadlineParser({ delimiter: '\r\n' }));

// ═══════════════════════════════════════════════════════════════════
// 🖨️ معالج بيانات الطابعة (Printer Logic)
// ═══════════════════════════════════════════════════════════════════
let buffer = []; // تخزين المؤقت للبيانات
const expectedLines = 7; // عدد السطور المتوقعة لكل عملية طباعة

get_printer.on('data', (data) => {

    const line = data
        .toString('utf8')
        .replace(/�/g, '')                 // 🔥 حذف الرمز
        .replace(/[^\x20-\x7E\u0600-\u06FF]/g, '')
        .trim();
    console.log(`print: ${line}`);
    const isValidLine = (line) => {
        return (
            /^\d{2}\/\d{2}\/\d{4}$/.test(line) ||     // تاريخ
            /^\d{2}:\d{2}[AP]M$/.test(line) ||       // وقت
            /^\d+$/.test(line) ||                    // أرقام
            /kg/i.test(line)                         // وزن
        );
    };

    if (line && !line.includes('�') && isValidLine(line)) {

        buffer.push(line);

        // إذا وصلنا إلى العدد المتوقع من السطور
        if (buffer.length === expectedLines) {

            const [date, time, sn, number, gross, tare, net] = buffer;


            // إدخال البيانات إلى قاعدة البيانات
            const query = `
                INSERT INTO printer 
                (date, time, sn, number, gross, tare, net,type,customer,note,images) 
                VALUES (?, ?, ?, ?, ?, ?, ?,?,?,?,?)
            `;
            const images = `${Date.now()}_${number}_${net}`;
            pool.query(query, [date, time, sn, number, gross, tare, net, '', '', '', images], async (err, results) => {
                if (err) {
                    console.error('printer err db:', err.message);
                } else {
                    console.log('printer: save');

                    // 🔥 أرسل إشعار للواجهة
                    io.emit('printer:new', {
                        id: results.insertId,
                        date,
                        time,
                        sn,
                        number,
                        gross,
                        tare,
                        net,
                        customer: '',
                        type: '',
                        images
                    });



                    captureImage(images, 'print');

                }


                pool.query("SELECT print FROM control WHERE id = 1", async (err, rows) => {
                    if (err) {
                        console.error("خطأ في قراءة جدول control:", err.message);
                        return;
                    }

                });
                type_p = '';
                customer_p = '';
            });

            // إعادة تعيين المخزن المؤقت
            buffer = [];
        }
    }

});

///
// ✅ لتحديث حالة الطباعة
app.get("/set-print/:status", (req, res) => {
    const status = req.params.status === "1" ? 1 : 0;
    pool.query("UPDATE control SET print = ? WHERE id = 1", [status], (err) => {
        if (err) {
            console.error("خطأ في تحديث print:", err.message);
            return res.status(500).send("خطأ في قاعدة البيانات");
        }
        res.send(`تم تغيير حالة الطباعة إلى: ${status}`);
    });
});

// ✅ لجلب الحالة الحالية
app.get("/get-print", (req, res) => {
    pool.query("SELECT print FROM control WHERE id = 1", (err, rows) => {
        if (err) {
            console.error("خطأ في قراءة print:", err.message);
            return res.status(500).send("خطأ في قاعدة البيانات");
        }
        res.json({ print: rows[0].print });
    });
});

/////////////////////////////////////////////////////////////////////
// 📷 دوال الكاميرا والمساعدات
/////////////////////////////////////////////////////////////////////
// const puppeteer = require('puppeteer');

// دالة تحويل الأرقام للعربي
function toArabicNumbers(input) {
    input = input.toString().trim();

    // لو تاريخ (بيحتوي على "/")
    if (input.includes("/")) {
        return input.replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
    }

    // لو مش تاريخ (نشيل أي حروف ونسيب أرقام فقط)
    let onlyNumbers = input.replace(/[^0-9]/g, '');
    let arabicNumbers = onlyNumbers.replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);

    // نضيف كلمة كيلو بعد الرقم
    return arabicNumbers;
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// معالجة الأوامر المرسلة من الواجهة الأمامية
app.get('/send-command', (req, res) => {
    type_id = req.query.type;
    customer_id = req.query.customer;
    type_p = req.query.type;
    customer_p = req.query.customer;


    const command = req.query.command; // الحصول على الأمر من الطلب
    if (command) {

        port.write(`${command}\r`, (err) => {
            if (err) {
                console.error('خطأ في إرسال command:', err.message);
                res.status(500).send('خطأ في إرسال command');
            } else {
                // console.log(`rec: ${command}`);
                res.send(`rec-: ${command}`);
            }
        });
    } else {
        res.status(400).send('الأمر غير صحيح');
    }
});

// ═══════════════════════════════════════════════════════════════════
// ⚖️ معالج بيانات الميزان (Sensor Logic)
// ═══════════════════════════════════════════════════════════════════
let match = "";
let match1 = "";
let lastMessage = ''; // متغير لتخزين آخر رسالة مستلمة
let NE = '00';

let sendInterval = null;
let sendInterval2 = null;
let sendInterval3 = null;

let lastSentWeight = null;

// let alertPlayed = false; // لمنع تكرار الصوت
// let zeroSentTimer = null; // متغير لحفظ حالة إرسال أمر التصفير
// let weightStartTime = null;
// استقبال البيانات من الجهاز وإرسالها إلى الواجهة الأمامية
parser.on('data', (data) => {
    // console.log(data)
    // const currentMessage = data.trim();

    const currentMessage = data
        // .replace(/[^\p{L}\p{N}]/gu, '')
        // إزالة STX () و ETX () وأي أحرف غير مرغوب فيها
        .replace(/[\x02\x03]/g, "") // إزالة STX و ETX أولاً
        .replace(/[\x00-\x1F\x7F]/g, '')   // رموز التحكم
        .trim();


    // تنظيف الرسالة الحالية
    // التحقق مما إذا كانت الرسالة الحالية مكررة
    if (currentMessage !== lastMessage) {
        // console.log(`rec :: ${currentMessage}`); // عرض الرسالة إذا لم تكن مكررة
        if (currentMessage.slice(-2).toUpperCase() === "NE") {
            NE = currentMessage;
            // console.log(`ne :: ${NE}`);
        }
        // تحديث قيمة آخر رسالة
        lastMessage = currentMessage;
    }



    let cleanedWeight = data.replace(/[^0-9.-]/g, "");
    const weight = parseFloat(cleanedWeight.trim());

    // إرسال الوزن للواجهة فقط عندما تتغير قيمته
    if (!isNaN(weight)) {
        if (weight !== lastSentWeight) {
            lastSentWeight = weight;
            io.emit('response', data.trim());
        }
    } else {
        // الرسائل غير الرقمية تظل تعمل كما هي
        // مثل OK / ?? / NE وغيرها
        io.emit('response', data.trim());
    }

    if (!isNaN(weight) && weight < -10 && (currentMessage.slice(-2).toUpperCase() !== "KN")) {
        // playSoundAlert("yagib_tasfier_almezan.mp3", io);
        playSoundIfEnabled("yagib_tasfier_almezan.mp3");

        // شغّل الإرسال مرة واحدة فقط
        if (!sendInterval2) {
            sendInterval2 = setInterval(() => {
                sendMessageIfEnabled(`يجب تصفير الميزان  ${weight}`);
            }, 5000);
        }

    } else {
        if (sendInterval2) {
            clearInterval(sendInterval2);
            sendInterval2 = null;

        }

    }

    if (!isNaN(weight) && weight > 300) {
        // playSoundAlert('yogad_sayara_almezan1.mp3', io);
        playSoundIfEnabled("yogad_sayara_almezan1.mp3");


        // شغّل الإرسال مرة واحدة فقط
        if (!sendInterval) {
            sendInterval = setInterval(() => {
                port.write(`p\r`, (err) => {
                    if (err) {
                        console.error('خطأ في إرسال command:', err.message);
                    }
                });
            }, 1000);
            // شغّل الإرسال مرة واحدة فقط
            if (!sendInterval3) {
                sendInterval3 = setInterval(() => {
                    sendMessageIfEnabled(` يوجد سياره علي الميزان  ${weight}`);
                }, 5000);
            }
        }

    } else {
        if (sendInterval) {
            clearInterval(sendInterval);
            sendInterval = null;
        }
        if (sendInterval3) {
            clearInterval(sendInterval3);
            sendInterval3 = null;
        }

    }
    // دالة للتحقق مما إذا كانت الرسالة تبدأ بـ "GROSS{"
    function startsWithGross(message) {
        return message.startsWith("GROSS{");
    }
    function startsWithDate(date) {
        return date.startsWith("DATE{");
    }

    // التحقق مما إذا كانت الرسالة تبدأ بـ "GROSS{"
    if (startsWithGross(currentMessage) && match == "") {
        match = currentMessage.match(/^GROSS\{(.*)\}$/);

    }
    if (startsWithDate(currentMessage) && match1 == "") {

        match1 = currentMessage.match(/^DATE\{(.*)\}$/);
        let images = `${Date.now()}_${match[1]}_${NE}`;
        // تخزين الرسالة في قاعدة البيانات
        const query = 'INSERT INTO sensor_data (data_value,date,number,type,customer,images) VALUES (?,?,?,?,?,?)';
        pool.query(query, [match[1], match1[1], NE, type_id, customer_id, images], (err, results) => {
            if (err) {
                console.error('err db:', err.message);
            } else {
                captureImage(images, 'sensor');
                // console.log('  save  in db.');

                io.emit('responseID', '');
                gross = match[1];

                // 🔥 أرسل إشعار للواجهة
                io.emit('id:new', {

                    gross,
                    NE,
                    images
                });
                type_id = '';
                customer_id = '';

                ////////////////////////////////////////////
                //                 // 🔹 إشعار Telegram
                //                 sendMessageIfEnabled(`📡 تم إضافة بيانات من الجهاز:
                // ⚖️ الوزن: ${match[1]}
                // 📅 التاريخ: ${match1[1]}
                // 🆔 الرقم: ${NE}
                // `);
                ////////////////////////////////////////////

            }
            match = ""; match1 = "";
            NE = '';

        });

    }


});

function playSoundIfEnabled(file) {
    pool.query(
        "SELECT sound FROM control WHERE id = 1",
        (err, rows) => {
            if (!err && rows[0].sound === 1) {
                playSoundAlert(file, io);
            }
        }
    );
}

// تشغيل / إيقاف الصوت
app.get("/set-sound/:status", (req, res) => {
    const status = req.params.status === "1" ? 1 : 0;

    pool.query(
        "UPDATE control SET sound = ? WHERE id = 1",
        [status],
        (err) => {
            if (err) {
                console.error("sound update error:", err.message);
                return res.status(500).send("DB error");
            }
            res.send(`sound status changed to ${status}`);
        }
    );
});
// جلب حالة الصوت
app.get("/get-sound", (req, res) => {
    pool.query(
        "SELECT sound FROM control WHERE id = 1",
        (err, rows) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send("DB error");
            }
            res.json({ sound: rows[0].sound });
        }
    );
});

// ═══════════════════════════════════════════════════════════════════
// 🗄️ مسارات جلب البيانات (Data Routes)
// ═══════════════════════════════════════════════════════════════════

// جلب بيانات محددة من قاعدة البيانات باستخدام LIMIT و OFFSET (بيانات اليوم فقط)
app.get('/get-data2', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('لا يمكن الحصول على اتصال:', err);
            return res.status(500).json({ error: 'فشل في الاتصال بقاعدة البيانات' });
        }

        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        // 1️⃣ حساب تاريخ اليوم بالتنسيق المطابق لقاعدة البيانات (DD/MM/YYYY)
        const today = new Date();
        const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

        // 2️⃣ إضافة شرط WHERE date = ? لجلب بيانات اليوم فقط
        const query = 'SELECT `id`, `date`, `time`, `sn`, `number`, `gross`, `tare`, `tare2`, `net`, `customer`, `type`, `note`, `images`, `paid_amount` FROM printer WHERE date = ? ORDER BY id DESC LIMIT ? OFFSET ?';

        // 3️⃣ تمرير المتغيرات بالترتيب الصحيح: (تاريخ اليوم, الحد, الإزاحة)
        connection.query(query, [todayStr, limit, offset], (error, results) => {
            connection.release(); // إخلاء الاتصال

            if (error) {
                console.error('خطأ في جلب البيانات:', error.message);
                return res.status(500).json({ error: 'خطأ في جلب البيانات' });
            }

            res.json(results);
        });
    });
});



// بحث بيانات محددة من قاعدة البيانات باستخدام 
app.get('/get-data3', (req, res) => {

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('لا يمكن الحصول على اتصال:', err);
            return res.status(500).json({ error: 'فشل في الاتصال بقاعدة البيانات' });
        }

        const type = req.query.type;   // النوع (number, sn, date)
        const value = req.query.value; // القيمة اللي هيكتبها المستخدم

        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        let query = "";
        if (type === "number") {

            query = "SELECT * FROM printer WHERE number = ? ORDER BY id DESC LIMIT ?, ?";
        } else if (type === "sn") {
            query = "SELECT * FROM printer WHERE sn = ? ORDER BY id DESC LIMIT ?, ?";
        } else if (type === "date") {
            query = "SELECT * FROM printer WHERE date = ? ORDER BY id DESC LIMIT ?, ?";
        } else {
            connection.release();
            return res.status(400).json({ error: "نوع البحث غير صحيح" });
        }

        connection.query(query, [value, offset, limit], (error, results) => {
            connection.release(); // لازم نحرر الاتصال بعد الاستعلام
            if (error) {
                console.error('خطأ في جلب البيانات:', error.message);
                return res.status(500).json({ error: 'خطأ في جلب البيانات' });
            }
            res.json(results);
        });
    });


});
app.get('/get-data4', (req, res) => {

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('لا يمكن الحصول على اتصال:', err);
            return res.status(500).json({ error: 'فشل في الاتصال بقاعدة البيانات' });
        }

        const type = req.query.type;   // النوع (number, sn, date)
        const value = req.query.value; // القيمة اللي هيكتبها المستخدم

        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        let query = "";
        if (type === "number") {

            // query = "SELECT * FROM sensor_data WHERE number = ? ORDER BY id DESC LIMIT ?, ?";
            query = `SELECT * FROM sensor_data  WHERE ${type} = ${value} ORDER BY id DESC LIMIT ? OFFSET ?`;
            // console.log(query);

        } else {
            connection.release();
            return res.status(400).json({ error: "نوع البحث غير صحيح" });
        }


        connection.query(query, [limit, offset], (error, results) => {
            connection.release(); // إخلاء الاتصال
            if (error) {
                console.error('خطأ في جلب البيانات:', error.message);
                return res.status(500).json({ error: 'خطأ في جلب البيانات' });
            }
            res.json(results);
        });
    });


});
app.get('/get-data', (req, res) => {

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('لا يمكن الحصول على اتصال:', err);
            return res.status(500).json({ error: 'فشل في الاتصال بقاعدة البيانات' });
        }

        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        const query = 'SELECT * FROM sensor_data ORDER BY id DESC LIMIT ? OFFSET ?';
        connection.query(query, [limit, offset], (error, results) => {
            connection.release(); // إخلاء الاتصال
            if (error) {
                console.error('خطأ في جلب البيانات:', error.message);
                return res.status(500).json({ error: 'خطأ في جلب البيانات' });
            }
            res.json(results);
        });
    });
});

app.put('/update-ticket/:id', (req, res) => {
    const { id } = req.params;
    // ✅ أضف paid_amount إلى المتغيرات المستلمة
    const { number, customer, type, gross, tare, tare2, net, note, paid_amount, extraWeightsTable } = req.body;


    // const { number, customer, type, gross, tare, tare2, net, note, extraWeightsTable } = req.body;
    let _tare2 = tare2;
    if (extraWeightsTable) {

        let extra = extraWeightsTable;

        if (typeof extra === "string") {
            extra = JSON.parse(extra);
        }
        _tare2 = extra.thirdWeight;
        // extraData = `الفارغ :${toArabicNumbers(extra.thirdWeight)}\n ${extra.extraEditType} :${toArabicNumbers(extra.finalNetWeight)}\nالاجمالي :${toArabicNumbers(extra.totalNetWeight)}`;
    }
    // else {
    //     extraData = '';
    // }
    const sql = 'UPDATE printer SET number=?, customer=?, type=?, gross=?, tare=?, tare2=?,net=?, note=?, paid_amount=? WHERE id=?';

    pool.query(sql, [number, customer, type, gross, tare, _tare2, net, note, paid_amount, id], (err, result) => {
        if (err) {
            console.error('❌ خطأ أثناء التحديث:', err);
            return res.status(500).json({ success: false, message: 'حدث خطأ أثناء التحديث' });
        }

        // console.log('UPDATE printer:', result.affectedRows);
        res.json({ success: true, message: 'تم تحديث البيانات بنجاح' });
    });
});

// ═══════════════════════════════════════════════════════════════════
// 🚀 تشغيل الخادم
// ═══════════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '192.168.1.222';
server.listen(PORT, HOST, () => {
    console.log(` HOST :   ${HOST} --  ${PORT}`);
});

// ═══════════════════════════════════════════════════════════════════
// 📷 دالة التقاط الصور (كاميرات المراقبة)
// ═══════════════════════════════════════════════════════════════════
const DigestFetch = require('digest-fetch').default;
const client = new DigestFetch('admin', 'admin100');

async function captureImage(car_No_Date_weight, path) {
    // انتظار 1.5 ثانية (1500 ملي ثانية) قبل التقاط الصورة

    const urls = [
        'http://192.168.1.2/ISAPI/Streaming/channels/201/picture',
        'http://192.168.1.2/ISAPI/Streaming/channels/401/picture',
        'http://192.168.1.2/ISAPI/Streaming/channels/701/picture'
    ];

    try {
        // إنشاء مصفوفة من الوعود (Promises)
        const promises = urls.map(async (url, index) => {
            try {
                const response = await client.fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const buffer = await response.arrayBuffer();
                const fileName = `public/images/${path}/${car_No_Date_weight}_cam${index + 1}.jpg`;
                fs.writeFileSync(fileName, Buffer.from(buffer));

                console.log(`cam ${index + 1} `);
                return fileName;

            } catch (error) {
                console.error(`cam    ${index + 1}:`, error.message || error);
                return null;
            }
        });

        // انتظار اكتمال جميع الوعود
        const savedFiles = await Promise.all(promises);

        // عرض النتائج
        const successful = savedFiles.filter(file => file !== null).length;
        // console.log(` save  ${successful} from ${urls.length}  `);

        return savedFiles;

    } catch (error) {
        console.error('خطأ في تحميل الصور:', error.message || error);
        return [null, null, null];
    }
}

// ═══════════════════════════════════════════════════════════════════
// 📡 مراقبة النظام (PM2 & Telegram)
// ═══════════════════════════════════════════════════════════════════
const pm2 = require('pm2');
const { sendMessageIfEnabled, sendMessage } = require('./backend/services/telegram/pm2-telegram');

pm2.connect(function (err) {
    if (err) {
        console.error(err);
        process.exit(2);
    }

    pm2.launchBus(function (err, bus) {
        console.log('PM2 Bus launched');
        sendMessage(`🔄 open `);
        bus.on('process:event', function (data) {
            if (data.event === 'exit') {
                sendMessage(`⚠️ Process ${data.process.name} stopped with code ${data.process.exit_code}`);
            }
            if (data.event === 'restart') {
                sendMessage(`🔄 Process ${data.process.name} restarted`);
            }
            if (data.event === 'online') {
                sendMessage(`✅ Process ${data.process.name} is online`);
            }
            if (data.event === 'stop') {
                sendMessage(`🛑 Process ${data.process.name} stopped`);
            }
        });
    });
});

// const https = require('https');
// https.get("https://api.telegram.org/bot7965946681:AAEBYL15_UiA3FzvN5r_j1LcgwqLTn8RHuw/sendMessageIfEnabled?chat_id=1390890695&text=Test", res => {
//   console.log(res.statusCode);
// });

// تشغيل / إيقاف الإشعارات
app.get("/set-notify/:status", (req, res) => {
    const status = req.params.status === "1" ? 1 : 0;

    pool.query("UPDATE control SET notify = ? WHERE id = 1", [status], (err) => {
        if (err) {
            console.error("notify update error:", err.message);
            return res.status(500).send("DB error");
        }
        res.send(`notify status changed to ${status}`);
    });
});

// جلب حالة الإشعارات
app.get("/get-notify", (req, res) => {
    pool.query("SELECT notify FROM control WHERE id = 1", (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("DB error");
        }
        res.json({ notify: rows[0].notify });
    });
});

// ═══════════════════════════════════════════════════════════════════
// 👥 إدارة العملاء والأنواع (CRUD APIs)
// ═══════════════════════════════════════════════════════════════════

// ظظظظظظظظظظظظظظظظظظظظظظظظظظظظظظظظظظظظظظظظظظظظظظظظظظظظ
// ==================== إدارة العملاء ====================

// جلب جميع العملاء
app.get('/api/customers', (req, res) => {
    pool.query('SELECT * FROM customers ORDER BY name', (err, results) => {
        if (err) {
            console.error('خطأ في جلب العملاء:', err);
            return res.status(500).json({ error: 'فشل في جلب العملاء' });
        }
        res.json(results);
    });
});

// إضافة عميل جديد
app.post('/api/customers', express.json(), (req, res) => {
    const { name, phone, n_car, notes } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'اسم العميل مطلوب' });
    }

    pool.query(
        'INSERT INTO customers (name, phone, n_car, notes) VALUES (?, ?, ?, ?)',
        [name, phone, n_car, notes],
        (err, result) => {
            if (err) {
                console.error('خطأ في إضافة العميل:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'العميل موجود مسبقاً' });
                }
                return res.status(500).json({ error: 'فشل في إضافة العميل' });
            }
            res.json({
                success: true,
                id: result.insertId,
                message: 'تم إضافة العميل بنجاح'
            });
        }
    );
});

// تعديل عميل
app.put('/api/customers/:id', express.json(), (req, res) => {
    const { id } = req.params;
    const { name, phone, n_car, notes } = req.body;

    pool.query(
        'UPDATE customers SET name = ?, phone = ?, n_car = ?, notes = ? WHERE id = ?',
        [name, phone, n_car, notes, id],
        (err, result) => {
            if (err) {
                console.error('خطأ في تعديل العميل:', err);
                return res.status(500).json({ error: 'فشل في تعديل العميل' });
            }
            res.json({ success: true, message: 'تم تعديل العميل بنجاح' });
        }
    );
});

// حذف عميل
app.delete('/api/customers/:id', (req, res) => {
    const { id } = req.params;

    pool.query('DELETE FROM customers WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error('خطأ في حذف العميل:', err);
            return res.status(500).json({ error: 'فشل في حذف العميل' });
        }
        res.json({ success: true, message: 'تم حذف العميل بنجاح' });
    });
});

// ==================== إدارة الأنواع ====================

// جلب جميع الأنواع
app.get('/api/types', (req, res) => {
    pool.query('SELECT * FROM types ORDER BY name', (err, results) => {
        if (err) {
            console.error('خطأ في جلب الأنواع:', err);
            return res.status(500).json({ error: 'فشل في جلب الأنواع' });
        }
        res.json(results);
    });
});

// إضافة نوع جديد
app.post('/api/types', express.json(), (req, res) => {
    const { name, unit_weight, notes } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'اسم النوع مطلوب' });
    }

    pool.query(
        'INSERT INTO types (name, unit_weight, notes) VALUES (?, ?, ?)',
        [name, unit_weight, notes],
        (err, result) => {
            if (err) {
                console.error('خطأ في إضافة النوع:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'النوع موجود مسبقاً' });
                }
                return res.status(500).json({ error: 'فشل في إضافة النوع' });
            }
            res.json({
                success: true,
                id: result.insertId,
                message: 'تم إضافة النوع بنجاح'
            });
        }
    );
});

// تعديل نوع
app.put('/api/types/:id', express.json(), (req, res) => {
    const { id } = req.params;
    const { name, unit_weight, notes } = req.body;

    pool.query(
        'UPDATE types SET name = ?, unit_weight = ?, notes = ? WHERE id = ?',
        [name, unit_weight, notes, id],
        (err, result) => {
            if (err) {
                console.error('خطأ في تعديل النوع:', err);
                return res.status(500).json({ error: 'فشل في تعديل النوع' });
            }
            res.json({ success: true, message: 'تم تعديل النوع بنجاح' });
        }
    );
});

// حذف نوع
app.delete('/api/types/:id', (req, res) => {
    const { id } = req.params;

    pool.query('DELETE FROM types WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error('خطأ في حذف النوع:', err);
            return res.status(500).json({ error: 'فشل في حذف النوع' });
        }
        res.json({ success: true, message: 'تم حذف النوع بنجاح' });
    });
});

///////////////////////////////////////////////////////////////////////////////
// ==================== طباعة Xprinter مباشرة ====================
///////////////////////////////////////////////////////////////////////////////

// إضافة مسار لالتقاط الصور
app.get('/capture-images/:imageId/:type', async (req, res) => {
    const { imageId, type } = req.params;

    try {
        // استدعاء دالة التقاط الصور من الكاميرات
        await captureImage(imageId, 'print');
        res.json({ success: true, message: `تم التقاط صور ${type}` });
    } catch (error) {
        console.error('خطأ في التقاط الصور:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});



//////////////////////////////////////////////////////////////


const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');

const printer_LAN = new ThermalPrinter({
    type: PrinterTypes.EPSON, // أو XP80 / XPRINTER حسب طابعتك
    interface: 'tcp://192.168.1.11:9100', // 🔥 لازم بورت 9100

    characterSet: 'WPC1256_ARABIC',
    removeSpecialCharacters: false,
});
const printer_USB = new ThermalPrinter({
    type: PrinterTypes.EPSON, // أو XP80 / XPRINTER حسب طابعتك
    interface: 'printer:XP-80',

    characterSet: 'WPC1256_ARABIC',
    removeSpecialCharacters: false,
});
const nodeHtmlToImage = require('node-html-to-image');





app.post('/print-ticket', async (req, res) => {
    try {
        // const { html } = req.body;
        const { html, printerType = 'lan' } = req.body;

        const tempPath = path.join(__dirname, 'final_ticket.png');
        // اختيار الطابعة
        const selectedPrinter =
            printerType === 'usb'
                ? printer_USB
                : printer_LAN;
        await nodeHtmlToImage({
            output: tempPath,
            html: html,
            transparent: false,
            puppeteerArgs: {
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--window-size=576,600' // 🔥 تثبيت العرض لورق 80 ملم
                ]
            },
            // إضافة ستايل إضافي لتقوية الطباعة قبل التصوير
            beforeScreenshot: async (page) => {
                await page.addStyleTag({
                    content: `
                    body { 
                        width: 550px !important; 
                        filter: contrast(1000%) grayscale(100%); /* 🔥 جعل الأسود فاحم جداً */
                    }
                    * { color: black !important; -webkit-print-color-adjust: exact; }
                    `
                });
                await page.setViewport({ width: 576, height: 500 });
            }
        });
        // ================= // النسخة الأولى // ==========
        // إرسال الصورة للطابعة
        selectedPrinter.clear();
        selectedPrinter.alignCenter();
        selectedPrinter.beep(2, 2);
        selectedPrinter.alignCenter();
        await selectedPrinter.printImage('./public/logo/l1.png');
        await selectedPrinter.printImage('./public/logo/222.png');
        await selectedPrinter.printImage(tempPath);
        selectedPrinter.cut();
        await selectedPrinter.execute();



        // =============== // النسخة الثانية // =======================================
        selectedPrinter.clear();
        selectedPrinter.alignCenter();
        selectedPrinter.beep(2, 2);
        selectedPrinter.alignCenter();
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

// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
const WebSocket = require('ws');

const wss = new WebSocket.Server({
    server,
    // إعدادات إضافية لتحسين الأداء
    path: '/video-ws',
    perMessageDeflate: false,
    maxPayload: 1024 * 1024 * 10 // 10MB max payload
});
const { spawn } = require('child_process');
// استخدم رابط RTSP الصحيح من تجربتك السابقة





// أضف هذا في ملف server.js مع بقية الكود
let currentCameraChannel = '201'; // القناة الافتراضية (كاميرا 1)

// إضافة مسار لتبديل الكاميرا
app.get('/switch-camera', (req, res) => {
    const camera = req.query.camera;

    // تحديث قناة RTSP بناءً على الكاميرا المحددة
    switch (camera) {
        case '1':
            currentCameraChannel = '201'; // كاميرا أمامية
            break;
        case '2':
            currentCameraChannel = '701'; // كاميرا خلفية
            break;
        case '3':
            currentCameraChannel = '401'; // كاميرا جانبية
            break;
        default:
            currentCameraChannel = '201';
    }

    // تحديث رابط RTSP
    const newRtspUrl = `rtsp://admin:admin100@192.168.1.2:554/ISAPI/Streaming/Channels/${currentCameraChannel}`;
    console.log(`Switching to camera ${camera}: ${newRtspUrl}`);

    // إعادة تشغيل FFmpeg مع الكاميرا الجديدة
    if (ffmpeg) {
        isRestarting = true;
        ffmpeg.kill('SIGTERM');
        ffmpeg = null;

        setTimeout(() => {
            // تحديث المتغير العام لرابط RTSP
            // ملاحظة: ستحتاج إلى تعديل دالة startFFmpeg لتقبل معامل
            startFFmpeg(newRtspUrl);
            isRestarting = false;
        }, 1000);
    }

    res.json({ success: true, camera: camera, url: newRtspUrl });
});
let ffmpeg = null;
const clients = new Set();
let isRestarting = false;
// تعديل دالة startFFmpeg لتقبل رابط RTSP كمعامل
function startFFmpeg(rtspUrlParam = null) {
    const rtspUrl = rtspUrlParam || `rtsp://admin:admin100@192.168.1.2:554/ISAPI/Streaming/Channels/${currentCameraChannel}`;
    // ... باقي الكود كما هو

    if (ffmpeg) {
        try {
            ffmpeg.kill('SIGTERM');
        } catch (e) { }
    }

    console.log('Starting FFmpeg...');

    ffmpeg = spawn('C:\\ffmpeg\\bin\\ffmpeg.exe', [
        '-rtsp_transport', 'tcp',
        '-i', rtspUrl,
        '-f', 'mpegts',
        '-codec:v', 'mpeg1video',
        '-r', '25',
        '-b:v', '800k',
        '-bf', '0',
        '-an',  // تعطيل الصوت مؤقتاً لتقليل المشاكل
        '-sn',  // تعطيل الترجمة
        '-'
    ], {
        windowsHide: true,  // هذا الخيار يخفي النافذة السوداء
        detached: false     // لا تفصل العملية
    });

    let stderrBuffer = '';

    ffmpeg.stderr.on('data', (data) => {
        const output = data.toString();
        stderrBuffer += output;


    });

    ffmpeg.on('error', (error) => {
        console.error('FFmpeg process error:', error);
    });

    ffmpeg.on('close', (code) => {
        console.log(`FFmpeg exited with code ${code}`);

        if (!isRestarting && clients.size > 0) {
            console.log('Restarting FFmpeg in 3 seconds...');
            setTimeout(() => {
                startFFmpeg();
            }, 3000);
        }
    });


    // استبدال قسم معالجة الفيديو بهذا الكود المحسن
    let videoBuffer = Buffer.alloc(0);
    let lastSendTime = Date.now();
    let frameCount = 0;
    // أضف هذا بعد تعريف المتغيرات



    // تنظيف الذاكرة كل ساعة
    setInterval(() => {
        if (global.gc) {
            global.gc();
            console.log('🧹 Garbage collection triggered');
        }

        // تنظيف الـ buffer إذا كان كبيراً جداً
        if (videoBuffer.length > 1024 * 1024 * 5) { // 5MB
            console.log('⚠️ Buffer too large, clearing...');
            videoBuffer = Buffer.alloc(0);
        }
    }, 3600000);
    ffmpeg.stdout.on('data', (data) => {
        frameCount++;

        // تجميع البيانات بشكل أكثر كفاءة
        if (videoBuffer.length === 0) {
            // أول قطعة من الإطار
            videoBuffer = Buffer.from(data);
        } else {
            videoBuffer = Buffer.concat([videoBuffer, data], videoBuffer.length + data.length);
        }

        const now = Date.now();
        // إرسال كل 40ms (25 إطار في الثانية) أو عند اكتمال الإطار
        if (now - lastSendTime >= 40 || videoBuffer.length >= 32768) {
            if (videoBuffer.length > 0 && clients.size > 0) {
                const dataToSend = videoBuffer;
                videoBuffer = Buffer.alloc(0);

                // إرسال لجميع العملاء مرة واحدة
                const sendPromises = [];
                for (const client of clients) {
                    if (client.readyState === WebSocket.OPEN) {
                        try {
                            client.send(dataToSend);
                        } catch (e) {
                            // سجل الخطأ مرة واحدة فقط
                            if (frameCount % 100 === 0) {
                                console.error('Send error:', e.message);
                            }
                        }
                    }
                }
            }
            lastSendTime = now;
        }
    });

    // عرض إحصائيات كل دقيقة
    setInterval(() => {
        if (clients.size > 0) {
            console.log(`📊 Clients: ${clients.size}, Frames: ${frameCount}, Buffer: ${videoBuffer.length}`);
            frameCount = 0;
        }
    }, 60000);
}

wss.on('connection', (ws, req) => {

    // في جزء WebSocket connection
    ws.on('message', (message) => {
        // تجاهل أي رسائل واردة (لا نحتاجها للبث)
        return;
    });
    const clientIp = req.socket.remoteAddress;
    console.log(`Client connected from ${clientIp}`);

    // إضافة العميل
    clients.add(ws);
    console.log(`Total clients: ${clients.size}`);

    // إرسال رسالة تأكيد
    try {
        ws.send(JSON.stringify({ type: 'ping', message: 'connected' }));
    } catch (e) { }

    // بدء FFmpeg إذا لم يكن يعمل
    if (!ffmpeg) {
        startFFmpeg();
    }

    // معالجة الرسائل الواردة من العميل
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'pong') {
                // الحفاظ على الاتصال حياً
            }
        } catch (e) {
            // تجاهل الرسائل غير JSON
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`Client disconnected from ${clientIp}, code: ${code}`);
        clients.delete(ws);
        console.log(`Total clients: ${clients.size}`);

        // إيقاف FFmpeg إذا لم يتبق عملاء
        if (clients.size === 0 && ffmpeg) {
            console.log('No clients, stopping FFmpeg...');
            isRestarting = true;
            try {
                ffmpeg.kill('SIGTERM');
                ffmpeg = null;
            } catch (e) { }
            setTimeout(() => { isRestarting = false; }, 1000);
        }
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for ${clientIp}:`, error.message);
        // clients.delete(ws);
    });
});

// تنظيف عند إغلاق الخادم
process.on('SIGINT', () => {
    console.log('Shutting down...');
    if (ffmpeg) {
        ffmpeg.kill('SIGTERM');
    }
    server.close(() => {
        process.exit(0);
    });
});

console.log('Server ready, waiting for connections...');



const weighingTrucksRouter = require('./modules/weighingTrucks');
app.use('/api/weighing-trucks', weighingTrucksRouter);