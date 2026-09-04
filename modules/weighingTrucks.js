const express = require('express');
const router = express.Router();

const pool = require('./db');

// ============================================================
// جدول سيارات الميزان
// ============================================================

async function createTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS weighing_trucks (
            id VARCHAR(100) PRIMARY KEY,

            number VARCHAR(100) NOT NULL,

            first_weight DECIMAL(15,2) DEFAULT NULL,
            first_time VARCHAR(50) DEFAULT NULL,
            first_date VARCHAR(50) DEFAULT NULL,
            first_image TEXT DEFAULT NULL,

            second_weight DECIMAL(15,2) DEFAULT NULL,
            second_time VARCHAR(50) DEFAULT NULL,
            second_date VARCHAR(50) DEFAULT NULL,
            second_image TEXT DEFAULT NULL,

            net_weight DECIMAL(15,2) DEFAULT NULL,
            net_calculated TINYINT(1) DEFAULT 0,

            images VARCHAR(255) DEFAULT NULL,

            customer VARCHAR(255) DEFAULT NULL,
            type VARCHAR(255) DEFAULT NULL,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,

            INDEX idx_number (number),
            INDEX idx_first_date (first_date),
            INDEX idx_net_calculated (net_calculated)
        )
    `;

    try {
        await pool.promise().query(sql);
        console.log('✅ جدول weighing_trucks جاهز');
    } catch (error) {
        console.error(
            '❌ خطأ في إنشاء جدول weighing_trucks:',
            error.message
        );
    }
}

// إنشاء الجدول عند تشغيل السيرفر
createTable();


// ============================================================
// تحويل بيانات MySQL إلى الشكل المستخدم في iq710-scale.html
// ============================================================

function formatTruck(row) {
    if (!row) return null;

    return {
        id: row.id,
        number: row.number,

        firstWeight:
            row.first_weight !== null
                ? Number(row.first_weight)
                : null,

        firstTime: row.first_time,
        firstDate: row.first_date,
        firstImage: row.first_image,

        secondWeight:
            row.second_weight !== null
                ? Number(row.second_weight)
                : null,

        secondTime: row.second_time,
        secondDate: row.second_date,
        secondImage: row.second_image,

        netWeight:
            row.net_weight !== null
                ? Number(row.net_weight)
                : null,

        netCalculated: Boolean(row.net_calculated),

        images: row.images,

        customer: row.customer || '',
        type: row.type || ''
    };
}


// ============================================================
// GET
// جلب جميع سيارات الميزان
// ============================================================

router.get('/', async (req, res) => {

    try {

        const [rows] = await pool.promise().query(`
            SELECT *
            FROM weighing_trucks
            ORDER BY created_at DESC
        `);

        res.json(rows.map(formatTruck));

    } catch (error) {

        console.error(
            '❌ خطأ في جلب سيارات الميزان:',
            error
        );

        res.status(500).json({
            success: false,
            error: 'فشل في جلب بيانات الميزان'
        });
    }
});


// ============================================================
// GET
// جلب سيارة واحدة
// ============================================================

router.get('/:id', async (req, res) => {

    const { id } = req.params;

    try {

        const [rows] = await pool.promise().query(
            `
            SELECT *
            FROM weighing_trucks
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        if (rows.length === 0) {

            return res.status(404).json({
                success: false,
                error: 'السيارة غير موجودة'
            });
        }

        res.json(formatTruck(rows[0]));

    } catch (error) {

        console.error(
            '❌ خطأ في جلب السيارة:',
            error
        );

        res.status(500).json({
            success: false,
            error: 'فشل في جلب بيانات السيارة'
        });
    }
});


// ============================================================
// POST
// إضافة وزن أول
// ============================================================

