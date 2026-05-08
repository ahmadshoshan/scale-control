// services/TypeService.js

class TypeService {
    constructor(db) {
        this.db = db;
    }

    /**
     * جلب جميع الأنواع
     * @returns {Promise}
     */
    async getAll() {
        return new Promise((resolve, reject) => {
            this.db.query('SELECT * FROM types ORDER BY name', (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
    }

    /**
     * جلب نوع بالمعرف
     * @param {number} id - معرف النوع
     * @returns {Promise}
     */
    async getById(id) {
        return new Promise((resolve, reject) => {
            this.db.query('SELECT * FROM types WHERE id = ?', [id], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results[0] || null);
                }
            });
        });
    }

    /**
     * إضافة نوع جديد
     * @param {Object} data - بيانات النوع
     * @returns {Promise}
     */
    async create(data) {
        const { name, unit_weight, notes } = data;
        
        if (!name) {
            throw new Error('اسم النوع مطلوب');
        }
        
        return new Promise((resolve, reject) => {
            this.db.query(
                'INSERT INTO types (name, unit_weight, notes) VALUES (?, ?, ?)',
                [name, unit_weight, notes],
                (err, result) => {
                    if (err) {
                        if (err.code === 'ER_DUP_ENTRY') {
                            reject(new Error('النوع موجود مسبقاً'));
                        } else {
                            reject(err);
                        }
                    } else {
                        resolve({
                            success: true,
                            id: result.insertId,
                            message: 'تم إضافة النوع بنجاح'
                        });
                    }
                }
            );
        });
    }

    /**
     * تعديل نوع
     * @param {number} id - معرف النوع
     * @param {Object} data - البيانات الجديدة
     * @returns {Promise}
     */
    async update(id, data) {
        const { name, unit_weight, notes } = data;
        
        return new Promise((resolve, reject) => {
            this.db.query(
                'UPDATE types SET name = ?, unit_weight = ?, notes = ? WHERE id = ?',
                [name, unit_weight, notes, id],
                (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ success: true, message: 'تم تعديل النوع بنجاح' });
                    }
                }
            );
        });
    }

    /**
     * حذف نوع
     * @param {number} id - معرف النوع
     * @returns {Promise}
     */
    async delete(id) {
        return new Promise((resolve, reject) => {
            this.db.query('DELETE FROM types WHERE id = ?', [id], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, message: 'تم حذف النوع بنجاح' });
                }
            });
        });
    }
}

module.exports = TypeService;