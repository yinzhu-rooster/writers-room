'use client';

import { createContext, useContext, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { Toast } from './Toast';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface ToastContextValue {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(0);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = nextIdRef.current++;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext value={contextValue}>
      {children}
      <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col-reverse gap-2 items-center pointer-events-none">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