router.post('/', async (req, res) => {

    const {
        id,
        number,
        firstWeight,
        firstTime,
        firstDate,
        firstImage,
        images,
        customer,
        type
    } = req.body;

    if (!id) {

        return res.status(400).json({
            success: false,
            error: 'معرف السيارة مطلوب'
        });
    }

    if (!number) {

        return res.status(400).json({
            success: false,
            error: 'رقم السيارة مطلوب'
        });
    }

    if (
        firstWeight === undefined ||
        firstWeight === null ||
        Number(firstWeight) === 0
    ) {

        return res.status(400).json({
            success: false,
            error: 'الوزن الأول مطلوب'
        });
    }

    try {

        const sql = `
            INSERT INTO weighing_trucks
            (
                id,
                number,
                first_weight,
                first_time,
                first_date,
                first_image,
                images,
                customer,
                type,
                net_calculated
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `;

        const values = [
            id,
            number,
            firstWeight,
            firstTime || null,
            firstDate || null,
            firstImage || null,
            images || null,
            customer || '',
            type || ''
        ];

        await pool.promise().query(sql, values);

        const [rows] = await pool.promise().query(
            `
            SELECT *
            FROM weighing_trucks
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        res.json({
            success: true,
            message: 'تم حفظ الوزن الأول',
            truck: formatTruck(rows[0])
        });

    } catch (error) {

        console.error(
            '❌ خطأ في حفظ الوزن الأول:',
            error
        );

        if (error.code === 'ER_DUP_ENTRY') {

            return res.status(400).json({
                success: false,
                error: 'السيارة موجودة بالفعل'
            });
        }

        res.status(500).json({
            success: false,
            error: 'فشل في حفظ الوزن الأول'
        });
    }
});


// ============================================================
// PUT
// تحديث السيارة / تسجيل الوزن الثاني والصافي
// ============================================================

router.put('/:id', async (req, res) => {

    const { id } = req.params;

    const {
        number,

        firstWeight,
        firstTime,
        firstDate,
        firstImage,

        secondWeight,
        secondTime,
        secondDate,
        secondImage,

        netWeight,
        netCalculated,

        images,

        customer,
        type
    } = req.body;

    try {

        const [existing] = await pool.promise().query(
            `
            SELECT *
            FROM weighing_trucks
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        if (existing.length === 0) {

            return res.status(404).json({
                success: false,
                error: 'السيارة غير موجودة'
            });
        }

        const old = existing[0];

        const finalFirstWeight =
            firstWeight !== undefined
                ? firstWeight
                : old.first_weight;

        const finalSecondWeight =
            secondWeight !== undefined
                ? secondWeight
                : old.second_weight;

        let finalNetWeight = netWeight;

        // حساب الصافي تلقائيًا
        if (
            finalNetWeight === undefined &&
            finalFirstWeight !== null &&
            finalSecondWeight !== null
        ) {
            finalNetWeight = Math.abs(
                Number(finalFirstWeight) -
                Number(finalSecondWeight)
            );
        }

        const finalNetCalculated =
            netCalculated !== undefined
                ? Boolean(netCalculated)
                : (
                    finalSecondWeight !== null &&
                    finalNetWeight !== null
                );

        const sql = `
            UPDATE weighing_trucks

            SET
                number = ?,

                first_weight = ?,
                first_time = ?,
                first_date = ?,
                first_image = ?,

                second_weight = ?,
                second_time = ?,
                second_date = ?,
                second_image = ?,

                net_weight = ?,
                net_calculated = ?,

                images = ?,

                customer = ?,
                type = ?

            WHERE id = ?
        `;

        const values = [

            number !== undefined
                ? number
                : old.number,

            finalFirstWeight,

            firstTime !== undefined
                ? firstTime
                : old.first_time,

            firstDate !== undefined
                ? firstDate
                : old.first_date,

            firstImage !== undefined
                ? firstImage
                : old.first_image,

            finalSecondWeight,

            secondTime !== undefined
                ? secondTime
                : old.second_time,

            secondDate !== undefined
                ? secondDate
                : old.second_date,

            secondImage !== undefined
                ? secondImage
                : old.second_image,

            finalNetWeight,

            finalNetCalculated ? 1 : 0,

            images !== undefined
                ? images
                : old.images,

            customer !== undefined
                ? customer
                : old.customer,

            type !== undefined
                ? type
                : old.type,

            id
        ];

        await pool.promise().query(sql, values);

        const [rows] = await pool.promise().query(
            `
            SELECT *
            FROM weighing_trucks
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        res.json({
            success: true,
            message: 'تم تحديث بيانات السيارة',
            truck: formatTruck(rows[0])
        });

    } catch (error) {

        console.error(
            '❌ خطأ في تحديث السيارة:',
            error
        );

        res.status(500).json({
            success: false,
            error: 'فشل في تحديث بيانات السيارة'
        });
    }
});


// ============================================================
// DELETE
// حذف سيارة
// ============================================================

router.delete('/:id', async (req, res) => {

    const { id } = req.params;

    try {

        const [result] = await pool.promise().query(
            `
            DELETE FROM weighing_trucks
            WHERE id = ?
            `,
            [id]
        );

        if (result.affectedRows === 0) {

            return res.status(404).json({
                success: false,
                error: 'السيارة غير موجودة'
            });
        }

        res.json({
            success: true,
            message: 'تم حذف السيارة بنجاح'
        });

    } catch (error) {

        console.error(
            '❌ خطأ في حذف السيارة:',
            error
        );

        res.status(500).json({
            success: false,
            error: 'فشل في حذف السيارة'
        });
    }
});


// ============================================================
// POST
// ترحيل بيانات localStorage القديمة إلى MySQL
// ============================================================

// ============================================================
// POST /bulk
// حفظ Array كاملة قادمة من iq710-scale.html
// ============================================================

router.post('/bulk', async (req, res) => {

    const trucks = Array.isArray(req.body)
        ? req.body
        : [];

    if (!trucks.length) {
        return res.json({
            success: true,
            count: 0
        });
    }

    const connection = await pool.promise().getConnection();

    try {

        await connection.beginTransaction();

        const sql = `
            INSERT INTO weighing_trucks
            (
                id,
                number,

                first_weight,
                first_time,
                first_date,
                first_image,

                second_weight,
                second_time,
                second_date,
                second_image,

                net_weight,
                net_calculated,

                images,

                customer,
                type
            )

            VALUES
            (
                ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?,
                ?,
                ?, ?
            )

            ON DUPLICATE KEY UPDATE

                number = VALUES(number),

                first_weight = VALUES(first_weight),
                first_time = VALUES(first_time),
                first_date = VALUES(first_date),
                first_image = VALUES(first_image),

                second_weight = VALUES(second_weight),
                second_time = VALUES(second_time),
                second_date = VALUES(second_date),
                second_image = VALUES(second_image),

                net_weight = VALUES(net_weight),
                net_calculated = VALUES(net_calculated),

                images = VALUES(images),

                customer = VALUES(customer),
                type = VALUES(type)
        `;

        let count = 0;

        for (const truck of trucks) {

            if (!truck || !truck.id || !truck.number) {
                continue;
            }

            await connection.query(sql, [

                String(truck.id),

                truck.number,

                truck.firstWeight ?? 0,
                truck.firstTime ?? null,
                truck.firstDate ?? null,
                truck.firstImage ?? null,

                truck.secondWeight ?? null,
                truck.secondTime ?? null,
                truck.secondDate ?? null,
                truck.secondImage ?? null,

                truck.netWeight ?? null,

                truck.netCalculated ? 1 : 0,

                truck.images ?? null,

                truck.customer ?? '',
                truck.type ?? ''
            ]);

            count++;
        }

        await connection.commit();

        console.log(`✅ تم حفظ ${count} سيارة في MySQL`);

        res.json({
            success: true,
            count
        });

    } catch (error) {

        await connection.rollback();

        console.error(
            '❌ خطأ في حفظ سيارات الميزان:',
            error
        );

        res.status(500).json({
            success: false,
            error: error.message
        });

    } finally {

        connection.release();
    }
});


// ============================================================
// GET
// البحث برقم السيارة
// ============================================================

router.get('/search/number/:number', async (req, res) => {

    const { number } = req.params;

    try {

        const [rows] = await pool.promise().query(
            `
            SELECT *
            FROM weighing_trucks
            WHERE number = ?
            ORDER BY created_at DESC
            `,
            [number]
        );

        res.json(rows.map(formatTruck));

    } catch (error) {

        console.error(
            '❌ خطأ في البحث:',
            error
        );

        res.status(500).json({
            success: false,
            error: 'فشل في البحث'
        });
    }
});


// ============================================================
// GET
// السيارات التي لم تأخذ الوزن الثاني
// ============================================================

router.get('/status/first-weight', async (req, res) => {

    try {

        const [rows] = await pool.promise().query(`
            SELECT *
            FROM weighing_trucks
            WHERE first_weight IS NOT NULL
              AND second_weight IS NULL
            ORDER BY created_at DESC
        `);

        res.json(rows.map(formatTruck));

    } catch (error) {

        console.error(
            '❌ خطأ في جلب سيارات الوزن الأول:',
            error
        );

        res.status(500).json({
            success: false,
            error: 'فشل في جلب البيانات'
        });
    }
});


// ============================================================
// GET
// السيارات المكتملة
// ============================================================

router.get('/status/completed', async (req, res) => {

    try {

        const [rows] = await pool.promise().query(`
            SELECT *
            FROM weighing_trucks
            WHERE net_calculated = 1
            ORDER BY created_at DESC
        `);

        res.json(rows.map(formatTruck));

    } catch (error) {

        console.error(
            '❌ خطأ في جلب السيارات المكتملة:',
            error
        );

        res.status(500).json({
            success: false,
            error: 'فشل في جلب البيانات'
        });
    }
});


// ============================================================
// تصدير Router
// ============================================================

module.exports = router;