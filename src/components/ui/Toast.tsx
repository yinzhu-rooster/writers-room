'use client';

import { useEffect, useState, useRef } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
}

export function Toast({ message, type = 'success', onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onCloseRef.current(), 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const bgColor = type === 'error' ? 'bg-red-600' : 'bg-green-600';

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className={`rounded-lg px-4 py-2.5 text-sm text-white shadow-lg transition-opacity duration-300 pointer-events-auto ${bgColor} ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {message}
    </div>
  );
}
