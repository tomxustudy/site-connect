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
        if (user.role === 'super_admin' && req.headers['x-tenant-id']) {
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
                tenant_id: user.tenant_id,
                needs_password_change: !!user.needs_password_change
            }
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 微信手机号登录接口
app.post('/api/wechat/login', async (req: any, res: any) => {
    const { phoneNumber } = req.body; // 注意：实际生产中这里应该接收 code 并在后端换取手机号

    if (!phoneNumber) {
        return res.status(400).json({ success: false, message: '手机号不能为空' });
    }

    try {
        // 在 users 表中按手机号查找匹配用户
        const result = await query("SELECT * FROM users WHERE phone = $1 LIMIT 1", [phoneNumber]);
        const user = result.rows[0];

        if (user) {
            // 匹配成功
            const token = jwt.sign(
                { uid: user.id, username: user.username, role: user.role, tenant_id: user.tenant_id },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            return res.json({
                success: true,
                isMatched: true,
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    username: user.username,
                    role: user.role,
                    tenant_id: user.tenant_id
                }
            });
        } else {
            // 匹配失败，赋予 guest 角色
            const token = jwt.sign(
                { uid: 0, username: `guest_${phoneNumber}`, role: 'worker', tenant_id: null },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            return res.json({
                success: true,
                isMatched: false,
                token,
                user: {
                    id: 0,
                    name: '访客人员',
                    username: `guest_${phoneNumber}`,
                    role: 'worker',
                    tenant_id: null
                }
            });
        }
    } catch (err: any) {
        console.error("wechat/login error:", err);
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
        await query("UPDATE users SET password_hash = $1, needs_password_change = FALSE WHERE id = $2", [newHash, uid]);

        res.json({ success: true, message: '密码修改成功' });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

import ExcelJS from 'exceljs';
import archiver from 'archiver';

// --- 导出功能 ---

// 导出 Excel 接口
app.get('/api/export/xlsx', authenticateToken, async (req: any, res: any) => {
    try {
        const tenant_id = req.user.tenant_id;
        const isGlobalAdmin = req.user.role === 'super_admin' && !tenant_id;
        const sql = isGlobalAdmin ?
            "SELECT * FROM records ORDER BY server_created_at DESC" :
            "SELECT * FROM records WHERE tenant_id = $1 ORDER BY server_created_at DESC";
        const params = isGlobalAdmin ? [] : [tenant_id];
        const result = await query(sql, params);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('现场记录');

        sheet.columns = [
            { header: 'ID', key: 'id', width: 25 },
            { header: '类型', key: 'type', width: 10 },
            { header: '部门', key: 'site_name', width: 20 },
            { header: '标签', key: 'tags', width: 15 },
            { header: '描述', key: 'description', width: 40 },
            { header: '报工时间', key: 'server_created_at', width: 20 },
            { header: '数量(金额)', key: 'amount', width: 15 },
            { header: '单价', key: 'unit_price', width: 10 },
            { header: '操作员', key: 'recorder_name', width: 15 }
        ];

        result.rows.forEach(row => {
            sheet.addRow({
                ...row,
                tags: Array.isArray(row.tags) ? row.tags.join(',') : row.tags,
                server_created_at: row.server_created_at ? new Date(row.server_created_at).toLocaleString() : ''
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=records_${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 导出照片压缩包接口
app.get('/api/export/photos', authenticateToken, async (req: any, res: any) => {
    console.log('📸 Photo export requested by:', req.user.username);
    try {
        const tenant_id = req.user.tenant_id;
        const isGlobalAdmin = req.user.role === 'super_admin' && !tenant_id;
        const sql = isGlobalAdmin ?
            "SELECT id, images FROM records WHERE images IS NOT NULL AND array_length(images, 1) > 0" :
            "SELECT id, images FROM records WHERE tenant_id = $1 AND images IS NOT NULL AND array_length(images, 1) > 0";
        const params = isGlobalAdmin ? [] : [tenant_id];

        console.log('🔍 Executing SQL:', sql, 'Params:', params);
        const result = await query(sql, params);
        console.log('📊 Found', result.rows.length, 'records with images');

        const archive = archiver('zip', { zlib: { level: 9 } });
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=photos_${Date.now()}.zip`);

        archive.pipe(res);

        const addedFiles = new Set<string>();

        result.rows.forEach(row => {
            console.log(`🖼️ Processing record ${row.id}, images:`, row.images);
            const images = Array.isArray(row.images) ? row.images : (typeof row.images === 'string' ? JSON.parse(row.images || '[]') : []);
            images.forEach((url: string) => {
                const filename = path.basename(url);
                const filePath = path.join(process.cwd(), 'uploads', filename);
                if (fs.existsSync(filePath) && !addedFiles.has(filename)) {
                    console.log('📎 Adding to zip:', filename);
                    archive.file(filePath, { name: filename });
                    addedFiles.add(filename);
                } else {
                    console.warn('⚠️ File missing or duplicate:', filename, 'Path:', filePath);
                }
            });
        });

        console.log('✅ Finalizing archive...');
        await archive.finalize();
        console.log('🎁 Archive sent successfully');
    } catch (err: any) {
        console.error('❌ Photo export error:', err);
        res.status(500).json({ success: false, error: err.message, stack: err.stack });
    }
});


app.get('/api/dictionaries', authenticateToken, async (req: any, res: any) => {
    try {
        const tenant_id = req.user.tenant_id;
        // 如果是超级管理员且没有指定租户，可能需要看全部或特定逻辑
        const isGlobalAdmin = req.user.role === 'super_admin' && !tenant_id;
        const siteSql = isGlobalAdmin ? "SELECT name FROM sites ORDER BY name ASC" : "SELECT name FROM sites WHERE tenant_id = $1 ORDER BY name ASC";
        const userSql = isGlobalAdmin ? "SELECT name FROM users ORDER BY name ASC" : "SELECT name FROM users WHERE tenant_id = $1 ORDER BY name ASC";

        const siteParams = isGlobalAdmin ? [] : [tenant_id];
        const userParams = isGlobalAdmin ? [] : [tenant_id];

        const sites = await query(siteSql, siteParams);
        const recorders = await query(userSql, userParams);
        res.json({ success: true, sites: sites.rows, recorders: recorders.rows });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/sites', authenticateToken, async (req: any, res: any) => {
    try {
        const tenant_id = req.user.tenant_id;
        const isGlobalAdmin = req.user.role === 'super_admin' && !tenant_id;
        const sql = isGlobalAdmin ? "SELECT * FROM sites ORDER BY created_at DESC" : "SELECT * FROM sites WHERE tenant_id = $1 ORDER BY created_at DESC";
        const params = isGlobalAdmin ? [] : [tenant_id];
        const resData = await query(sql, params);
        res.json({ success: true, data: resData.rows });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/sites', authenticateToken, checkRole(['super_admin', 'clerk']), async (req: any, res: any) => {
    try {
        const { name, tenant_id_target } = req.body;
        // 超管可以为指定租户创建工地，文员只能为自己公司创建
        let final_tenant_id = req.user.tenant_id;
        if (req.user.role === 'super_admin' && tenant_id_target) {
            final_tenant_id = tenant_id_target;
        }

        if (!final_tenant_id) {
            return res.status(400).json({ success: false, message: '必须指定租户' });
        }

        const result = await query("INSERT INTO sites (name, tenant_id, created_at) VALUES ($1, $2, NOW()) RETURNING *", [name, final_tenant_id]);
        res.json({ success: true, data: result.rows[0] });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/users', authenticateToken, checkRole(['super_admin', 'clerk']), async (req: any, res: any) => {
    try {
        const tenant_id = req.user.tenant_id;
        const isGlobalAdmin = req.user.role === 'super_admin' && !tenant_id;
        const sql = isGlobalAdmin ? "SELECT * FROM users ORDER BY created_at DESC" : "SELECT * FROM users WHERE tenant_id = $1 ORDER BY created_at DESC";
        const params = isGlobalAdmin ? [] : [tenant_id];
        const resData = await query(sql, params);
        res.json({ success: true, data: resData.rows });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/users', authenticateToken, checkRole(['super_admin', 'clerk']), async (req: any, res: any) => {
    try {
        const { username, password, name, role, phone, tenant_id_target } = req.body;

        // 1. 角色解析
        const dbRole = role || 'worker';

        // 2. 权限校验 & tenant_id 确定
        let final_tenant_id = req.user.tenant_id;
        if (req.user.role === 'super_admin') {
            final_tenant_id = tenant_id_target || null;
        }

        // 3. 验证规则
        // 3a. 文员和现场人员必须绑定客户
        if ((dbRole === 'clerk' || dbRole === 'worker') && !final_tenant_id) {
            return res.status(400).json({ success: false, message: '必须选择所属客户' });
        }
        // 3b. 现场人员手机号必填
        if (dbRole === 'worker' && !phone) {
            return res.status(400).json({ success: false, message: '现场人员手机号为必填项' });
        }

        // 4. 密码加密 (默认 8888)
        const password_hash = await bcrypt.hash(password || '8888', 10);

        // 5. 查重
        const existing = await query("SELECT id FROM users WHERE username = $1", [username]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, message: '用户名已存在' });
        }

        const sql = `
            INSERT INTO users (username, password_hash, name, role, phone, tenant_id, needs_password_change, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())
            RETURNING id, username, name, role, tenant_id, needs_password_change;
        `;
        const result = await query(sql, [username, password_hash, name, dbRole, phone || null, final_tenant_id]);
        res.json({ success: true, data: result.rows[0] });
    } catch (err: any) {
        console.error('创建用户失败:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/users/:id', authenticateToken, checkRole(['super_admin', 'clerk']), async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { username, password, name, role, phone, tenant_id_target } = req.body;

        const userRes = await query("SELECT * FROM users WHERE id = $1", [id]);
        if (userRes.rows.length === 0) return res.status(404).json({ success: false, message: '用户不存在' });
        const oldUser = userRes.rows[0];

        if (req.user.role !== 'super_admin' && oldUser.tenant_id !== req.user.tenant_id) {
            return res.status(403).json({ success: false, message: '无权修改其他租户的用户' });
        }

        let finalRole = role || oldUser.role;

        let finalTenantId = oldUser.tenant_id;
        if (req.user.role === 'super_admin' && tenant_id_target !== undefined) {
            finalTenantId = tenant_id_target || null;
        }

        let passwordHash = oldUser.password_hash;
        let needsPasswordChange = oldUser.needs_password_change;
        if (password) {
            passwordHash = await bcrypt.hash(password, 10);
            needsPasswordChange = true;
        }

        const sql = `
            UPDATE users SET username = $1, password_hash = $2, name = $3, role = $4, phone = $5, tenant_id = $6, needs_password_change = $7
            WHERE id = $8 RETURNING id, username, name, role, tenant_id, needs_password_change;
        `;
        const result = await query(sql, [
            username || oldUser.username,
            passwordHash,
            name || oldUser.name,
            finalRole,
            phone !== undefined ? phone : oldUser.phone,
            finalTenantId,
            needsPasswordChange,
            id
        ]);
        res.json({ success: true, data: result.rows[0] });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/users/:id', authenticateToken, checkRole(['super_admin', 'clerk']), async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const userRes = await query("SELECT * FROM users WHERE id = $1", [id]);
        if (userRes.rows.length === 0) return res.status(404).json({ success: false, message: '用户不存在' });
        if (req.user.role !== 'super_admin' && userRes.rows[0].tenant_id !== req.user.tenant_id) {
            return res.status(403).json({ success: false, message: '无权删除此用户' });
        }
        await query("DELETE FROM users WHERE id = $1", [id]);
        res.json({ success: true, message: '用户已删除' });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// --- 租户管理 (仅超管) ---

app.get('/api/admin/tenants', authenticateToken, checkRole(['super_admin']), async (req: any, res: any) => {
    try {
        const result = await query("SELECT * FROM tenants ORDER BY id ASC");
        res.json({ success: true, data: result.rows });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/admin/tenants', authenticateToken, checkRole(['super_admin']), async (req: any, res: any) => {
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
        const isGlobalAdmin = req.user.role === 'super_admin' && !tenant_id;
        const sql = isGlobalAdmin ? "SELECT * FROM records ORDER BY server_created_at DESC" : "SELECT * FROM records WHERE tenant_id = $1 ORDER BY server_created_at DESC";
        const params = isGlobalAdmin ? [] : [tenant_id];
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

        if (req.user.role !== 'super_admin' && currentRecord.rows[0].tenant_id !== req.user.tenant_id) {
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
