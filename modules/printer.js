// // modules/printer.js
// const pool = require('./db');
// const { createTicket, printWithSumatra } = require('./ticket');


// let buffer = [];
// const expectedLines = 7;
// let type_p = '';
// let customer_p = '';


// function handlePrinterLine(line) {
//     if (!line) return;
//     buffer.push(line);
//     if (buffer.length === expectedLines) {
//         const [date, time, sn, number, gross, tare, net] = buffer;


//         const query = `INSERT INTO printer (date, time, sn, number, gross, tare, net, type, customer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
//         pool.query(query, [date, time, sn, number, gross, tare, net, type_p, customer_p], async (err) => {
//             if (err) {
//                 console.error('printer err db:', err.message);
//             } else {
//                 console.log('printer: save');
//             }


//             // طباعة عندما يسمح الكونترول
//             pool.query('SELECT print FROM control WHERE id = 1', async (err2, rows) => {
//                 if (err2) return console.error('control err:', err2.message);
//                 if (rows.length > 0 && rows[0].print === 1) {
//                     const filePath = `${process.cwd()}/tmp/dd.pdf`;
//                     await createTicket({ date, time, sn, number, gross, tare, net, type: type_p, customer: customer_p }, filePath);
//                     printWithSumatra(filePath, process.env.PRINTER_NAME || 'XP-80C');
//                 }
//             });


//             type_p = '';
//             customer_p = '';
//             buffer = [];
//         });
//     }
// }


// function setPendingTypeCustomer(type, customer) {
//     type_p = type || '';
//     customer_p = customer || '';
// }


// module.exports = { handlePrinterLine, setPendingTypeCustomer };