const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || '5432'),
});

const sqlFile = process.argv[2];

if (!sqlFile) {
    console.error('Usage: node run_sql.js <path_to_sql_file>');
    process.exit(1);
}

const sql = fs.readFileSync(sqlFile, 'utf8');

async function run() {
    try {
        await pool.query(sql);
        console.log('✅ SQL executed successfully');
    } catch (err) {
        console.error('❌ Error executing SQL:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
