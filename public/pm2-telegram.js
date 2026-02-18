const https = require("https");

const BOT_TOKEN = "7965946681:AAEBYL15_UiA3FzvN5r_j1LcgwqLTn8RHuw";
const CHAT_ID = "1390890695";

const pool = require('../modules/db'); // تأكد من استدعاء قاعدة البيانات

async function sendMessageIfEnabled(text) {
    pool.query("SELECT notify FROM control WHERE id = 1", (err, rows) => {
        if (!err && rows.length > 0 && rows[0].notify === 1) {
            sendMessage(text); // دالة الإرسال الحالية
        } else {
            console.log("🚫 الإشعارات متوقفة، لم يتم الإرسال");
        }
    });
}



function sendMessage(text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(text)}`;

  https.get(url, (res) => {
    console.log("📩 Telegram notification sent");
  }).on("error", (err) => {
    console.error("Error sending Telegram:", err.message);
  });
}




module.exports = { sendMessageIfEnabled };


