// 类型定义

export type RecordStatus = 'pending' | 'confirmed' | 'voided';

export interface SiteRecord {
  id: string;
  type: string;
  site_name: string;
  tags: string[];
  description: string;
  image_url: string;
  images?: string[];
  server_created_at: string;
  status: RecordStatus;
  recorder_name?: string;
  amount?: string;
  unit_price?: string;
  supplier?: string;
  admin_note?: string;
}

export interface Site {
  id: number;
  name: string;
  location?: string;
  created_at: string;
}

export interface UserProfile {
  id: number;
  name: string;
  phone: string;
  username: string;
  role: 'super_admin' | 'clerk' | 'worker';
  tenant_id: number | null;
  authorized_sites: string[];
  created_at: string;
  needs_password_change?: boolean;
}

export interface Tenant {
  id: number;
  name: string;
}
