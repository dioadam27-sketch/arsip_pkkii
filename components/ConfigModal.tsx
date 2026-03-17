import React, { useState, useEffect } from 'react';
import { X, Save, Server, Check, HardDrive, Key } from 'lucide-react';
import { getApiUrl, saveApiUrl, getDriveScriptUrl, saveDriveScriptUrl, getGeminiKey, saveGeminiKey } from '../services/storageService';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, onSave }) => {
  const [phpUrl, setPhpUrl] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [isGeminiUnlocked, setIsGeminiUnlocked] = useState(false);
  const [geminiPassword, setGeminiPassword] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setPhpUrl(getApiUrl());
        setDriveUrl(getDriveScriptUrl());
        getGeminiKey().then(setGeminiKey);
        setIsGeminiUnlocked(false);
        setGeminiPassword('');
        setSaved(false);
    }
  }, [isOpen]);

  const handleUnlockGemini = () => {
    if (geminiPassword === '332211') {
        setIsGeminiUnlocked(true);
        setGeminiPassword('');
    } else {
        alert("Password salah!");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phpUrl.trim() && driveUrl.trim()) {
        saveApiUrl(phpUrl);
        saveDriveScriptUrl(driveUrl);
        if (isGeminiUnlocked) {
            await saveGeminiKey(geminiKey);
        }
        setSaved(true);
        setTimeout(() => {
            onSave();
            onClose();
        }, 800);
    } else {
        alert("Mohon isi URL (API Backend & File Storage)");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-xl shadow-2xl border border-gray-200 dark:border-zinc-800 transform scale-100 transition-all">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-zinc-800">
            <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <Server className="text-blue-600 dark:text-amber-500" size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Konfigurasi Sistem</h2>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">Hubungkan Database (cPanel) dan Storage (Google Drive).</p>
                </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">
                <X size={24} />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* PHP Input */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2 flex items-center">
                    <Server size={14} className="mr-2"/> URL API Backend (PHP/cPanel)
                </label>
                <input 
                    type="url" 
                    required
                    placeholder="https://domain-anda.com/arsip/api.php"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-amber-500 focus:border-transparent text-gray-900 dark:text-zinc-100 font-mono text-sm shadow-inner"
                    value={phpUrl}
                    onChange={(e) => setPhpUrl(e.target.value)}
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-zinc-500">
                    Endpoint untuk menyimpan data teks ke MySQL (file <code>api.php</code>).
                </p>
            </div>

            {/* Apps Script Input */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2 flex items-center">
                    <HardDrive size={14} className="mr-2"/> URL Google Apps Script (Storage)
                </label>
                <input 
                    type="url" 
                    required
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-amber-500 focus:border-transparent text-gray-900 dark:text-zinc-100 font-mono text-sm shadow-inner"
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-zinc-500">
                    Endpoint Web App Google Apps Script untuk upload file fisik ke Drive.
                </p>
            </div>

            {/* Gemini Key Input */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2 flex items-center">
                    <Key size={14} className="mr-2"/> Gemini API Key
                </label>
                {!isGeminiUnlocked ? (
                    <div className="flex space-x-2">
                        <input 
                            type="password" 
                            placeholder="Masukkan password untuk edit"
                            className="flex-grow px-4 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-amber-500 focus:border-transparent text-gray-900 dark:text-zinc-100 font-mono text-sm shadow-inner"
                            value={geminiPassword}
                            onChange={(e) => setGeminiPassword(e.target.value)}
                        />
                        <button 
                            type="button"
                            onClick={handleUnlockGemini}
                            className="px-4 py-2 bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-200 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-600"
                        >
                            Buka
                        </button>
                    </div>
                ) : (
                    <input 
                        type="password" 
                        placeholder="AIza..."
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-amber-500 focus:border-transparent text-gray-900 dark:text-zinc-100 font-mono text-sm shadow-inner"
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                    />
                )}
                <p className="mt-2 text-xs text-gray-500 dark:text-zinc-500">
                    {isGeminiUnlocked ? "API Key dapat diubah." : "Masukkan password untuk mengubah API Key."}
                </p>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
                <button 
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                    Batal
                </button>
                <button 
                    type="submit"
                    className={`px-6 py-2 rounded-lg font-medium text-white shadow-lg transition-all flex items-center ${
                        saved 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-blue-600 hover:bg-blue-700 dark:bg-amber-500 dark:text-blue-900 dark:hover:bg-amber-400'
                    }`}
                >
                    {saved ? (
                        <>
                            <Check size={18} className="mr-2" />
                            Tersimpan
                        </>
                    ) : (
                        <>
                            <Save size={18} className="mr-2" />
                            Simpan Konfigurasi
                        </>
                    )}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};