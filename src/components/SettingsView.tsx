import React, { useState } from 'react';
import { useAuth } from './AuthWrapper';
import { Settings, ShieldCheck, ShieldAlert, Key, UserPlus, Trash2, Smartphone, Save } from 'lucide-react';
import * as OTPAuth from 'otpauth';
import { QRCodeSVG } from 'qrcode.react';

export default function SettingsView() {
  const { currentUser, users, setUsers } = useAuth();
  
  const activeUser = users.find(u => u.username === currentUser);
  
  // States for 2FA setup
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [setupSecret, setSetupSecret] = useState('');
  const [setupUri, setSetupUri] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [twoFAError, setTwoFAError] = useState('');
  const [twoFASuccess, setTwoFASuccess] = useState('');

  // States for New User
  const [newUsername, setNewUsername] = useState('');
  const [newPin, setNewPin] = useState('');
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');

  // States for updating current user
  const [updateUsername, setUpdateUsername] = useState(currentUser || '');
  const [updatePin, setUpdatePin] = useState('');
  const [updateCurrentPin, setUpdateCurrentPin] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError('');
    setUpdateSuccess('');

    if (!activeUser || activeUser.pin !== updateCurrentPin) {
      setUpdateError('Mevcut PIN hatalı.');
      return;
    }

    if (updateUsername.toLowerCase() !== currentUser?.toLowerCase() && users.some(u => u.username.toLowerCase() === updateUsername.toLowerCase())) {
      setUpdateError('Bu kullanıcı adı zaten alınmış.');
      return;
    }

    if (updatePin && updatePin.length < 4) {
      setUpdateError('Yeni PIN en az 4 haneli olmalıdır.');
      return;
    }

    const updatedUsers = users.map(u => {
      if (u.username === currentUser) {
        return {
          ...u,
          username: updateUsername,
          pin: updatePin || u.pin
        };
      }
      return u;
    });

    setUsers(updatedUsers);
    
    // Update session storage if username changed
    if (updateUsername !== currentUser) {
      sessionStorage.setItem('active_session', updateUsername);
      // We also need to reload or update the current user context. 
      // A quick reload is simplest for a username change in a demo app.
      window.location.reload();
      return;
    }

    setUpdateSuccess('Profil bilgileriniz başarıyla güncellendi.');
    setUpdateCurrentPin('');
    setUpdatePin('');
  };

  const handleStart2FASetup = () => {
    // Generate a new secret
    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({
      issuer: 'FaturaApp',
      label: currentUser || 'User',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret
    });
    
    setSetupSecret(secret.base32);
    setSetupUri(totp.toString());
    setIsSettingUp2FA(true);
    setTwoFAError('');
    setTwoFASuccess('');
    setVerificationCode('');
  };

  const handleVerifyAndEnable2FA = () => {
    setTwoFAError('');
    
    const totp = new OTPAuth.TOTP({
      issuer: 'FaturaApp',
      label: currentUser || 'User',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(setupSecret)
    });

    const delta = totp.validate({ token: verificationCode, window: 1 });
    
    if (delta !== null) {
      // Valid! Enable 2FA for current user
      const updatedUsers = users.map(u => {
        if (u.username === currentUser) {
          return {
            ...u,
            twoFactorSecret: setupSecret,
            twoFactorEnabled: true
          };
        }
        return u;
      });
      setUsers(updatedUsers);
      setIsSettingUp2FA(false);
      setTwoFASuccess('2FA başarıyla etkinleştirildi.');
    } else {
      setTwoFAError('Geçersiz kod. Lütfen doğru girdiğinizden emin olun.');
    }
  };

  const handleDisable2FA = () => {
    if (confirm('İki Aşamalı Doğrulamayı (2FA) devre dışı bırakmak istediğinize emin misiniz?')) {
      const updatedUsers = users.map(u => {
        if (u.username === currentUser) {
          return {
            ...u,
            twoFactorSecret: undefined,
            twoFactorEnabled: false
          };
        }
        return u;
      });
      setUsers(updatedUsers);
      setTwoFASuccess('2FA devre dışı bırakıldı.');
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    setUserSuccess('');

    if (users.some(u => u.username.toLowerCase() === newUsername.toLowerCase())) {
      setUserError('Bu kullanıcı adı zaten alınmış.');
      return;
    }
    
    if (newPin.length < 4) {
      setUserError('PIN en az 4 haneli olmalıdır.');
      return;
    }

    const newUser = { username: newUsername, pin: newPin };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    
    setNewUsername('');
    setNewPin('');
    setUserSuccess(`Kullanıcı "${newUsername}" başarıyla oluşturuldu.`);
  };

  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const handleDeleteUser = (username: string) => {
    if (username === currentUser) {
      setUserError('Kendi hesabınızı silemezsiniz.');
      return;
    }
    setUserToDelete(username);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      const updatedUsers = users.filter(u => u.username !== userToDelete);
      setUsers(updatedUsers);
      setUserToDelete(null);
      setUserSuccess(`Kullanıcı başarıyla silindi.`);
    }
  };

  const cancelDeleteUser = () => {
    setUserToDelete(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0a0a0a] to-[#0f0f13] p-6 rounded-3xl border border-neutral-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-neutral-900 rounded-2xl border border-neutral-800 shadow-inner">
            <Settings className="h-6 w-6 text-neutral-300" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Güvenlik ve Ayarlar</h1>
            <p className="text-sm font-medium text-neutral-400 mt-1">
              Aktif Kullanıcı: <span className="text-indigo-400 font-bold">{currentUser}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 2FA Section */}
        <div className="bg-[#0a0a0a] rounded-3xl p-6 border border-neutral-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-neutral-800 pb-4 gap-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                İki Aşamalı Doğrulama (2FA)
              </h2>
              <p className="text-xs text-neutral-400 mt-1">Hesabınızı ek bir güvenlik katmanıyla koruyun</p>
            </div>
          </div>

          {twoFASuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
              <p className="text-xs font-medium text-emerald-300">{twoFASuccess}</p>
            </div>
          )}

          {activeUser?.twoFactorEnabled ? (
            <div className="space-y-4">
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 text-center space-y-3">
                <div className="mx-auto h-12 w-12 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
                  <ShieldCheck className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">2FA Aktif</h3>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                  Hesabınız Authenticator uygulaması ile korunmaktadır. Giriş yaparken her zaman 6 haneli kod istenecektir.
                </p>
              </div>
              <button
                onClick={handleDisable2FA}
                className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold border border-rose-500/20 transition-colors cursor-pointer"
              >
                2FA'yı Devre Dışı Bırak
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {!isSettingUp2FA ? (
                <div className="text-center space-y-4">
                  <div className="bg-neutral-900/50 rounded-2xl p-6 border border-neutral-800">
                    <Smartphone className="h-10 w-10 text-neutral-500 mx-auto mb-3" />
                    <p className="text-xs text-neutral-400 mb-4">
                      Authenticator uygulaması (Google Authenticator, Authy vb.) kullanarak hesabınıza güvenli giriş yapabilirsiniz.
                    </p>
                    <button
                      onClick={handleStart2FASetup}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-900/20 cursor-pointer"
                    >
                      2FA Kurulumunu Başlat
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 animate-fade-in">
                  <div className="bg-white p-4 rounded-2xl mx-auto w-max">
                    <QRCodeSVG value={setupUri} size={150} />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <p className="text-[11px] text-neutral-400">
                      Veya bu gizli anahtarı manuel olarak girin:
                    </p>
                    <p className="text-xs font-mono font-bold text-indigo-400 select-all bg-indigo-500/10 py-1.5 px-3 rounded-lg border border-indigo-500/20 inline-block">
                      {setupSecret}
                    </p>
                  </div>

                  {twoFAError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-3">
                      <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />
                      <p className="text-xs font-medium text-rose-300">{twoFAError}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block text-center">
                      Doğrulama Kodunu Girin
                    </label>
                    <div className="relative max-w-[200px] mx-auto">
                      <Key className="absolute left-4 top-2.5 h-4 w-4 text-neutral-500" />
                      <input
                        type="text"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-[#111115] border border-neutral-800 rounded-xl py-2 pl-11 pr-4 text-sm text-white text-center focus:outline-none focus:border-indigo-500 font-mono font-bold tracking-widest"
                        placeholder="000000"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsSettingUp2FA(false)}
                      className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-bold border border-neutral-800 cursor-pointer transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleVerifyAndEnable2FA}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/20 cursor-pointer transition-colors flex items-center justify-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Doğrula ve Etkinleştir
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile Update Section */}
        <div className="bg-[#0a0a0a] rounded-3xl p-6 border border-neutral-800 shadow-sm space-y-6">
          <div className="border-b border-neutral-800 pb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Key className="h-4 w-4 text-indigo-400" />
              Profil Bilgileri (Kullanıcı Adı & PIN)
            </h2>
            <p className="text-xs text-neutral-400 mt-1">Mevcut kullanıcı adınızı ve giriş PIN kodunuzu güncelleyin.</p>
          </div>

          {updateSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
              <p className="text-xs font-medium text-emerald-300">{updateSuccess}</p>
            </div>
          )}

          {updateError && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />
              <p className="text-xs font-medium text-rose-300">{updateError}</p>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Yeni Kullanıcı Adı</label>
              <input
                type="text"
                required
                value={updateUsername}
                onChange={(e) => setUpdateUsername(e.target.value)}
                className="w-full bg-[#111115] border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Yeni PIN Kodu (Değiştirmek İstemiyorsanız Boş Bırakın)</label>
              <input
                type="password"
                value={updatePin}
                onChange={(e) => setUpdatePin(e.target.value)}
                className="w-full bg-[#111115] border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                placeholder="En az 4 hane (İsteğe bağlı)"
              />
            </div>

            <div className="pt-2 border-t border-neutral-800/50">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Mevcut PIN Kodu (Doğrulama İçin Zorunlu) <span className="text-rose-500">*</span></label>
                <input
                  type="password"
                  required
                  value={updateCurrentPin}
                  onChange={(e) => setUpdateCurrentPin(e.target.value)}
                  className="w-full bg-[#111115] border border-rose-500/30 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                  placeholder="Mevcut PIN kodunuzu girin"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-900/20 cursor-pointer transition-colors"
            >
              Bilgilerimi Güncelle
            </button>
          </form>
        </div>

        {/* User Management Section */}
        <div className="bg-[#0a0a0a] rounded-3xl p-6 border border-neutral-800 shadow-sm space-y-6">
          <div className="border-b border-neutral-800 pb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-amber-400" />
              Yedek Kullanıcı Yönetimi
            </h2>
            <p className="text-xs text-neutral-400 mt-1">Sisteme yeni kullanıcılar ekleyin (Ortak/Personel vb.)</p>
          </div>

          {userSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
              <p className="text-xs font-medium text-emerald-300">{userSuccess}</p>
            </div>
          )}

          {userError && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />
              <p className="text-xs font-medium text-rose-300">{userError}</p>
            </div>
          )}

          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Kullanıcı Adı</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-[#111115] border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                  placeholder="örn. muhasebe"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">PIN Kodu</label>
                <input
                  type="password"
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full bg-[#111115] border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  placeholder="En az 4 hane"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-xs font-bold border border-amber-500/20 transition-colors cursor-pointer"
            >
              Kullanıcı Ekle
            </button>
          </form>

          <div className="pt-2 border-t border-neutral-800/50">
            <h3 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-3">Mevcut Kullanıcılar</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {users.map(u => (
                <div key={u.username} className="flex items-center justify-between p-3 bg-neutral-900/50 rounded-xl border border-neutral-800">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">{u.username}</span>
                    <span className="text-[10px] font-mono text-neutral-500">
                      2FA: {u.twoFactorEnabled ? <span className="text-emerald-400">Aktif</span> : <span className="text-neutral-600">Pasif</span>}
                    </span>
                  </div>
                  {u.username !== currentUser && (
                    <div className="flex items-center gap-2">
                      {userToDelete === u.username ? (
                        <div className="flex items-center gap-2 animate-fade-in bg-rose-500/10 p-1.5 rounded-lg border border-rose-500/20">
                          <span className="text-[10px] text-rose-400 font-bold px-1">Silinsin mi?</span>
                          <button
                            onClick={confirmDeleteUser}
                            className="bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded cursor-pointer"
                          >
                            Evet
                          </button>
                          <button
                            onClick={cancelDeleteUser}
                            className="bg-neutral-800 text-neutral-300 text-[10px] font-bold px-2 py-1 rounded cursor-pointer"
                          >
                            İptal
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDeleteUser(u.username)}
                          className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Kullanıcıyı Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                  {u.username === currentUser && (
                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">
                      Siz
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
