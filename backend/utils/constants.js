// utils/constants.js

module.exports = {
    // 🖥️ إعدادات الخادم
    SERVER: {
        DEFAULT_PORT: 3030,
        DEFAULT_HOST: '192.168.1.222',
        MAX_CONNECTIONS: 100,
        TIMEOUT: 30000
    },

    // 🔌 إعدادات SerialPort
    SERIAL: {
        DEFAULT_BAUD_RATE: 9600,
        PORT1_NAME: 'printer',
        PORT2_NAME: 'sensor',
        RECONNECT_INTERVAL: 5000,
        MAX_RECONNECT_ATTEMPTS: 10
    },

    // 🖨️ إعدادات الطابعة
    PRINTER: {
        EXPECTED_LINES: 7,
        BUFFER_TIMEOUT: 10000, // 10 ثواني
        DELIMITER: '\r\n'
    },

    // ⚖️ إعدادات الميزان
    SCALE: {
        WEIGHT_THRESHOLD_LOW: -10,    // تنبيه الوزن السالب
        WEIGHT_THRESHOLD_HIGH: 300,   // تنبيه وجود سيارة
        CHECK_INTERVAL: 5000,         // 5 ثواني
        COMMAND_INTERVAL: 1000        // 1 ثانية
    },

    // 📷 إعدادات الكاميرا
    CAMERA: {
        BASE_URL: 'http://192.168.1.2',
        CHANNELS: [201, 401, 701],
        USERNAME: 'admin',
        PASSWORD: 'admin100',
        IMAGE_PATH: 'public/images',
        DELAY_BEFORE_CAPTURE: 1500    // 1.5 ثانية
    },

    // 🗄️ إعدادات قاعدة البيانات
    DATABASE: {
        CONNECTION_LIMIT: 10,
        QUEUE_LIMIT: 0,
        WAIT_FOR_CONNECTIONS: true,
        TABLES: {
            PRINTER: 'printer',
            SENSOR: 'sensor_data',
            CUSTOMERS: 'customers',
            TYPES: 'types',
            CONTROL: 'control'
        }
    },

    // 🔔 إعدادات الإشعارات
    NOTIFICATIONS: {
        TELEGRAM_ENABLED: true,
        SOUND_ENABLED: true,
        PRINT_ENABLED: true,
        ALERT_INTERVAL: 5000
    },

    // 📁 مسارات النظام
    PATHS: {
        PUBLIC: 'public',
        IMAGES: 'public/images',
        CSS: 'public/css',
        JS: 'public/js',
        WEBFONTS: 'public/css/webfonts'
    },

    // 🎫 أنواع التذاكر
    TICKET: {
        STATUS: {
            PENDING: 0,
            PRINTED: 1,
            CANCELLED: 2
        }
    },

    // 🌐 رسائل النظام
    MESSAGES: {
        SUCCESS: 'تمت العملية بنجاح',
        ERROR: 'حدث خطأ',
        NOT_FOUND: 'البيانات غير موجودة',
        UNAUTHORIZED: 'غير مصرح',
        SERVER_ERROR: 'خطأ في الخادم'
    }
};