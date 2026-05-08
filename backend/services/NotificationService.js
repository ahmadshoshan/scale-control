// services/NotificationService.js
const { playSoundAlert } = require('../../modules/audio');
const { sendMessageIfEnabled } = require('./telegram/pm2-telegram');

class NotificationService {
    constructor(io, db) {
        this.io = io;
        this.db = db;
    }

    // 🔊 تشغيل الصوت إذا كان مفعلاً
    playSoundIfEnabled(file) {
        this.db.query("SELECT sound FROM control WHERE id = 1", (err, rows) => {
            if (!err && rows[0]?.sound === 1) {
                playSoundAlert(file, this.io);
            }
        });
    }

    // 🔔 إرسال إشعار Telegram إذا كان مفعلاً
    sendTelegramIfEnabled(message) {
        this.db.query("SELECT notify FROM control WHERE id = 1", (err, rows) => {
            if (!err && rows[0]?.notify === 1) {
                sendMessageIfEnabled(message);
            }
        });
    }

    // 📡 إرسال حدث عبر Socket.IO
    emit(event, data) {
        this.io.emit(event, data);
    }
}

module.exports = NotificationService;