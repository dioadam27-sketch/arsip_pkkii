import React, { useState, useEffect } from 'react';
import { Pencil, X } from 'lucide-react';

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (newTitle: string) => void;
  currentTitle: string;
  isLoading?: boolean;
}

export const RenameModal: React.FC<RenameModalProps> = ({ 
  isOpen, 
  onClose, 
  onRename, 
  currentTitle, 
  isLoading = false
}) => {
  const [newTitle, setNewTitle] = useState(currentTitle);

  useEffect(() => {
    if (isOpen) {
        setNewTitle(currentTitle);
    }
  }, [isOpen, currentTitle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim() && newTitle !== currentTitle) {
        onRename(newTitle.trim());
    } else if (newTitle === currentTitle) {
        onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 dark:border-zinc-800">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-950">
          <div className="flex items-center space-x-2">
            <Pencil className="text-blue-600 dark:text-amber-500" size={20} />
            <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100">
              Ubah Nama Arsip
            </h3>
          </div>
          <button 
            onClick={onClose} 
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-zinc-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
            <div className="p-6">
                <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                    Judul Dokumen
                </label>
                <input
                    autoFocus
                    type="text"
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 dark:text-zinc-100 text-sm"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    disabled={isLoading}
                    placeholder="Masukkan judul baru..."
                />
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 dark:bg-zinc-950 px-5 py-4 flex justify-end space-x-3 border-t border-gray-100 dark:border-zinc-800">
            <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors disabled:opacity-50"
            >
                Batal
            </button>
            <button
                type="submit"
                disabled={isLoading || !newTitle.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-amber-500 dark:text-blue-900 dark:hover:bg-amber-400 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? 'Menyimpan...' : 'Simpan'}
            </button>
            </div>
        </form>
      </div>
    </div>
  );
};