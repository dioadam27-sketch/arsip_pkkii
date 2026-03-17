import React, { useState, useRef, useMemo, useEffect } from 'react';
import { X, Upload, Tag, CheckCircle, Loader2, FolderOpen, Settings, AlertCircle, FileText, Trash2, Lock, Globe, Sparkles } from 'lucide-react';
import { ArchiveDocument, Folder } from '../types';
import { uploadToDrive } from '../services/storageService';
import { GoogleGenAI, Type } from "@google/genai";

interface ArchiveFormProps {
  onClose: () => void;
  onSubmit: (data: Partial<ArchiveDocument>) => void; 
  folders: Folder[]; 
  initialFolderId?: string; 
  onOpenConfig?: () => void; 
}

export const LetterForm: React.FC<ArchiveFormProps> = ({ onClose, onSubmit, folders, initialFolderId, onOpenConfig }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]); 
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{current: number, total: number} | null>(null); 
  
  const analyzeDocument = async (file: File) => {
    setIsAnalyzing(true);
    try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });
        const dataUrl = await base64Promise;
        const base64Data = dataUrl.split(',')[1];

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: file.type,
                            data: base64Data,
                        },
                    },
                    {
                        text: "Analyze this document and extract: nomor surat, perihal (judul), deskripsi, kategori, tahun, tags. Return as JSON.",
                    },
                ],
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        nomorDokumen: { type: Type.STRING },
                        judul: { type: Type.STRING },
                        deskripsi: { type: Type.STRING },
                        kategori: { type: Type.STRING },
                        tahun: { type: Type.STRING },
                        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                },
            },
        });

        const result = JSON.parse(response.text!);
        setFormData(prev => ({ ...prev, ...result }));
    } catch (error) {
        console.error("Analysis failed:", error);
        alert("Gagal menganalisis dokumen dengan AI.");
    } finally {
        setIsAnalyzing(false);
    }
  };
  
  const [isSuccess, setIsSuccess] = useState(false); 
  const [errorState, setErrorState] = useState<string | null>(null); 
  const [isDragging, setIsDragging] = useState(false); 
  
  const [selectedFolderId, setSelectedFolderId] = useState<string>(initialFolderId || '');

  const [formData, setFormData] = useState<Partial<ArchiveDocument>>({
    tahun: new Date().getFullYear().toString(),
    tags: [],
    visibility: 'public' // Default public
  });

  useEffect(() => {
    if (initialFolderId) {
        setSelectedFolderId(initialFolderId);
    } else if (folders.length > 0 && !selectedFolderId) {
        setSelectedFolderId(folders[0].id);
    }
  }, [initialFolderId, folders]);

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

  // --- LOGIKA VALIDASI FILE ---
  const validateAndAddFiles = (files: FileList | File[]) => {
    const MAX_SIZE_MB = 8; 
    const newFiles: File[] = [];
    let errorMsg = null;

    Array.from(files).forEach(file => {
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            errorMsg = `File "${file.name}" terlalu besar. Maksimal ${MAX_SIZE_MB}MB.`;
            return;
        }
        if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
            newFiles.push(file);
        }
    });

    if (errorMsg) {
        alert(errorMsg);
    }

    if (newFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...newFiles]);
        setErrorState(null);
        
        if (!formData.judul && selectedFiles.length === 0 && newFiles.length === 1) {
            const fileNameWithoutExt = newFiles[0].name.replace(/\.[^/.]+$/, "");
            setFormData(prev => ({ ...prev, judul: fileNameWithoutExt }));
        }
    }
  };

  const removeFile = (indexToRemove: number) => {
      setSelectedFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
        validateAndAddFiles(files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSubmitting) setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSubmitting) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isSubmitting) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
        validateAndAddFiles(files);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorState(null);
    
    const targetFolder = folders.find(f => f.id === selectedFolderId);
    const kategoriLabel = targetFolder ? targetFolder.label : 'Lainnya';

    if (selectedFiles.length === 1 && !formData.judul) {
        alert("Judul dokumen wajib diisi.");
        return;
    }
    
    if (selectedFiles.length === 0) {
        alert("Silakan pilih minimal satu file dokumen.");
        return;
    }
    if (!selectedFolderId) {
        alert("Silakan pilih Folder Penyimpanan.");
        return;
    }

    setIsSubmitting(true);
    setUploadProgress({ current: 0, total: selectedFiles.length });

    try {
        let successCount = 0;

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            setUploadProgress({ current: i + 1, total: selectedFiles.length });

            // Extract extension safely
            const fileExtension = file.name.includes('.') ? file.name.split('.').pop() || '' : '';
            const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
            
            const docTitle = selectedFiles.length > 1 
                ? fileNameWithoutExt
                : (formData.judul || fileNameWithoutExt);

            const uploadData = {
                ...formData,
                judul: docTitle,
                kategori: kategoriLabel,
                folderId: selectedFolderId,
                fileExtension: fileExtension // Pass extension to storageService
            };

            await uploadToDrive(file, uploadData);
            successCount++;
        }
        
        const lastFile = selectedFiles[selectedFiles.length - 1];
        const fileSize = (lastFile.size / (1024 * 1024)).toFixed(2) + ' MB';
        
        const submissionData = {
            ...formData,
            fileSize: fileSize,
            folderId: selectedFolderId 
        };
        
        setIsSuccess(true);
        setIsSubmitting(false);

        setTimeout(() => {
            onSubmit(submissionData);
        }, 1500);
        
    } catch (error) {
        console.error("Upload process error:", error);
        let msg = "Terjadi kesalahan saat mengupload dokumen.";
        if (error instanceof Error) {
            msg = error.message;
        }

        setErrorState(msg);
        setIsSubmitting(false);
    }
  };

  const isConfigError = errorState && errorState.includes("URL Google Apps Script belum dikonfigurasi");

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end md:items-center justify-center z-50 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-t-2xl md:rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl dark:shadow-amber-900/10 border-t md:border border-gray-200 dark:border-zinc-800 flex flex-col max-h-[90vh] md:max-h-[90vh] animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 fade-in duration-300 transition-colors">
        
        <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-950">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Upload Arsip Baru</h2>
            <p className="text-xs text-gray-500 dark:text-zinc-500">Tambahkan dokumen ke server Universitas Airlangga</p>
          </div>
          <button onClick={onClose} disabled={isSubmitting || isSuccess} className="p-2 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-full text-gray-500 dark:text-zinc-400 transition-colors disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-gray-100 dark:scrollbar-track-zinc-900 relative">
          
          {isSubmitting && (
            <div className="absolute inset-0 bg-white/95 dark:bg-zinc-900/95 z-20 flex flex-col items-center justify-center backdrop-blur-[2px] transition-all">
                <Loader2 size={48} className="text-amber-500 animate-spin mb-4" />
                <p className="text-gray-900 dark:text-zinc-200 font-bold text-lg">Mengupload...</p>
                {uploadProgress && (
                    <p className="text-blue-600 dark:text-amber-500 font-medium mt-1">
                        File ke-{uploadProgress.current} dari {uploadProgress.total}
                    </p>
                )}
                <p className="text-gray-500 dark:text-zinc-500 text-sm mt-1 text-center max-w-xs">Mohon tunggu, dokumen sedang dikirim ke Google Drive & Database.</p>
            </div>
          )}

          {isSuccess && (
            <div className="absolute inset-0 bg-white dark:bg-zinc-900 z-20 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
                <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4 mb-4 animate-bounce">
                    <CheckCircle size={64} className="text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Berhasil Diupload!</h3>
                <p className="text-gray-500 dark:text-zinc-400 text-center">{selectedFiles.length} Dokumen telah tersimpan.</p>
            </div>
          )}
          
          {errorState && (
             <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2">
                 <AlertCircle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={20} />
                 <div className="flex-1">
                     <h3 className="font-bold text-red-700 dark:text-red-400 text-sm">Upload Gagal</h3>
                     <p className="text-sm text-red-600 dark:text-red-300 mt-1">{errorState}</p>
                     
                     {isConfigError && onOpenConfig && (
                        <button 
                            type="button"
                            onClick={onOpenConfig}
                            className="mt-3 px-3 py-1.5 bg-red-100 dark:bg-red-800/40 hover:bg-red-200 dark:hover:bg-red-800/60 text-red-800 dark:text-red-200 text-xs font-bold rounded-lg transition-colors flex items-center"
                        >
                            <Settings size={14} className="mr-2" />
                            Buka Menu Konfigurasi
                        </button>
                     )}
                 </div>
             </div>
          )}

          <form id="archiveForm" onSubmit={handleSubmit} className="space-y-6">
            
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange}
                className="hidden"
                multiple 
                accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
            />

            <div 
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={!isSubmitting ? triggerFileSelect : undefined}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer group relative overflow-hidden min-h-[160px] ${
                    isDragging 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02] shadow-xl' 
                    : selectedFiles.length > 0 
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10' 
                        : 'border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950/50 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10'
                } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {isDragging && (
                    <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 z-10 backdrop-blur-[1px]">
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400 pointer-events-none">Lepaskan File Disini</p>
                    </div>
                )}

                {selectedFiles.length === 0 ? (
                    <>
                        <div className={`p-4 rounded-full shadow-sm mb-3 transition-all relative z-0 ${
                            isDragging ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-200 dark:bg-zinc-800 group-hover:bg-amber-500 group-hover:text-white'
                        }`}>
                            {isDragging ? (
                                <FileText className="text-blue-600 dark:text-blue-400" size={32} />
                            ) : (
                                <Upload className="text-gray-400 dark:text-zinc-400 group-hover:text-blue-900" size={32} />
                            )}
                        </div>
                        <p className="text-base font-semibold text-gray-700 dark:text-zinc-300">
                            {isDragging ? "Lepaskan file..." : "Klik untuk upload atau Drag & Drop"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-zinc-500 mt-2 max-w-xs">
                            Mendukung Multiple File (PDF, Office, Gambar) - Max 8MB/file
                        </p>
                    </>
                ) : (
                    <div className="w-full">
                         <div className="flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
                             <Upload size={24} className="mr-2"/>
                             <span className="font-bold text-lg">Tambah File Lain?</span>
                         </div>
                         <p className="text-xs text-gray-400 mb-4">Klik area ini atau drag file baru</p>
                    </div>
                )}
            </div>

            {selectedFiles.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    <p className="text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase">File Terpilih ({selectedFiles.length})</p>
                    {selectedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-sm animate-in slide-in-from-bottom-2 fade-in">
                            <div className="flex items-center overflow-hidden">
                                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg mr-3 shrink-0">
                                    <FileText size={18} className="text-green-600 dark:text-green-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-800 dark:text-zinc-200 truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-zinc-500">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <button 
                                    type="button"
                                    onClick={() => analyzeDocument(file)}
                                    disabled={isSubmitting || isAnalyzing}
                                    className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-gray-400 hover:text-amber-500 rounded-lg transition-colors mr-2"
                                    title="Analisis dengan AI"
                                >
                                    {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => removeFile(idx)}
                                    disabled={isSubmitting}
                                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 rounded-lg transition-colors ml-2"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="space-y-4">
                {/* Visibility Selector */}
                <div>
                     <label className="block text-sm font-medium text-gray-600 dark:text-zinc-400 mb-2">Akses Dokumen</label>
                     <div className="flex space-x-4">
                        <button
                            type="button"
                            onClick={() => setFormData({...formData, visibility: 'public'})}
                            className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center transition-all ${
                                formData.visibility === 'public' 
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                                : 'border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-500'
                            }`}
                        >
                            <Globe size={18} className="mr-2" />
                            <span className="font-medium">Publik (Umum)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({...formData, visibility: 'private'})}
                            className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center transition-all ${
                                formData.visibility === 'private' 
                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' 
                                : 'border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-500'
                            }`}
                        >
                            <Lock size={18} className="mr-2" />
                            <span className="font-medium">Privat (Admin)</span>
                        </button>
                     </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-zinc-400 mb-1">Judul Dokumen {selectedFiles.length <= 1 && <span className="text-red-500">*</span>}</label>
                    <input 
                        type="text" 
                        required={selectedFiles.length <= 1} 
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 disabled:opacity-50"
                        value={formData.judul || ''}
                        onChange={e => setFormData({...formData, judul: e.target.value})}
                        placeholder={selectedFiles.length > 1 ? "Otomatis menggunakan nama file masing-masing" : "Contoh: SK Rektor tentang..."}
                    />
                    {selectedFiles.length > 1 ? (
                         <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium animate-pulse">
                            * Mode Multiple Upload: Judul otomatis menggunakan nama file (tanpa ekstensi).
                        </p>
                    ) : (
                        selectedFiles.length > 1 && (
                            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 italic">
                                * Nama file akan otomatis ditambahkan di belakang judul.
                            </p>
                        )
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-zinc-400 mb-1">Nomor Dokumen</label>
                        <input 
                            type="text" 
                            disabled={isSubmitting}
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 disabled:opacity-50"
                            value={formData.nomorDokumen || ''}
                            onChange={e => setFormData({...formData, nomorDokumen: e.target.value})}
                            placeholder="Nomor SK / Surat"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-zinc-400 mb-1">Folder Penyimpanan <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FolderOpen size={16} className="text-gray-400" />
                            </div>
                            <select 
                                required
                                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 dark:text-zinc-100 disabled:opacity-50 appearance-none"
                                value={selectedFolderId}
                                disabled={isSubmitting}
                                onChange={e => setSelectedFolderId(e.target.value)}
                            >
                                <option value="" disabled>-- Pilih Folder --</option>
                                {folderOptions.map(opt => (
                                    <option key={opt.id} value={opt.id}>
                                        {opt.fullPath}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-zinc-400 mb-1">Tahun Dokumen</label>
                        <input 
                            type="number" 
                            disabled={isSubmitting}
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 disabled:opacity-50"
                            value={formData.tahun || ''}
                            onChange={e => setFormData({...formData, tahun: e.target.value})}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-zinc-400 mb-1">Deskripsi Singkat</label>
                    <textarea 
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 h-24 text-sm resize-none text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 disabled:opacity-50"
                        value={formData.deskripsi || ''}
                        disabled={isSubmitting}
                        onChange={e => setFormData({...formData, deskripsi: e.target.value})}
                        placeholder="Ringkasan isi dokumen untuk memudahkan pencarian..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-zinc-400 mb-1 flex items-center">
                        <Tag size={14} className="mr-1"/> Tags (Pisahkan dengan koma)
                    </label>
                    <input 
                        type="text" 
                        disabled={isSubmitting}
                        placeholder="akademik, mahasiswa, 2024"
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 disabled:opacity-50"
                        value={formData.tags?.join(', ') || ''}
                        onChange={e => setFormData({...formData, tags: e.target.value.split(',').map(t => t.trim())})}
                    />
                </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 flex justify-end space-x-3 mb-4 md:mb-0">
            <button 
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isSuccess}
                className="px-4 py-2 text-gray-600 dark:text-zinc-400 font-medium text-sm hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
            >
                Batal
            </button>
            <button
                type="submit"
                form="archiveForm"
                disabled={isSubmitting || isSuccess || selectedFiles.length === 0}
                className="px-6 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-blue-900 font-bold rounded-lg hover:from-amber-300 hover:to-yellow-400 transition-colors shadow-lg shadow-amber-500/20 dark:shadow-amber-900/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
                {isSubmitting ? (
                    'Memproses...'
                ) : (
                    `Simpan ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''} Arsip`
                )}
            </button>
        </div>
      </div>
    </div>
  );
};