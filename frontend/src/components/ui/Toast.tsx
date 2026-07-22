import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────── */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

/* ── Context ────────────────────────────────────────────────── */
const ToastContext = createContext<ToastContextValue | null>(null);

/* ── Provider ───────────────────────────────────────────────── */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<(Toast & { leaving?: boolean })[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timers.current.delete(id);
    }, 250);
  }, []);

  const toast = useCallback((opts: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = opts.duration ?? 4000;

    setToasts(prev => [...prev.slice(-4), { ...opts, id }]); // max 5 toasts

    if (duration > 0) {
      const timer = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
    }

    return id;
  }, [dismiss]);

  const success = useCallback((title: string, message?: string) => toast({ type: 'success', title, message }), [toast]);
  const error   = useCallback((title: string, message?: string) => toast({ type: 'error',   title, message }), [toast]);
  const info    = useCallback((title: string, message?: string) => toast({ type: 'info',    title, message }), [toast]);
  const warning = useCallback((title: string, message?: string) => toast({ type: 'warning', title, message }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

/* ── Hook ───────────────────────────────────────────────────── */
export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

/* ── Icons ──────────────────────────────────────────────────── */
const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={16} color="var(--color-success)" />,
  error:   <XCircle     size={16} color="var(--color-danger)" />,
  info:    <Info        size={16} color="var(--accent-hover)" />,
  warning: <AlertCircle size={16} color="var(--color-warning)" />,
};

/* ── Container ──────────────────────────────────────────────── */
const ToastContainer: React.FC<{
  toasts: (Toast & { leaving?: boolean })[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`toast toast-${t.type}${t.leaving ? ' toast-leaving' : ''}`}
        >
          <span className="toast-icon flex-shrink-0">{TOAST_ICONS[t.type]}</span>
          <div className="toast-content">
            <div className="toast-title">{t.title}</div>
            {t.message && <div className="toast-message">{t.message}</div>}
          </div>
          <button
            className="btn-icon btn-icon-sm"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss notification"
            style={{ marginTop: 1, color: 'var(--text-tertiary)', flexShrink: 0 }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
};
