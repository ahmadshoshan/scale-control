const { ThermalPrinter, PrinterTypes, CharacterSet } = require('node-thermal-printer');

// ✅ تصحيح نوع الطابعة - استخدم XPRINTER بدلاً من TANCA
const printer = new ThermalPrinter({
  type: PrinterTypes.TANCA,  // 🔥 أهم تغيير: XPRINTER وليس TANCA
  interface: 'tcp://192.168.1.11', // ضع IP طابعتك الصحيح هنا
  characterSet: CharacterSet.WPC1256_ARABIC,
  options: { timeout: 5000 }
});

// دالة الطباعة المباشرة
async function printReceipt() {
  try {
    console.log('🔄 جاري الاتصال بالطابعة...');
    
    let isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      console.error('❌ الطابعة غير متصلة أو مطفأة');

      return false;
    }

    console.log('✅ تم الاتصال بالطابعة بنجاح');
    console.log('🖨️ جاري الطباعة...');

    // تنسيق الإيصال
    printer.alignCenter();
    printer.println("📦 متجرك الإلكتروني");
    printer.println("asssssshhhh  ");
    printer.newLine();

    printer.alignLeft();
    printer.drawLine();
    printer.println(`الطلب رقم: 444`);
    printer.println(`التاريخ: ${new Date()}`);
    printer.drawLine();

    printer.println(`الإجمالي: 0000 ج.م`);
    printer.newLine();
    printer.println("شكراً لتسوقكم معنا");
    printer.cut();
    printer.beep();

    await printer.execute();
    
    console.log('✅ تمت الطباعة بنجاح!');
    return true;

  } catch (error) {
    console.error('❌ خطأ في الطباعة:', error.message);
    return false;
  }
}

// 🔥 تنفيذ الطباعة المباشرة فور تشغيل الملف
printReceipt();