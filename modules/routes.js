// // modules/routes.js
// const express = require('express');
// const router = express.Router();
// const pool = require('./db');
// const { setPendingTypeCustomer } = require('./printer');


// router.get('/send-command', (req, res) => {
//     const type = req.query.type || '';
//     const customer = req.query.customer || '';
//     const command = req.query.command;
//     setPendingTypeCustomer(type, customer);
//     if (!command) return res.status(400).send('الأمر غير صحيح');
//     // هنا يجب أن تكتب المنطق لإرسال الأمر إلى المنفذ
//     res.send(`rec-: ${command}`);
// });


// router.get('/set-print/:status', (req, res) => {
//     const status = req.params.status === '1' ? 1 : 0;
//     pool.query('UPDATE control SET print = ? WHERE id = 1', [status], (err) => {
//         if (err) return res.status(500).send('خطأ في قاعدة البيانات');
//         res.send(`تم تغيير حالة الطباعة إلى: ${status}`);
//     });
// });


// router.get('/get-print', (req, res) => {
//     pool.query('SELECT print FROM control WHERE id = 1', (err, rows) => {
//         if (err) return res.status(500).send('خطأ في قاعدة البيانات');
//         res.json({ print: rows[0].print });
//     });
// });


// module.exports = router;