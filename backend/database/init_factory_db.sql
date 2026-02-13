-- Factory Tool Database Initialization
-- Based on site-connect schema but with Factory terminology in seed data

-- 1. Tenants (Factories/Departments)
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users (Operators/Admins)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255),
    name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'worker', -- super_admin, clerk (statistician), worker
    phone VARCHAR(20),
    tenant_id INTEGER REFERENCES tenants(id),
    needs_password_change BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Departments (Sites)
-- Renamed concept 'Site' -> 'Department' in logic, but keeping table name 'sites' for compatibility
CREATE TABLE IF NOT EXISTS sites (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tenant_id INTEGER REFERENCES tenants(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Records (Production Logs)
CREATE TABLE IF NOT EXISTS records (
    id VARCHAR(50) PRIMARY KEY, -- Business ID
    type VARCHAR(20), -- person, material, expense
    site_name VARCHAR(255), -- Department Name
    tags VARCHAR(255)[], -- Process/Action tags
    description TEXT,
    origin_voice_text TEXT,
    image_url TEXT, -- legacy field
    images TEXT[], -- JSON array of URLs
    amount DECIMAL(10, 2) DEFAULT 0,
    unit_price DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    recorder_name VARCHAR(100),
    server_created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id INTEGER REFERENCES tenants(id),
    supplier VARCHAR(255),
    admin_note TEXT
);

-- SEED DATA
-- Default Tenant
INSERT INTO tenants (name) VALUES ('第一工厂') ON CONFLICT DO NOTHING;

-- Initial Factory Admin
-- Username: admin / Password: admin123 (hashed)
INSERT INTO users (name, username, role, password_hash, created_at) 
VALUES (
    '系统管理员', 
    'admin', 
    'super_admin', 
    '$2b$10$JeuJPmUn.wZvPX2MBm/aHucpaPqXRBbM58cYY4QZDfb1LvrpkNpPq', 
    NOW()
) ON CONFLICT (username) DO NOTHING;

-- Sample Departments
INSERT INTO sites (name, tenant_id) VALUES 
('一车间', 1),
('二车间', 1),
('包装组', 1),
('仓库', 1);
