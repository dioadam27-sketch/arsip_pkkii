import React, { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 4000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className={`fixed top-4 right-4 md:top-6 md:right-6 z-[80] flex items-start p-4 rounded-xl shadow-2xl border animate-in slide-in-from-right-10 fade-in duration-300 max-w-sm backdrop-blur-md ${
      type === 'success' 
        ? 'bg-green-50/95 dark:bg-green-900/90 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100' 
        : 'bg-red-50/95 dark:bg-red-900/90 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100'
    }`}>
      <div className="flex-shrink-0 mt-0.5">
        {type === 'success' ? (
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
        ) : (
          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
        )}
      </div>
      <div className="ml-3 flex-1 mr-4">
        <h3 className="text-sm font-bold">
            {type === 'success' ? 'Berhasil!' : 'Gagal'}
        </h3>
        <p className="text-sm mt-1 opacity-90 leading-snug">
            {message}
        </p>
      </div>
      <button 
        onClick={onClose} 
        className={`p-1 rounded-full transition-colors ${
            type === 'success' 
            ? 'hover:bg-green-200 dark:hover:bg-green-800 text-green-700 dark:text-green-300' 
            : 'hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-300'
        }`}
      >
        <X size={16} />
      </button>
    </div>
  );
};