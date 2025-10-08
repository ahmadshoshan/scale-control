// // modules/ticket.js
// const puppeteer = require('puppeteer');
// const fs = require('fs');
// const path = require('path');
// const { toArabicNumbers } = require('./sensor');
// require('dotenv').config();


// const logoPath = process.env.LOGO_PATH || path.join(__dirname, '..', 'logo', 'logo.png');
// let logoBase64 = '';
// try { logoBase64 = fs.readFileSync(logoPath).toString('base64'); } catch (e) { console.error('logo read failed', e.message); }


// async function createTicket(row, outputPath) {
//     const html = `...`; // لتقليل الطول هنا، انسخ الجزء من ملفك الأصلي هنا أو استخدم template منفصل
//     const browser = await puppeteer.launch({ headless: true });
//     const page = await browser.newPage();
//     await page.setContent(html, { waitUntil: 'networkidle0' });
//     await page.pdf({ path: outputPath, width: '80mm', printBackground: true });
//     await browser.close();
// }


// function printWithSumatra(pdfPath, printerName) {
//     const { exec } = require('child_process');
//     const sumatra = `"${process.env.SUMATRA_PATH || 'C:\\\\Program Files\\\\SumatraPDF\\\\SumatraPDF.exe'}" -print-to "${printerName}" -silent "${pdfPath}"`;
//     exec(sumatra, (err) => { if (err) return console.error('Sumatra print error', err); console.log('Printed by Sumatra'); });
// }


// module.exports = { createTicket, printWithSumatra };