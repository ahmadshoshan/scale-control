const ptp = require("pdf-to-printer");

// هذا الكود يطبع أي ملف (صورة أو PDF) مباشرة للطابعة المعرفة
ptp.print("ticket.png", {
    printer: "XP-80",
    unix: ["-o fit-to-page"] 
}).then(() => console.log("طبعت فعلاً! ✅"));
