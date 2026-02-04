import React, { useState, useEffect } from 'react';
import {
  LayoutGrid, Download, Settings,
  Search, Filter, ChevronRight,
  Clock, User, CheckCircle, XCircle,
  FileText, Send, AlertCircle, RefreshCw, Box, Plus, Trash2, Edit3, Smartphone, Monitor, ShieldCheck, Link2, ChevronLeft, CheckSquare, Square,
  MessageCircle, Phone, MapPin, Edit
} from 'lucide-react';
import axios from 'axios';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

// --- 类型定义 ---
type RecordStatus = 'pending' | 'confirmed' | 'voided';

interface SiteRecord {
  id: string;
  type: string;
  site_name: string;
  tags: string[];
  description: string;
  image_url: string;
  images?: string[]; // 新增：多图数组
  server_created_at: string;
  status: RecordStatus;
  recorder_name?: string;
  amount?: string;
  unit_price?: string;
  supplier?: string;
  admin_note?: string;
}

interface Site {
  id: number;
  name: string;
  location?: string;
  created_at: string;
}

interface UserProfile {
  id: number;
  name: string;
  phone: string;
  username: string;
  role: 'SUPER_ADMIN' | 'CLIENT_CLERK';
  tenant_id: number | null;
  authorized_sites: string[];
  created_at: string;
}

interface Tenant {
  id: number;
  name: string;
}

