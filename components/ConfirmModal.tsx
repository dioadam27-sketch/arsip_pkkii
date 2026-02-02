import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  itemName,
  isLoading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 dark:border-zinc-800 transform transition-all scale-100">
        
        {/* Header */}
        <div className="p-5 flex items-start space-x-4">
          <div className="flex-shrink-0 bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100">
              {title}
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                {message}
              </p>
              {itemName && (
                <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-zinc-200 bg-gray-50 dark:bg-zinc-800 p-2 rounded-lg border border-gray-100 dark:border-zinc-700">
                  "{itemName}"
                </p>
              )}
              <p className="mt-3 text-xs text-red-500 font-medium">
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-zinc-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 dark:bg-zinc-950 px-5 py-4 flex justify-end space-x-3 border-t border-gray-100 dark:border-zinc-800">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Menghapus...' : 'Ya, Hapus Permanen'}
          </button>
        </div>
      </div>
    </div>
  );
};