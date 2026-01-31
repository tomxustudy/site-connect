process.env.TZ = "Asia/Shanghai";
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from './config/db';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
            }
        }
        return `${prefix}${String(index).padStart(3, '0')}`;
    } catch (e) {
        console.error('ID Gen Error', e);
        return `FATAL-${Date.now()}`;
    }
}

app.get('/api/dictionaries', async (req: any, res: any) => {
    try {
        const sites = await query("SELECT name FROM sites ORDER BY name ASC");
        const recorders = await query("SELECT name FROM users ORDER BY name ASC");
        res.json({ success: true, sites: sites.rows, recorders: recorders.rows });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/sites', async (req: any, res: any) => {
    try {
        const resData = await query("SELECT * FROM sites ORDER BY created_at DESC");
        res.json({ success: true, data: resData.rows });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/sites', async (req: any, res: any) => {
    try {
        const { name } = req.body;
        const result = await query("INSERT INTO sites (name) VALUES ($1) RETURNING *", [name]);
        res.json({ success: true, data: result.rows[0] });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users', async (req: any, res: any) => {
    try {
        const resData = await query("SELECT * FROM users ORDER BY created_at DESC");
        res.json({ success: true, data: resData.rows });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', async (req: any, res: any) => {
    try {
        const { name, phone, authorized_sites } = req.body;
        const result = await query("INSERT INTO users (name, phone, authorized_sites) VALUES ($1, $2, $3) RETURNING *", [name, phone, authorized_sites]);
        res.json({ success: true, data: result.rows[0] });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/upload', upload.single('photo'), (req: any, res: any) => {
    res.json({ success: true, url: `http://${req.headers.host}/uploads/${req.file.filename}` });
});

app.post('/api/records', async (req: any, res: any) => {
    try {
        const { type, site_name, tags, description, origin_voice_text, image_url, images, amount, unit_price, recorder_name } = req.body;
        const businessId = await generateBusinessId(site_name, type);

        let finalImages = images;

        const sql = `
            INSERT INTO records 
            (id, type, site_name, tags, description, origin_voice_text, image_url, images, amount, unit_price, status, recorder_name, server_created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, NOW())
            RETURNING *;
        `;
        const result = await query(sql, [businessId, type || 'person', site_name, tags, description, origin_voice_text, image_url, finalImages, amount || 0, unit_price || 0, recorder_name]);
        res.json({ success: true, data: result.rows[0] });
    } catch (err: any) {
        console.error('Insert error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/records', async (req: any, res: any) => {
    try {
        const result = await query("SELECT * FROM records ORDER BY server_created_at DESC");
        res.json({ success: true, data: result.rows });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.put('/api/records/:id/status', async (req: any, res: any) => {
    const { id } = req.params;
    const { status, supplier, amount, unit_price, admin_note } = req.body;
    try {
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

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
