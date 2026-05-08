// services/CustomerService.js

class CustomerService {
    constructor(db) {
        this.db = db;
    }

    /**
     * جلب جميع العملاء
     * @returns {Promise}
     */
    async getAll() {
        return new Promise((resolve, reject) => {
            this.db.query('SELECT * FROM customers ORDER BY name', (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
    }

    /**
     * جلب عميل بالمعرف
     * @param {number} id - معرف العميل
     * @returns {Promise}
     */
    async getById(id) {
        return new Promise((resolve, reject) => {
            this.db.query('SELECT * FROM customers WHERE id = ?', [id], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results[0] || null);
                }
            });
        });
    }

    /**
     * إضافة عميل جديد
     * @param {Object} data - بيانات العميل
     * @returns {Promise}
     */
    async create(data) {
        const { name, phone, address, notes } = data;
        
        if (!name) {
            throw new Error('اسم العميل مطلوب');
        }
        
        return new Promise((resolve, reject) => {
            this.db.query(
                'INSERT INTO customers (name, phone, address, notes) VALUES (?, ?, ?, ?)',
                [name, phone, address, notes],
                (err, result) => {
                    if (err) {
                        if (err.code === 'ER_DUP_ENTRY') {
                            reject(new Error('العميل موجود مسبقاً'));
                        } else {
                            reject(err);
                        }
                    } else {
                        resolve({
                            success: true,
                            id: result.insertId,
                            message: 'تم إضافة العميل بنجاح'
                        });
                    }
                }
            );
        });
    }

    /**
     * تعديل عميل
     * @param {number} id - معرف العميل
     * @param {Object} data - البيانات الجديدة
     * @returns {Promise}
     */
    async update(id, data) {
        const { name, phone, address, notes } = data;
        
        return new Promise((resolve, reject) => {
            this.db.query(
                'UPDATE customers SET name = ?, phone = ?, address = ?, notes = ? WHERE id = ?',
                [name, phone, address, notes, id],
                (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ success: true, message: 'تم تعديل العميل بنجاح' });
                    }
                }
            );
        });
    }

    /**
     * حذف عميل
     * @param {number} id - معرف العميل
     * @returns {Promise}
     */
    async delete(id) {
        return new Promise((resolve, reject) => {
            this.db.query('DELETE FROM customers WHERE id = ?', [id], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, message: 'تم حذف العميل بنجاح' });
                }
            });
        });
    }
}

module.exports = CustomerService;