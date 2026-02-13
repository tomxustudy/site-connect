import { query } from './src/config/db';

async function maintenance() {
    try {
        console.log('--- 开始项目维护任务 ---');

        // 1. 数据库结构迁移
        console.log('1. 正在尝试添加 needs_password_change 字段...');
        await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS needs_password_change BOOLEAN DEFAULT TRUE;");
        console.log('✅ 字段迁移完成');

        // 2. 数据清理 (Tom 的请求)
        console.log('2. 正在清理数据...');

        // 删除所有记录 (防止外键约束)
        console.log('   - 正在清理记录数据...');
        await query("DELETE FROM records;");

        // 删除所有工地 (防止外键约束)
        console.log('   - 正在清理工地数据...');
        await query("DELETE FROM sites;");

        // 删除除 admin 外的所有用户
        console.log('   - 正在清理历史用户 (保留 admin)...');
        await query("DELETE FROM users WHERE username != 'admin';");

        // 确保 admin 用户的角色是 super_admin (小写)
        console.log('   - 正在确保 admin 角色为 super_admin...');
        await query("UPDATE users SET role = 'super_admin', tenant_id = NULL WHERE username = 'admin';");

        // 删除所有租户 (客户)
        console.log('   - 正在清理所有客户...');
        await query("DELETE FROM tenants;");

        console.log('✅ 数据清理成功！');
        console.log('--- 维护任务全部完成 ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ 维护过程中发生错误:', err);
        process.exit(1);
    }
}

maintenance();
