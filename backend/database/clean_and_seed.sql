-- 清理所有业务数据表并重置种子
TRUNCATE TABLE records, sites, users, tenants RESTART IDENTITY CASCADE;

-- 插入初始超级管理员账号
-- 用户名: admin
-- 密码: admin123 (哈希如下)
INSERT INTO users (name, username, role, password_hash, created_at) 
VALUES (
    '系统管理员', 
    'admin', 
    'SUPER_ADMIN', 
    '$2b$10$JeuJPmUn.wZvPX2MBm/aHucpaPqXRBbM58cYY4QZDfb1LvrpkNpPq', 
    NOW()
);
