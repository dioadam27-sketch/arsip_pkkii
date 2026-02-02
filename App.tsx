import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { LetterForm } from './components/LetterForm'; 
import { LoginPage } from './components/LoginPage';
import { ConfirmModal } from './components/ConfirmModal';
import { ArchiveDocument, Folder } from './types';
import { Search, Plus, FileText, Download, MoreVertical, Calendar, Tag, Filter, Clock, Scroll, Loader2, RefreshCw, AlertCircle, Menu, Wifi, WifiOff, Trash2 } from 'lucide-react';
import { fetchAllData, createFolder, deleteArchive, deleteFolder } from './services/storageService';

export default function App() {
  // Session State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'guest'>('guest');
  const [isSessionChecking, setIsSessionChecking] = useState(true);

  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // UI State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Data State - Inisialisasi kosong, menunggu data server
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [documents, setDocuments] = useState<ArchiveDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Delete State
  const [archiveToDelete, setArchiveToDelete] = useState<{id: string, judul: string} | null>(null);
  
  // Loading & Sync State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // Indikator activity network
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
        setDocuments(data.archives);
        
        // Gunakan data dari server sepenuhnya
        if (data.folders) {
            setFolders(data.folders);
        }
    } catch (error) {
        console.error("Error loading data:", error);
        if (showLoadingSpinner) {
             setError(error instanceof Error ? error.message : "Gagal memuat data.");
        }
    } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsSyncing(false);
    }
  };

  // Initial Load ONLY (Manual Sync)
  useEffect(() => {
    if (isLoggedIn) {
        loadData(true);
        // Polling otomatis dihapus agar sync database manual
    }
  }, [isLoggedIn]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(true);
  };

  // --- ACTION HANDLERS ---

  const handleAddFolder = async (name: string, parentId: string | null = null) => {
    const newId = name.toUpperCase().replace(/\s+/g, '_') + '_' + Date.now().toString().slice(-4);
    
    // Check duplication locally first for instant feedback
    const siblings = folders.filter(f => f.parentId === parentId);
    if (siblings.some(f => f.label.toLowerCase() === name.toLowerCase())) {
        alert("Folder dengan nama ini sudah ada di lokasi tersebut.");
        return;
    }

    const newFolder: Folder = { id: newId, label: name, parentId };
    
    // Optimistic Update (Update UI dulu biar cepat)
    setFolders(prev => [...prev, newFolder]);

    try {
        setIsSyncing(true);
        await createFolder(newFolder);
    } catch (e) {
        alert("Gagal menyimpan folder ke server. Folder mungkin hilang saat refresh.");
        console.error(e);
    } finally {
        setIsSyncing(false);
    }
  };

  const handleDeleteFolder = async (id: string) => {
      // 1. Cek apakah folder memiliki subfolder
      const hasChildren = folders.some(f => f.parentId === id);
      if (hasChildren) {
          alert("Folder tidak bisa dihapus karena masih memiliki sub-folder.");
          return;
      }

      // Optimistic Update
      setFolders(prev => prev.filter(f => f.id !== id));

      try {
          setIsSyncing(true);
          await deleteFolder(id);
          // Berhasil dihapus di server
      } catch (e) {
          alert("Gagal menghapus folder di server.");
          loadData(false); // Rollback state by reloading
      } finally {
          setIsSyncing(false);
      }
  };

  const handleAddArchive = (data: Omit<ArchiveDocument, 'id' | 'tanggalUpload'>) => {
    setShowAddModal(false);
    setIsRefreshing(true);
    // Delay sedikit agar Google Drive sempat memproses file
    setTimeout(() => {
        loadData(true);
    }, 2000);
  };

  // Trigger Modal
  const requestDeleteArchive = (e: React.MouseEvent, id: string, judul: string) => {
      e.stopPropagation();
      setArchiveToDelete({ id, judul });
  }

  // Execute Delete
  const confirmDeleteArchive = async () => {
      if (!archiveToDelete) return;
      
      const id = archiveToDelete.id;
      setArchiveToDelete(null); // Close modal

      // Optimistic Update
      setDocuments(prev => prev.filter(d => d.id !== id));

      try {
          setIsSyncing(true);
          await deleteArchive(id);
          // Success
      } catch (e) {
          alert("Gagal menghapus arsip di server.");
          loadData(false); // Rollback
      } finally {
          setIsSyncing(false);
      }
  }

  // --- FILTER LOGIC ---
  const filteredDocs = useMemo(() => {
    let data = documents;

    // Category Filter
    if (currentFilter !== 'all' && currentFilter !== 'recent' && currentFilter !== 'favorites') {
        const activeFolder = folders.find(f => f.id === currentFilter);
        if (activeFolder) {
            // Collect all IDs of this folder and its children (Recursive)
            const getAllChildLabels = (parentId: string): string[] => {
                const directChildren = folders.filter(f => f.parentId === parentId);
                let labels = directChildren.map(c => c.label);
                directChildren.forEach(c => {
                    labels = [...labels, ...getAllChildLabels(c.id)];
                });
                return labels;
            };

            const targetLabels = [activeFolder.label, ...getAllChildLabels(activeFolder.id)];
            // Filter dokumen yang kategori-nya cocok dengan nama folder atau anak folder
            data = data.filter(d => targetLabels.includes(d.kategori));
        }
    }

    // Search
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        data = data.filter(d => 
            d.judul.toLowerCase().includes(q) || 
            d.nomorDokumen.toLowerCase().includes(q) ||
            (d.tags && d.tags.some(t => t.toLowerCase().includes(q)))
        );
    }

    return data;
  }, [documents, currentFilter, searchQuery, folders]);


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

  const recentUploads = documents.slice(0, 3);

  return (
    <div className="flex bg-gray-50 dark:bg-zinc-950 min-h-screen font-sans text-gray-900 dark:text-zinc-100 selection:bg-amber-400 selection:text-blue-900 transition-colors duration-300">
      
      {/* GLOBAL DELETE CONFIRMATION MODAL FOR ARCHIVES */}
      <ConfirmModal 
        isOpen={!!archiveToDelete}
        onClose={() => setArchiveToDelete(null)}
        onConfirm={confirmDeleteArchive}
        title="Hapus Arsip?"
        message="Apakah Anda yakin ingin menghapus arsip dokumen ini secara permanen?"
        itemName={archiveToDelete?.judul}
      />

      {/* Sidebar */}
      <Sidebar 
        currentFilter={currentFilter} 
        setFilter={setCurrentFilter} 
        onLogout={handleLogout}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        folders={folders}
        onAddFolder={handleAddFolder}
        onDeleteFolder={handleDeleteFolder}
        userRole={userRole}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden ml-0 md:ml-64 transition-all duration-300">
        
        {/* Top Navigation Bar */}
        <header className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between sticky top-0 z-10 transition-colors duration-300">
            <div className="flex-1 max-w-2xl flex items-center gap-3">
                <button 
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="md:hidden p-2 -ml-2 text-gray-500 dark:text-zinc-400 hover:text-blue-700 dark:hover:text-amber-400 rounded-lg"
                >
                  <Menu size={24} />
                </button>

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
                {/* Status Indicator (Sekarang Manual Sync) */}
                <div className="hidden md:flex items-center space-x-2 text-xs font-medium px-2 py-1 rounded bg-gray-50 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-help" title="Sinkronisasi Manual">
                    {isSyncing || isRefreshing ? (
                        <>
                            <RefreshCw size={12} className="animate-spin text-amber-500" />
                            <span>Syncing...</span>
                        </>
                    ) : (
                        <>
                            <WifiOff size={12} className="text-gray-400" />
                            <span>Manual</span>
                        </>
                    )}
                </div>

                <button 
                    onClick={handleRefresh}
                    className={`p-2 rounded-xl text-gray-500 dark:text-zinc-400 hover:text-blue-700 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                    title="Refresh Data (Tarik dari Server)"
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
                </div>
            ) : (
                <>
                    {/* Header Filter Title */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 gap-3">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-zinc-100 flex items-center">
                            <Scroll className="mr-3 text-amber-500" />
                            <span className="truncate">
                                {currentFilter === 'all' ? 'Semua Arsip' : 
                                currentFilter === 'recent' ? 'Baru Ditambahkan' : 
                                currentFilter === 'favorites' ? 'Arsip Penting' : 
                                folders.find(f => f.id === currentFilter)?.label || currentFilter}
                            </span>
                        </h2>
                    </div>

                    {/* Documents Grid */}
                    {filteredDocs.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 pb-20 md:pb-10">
                            {filteredDocs.map((doc) => (
                                <div key={doc.id} className="group bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-5 hover:border-blue-500/30 dark:hover:border-amber-500/50 hover:shadow-lg transition-all duration-300 flex flex-col h-full cursor-pointer relative" onClick={() => doc.fileUrl && window.open(doc.fileUrl, '_blank')}>
                                    
                                    {/* Delete Button (Admin Only) */}
                                    {userRole === 'admin' && (
                                        <button 
                                            onClick={(e) => requestDeleteArchive(e, doc.id, doc.judul)}
                                            className="absolute top-3 right-3 p-2 bg-white dark:bg-zinc-800 text-gray-400 hover:text-red-500 rounded-lg shadow-sm border border-gray-100 dark:border-zinc-700 opacity-0 group-hover:opacity-100 transition-all z-10"
                                            title="Hapus Arsip"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}

                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-xl ${
                                            doc.kategori.includes('SK') ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' :
                                            'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500'
                                        }`}>
                                            <FileText size={24} />
                                        </div>
                                    </div>
                                    <div className="flex-1">
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
                                    <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between text-xs text-gray-500 dark:text-zinc-500 mt-auto">
                                        <div className="flex items-center space-x-2">
                                            <Calendar size={12} />
                                            <span>{doc.tahun}</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <span>{doc.fileSize}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 md:h-96 text-gray-500 dark:text-zinc-600">
                            <Search size={48} className="mb-4 text-gray-300 dark:text-zinc-800" />
                            <p className="text-lg font-medium">Tidak ada dokumen ditemukan</p>
                        </div>
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
            categories={folders.map(f => f.label)} 
        />
      )}
    </div>
  );
}