const express = require('express');
const http = require('http');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);


// SerialPort.list().then(ports => {
//     console.log('المنافذ المتاحة:', ports);
// });
// إعداد المنفذ التسلسلي
const port = new SerialPort({
    path: 'COM1', // تأكد من أن هذا هو المنفذ الصحيح
    baudRate: 9600,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
});
const port2 = new SerialPort({
    path: 'COM7', // تأكد من أن هذا هو المنفذ الصحيح
    baudRate: 9600,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
});

// الاستماع للأخطاء
port.on('error', (err) => {
    console.error(' port1  :', err.message);
});

port2.on('error', (err) => {
    console.error('  port2 :', err.message);
});

// // عند فتح المنفذ بنجاح
// port.on('open', () => {
//     console.log('تم فتح المنفذ الأول (COM4)');
// });

// port2.on('open', () => {
//     console.log('تم فتح المنفذ الثاني (COM5)');
// });
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
const printer = port2.pipe(new ReadlineParser({ delimiter: '\r\n' }));

let buffer = []; // تخزين المؤقت للبيانات
const expectedLines = 7; // عدد السطور المتوقعة لكل عملية طباعة

printer.on('data', (data) => {
    const line = data.toString().trim();
    console.log(`print    : ${line}`);
    if (line) {

        buffer.push(line);

        // إذا وصلنا إلى العدد المتوقع من السطور
        if (buffer.length === expectedLines) {
            // مثال على تحليل البيانات
            // const date = buffer[0];         // التاريخ
            // const time = buffer[1];         // التاريخ
            // const sn = buffer[2];     // SN
            // const number = buffer[3];     // Number
            // const gross = buffer[4];     // Gross
            // const tare = buffer[5];     // Net
            // const net = buffer[6];         // Tare
            const [date, time, sn, number, gross, tare, net] = buffer;

            // // مثال على شرط بسيط للتحقق
            // if (!date.includes('/') || !time.includes(':')||!gross.includes('kg') || !tare.includes('kg')) {
            //     console.error('data printer err     ');
            //     buffer = [];
            //     return;
            // }


            // إدخال البيانات إلى قاعدة البيانات
            const query = `
                INSERT INTO printer 
                (date, time, sn, number, gross, tare, net) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            // // يمكنك استبدال الوقت بقيمة فعلية إذا كانت متوفرة
            // const currentTime = new Date().toLocaleTimeString();

            pool.query(query, [date, time, sn, number, gross, tare, net], (err, results) => {
                if (err) {
                    console.error('printer err db:', err.message);
                } else {
                    console.log('printer: save     ');
                }
            });

            // إعادة تعيين المخزن المؤقت
            buffer = [];
        }
    }
});

// printer.on('data', (data) => {
//     const currentMessage = data.trim();
//     console.log(`print    : ${data}`); // عرض الرسالة إذا لم تكن مكررة





//         // تخزين الرسالة في قاعدة البيانات
//         const query = 'INSERT INTO printer ( `date`, `time`, `sn`, `number`, `gross`, `tare`, `net`) VALUES (?,?,?,?,?,?,?)';
//         pool.query(query, [`date`, `time`, `sn`, `number`, `gross`, `tare`, `net`], (err, results) => {
//             if (err) {
//                 console.error('printer err db:', err.message);
//             } else {
//                 console.log(' printer save  in db.');

//             }

//         });

// })

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'scale_control',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
// تقديم الملفات الثابتة
app.use(express.static(path.join(__dirname)));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// معالجة الأوامر المرسلة من الواجهة الأمامية
app.get('/send-command', (req, res) => {
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

// // استقبال البيانات من الجهاز وإرسالها إلى الواجهة الأمامية
// parser.on('data', (data) => {
//     // console.log(`rec : ${data.trim()}`);
//     io.emit('response', data.trim());
// });



// دالة لتشغيل ملف صوتي
const fs = require('fs');
const play = require('play-sound')();

let isPlaying = false; // متغير لتتبع حالة التشغيل
const delayTime = 5000; // زمن التأخير بالميلي ثانية (5 ثوانٍ)

// دالة لتشغيل ملف صوتي
function playSoundAlert(nameFile) {

    const filePath = `./audio/${nameFile}`; // تأكد من المسار الصحيح للملف
    // console.log(filePath);

    if (isPlaying) {// التحقق مما إذا كان الملف الصوتي قيد التشغيل

        return;
    }


    isPlaying = true; // تحديث الحالة إلى "قيد التشغيل"


    fs.access(filePath, fs.constants.F_OK, (err) => {// التحقق من وجود الملف الصوتي
        if (err) {
            console.error('الملف الصوتي غير موجود.');
            isPlaying = false; // إعادة تعيين الحالة في حالة حدوث خطأ
        } else {
            io.emit('play-audio', `${nameFile}`);
            play.play(filePath, { player: 'wmplayer' }, (err) => {
                if (err) {
                    console.error('خطأ في تشغيل الملف الصوتي:', err.message);
                }

                // إضافة زمن تأخير قبل إعادة تعيين الحالة
                setTimeout(() => {
                    isPlaying = false; // إعادة تعيين الحالة بعد انتهاء التأخير
                    // console.log('تم إعادة تعيين الحالة. يمكن الآن قبول أوامر تشغيل جديدة.');
                }, delayTime); // زمن التأخير هنا هو 5 ثوانٍ
            });
        }
    });
}
let match = "";
let match1 = "";
let lastMessage = ''; // متغير لتخزين آخر رسالة مستلمة
let NE = '00';
// استقبال البيانات من الجهاز وإرسالها إلى الواجهة الأمامية
parser.on('data', (data) => {
    const currentMessage = data.trim(); // تنظيف الرسالة الحالية
    // التحقق مما إذا كانت الرسالة الحالية مكررة
    if (currentMessage !== lastMessage) {
        console.log(`rec :: ${currentMessage}`); // عرض الرسالة إذا لم تكن مكررة
        if (currentMessage.slice(-2).toUpperCase() === "NE") {
            NE = currentMessage;
            console.log(`ne :: ${NE}`);
        }
        // تحديث قيمة آخر رسالة
        lastMessage = currentMessage;
    }
    io.emit('response', data.trim());
    let cleanedWeight = data.replace(/[^0-9.-]/g, "");
    // تحويل الوزن إلى رقم
    const weight = parseFloat(cleanedWeight.trim());

    if (!isNaN(weight) && weight < -10) {
        playSoundAlert("yagib_tasfier_almezan.mp3");
    }

    if (!isNaN(weight) && weight > 300) {
        playSoundAlert('yogad_sayara_almezan1.mp3');
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
        // تخزين الرسالة في قاعدة البيانات
        const query = 'INSERT INTO sensor_data (data_value,date,number) VALUES (?,?,?)';
        pool.query(query, [match[1], match1[1], NE], (err, results) => {
            if (err) {
                console.error('err db:', err.message);
            } else {
                console.log('  save  in db.');
                io.emit('responseID', '');
            }
            match = ""; match1 = "";
            NE = '';
        });

    }


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

        const query = 'SELECT * FROM printer ORDER BY id DESC LIMIT ? OFFSET ?';
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


        const NE = req.query.carNumber;

        const query = 'SELECT * FROM `printer` WHERE `number`= ?';
        connection.query(query, [NE], (error, results) => {
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




    // const limit = parseInt(req.query.limit) || 10; // عدد الصفوف الافتراضي هو 10
    // const offset = parseInt(req.query.offset) || 0; // بداية الصفوف الافتراضية هي 0

    // const query = 'SELECT * FROM sensor_data ORDER BY id DESC LIMIT ? OFFSET ?';
    // db.query(query, [limit, offset], (err, results) => {
    //     if (err) {
    //         console.error('خطأ في جلب البيانات:', err.message);
    //         return res.status(500).json({ error: 'خطأ في جلب البيانات' });
    //     }
    //     res.json(results); // إرجاع البيانات كاستجابة JSON
    // });
});
// تشغيل الخادم
server.listen(3000, '192.168.1.222', () => {
    console.log('http://192.168.1.222:3000');

});
