const { SerialPort } = require('serialport'); // استيراد SerialPort ككلاس
const { ReadlineParser } = require('@serialport/parser-readline'); // استيراد المحلل

// إنشاء كائن SerialPort
const port = new SerialPort({
  path: 'COM1', // تأكد من أن هذا هو المنفذ الصحيح
  baudRate: 9600,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
});

// إنشاء محلل البيانات
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

// إرسال الأمر XN2 لقراءة الوزن الصافي
function getNetWeight() {

  // port.write('sx\r'); // تشغيل استريم
  // port.write('ex\r'); // ايقاف استريم
  // port.write('KZERO\r');
  port.write('XN2\r'); // XN2: قراءة الوزن الصافي
}

// استقبال البيانات
parser.on('data', (data) => {
  console.log(`الوزن: ${data.trim()} KG`);
});

// اختبار الاتصال
getNetWeight();