export default function AdminApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));

  const [activeTab, setActiveTab] = useState<'inbox' | 'export' | 'settings'>('inbox');
  const [records, setRecords] = useState<SiteRecord[]>([]);
  const [dictionaries, setDictionaries] = useState<{ sites: any[], recorders: any[] }>({ sites: [], recorders: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 设置子页签
  const [settingsSubTab, setSettingsSubTab] = useState<'users' | 'sites' | 'tenants'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [sites, setSites] = useState<Site[]>([]);

  // 超管管理特定租户
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);

  // 筛选状态
  const [filterSite, setFilterSite] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // 多选状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 弹窗状态
  const [showUserModal, setShowUserModal] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (token) {
      // 校验并加载初始数据
      validateToken();
    }
  }, [token]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchRecords();
      fetchDictionaries();
      fetchUsers();
      fetchSites();
      if (currentUser?.role === 'SUPER_ADMIN') {
        fetchTenants();
      }
    }
  }, [isLoggedIn, selectedTenantId]);

  const validateToken = async () => {
    try {
      // 简单模拟验证，实际可以调一个 /api/me 接口
      const savedUser = localStorage.getItem('admin_user');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
        setIsLoggedIn(true);
      }
    } catch (e) {
      handleLogout();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setToken(null);
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  const getHeaders = () => {
    const headers: any = { 'Authorization': `Bearer ${token}` };
    if (selectedTenantId) {
      headers['x-tenant-id'] = selectedTenantId.toString();
    }
    return headers;
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/records', { headers: getHeaders() });
      if (res.data.success) setRecords(res.data.data);
    } catch (err) {
      console.error(err);
      if ((err as any).response?.status === 401) handleLogout();
    }
    finally { setLoading(false); }
  };

  const fetchDictionaries = async () => {
    try {
      const res = await axios.get('/api/dictionaries', { headers: getHeaders() });
      if (res.data.success) setDictionaries(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/users', { headers: getHeaders() });
      if (res.data.success) setUsers(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchSites = async () => {
    try {
      const res = await axios.get('/api/sites', { headers: getHeaders() });
      if (res.data.success) setSites(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchTenants = async () => {
    try {
      const res = await axios.get('/api/admin/tenants', { headers: getHeaders() });
      if (res.data.success) setTenants(res.data.data);
    } catch (err) { console.error(err); }
  };

  const updateRecordStatus = async (id: string, status: RecordStatus, adminData?: any) => {
    try {
      const res = await axios.put(`/api/records/${id}/status`,
        { status, ...adminData },
        { headers: getHeaders() }
      );
      if (res.data.success) {
        fetchRecords();
        setSelectedId(null);
      }
    } catch (err) { alert('操作失败'); }
  };

  // --- 导出逻辑 (Excel + Zip 图片) ---
  const handleExportZip = async () => {
    // 1. 确定要导出的数据 (如果有多选则优先用多选，否则用当前筛选结果)
    let selectedRecords = records.filter((r: SiteRecord) => {
      if (filterSite && r.site_name !== filterSite) return false;
      if (filterType && r.type !== filterType) return false;
      if (filterUser && r.recorder_name !== filterUser) return false;
      return true;
    });

    if (selectedIds.size > 0) {
      selectedRecords = selectedRecords.filter((r: SiteRecord) => selectedIds.has(r.id));
    }

    if (selectedRecords.length === 0) return alert('没有可导出的数据');

    setLoading(true);
    try {
      const zip = new JSZip();

      // 1. 生成 Excel
      const worksheet = XLSX.utils.json_to_sheet(selectedRecords.map((r: SiteRecord) => ({
        '流水号ID': r.id,
        '记录类型': r.type === 'material' ? '材料' : '人员',
        '项目工地': r.site_name,
        '业务标签': (r.tags || []).join(','),
        '现场描述': r.description,
        '结算金额': r.amount,
        '结算单价': r.unit_price,
        '供应商名称': r.supplier,
        '现场记录人': r.recorder_name,
        '云端记录时间': new Date(r.server_created_at).toLocaleString(),
        '审核状态': r.status === 'confirmed' ? '已归档' : r.status === 'voided' ? '已作废' : '待处理'
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "工地通业务数据表");
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      zip.file("工地通业务导出清单.xlsx", excelBuffer);

      // 2. 打包照片 (支持单记录多张图)
      const imgFolder = zip.folder("现场原始照片");
      const downloadTasks: Promise<void>[] = [];

      selectedRecords.forEach((r: SiteRecord) => {
        // 兼容新旧数据：既看 images 数组，也看 image_url
        const imgs = r.images && r.images.length > 0 ? r.images : (r.image_url ? [r.image_url] : []);

        imgs.forEach((url: string, idx: number) => {
          downloadTasks.push((async () => {
            try {
              const response = await axios.get(url, { responseType: 'blob' });
              const extension = url.split('.').pop() || 'jpg';
              if (imgFolder) {
                // 命名规则: 流水号_序号.jpg (如 20260131-WK-MAT-001_1.jpg)
                imgFolder.file(`${r.id}_${idx + 1}.${extension}`, response.data);
              }
            } catch (e) { console.error(`Photo failed: ${r.id}`, e); }
          })());
        });
      });

      await Promise.all(downloadTasks);

      // 3. 构建 Zip 并下载
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `工地通导出包_${selectedIds.size > 0 ? 'Selection' : 'Batch'}_${new Date().toISOString().slice(0, 10)}.zip`);
    } catch (err) {
      alert('导出 Zip 失败，请检查网络');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter((r: SiteRecord) => {
    if (filterSite && r.site_name !== filterSite) return false;
    if (filterType && r.type !== filterType) return false;
    if (filterUser && r.recorder_name !== filterUser) return false;
    if (filterDate && !r.server_created_at.startsWith(filterDate)) return false;
    return true;
  });

  const pendingCount = records.filter((r: SiteRecord) => r.status === 'pending').length;
  const selectedRecord = records.find((r: SiteRecord) => r.id === selectedId);

  if (!isLoggedIn) {
    return <LoginPage onLogin={(u, t) => {
      setToken(t);
      setCurrentUser(u);
      setIsLoggedIn(true);
      localStorage.setItem('admin_token', t);
      localStorage.setItem('admin_user', JSON.stringify(u));
    }} />;
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      {/* 1. 左侧侧边栏 */}
      <aside className="w-[280px] bg-[#0F172A] text-slate-400 flex flex-col shrink-0 shadow-2xl z-30">
        <div className="h-24 flex items-center px-8 border-b border-slate-800">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center mr-3 text-white font-bold">工</div>
          <span className="text-white font-bold text-lg">工地通 Admin</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-6">
          <NavItem active={activeTab === 'inbox'} label="收件箱" icon={<LayoutGrid size={20} />} badge={pendingCount} onClick={() => setActiveTab('inbox')} />
          <NavItem active={activeTab === 'export'} label="导出数据" icon={<Download size={20} />} onClick={() => setActiveTab('export')} />
          <NavItem active={activeTab === 'settings'} label="工地设置" icon={<Settings size={20} />} onClick={() => setActiveTab('settings')} />

          {currentUser?.role === 'SUPER_ADMIN' && (
            <div className="mt-10 px-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 px-2">管理租户上下文</p>
              <select
                className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-200 outline-none ring-1 ring-slate-700 focus:ring-blue-500 transition-all"
                value={selectedTenantId || ''}
                onChange={(e) => {
                  const id = e.target.value ? parseInt(e.target.value) : null;
                  setSelectedTenantId(id);
                  // 切换后刷新数据
                  fetchRecords();
                  fetchDictionaries();
                }}
              >
                <option value="">所有租户 (全局)</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
        </nav>

        <div className="p-6 border-t border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">{currentUser?.name?.[0]}</div>
              <div className="min-w-0">
                <p className="text-white text-sm font-bold truncate">{currentUser?.name}</p>
                <p className="text-xs opacity-60">{currentUser?.role === 'SUPER_ADMIN' ? '超级管理员' : '客户文员'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowPasswordModal(true)} title="修改密码" className="text-slate-500 hover:text-blue-400 transition-colors p-1"><ShieldCheck size={18} /></button>
              <button onClick={handleLogout} title="退出登录" className="text-slate-500 hover:text-red-400 transition-colors p-1"><XCircle size={18} /></button>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex justify-between items-center px-8 shadow-sm shrink-0 z-20">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-800">
              {activeTab === 'inbox' ? '收件箱' : activeTab === 'export' ? '导出数据' : '工地设置'}
            </h1>
            {activeTab === 'inbox' && pendingCount > 0 && (
              <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-bold">
                {pendingCount} 条待确认
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => { fetchRecords(); fetchDictionaries(); }} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><RefreshCw size={20} className={loading ? "animate-spin" : ""} /></button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* A. Inbox */}
          {activeTab === 'inbox' && (
            <>
              <div className="flex-1 overflow-y-auto px-10 py-8 relative">
                {/* Toolbar */}
                <div className="flex justify-between items-center mb-6">
                  <button
                    onClick={() => alert("功能模拟：生成日报")}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg shadow-green-500/20 text-sm font-bold transition-all hover:-translate-y-0.5"
                  >
                    <Send size={18} /> 确认并发送今日日报
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-slate-400 text-sm font-bold mr-2"><Filter size={14} /> 筛选:</div>
                    <div className="relative group">
                      <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="appearance-none bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-bold text-slate-700 outline-none hover:border-blue-400 cursor-pointer transition-all uppercase" />
                    </div>
                    <div className="relative group">
                      <select value={filterSite} onChange={e => setFilterSite(e.target.value)} className="appearance-none bg-white border border-slate-200 px-4 py-2 pr-10 rounded-lg text-sm font-bold text-slate-700 outline-none hover:border-blue-400 cursor-pointer transition-all">
                        <option value="">所有工地</option>
                        {dictionaries.sites.map((o: { name: string }) => <option key={o.name} value={o.name}>{o.name}</option>)}
                      </select>
                      <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" />
                    </div>
                    <div className="relative group">
                      <select value={filterType} onChange={e => setFilterType(e.target.value)} className="appearance-none bg-white border border-slate-200 px-4 py-2 pr-10 rounded-lg text-sm font-bold text-slate-700 outline-none hover:border-blue-400 cursor-pointer transition-all">
                        <option value="">所有类型</option>
                        <option value="person">人员</option>
                        <option value="material">材料</option>
                      </select>
                      <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" />
                    </div>
                    <div className="relative group">
                      <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="appearance-none bg-white border border-slate-200 px-4 py-2 pr-10 rounded-lg text-sm font-bold text-slate-700 outline-none hover:border-blue-400 cursor-pointer transition-all">
                        <option value="">所有记录人</option>
                        {dictionaries.recorders.map((o: { name: string }) => <option key={o.name} value={o.name}>{o.name}</option>)}
                      </select>
                      <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pb-20">
                  {filteredRecords.filter((r: SiteRecord) => r.status === 'pending').map((r: SiteRecord) => (
                    <div key={r.id} onClick={() => setSelectedId(r.id)} className={`bg-white p-4 rounded-xl border transition-all cursor-pointer flex gap-5 items-start group ${selectedId === r.id ? 'border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500' : 'border-slate-100 hover:border-blue-300 hover:shadow-md'}`}>
                      {/* Image Placeholder */}
                      <div className="w-24 h-24 bg-slate-50 rounded-lg shrink-0 border border-slate-100 flex items-center justify-center overflow-hidden relative">
                        {r.image_url ? <img src={r.image_url} className="w-full h-full object-cover" /> : <Box size={32} className="text-slate-200" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 py-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] text-white font-bold ${r.type === 'person' ? 'bg-blue-500' : 'bg-orange-500'}`}>{r.type === 'person' ? '人员' : '材料'}</span>
                          <h3 className="font-bold text-slate-900 text-base">{r.tags?.[0] || '未分类记录'}</h3>
                          <span className="text-xs text-slate-400 font-medium">| {r.site_name}</span>
                        </div>
                        <p className="text-slate-600 text-sm mb-3 line-clamp-1">{r.description || '无详细描述...'}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
                          <span className="flex items-center gap-1"><Clock size={12} /> {new Date(r.server_created_at).toLocaleString()}</span>
                          <span className="flex items-center gap-1"><User size={12} /> {r.recorder_name || '-'}</span>
                        </div>
                      </div>

                      {/* Status/Action Indicator */}
                      <div className="self-center pr-4">
                        {selectedId === r.id ? <CheckCircle size={24} className="text-blue-500" /> : <div className="w-6 h-6 rounded-full border-2 border-slate-100 group-hover:border-blue-300 transition-colors"></div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overlay Drawer */}
              {selectedRecord && (
                <div className="absolute top-0 right-0 w-[600px] h-full bg-white shadow-2xl z-50 border-l border-slate-100 flex flex-col animate-in slide-in-from-right duration-300">
                  <HandleUI record={selectedRecord} onClose={() => setSelectedId(null)} onAction={updateRecordStatus} />
                </div>
              )}
            </>
          )}

          {/* B. Export */}
          {activeTab === 'export' && (
            <div className="flex-1 overflow-y-auto px-10 py-8 relative">
              {/* Toolbar */}
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                  <button onClick={handleExportZip} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 text-sm transition-all hover:-translate-y-0.5">
                    <Download size={18} /> 批量导出 (Excel + 照片)
                  </button>
                  {selectedIds.size > 0 && <span className="text-slate-400 text-sm font-bold animate-in fade-in slide-in-from-left-2">已选择 <span className="text-slate-900">{selectedIds.size}</span> 项</span>}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-slate-400 text-sm font-bold mr-2"><Filter size={14} /> 筛选:</div>
                  <div className="relative group">
                    <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="appearance-none bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-bold text-slate-700 outline-none hover:border-blue-400 cursor-pointer transition-all uppercase" />
                  </div>
                  <div className="flex gap-4">
                    <select className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-3 text-xs font-bold outline-none" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
                      <option value="">全部站点</option>
                      {dictionaries.sites.map((o: { name: string }) => <option key={o.name} value={o.name}>{o.name}</option>)}
                    </select>
                    <select className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-3 text-xs font-bold outline-none" value={filterType} onChange={e => setFilterType(e.target.value)}>
                      <option value="">全部类型</option>
                      <option value="site_entry">进场</option>
                      <option value="site_exit">退场</option>
                    </select>
                    <select className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-3 text-xs font-bold outline-none" value={filterUser} onChange={e => setFilterUser(e.target.value)}>
                      <option value="">全部记录员</option>
                      {dictionaries.recorders.map((o: { name: string }) => <option key={o.name} value={o.name}>{o.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-400">
                    <tr>
                      <th className="p-6 w-16 text-center">
                        <button onClick={() => selectedIds.size === filteredRecords.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(filteredRecords.map((r: SiteRecord) => r.id)))} className="text-slate-400 hover:text-blue-600">
                          {selectedIds.size > 0 && selectedIds.size === filteredRecords.length ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                        </button>
                      </th>
                      <th className="p-6 font-bold text-slate-600 text-xs text-center">流水号ID</th>
                      <th className="p-6 font-bold text-slate-600 text-xs text-center w-24">记录人</th>
                      <th className="p-6 font-bold text-slate-600 text-xs w-48">类型/工地</th>
                      <th className="p-6 font-bold text-slate-600 text-xs px-0">详情摘要</th>
                      <th className="p-6 font-bold text-slate-600 text-xs w-32">时间</th>
                      <th className="p-6 font-bold text-slate-600 text-xs text-center w-24">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-700">
                    {filteredRecords.map((r, index) => (
                      <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(r.id) ? 'bg-blue-50/50' : ''}`}>
                        <td className="p-6 text-center">
                          <button onClick={() => {
                            const newSet = new Set(selectedIds);
                            if (newSet.has(r.id)) newSet.delete(r.id);
                            else newSet.add(r.id);
                            setSelectedIds(newSet);
                          }} className="text-slate-300 hover:text-blue-600">
                            {selectedIds.has(r.id) ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                          </button>
                        </td>
                        <td className="p-6 group cursor-pointer text-center" onClick={() => setSelectedId(r.id)}>
                          <div className="font-mono text-xs text-slate-400 group-hover:text-blue-600 transition-colors uppercase">{r.id.split('-')[0]}-</div>
                          <div className="font-mono text-xs text-slate-500 font-bold group-hover:text-blue-600 transition-colors uppercase">{r.id.split('-').slice(1).join('-')}</div>
                        </td>
                        <td className="p-6 text-center font-bold">{r.recorder_name || '-'}</td>
                        <td className="p-6">
                          <div className="flex gap-2 items-center flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] text-white font-bold ${(r.type === 'person' ? 'bg-blue-500' : r.type === 'expense' ? 'bg-green-500' : 'bg-orange-500')}`}>
                              {r.type === 'person' ? '人员' : r.type === 'expense' ? '费用' : '材料'}
                            </span>
                            <span className="text-xs font-bold text-slate-500">{r.site_name}</span>
                          </div>
                        </td>
                        <td className="p-6 px-0 max-w-sm">
                          <div className="flex gap-2 items-center">
                            <span className="font-black text-slate-800 text-sm whitespace-nowrap">{r.tags?.[0]}</span>
                            <span className="text-slate-500 text-xs line-clamp-1">{r.description}</span>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="text-xs text-slate-500 font-mono scale-90 origin-left">{new Date(r.server_created_at).toLocaleDateString()}</div>
                          <div className="text-xs text-slate-400 font-mono scale-90 origin-left">{new Date(r.server_created_at).toLocaleTimeString()}</div>
                        </td>
                        <td className="p-6 text-center">
                          {r.status === 'confirmed' ? (
                            <div className="mx-auto text-green-600 text-[10px] font-black leading-tight bg-green-50 rounded p-1 w-8">已<br />归档</div>
                          ) : r.status === 'voided' ? (
                            <div className="mx-auto text-red-300 text-[10px] font-black leading-tight bg-red-50 rounded p-1 opacity-50 w-8">已<br />作废</div>
                          ) : (
                            <div className="mx-auto text-orange-500 text-[10px] font-black leading-tight bg-orange-50 rounded p-1 w-8">待<br />处理</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredRecords.length === 0 && <div className="p-10 text-center text-slate-300">暂无数据</div>}
              </div>
            </div>

          )}
          {/* C. Settings */}
          {activeTab === 'settings' && (
            <main className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
              <header className="bg-white border-b border-slate-100 p-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter">系统配置</h1>
                <div className="flex gap-8 mt-6">
                  <button onClick={() => setSettingsSubTab('users')} className={`pb-2 text-xs font-black uppercase tracking-widest transition-all ${settingsSubTab === 'users' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>账号管理</button>
                  <button onClick={() => setSettingsSubTab('sites')} className={`pb-2 text-xs font-black uppercase tracking-widest transition-all ${settingsSubTab === 'sites' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>工地/项目</button>
                  {currentUser?.role === 'SUPER_ADMIN' && <button onClick={() => setSettingsSubTab('tenants')} className={`pb-2 text-xs font-black uppercase tracking-widest transition-all ${settingsSubTab === 'tenants' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>租户管理</button>}
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-8">
                {settingsSubTab === 'users' && (
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">用户名</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">姓名</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">角色</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">所属租户</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                            <button onClick={() => setShowUserModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">新增账号</button>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {users.map((u: UserProfile) => (
                          <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-5 text-sm font-bold text-slate-900">{u.username}</td>
                            <td className="px-8 py-5 text-sm font-bold text-slate-600">{u.name}</td>
                            <td className="px-8 py-5">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${u.role === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-600' : u.role === 'CLIENT_CLERK' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-sm font-bold text-slate-400">
                              {tenants.find(t => t.id === u.tenant_id)?.name || '-'}
                            </td>
                            <td className="px-8 py-5 text-right">
                              <button className="text-slate-300 hover:text-blue-600 transition-colors"><Edit size={16} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {settingsSubTab === 'tenants' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-black text-slate-900">租户列表</h3>
                      <button onClick={() => setShowTenantModal(true)} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 hover:-translate-y-1 transition-all">新增租户</button>
                    </div>
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden text-sm">
                      {tenants.map((t: Tenant) => (
                        <div key={t.id} className="p-6 border-b border-slate-50 flex justify-between items-center font-bold">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400"># {t.id}</div>
                            <span>{t.name}</span>
                          </div>
                          <span className="text-slate-300 text-[10px] font-black uppercase">ID: {t.id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {settingsSubTab === 'sites' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sites.map((s: Site) => (
                      <div key={s.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                            <MapPin size={24} />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full">SITE</span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 mb-2">{s.name}</h3>
                        <p className="text-slate-400 text-sm font-bold mb-4">{s.location || '广州市南沙区进港大道100号'}</p>
                        <div className="flex gap-2">
                          <span className="bg-blue-600/5 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">活跃</span>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setShowSiteModal(true)} className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-6 flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-all">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                        <Box size={24} />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest">新增工地</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Modals */}
              {showUserModal && (
                <Modal title="新增账号" onClose={() => setShowUserModal(false)}>
                  <UserForm
                    tenants={tenants}
                    isSuperAdmin={currentUser?.role === 'SUPER_ADMIN'}
                    onSuccess={() => { fetchUsers(); setShowUserModal(false); }}
                    getHeaders={getHeaders}
                  />
                </Modal>
              )}

              {showSiteModal && (
                <Modal title="新增工地/项目" onClose={() => setShowSiteModal(false)}>
                  <SiteForm
                    tenants={tenants}
                    isSuperAdmin={currentUser?.role === 'SUPER_ADMIN'}
                    onSuccess={() => { fetchSites(); setShowSiteModal(false); }}
                    getHeaders={getHeaders}
                  />
                </Modal>
              )}

              {showTenantModal && (
                <Modal title="新增租户" onClose={() => setShowTenantModal(false)}>
                  <TenantForm
                    onSuccess={() => { fetchTenants(); setShowTenantModal(false); }}
                    getHeaders={getHeaders}
                  />
                </Modal>
              )}

              {showPasswordModal && (
                <Modal title="修改密码" onClose={() => setShowPasswordModal(false)}>
                  <ChangePasswordForm
                    onSuccess={() => { setShowPasswordModal(false); alert('密码修改成功，请重新登录'); handleLogout(); }}
                    getHeaders={getHeaders}
                  />
                </Modal>
              )}
            </main>
          )}
        </div>
      </main>
    </div>
  );
}

// --- 封装组件 ---

function Modal({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <XCircle size={24} />
          </button>
        </div>
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

function UserForm({ tenants, isSuperAdmin, onSuccess, getHeaders }: { tenants: Tenant[], isSuperAdmin: boolean, onSuccess: () => void, getHeaders: () => any }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    phone: '',
    role: 'WORKER',
    tenant_id_target: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isWorker = formData.role === 'WORKER';
  const needsTenant = formData.role !== 'SUPER_ADMIN';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 前端验证
    if (needsTenant && !formData.tenant_id_target) {
      setError('请选择所属客户');
      return;
    }
    if (isWorker && !formData.phone) {
      setError('现场人员必须填写手机号');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/users', formData, { headers: getHeaders() });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold">{error}</div>}

      {/* 所属客户 - 非超管必填 */}
      {(isSuperAdmin || needsTenant) && (
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">所属客户 *</label>
          <select
            required={needsTenant}
            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
            value={formData.tenant_id_target}
            onChange={e => setFormData({ ...formData, tenant_id_target: e.target.value })}
          >
            <option value="">请选择客户</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">用户名 *</label>
        <input
          required
          className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
          value={formData.username}
          onChange={e => setFormData({ ...formData, username: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
          手机号 {isWorker && <span className="text-red-500">*</span>}
        </label>
        <input
          required={isWorker}
          className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
          value={formData.phone}
          onChange={e => setFormData({ ...formData, phone: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">姓名 *</label>
          <input
            required
            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">角色 *</label>
          <select
            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
            value={formData.role}
            onChange={e => setFormData({ ...formData, role: e.target.value })}
          >
            <option value="WORKER">现场人员</option>
            <option value="CLIENT_CLERK">客户文员</option>
            {isSuperAdmin && <option value="SUPER_ADMIN">超级管理员</option>}
          </select>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 mt-4"
      >
        {loading ? '提交中...' : '确认创建'}
      </button>
    </form>
  );
}

function SiteForm({ tenants, isSuperAdmin, onSuccess, getHeaders }: { tenants: Tenant[], isSuperAdmin: boolean, onSuccess: () => void, getHeaders: () => any }) {
  const [name, setName] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/sites', { name, tenant_id_target: tenantId }, { headers: getHeaders() });
      onSuccess();
    } catch (err) {
      alert('创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">工地/项目名称 *</label>
        <input
          required
          className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
          placeholder="例如：万科金域华府"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>
      {isSuperAdmin && (
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">所属租户 *</label>
          <select
            required
            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
            value={tenantId}
            onChange={e => setTenantId(e.target.value)}
          >
            <option value="">请选择租户</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {loading ? '提交中...' : '提交工地项目'}
      </button>
    </form>
  );
}

function TenantForm({ onSuccess, getHeaders }: { onSuccess: () => void, getHeaders: () => any }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/admin/tenants', { name }, { headers: getHeaders() });
      onSuccess();
    } catch (err) {
      alert('创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">客户/公司名称 *</label>
        <input
          required
          className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
          placeholder="输入新客户公司全称"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {loading ? '创建租户' : '确认创建'}
      </button>
    </form>
  );
}

function ChangePasswordForm({ onSuccess, getHeaders }: { onSuccess: () => void, getHeaders: () => any }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setError('两次输入的新密码不一致');
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/user/change-password', { oldPassword, newPassword }, { headers: getHeaders() });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold">{error}</div>}
      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">原密码 *</label>
        <input
          required
          type="password"
          className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
          value={oldPassword}
          onChange={e => setOldPassword(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">新密码 *</label>
        <input
          required
          type="password"
          className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">确认新密码 *</label>
        <input
          required
          type="password"
          className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 mt-4"
      >
        {loading ? '修改中...' : '提交修改'}
      </button>
    </form>
  );
}
function NavItem({ active, label, icon, badge, onClick }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-8 py-5 rounded-[24px] transition-all duration-300 ${active ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/40 translate-x-1 scale-[1.02]' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}>
      <div className="flex items-center gap-4">{icon}<span className="font-black text-[15px] tracking-tighter">{label}</span></div>
      {badge > 0 && <span className={`text-[11px] px-2.5 py-0.5 rounded-lg font-black ${active ? 'bg-white text-blue-600 shadow-sm' : 'bg-orange-500 text-white'}`}>{badge}</span>}
    </button>
  );
}

function SelectBox({ value, onChange, options, label }: any) {
  return (
    <div className="relative group">
      <select value={value} onChange={e => onChange(e.target.value)} className="appearance-none bg-white border-2 border-slate-100 px-6 py-4 pr-12 rounded-2xl text-[13px] font-black text-slate-900 outline-none shadow-sm focus:border-blue-500 transition-all cursor-pointer">
        <option value="">{label}</option>
        {options.map((o: any) => <option key={o.name} value={o.name}>{o.label || o.name}</option>)}
      </select>
      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover:text-blue-500 transition-colors"><ChevronRight size={16} className="rotate-90" /></div>
    </div>
  );
}

function RecordCard({ record, active, onClick }: any) {
  return (
    <div onClick={onClick} className={`bg-white p-8 rounded-[40px] border-2 transition-all duration-300 cursor-pointer ${active ? 'border-blue-500 shadow-2xl bg-blue-50/10' : 'border-white shadow-sm hover:border-slate-100 hover:-translate-y-1'}`}>
      <div className="flex gap-8">
        <div className="w-32 h-32 bg-slate-50 rounded-[32px] shrink-0 overflow-hidden border border-slate-100 flex items-center justify-center relative">
          {record.image_url ? <img src={record.image_url} className="w-full h-full object-cover" /> : <Box className="text-slate-200 opacity-30" size={48} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase text-white ${record.type === 'material' ? 'bg-orange-500' : 'bg-blue-600'}`}>{record.type === 'material' ? '材料' : '人员'}</span>
            <h3 className="font-black text-slate-900 text-lg truncate tracking-tighter">{record.tags?.[0] || '实时记录'}</h3>
            <span className="text-slate-300 font-bold text-xs uppercase opacity-60">@ {record.site_name}</span>
          </div>
          <p className="text-sm text-slate-500 font-medium mb-6 line-clamp-1 italic opacity-80 leading-relaxed font-serif">\"{record.description || '现场工作人员未补充描述数据...'}\"</p>
          <div className="flex items-center gap-6 text-[10px] text-slate-400 font-black uppercase tracking-widest">
            <span className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100"><Clock size={16} className="text-blue-500" /> {new Date(record.server_created_at).toLocaleString().slice(5, 11)}</span>
            <span className="flex items-center gap-2"><User size={16} /> {record.recorder_name || '外部人员'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HandleUI({ record, onClose, onAction }: any) {
  const [formData, setFormData] = useState({ supplier: record.supplier || '', amount: record.amount || '', unit_price: record.unit_price || '', admin_note: record.admin_note || '' });
  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="p-12 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white shadow-sm z-10 transition-all">
        <div><h3 className="font-black text-slate-900 text-3xl tracking-tighter uppercase">核实并归档</h3><p className="text-[10px] text-blue-600 font-mono tracking-widest mt-2 uppercase font-black opacity-60">ID REF: {record.id}</p></div>
        <button onClick={onClose} className="text-slate-200 hover:text-slate-400 transition-colors"><XCircle size={48} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-10 space-y-8 pb-32">
        <section className="space-y-4">
          <div className="aspect-[4/3] bg-slate-50 rounded-[32px] overflow-hidden border border-slate-100 shadow-sm flex items-center justify-center group relative">
            <ImageCarousel images={record.images && record.images.length > 0 ? record.images : (record.image_url ? [record.image_url] : [])} />
          </div>
          <div className="p-6 bg-blue-50/30 rounded-[24px] border border-blue-50 text-slate-700 font-medium italic relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/20"></div>
            <p className="text-sm leading-relaxed">\"{record.description || '现场该记录主要描述缺失，请结合照片核实。'}\"</p>
          </div>
        </section>
        <section className="grid grid-cols-2 gap-5">
          <div className="col-span-2">
            <InputCell label="供应商/协作单位" placeholder="输入名称" value={formData.supplier} onChange={(v: any) => setFormData({ ...formData, supplier: v })} />
          </div>
          <InputCell label="确认数量" placeholder="0" type="number" value={formData.amount} onChange={(v: any) => setFormData({ ...formData, amount: v })} />
          <InputCell label="单价参考" placeholder="0.00" type="number" value={formData.unit_price} onChange={(v: any) => setFormData({ ...formData, unit_price: v })} />
          <div className="col-span-2 pt-2">
            <InputCell label="审核意见 (记录档)" placeholder="输入留言..." textarea value={formData.admin_note} onChange={(v: any) => setFormData({ ...formData, admin_note: v })} />
          </div>
        </section>
      </div>
      <div className="p-8 bg-white border-t border-slate-100 flex gap-4 sticky bottom-0 z-10 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
        <button onClick={() => onAction(record.id, 'voided')} className="flex-1 py-4 bg-slate-50 text-red-500 font-black rounded-2xl border border-slate-200 hover:bg-red-50 hover:border-red-100 transition-all uppercase tracking-widest text-xs">驳回归档</button>
        <button onClick={() => onAction(record.id, 'confirmed', formData)} className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-0.5 transition-all uppercase tracking-widest text-xs">通过并写入云端</button>
      </div>
    </div>
  );
}

// --- 登录页面组件 ---
function LoginPage({ onLogin }: { onLogin: (u: UserProfile, t: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/login', { username, password });
      if (res.data.success) {
        onLogin(res.data.user, res.data.token);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败，请检查网络或账号');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#0F172A] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[40px] p-12 shadow-2xl animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mb-4 shadow-xl shadow-blue-500/20">工</div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">工地通管理系统</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">ADMINISTRATION PORTAL</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">账号/用户名</label>
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none transition-all shadow-sm"
              placeholder="请输入账号"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">登录密码</label>
            <input
              type="password"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none transition-all shadow-sm"
              placeholder="请输入密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 text-xs font-bold p-4 rounded-xl flex items-center gap-2 border border-red-100 animate-in slide-in-from-top-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:-translate-y-1 transition-all uppercase tracking-widest text-[13px]"
          >
            {loading ? <RefreshCw size={20} className="animate-spin mx-auto" /> : '立即进入后台'}
          </button>
        </form>

        <p className="text-center text-slate-300 text-[10px] mt-10 font-black uppercase tracking-widest">Antigravity Design Engine</p>
      </div>
    </div>
  );
}

function ImageCarousel({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);

  if (!images || images.length === 0) return <Box size={100} className="text-slate-200 opacity-20" />;

  const prev = (e: any) => { e.stopPropagation(); setIdx(i => i > 0 ? i - 1 : images.length - 1); };
  const next = (e: any) => { e.stopPropagation(); setIdx(i => i < images.length - 1 ? i + 1 : 0); };

  return (
    <div className="relative w-full h-full group">
      <img src={images[idx]} className="w-full h-full object-cover transition-all duration-500" />

      {/* 轮播指示器 */}
      {images.length > 1 && (
        <>
          <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={prev} className="p-3 bg-white/80 backdrop-blur rounded-full shadow-lg text-slate-700 hover:bg-white hover:scale-110 transition-all"><ChevronLeft size={24} /></button>
            <button onClick={next} className="p-3 bg-white/80 backdrop-blur rounded-full shadow-lg text-slate-700 hover:bg-white hover:scale-110 transition-all"><ChevronRight size={24} /></button>
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === idx ? 'bg-white w-6' : 'bg-white/50'}`} />
            ))}
          </div>
          <div className="absolute top-6 right-6 px-3 py-1 bg-black/50 backdrop-blur rounded-full text-white text-[10px] font-black uppercase tracking-widest">
            {idx + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}

function InputCell({ label, value, onChange, placeholder, disabled, type, textarea }: any) {
  return (
    <div className={`space-y-2 ${textarea ? 'col-span-2' : ''}`}>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{label}</label>
      {textarea ? (
        <textarea className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:border-blue-500 outline-none transition-all h-28 resize-none shadow-sm placeholder:font-normal" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
      ) : (
        <input disabled={disabled} type={type || 'text'} className={`w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:border-blue-500 outline-none transition-all shadow-sm placeholder:font-normal ${disabled ? 'bg-slate-50 opacity-50' : ''}`} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  );
}
