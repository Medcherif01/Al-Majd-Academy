import { useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../utils/api';
import type { UiLanguage, UserProfile } from '../types/academy';

interface AuthModalProps {
  open: boolean;
  lang: UiLanguage;
  onClose: () => void;
  onSuccess: (token: string, user: UserProfile) => void;
}

export function AuthModal({ open, lang, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'student' | 'parent'>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preferredTrack, setPreferredTrack] = useState('ib');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await apiRequest<{ token: string; user: UserProfile }>('/api/auth/login', {
          method: 'POST',
          body: { email, password },
        });
        onSuccess(res.token, res.user);
        onClose();
      } else {
        const res = await apiRequest<{ token: string; user: UserProfile }>('/api/auth/register', {
          method: 'POST',
          body: { name, email, password, role, preferredTrack },
        });
        onSuccess(res.token, res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Erreur d’authentification');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = async (demoRole: 'student' | 'parent') => {
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: UserProfile }>('/api/auth/demo', {
        method: 'POST',
        body: { role: demoRole },
      });
      onSuccess(res.token, res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Impossible de lancer la session démo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 sm:p-8 shadow-xl relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-4 end-4 p-2 text-slate-500 hover:text-slate-900 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <p className="text-xs font-medium text-emerald-800 mb-1">
            {lang === 'ar' ? 'بوابة الأكاديمية' : lang === 'en' ? 'Academy Account' : 'Compte Académique'}
          </p>
          <h2 className="font-display text-2xl font-semibold text-slate-900">
            {mode === 'login'
              ? lang === 'ar'
                ? 'تسجيل الدخول'
                : lang === 'en'
                  ? 'Sign in to your portal'
                  : 'Accéder à votre espace'
              : lang === 'ar'
                ? 'إنشاء حساب طالب أو ولي أمر'
                : lang === 'en'
                  ? 'Create Student or Parent Account'
                  : 'Créer un compte Élève ou Parent'}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            {lang === 'ar' ? 'دخول' : lang === 'en' ? 'Sign In' : 'Connexion'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            {lang === 'ar' ? 'حساب جديد' : lang === 'en' ? 'Register' : 'Inscription'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  {lang === 'ar' ? 'نوع الحساب' : lang === 'en' ? 'Account Type' : 'Profil'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer ${
                      role === 'student'
                        ? 'border-emerald-800 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    {lang === 'ar' ? 'طالب' : lang === 'en' ? 'Student' : 'Élève'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('parent')}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer ${
                      role === 'parent'
                        ? 'border-emerald-800 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    {lang === 'ar' ? 'ولي أمر' : lang === 'en' ? 'Parent' : 'Parent'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {lang === 'ar' ? 'الاسم الكامل' : lang === 'en' ? 'Full Name' : 'Nom complet'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Youssef Al-Harbi"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {lang === 'ar' ? 'المسار الدراسي' : lang === 'en' ? 'Primary Track' : 'Cursus principal'}
                </label>
                <select
                  value={preferredTrack}
                  onChange={(e) => setPreferredTrack(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
                >
                  <option value="american">American (Digital SAT / AP)</option>
                  <option value="ib">IB Diploma (HL / SL)</option>
                  <option value="british">Cambridge IGCSE &amp; A-Level</option>
                  <option value="nafes">NAFIS / نافس (ETEC)</option>
                  <option value="qiyas">Qudurat &amp; Tahsili (قياس)</option>
                  <option value="french">Baccalauréat Français (AEFE)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="famille@exemple.sa"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {lang === 'ar' ? 'كلمة المرور' : lang === 'en' ? 'Password' : 'Mot de passe'}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading
              ? '...'
              : mode === 'login'
                ? lang === 'ar'
                  ? 'تسجيل الدخول'
                  : lang === 'en'
                    ? 'Sign In'
                    : 'Se connecter'
                : lang === 'ar'
                  ? 'إنشاء الحساب'
                  : lang === 'en'
                    ? 'Create Account'
                    : 'Créer mon compte'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-600 mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              {lang === 'ar'
                ? 'دخول تجريبي فوري لاستعراض المنصة:'
                : lang === 'en'
                  ? 'Instant Demo Access (Student / Parent):'
                  : 'Accès Démonstration Instantané :'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemoAccess('student')}
              className="py-2 px-3 border border-slate-300 hover:border-slate-900 rounded-lg text-xs font-medium text-slate-800 transition-colors cursor-pointer"
            >
              {lang === 'ar' ? 'حساب طالب تجريبي' : lang === 'en' ? 'Demo Student' : 'Démo Élève'}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemoAccess('parent')}
              className="py-2 px-3 border border-slate-300 hover:border-slate-900 rounded-lg text-xs font-medium text-slate-800 transition-colors cursor-pointer"
            >
              {lang === 'ar' ? 'حساب ولي أمر' : lang === 'en' ? 'Demo Parent' : 'Démo Parent'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
