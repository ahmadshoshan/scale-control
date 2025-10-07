// // ملف print.js

// function toArabicNumbers(input) {
//   input = input.toString().trim();

//   if (input.includes("/")) {
//     return input.replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
//   }
//   if (input.includes(":")) {
//     return input.replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
//   }

//   let onlyNumbers = input.replace(/[^0-9]/g, '');
//   let arabicNumbers = onlyNumbers.replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
//   return arabicNumbers;
// }


// function printTicket(row) {
//   const printWindow = window.open('', '_blank', 'width=800,height=600');

//   const html = `
// <!doctype html>
// <style>
//   body {
//     font-family: "Arial", "Tahoma", sans-serif;
//     width: 80mm;
//     margin: 0;
//     padding: 6px;
//     box-sizing: border-box;
//     color: #000;
//   }
//   .center { text-align: center; }
//   .small { font-size: 13px; }
//   .medium { font-size: 15px; }
//   .large { font-size: 16px; }
//   .large2 { font-size: 25px; }
//   .bold { font-weight: 700; }
//   .line { border-top: 1px dashed #000; margin: 6px 0; }
//   table { 
//     width: 100%; 
//     border-collapse: collapse; 
//     direction: rtl; 
//     font-size: 14px;
//   }
//   td { 
//     padding: 4px 3px; 
//     vertical-align: middle; 
//     border: 1px solid #000;
//   }
//   .label { width: 40%; font-weight: bold; }
//   .value { width: 60%;  }
//   .qr { text-align:center; margin-top:6px; }
//   @media print {
//     @page { size: 70mm auto; margin: 0; }
//     body { width: 70mm; margin:0; padding:6px; }
//   }
// </style>
// </head>
// <body class="print-ticket">

//   <div class="center">
//     <img src="logo/logo.png" alt="شعار الميزان" style="max-width:120px; height:auto; margin-bottom:6px;">
//   </div>

//   <h1 class="center bold ">ميزان بسكول شوشان</h1>
//   <h3 class="center  medium">العنوان / مدخل أبوغنيمة  ت: 01099760031</h3>
//   <div class="line"></div>

//   <table>
//     <tr><td class="label">التاريخ :</td><td class="value center">${toArabicNumbers(row.date || '')}</td></tr>
//     <tr><td class="label">الوقت :</td><td class="value center">${toArabicNumbers(row.time || '')}</td></tr>
//     <tr><td class="label">المسلسل :</td><td class="value center">${toArabicNumbers(row.sn || '')}</td></tr>
//      <tr><td class="label">رقم السيارة :</td><td class="value center">${toArabicNumbers(row.number || '')}</td></tr>
// </table> 
// <hr>
// <table>
//      <tr><td class="label large bold ">الوزن الأول :</td><td class="value large bold center">${toArabicNumbers(row.gross || '')}     </td></tr>
//      <tr><td class="label large bold ">الوزن الثاني :</td><td class="value large bold center">${toArabicNumbers(row.tare || '')}     </td></tr>
//      <tr><td class="label large bold ">الصافي :</td><td class="value large bold center"><div class=" large2  ">${toArabicNumbers(row.net || '')}</div>     </td></tr>
// </table> 
// <hr>
// <table>
//       <tr><td class="label">النوع :</td><td class="value">${row.type || ''}</td></tr>
//     <tr><td class="label">اسم العميل :</td><td class="value">${row.customer || ''}</td></tr>
//   </table>

//   <div class="line"></div>
//   <div class="line"></div>
//   <div class="line"></div>
//   <div class="line"></div>
 
//   <div class="center small">الميزان غير مسئول عن فقدان الكارت</div>
//   <script>
//     window.onload = function() {
//       setTimeout(function() {
//         window.print();
//       }, 200);
//     };
//   <\/script>
// </body>
// </html>
// `;

//   printWindow.document.open();
//   printWindow.document.write(html);
//   printWindow.document.close();
// }
