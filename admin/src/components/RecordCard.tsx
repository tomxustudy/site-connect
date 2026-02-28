import React from 'react';
import { Box, User } from 'lucide-react';
import { SiteRecord } from '../types';
import { getAdminLabel } from '../ui-labels';

interface RecordCardProps {
  record: SiteRecord;
  active: boolean;
  onClick: () => void;
}

export function RecordCard({ record, active, onClick }: RecordCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white p-4 rounded-xl border transition-all cursor-pointer flex gap-5 items-start group ${active ? 'border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500' : 'border-slate-100 hover:border-blue-300 hover:shadow-md'}`}
    >
      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
        {record.image_url ? (
          <img src={record.image_url} className="w-full h-full object-cover" alt="" />
        ) : (
          <Box size={32} className="text-slate-200" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`px-2 py-0.5 rounded text-[10px] text-white font-bold ${record.type === 'person' ? 'bg-blue-500' : 'bg-orange-500'}`}>
            {record.type === 'person' ? getAdminLabel('typePerson') : getAdminLabel('typeMaterial')}
          </span>
          <h3 className="font-bold text-slate-900 text-base">{record.tags?.[0] || '未分类记录'}</h3>
          <span className="text-xs text-slate-400 font-medium">| {record.site_name}</span>
        </div>
        <p className="text-slate-600 text-sm mb-3 line-clamp-1">{record.description || '无详细描述...'}</p>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1"><User size={12} /> {record.recorder_name || '-'}</span>
        </div>
      </div>
    </div>
  );
}
