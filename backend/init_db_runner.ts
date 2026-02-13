import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
    // 1. Connect to default DB to create factory_db
    const client = new Client({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: 'postgres', // Connect to default postgres DB first
        password: process.env.DB_PASS,
        port: parseInt(process.env.DB_PORT || '5432'),
        ssl: { rejectUnauthorized: false }, // Enable SSL for remote cloud DB
        connectionTimeoutMillis: 10000,
    });

    try {
        await client.connect();
        console.log('✅ Connected to postgres DB');

        // Check if factory_db exists
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'factory_db'");
        if (res.rowCount === 0) {
            console.log('Creating factory_db...');
            await client.query('CREATE DATABASE factory_db');
            console.log('✅ factory_db created');
        } else {
            console.log('ℹ️ factory_db already exists');
        }
        await client.end();

        // 2. Connect to factory_db and apply schema
        const factoryClient = new Client({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: 'factory_db',
            password: process.env.DB_PASS,
            port: parseInt(process.env.DB_PORT || '5432'),
            ssl: { rejectUnauthorized: false }, // Enable SSL for remote cloud DB
            connectionTimeoutMillis: 10000,
        });

        await factoryClient.connect();
        console.log('✅ Connected to factory_db');

        const sqlPath = path.join(__dirname, 'database', 'init_factory_db.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await factoryClient.query(sql);
        console.log('✅ Schema and Seed data applied successfully');
        await factoryClient.end();

    } catch (err) {
        console.error('❌ DB Init Error:', err);
        process.exit(1);
    }
}

run();
