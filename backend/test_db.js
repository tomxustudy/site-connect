const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: {
        rejectUnauthorized: false
    }
});

async function test() {
    try {
        const res = await pool.query('SELECT NOW()');
        console.log('✅ Connection successful with SSL:', res.rows[0]);
    } catch (err) {
        console.error('❌ Connection failed with SSL:', err);
    } finally {
        await pool.end();
    }
}

test();
