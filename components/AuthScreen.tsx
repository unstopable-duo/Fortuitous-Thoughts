
import { Chrome } from 'lucide-react';
import React, { useState, useCallback } from 'react';
import { Brain, Lock, Mail, ArrowRight, User, Sparkles, AlertCircle, CheckCircle2, Globe, Eye, EyeOff } from 'lucide-react';
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '../services/supabase';
import { AppLanguage } from '../types';
import { getTranslation } from '../services/translations';

interface AuthScreenProps {
  onLogin: () => void;
  onGuestEntry: () => void;
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onGuestEntry, language, onLanguageChange }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const t = (key: string) => getTranslation(language, key);

  const validatePassword = useCallback((pass: string) => {
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNumber = /\d/.test(pass);
    const hasSpecial = /[@$!%*?&]/.test(pass);
    const minLength = pass.length >= 8;
    return { hasUpper, hasLower, hasNumber, hasSpecial, minLength, all: hasUpper && hasLower && hasNumber && hasSpecial && minLength };
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error.message);
      } else {
        onLogin();
      }
    } catch (err: any) {
      setError(err.message || 'OAuth initialization failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedEmail = email.trim();

    if (!isLogin) {
      if (!username.trim()) {
        setError("Username is required.");
        setLoading(false);
        return;
      }
      const validation = validatePassword(password);
      if (!validation.all) {
        setError(t('pass_requirements'));
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }
    }

    try {
      const { data, error } = isLogin 
        ? await signInWithEmail(trimmedEmail, password)
        : await signUpWithEmail(trimmedEmail, password, username);

      if (error) {
        if (error.message.includes("User already exists")) {
            setError(t('user_exists'));
        } else if (error.message.includes("Invalid login credentials")) {
            setError(t('invalid_creds'));
        } else if (error.message.includes("API key")) {
            setError("Configuration Error: Invalid Supabase API Key.");
        } else {
            setError(error.message);
        }
      } else if (data.session || (!isLogin && data.user)) {
        if (!isLogin && !data.session) {
           setError(t('reg_success'));
           setIsLogin(true);
        } else {
           onLogin();
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const passValidation = validatePassword(password);

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-900 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-black animate-gradient-x opacity-80"></div>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
           <div className="absolute top-[10%] left-[20%] w-72 h-72 bg-purple-600 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-float"></div>
           <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-pink-600 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-float animation-delay-2000"></div>
           <div className="absolute top-[40%] left-[60%] w-64 h-64 bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-float animation-delay-4000"></div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-5xl flex flex-col md:flex-row items-center gap-12 md:gap-24">
        <div className="flex-1 text-center md:text-left space-y-6 text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
            <Sparkles size={14} className="text-yellow-300" />
            <span className="text-xs font-medium tracking-wide text-indigo-200">{t('ai_cognition')}</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold brand-font tracking-tight leading-tight">{t('hero_title')}</h1>
          <p className="text-lg text-indigo-200/80 max-w-md mx-auto md:mx-0 leading-relaxed">{t('hero_desc')}</p>
          <div className="pt-8 opacity-60">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Licensed Product of TRN Technologies</p>
          </div>
        </div>

        <div className="w-full max-w-md glass-card rounded-3xl p-8 shadow-2xl relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative">
            <div className="absolute top-0 right-0">
               <div className="relative group/lang">
                  <button className="text-white/40 hover:text-white transition-colors p-2"><Globe size={16} /></button>
                  <div className="absolute right-0 top-full mt-2 w-32 bg-black/80 backdrop-blur border border-white/10 rounded-xl overflow-hidden hidden group-hover/lang:block z-50">
                     {['en', 'af', 'fr', 'zh'].map(l => (
                       <button key={l} onClick={() => onLanguageChange(l as AppLanguage)} className={`w-full text-left px-4 py-2 text-xs hover:bg-white/10 ${language === l ? 'text-accent font-bold' : 'text-white/70'}`}>{l.toUpperCase()}</button>
                     ))}
                  </div>
               </div>
            </div>

            <div className="flex gap-2 mb-8 p-1 bg-black/20 rounded-xl backdrop-blur-md mr-8">
              <button onClick={() => { setIsLogin(true); setError(null); }} className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all duration-300 ${isLogin ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}>{t('sign_in')}</button>
              <button onClick={() => { setIsLogin(false); setError(null); }} className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all duration-300 ${!isLogin ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}>{t('sign_up')}</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-xs font-semibold text-indigo-200 uppercase tracking-wider ml-1">Username</label>
                  <div className="relative group/input">
                    <User className="absolute left-4 top-3.5 text-indigo-300/50 group-focus-within/input:text-white transition-colors" size={18} />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-purple-500 focus:bg-black/40 transition-all placeholder-white/20"
                      placeholder=""
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-indigo-200 uppercase tracking-wider ml-1">{t('email')}</label>
                <div className="relative group/input">
                  <Mail className="absolute left-4 top-3.5 text-indigo-300/50 group-focus-within/input:text-white transition-colors" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-purple-500 focus:bg-black/40 transition-all placeholder-white/20"
                    placeholder="visionary@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-indigo-200 uppercase tracking-wider ml-1">{t('password')}</label>
                <div className="relative group/input">
                  <Lock className="absolute left-4 top-3.5 text-indigo-300/50 group-focus-within/input:text-white transition-colors" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 text-white rounded-xl py-3 pl-12 pr-12 focus:outline-none focus:border-purple-500 focus:bg-black/40 transition-all placeholder-white/20"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-white/30 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {!isLogin && password.length > 0 && (
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-2 mt-2">
                    <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1">{t('security_standards')}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`flex items-center gap-1.5 text-[10px] ${passValidation.minLength ? 'text-green-400' : 'text-white/30'}`}>{passValidation.minLength ? <CheckCircle2 size={10} /> : <div className="w-2.5 h-2.5 rounded-full border border-white/20" />} {t('min_chars')}</div>
                      <div className={`flex items-center gap-1.5 text-[10px] ${passValidation.hasUpper ? 'text-green-400' : 'text-white/30'}`}>{passValidation.hasUpper ? <CheckCircle2 size={10} /> : <div className="w-2.5 h-2.5 rounded-full border border-white/20" />} {t('uppercase')}</div>
                      <div className={`flex items-center gap-1.5 text-[10px] ${passValidation.hasNumber ? 'text-green-400' : 'text-white/30'}`}>{passValidation.hasNumber ? <CheckCircle2 size={10} /> : <div className="w-2.5 h-2.5 rounded-full border border-white/20" />} {t('number')}</div>
                      <div className={`flex items-center gap-1.5 text-[10px] ${passValidation.hasSpecial ? 'text-green-400' : 'text-white/30'}`}>{passValidation.hasSpecial ? <CheckCircle2 size={10} /> : <div className="w-2.5 h-2.5 rounded-full border border-white/20" />} {t('symbol')}</div>
                    </div>
                  </div>
                )}
              </div>

              {!isLogin && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-xs font-semibold text-indigo-200 uppercase tracking-wider ml-1">Confirm Password</label>
                  <div className="relative group/input">
                    <Lock className="absolute left-4 top-3.5 text-indigo-300/50 group-focus-within/input:text-white transition-colors" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full bg-black/20 border text-white rounded-xl py-3 pl-12 pr-12 focus:outline-none focus:bg-black/40 transition-all placeholder-white/20 ${confirmPassword && confirmPassword !== password ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-purple-500'}`}
                      placeholder="••••••••"
                    />
                  </div>
                  {confirmPassword && confirmPassword !== password && (
                      <p className="text-[10px] text-red-400 ml-1">Passwords do not match</p>
                  )}
                </div>
              )}

              {error && <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm backdrop-blur-sm flex items-start gap-3"><AlertCircle size={16} className="shrink-0 mt-0.5" /><span>{error}</span></div>}

              <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-purple-900/40 hover:shadow-purple-700/60 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 mt-4">{loading ? <Sparkles className="animate-spin" /> : <>{isLogin ? t('enter_portal') : t('begin_journey')}<ArrowRight size={20} /></>}</button>
            </form>

            <div className="mt-4">
                <button 
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-white text-navy-900 hover:bg-slate-100 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-3 shadow-md active:scale-[0.98]"
                >
                    <Chrome size={18} />
                    Sign in with Google
                </button>
            </div>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
              <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest"><span className="bg-transparent px-4 text-white/30 backdrop-blur-xl">{t('or_explore')}</span></div>
            </div>
            <button onClick={onGuestEntry} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-indigo-200 hover:text-white py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02]"><User size={18} />{t('guest_mode')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
