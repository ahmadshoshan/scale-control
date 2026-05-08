const https = require("https");

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const pool = require('../../../modules/db'); // تأكد من استدعاء قاعدة البيانات

async function sendMessageIfEnabled(text) {
  pool.query("SELECT notify FROM control WHERE id = 1", (err, rows) => {
    if (!err && rows.length > 0 && rows[0].notify === 1) {
      sendMessage(text); // دالة الإرسال الحالية
    } else {
      // console.log("🚫 الإشعارات متوقفة، لم يتم الإرسال");
    }
  });
}



function sendMessage(text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(text)}`;

  https.get(url, (res) => {
    console.log(" Telegram notification sent");
    // getUpdates(0, true);
  }).on("error", (err) => {
    console.error("Error sending Telegram:", err.message);
  });
}

// function getUpdates(offset = 0, lastUpdate = false) {

//   const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}`;

//   https.get(url, (res) => {
//     let data = "";

//     res.on("data", chunk => data += chunk);
//     res.on("end", () => {
//       const updates = JSON.parse(data);
//       if (updates.result.length > 0) {
//         updates.result.forEach(update => {
//           console.log("telegram :", update.message.text); 
         
//           // هنا ممكن تعالج الرسالة أو تبعتها مرة تانية
//         });

//         // آخر update_id + 1 عشان ميعادش الرسائل القديمة
//         const lastUpdateId = updates.result[updates.result.length - 1].update_id + 1;
//         if (lastUpdate) {
//           getUpdates(lastUpdateId);
//           console.log(updates.result[updates.result.length - 1].message.text);
          
         
//         }

//         //   setTimeout(() => getUpdates(lastUpdateId), 1000); // إعادة الاستدعاء بعد ثانية
//         // } else {
//         //   setTimeout(() => getUpdates(offset), 1000);
//       }
//     });
//   }).on("error", err => console.error("Error getting updates:", err.message));
// }

// getUpdates();


module.exports = { sendMessageIfEnabled, sendMessage };


