require('dotenv').config();
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const http = require('http');
const { Server } = require('socket.io');

// ═══════════════════════════════════════════════════════════
// 1. إعداد خادم Socket.io للاستماع
// ═══════════════════════════════════════════════════════════
const app = http.createServer();
const io = new Server(app, {
    cors: {
        origin: "*", // يسمح لأي خادم آخر بالاتصال
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3333;

// مراقبة الاتصالات
io.on('connection', (socket) => {
    console.log(`✅ خادم جديد متصل للاستماع: ${socket.id}`);
    
    // ✅ هنا نستمع للأوامر القادمة من الخادم الثاني ونوجهها للميزان
    socket.on('scale:command', (command) => {
        console.log(`📩 استلام أمر من الشبكة لتوجيهه للميزان: ${command.trim()}`);
        scalePort.write(command, (err) => {
            if (err) {
                console.error('❌ فشل في إرسال الأمر للميزان:', err.message);
            } else {
                console.log(`✅ تم إرسال الأمر بنجاح للميزان`);
            }
        });
    });

    socket.on('disconnect', () => {
        console.log(`❌ خادم قطع الاتصال: ${socket.id}`);
    });
});

// ═══════════════════════════════════════════════════════════
// 2. إعداد منافذ السيريال (Serial Ports)
// ═══════════════════════════════════════════════════════════
// منفذ الميزان
const scalePort = new SerialPort({ path: process.env.COM_PORT1, baudRate: 9600 });
const scaleParser = scalePort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

scalePort.on('error', (err) => console.error('❌ خطأ في منفذ الميزان:', err.message));

// منفذ الطابعة
const printerPort = new SerialPort({ path: process.env.COM_PORT2, baudRate: 9600 });
const printerParser = printerPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

printerPort.on('error', (err) => console.error('❌ خطأ في منفذ الطابعة:', err.message));

// ═══════════════════════════════════════════════════════════
// 3. معالجة وبث بيانات الميزان
// ═══════════════════════════════════════════════════════════
let lastNE = '00';

scaleParser.on('data', (data) => {
    // تنظيف البيانات من رموز التحكم غير المرئية
    const cleanData = data
        .replace(/[\x02\x03]/g, "")       // إزالة STX و ETX
        .replace(/[\x00-\x1F\x7F]/g, '')  // إزالة رموز التحكم الأخرى
        .trim();

    if (!cleanData) return;

    // محاولة استخراج الوزن كرقم
    const cleanedWeight = cleanData.replace(/[^0-9.-]/g, "");
    const weight = parseFloat(cleanedWeight);

    // تحديث آخر رمز NE إذا وجد
    if (cleanData.slice(-2).toUpperCase() === "NE") {
        lastNE = cleanData;
    }

    // 🔥 بث البيانات فوراً لجميع الخوادم المتصلة
    io.emit('scale:data', {
        raw: cleanData,
        weight: !isNaN(weight) ? weight : null,
        ne: lastNE,
        timestamp: Date.now()
    });
});

// ═══════════════════════════════════════════════════════════
// 4. معالجة وبث بيانات الطابعة
// ═══════════════════════════════════════════════════════════
let printerBuffer = [];
const expectedLines = 7; // عدد الأسطر المتوقعة للتذكرة الواحدة

printerParser.on('data', (data) => {
    const line = data.toString('utf8')
        .replace(/[^\x20-\x7E\u0600-\u06FF]/g, '') // الاحتفاظ بالأحرف العربية والإنجليزية والأرقام فقط
        .trim();

    if (!line) return;

    // التحقق المبدئي من صحة السطر (تاريخ، وقت، أرقام، أو وزن)
    const isValid = /^\d{2}\/\d{2}\/\d{4}$/.test(line) || 
                    /^\d{2}:\d{2}[AP]M$/.test(line) || 
                    /^\d+$/.test(line) || 
                    /kg/i.test(line);

    if (isValid) {
        printerBuffer.push(line);

        if (printerBuffer.length === expectedLines) {
            const [date, time, sn, number, gross, tare, net] = printerBuffer;
            
            // 🔥 بث التذكرة المكتملة فوراً للخوادم الأخرى
            io.emit('printer:ticket', {
                date, time, sn, number, gross, tare, net,
                timestamp: Date.now()
            });

            console.log(`[طابعة] ✅ تم بث تذكرة مكتملة للسيارة: ${number}`);
            
            // إعادة تعيين المخزن المؤقت للتذكرة التالية
            printerBuffer = []; 
        }
    }
});

// ═══════════════════════════════════════════════════════════
// 5. تشغيل الخادم
// ═══════════════════════════════════════════════════════════
app.listen(PORT, () => {
    console.log('==================================================');
    console.log(`🚀 جسر السيريال يعمل بنجاح على المنفذ: ${PORT}`);
    console.log(`🔌 منفذ الميزان: ${process.env.COM_PORT1}`);
    console.log(`🖨️ منفذ الطابعة: ${process.env.COM_PORT2}`);
    console.log('==================================================');
});