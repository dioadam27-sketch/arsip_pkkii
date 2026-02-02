import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, Database, LayoutGrid, Lock, AlertCircle, User } from 'lucide-react';

interface LoginPageProps {
  onLogin: (role: 'admin' | 'guest') => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulasi delay jaringan untuk UX
    setTimeout(() => {
      if (password === '112233') {
        onLogin('admin');
      } else {
        setError('Password akses salah. Silakan coba lagi.');
        setIsLoading(false);
        setPassword(''); // Reset password field
      }
    }, 800);
  };

  const handleGuestLogin = () => {
    setIsGuestLoading(true);
    setTimeout(() => {
        onLogin('guest');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-amber-400 selection:text-blue-900 px-4 transition-colors duration-300">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-600/10 rounded-full blur-[80px] md:blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[20%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-amber-500/10 rounded-full blur-[80px] md:blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md p-4 md:p-8 relative z-10">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8 md:mb-10">
          <img 
            src="https://ppk2ipe.unair.ac.id/gambar/UNAIR_BRANDMARK_2025-02.png" 
            alt="UNAIR Brandmark" 
            className="h-24 md:h-32 w-auto mb-6 object-contain drop-shadow-xl hover:scale-105 transition-transform duration-500"
          />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-center mb-2">Repo PKKII</h1>
          <p className="text-gray-500 dark:text-zinc-500 text-xs md:text-sm font-medium uppercase tracking-widest text-center">Universitas Airlangga</p>
        </div>

        {/* Card */}
        <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl dark:shadow-2xl transition-colors duration-300">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">Login Admin</h2>
              <p className="text-gray-500 dark:text-zinc-400 text-sm leading-relaxed">
                Masukkan kode akses untuk mengelola arsip digital.
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4 mt-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 dark:text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-950/50 text-gray-900 dark:text-zinc-100 placeholder-gray-500 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-sm"
                  placeholder="Masukkan Password Admin"
                  disabled={isLoading || isGuestLoading}
                  required
                />
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/20 animate-in slide-in-from-top-2 fade-in">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || isGuestLoading}
                className="w-full group relative flex items-center justify-center py-3.5 px-4 bg-blue-900 dark:bg-amber-500 text-white dark:text-blue-950 font-bold rounded-xl hover:bg-blue-800 dark:hover:bg-amber-400 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-lg"
              >
                <span className="mr-2">{isLoading ? 'Memverifikasi...' : 'Masuk sebagai Admin'}</span>
                {!isLoading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                
                {isLoading && (
                   <div className="absolute right-4 w-4 h-4 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin"></div>
                )}
              </button>
            </form>

            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-200 dark:border-zinc-800"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 dark:text-zinc-600 text-xs">Atau</span>
                <div className="flex-grow border-t border-gray-200 dark:border-zinc-800"></div>
            </div>

            <button
                type="button"
                onClick={handleGuestLogin}
                disabled={isLoading || isGuestLoading}
                className="w-full group flex items-center justify-center py-3 px-4 bg-gray-100 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isGuestLoading ? (
                     <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-gray-500 dark:border-zinc-500 border-t-gray-800 dark:border-t-zinc-300 rounded-full animate-spin mr-2"></div>
                        <span>Memuat Tamu...</span>
                     </div>
                ) : (
                    <>
                        <User size={18} className="mr-2 opacity-70" />
                        <span>Guest</span>
                    </>
                )}
            </button>

            <div className="grid grid-cols-3 gap-2 py-4 border-t border-gray-200 dark:border-zinc-800/50 mt-4">
                <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-zinc-500">
                    <Database size={18} className="text-amber-500 md:w-5 md:h-5"/>
                    <span className="text-[10px] font-medium">Terpusat</span>
                </div>
                <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-zinc-500">
                    <ShieldCheck size={18} className="text-amber-500 md:w-5 md:h-5"/>
                    <span className="text-[10px] font-medium">Aman</span>
                </div>
                <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-zinc-500">
                    <LayoutGrid size={18} className="text-amber-500 md:w-5 md:h-5"/>
                    <span className="text-[10px] font-medium">Terstruktur</span>
                </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
            <p className="text-[10px] md:text-xs text-gray-500 dark:text-zinc-600">
                &copy; {new Date().getFullYear()} Sub Direktorat Pendidikan Karakter,<br/>Kebangsaan, Inklusi dan Interprofesional
            </p>
        </div>
      </div>
    </div>
  );
};