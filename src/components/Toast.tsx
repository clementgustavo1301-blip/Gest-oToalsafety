import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import type { ToastItem } from '../types';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(toast => {
        const icon =
          toast.type === 'success' ? <CheckCircle2 size={18} className="text-emerald" /> :
          toast.type === 'warning' ? <AlertTriangle size={18} className="text-amber" /> :
          toast.type === 'error' ? <AlertCircle size={18} className="text-rose" /> :
          <Info size={18} className="text-cyan" />;

        return (
          <div key={toast.id} className={`toast toast-${toast.type}`} role="alert">
            <div className="toast-icon-wrap">{icon}</div>
            <div className="toast-content">{toast.message}</div>
            <button
              className="toast-close"
              onClick={() => onDismiss(toast.id)}
              aria-label="Fechar notificação"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
