// routes/api.routes.js
const express = require('express');
const CustomerService = require('../services/CustomerService');
const TypeService = require('../services/TypeService');
const TicketService = require('../services/TicketService');

module.exports = (app, { db, serialManager, cameraService, notifications, state, io }) => {
    
    // تهيئة الخدمات
    const customerService = new CustomerService(db);
    const typeService = new TypeService(db);
    const ticketService = new TicketService(db);

    // ═══════════════════════════════════════════════════════════════════
    // 🎯 أوامر التحكم بالميزان
    // ═══════════════════════════════════════════════════════════════════
    app.get('/send-command', (req, res) => {
        state.type_id = req.query.type;
        state.customer_id = req.query.customer;
        state.type_p = req.query.type;
        state.customer_p = req.query.customer;

        const command = req.query.command;
        if (command) {
            serialManager.sendCommand(command, (err) => {
                if (err) {
                    console.error('خطأ في إرسال command:', err.message);
                    return res.status(500).send('خطأ في إرسال command');
                }
                res.send(`rec-: ${command}`);
            });
        } else {
            res.status(400).send('الأمر غير صحيح');
        }
    });

    // ═══════════════════════════════════════════════════════════════════
    // 🔊 التحكم في الصوت
    // ═══════════════════════════════════════════════════════════════════
    app.get("/set-sound/:status", (req, res) => {
        const status = req.params.status === "1" ? 1 : 0;
        db.query("UPDATE control SET sound = ? WHERE id = 1", [status], (err) => {
            if (err) {
                console.error("sound update error:", err.message);
                return res.status(500).send("DB error");
            }
            res.send(`sound status changed to ${status}`);
        });
    });

    app.get("/get-sound", (req, res) => {
        db.query("SELECT sound FROM control WHERE id = 1", (err, rows) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send("DB error");
            }
            res.json({ sound: rows[0]?.sound });
        });
    });

    // ═══════════════════════════════════════════════════════════════════
    // 🖨️ التحكم في الطباعة
    // ═══════════════════════════════════════════════════════════════════
    app.get("/set-print/:status", (req, res) => {
        const status = req.params.status === "1" ? 1 : 0;
        db.query("UPDATE control SET print = ? WHERE id = 1", [status], (err) => {
            if (err) {
                console.error("خطأ في تحديث print:", err.message);
                return res.status(500).send("خطأ في قاعدة البيانات");
            }
            res.send(`تم تغيير حالة الطباعة إلى: ${status}`);
        });
    });

    app.get("/get-print", (req, res) => {
        db.query("SELECT print FROM control WHERE id = 1", (err, rows) => {
            if (err) {
                console.error("خطأ في قراءة print:", err.message);
                return res.status(500).send("خطأ في قاعدة البيانات");
            }
            res.json({ print: rows[0]?.print });
        });
    });

    // ═══════════════════════════════════════════════════════════════════
    // 🔔 التحكم في الإشعارات
    // ═══════════════════════════════════════════════════════════════════
    app.get("/set-notify/:status", (req, res) => {
        const status = req.params.status === "1" ? 1 : 0;
        db.query("UPDATE control SET notify = ? WHERE id = 1", [status], (err) => {
            if (err) {
                console.error("notify update error:", err.message);
                return res.status(500).send("DB error");
            }
            res.send(`notify status changed to ${status}`);
        });
    });

    app.get("/get-notify", (req, res) => {
        db.query("SELECT notify FROM control WHERE id = 1", (err, rows) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send("DB error");
            }
            res.json({ notify: rows[0]?.notify });
        });
    });

    // ═══════════════════════════════════════════════════════════════════
    // 📷 التقاط الصور
    // ═══════════════════════════════════════════════════════════════════
    app.get('/capture-images/:imageId/:type', async (req, res) => {
        const { imageId, type } = req.params;
        try {
            await cameraService.captureImage(imageId, 'print');
            res.json({ success: true, message: `تم التقاط صور ${type}` });
        } catch (error) {
            console.error('خطأ في التقاط الصور:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ═══════════════════════════════════════════════════════════════════
    // 📊 بيانات الطابعة
    // ═══════════════════════════════════════════════════════════════════
    app.get('/get-data2', (req, res) => {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        db.query(
            'SELECT `id`, `date`, `time`, `sn`, `number`, `gross`, `tare`,`tare2`, `net`, `customer`, `type`,`note`,`images` FROM printer ORDER BY id DESC LIMIT ? OFFSET ?',
            [limit, offset],
            (error, results) => {
                if (error) {
                    console.error('خطأ في جلب البيانات:', error.message);
                    return res.status(500).json({ error: 'خطأ في جلب البيانات' });
                }
                res.json(results);
            }
        );
    });

    app.get('/get-data3', (req, res) => {
        const type = req.query.type;
        const value = req.query.value;
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        let query = "";
        if (type === "number") {
            query = "SELECT * FROM printer WHERE number = ? ORDER BY id DESC LIMIT ?, ?";
        } else if (type === "sn") {
            query = "SELECT * FROM printer WHERE sn = ? ORDER BY id DESC LIMIT ?, ?";
        } else if (type === "date") {
            query = "SELECT * FROM printer WHERE date = ? ORDER BY id DESC LIMIT ?, ?";
        } else {
            return res.status(400).json({ error: "نوع البحث غير صحيح" });
        }

        db.query(query, [value, offset, limit], (error, results) => {
            if (error) {
                console.error('خطأ في جلب البيانات:', error.message);
                return res.status(500).json({ error: 'خطأ في جلب البيانات' });
            }
            res.json(results);
        });
    });

    // ═══════════════════════════════════════════════════════════════════
    // 📡 بيانات المستشعر
    // ═══════════════════════════════════════════════════════════════════
    app.get('/get-data', (req, res) => {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        db.query(
            'SELECT * FROM sensor_data ORDER BY id DESC LIMIT ? OFFSET ?',
            [limit, offset],
            (error, results) => {
                if (error) {
                    console.error('خطأ في جلب البيانات:', error.message);
                    return res.status(500).json({ error: 'خطأ في جلب البيانات' });
                }
                res.json(results);
            }
        );
    });

    // ═══════════════════════════════════════════════════════════════════
    // ✏️ تحديث التذكرة
    // ═══════════════════════════════════════════════════════════════════
    app.put('/update-ticket/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { number, customer, type, gross, tare, tare2, net, note, extraWeightsTable } = req.body;
            
            let _tare2 = tare2;
            if (extraWeightsTable) {
                let extra = extraWeightsTable;
                if (typeof extra === "string") {
                    extra = JSON.parse(extra);
                }
                _tare2 = extra.thirdWeight;
            }
            
            await ticketService.updateTicket(id, { number, customer, type, gross, tare, tare2: _tare2, net, note });
            res.json({ success: true, message: 'تم تحديث البيانات بنجاح' });
        } catch (error) {
            console.error('❌ خطأ أثناء التحديث:', error);
            res.status(500).json({ success: false, message: 'حدث خطأ أثناء التحديث' });
        }
    });

    // ═══════════════════════════════════════════════════════════════════
    // 👥 إدارة العملاء
    // ═══════════════════════════════════════════════════════════════════
    app.get('/api/customers', async (req, res) => {
        try {
            const customers = await customerService.getAll();
            res.json(customers);
        } catch (error) {
            console.error('خطأ في جلب العملاء:', error);
            res.status(500).json({ error: 'فشل في جلب العملاء' });
        }
    });

    app.post('/api/customers', async (req, res) => {
        try {
            const result = await customerService.create(req.body);
            res.json(result);
        } catch (error) {
            console.error('خطأ في إضافة العميل:', error);
            if (error.message === 'العميل موجود مسبقاً') {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'فشل في إضافة العميل' });
        }
    });

    app.put('/api/customers/:id', async (req, res) => {
        try {
            const result = await customerService.update(req.params.id, req.body);
            res.json(result);
        } catch (error) {
            console.error('خطأ في تعديل العميل:', error);
            res.status(500).json({ error: 'فشل في تعديل العميل' });
        }
    });

    app.delete('/api/customers/:id', async (req, res) => {
        try {
            const result = await customerService.delete(req.params.id);
            res.json(result);
        } catch (error) {
            console.error('خطأ في حذف العميل:', error);
            res.status(500).json({ error: 'فشل في حذف العميل' });
        }
    });

    // ═══════════════════════════════════════════════════════════════════
    // 🏷️ إدارة الأنواع
    // ═══════════════════════════════════════════════════════════════════
    app.get('/api/types', async (req, res) => {
        try {
            const types = await typeService.getAll();
            res.json(types);
        } catch (error) {
            console.error('خطأ في جلب الأنواع:', error);
            res.status(500).json({ error: 'فشل في جلب الأنواع' });
        }
    });

    app.post('/api/types', async (req, res) => {
        try {
            const result = await typeService.create(req.body);
            res.json(result);
        } catch (error) {
            console.error('خطأ في إضافة النوع:', error);
            if (error.message === 'النوع موجود مسبقاً') {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'فشل في إضافة النوع' });
        }
    });

    app.put('/api/types/:id', async (req, res) => {
        try {
            const result = await typeService.update(req.params.id, req.body);
            res.json(result);
        } catch (error) {
            console.error('خطأ في تعديل النوع:', error);
            res.status(500).json({ error: 'فشل في تعديل النوع' });
        }
    });

    app.delete('/api/types/:id', async (req, res) => {
        try {
            const result = await typeService.delete(req.params.id);
            res.json(result);
        } catch (error) {
            console.error('خطأ في حذف النوع:', error);
            res.status(500).json({ error: 'فشل في حذف النوع' });
        }
    });
};