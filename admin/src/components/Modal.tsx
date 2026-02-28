import React from 'react';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  hideCloseButton?: boolean;
}

export function Modal({ title, children, onClose, hideCloseButton }: ModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          {!hideCloseButton && <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><Box /></button>}
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
