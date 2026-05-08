// backend/core/Server.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const SerialManager = require('./SerialManager');
const EventHandler = require('./EventHandler');
const CameraService = require('./CameraService');
const DatabaseService = require('../services/DatabaseService');
const NotificationService = require('../services/NotificationService');
const setupRoutes = require('../routes/api.routes');

class Server {
    constructor(config = {}) {
        this.config = {
            port: process.env.PORT2 || 3030,
            host: process.env.HOST || '192.168.1.222',
            comPort1: process.env.COM_PORT1,
            comPort2: process.env.COM_PORT2,
            baudRate: 9600,
            ...config
        };

        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIO(this.server);
        
        // تهيئة الخدمات
        this.db = new DatabaseService();
        this.notifications = new NotificationService(this.io, this.db);
        this.cameraService = new CameraService();
        
        // تهيئة مدير الاتصالات
        this.serialManager = new SerialManager({
            port1: this.config.comPort1,
            port2: this.config.comPort2,
            baudRate: this.config.baudRate
        });

        // تهيئة معالج الأحداث
        this.eventHandler = new EventHandler({
            io: this.io,
            db: this.db,
            serialManager: this.serialManager,
            cameraService: this.cameraService,
            notifications: this.notifications
        });

        // متغيرات الحالة العامة
        this.state = {
            type_id: '',
            customer_id: '',
            type_p: '',
            customer_p: ''
        };
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // خدمة الملفات الثابتة - ملاحظة: public في جذر المشروع
        this.app.use(express.static(path.join(__dirname, '../../public')));
        this.app.use('/webfonts', express.static(path.join(__dirname, '../../public/css/webfonts')));
        this.app.use('/css', express.static(path.join(__dirname, '../../public/css')));
        this.app.use('/js', express.static(path.join(__dirname, '../../public/js')));

        // إعادة توجيه webfonts
        this.app.get('/webfonts/:file', (req, res) => {
            res.redirect(`/public/css/webfonts/${req.params.file}`);
        });

        return this;
    }

    setupRoutes() {
        setupRoutes(this.app, {
            db: this.db,
            serialManager: this.serialManager,
            cameraService: this.cameraService,
            notifications: this.notifications,
            state: this.state,
            io: this.io
        });
        return this;
    }

    bindEvents() {
        this.serialManager.onPrinterData((data) => {
            this.eventHandler.handlePrinterData(data, this.state);
        });

        this.serialManager.onSensorData((data) => {
            this.eventHandler.handleSensorData(data, this.state);
        });

        return this;
    }

    start() {
        this.setupMiddleware()
            .setupRoutes()
            .bindEvents();

        this.server.listen(this.config.port, this.config.host, () => {
            console.log(`🟢 Server running at http://${this.config.host}:${this.config.port}`);
            console.log(`📍 HOST: ${this.config.host} -- PORT: ${this.config.port}`);
        });

        return this;
    }

    async stop() {
        console.log('🔄 Shutting down server...');
        await this.serialManager.close();
        await this.db.close();
        this.server.close(() => {
            console.log('✅ Server stopped');
            process.exit(0);
        });
    }
}

module.exports = Server;