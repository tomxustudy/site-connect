import { query } from './src/config/db';

async function migrate() {
    try {
        console.log('正在添加 needs_password_change 字段...');
        await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS needs_password_change BOOLEAN DEFAULT TRUE;");
        console.log('✅ 字段添加成功');
        process.exit(0);
    } catch (err) {
        console.error('❌ 迁移失败:', err);
        process.exit(1);
    }
}

migrate();
