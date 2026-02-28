import Taro from '@tarojs/taro';

const STORAGE_KEY = 'OFFLINE_RECORDS_QUEUE';

export interface OfflineRecord {
    id: string;
    type: string;
    site_name: string;
    tags: string[];
    description: string;
    tempImagePath: string;
    timestamp: string;
}

export const OfflineManager = {
    // 保存到本地队列
    async saveToQueue(record: Omit<OfflineRecord, 'id' | 'timestamp'>) {
        const queue = await this.getQueue();
        const newRecord: OfflineRecord = {
            ...record,
            id: `OFFLINE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString()
        };
        queue.push(newRecord);
        Taro.setStorageSync(STORAGE_KEY, queue);
        return newRecord;
    },

    // 获取队列
    async getQueue(): Promise<OfflineRecord[]> {
        return Taro.getStorageSync(STORAGE_KEY) || [];
    },

    // 从队列移除
    async removeFromQueue(id: string) {
        const queue = await this.getQueue();
        const newQueue = queue.filter(r => r.id !== id);
        Taro.setStorageSync(STORAGE_KEY, newQueue);
    },

    // 执行同步
    async syncQueue() {
        const queue = await this.getQueue();
        if (queue.length === 0) return;

        console.log(`🔄 发现 ${queue.length} 条离线记录，准备静默同步...`);

        for (const record of queue) {
            try {
                await this.uploadRecord(record);
                await this.removeFromQueue(record.id);
                console.log(`✅ 离线记录 ${record.id} 同步成功`);
            } catch (err) {
                console.error(`❌ 离线记录 ${record.id} 同步失败:`, err);
                // 如果失败则跳过，等待下次网络好时再试
            }
        }
    },

    // 核心上传逻辑 (复用自 handleSubmit)
    async uploadRecord(record: OfflineRecord) {
        let serverImageUrl = '';

        // 1. 上传图片
        if (record.tempImagePath) {
            // 注意：这里的 tempImagePath 可能是很久以前的，需注意微信临时文件有效期
            const uploadRes = await Taro.uploadFile({
                url: `${config.baseUrl}/api/upload`,
                filePath: record.tempImagePath,
                name: 'photo',
            });
            let uploadData;
            try {
              uploadData = JSON.parse(uploadRes.data);
            } catch (e) {
              console.error('Upload response parse error:', e);
              // JSON 解析失败则跳过图片上传，直接提交记录
            }
            if (uploadData.success) {
                serverImageUrl = uploadData.url;
            }
        }

        // 2. 提交数据
        const res = await Taro.request({
            url: `${config.baseUrl}/api/records`,
            method: 'POST',
            data: {
                type: record.type,
                site_name: record.site_name,
                tags: record.tags,
                description: record.description,
                image_url: serverImageUrl,
                client_timestamp: record.timestamp // 传递原始记录时间
            }
        });

        if (!res.data.success) {
            throw new Error('服务器保存失败');
        }
    }
};
