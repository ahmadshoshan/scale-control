// utils/helpers.js

/**
 * تحويل الأرقام العربية إلى إنجليزية والعكس
 * @param {string|number} input - الرقم المدخل
 * @param {boolean} toArabic - هل التحويل للعربي (true) أم للإنجليزي (false)
 * @returns {string} الرقم بعد التحويل
 */
function convertNumbers(input, toArabic = true) {
    input = input.toString().trim();
    
    const arabicNumbers = "٠١٢٣٤٥٦٧٨٩";
    const englishNumbers = "0123456789";
    
    // لو تاريخ (بيحتوي على "/")
    if (input.includes("/")) {
        if (toArabic) {
            return input.replace(/[0-9]/g, d => arabicNumbers[d]);
        } else {
            return input.replace(/[٠-٩]/g, d => englishNumbers[arabicNumbers.indexOf(d)]);
        }
    }
    
    // لو مش تاريخ (نشيل أي حروف ونسيب أرقام فقط)
    let onlyNumbers = input.replace(/[^0-9٠-٩]/g, '');
    
    if (toArabic) {
        return onlyNumbers.replace(/[0-9]/g, d => arabicNumbers[d]);
    } else {
        return onlyNumbers.replace(/[٠-٩]/g, d => englishNumbers[arabicNumbers.indexOf(d)]);
    }
}

/**
 * تنسيق التاريخ
 * @param {Date} date - كائن التاريخ
 * @returns {string} التاريخ بصيغة DD/MM/YYYY
 */
function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * تنسيق الوقت
 * @param {Date} date - كائن التاريخ
 * @returns {string} الوقت بصيغة HH:MM AM/PM
 */
function formatTime(date) {
    const d = new Date(date);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${String(hours).padStart(2, '0')}:${minutes}${ampm}`;
}

/**
 * توليد معرف فريد
 * @returns {string} معرف فريد بناءً على الوقت
 */
function generateUniqueId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * تنظيف النص من الرموز غير المرغوبة
 * @param {string} text - النص المراد تنظيفه
 * @returns {string} النص النظيف
 */
function cleanText(text) {
    return text
        .toString('utf8')
        .replace(/�/g, '')
        .replace(/[^\x20-\x7E\u0600-\u06FF]/g, '')
        .trim();
}

/**
 * التحقق من صحة سطر الطابعة
 * @param {string} line - السطر المراد التحقق منه
 * @returns {boolean} هل السطر صالح
 */
function isValidPrinterLine(line) {
    return (
        /^\d{2}\/\d{2}\/\d{4}$/.test(line) ||     // تاريخ
        /^\d{2}:\d{2}[AP]M$/.test(line) ||         // وقت
        /^\d+$/.test(line) ||                      // أرقام
        /kg/i.test(line)                           // وزن
    );
}

/**
 * تحليل الوزن من النص
 * @param {string} data - النص المحتوي على الوزن
 * @returns {number|null} الوزن كرقم أو null إذا فشل
 */
function parseWeight(data) {
    const cleaned = data.replace(/[^0-9.-]/g, "");
    const weight = parseFloat(cleaned.trim());
    return isNaN(weight) ? null : weight;
}

/**
 * إنشاء اسم ملف للصور
 * @param {string} prefix - بادئة الاسم
 * @param {string} number - رقم السيارة/التذكرة
 * @param {string} net - الوزن الصافي
 * @returns {string} اسم الملف
 */
function generateImageFileName(prefix, number, net) {
    return `${prefix}_${number}_${net}`;
}

/**
 * تأخير التنفيذ (Sleep)
 * @param {number} ms - المدة بالميلي ثانية
 * @returns {Promise}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * التحقق من وجود مجلد وإنشاؤه إذا لم يوجد
 * @param {string} dirPath - مسار المجلد
 */
function ensureDirectoryExists(dirPath) {
    const fs = require('fs');
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

module.exports = {
    convertNumbers,
    formatDate,
    formatTime,
    generateUniqueId,
    cleanText,
    isValidPrinterLine,
    parseWeight,
    generateImageFileName,
    sleep,
    ensureDirectoryExists
};