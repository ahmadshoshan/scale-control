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

const fs = require('fs');

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


const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
const get_printer = port2.pipe(new ReadlineParser({ delimiter: '\r\n' }));

let buffer = []; // تخزين المؤقت للبيانات
const expectedLines = 7; // عدد السطور المتوقعة لكل عملية طباعة

get_printer.on('data', (data) => {
    const line = data.toString().trim();
    console.log(`print    : ${line}`);
    if (line) {

        buffer.push(line);

        // إذا وصلنا إلى العدد المتوقع من السطور
        if (buffer.length === expectedLines) {
            const [date, time, sn, number, gross, tare, net] = buffer;

            // إدخال البيانات إلى قاعدة البيانات
            const query = `
                INSERT INTO printer 
                (date, time, sn, number, gross, tare, net) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            pool.query(query, [date, time, sn, number, gross, tare, net], async (err, results) => {
                if (err) {
                    console.error('printer err db:', err.message);
                } else {
                    console.log('printer: save     ');
                }

                // ⬇️ إنشاء ملف التذكرة
                const filePath = "d:\\dd.pdf";
                await createTicket({ date, time, sn, number, gross, tare, net }, filePath);

                // ⬇️ استدعاء أمر الطباعة
                printWithSumatra(filePath, 'XP-80C');
            });

            // إعادة تعيين المخزن المؤقت
            buffer = [];
        }
    }
});
// مثال استدعاء SumatraPDF (بعد تثبيت SumatraPDF في C:\Program Files\SumatraPDF\SumatraPDF.exe)
const { exec } = require('child_process');
function printWithSumatra(pdfPath, printerName) {
    const sumatra = `"C:\\Users\\sss\\AppData\\Local\\SumatraPDF\\SumatraPDF.exe" -print-to "${printerName}" -silent "${pdfPath}"`;
    exec(sumatra, (err, stdout, stderr) => {
        if (err) return console.error('Sumatra print error', err);
        console.log('Printed by Sumatra');
    });
}

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

// اقرأ اللوجو وحوله Base64
const logoBase64 = fs.readFileSync("D:/XAMPP/htdocs/710/logo/logo.png").toString("base64");

async function createTicket(row, outputPath) {
    const html = `
    <!doctype html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: "Amiri", "Arial", sans-serif;
          width: 80mm;
          margin: 0;
          padding: 6px;
          box-sizing: border-box;
          color: #000;
        }
        .center { text-align: center; }
        .bold { font-weight: 700; }
        .line { border-top: 2px dashed #000; margin: 6px 0; }
        table {
          width: 100%;
          border-collapse: collapse;
          direction: rtl;
          font-size: 18px; /* 🔥 خط كبير */
        }
        td {
          padding: 6px 4px;
          vertical-align: middle;
          border: 2px solid #000;
        }
        .label { width: 40%; font-weight: bold; }
        .value { width: 60%; text-align: center; font-weight: bold; }
        .large { font-size: 20px; }   /* 🔥 أكبر */
        .medium { font-size: 18px; }
        .small { font-size: 16px; }
      </style>
    </head>
    <body class="print-ticket">

      <!-- اللوجو -->
      <div class="center">
    <img src="data:image/png;base64,${logoBase64}" 
     alt="شعار الميزان" 
     style="max-width:120px; height:auto; margin-bottom:6px;">


      </div>

      <!-- العنوان -->
      <h2 class="center bold ">ميزان بسكول شوشان</h2>
      <h3 class="center medium">العنوان / مدخل أبوغنيمة  ت: 01099760031</h3>
      <div class="line"></div>

      <!-- البيانات -->
      <table>
        <tr><td class="label">التاريخ :</td><td class="value">${toArabicNumbers(row.date || '')}</td></tr>
        <tr><td class="label">الوقت :</td><td class="value">${toArabicNumbers(row.time || '')}</td></tr>
        <tr><td class="label">المسلسل :</td><td class="value">${toArabicNumbers(row.sn || '')}</td></tr>
        <tr><td class="label">رقم السيارة :</td><td class="value">${toArabicNumbers(row.number || '')}</td></tr>
      </table>
      
      <div class="line"></div>

      <table>
        <tr><td class="label large bold center">الوزن الأول :</td><td class="value large bold center">${toArabicNumbers(row.gross || '')} كيلو</td></tr>
        <tr><td class="label large bold center">الوزن الثاني :</td><td class="value large bold center">${toArabicNumbers(row.tare || '')} كيلو</td></tr>
        <tr><td class="label large bold center">الصافي :</td><td class="value large bold center">${toArabicNumbers(row.net || '')} كيلو</td></tr>
      </table>

      <div class="line"></div>

      <table>
        <tr><td class="label">النوع :</td><td class="value">${row.type || ''}</td></tr>
        <tr><td class="label">اسم العميل :</td><td class="value">${row.customer || ''}</td></tr>
      </table>

      <div class="line"></div>
      <div class="center small">شكرًا لاستخدامكم خدمتنا</div>

    </body>
    </html>
    `;

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle0' });

    await page.pdf({
        path: outputPath,
        width: '80mm',
        printBackground: true
    });

    await browser.close();
}

/////////////////////////////////////////////////////////////////////

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


// دالة لتشغيل ملف صوتي

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

        const type = req.query.type;   // النوع (number, sn, date)
        const value = req.query.value; // القيمة اللي هيكتبها المستخدم


        let query = "";
        if (type === "number") {
            query = "SELECT * FROM `printer` WHERE `number` = ?";
        } else if (type === "sn") {
            query = "SELECT * FROM `printer` WHERE `sn` = ?";
        } else if (type === "date") {
            query = "SELECT * FROM `printer` WHERE `date` = ?";
        } else {
            connection.release();
            return res.status(400).json({ error: "نوع البحث غير صحيح" });
        }

        connection.query(query, [value], (error, results) => {
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





// تشغيل الخادم
server.listen(3000, '192.168.1.222', () => {
    console.log('http://192.168.1.222:3000');

});







