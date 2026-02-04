const { Pool } = require('pg');

const pool = new Pool({
    user: 'admin',
    host: 'localhost',
    database: 'site_connect',
    password: 'my_secure_password_2026',
    port: 5432,
});

console.log('Clearing records table...');
pool.query('TRUNCATE records', (err, res) => {
    if (err) {
        console.error('Error clearing records:', err);
        process.exit(1);
    }
    console.log('✅ Records cleared successfully.');
    pool.end();
});
