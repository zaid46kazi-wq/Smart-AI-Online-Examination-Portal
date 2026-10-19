const path = require('path');
const fs = require('fs');

const envPathParent = path.join(__dirname, '..', '..', '.env');
const envPathBackend = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPathParent)) {
    require('dotenv').config({ path: envPathParent });
} else if (fs.existsSync(envPathBackend)) {
    require('dotenv').config({ path: envPathBackend });
} else {
    require('dotenv').config();
}
const mysql = require('mysql2/promise');

const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'online_exam_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
    connectTimeout: 10000
};

const pool = mysql.createPool(poolConfig);
let isDbConnected = false;

pool.getConnection()
    .then(conn => {
        isDbConnected = true;
        console.log('[DB] ✅ Connected to MySQL 8 Database pool');
        conn.release();
    })
    .catch(err => {
        isDbConnected = false;
        console.warn('[DB] ⚠️ MySQL 8 Connection unavailable (using fallback mode):', err.message);
    });

async function query(sql, params = []) {
    try {
        const [results] = await pool.execute(sql, params);
        isDbConnected = true;
        return results;
    } catch (err) {
        isDbConnected = false;
        throw err;
    }
}

async function queryOne(sql, params = []) {
    try {
        const rows = await query(sql, params);
        return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    } catch (err) {
        console.error('[DB Error in queryOne]:', err.message);
        throw err;
    }
}

module.exports = { pool, query, queryOne, getIsConnected: () => isDbConnected };
