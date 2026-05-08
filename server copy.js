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



// ✅ 1. خدمة المجلد public كامل (  )
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


//////////////////////////////
const port = new SerialPort({ path: process.env.COM_PORT1, baudRate: 9600 });
const port2 = new SerialPort({ path: process.env.COM_PORT2, baudRate: 9600 });

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


                    // استدعاء مباشر مع تأخير
                    // setTimeout(() => {
                    captureImage(images, 'print');
                    // }, 800); // تأخير .5 ثانية
                    ////////////////////////////////////////////////////////////
                    // 🔹 هنا نضيف إشعار Telegram
                    //                     sendMessageIfEnabled(`✅ تم إضافة تذكرة جديدة:
                    // 📅 التاريخ: ${date}
                    // 🕒 الوقت: ${time}
                    // 📌 المسلسل: ${sn}
                    // 🚛 رقم السيارة: ${number}
                    // ⚖️ الوزن الصافي: ${net} كيلو
                    // `);
                    ////////////////////////////////////////////////////////////
                }

                // // ⬇️ إنشاء ملف التذكرة
                // const filePath = "d:\\dd.pdf";
                // await createTicket({ date, time, sn, number, gross, tare, net }, filePath);

                // // ⬇️ استدعاء أمر الطباعة
                // printWithSumatra(filePath, 'XP-80C');
                // 🔍 استعلام للتحقق من حالة الطباعة
                pool.query("SELECT print FROM control WHERE id = 1", async (err, rows) => {
                    if (err) {
                        console.error("خطأ في قراءة جدول control:", err.message);
                        return;
                    }

                    // if (rows.length > 0 && rows[0].print === 1) {
                    //     // ⬇️ إنشاء ملف التذكرة
                    //     const filePath = "d:\\dd.pdf";
                    //     await createTicket({ date, time, sn, number, gross, tare, net, type_p, customer_p }, filePath);

                    //     // ⬇️ استدعاء أمر الطباعة
                    //     printWithSumatra(filePath, "XP-80");

                    //     console.log("✅ تم تنفيذ الطباعة");

                    //     // ⬇️ إعادة القيمة إلى 0 بعد الطباعة (علشان متطبعش كل مرة تلقائي)
                    //     // pool.query("UPDATE control SET print = 0 WHERE id = 1");
                    // } else {
                    //     console.log("🚫 الطباعة متوقفة (print=0)");
                    // }
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
const puppeteer = require('puppeteer');

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



let match = "";
let match1 = "";
let lastMessage = ''; // متغير لتخزين آخر رسالة مستلمة
let NE = '00';

let sendInterval = null;
let sendInterval2 = null;
let sendInterval3 = null;
// let alertPlayed = false; // لمنع تكرار الصوت

// استقبال البيانات من الجهاز وإرسالها إلى الواجهة الأمامية
parser.on('data', (data) => {
    // console.log(data)
    // const currentMessage = data.trim();

    const currentMessage = data
        // .replace(/[^\p{L}\p{N}]/gu, '')
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
    io.emit('response', data.trim());
    let cleanedWeight = data.replace(/[^0-9.-]/g, "");
    // تحويل الوزن إلى رقم
    const weight = parseFloat(cleanedWeight.trim());

    if (!isNaN(weight) && weight < -10) {
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

// جلب بيانات محددة من قاعدة البيانات باستخدام LIMIT و OFFSET
app.get('/get-data2', (req, res) => {
    // (date, time, sn, number, gross, tare, net) 
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('لا يمكن الحصول على اتصال:', err);
            return res.status(500).json({ error: 'فشل في الاتصال بقاعدة البيانات' });
        }

        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        const query = 'SELECT  `id`, `date`, `time`, `sn`, `number`, `gross`, `tare`,`tare2`, `net`, `customer`, `type`,`note`,`images` FROM printer ORDER BY id DESC LIMIT ? OFFSET ?';
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
    const { number, customer, type, gross, tare, tare2, net, note, extraWeightsTable } = req.body;
    // const extraData = extraWeightsTable ? JSON.stringify(extraWeightsTable) : '';
  let _tare2 =tare2;
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
    const sql = 'UPDATE printer SET number=?, customer=?, type=?, gross=?, tare=?, tare2=?,net=?, note=? WHERE id=?';

    pool.query(sql, [number, customer, type, gross, tare, _tare2, net, note , id], (err, result) => {
        if (err) {
            console.error('❌ خطأ أثناء التحديث:', err);
            return res.status(500).json({ success: false, message: 'حدث خطأ أثناء التحديث' });
        }

        // console.log('UPDATE printer:', result.affectedRows);
        res.json({ success: true, message: 'تم تحديث البيانات بنجاح' });
    });
});





// تشغيل الخادم
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '192.168.1.222';
server.listen(PORT, HOST, () => {
    console.log(` HOST :   ${HOST} --  ${PORT}`);
});












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






const pm2 = require('pm2');
const { sendMessageIfEnabled, sendMessage } = require('./backend/pm2-telegram');

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
    const { name, phone, address, notes } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'اسم العميل مطلوب' });
    }

    pool.query(
        'INSERT INTO customers (name, phone, address, notes) VALUES (?, ?, ?, ?)',
        [name, phone, address, notes],
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
    const { name, phone, address, notes } = req.body;

    pool.query(
        'UPDATE customers SET name = ?, phone = ?, address = ?, notes = ? WHERE id = ?',
        [name, phone, address, notes, id],
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
// setInterval(() => {
//     const used = process.memoryUsage();
//     console.log("Heap:", Math.round(used.heapUsed / 1024 / 1024), "MB");
// }, 10000);
//////////////////////////////////////////////////////////////
// توليد المفاتيح (مرة واحدة فقط)
// const webpush = require('web-push');
// const keys = webpush.generateVAPIDKeys();
// console.log(keys);
//////////////////////////////////////////////////////////////

// const webpush = require('web-push');

// const PUBLIC_KEY = process.env.publicKey;
// const PRIVATE_KEY = process.env.privateKey;

// webpush.setVapidDetails(
//     'mailto:you@example.com',
//     PUBLIC_KEY,
//     PRIVATE_KEY
// );

// let subscriptions = [];






// app.post('/subscribe', express.json(), (req, res) => {
//     const subscription = req.body;
//     subscriptions.push(subscription);

//     res.status(201).json({});
// });

// function sendPushNotification(message) {
//     subscriptions.forEach(sub => {
//         webpush.sendNotification(sub, JSON.stringify({
//             title: '🚛 نظام الميزان',
//             body: message
//         }));
//     });
// }

//////////////////////////////////////////////////