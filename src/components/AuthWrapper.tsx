import React, { useState, useEffect, createContext, useContext } from 'react';
import { Lock, User, ShieldCheck, ArrowRight, ShieldAlert, Key } from 'lucide-react';
import * as OTPAuth from 'otpauth';

export interface UserAccount {
  username: string;
  pin: string;
  twoFactorSecret?: string;
  twoFactorEnabled?: boolean;
}

// Initial mock users
const defaultUsers: UserAccount[] = [
  { username: 'admin', pin: '1234' },
  { username: 'demo', pin: '0000' }
];

interface AuthContextType {
  currentUser: string | null;
  users: UserAccount[];
  setUsers: (users: UserAccount[]) => void;
}

export const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  users: [],
  setUsers: () => {}
});

export const useAuth = () => useContext(AuthContext);

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const [users, setUsersState] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  
  // Auth state machine: 'login' -> '2fa' -> 'authenticated'
  const [authStep, setAuthStep] = useState<'login' | '2fa'>('login');
  
  // Form fields
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  
  const [error, setError] = useState('');

  const setUsers = (newUsers: UserAccount[]) => {
    setUsersState(newUsers);
    localStorage.setItem('mock_users', JSON.stringify(newUsers));
  };

  useEffect(() => {
    // Load users from localStorage or set defaults
    const savedUsers = localStorage.getItem('mock_users');
    if (savedUsers) {
      setUsersState(JSON.parse(savedUsers));
    } else {
      setUsersState(defaultUsers);
      localStorage.setItem('mock_users', JSON.stringify(defaultUsers));
    }

    // Check if already authenticated in this session
    const activeSession = sessionStorage.getItem('active_session');
    if (activeSession) {
      setCurrentUser(activeSession);
      setIsAuthenticated(true);
    }
    
    setIsInitializing(false);
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (user && user.pin === pin) {
      if (user.twoFactorEnabled && user.twoFactorSecret) {
        setAuthStep('2fa');
        setTwoFaCode('');
      } else {
        // Direct login
        sessionStorage.setItem('active_session', user.username);
        setCurrentUser(user.username);
        setIsAuthenticated(true);
      }
    } else {
      setError('Hatalı kullanıcı adı veya şifre (PIN).');
    }
  };

  const handle2FASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (!user || !user.twoFactorSecret) {
      setError('Güvenlik hatası oluştu.');
      return;
    }

    const totp = new OTPAuth.TOTP({
      issuer: 'FaturaApp',
      label: user.username,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.twoFactorSecret)
    });

    const delta = totp.validate({ token: twoFaCode, window: 1 });

    if (delta !== null) {
      sessionStorage.setItem('active_session', user.username);
      setCurrentUser(user.username);
      setIsAuthenticated(true);
    } else {
      setError('Geçersiz 2FA kodu. Lütfen tekrar deneyin.');
    }
  };

  if (isInitializing) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Yükleniyor...</div>;
  }

  if (isAuthenticated) {
    return (
      <AuthContext.Provider value={{ currentUser, users, setUsers }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 selection:bg-indigo-500/30 font-sans">
      <div className="max-w-md w-full">
        {/* Logo/Brand Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl mx-auto shadow-xl shadow-indigo-600/20 mb-4 border border-indigo-500/50">
            F
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Fatura & Cari Yönetimi</h1>
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Güvenli Giriş Portalı</p>
        </div>

        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
          
          {error && (
            <div className="mb-6 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-3 animate-fade-in">
              <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-rose-300">{error}</p>
            </div>
          )}

          {authStep === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-5 animate-fade-in">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Kullanıcı Adı</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#111115] border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                    placeholder="Kullanıcı adınızı girin"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Güvenlik PIN</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
                  <input
                    type="password"
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full bg-[#111115] border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono tracking-widest"
                    placeholder="••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-bold transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 mt-2"
              >
                <span>Giriş Yap</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              
              <div className="text-center pt-4 border-t border-neutral-800/80 mt-6">
                <p className="text-[10px] text-neutral-600">
                  Demo Giriş: admin / 1234
                </p>
              </div>
            </form>
          )}

          {authStep === '2fa' && (
            <form onSubmit={handle2FASubmit} className="space-y-5 animate-fade-in text-center">
              <div className="flex justify-center mb-2">
                <div className="h-12 w-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-indigo-400" />
                </div>
              </div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">İki Aşamalı Doğrulama (2FA)</h2>
              <p className="text-[11px] text-neutral-400 leading-relaxed px-4">
                Güvenliğiniz için lütfen kimlik doğrulayıcı uygulamanızdaki 6 haneli kodu girin.
              </p>

              <div className="pt-2 pb-2">
                <div className="relative max-w-[200px] mx-auto">
                  <Key className="absolute left-4 top-3.5 h-4 w-4 text-neutral-500" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#111115] border border-neutral-800 rounded-xl py-3 pl-11 pr-4 text-lg text-white text-center focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono font-bold tracking-[0.25em]"
                    placeholder="000000"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => { setAuthStep('login'); setTwoFaCode(''); setError(''); setPin(''); }}
                  className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl py-3 text-sm font-bold transition-all border border-neutral-800 cursor-pointer"
                >
                  Geri
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-bold transition-all shadow-lg shadow-indigo-900/20 cursor-pointer"
                >
                  Doğrula
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
