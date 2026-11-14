import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    full: 'max-w-7xl'
  }[size] || 'max-w-xl';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div
          className={`relative transform overflow-hidden rounded-2xl text-left shadow-2xl transition-all sm:my-8 w-full ${sizeClasses} border`}
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderColor: 'var(--theme-card-border)',
            color: 'var(--theme-text-primary)'
          }}
        >
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{
              backgroundColor: 'var(--theme-table-header-bg)',
              borderColor: 'var(--theme-border-subtle)'
            }}
          >
            <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
