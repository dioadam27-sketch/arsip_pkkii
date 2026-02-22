import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { LetterForm } from './components/LetterForm'; 
import { LoginPage } from './components/LoginPage';
import { ConfirmModal } from './components/ConfirmModal';
import { ConfigModal } from './components/ConfigModal'; 
import { MoveModal } from './components/MoveModal';
import { RenameModal } from './components/RenameModal';
import { Toast, ToastProps } from './components/Toast'; // Import Toast
import { ArchiveDocument, Folder } from './types';
import { Search, Plus, FileText, Download, MoreVertical, Calendar, Tag, Filter, Clock, Scroll, Loader2, RefreshCw, AlertCircle, Menu, Wifi, WifiOff, Trash2, Eye, Folder as FolderIcon, Lock, Unlock, EyeOff, FolderInput, ArrowLeft, Bookmark, Pencil } from 'lucide-react';
import { fetchAllData, createFolder, deleteArchive, deleteFolder, renameFolder, toggleVisibility, moveArchive, renameArchive } from './services/storageService';

export default function App() {
  // Session State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'guest'>('guest');
  const [isSessionChecking, setIsSessionChecking] = useState(true);

  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // UI State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false); 

  // Toast State
  const [toast, setToast] = useState<Pick<ToastProps, 'message' | 'type'> | null>(null);

  // Data State
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [documents, setDocuments] = useState<ArchiveDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Delete State
  const [archiveToDelete, setArchiveToDelete] = useState<{id: string, judul: string} | null>(null);
  
  // Move State
  const [archiveToMove, setArchiveToMove] = useState<ArchiveDocument | null>(null);
  
  // Rename State
  const [archiveToRename, setArchiveToRename] = useState<ArchiveDocument | null>(null);

  // Loading & Sync State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Use Ref to track last updated time without triggering re-renders in useEffect dependencies
  const lastUpdatedRef = useRef<Date | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null); // For UI display only
  
  const [error, setError] = useState<string | null>(null);
  
  // Initialize Theme and Session
  useEffect(() => {
    // Session Check
    const session = localStorage.getItem('pkkii_session');
    const role = localStorage.getItem('pkkii_role') as 'admin' | 'guest';
    if (session === 'active') {
        setIsLoggedIn(true);
        if (role) setUserRole(role);
    }
    
    // Theme Check
    const savedTheme = localStorage.getItem('pkkii_theme') as 'dark' | 'light';
    if (savedTheme) {
        setTheme(savedTheme);
    } else {
        setTheme('dark'); 
    }

    setIsSessionChecking(false);
  }, []);

  // Apply Theme to HTML element
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
    localStorage.setItem('pkkii_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleLogin = (role: 'admin' | 'guest') => {
    localStorage.setItem('pkkii_session', 'active');
    localStorage.setItem('pkkii_role', role);
    setUserRole(role);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('pkkii_session');
    localStorage.removeItem('pkkii_role');
    setIsLoggedIn(false);
    setUserRole('guest');
    setCurrentFilter('all');
    setSearchQuery('');
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  // --- DATA LOADING LOGIC ---

  const loadData = async (showLoadingSpinner = true) => {
    if (!isLoggedIn) return; 

    if (showLoadingSpinner) {
        setIsLoading(true);
        setError(null);
    } else {
        setIsSyncing(true);
    }

    try {
        const data = await fetchAllData();
        
        // Update State
        setDocuments(data.archives || []);
        if (data.folders) {
            setFolders(data.folders);
        }
        
        const now = new Date();
        setLastUpdated(now);
        lastUpdatedRef.current = now; 
        
        // Clear error if success
        if (error) setError(null);

    } catch (error) {
        console.error("Error loading data:", error);
        const errMsg = error instanceof Error ? error.message : "Gagal memuat data.";
        if (showLoadingSpinner) {
             setError(errMsg);
        } else {
             showToast(errMsg, "error");
        }
    } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsSyncing(false);
    }
  };

  // 1. Initial Load & Smart Sync (Refetch on Focus)
  useEffect(() => {
    if (isLoggedIn) {
        loadData(true);

        const onFocus = () => {
            const now = new Date();
            const lastTime = lastUpdatedRef.current;
            if (!lastTime || (now.getTime() - lastTime.getTime() > 60000)) {
                console.log("App focused, refreshing data...");
                loadData(false); 
            }
        };

        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', () => {
             if (document.visibilityState === 'visible') onFocus();
        });

        return () => {
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onFocus);
        };
    }
  }, [isLoggedIn]); 

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(true);
  };

  // --- FILTER VISIBILITY LOGIC ---
  // Guest should NOT see Private folders/docs
  const visibleFolders = useMemo(() => {
    if (userRole === 'admin') return folders;
    return folders.filter(f => f.visibility !== 'private');
  }, [folders, userRole]);

  const visibleDocuments = useMemo(() => {
    if (userRole === 'admin') return documents;
    return documents.filter(d => d.visibility !== 'private');
  }, [documents, userRole]);


  // --- ACTION HANDLERS ---

  const handleAddFolder = async (name: string, parentId: string | null = null, visibility: 'public' | 'private' = 'public') => {
    const newId = name.toUpperCase().replace(/\s+/g, '_') + '_' + Date.now().toString().slice(-4);
    
    const siblings = visibleFolders.filter(f => f.parentId === parentId);
    if (siblings.some(f => f.label.toLowerCase() === name.toLowerCase())) {
        alert("Folder dengan nama ini sudah ada di lokasi tersebut.");
        return;
    }

    const newFolder: Folder = { id: newId, label: name, parentId, visibility };
    
    // Optimistic Update
    setFolders(prev => [...prev, newFolder]);

    try {
        setIsSyncing(true);
        await createFolder(newFolder);
        loadData(false); 
        showToast(`Folder "${name}" berhasil dibuat`, 'success');
    } catch (e) {
        showToast("Gagal menyimpan folder ke server.", 'error');
        console.error(e);
        loadData(false); // Revert on error
    } finally {
        setIsSyncing(false);
    }
  };

  const handleRenameFolder = async (id: string, newName: string) => {
      // Optimistic update
      setFolders(prev => prev.map(f => f.id === id ? { ...f, label: newName } : f));
      
      try {
          setIsSyncing(true);
          await renameFolder(id, newName);
          loadData(false);
          showToast(`Nama folder berhasil diubah menjadi "${newName}"`, 'success');
      } catch (e) {
          showToast("Gagal mengubah nama folder di server.", 'error');
          loadData(false); // Revert
      } finally {
          setIsSyncing(false);
      }
  };

  const handleToggleVisibility = async (id: string, type: 'folder' | 'archive', current: 'public' | 'private') => {
      // Optimistic Update
      const newVisibility = current === 'public' ? 'private' : 'public';
      
      if (type === 'folder') {
          setFolders(prev => prev.map(f => f.id === id ? { ...f, visibility: newVisibility } : f));
      } else {
          setDocuments(prev => prev.map(d => d.id === id ? { ...d, visibility: newVisibility } : d));
      }

      try {
          setIsSyncing(true);
          await toggleVisibility(id, type, current);
          showToast(`Status akses diubah ke ${newVisibility === 'public' ? 'Publik' : 'Privat'}`, 'success');
          loadData(false);
      } catch (e) {
          showToast("Gagal mengubah status di server.", 'error');
          loadData(false); // Revert
      } finally {
          setIsSyncing(false);
      }
  };

  const handleDeleteFolder = async (id: string) => {
      const hasChildren = folders.some(f => f.parentId === id);
      if (hasChildren) {
          alert("Folder tidak bisa dihapus karena masih memiliki sub-folder.");
          return;
      }

      setFolders(prev => prev.filter(f => f.id !== id));

      try {
          setIsSyncing(true);
          await deleteFolder(id);
          // Silent update
          loadData(false);
          showToast("Folder berhasil dihapus", 'success');
      } catch (e) {
          showToast("Gagal menghapus folder di server.", 'error');
          loadData(false); 
      } finally {
          setIsSyncing(false);
      }
  };

  // Called when Upload Form Submits Successfully
  const handleAddArchive = (data: Partial<ArchiveDocument> & { folderId?: string }) => {
    setShowAddModal(false);
    
    // Determine folder name for the notification
    let folderName = 'Folder';
    if (data.folderId) {
        const folder = folders.find(f => f.id === data.folderId);
        if (folder) folderName = folder.label;
    }

    showToast(`Dokumen berhasil disimpan ke folder "${folderName}".`, 'success');
    
    setIsRefreshing(true);
    setTimeout(() => {
        loadData(true);
    }, 1000);
  };

  const requestDeleteArchive = (e: React.MouseEvent, id: string, judul: string) => {
      e.stopPropagation();
      setArchiveToDelete({ id, judul });
  }

  const confirmDeleteArchive = async () => {
      if (!archiveToDelete) return;
      
      const id = archiveToDelete.id;
      setArchiveToDelete(null); 

      setDocuments(prev => prev.filter(d => d.id !== id));

      try {
          setIsSyncing(true);
          await deleteArchive(id);
          loadData(false);
          showToast("Arsip berhasil dihapus secara permanen.", 'success');
      } catch (e) {
          showToast("Gagal menghapus arsip di server.", 'error');
          loadData(false);
      } finally {
          setIsSyncing(false);
      }
  }

  const confirmMoveArchive = async (newFolderId: string) => {
      if (!archiveToMove) return;

      const targetFolder = folders.find(f => f.id === newFolderId);
      const targetFolderName = targetFolder ? targetFolder.label : 'Baru';

      // Optimistic Update
      const movedArchive = archiveToMove;
      setArchiveToMove(null);

      setDocuments(prev => prev.map(d => 
          d.id === movedArchive.id 
          ? { ...d, folderId: newFolderId, kategori: targetFolderName } 
          : d
      ));

      try {
          setIsSyncing(true);
          await moveArchive(movedArchive.id, newFolderId);
          showToast(`Berhasil dipindahkan ke "${targetFolderName}"`, 'success');
          loadData(false);
      } catch (e) {
          showToast("Gagal memindahkan arsip.", 'error');
          loadData(false); // Revert
      } finally {
          setIsSyncing(false);
      }
  };

  const confirmRenameArchive = async (newTitle: string) => {
      if (!archiveToRename) return;

      const id = archiveToRename.id;
      setArchiveToRename(null);

      // Optimistic Update
      setDocuments(prev => prev.map(d => 
          d.id === id ? { ...d, judul: newTitle } : d
      ));

      try {
          setIsSyncing(true);
          await renameArchive(id, newTitle);
          showToast("Nama arsip berhasil diubah.", 'success');
      } catch (e) {
          showToast("Gagal mengubah nama arsip.", 'error');
          loadData(false); // Revert
      } finally {
          setIsSyncing(false);
      }
  };

  const getDownloadUrl = (url: string) => {
    if (!url) return '';
    const match = url.match(/\/d\/(.+?)\//);
    if (match && match[1]) {
        return `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }
    return url;
  };

  // --- FILTER LOGIC FOR DISPLAY ---
  const currentSubfolders = useMemo(() => {
     if (currentFilter === 'all' || currentFilter === 'recent' || currentFilter === 'favorites') {
         return [];
     }
     return visibleFolders.filter(f => f.parentId === currentFilter);
  }, [visibleFolders, currentFilter]);

  const filteredDocs = useMemo(() => {
    let data = visibleDocuments;

    // Category Filter
    if (currentFilter !== 'all' && currentFilter !== 'recent' && currentFilter !== 'favorites') {
        const activeFolder = visibleFolders.find(f => f.id === currentFilter);
        if (activeFolder) {
            const getDescendantIds = (parentId: string): string[] => {
                const children = visibleFolders.filter(f => f.parentId === parentId);
                let ids = children.map(c => c.id);
                children.forEach(c => ids = [...ids, ...getDescendantIds(c.id)]);
                return ids;
            };

            const targetIds = [activeFolder.id, ...getDescendantIds(activeFolder.id)];
            const targetLabels = [activeFolder.label]; 

            data = data.filter(d => {
                if (d.folderId && targetIds.includes(d.folderId)) {
                    return true;
                }
                if (!d.folderId && targetLabels.includes(d.kategori)) {
                    return true;
                }
                return false;
            });
        }
    }

    // Search (Safe guarded against null/undefined)
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        data = data.filter(d => 
            String(d.judul || '').toLowerCase().includes(q) || 
            String(d.nomorDokumen || '').toLowerCase().includes(q) ||
            (Array.isArray(d.tags) && d.tags.some(t => String(t || '').toLowerCase().includes(q)))
        );
    }

    return data;
  }, [visibleDocuments, visibleFolders, currentFilter, searchQuery]);

  // Determine active folder object for navigation logic
  const activeFolder = visibleFolders.find(f => f.id === currentFilter);

  // --- RENDER ---
  if (isSessionChecking) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-300">
             <div className="relative z-10 flex flex-col items-center">
                <div className="mb-8 animate-pulse">
                    <img 
                        src="https://ppk2ipe.unair.ac.id/gambar/UNAIR_BRANDMARK_2025-02.png" 
                        alt="UNAIR Brandmark" 
                        className="w-64 h-auto object-contain drop-shadow-xl"
                    />
                </div>
                <div className="flex items-center space-x-3 text-zinc-500 dark:text-zinc-400">
                    <Loader2 className="animate-spin text-amber-500" size={20} />
                    <span className="text-sm font-medium tracking-wide">MEMUAT APLIKASI...</span>
                </div>
             </div>
        </div>
    );
  }

  if (!isLoggedIn) {
      return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex bg-gray-50 dark:bg-zinc-950 min-h-screen font-sans text-gray-900 dark:text-zinc-100 selection:bg-amber-400 selection:text-blue-900 transition-colors duration-300">
      
      {toast && (
        <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
        />
      )}

      <ConfirmModal 
        isOpen={!!archiveToDelete}
        onClose={() => setArchiveToDelete(null)}
        onConfirm={confirmDeleteArchive}
        title="Hapus Arsip?"
        message="Apakah Anda yakin ingin menghapus arsip dokumen ini secara permanen?"
        itemName={archiveToDelete?.judul}
      />
      
      <MoveModal
        isOpen={!!archiveToMove}
        onClose={() => setArchiveToMove(null)}
        onMove={confirmMoveArchive}
        itemName={archiveToMove?.judul || ''}
        currentFolderId={archiveToMove?.folderId}
        folders={visibleFolders}
        isLoading={isSyncing}
      />

      <RenameModal
        isOpen={!!archiveToRename}
        onClose={() => setArchiveToRename(null)}
        onRename={confirmRenameArchive}
        currentTitle={archiveToRename?.judul || ''}
        isLoading={isSyncing}
      />

      <ConfigModal 
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={() => {
            loadData(true);
            showToast("Konfigurasi API berhasil disimpan.", "success");
        }} 
      />

      <Sidebar 
        currentFilter={currentFilter} 
        setFilter={setCurrentFilter} 
        onLogout={handleLogout}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        folders={visibleFolders} // Use filtered folders
        onAddFolder={handleAddFolder}
        onDeleteFolder={handleDeleteFolder}
        onRenameFolder={handleRenameFolder}
        onToggleVisibility={handleToggleVisibility}
        userRole={userRole}
        theme={theme}
        toggleTheme={toggleTheme}
        onOpenConfig={() => setShowConfigModal(true)} 
      />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden ml-0 md:ml-64 transition-all duration-300">
        
        {/* Top Navigation Bar */}
        <header className="bg-white dark:bg-zinc-900 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between sticky top-0 z-10 transition-colors duration-300">
            <div className="flex-1 max-w-2xl flex items-center gap-3">
                <button 
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="md:hidden p-2 -ml-2 text-gray-500 dark:text-zinc-400 hover:text-blue-700 dark:hover:text-amber-400 rounded-lg"
                >
                  <Menu size={24} />
                </button>

                <img 
                  src="https://pkkii.pendidikan.unair.ac.id/website/logo.jpeg" 
                  alt="Logo" 
                  className="h-8 w-auto md:hidden" 
                />

                <div className="relative group w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl leading-5 bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 focus:outline-none focus:bg-white dark:focus:bg-black focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-amber-500/50 focus:border-blue-500 dark:focus:border-amber-500 transition-all text-sm"
                        placeholder="Cari arsip..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            
            <div className="flex items-center space-x-2 md:space-x-4 ml-3 md:ml-6">
                <div className="hidden md:flex flex-col items-end mr-2">
                     {isSyncing || isRefreshing ? (
                        <span className="text-xs font-medium text-amber-500 flex items-center animate-pulse">
                            Syncing...
                        </span>
                     ) : (
                         <span className="text-[10px] text-gray-400 dark:text-zinc-600 font-medium">
                            {lastUpdated ? `Update: ${lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Belum sync'}
                         </span>
                     )}
                </div>

                <button 
                    onClick={handleRefresh}
                    className={`p-2 rounded-xl text-gray-500 dark:text-zinc-400 hover:text-blue-700 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                    title="Refresh Data"
                >
                    <RefreshCw size={20} />
                </button>
                
                {userRole === 'admin' && (
                    <button 
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center space-x-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-blue-950 px-3 md:px-5 py-2 md:py-2.5 rounded-xl font-bold shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                    >
                        <Plus size={18} />
                        <span className="hidden md:inline">Upload Arsip</span>
                        <span className="md:hidden">Upload</span>
                    </button>
                )}
                
                <div className="hidden md:block w-px h-8 bg-gray-200 dark:bg-zinc-800 mx-2"></div>
                <div className={`hidden md:flex h-9 w-9 rounded-full items-center justify-center font-extrabold text-sm border-2 border-gray-100 dark:border-zinc-900 shadow-sm ${userRole === 'admin' ? 'bg-blue-900 text-white dark:text-amber-400' : 'bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-white'}`}>
                    {userRole === 'admin' ? 'UA' : 'G'}
                </div>
            </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
            
            {isLoading && !isRefreshing ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 dark:text-zinc-500">
                    <Loader2 size={32} className="animate-spin text-amber-500 mb-2" />
                    <p className="text-sm font-medium">Menyinkronkan Data...</p>
                </div>
            ) : error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 dark:text-red-400 px-4 text-center">
                    <AlertCircle size={48} className="mb-4" />
                    <h3 className="text-xl font-bold mb-2">Gagal Memuat Data</h3>
                    <p className="text-sm mb-6">{error}</p>
                    <button onClick={handleRefresh} className="px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg flex items-center shadow-sm">
                        <RefreshCw size={16} className="mr-2" /> Coba Lagi
                    </button>
                    <p className="mt-4 text-xs text-gray-400 dark:text-zinc-500">
                        Pastikan URL API di konfigurasi sudah benar (Menu Sidebar {'>'} Config).
                    </p>
                </div>
            ) : (
                <>
                    {/* Header Filter Title & Back Button */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 gap-3">
                        <div className="flex items-center min-w-0">
                             {/* Back Button */}
                             {activeFolder && (
                                <button
                                    onClick={() => setCurrentFilter(activeFolder.parentId || 'all')}
                                    className="mr-3 p-2 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-blue-600 dark:hover:text-amber-500 transition-all shadow-sm group"
                                    title={activeFolder.parentId ? "Naik satu level" : "Kembali ke Beranda"}
                                >
                                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                                </button>
                             )}

                            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-zinc-100 flex items-center min-w-0">
                                {activeFolder ? (
                                    <FolderIcon className="mr-3 text-blue-600 dark:text-amber-500 shrink-0" />
                                ) : (
                                    currentFilter === 'recent' ? <Clock className="mr-3 text-green-500 shrink-0" /> :
                                    currentFilter === 'favorites' ? <Bookmark className="mr-3 text-red-500 shrink-0" /> :
                                    <Scroll className="mr-3 text-amber-500 shrink-0" />
                                )}
                                <span className="truncate">
                                    {currentFilter === 'all' ? 'Semua Arsip' : 
                                    currentFilter === 'recent' ? 'Baru Ditambahkan' : 
                                    currentFilter === 'favorites' ? 'Arsip Penting' : 
                                    activeFolder?.label || currentFilter}
                                </span>
                            </h2>
                        </div>
                    </div>
                    
                    {/* SUB-FOLDERS DISPLAY IN MAIN CONTENT */}
                    {currentSubfolders.length > 0 && (
                        <div className="mb-8">
                            <h3 className="text-sm font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider mb-3">Folder</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {currentSubfolders.map(subfolder => (
                                    <button
                                        key={subfolder.id}
                                        onClick={() => setCurrentFilter(subfolder.id)}
                                        className="flex flex-col items-center justify-center p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all group text-center relative"
                                    >
                                        {subfolder.visibility === 'private' && (
                                            <div className="absolute top-2 right-2 text-red-400" title="Folder Privat">
                                                <Lock size={14} />
                                            </div>
                                        )}
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-2 group-hover:bg-white dark:group-hover:bg-zinc-800 transition-colors">
                                            <FolderIcon className="text-blue-600 dark:text-blue-400 group-hover:text-amber-500 transition-colors" size={24} fill="currentColor" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-800 dark:text-zinc-200 line-clamp-2 leading-tight px-1">
                                            {subfolder.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Documents Grid */}
                    {filteredDocs.length > 0 ? (
                        <div>
                             {currentSubfolders.length > 0 && (
                                <h3 className="text-sm font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider mb-3">Dokumen</h3>
                             )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 pb-20 md:pb-10">
                                {filteredDocs.map((doc) => (
                                    <div key={doc.id} className="group bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-5 hover:border-blue-500/30 dark:hover:border-amber-500/50 hover:shadow-lg transition-all duration-300 flex flex-col h-full cursor-default relative">
                                        
                                        {/* Status Indicator (Private) */}
                                        {doc.visibility === 'private' && (
                                            <div className="absolute top-3 left-3 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded text-[10px] font-bold flex items-center border border-red-200 dark:border-red-800 z-10">
                                                <Lock size={10} className="mr-1" /> Privat
                                            </div>
                                        )}

                                        {/* Admin Action Buttons (Top Right) */}
                                        {userRole === 'admin' && (
                                            <div className="absolute top-3 right-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setArchiveToRename(doc); }}
                                                    className="p-1.5 bg-white dark:bg-zinc-800 text-gray-400 hover:text-blue-600 dark:hover:text-amber-500 rounded-lg shadow-sm border border-gray-100 dark:border-zinc-700"
                                                    title="Ubah Nama Arsip"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setArchiveToMove(doc); }}
                                                    className="p-1.5 bg-white dark:bg-zinc-800 text-gray-400 hover:text-blue-600 dark:hover:text-amber-500 rounded-lg shadow-sm border border-gray-100 dark:border-zinc-700"
                                                    title="Pindahkan Arsip"
                                                >
                                                    <FolderInput size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleToggleVisibility(doc.id, 'archive', doc.visibility || 'public'); }}
                                                    className={`p-1.5 rounded-lg shadow-sm border ${
                                                        doc.visibility === 'private' 
                                                        ? 'bg-red-50 dark:bg-red-900/30 text-red-500 border-red-100' 
                                                        : 'bg-white dark:bg-zinc-800 text-gray-400 hover:text-gray-600 border-gray-100 dark:border-zinc-700'
                                                    }`}
                                                    title={doc.visibility === 'private' ? "Ubah ke Publik" : "Ubah ke Privat"}
                                                >
                                                    {doc.visibility === 'private' ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                                <button 
                                                    onClick={(e) => requestDeleteArchive(e, doc.id, doc.judul)}
                                                    className="p-1.5 bg-white dark:bg-zinc-800 text-gray-400 hover:text-red-500 rounded-lg shadow-sm border border-gray-100 dark:border-zinc-700"
                                                    title="Hapus Arsip"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}

                                        {/* Card Content (Click to View) */}
                                        <div className="flex-1 cursor-pointer pt-6" onClick={() => doc.fileUrl && window.open(doc.fileUrl, '_blank')}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`p-3 rounded-xl ${
                                                    doc.kategori.includes('SK') ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' :
                                                    'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500'
                                                }`}>
                                                    <FileText size={24} />
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold tracking-wider uppercase text-gray-400 dark:text-zinc-500 mb-1 block">
                                                    {doc.nomorDokumen}
                                                </span>
                                                <h3 className="font-bold text-gray-900 dark:text-zinc-200 mb-2 line-clamp-2 leading-snug group-hover:text-blue-800 dark:group-hover:text-amber-400 transition-colors text-sm md:text-base">
                                                    {doc.judul}
                                                </h3>
                                                <div className="flex flex-wrap gap-1 mb-4">
                                                    {doc.tags.slice(0, 2).map((tag, idx) => (
                                                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700">
                                                            <Tag size={10} className="mr-1"/> {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Meta & Actions */}
                                        <div className="mt-auto">
                                            <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between text-xs text-gray-500 dark:text-zinc-500 mb-4">
                                                <div className="flex items-center space-x-2">
                                                    <Calendar size={12} />
                                                    <span>{doc.tahun}</span>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <span>{doc.fileSize}</span>
                                                </div>
                                            </div>

                                            {/* Action Buttons for Guest & Admin */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        doc.fileUrl && window.open(doc.fileUrl, '_blank');
                                                    }}
                                                    className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                                >
                                                    <Eye size={16} className="mr-2" /> Lihat
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        doc.fileUrl && window.open(getDownloadUrl(doc.fileUrl), '_blank');
                                                    }}
                                                    className="flex-1 flex items-center justify-center px-3 py-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                                                >
                                                    <Download size={16} className="mr-2" /> Unduh
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        currentSubfolders.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-64 md:h-96 text-gray-500 dark:text-zinc-600">
                                <Search size={48} className="mb-4 text-gray-300 dark:text-zinc-800" />
                                <p className="text-lg font-medium">Tidak ada dokumen ditemukan</p>
                            </div>
                        )
                    )}
                </>
            )}
        </div>
      </main>

      {/* Upload Modal */}
      {showAddModal && (
        <LetterForm 
            onClose={() => setShowAddModal(false)} 
            onSubmit={handleAddArchive}
            folders={visibleFolders} // Filtered for selection too
            initialFolderId={
                visibleFolders.find(f => f.id === currentFilter) ? currentFilter : undefined
            }
            onOpenConfig={() => setShowConfigModal(true)}
        />
      )}
    </div>
  );
}