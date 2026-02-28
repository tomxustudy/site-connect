import React from 'react';

interface InputCellProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
  textarea?: boolean;
}

export function InputCell({ label, value, onChange, placeholder, disabled, type, textarea }: InputCellProps) {
  const baseClass = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {textarea ? (
        <textarea
          className={`${baseClass} min-h-[80px] resize-none`}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      ) : (
        <input
          type={type || 'text'}
          className={baseClass}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      )}
    </div>
  );
}
