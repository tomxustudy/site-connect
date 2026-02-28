import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// 创建数据库连接池
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || '5432'),
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20,
});

// 设置语句超时 (10秒)
pool.on('connect', (client) => {
  client.query("SET statement_timeout = '10s'");
});

// 测试连接
pool.on('connect', () => {
  console.log('✅ 数据库连接成功');
});

pool.on('error', (err) => {
  console.error('❌ 数据库连接错误:', err);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);