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
  created_at: string;
}

interface UserProfile {
  id: number;
  name: string;
  phone: string;
  openid?: string;
  authorized_sites: string[];
  created_at: string;
}

export default function AdminApp() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'export' | 'settings'>('inbox');
  const [records, setRecords] = useState<SiteRecord[]>([]);
  const [dictionaries, setDictionaries] = useState<{ sites: any[], recorders: any[] }>({ sites: [], recorders: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 设置子页签
  const [settingsSubTab, setSettingsSubTab] = useState<'users' | 'sites'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [sites, setSites] = useState<Site[]>([]);

  // 筛选状态
  const [filterSite, setFilterSite] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // 多选状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRecords();
    fetchDictionaries();
    fetchUsers();
    fetchSites();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://175.178.10.70:3000/api/records');
      if (res.data.success) setRecords(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchDictionaries = async () => {
    try {
      const res = await axios.get('http://175.178.10.70:3000/api/dictionaries');
      if (res.data.success) setDictionaries(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://175.178.10.70:3000/api/users');
      if (res.data.success) setUsers(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchSites = async () => {
    try {
      const res = await axios.get('http://175.178.10.70:3000/api/sites');
      if (res.data.success) setSites(res.data.data);
    } catch (err) { console.error(err); }
  };

  const updateRecordStatus = async (id: string, status: RecordStatus, adminData?: any) => {
    try {
      const res = await axios.put(`http://175.178.10.70:3000/api/records/${id}/status`, { status, ...adminData });
      if (res.data.success) {
        fetchRecords();
        setSelectedId(null);
      }
    } catch (err) { alert('操作失败'); }
  };

  // --- 导出逻辑 (Excel + Zip 图片) ---
  const handleExportZip = async () => {
    // 1. 确定要导出的数据 (如果有多选则优先用多选，否则用当前筛选结果)
    let selectedRecords = records.filter(r => {
      if (filterSite && r.site_name !== filterSite) return false;
      if (filterType && r.type !== filterType) return false;
      if (filterUser && r.recorder_name !== filterUser) return false;
      return true;
    });

    if (selectedIds.size > 0) {
      selectedRecords = selectedRecords.filter(r => selectedIds.has(r.id));
    }

    if (selectedRecords.length === 0) return alert('没有可导出的数据');

    setLoading(true);
    try {
      const zip = new JSZip();

      // 1. 生成 Excel
      const worksheet = XLSX.utils.json_to_sheet(selectedRecords.map(r => ({
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

      selectedRecords.forEach(r => {
        // 兼容新旧数据：既看 images 数组，也看 image_url
        const imgs = r.images && r.images.length > 0 ? r.images : (r.image_url ? [r.image_url] : []);

        imgs.forEach((url, idx) => {
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

  const filteredRecords = records.filter(r => {
    if (filterSite && r.site_name !== filterSite) return false;
    if (filterType && r.type !== filterType) return false;
    if (filterUser && r.recorder_name !== filterUser) return false;
    if (filterDate && !r.server_created_at.startsWith(filterDate)) return false;
    return true;
  });

  const pendingCount = records.filter(r => r.status === 'pending').length;
  const selectedRecord = records.find(r => r.id === selectedId);

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
        </nav>

        <div className="p-6 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-600 rounded-full"></div>
            <div>
              <p className="text-white text-sm font-bold">李文员</p>
              <p className="text-xs opacity-60">办公室管理员</p>
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
                        {dictionaries.sites.map((o: any) => <option key={o.name} value={o.name}>{o.name}</option>)}
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
                        {dictionaries.recorders.map((o: any) => <option key={o.name} value={o.name}>{o.name}</option>)}
                      </select>
                      <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pb-20">
                  {filteredRecords.filter(r => r.status === 'pending').map(r => (
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
                  <div className="relative group">
                    <select value={filterSite} onChange={e => setFilterSite(e.target.value)} className="appearance-none bg-white border border-slate-200 px-4 py-2 pr-10 rounded-lg text-sm font-bold text-slate-700 outline-none hover:border-blue-400 cursor-pointer transition-all">
                      <option value="">所有工地</option>
                      {dictionaries.sites.map((o: any) => <option key={o.name} value={o.name}>{o.name}</option>)}
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
                      {dictionaries.recorders.map((o: any) => <option key={o.name} value={o.name}>{o.name}</option>)}
                    </select>
                    <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-400">
                    <tr>
                      <th className="p-6 w-16 text-center">
                        <button onClick={() => selectedIds.size === filteredRecords.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(filteredRecords.map(r => r.id)))} className="text-slate-400 hover:text-blue-600">
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
          {
            activeTab === 'settings' && (
              <div className="flex-1 p-10 overflow-y-auto space-y-10 flex flex-col">
                <div className="flex gap-12 border-b-2 border-slate-100 shrink-0 px-6">
                  <button onClick={() => setSettingsSubTab('users')} className={`pb-6 border-b-4 font-black text-sm uppercase tracking-widest transition-all ${settingsSubTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>人员管理</button>
                  <button onClick={() => setSettingsSubTab('sites')} className={`pb-6 border-b-4 font-black text-sm uppercase tracking-widest transition-all ${settingsSubTab === 'sites' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>工地管理</button>
                </div>

                <div className="bg-white rounded-[40px] p-10 shadow-sm border border-slate-100 flex-1 space-y-8">
                  {settingsSubTab === 'users' ? (
                    <>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                        <div className="text-blue-500 mt-1"><MessageCircle size={18} /></div>
                        <div className="text-sm text-blue-800">
                          <p className="font-bold mb-1">关于人员授权与微信号：</p>
                          <p>现场人员在首次登录小程序时，需授权获取手机号。系统将自动匹配下方列表中的手机号进行身份验证，并自动获取其微信号（OpenID）用于后续的身份核验。</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-slate-900">现场人员列表 ({users.length})</h3>
                        <button onClick={async () => {
                          const name = prompt('姓名');
                          const phone = prompt('手机号');
                          if (name && phone) {
                            await axios.post('http://175.178.10.70:3000/api/users', { name, phone, authorized_sites: [] });
                            fetchUsers();
                          }
                        }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm transition-all text-sm font-bold"><Plus size={16} /> 新增人员</button>
                      </div>

                      <div className="border border-slate-100 rounded-lg overflow-hidden">
                        <table className="w-full text-left">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="p-4 font-bold text-gray-600 text-sm">姓名</th>
                              <th className="p-4 font-bold text-gray-600 text-sm">手机号 (登录凭证)</th>
                              <th className="p-4 font-bold text-gray-600 text-sm">微信号 (自动绑定)</th>
                              <th className="p-4 font-bold text-gray-600 text-sm">授权工地</th>
                              <th className="p-4 font-bold text-gray-600 text-sm text-right">操作</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {users.map(u => (
                              <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                                <td className="p-4 font-bold text-gray-900">{u.name}</td>
                                <td className="p-4 text-gray-600 font-mono text-sm flex items-center gap-2"><Phone size={14} className="text-gray-400" /> {u.phone}</td>
                                <td className="p-4">
                                  {u.openid ? (
                                    <span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded flex items-center gap-1 w-fit border border-green-100">
                                      <CheckCircle size={10} /> 已绑定 ({u.openid.slice(0, 8)}...)
                                    </span>
                                  ) : (
                                    <span className="text-orange-400 text-xs bg-orange-50 px-2 py-1 rounded w-fit border border-orange-100 opacity-80">
                                      待首次登录
                                    </span>
                                  )}
                                </td>
                                <td className="p-4 flex gap-1 flex-wrap">
                                  {u.authorized_sites.map(s => (
                                    <span key={s} className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 border border-gray-200">{s}</span>
                                  ))}
                                </td>
                                <td className="p-4 text-right space-x-3 text-sm">
                                  <button className="text-blue-600 hover:text-blue-800 hover:underline">编辑</button>
                                  <button className="text-red-500 hover:text-red-700 hover:underline">删除</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-500 text-sm mb-4">管理所有的在建项目，删除项目将隐藏其相关数据。</p>
                      <div className="space-y-3">
                        {sites.map(s => (
                          <div key={s.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-all shadow-sm">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100">
                                <MapPin size={20} />
                              </div>
                              <span className="font-bold text-gray-800 text-lg">{s.name}</span>
                            </div>
                            <div className="flex gap-4 pr-2">
                              <button className="text-gray-400 hover:text-blue-600 transition-colors"><Edit size={18} /></button>
                              <button className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 flex justify-end">
                        <button onClick={async () => {
                          const name = prompt('项目名称');
                          if (name) {
                            await axios.post('http://175.178.10.70:3000/api/sites', { name });
                            fetchSites();
                          }
                        }} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all font-bold text-sm"><Plus size={16} /> 新增工地</button>
                      </div>
                    </>
                  )}

                </div>
              </div>
            )
          }
        </div >
      </main >
    </div >
  );
}

// --- 封装组件 ---
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
      <div className="flex-1 overflow-y-auto p-12 space-y-12 pb-32">
        <section className="space-y-6">
          <div className="aspect-[4/3] bg-slate-50 rounded-[48px] overflow-hidden border border-slate-100 shadow-2xl flex items-center justify-center group relative">
            <ImageCarousel images={record.images && record.images.length > 0 ? record.images : (record.image_url ? [record.image_url] : [])} />
          </div>
          <div className="p-8 bg-blue-50/30 rounded-[32px] border border-blue-50 text-slate-700 font-medium italic relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500/20"></div>
            <p className="text-[15px] leading-relaxed">\"{record.description || '现场该记录主要描述缺失，请结合照片核实。'}\"</p>
          </div>
        </section>
        <section className="grid grid-cols-2 gap-6">
          <InputCell label="供应商/协作单位" placeholder="输入名称" value={formData.supplier} onChange={(v: any) => setFormData({ ...formData, supplier: v })} />
          <InputCell label="确认数量" placeholder="0" type="number" value={formData.amount} onChange={(v: any) => setFormData({ ...formData, amount: v })} />
          <InputCell label="单价参考" placeholder="0.00" type="number" value={formData.unit_price} onChange={(v: any) => setFormData({ ...formData, unit_price: v })} />
          <InputCell label="审核意见 (记录档)" placeholder="输入留言..." textarea value={formData.admin_note} onChange={(v: any) => setFormData({ ...formData, admin_note: v })} />
        </section>
      </div>
      <div className="p-12 bg-slate-50 border-t border-slate-100 flex gap-6 sticky bottom-0 z-10">
        <button onClick={() => onAction(record.id, 'voided')} className="flex-1 py-6 bg-white text-red-500 font-black rounded-3xl shadow-sm border-2 border-slate-200 hover:bg-red-50 transition-all uppercase tracking-widest text-[12px]">驳回归档</button>
        <button onClick={() => onAction(record.id, 'confirmed', formData)} className="flex-2 py-6 bg-blue-600 text-white font-black rounded-3xl shadow-2xl shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-1 transition-all uppercase tracking-widest text-[12px]">通过并写入云端</button>
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
    <div className={`space-y-3 ${textarea ? 'col-span-2' : ''}`}>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{label}</label>
      {textarea ? (
        <textarea className="w-full bg-white border-2 border-slate-100 rounded-[28px] px-8 py-6 text-sm font-bold focus:border-blue-500 outline-none transition-all h-32 resize-none shadow-sm" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
      ) : (
        <input disabled={disabled} type={type || 'text'} className={`w-full bg-white border-2 border-slate-100 rounded-[24px] px-8 py-5 text-sm font-bold focus:border-blue-500 outline-none transition-all shadow-sm ${disabled ? 'bg-slate-50 opacity-50' : ''}`} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  );
}
