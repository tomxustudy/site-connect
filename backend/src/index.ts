process.env.TZ = "Asia/Shanghai";
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from './config/db';
import { transcribeAudio } from './services/asr';

const JWT_SECRET = process.env.JWT_SECRET || 'site-connect-secret-key-2026';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 全局错误捕获，防止语音识别等异步任务崩溃导致服务死机
process.on('uncaughtException', (err) => {
    console.error('🔥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason);
});

// 全局请求日志
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 身份验证中间件
const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ success: false, message: '未授权访问' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ success: false, message: '会话过期，请重新登录' });

        // 支持超管通过 Header 切换租户上下文
        if (user.role === 'SUPER_ADMIN' && req.headers['x-tenant-id']) {
            user.tenant_id = parseInt(req.headers['x-tenant-id'] as string);
        }

        req.user = user;
        next();
    });
};

// 角色检查中间件
const checkRole = (roles: string[]) => {
    return (req: any, res: any, next: any) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: '权限不足' });
        }
        next();
    };
};

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../public')));

const uploadDir = path.join(__dirname, '../uploads');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

function getSiteCode(name: string) {
    if (name.includes('万科')) return 'WK';
    if (name.includes('碧桂园')) return 'BGY';
    if (name.includes('恒大')) return 'HD';
    if (name.includes('保利')) return 'BL';
    if (name.includes('华润')) return 'HR';
    return 'XM' + (name.charCodeAt(0) % 99);
}

function getTypeCode(type: string) {
    if (type === 'material') return 'MAT';
    if (type === 'person') return 'PER';
    if (type === 'expense') return 'EXP';
    return 'OTH';
}

async function generateBusinessId(siteName: string, recordType: string) {
    try {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const siteCode = getSiteCode(siteName);
        const typeCode = getTypeCode(recordType);
        const prefix = `${today}-${siteCode}-${typeCode}-`;

        const res = await query("SELECT id FROM records WHERE id LIKE $1 ORDER BY id DESC LIMIT 1", [`${prefix}%`]);

        let index = 1;
        if (res.rows.length > 0) {
            const lastId = res.rows[0].id;
            const parts = lastId.split('-');
            if (parts.length > 0) {
                const lastNum = parseInt(parts[parts.length - 1]);
                if (!isNaN(lastNum)) {
                    index = lastNum + 1;
                }
            }
        }
        return `${prefix}${String(index).padStart(3, '0')}`;
    } catch (e) {
        console.error('ID Gen Error', e);
        return `FATAL-${Date.now()}`;
    }
}

// --- 认证接口 ---

app.post('/api/login', async (req: any, res: any) => {
    const { username, password } = req.body;
    try {
        const result = await query("SELECT * FROM users WHERE username = $1", [username]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ success: false, message: '用户名或密码错误' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: '用户名或密码错误' });
        }

        const token = jwt.sign(
            { uid: user.id, username: user.username, role: user.role, tenant_id: user.tenant_id },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                role: user.role,
                tenant_id: user.tenant_id
            }
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/user/change-password', authenticateToken, async (req: any, res: any) => {
    const { oldPassword, newPassword } = req.body;
    const uid = req.user.uid;

    try {
        const result = await query("SELECT password_hash FROM users WHERE id = $1", [uid]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        const validPassword = await bcrypt.compare(oldPassword, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ success: false, message: '旧密码错误' });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, uid]);

        res.json({ success: true, message: '密码修改成功' });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- 数据库重置 (临时) ---
