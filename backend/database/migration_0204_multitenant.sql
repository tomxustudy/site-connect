-- 1. 创建租户表
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- active, disabled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 修改用户表以支持多租户和角色
-- 假设现有用户归属于第一个创建的租户（或默认租户）
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'CLIENT_CLERK'; -- SUPER_ADMIN, CLIENT_CLERK, WORKER
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- 3. 修改工地表
ALTER TABLE sites ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);

-- 4. 修改记录表
ALTER TABLE records ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);

-- 5. 初始化第一个租户（演示用）
INSERT INTO tenants (name) VALUES ('默认演示客户') ON CONFLICT DO NOTHING;

-- 6. 将现有数据关联到默认租户
UPDATE users SET tenant_id = (SELECT id FROM tenants LIMIT 1) WHERE tenant_id IS NULL;
UPDATE sites SET tenant_id = (SELECT id FROM tenants LIMIT 1) WHERE tenant_id IS NULL;
UPDATE records SET tenant_id = (SELECT id FROM tenants LIMIT 1) WHERE tenant_id IS NULL;

-- 7. 设置一个超级管理员（用于测试）
-- 注意：超级管理员的 tenant_id 可以为 null，代表跨租户权限
INSERT INTO users (name, username, role, password_hash) 
VALUES ('超级管理员', 'admin', 'SUPER_ADMIN', '$2b$10$YourHashedPasswordHere') -- 这里之后需要通过脚本生成真实哈希
ON CONFLICT (username) DO NOTHING;
