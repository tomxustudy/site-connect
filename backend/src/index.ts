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

async function generateBusinessId() {
    try {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = `REC-${today}-`;
        const res = await query("SELECT id FROM records WHERE id LIKE  ORDER BY id DESC LIMIT 1", [`${prefix}%`]);
        let index = 1;
        if (res.rows.length > 0) {
            const lastId = res.rows[0].id;
            const parts = lastId.split('-');
            if (parts.length >= 3) {
                index = parseInt(parts[2]) + 1;
            }
        }
        return `${prefix}${String(index).padStart(3, '0')}`;
    } catch (e) {
        return `REC-${Date.now()}`;
    }
}

app.get('/api/dictionaries', async (req: any, res: any) => {
    try {
        const sites = await query("SELECT DISTINCT site_name FROM records");
        const recorders = await query("SELECT DISTINCT recorder_name FROM records");
        res.json({ success: true, sites: sites.rows.map((r: any) => ({name: r.site_name})), recorders: recorders.rows.map((r: any) => ({name: r.recorder_name})) });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/upload', upload.single('photo'), (req: any, res: any) => {
    res.json({ success: true, url: `http://${req.headers.host}/uploads/${req.file.filename}` });
});

app.post('/api/records', async (req: any, res: any) => {
    try {
        const { type, site_name, tags, description, origin_voice_text, image_url, amount, unit_price, recorder_name } = req.body;
        const businessId = await generateBusinessId();
        const sql = `
            INSERT INTO records 
            (id, type, site_name, tags, description, origin_voice_text, image_url, amount, unit_price, status, recorder_name, server_created_at)
            VALUES (, , , , , , , , , 'pending', 0, NOW())
            RETURNING *;
        `;
        const result = await query(sql, [businessId, type || 'person', site_name, tags, description, origin_voice_text, image_url, amount || 0, unit_price || 0, recorder_name]);
        res.json({ success: true, data: result.rows[0] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/records', async (req: any, res: any) => {
    try {
        const result = await query("SELECT * FROM records ORDER BY server_created_at DESC");
        res.json({ success: true, data: result.rows });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/records/:id/status', async (req: any, res: any) => {
    const { id } = req.params;
    const { status, supplier, amount, unit_price, admin_note } = req.body;
    try {
        const sql = `
            UPDATE records 
            SET status = , supplier = , amount = , unit_price = , admin_note =  
            WHERE id = 
            RETURNING *;
        `;
        const result = await query(sql, [id, status, supplier, amount || 0, unit_price || 0, admin_note]);
        res.json({ success: true, data: result.rows[0] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
