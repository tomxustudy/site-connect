import React from 'react';
import { Box } from 'lucide-react';

interface NavItemProps {
  active: boolean;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
  onClick: () => void;
}

export function NavItem({ active, label, icon, badge, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${active ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
    >
      <div className="flex items-center gap-3">
        {icon || <Box size={20} />}
        <span className="font-medium text-sm">{label}</span>
      </div>
      {badge !== undefined && badge > 0 && (
        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{badge}</span>
      )}
    </button>
  );
}
