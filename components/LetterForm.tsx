import React, { useState, useRef } from 'react';
import { X, Upload, Tag, CheckCircle, Loader2 } from 'lucide-react';
import { ArchiveDocument } from '../types';
import { uploadToDrive } from '../services/storageService';

interface ArchiveFormProps {
  onClose: () => void;
  onSubmit: (data: Omit<ArchiveDocument, 'id' | 'tanggalUpload'>) => void;
  categories: string[];
}

export const LetterForm: React.FC<ArchiveFormProps> = ({ onClose, onSubmit, categories }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<ArchiveDocument>>({
    tahun: new Date().getFullYear().toString(),
    kategori: 'Lainnya',
    tags: []
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Limit 5MB (Batas aman untuk shared hosting agar tidak kena timeout/limit PHP)
      const MAX_SIZE_MB = 5;
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`Ukuran file terlalu besar (${(file.size / 1024 / 1024).toFixed(2)} MB). Maksimal ${MAX_SIZE_MB}MB agar upload stabil.`);
        return;
      }
      setSelectedFile(file);
      
      if (!formData.judul) {
        const fileNameWithoutExt = file.name.split('.').slice(0, -1).join('.');
        setFormData(prev => ({ ...prev, judul: fileNameWithoutExt }));
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judul || !formData.kategori) {
        alert("Judul dan Kategori wajib diisi.");
        return;
    }
    if (!selectedFile) {
        alert("Silakan pilih file dokumen terlebih dahulu.");
        return;
    }

    setIsSubmitting(true);

    try {
        await uploadToDrive(selectedFile, formData);
        
        const fileSize = (selectedFile.size / (1024 * 1024)).toFixed(2) + ' MB';
        const submissionData = {
            ...formData,
            fileSize: fileSize
        };
        
        onSubmit(submissionData as Omit<ArchiveDocument, 'id' | 'tanggalUpload'>);
        
    } catch (error) {
        console.error("Upload error:", error);
        alert(`Gagal mengupload dokumen: ${error instanceof Error ? error.message : error}`);
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end md:items-center justify-center z-50 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-t-2xl md:rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl dark:shadow-amber-900/10 border-t md:border border-gray-200 dark:border-zinc-800 flex flex-col max-h-[90vh] md:max-h-[90vh] animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 fade-in duration-300 transition-colors">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-950">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Upload Arsip Baru</h2>
            <p className="text-xs text-gray-500 dark:text-zinc-500">Tambahkan dokumen ke server Universitas Airlangga</p>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-full text-gray-500 dark:text-zinc-400 transition-colors disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-gray-100 dark:scrollbar-track-zinc-900 relative">
          
          {isSubmitting && (
            <div className="absolute inset-0 bg-white/90 dark:bg-zinc-900/80 z-10 flex flex-col items-center justify-center backdrop-blur-[1px]">
                <Loader2 size={48} className="text-amber-500 animate-spin mb-4" />
                <p className="text-gray-900 dark:text-zinc-200 font-medium">Sedang mengupload ke Server...</p>
                <p className="text-gray-500 dark:text-zinc-500 text-sm mt-1">Mohon tunggu, jangan tutup halaman ini.</p>
            </div>
          )}

          <form id="archiveForm" onSubmit={handleSubmit} className="space-y-6">
            
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
            />

            {/* Clickable Upload Area */}
            <div 
                onClick={!isSubmitting ? triggerFileSelect : undefined}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${
                    selectedFile 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/10' 
                    : 'border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950/50 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10'
                } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {selectedFile ? (
                    <>
                        <div className="bg-green-600 p-3 rounded-full shadow-sm mb-3">
                            <CheckCircle className="text-white" size={24} />
                        </div>
                        <p className="text-sm font-bold text-gray-800 dark:text-zinc-200">{selectedFile.name}</p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">File siap diupload ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</p>
                        <p className="text-xs text-gray-500 dark:text-zinc-500 mt-2">Klik untuk mengganti file</p>
                    </>
                ) : (
                    <>
                        <div className="bg-gray-200 dark:bg-zinc-800 p-3 rounded-full shadow-sm mb-3 group-hover:scale-110 group-hover:bg-amber-500 transition-all">
                            <Upload className="text-gray-400 dark:text-zinc-400 group-hover:text-blue-900" size={24} />
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">Klik untuk pilih file dokumen</p>
                        <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">PDF, Word, Excel, Gambar (Maks 5MB)</p>
                    </>
                )}
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-zinc-400 mb-1">Judul Dokumen <span className="text-red-500">*</span></label>
                    <input 
                        type="text" 
                        required
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 disabled:opacity-50"
                        value={formData.judul || ''}
                        onChange={e => setFormData({...formData, judul: e.target.value})}
                        placeholder="Contoh: SK Rektor tentang..."
                    />
                </div>
                
                {/* Responsive Grid: 1 col on mobile, 2 on desktop */}
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
                        <label className="block text-sm font-medium text-gray-600 dark:text-zinc-400 mb-1">Kategori <span className="text-red-500">*</span></label>
                        <select 
                             className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 dark:text-zinc-100 disabled:opacity-50"
                             value={formData.kategori}
                             disabled={isSubmitting}
                             onChange={e => setFormData({...formData, kategori: e.target.value})}
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
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
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-600 dark:text-zinc-400 font-medium text-sm hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
            >
                Batal
            </button>
            <button
                type="submit"
                form="archiveForm"
                disabled={isSubmitting}
                className="px-6 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-blue-900 font-bold rounded-lg hover:from-amber-300 hover:to-yellow-400 transition-colors shadow-lg shadow-amber-500/20 dark:shadow-amber-900/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Arsip'}
            </button>
        </div>
      </div>
    </div>
  );
};