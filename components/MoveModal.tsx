import React, { useState, useMemo } from 'react';
import { FolderOpen, ArrowRightCircle, X } from 'lucide-react';
import { Folder } from '../types';

interface MoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (newFolderId: string) => void;
  itemName: string;
  currentFolderId?: string;
  folders: Folder[];
  isLoading?: boolean;
}

export const MoveModal: React.FC<MoveModalProps> = ({ 
  isOpen, 
  onClose, 
  onMove, 
  itemName, 
  currentFolderId,
  folders,
  isLoading = false
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>(currentFolderId || '');

  const folderOptions = useMemo(() => {
    const getFullPath = (folder: Folder): string => {
        if (!folder.parentId) return folder.label;
        const parent = folders.find(f => f.id === folder.parentId);
        return parent ? `${getFullPath(parent)} / ${folder.label}` : folder.label;
    };

    return folders.map(f => ({
        id: f.id,
        label: f.label,
        fullPath: getFullPath(f)
    })).sort((a, b) => a.fullPath.localeCompare(b.fullPath));
  }, [folders]);

  const handleSubmit = () => {
    if (selectedFolderId && selectedFolderId !== currentFolderId) {
        onMove(selectedFolderId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 dark:border-zinc-800">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-950">
          <div className="flex items-center space-x-2">
            <ArrowRightCircle className="text-blue-600 dark:text-amber-500" size={20} />
            <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100">
              Pindahkan Arsip
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
        <div className="p-6">
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-2">
                Pilih folder tujuan untuk dokumen:
            </p>
            <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200 bg-gray-50 dark:bg-zinc-800 p-2 rounded-lg border border-gray-100 dark:border-zinc-700 mb-4 line-clamp-1">
                "{itemName}"
            </p>

            <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Folder Tujuan</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FolderOpen size={16} className="text-gray-400" />
                </div>
                <select 
                    className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 dark:text-zinc-100 disabled:opacity-50 appearance-none text-sm"
                    value={selectedFolderId}
                    disabled={isLoading}
                    onChange={e => setSelectedFolderId(e.target.value)}
                >
                    <option value="" disabled>-- Pilih Folder --</option>
                    {folderOptions.map(opt => (
                        <option key={opt.id} value={opt.id} disabled={opt.id === currentFolderId}>
                            {opt.fullPath} {opt.id === currentFolderId ? '(Folder Saat Ini)' : ''}
                        </option>
                    ))}
                </select>
            </div>
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
            onClick={handleSubmit}
            disabled={isLoading || !selectedFolderId || selectedFolderId === currentFolderId}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-amber-500 dark:text-blue-900 dark:hover:bg-amber-400 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Memindahkan...' : 'Pindahkan'}
          </button>
        </div>
      </div>
    </div>
  );
};