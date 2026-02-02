import React, { useState } from 'react';
import { Library, FileText, Bookmark, Clock, FolderOpen, LogOut, X, Plus, Check, ChevronRight, ChevronDown, Sun, Moon, Trash2 } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface SidebarProps {
  currentFilter: string;
  setFilter: (filter: string) => void;
  onLogout?: () => void;
  isOpen: boolean;
  onClose: () => void;
  folders: { id: string, label: string, parentId?: string | null }[];
  onAddFolder: (name: string, parentId?: string | null) => void;
  onDeleteFolder: (id: string) => void;
  userRole: 'admin' | 'guest';
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentFilter, setFilter, onLogout, isOpen, onClose, folders, onAddFolder, onDeleteFolder, userRole, theme, toggleTheme }) => {
  const [addingToParentId, setAddingToParentId] = useState<string | null | undefined>(undefined); 
  const [newFolderName, setNewFolderName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  // State for delete confirmation
  const [folderToDelete, setFolderToDelete] = useState<{id: string, label: string} | null>(null);

  const categories = [
    { id: 'all', label: 'Semua Arsip', icon: Library },
    { id: 'recent', label: 'Baru Ditambahkan', icon: Clock },
    { id: 'favorites', label: 'Ditandai Penting', icon: Bookmark },
  ];

  const handleLinkClick = (id: string) => {
    setFilter(id);
    onClose(); 
  };

  const startAddingFolder = (parentId: string | null = null) => {
    setAddingToParentId(parentId);
    setNewFolderName('');
    if (parentId) {
        setExpandedFolders(prev => new Set(prev).add(parentId));
    }
  };

  const requestDeleteFolder = (e: React.MouseEvent, id: string, label: string) => {
    e.stopPropagation();
    setFolderToDelete({ id, label });
  };

  const confirmDeleteFolder = () => {
    if (folderToDelete) {
        onDeleteFolder(folderToDelete.id);
        setFolderToDelete(null);
    }
  };

  const submitNewFolder = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newFolderName.trim()) {
        onAddFolder(newFolderName.trim(), addingToParentId === undefined ? null : addingToParentId);
        setNewFolderName('');
        setAddingToParentId(undefined);
    } else {
        setAddingToParentId(undefined); // Cancel if empty
    }
  };

  const toggleExpand = (folderId: string) => {
    setExpandedFolders(prev => {
        const next = new Set(prev);
        if (next.has(folderId)) {
            next.delete(folderId);
        } else {
            next.add(folderId);
        }
        return next;
    });
  };

  // Recursive folder renderer with improved visuals
  const renderFolders = (parentId: string | null, depth = 0) => {
    const currentLevelFolders = folders.filter(f => f.parentId === parentId);
    
    const isAddingHere = addingToParentId === parentId;

    if (currentLevelFolders.length === 0 && !isAddingHere) return null;

    return (
        <div className={`space-y-1 ${
            depth > 0 
            ? 'ml-3 pl-3 border-l-2 border-gray-100 dark:border-zinc-800' // Improved hierarchy line
            : ''
        }`}>
            {currentLevelFolders.map(folder => {
                const hasChildren = folders.some(f => f.parentId === folder.id);
                const isExpanded = expandedFolders.has(folder.id);
                const isActive = currentFilter === folder.id;

                return (
                    <div key={folder.id}>
                        <div className={`flex items-center justify-between group rounded-lg transition-all duration-200 ${isActive ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-zinc-900'}`}>
                            <button
                                onClick={() => handleLinkClick(folder.id)}
                                className={`flex-1 flex items-center space-x-2 px-3 py-2 text-sm ${
                                    isActive 
                                    ? 'text-blue-700 dark:text-amber-400 font-bold' 
                                    : depth === 0 ? 'text-gray-700 dark:text-zinc-300 font-semibold' : 'text-gray-600 dark:text-zinc-400 font-medium'
                                }`}
                            >
                                <FolderOpen 
                                    size={depth === 0 ? 18 : 16} 
                                    className={`transition-colors ${isActive ? 'text-blue-700 dark:text-amber-400' : 'text-gray-400 dark:text-zinc-600 group-hover:text-amber-500'}`} 
                                    fill={isActive ? "currentColor" : "none"}
                                />
                                <span className="truncate">{folder.label}</span>
                            </button>
                            
                            <div className="flex items-center pr-2 opacity-0 group-hover:opacity-100 transition-opacity space-x-1">
                                {userRole === 'admin' && (
                                    <>
                                        <button
                                            onClick={(e) => requestDeleteFolder(e, folder.id, folder.label)}
                                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-gray-400 hover:text-red-500 transition-colors"
                                            title="Hapus Folder"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); startAddingFolder(folder.id); }}
                                            className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded text-gray-400 hover:text-blue-600 dark:hover:text-amber-500 transition-colors"
                                            title="Buat Sub-folder"
                                        >
                                            <Plus size={13} />
                                        </button>
                                    </>
                                )}
                                {hasChildren && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleExpand(folder.id); }}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded text-gray-500 dark:text-zinc-500"
                                    >
                                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </button>
                                )}
                            </div>
                        </div>
                        {/* Recursive Call for Children */}
                        {(hasChildren || addingToParentId === folder.id) && isExpanded && (
                            <div className="mt-1 animate-in slide-in-from-top-1 duration-200">
                                {renderFolders(folder.id, depth + 1)}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Input Form for New Folder at this level */}
            {isAddingHere && (
                 <form onSubmit={submitNewFolder} className="px-2 mb-2 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="flex items-center space-x-2">
                        <input 
                            autoFocus
                            type="text" 
                            className="w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:border-amber-500 focus:outline-none placeholder-gray-500"
                            placeholder="Nama Folder..."
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onBlur={() => !newFolderName && setAddingToParentId(undefined)}
                        />
                        <button 
                            type="submit"
                            className="p-1.5 bg-amber-500 text-blue-900 rounded hover:bg-amber-400"
                        >
                            <Check size={12} />
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
  };

  return (
    <>
      <ConfirmModal 
        isOpen={!!folderToDelete}
        onClose={() => setFolderToDelete(null)}
        onConfirm={confirmDeleteFolder}
        title="Hapus Folder?"
        message="Apakah Anda yakin ingin menghapus folder ini beserta seluruh strukturnya?"
        itemName={folderToDelete?.label}
      />

      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-white dark:bg-black text-gray-500 dark:text-zinc-400 border-r border-gray-200 dark:border-zinc-800 shadow-xl z-50
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0
      `}>
        {/* Header Logo */}
        <div className="p-6 flex items-start justify-between border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-start space-x-3">
             <img 
               src="https://ppk2ipe.unair.ac.id/gambar/UNAIR_BRANDMARK_2025-02.png" 
               alt="UNAIR Logo" 
               className="h-10 w-auto object-contain mt-1"
             />
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-gray-900 dark:text-zinc-100 tracking-tight text-base">Repo PKKII</h1>
              <p className="text-[10px] leading-tight text-gray-500 dark:text-zinc-500 mt-1">Universitas Airlangga</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="md:hidden text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800">
          {/* Main Nav */}
          <div className="p-4 space-y-1">
            <p className="text-xs font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-wider mb-2 px-2">Menu Utama</p>
            {categories.map((item) => {
              const Icon = item.icon;
              const isActive = currentFilter === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleLinkClick(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all font-medium border border-transparent ${
                    isActive 
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-amber-400 border-blue-200 dark:border-amber-500/20 shadow-sm dark:shadow-[0_0_15px_rgba(251,191,36,0.1)]' 
                      : 'hover:bg-gray-100 dark:hover:bg-zinc-900 hover:text-gray-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-blue-700 dark:text-amber-400' : 'text-gray-400 dark:text-zinc-500'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Folders/Types */}
          <div className="p-4 pt-2">
            <div className="flex items-center justify-between px-2 mb-2">
                <p className="text-xs font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-wider">Arsip Dokumen</p>
                {userRole === 'admin' && (
                    <button 
                        onClick={() => startAddingFolder(null)}
                        className="p-1 text-gray-400 dark:text-zinc-500 hover:text-blue-600 dark:hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded transition-colors"
                        title="Buat Folder Root Baru"
                    >
                        <Plus size={14} />
                    </button>
                )}
            </div>
            
            {/* Folder Tree */}
            <div className="mt-1">
                {renderFolders(null)}
            </div>
          </div>
        </div>
        
        {/* Footer / Theme & Logout */}
        <div className="p-4 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-black space-y-2">
           <button
             onClick={toggleTheme}
             className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-200 dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 hover:bg-gray-300 dark:hover:bg-zinc-800 transition-colors text-sm font-medium"
           >
              <div className="flex items-center space-x-2">
                  {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                  <span>{theme === 'dark' ? 'Mode Gelap' : 'Mode Terang'}</span>
              </div>
           </button>

           {onLogout && (
              <button 
                  onClick={onLogout}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 text-gray-500 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition-colors font-medium"
              >
                  <LogOut size={18} />
                  <span>Keluar {userRole === 'guest' ? '(Tamu)' : ''}</span>
              </button>
           )}
        </div>
      </div>
    </>
  );
};