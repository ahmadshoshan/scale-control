// services/TicketService.js
const { convertNumbers } = require('../utils/helpers');

class TicketService {
    constructor(db) {
        this.db = db;
    }

    /**
     * إنشاء تذكرة جديدة
     * @param {Object} data - بيانات التذكرة
     * @returns {Promise}
     */
    async createTicket(data) {
        const { date, time, sn, number, gross, tare, net, type, customer, note, images } = data;
        
        const query = `
            INSERT INTO printer 
            (date, time, sn, number, gross, tare, net, type, customer, note, images) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        return new Promise((resolve, reject) => {
            this.db.query(query, [date, time, sn, number, gross, tare, net, type, customer, note, images], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: results.insertId,
                        date, time, sn, number, gross, tare, net, type, customer, note, images
                    });
                }
            });
        });
    }

    /**
     * تحديث تذكرة موجودة
     * @param {number} id - معرف التذكرة
     * @param {Object} data - البيانات الجديدة
     * @returns {Promise}
     */
    async updateTicket(id, data) {
        const { number, customer, type, gross, tare, tare2, net, note, extraWeightsTable } = data;
        
        let _tare2 = tare2;
        let extraData = '';
        
        if (extraWeightsTable) {
            let extra = extraWeightsTable;
            if (typeof extra === "string") {
                extra = JSON.parse(extra);
            }
            _tare2 = extra.thirdWeight;
            extraData = `الفارغ :${convertNumbers(extra.thirdWeight)}\n ${extra.extraEditType} :${convertNumbers(extra.finalNetWeight)}\nالاجمالي :${convertNumbers(extra.totalNetWeight)}`;
        }
        
        const sql = 'UPDATE printer SET number=?, customer=?, type=?, gross=?, tare=?, tare2=?, net=?, note=? WHERE id=?';
        
        return new Promise((resolve, reject) => {
            this.db.query(sql, [number, customer, type, gross, tare, _tare2, net, note, id], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, affectedRows: result.affectedRows });
                }
            });
        });
    }

    /**
     * جلب تذكرة بالمعرف
     * @param {number} id - معرف التذكرة
     * @returns {Promise}
     */
    async getTicketById(id) {
        return new Promise((resolve, reject) => {
            this.db.query('SELECT * FROM printer WHERE id = ?', [id], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results[0] || null);
                }
            });
        });
    }

    /**
     * جلب قائمة التذاكر
     * @param {Object} options - خيارات البحث
     * @returns {Promise}
     */
    async getTickets({ limit = 10, offset = 0, search = null, searchType = null } = {}) {
        return new Promise((resolve, reject) => {
            let query, params;
            
            if (search && searchType) {
                const field = ['number', 'sn', 'date'].includes(searchType) ? searchType : 'number';
                query = `SELECT * FROM printer WHERE ${field} = ? ORDER BY id DESC LIMIT ?, ?`;
                params = [search, offset, limit];
            } else {
                query = 'SELECT * FROM printer ORDER BY id DESC LIMIT ? OFFSET ?';
                params = [limit, offset];
            }
            
            this.db.query(query, params, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
    }

    /**
     * حذف تذكرة
     * @param {number} id - معرف التذكرة
     * @returns {Promise}
     */
    async deleteTicket(id) {
        return new Promise((resolve, reject) => {
            this.db.query('DELETE FROM printer WHERE id = ?', [id], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, affectedRows: result.affectedRows });
                }
            });
        });
    }

    /**
     * التحقق من حالة الطباعة
     * @returns {Promise<boolean>}
     */
    async getPrintStatus() {
        return new Promise((resolve, reject) => {
            this.db.query("SELECT print FROM control WHERE id = 1", (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows[0]?.print === 1);
                }
            });
        });
    }

    /**
     * تحديث حالة الطباعة
     * @param {number} status - الحالة (0 أو 1)
     * @returns {Promise}
     */
    async setPrintStatus(status) {
        return new Promise((resolve, reject) => {
            this.db.query("UPDATE control SET print = ? WHERE id = 1", [status], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, status });
                }
            });
        });
    }
}

module.exports = TicketService;