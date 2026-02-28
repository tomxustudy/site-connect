import { query } from '../src/config/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import http from 'http';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod';

async function generateTestData() {
    console.log('🚀 Starting test data generation...');

    try {
        // 1. 获取或创建有效的 tenant_id
        let tenantRes = await query("SELECT id FROM tenants LIMIT 1");
        let tenant_id;
        if (tenantRes.rows.length === 0) {
            console.log('🏢 Creating test tenant...');
            const newTenant = await query("INSERT INTO tenants (name, created_at) VALUES ($1, NOW()) RETURNING id", ['测试自动化租户']);
            tenant_id = newTenant.rows[0].id;
        } else {
            tenant_id = tenantRes.rows[0].id;
        }

        const userRes = await query("SELECT username FROM users WHERE username = 'admin' LIMIT 1");
        const recorder_name = userRes.rows[0]?.username || 'admin';

        // 2. 获取或创建测试工地
        let site_name = '测试自动化工地';
        const siteCheck = await query("SELECT name FROM sites WHERE name = $1 AND tenant_id = $2", [site_name, tenant_id]);
        if (siteCheck.rows.length === 0) {
            await query("INSERT INTO sites (name, tenant_id, created_at) VALUES ($1, $2, NOW())", [site_name, tenant_id]);
        }

        // 3. 模拟大量记录
        const recordCount = 20;
        console.log(`📝 Generating ${recordCount} records for tenant ${tenant_id}...`);

        for (let i = 1; i <= recordCount; i++) {
            const type = i % 2 === 0 ? 'material' : 'person';
            const businessId = `TEST-${Date.now()}-${type.toUpperCase()}-${String(i).padStart(3, '0')}`;

            // 模拟 1-2 张图片 (使用云端存在的真实文件)
            const imageCount = (i % 2) + 1;
            const images = [];
            const realImages = ['1769674369363-299955768.png', '1769760585903-290971707.png'];
            for (let j = 0; j < imageCount; j++) {
                images.push(`http://175.178.10.70:3000/uploads/${realImages[j]}`);
            }

            const sql = `
                INSERT INTO records 
                (id, type, site_name, tags, description, images, status, recorder_name, server_created_at, tenant_id, amount, unit_price)
                VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, NOW() - interval '${i} hours', $8, $9, $10)
            `;

            await query(sql, [
                businessId,
                type,
                site_name,
                ['自动生成', type === 'material' ? '进场' : '打卡'],
                `这是自动生成的第 ${i} 条测试记录，包含 ${imageCount} 张图片。`,
                images,
                recorder_name,
                tenant_id,
                Math.floor(Math.random() * 1000),
                Math.floor(Math.random() * 100)
            ]);
        }

        // 3.5 数据库数据检查 (调试)
        console.log('🧐 Searching for problematic image records...');
        const allRecords = await query("SELECT id, images FROM records WHERE images IS NOT NULL");
        allRecords.rows.forEach(r => {
            if (!Array.isArray(r.images)) {
                console.log(`❌ Problematic row! ID: ${r.id}, Type: ${typeof r.images}, Value: ${JSON.stringify(r.images)}`);
            }
        });

        console.log('✅ Test data generation completed successfully.');

        // 4. 发起导出请求验证
        console.log('🔍 Starting export verification...');
        const token = jwt.sign(
            { uid: 1, username: 'admin', role: 'super_admin', tenant_id: null },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        const exportDir = path.join(__dirname, '../temp_exports');
        if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

        const download = (url: string, dest: string, token: string) => {
            return new Promise((resolve, reject) => {
                const file = fs.createWriteStream(dest);
                http.get(url, { headers: { 'Authorization': `Bearer ${token}` } }, (response) => {
                    if (response.statusCode !== 200) {
                        let data = '';
                        response.on('data', chunk => data += chunk);
                        response.on('end', () => {
                            reject(new Error(`Failed to get '${url}' (${response.statusCode}): ${data}`));
                        });
                        return;
                    }
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        resolve(fs.statSync(dest).size);
                    });
                }).on('error', (err) => {
                    fs.unlink(dest, () => { });
                    reject(err);
                });
            });
        };

        console.log('📊 Exporting XLSX...');
        const xlsxSize = await download('http://localhost:3000/api/export/xlsx', path.join(exportDir, 'verification_test.xlsx'), token);
        console.log(`✅ XLSX Exported: ${xlsxSize} bytes`);

        console.log('🖼️ Exporting Photos ZIP...');
        const zipSize = await download('http://localhost:3000/api/export/photos', path.join(exportDir, 'verification_photos.zip'), token);
        console.log(`✅ Photos ZIP Exported: ${zipSize} bytes`);

        console.log('🎉 Verification successful!');
    } catch (err: any) {
        console.error('❌ Error during process:', err.message);
        if (err.response) {
            console.error('   Response Context:', err.response.data.toString());
        }
    } finally {
        process.exit();
    }
}

generateTestData();
