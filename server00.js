// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { createSerial } = require('./modules/serial');
const { handlePrinterLine, setPendingTypeCustomer } = require('./modules/printer');
const { handleSensorLine, setPendingTypeCustomer: setSensorPending } = require('./modules/sensor');
const { playSoundAlert } = require('./modules/audio');
const routes = require('./modules/routes');
const pool = require('./modules/db');
const { Server } = require('socket.io');

// إعداد التطبيق والخادم
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// إعداد الميدل وير
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', routes);

// إنشاء المنافذ التسلسلية
const serial1 = createSerial(process.env.COM_PORT1 || 'COM1');
const serial2 = createSerial(process.env.COM_PORT2 || 'COM7');

// ربط الأحداث
serial1.parser.on('data', (line) => handleSensorLine(line, io, (name) => playSoundAlert(name, io)));
serial2.parser.on('data', (line) => handlePrinterLine(line));

// WebSocket listeners
io.on('connection', (socket) => {
  console.log('connect :   Socket.IO');

  socket.on('disconnect', () => {
    console.log('  disconnect:  Socket.IO ');
  });
  // استقبال أوامر من الواجهة
  socket.on('send-command', (data) => {
    const { command, type, customer } = data;
    console.log(`📤 أمر مستلم: ${command} | النوع: ${type} | العميل: ${customer}`);

    // تمرير النوع والعميل للوحدات المناسبة
    setPendingTypeCustomer(type, customer);
    setSensorPending(type, customer);

    if (command === 'print') {
      // مثال: ممكن تستدعي دالة الطباعة هنا
      console.log('🖨️ تنفيذ أمر الطباعة...');
    }

    io.emit('command-received', { success: true });
  });
});

// تشغيل الخادم
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '192.168.1.222';
server.listen(PORT,HOST, () => {
  console.log(` HOST :   ${HOST} --  ${PORT}`);
});
