import React, { useState, useEffect } from 'react';
import {
  LayoutGrid, Download, Settings,
  Search, Filter, ChevronRight,
  Clock, User, CheckCircle, XCircle,
  FileText, Send, AlertCircle, RefreshCw, Box, Plus, Trash2, Edit3, Smartphone, Monitor, ShieldCheck, Link2
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
  server_created_at: string;
  status: RecordStatus;
  recorder_name?: string;
  amount?: string;
  unit_price?: string;
  supplier?: string;
  admin_note?: string;
}

export default function AdminApp() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'export' | 'settings'>('inbox');
  const [records, setRecords] = useState<SiteRecord[]>([]);
  const [dictionaries, setDictionaries] = useState<{ sites: any[], recorders: any[] }>({ sites: [], recorders: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 筛选状态
  const [filterSite, setFilterSite] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterUser, setFilterUser] = useState('');

  useEffect(() => {
    fetchRecords();
    fetchDictionaries();
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
    const selectedRecords = records.filter(r => {
      if (filterSite && r.site_name !== filterSite) return false;
      if (filterType && r.type !== filterType) return false;
      if (filterUser && r.recorder_name !== filterUser) return false;
      return true;
    });

    if (selectedRecords.length === 0) return alert('没有可导出的数据');

    setLoading(true);
    try {
      const zip = new JSZip();

      // 1. 生成 Excel
      const worksheet = XLSX.utils.json_to_sheet(selectedRecords.map(r => ({
        '流水号ID': r.id,
        '记录类型': r.type === 'material' ? '材料' : '人员',
        '项目工地': r.site_name,
        '业务标签': r.tags.join(','),
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

      // 2. 打包照片 (按业务 ID 命名以便审计)
      const imgFolder = zip.folder("现场原始照片");
      const downloadPromises = selectedRecords
        .filter(r => r.image_url)
        .map(async (r) => {
          try {
            const response = await axios.get(r.image_url, { responseType: 'blob' });
            const extension = r.image_url.split('.').pop() || 'jpg';
            if (imgFolder) {
              imgFolder.file(`${r.id}.${extension}`, response.data);
            }
          } catch (e) { console.error(`Photo failed to download: ${r.id}`); }
        });

      await Promise.all(downloadPromises);

      // 3. 构建 Zip 并下载
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `工地通导出包_${new Date().toISOString().slice(0, 10)}.zip`);
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
    return true;
  });

  const pendingCount = records.filter(r => r.status === 'pending').length;
  const selectedRecord = records.find(r => r.id === selectedId);

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">

      {/* 1. 左侧高端侧边栏 (工程深蓝调) */}
      <aside className="w-[280px] bg-[#0F172A] text-slate-400 flex flex-col shrink-0 shadow-2xl z-30">
        <div className="p-10 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
            <ShieldCheck size={28} />
          </div>
          <div>
            <span className="font-black text-white text-xl tracking-tight uppercase block leading-none">工地通</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[3px] mt-1 block">Pro Management</span>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-3 mt-6">
          <NavItem active={activeTab === 'inbox'} label="待处理收件箱" icon={<LayoutGrid size={22} />} badge={pendingCount} onClick={() => setActiveTab('inbox')} />
          <NavItem active={activeTab === 'export'} label="批量数据导出" icon={<Download size={22} />} onClick={() => setActiveTab('export')} />
          <NavItem active={activeTab === 'settings'} label="场所与人员配置" icon={<Settings size={22} />} onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="p-10 border-t border-slate-800/30">
          <div className="flex items-center gap-4 group">
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 group-hover:text-blue-400 transition-colors"><User size={24} /></div>
            <div>
              <p className="text-white text-sm font-black tracking-tight group-hover:underline cursor-pointer">汤姆总监</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">管理员账户</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. 主页面内容 */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* 高端毛玻璃 Header */}
        <header className="h-24 px-10 flex items-center justify-between border-b border-slate-200 bg-white/70 backdrop-blur-xl shrink-0 z-20 sticky top-0">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
                {activeTab === 'inbox' ? '现场实时凭证' : activeTab === 'export' ? '云端归档中心' : '组织架构配置'}
              </h2>
              <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest opacity-80">System Operator Console</p>
            </div>
          </div>
          <button className="flex items-center gap-3 px-8 py-3.5 bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-2xl font-black shadow-xl shadow-green-100 transition-all hover:-translate-y-1 active:scale-95">
            <Send size={20} /> 确认并批量分发日报
          </button>
        </header>

        <div className="flex-1 flex overflow-hidden">

          {/* A. 收件箱模块 */}
          {activeTab === 'inbox' && (
            <>
              <div className="flex-1 overflow-y-auto px-10 py-8 space-y-6">
                {/* 专业筛选 Bar */}
                <div className="flex items-center gap-4 py-3 shrink-0">
                  <div className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-slate-500 text-sm font-black shadow-sm outline-none"><Filter size={18} /> 智能筛选</div>
                  <SelectBox value={filterSite} onChange={setFilterSite} options={dictionaries.sites} label="所有工地地址" />
                  <SelectBox value={filterType} onChange={setFilterType} options={[{ name: 'person', label: '人员类型' }, { name: 'material', label: '材料资产' }]} label="记录分组" />
                  <SelectBox value={filterUser} onChange={setFilterUser} options={dictionaries.recorders} label="全部记录员" />
                  <button onClick={fetchRecords} className="ml-2 w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm"><RefreshCw size={22} className={loading ? "animate-spin" : ""} /></button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {filteredRecords.filter(r => r.status === 'pending').map(r => (
                    <RecordCard key={r.id} record={r} active={selectedId === r.id} onClick={() => setSelectedId(r.id)} />
                  ))}
                  {filteredRecords.filter(r => r.status === 'pending').length === 0 && (
                    <div className="col-span-full py-20 bg-white rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center opacity-40">
                      <Box size={80} className="mb-6 text-slate-200" />
                      <p className="font-black text-slate-400 uppercase tracking-widest">目前无待处理的现场记录</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 高级侧滑抽屉 - 处理详情 */}
              <div className={`w-[580px] bg-white border-l border-slate-100 shadow-[0_0_100px_rgba(0,0,0,0.1)] z-40 flex flex-col transition-all duration-500 ease-out overflow-hidden ${selectedId ? 'translate-x-0' : 'translate-x-full fixed right-0 bottom-0 top-0 pt-24'}`}>
                {selectedRecord ? (
                  <HandleUI record={selectedRecord} onClose={() => setSelectedId(null)} onAction={updateRecordStatus} />
                ) : null}
              </div>
            </>
          )}

          {/* B. 数据归档与导出 */}
          {activeTab === 'export' && (
            <div className="flex-1 p-10 overflow-y-auto">
              <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 space-y-10 min-h-full">
                <div className="flex justify-between items-end">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">业务报表归档</h3>
                    <p className="text-slate-400 text-sm font-bold opacity-60">共有 {filteredRecords.length} 条资产记录符合当前筛选条件</p>
                  </div>
                  <button onClick={handleExportZip} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-[24px] font-black flex items-center gap-3 shadow-2xl shadow-blue-500/20 transition-transform active:scale-95">
                    <Download size={22} /> 一键打包 ZIP 下载 (Excel + 照片)
                  </button>
                </div>

                <div className="flex gap-4">
                  <SelectBox value={filterSite} onChange={setFilterSite} options={dictionaries.sites} label="所有项目" />
                  <SelectBox value={filterType} onChange={setFilterType} options={[{ name: 'person', label: '人员类' }, { name: 'material', label: '材料类' }]} label="记录分类" />
                  <SelectBox value={filterUser} onChange={setFilterUser} options={dictionaries.recorders} label="记录人" />
                </div>

                <div className="border border-slate-100 rounded-[32px] overflow-hidden shadow-sm lg:shadow-none">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-[#F8FAFC] text-slate-400 font-black uppercase tracking-[2px] text-[10px]">
                      <tr className="divide-x divide-slate-100">
                        <th className="px-8 py-6 w-16 text-center">#</th>
                        <th className="px-8 py-6">业务流水号 (审计专用)</th>
                        <th className="px-8 py-6 w-32 text-center">记录人</th>
                        <th className="px-8 py-6">项目/所属工地</th>
                        <th className="px-8 py-6">标签摘要</th>
                        <th className="px-8 py-6">云端同步时间</th>
                        <th className="px-8 py-6 text-center">审核状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                      {filteredRecords.map((r, idx) => (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-all cursor-default group">
                          <td className="px-8 py-5 text-center text-slate-300 font-bold">{idx + 1}</td>
                          <td className="px-8 py-5 font-mono text-[12px] font-black text-slate-400 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{r.id}</td>
                          <td className="px-8 py-5 text-center font-black text-slate-800">{r.recorder_name || '-'}</td>
                          <td className="px-8 py-5 text-slate-500 font-bold">{r.site_name}</td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase text-white ${r.type === 'material' ? 'bg-orange-500' : 'bg-blue-600'}`}>{r.type === 'material' ? '材料' : '人员'}</span>
                              <span className="text-slate-800 truncate max-w-[120px]">{r.tags?.[0]}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-slate-400 text-xs font-bold">{new Date(r.server_created_at).toLocaleString().slice(0, 16)}</td>
                          <td className="px-8 py-5 text-center">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${r.status === 'confirmed' ? 'bg-green-100 text-green-600' : r.status === 'voided' ? 'bg-red-50 text-red-500' : 'bg-orange-100 text-orange-600'}`}>
                              {r.status === 'confirmed' ? '归档成功' : r.status === 'voided' ? '已废除' : '等待核实'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* C. 组织架构配置 (设置) */}
          {activeTab === 'settings' && (
            <div className="flex-1 p-10 overflow-y-auto space-y-10 flex flex-col">
              <div className="flex gap-12 border-b-2 border-slate-100 shrink-0 px-6">
                <button className="pb-6 border-b-4 border-blue-600 text-blue-600 font-black text-sm uppercase tracking-widest">现场人员管理</button>
                <button className="pb-6 border-b-4 border-transparent text-slate-400 font-bold text-sm hover:text-slate-600 uppercase tracking-widest">项目工地清单</button>
                <button className="pb-6 border-b-4 border-transparent text-slate-400 font-bold text-sm hover:text-slate-600 uppercase tracking-widest">操作日志</button>
              </div>

              <div className="bg-white rounded-[40px] p-10 shadow-sm border border-slate-100 flex-1 space-y-10">
                {/* 贴士区域 */}
                <div className="p-8 bg-blue-50/40 rounded-[28px] border border-blue-100 flex gap-6 text-blue-800">
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm shrink-0"><ShieldCheck size={28} /></div>
                  <div className="text-sm">
                    <p className="font-black uppercase tracking-[2px] mb-2 text-blue-900">权限与绑定逻辑说明:</p>
                    <p className="font-medium opacity-70 leading-relaxed text-[13px]">现场人员首次使用小程序时，系统会提示授权手机号。如果手机号存在于下方“受邀列表”中，系统将建立该用户与微信 OpenID 的**永久绑定关系**，并授予其勾选工地的访问权限。后续所有操作都将记录其绑定的微信身份。</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-black text-slate-900 text-xl uppercase tracking-tighter">现场执勤人员列表 (3)</h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">WeChat Binding & Site Authorization</p>
                  </div>
                  <button className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-[20px] font-black shadow-2xl shadow-blue-500/20 hover:-translate-y-1 transition-all"><Plus size={20} /> 新增预录入人员</button>
                </div>

                <div className="border border-slate-100 rounded-[32px] overflow-hidden">
                  <table className="w-full text-left text-[14px]">
                    <thead className="bg-[#F8FAFC] text-slate-400 font-black uppercase text-[10px] tracking-widest">
                      <tr>
                        <th className="px-8 py-6 font-black">姓名</th>
                        <th className="px-8 py-6 font-black">工号/手机 (UID)</th>
                        <th className="px-8 py-6 font-black">微信绑定状态</th>
                        <th className="px-8 py-6 font-black">授权工地范围</th>
                        <th className="px-8 py-6 text-right font-black">后台操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                      {[
                        { name: '张三', phone: '13800138000', wx: '已绑定 (ID: wx_zhang3_01)', sites: ['万科A项目'], status: 'active' },
                        { name: '李四', phone: '13900139000', wx: '已绑定 (ID: wx_li4_sys)', sites: ['碧桂园B项目', '恒大C项目'], status: 'active' },
                        { name: '王五', phone: '13700137000', wx: '待绑定 (等待登录)', sites: ['万科A项目'], status: 'pending' }
                      ].map(u => (
                        <tr key={u.phone} className="hover:bg-slate-50/50 transition-all group">
                          <td className="px-8 py-8 font-black text-slate-900 text-[16px]">{u.name}</td>
                          <td className="px-8 py-8">
                            <div className="flex items-center gap-2">
                              <Smartphone size={14} className="text-slate-300" />
                              <span className="font-mono opacity-50">{u.phone}</span>
                            </div>
                          </td>
                          <td className="px-8 py-8">
                            {u.status === 'active' ? (
                              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-xl w-fit border border-green-100">
                                <Link2 size={14} />
                                <span className="text-[11px] font-black uppercase">{u.wx}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-orange-500 bg-orange-50 px-3 py-1.5 rounded-xl w-fit border border-orange-100">
                                <RefreshCw size={14} className="animate-spin-slow" />
                                <span className="text-[11px] font-black uppercase">等待首次微信登录授权</span>
                              </div>
                            )}
                          </td>
                          <td className="px-8 py-8">
                            <div className="flex flex-wrap gap-2">
                              {u.sites.map(s => <span key={s} className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase border border-slate-200">{s}</span>)}
                            </div>
                          </td>
                          <td className="px-8 py-8 text-right">
                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-3 bg-white border border-slate-200 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"><Edit3 size={18} /></button>
                              <button className="p-3 bg-white border border-slate-200 rounded-xl text-red-500 hover:bg-red-50 transition-colors shadow-sm"><Trash2 size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// --- 高端 UI 基础组件封装 ---

function NavItem({ active, label, icon, badge, onClick }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-8 py-5 rounded-[24px] transition-all duration-300 ${active ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/40 translate-x-2' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}>
      <div className="flex items-center gap-4">{icon}<span className="font-black text-[15px] uppercase tracking-tighter">{label}</span></div>
      {badge > 0 && <span className={`text-[11px] px-2.5 py-0.5 rounded-lg font-black ${active ? 'bg-white text-blue-600 shadow-sm' : 'bg-orange-500 text-white'}`}>{badge}</span>}
    </button>
  );
}

function SelectBox({ value, onChange, options, label }: any) {
  return (
    <div className="relative group">
      <select value={value} onChange={e => onChange(e.target.value)} className="appearance-none bg-white border-2 border-slate-100 px-6 py-3.5 pr-12 rounded-2xl text-[13px] font-black text-slate-900 outline-none shadow-sm focus:border-blue-500 hover:border-slate-200 transition-all cursor-pointer">
        <option value="">{label}</option>
        {options.map((o: any) => <option key={o.name} value={o.name}>{o.label || o.name}</option>)}
      </select>
      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover:text-blue-500 transition-colors"><ChevronRight size={16} className="rotate-90" /></div>
    </div>
  );
}

function RecordCard({ record, active, onClick }: any) {
  return (
    <div onClick={onClick} className={`relative bg-white p-8 rounded-[40px] border-2 transition-all duration-300 cursor-pointer overflow-hidden ${active ? 'border-blue-500 shadow-2xl shadow-blue-100 ring-[12px] ring-blue-50 scale-[1.01]' : 'border-white shadow-sm hover:border-slate-100 hover:shadow-xl hover:-translate-y-1'}`}>
      <div className="flex gap-8">
        <div className="w-32 h-32 bg-slate-50 rounded-[32px] shrink-0 overflow-hidden border border-slate-100 flex items-center justify-center relative shadow-inner">
          {record.image_url ? <img src={record.image_url} className="w-full h-full object-cover" /> : <Box className="text-slate-200 opacity-30" size={48} />}
          <div className="absolute bottom-2 right-2 p-1.5 bg-white/80 backdrop-blur rounded-lg border border-whiteShadow-sm"><Monitor size={12} className="text-slate-400" /></div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase text-white shadow-lg ${record.type === 'material' ? 'bg-orange-500 shadow-orange-200' : 'bg-blue-600 shadow-blue-200'}`}>{record.type === 'material' ? '材料' : '人员'}</span>
              <h3 className="font-black text-slate-900 text-[20px] tracking-tighter truncate max-w-[150px]">{record.tags?.[0] || '实时记录'}</h3>
              <span className="text-slate-300 font-bold text-xs">| {record.site_name}</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium mb-6 line-clamp-1 italic opacity-80 leading-relaxed font-serif">\"{record.description || '现场工作人员未补充描述数据...'}\"</p>
          <div className="flex items-center gap-6 text-[11px] text-slate-400 font-black uppercase tracking-[2px]">
            <span className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100"><Clock size={16} className="text-blue-500" /> {new Date(record.server_created_at).toLocaleString().slice(5, 16).replace('T', ' ')}</span>
            <span className="flex items-center gap-2 group-hover:text-slate-600 transition-colors"><User size={16} /> {record.recorder_name || '外部录入'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HandleUI({ record, onClose, onAction }: any) {
  const [formData, setFormData] = useState({ supplier: record.supplier || '', amount: record.amount || '', unit_price: record.unit_price || '', admin_note: record.admin_note || '' });
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-12 border-b border-slate-50 flex items-center justify-between z-10 sticky top-0 bg-white/90 backdrop-blur-lg">
        <div><h3 className="font-black text-slate-900 text-3xl uppercase tracking-tighter">资产与考勤核查</h3><p className="text-[10px] text-blue-600 font-mono tracking-[4px] mt-3 uppercase font-black opacity-60">ID REF: {record.id}</p></div>
        <button onClick={onClose} className="w-16 h-16 flex items-center justify-center text-slate-100 hover:text-slate-300 transition-colors"><XCircle size={48} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-12 space-y-12 hide-scrollbar">
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-[4px]">现场原始物证存档</h4>
            <div className="px-4 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-black border border-blue-100 uppercase">Recorder: {record.recorder_name || 'System'}</div>
          </div>
          <div className="aspect-[4/3] bg-slate-50 rounded-[48px] overflow-hidden border-[6px] border-white shadow-2xl flex items-center justify-center group cursor-zoom-in">
            {record.image_url ? <img src={record.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" /> : <Box size={100} className="text-slate-200 opacity-20" />}
          </div>
          <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 text-slate-600 font-medium italic relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500/20"></div>
            <span className="text-[9px] font-black uppercase tracking-[3px] text-slate-300 mb-3 block">现场记录文本:</span>
            <p className="text-[15px] leading-relaxed">\"{record.description || '现场该记录主要描述缺失，请结合照片核实。'}\"</p>
          </div>
        </section>

        <section className="space-y-8 pb-12">
          <div className="flex items-center gap-4">
            <div className="h-px bg-slate-100 flex-1"></div>
            <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-[6px] flex items-center gap-3">办公室补录指令 <Monitor size={14} /></h4>
            <div className="h-px bg-slate-100 flex-1"></div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <InputCell label="供应商/分包商全称" placeholder="例如: 中望软件" value={formData.supplier} onChange={(v: any) => setFormData({ ...formData, supplier: v })} />
            <InputCell label="确认物料/考勤项" value={record.tags?.[0] || '默认常规'} disabled />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <InputCell label="核实数量 (Amount)" placeholder="请输入最终确认数" type="number" value={formData.amount} onChange={(v: any) => setFormData({ ...formData, amount: v })} />
            <InputCell label="单价参考 (Local Price)" placeholder="0.00" type="number" value={formData.unit_price} onChange={(v: any) => setFormData({ ...formData, unit_price: v })} />
          </div>
          <InputCell label="管理指令 / 财务备注 (重要)" placeholder="输入审核意见，这将记录在日报附件中..." textarea value={formData.admin_note} onChange={(v: any) => setFormData({ ...formData, admin_note: v })} />
        </section>
      </div>

      <div className="p-12 bg-slate-50 border-t border-slate-100 flex gap-6 shrink-0 z-10 sticky bottom-0">
        <button onClick={() => onAction(record.id, 'voided')} className="flex-1 py-6 bg-white border-2 border-slate-200 text-red-500 font-black rounded-[32px] shadow-sm hover:bg-red-50 hover:border-red-200 transition-all uppercase tracking-[3px] text-[12px]">驳回 / 作废</button>
        <button onClick={() => onAction(record.id, 'confirmed', formData)} className="flex-2 py-6 bg-blue-600 text-white font-black rounded-[32px] shadow-2xl shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-1 transition-all uppercase tracking-[3px] text-[12px]">核实无误 · 归档入库</button>
      </div>
    </div>
  );
}

function InputCell({ label, value, onChange, placeholder, disabled, type, textarea }: any) {
  return (
    <div className="space-y-3">
      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">{label}</label>
      {textarea ? (
        <textarea className="w-full bg-white border-2 border-slate-100 rounded-[28px] px-8 py-6 text-sm font-bold focus:border-blue-500 focus:ring-8 ring-blue-50 outline-none transition-all h-40 resize-none shadow-sm" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
      ) : (
        <input disabled={disabled} type={type || 'text'} className={`w-full bg-white border-2 border-slate-100 rounded-[28px] px-8 py-5 text-sm font-bold focus:border-blue-500 focus:ring-8 ring-blue-50 outline-none transition-all shadow-sm ${disabled ? 'bg-slate-50 cursor-not-allowed opacity-50' : ''}`} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  );
}
