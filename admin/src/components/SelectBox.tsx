import React from 'react';

interface SelectBoxProps {
  value: string;
  onChange: (v: string) => void;
  options: { name: string; label?: string }[];
  label?: string;
}

export function SelectBox({ value, onChange, options, label }: SelectBoxProps) {
  return (
    <div className="mb-3">
      {label && <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>}
      <select
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(o => <option key={o.name} value={o.name}>{o.label || o.name}</option>)}
      </select>
    </div>
  );
}