// 注意：此接口仅供 Tom 在部署后运行一次，之后应删除或禁用
app.post('/api/admin/reset-database-secure-2026', authenticateToken, checkRole(['SUPER_ADMIN']), async (req: any, res: any) => {
    try {
        const sql = fs.readFileSync(path.join(__dirname, '../database/clean_and_seed.sql'), 'utf8');
        await query(sql);
        res.json({ success: true, message: '数据库已重置，请使用新密码重新登录' });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/dictionaries', authenticateToken, async (req: any, res: any) => {
    try {
        const tenant_id = req.user.tenant_id;
        // 如果是超级管理员且没有指定租户，可能需要看全部或特定逻辑
        const siteSql = req.user.role === 'SUPER_ADMIN' ? "SELECT name FROM sites ORDER BY name ASC" : "SELECT name FROM sites WHERE tenant_id = $1 ORDER BY name ASC";
        const userSql = req.user.role === 'SUPER_ADMIN' ? "SELECT name FROM users ORDER BY name ASC" : "SELECT name FROM users WHERE tenant_id = $1 ORDER BY name ASC";

        const siteParams = req.user.role === 'SUPER_ADMIN' ? [] : [tenant_id];
        const userParams = req.user.role === 'SUPER_ADMIN' ? [] : [tenant_id];

        const sites = await query(siteSql, siteParams);
        const recorders = await query(userSql, userParams);
        res.json({ success: true, sites: sites.rows, recorders: recorders.rows });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/sites', authenticateToken, async (req: any, res: any) => {
    try {
        const tenant_id = req.user.tenant_id;
        const sql = req.user.role === 'SUPER_ADMIN' ? "SELECT * FROM sites ORDER BY created_at DESC" : "SELECT * FROM sites WHERE tenant_id = $1 ORDER BY created_at DESC";
        const params = req.user.role === 'SUPER_ADMIN' ? [] : [tenant_id];
        const resData = await query(sql, params);
        res.json({ success: true, data: resData.rows });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/sites', authenticateToken, checkRole(['SUPER_ADMIN', 'CLIENT_CLERK']), async (req: any, res: any) => {
    try {
        const { name, tenant_id_target } = req.body;
        // 超管可以为指定租户创建工地，文员只能为自己公司创建
        let final_tenant_id = req.user.tenant_id;
        if (req.user.role === 'SUPER_ADMIN' && tenant_id_target) {
            final_tenant_id = tenant_id_target;
        }

        if (!final_tenant_id) {
            return res.status(400).json({ success: false, message: '必须指定租户' });
        }

        const result = await query("INSERT INTO sites (name, tenant_id, created_at) VALUES ($1, $2, NOW()) RETURNING *", [name, final_tenant_id]);
        res.json({ success: true, data: result.rows[0] });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/users', authenticateToken, checkRole(['SUPER_ADMIN', 'CLIENT_CLERK']), async (req: any, res: any) => {
    try {
        const tenant_id = req.user.tenant_id;
        const sql = req.user.role === 'SUPER_ADMIN' ? "SELECT * FROM users ORDER BY created_at DESC" : "SELECT * FROM users WHERE tenant_id = $1 ORDER BY created_at DESC";
        const params = req.user.role === 'SUPER_ADMIN' ? [] : [tenant_id];
        const resData = await query(sql, params);
        res.json({ success: true, data: resData.rows });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/users', authenticateToken, checkRole(['SUPER_ADMIN', 'CLIENT_CLERK']), async (req: any, res: any) => {
    try {
        const { username, password, name, role, phone, tenant_id_target } = req.body;

        // 1. 权限校验
        let final_tenant_id = req.user.tenant_id;
        if (req.user.role === 'SUPER_ADMIN') {
            final_tenant_id = tenant_id_target || null;
        }

        // 2. 密码加密
        const password_hash = await bcrypt.hash(password || '123456', 10);

        // 3. 查重
        const existing = await query("SELECT id FROM users WHERE username = $1", [username]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, message: '用户名已存在' });
        }

        const sql = `
            INSERT INTO users (username, password_hash, name, role, phone, tenant_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING id, username, name, role, tenant_id;
        `;
        const result = await query(sql, [username, password_hash, name, role || 'WORKER', phone, final_tenant_id]);
        res.json({ success: true, data: result.rows[0] });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// --- 租户管理 (仅超管) ---

app.get('/api/admin/tenants', authenticateToken, checkRole(['SUPER_ADMIN']), async (req: any, res: any) => {
    try {
        const result = await query("SELECT * FROM tenants ORDER BY id ASC");
        res.json({ success: true, data: result.rows });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/admin/tenants', authenticateToken, checkRole(['SUPER_ADMIN']), async (req: any, res: any) => {
    try {
        const { name } = req.body;
        const result = await query("INSERT INTO tenants (name, created_at) VALUES ($1, NOW()) RETURNING *", [name]);
        res.json({ success: true, data: result.rows[0] });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/upload', upload.single('photo'), (req: any, res: any) => {
    res.json({ success: true, url: `http://${req.headers.host}/uploads/${req.file.filename}` });
});

// 语音识别接口
app.post('/api/asr', upload.single('voice'), async (req: any, res: any) => {
    try {
        console.log('--- ASR Request Started ---');
        console.log('Headers:', JSON.stringify(req.headers));

        if (!req.file) {
            console.error('❌ No file in request');
            return res.status(400).json({ success: false, message: '没有上传音频文件' });
        }

        console.log('🎤 File info:', {
            filename: req.file.filename,
            size: req.file.size,
            path: req.file.path,
            mimetype: req.file.mimetype
        });

        const text = await transcribeAudio(req.file.path);
        console.log('✅ Recognition Result:', text);

        res.json({
            success: true,
            text: text
        });
    } catch (err: any) {
        console.error('❌ ASR Error Detail:', err);
        res.status(500).json({
            success: false,
            error: err.message,
            stack: err.stack
        });
    } finally {
        console.log('--- ASR Request Finished ---');
    }
});

app.post('/api/records', authenticateToken, async (req: any, res: any) => {
    try {
        const tenant_id = req.user.tenant_id;
        const { type, site_name, tags, description, origin_voice_text, image_url, images, amount, unit_price, recorder_name } = req.body;
        const businessId = await generateBusinessId(site_name, type);

        let finalImages = images;

        const sql = `
            INSERT INTO records 
            (id, type, site_name, tags, description, origin_voice_text, image_url, images, amount, unit_price, status, recorder_name, server_created_at, tenant_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, NOW(), $12)
            RETURNING *;
        `;
        const result = await query(sql, [businessId, type || 'person', site_name, tags, description, origin_voice_text, image_url, finalImages, amount || 0, unit_price || 0, recorder_name, tenant_id]);
        res.json({ success: true, data: result.rows[0] });
    } catch (err: any) {
        console.error('Insert error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/records', authenticateToken, async (req: any, res: any) => {
    try {
        const tenant_id = req.user.tenant_id;
        const sql = req.user.role === 'SUPER_ADMIN' ? "SELECT * FROM records ORDER BY server_created_at DESC" : "SELECT * FROM records WHERE tenant_id = $1 ORDER BY server_created_at DESC";
        const params = req.user.role === 'SUPER_ADMIN' ? [] : [tenant_id];
        const result = await query(sql, params);
        res.json({ success: true, data: result.rows });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.put('/api/records/:id/status', authenticateToken, async (req: any, res: any) => {
    const { id } = req.params;
    const { status, supplier, amount, unit_price, admin_note } = req.body;
    try {
        // 先检查是否有权限操作这条记录
        const currentRecord = await query("SELECT tenant_id FROM records WHERE id = $1", [id]);
        if (currentRecord.rows.length === 0) return res.status(404).json({ success: false, message: '记录不存在' });

        if (req.user.role !== 'SUPER_ADMIN' && currentRecord.rows[0].tenant_id !== req.user.tenant_id) {
            return res.status(403).json({ success: false, message: '权限不足' });
        }

        const sql = `
            UPDATE records 
            SET status = $2, supplier = $3, amount = $4, unit_price = $5, admin_note = $6 
            WHERE id = $1 
            RETURNING *;
        `;
        const result = await query(sql, [id, status, supplier, amount || 0, unit_price || 0, admin_note]);
        res.json({ success: true, data: result.rows[0] });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Express 5 中不再支持 * 或 /* 作为路径。
// 前端 SPA 应直接访问根路径 /，由 public/index.html 静态文件提供服务。


app.listen(Number(PORT), '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT} (0.0.0.0)`));
