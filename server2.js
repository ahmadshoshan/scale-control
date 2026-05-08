// server.js (في جذر المشروع)
require('dotenv').config();
const Server = require('./backend/core/Server');
const pm2 = require('pm2');
const { sendMessage } = require('./backend/services/telegram/pm2-telegram');

// 🚀 إنشاء وتشغيل الخادم
const app = new Server();
app.start();

// 📡 تكامل PM2 للمراقبة
pm2.connect(function (err) {
    if (err) {
        console.error(err);
        process.exit(2);
    }

    pm2.launchBus(function (err, bus) {
        console.log('PM2 Bus launched');
        sendMessage(`🔄 Server started`);
        
        bus.on('process:event', function (data) {
            const messages = {
                'exit': `⚠️ Process ${data.process.name} stopped with code ${data.process.exit_code}`,
                'restart': `🔄 Process ${data.process.name} restarted`,
                'online': `✅ Process ${data.process.name} is online`,
                'stop': `🛑 Process ${data.process.name} stopped`
            };
            
            if (messages[data.event]) {
                sendMessage(messages[data.event]);
            }
        });
    });
});

// 🔄 معالجة الإيقاف الآمن
process.on('SIGINT', () => app.stop());
process.on('SIGTERM', () => app.stop());