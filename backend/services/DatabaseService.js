// services/DatabaseService.js
const mysql = require('mysql2');

class DatabaseService {
    constructor() {
        this.pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'weighing_system',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }

    query(sql, params, callback) {
        return this.pool.query(sql, params, callback);
    }

    getConnection() {
        return new Promise((resolve, reject) => {
            this.pool.getConnection((err, connection) => {
                if (err) reject(err);
                else resolve(connection);
            });
        });
    }

    async close() {
        return new Promise((resolve) => {
            this.pool.end(resolve);
        });
    }

    // 📊 دوال مساعدة للاستعلامات الشائعة
    async getPrinterData({ limit = 10, offset = 0, search = null, searchType = null } = {}) {
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
            
            this.query(query, params, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
    }

    async updateTicket(id, data) {
        const { number, customer, type, gross, tare, tare2, net, note } = data;
        const sql = 'UPDATE printer SET number=?, customer=?, type=?, gross=?, tare=?, tare2=?, net=?, note=? WHERE id=?';
        
        return new Promise((resolve, reject) => {
            this.query(sql, [number, customer, type, gross, tare, tare2, net, note, id], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    }
}

module.exports = DatabaseService;