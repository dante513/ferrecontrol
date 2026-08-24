import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

// Notificación flotante para errores, éxitos y advertencias.
// Se cierra sola a los 5s si no se descarta antes (autoDismiss desactivable con la prop).
export const StatusAlert = ({ type = 'error', message, onClose, autoDismiss = true }) => {
  useEffect(() => {
    if (!autoDismiss) return;
    const timer = setTimeout(() => onClose && onClose(), 5000);
    return () => clearTimeout(timer);
  }, [message, autoDismiss, onClose]);

  const styles = {
    error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
    success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300',
  };

  const icons = {
    error: <AlertCircle className="w-5 h-5" aria-hidden="true" />,
    success: <CheckCircle2 className="w-5 h-5" aria-hidden="true" />,
    warning: <Info className="w-5 h-5" aria-hidden="true" />,
  };

  return (
    <div role="alert" className={`fixed bottom-4 right-4 flex items-center gap-3 p-4 rounded-xl border shadow-lg z-[200] max-w-sm animate-in fade-in slide-in-from-bottom-2 ${styles[type]}`}>
      {icons[type]}
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} aria-label="Cerrar notificación" className="ml-2 hover:opacity-70 transition-opacity">
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
};
