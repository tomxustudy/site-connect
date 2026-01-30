/* src/types/index.ts */
export type RecordType = 'person' | 'material' | 'expense';
export type RecordStatus = 'pending' | 'confirmed' | 'voided';

// 记录的数据结构
export interface SiteRecord {
  id: string;
  type: RecordType;
  siteName: string;
  tags: string[];
  description: string;
  imageUrl: string;
  timestamp: string;
  status: RecordStatus;
  recorderName: string;
}