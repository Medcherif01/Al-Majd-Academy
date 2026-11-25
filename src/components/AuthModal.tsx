import { useState } from 'react';
import { KeyRound, ShieldCheck, X } from 'lucide-react';
import { apiRequest } from '../utils/api';
import { StudentPortalEmblem } from './BrandIcons';
import type { RosterStudent, UiLanguage, UserProfile } from '../types/academy';

interface AuthModalProps {
  open: boolean;
  lang: UiLanguage;
  onClose: () => void;
  onSuccess: (token: string, user: UserProfile) => void;
}

export function AuthModal({ open, lang, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'code'>('login');
  const [role, setRole] = useState<'student' | 'parent'>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preferredTrack, setPreferredTrack] = useState('ib');
  const [inviteCode, setInviteCode] = useState('');
  const [redeemedStudent, setRedeemedStudent] = useState<RosterStudent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'code') {
        const res = await apiRequest<{ student: RosterStudent }>('/api/auth/redeem-code', {
          method: 'POST',
          body: { code: inviteCode },
        });
        setRedeemedStudent(res.student);
      } else if (mode === 'login') {
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
      <div className="bg-white border border-[#DCE3F0] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-4 end-4 p-2 text-slate-500 hover:text-[#0B1633] rounded-lg cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5 flex items-center gap-3.5">
          <StudentPortalEmblem className="w-12 h-12 shrink-0" />
          <div>
            <p className="font-mono text-xs font-semibold text-[#1D4ED8] mb-0.5">
              {lang === 'ar' ? 'بوابة الأكاديمية' : lang === 'en' ? 'Academy Account' : 'Compte Académique'}
            </p>
            <h2 className="font-display text-2xl font-extrabold text-[#0B1633] tracking-tight">
              {mode === 'code'
                ? lang === 'ar'
                  ? 'تفعيل رمز الدعوة'
                  : lang === 'en'
                    ? 'Activate Invitation Code'
                    : 'Activer un Code d’Invitation'
                : mode === 'login'
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
        </div>

        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setRedeemedStudent(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              mode === 'login' ? 'bg-white text-[#0F2537] shadow-xs' : 'text-slate-600'
            }`}
          >
            {lang === 'ar' ? 'دخول' : lang === 'en' ? 'Sign In' : 'Connexion'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
              setRedeemedStudent(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              mode === 'register' ? 'bg-white text-[#0F2537] shadow-xs' : 'text-slate-600'
            }`}
          >
            {lang === 'ar' ? 'حساب جديد' : lang === 'en' ? 'Register' : 'Inscription'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('code');
              setError('');
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              mode === 'code' ? 'bg-white text-[#0B6E8C] shadow-xs' : 'text-slate-600'
            }`}
          >
            PATH / FAM
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
            {error}
          </div>
        )}

        {redeemedStudent && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
            <div className="font-semibold">
              Code activé pour {redeemedStudent.name} ({redeemedStudent.grade})
            </div>
            <div>
              Programme : <strong>{redeemedStudent.program}</strong> · Mission :{' '}
              {redeemedStudent.weeklyMission}
            </div>
            <div className="pt-1 text-emerald-800">
              Utilisez « Démo Élève » ou « Démo Parent » ci-dessous pour ouvrir le tableau de bord complet.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'code' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {lang === 'ar'
                  ? 'رمز الطالب (PATH-...) أو ولي الأمر (FAM-...)'
                  : lang === 'en'
                    ? 'Teacher Invitation Code (PATH-... or FAM-...)'
                    : 'Code transmis par le formateur (PATH-... ou FAM-...)'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="PATH-Z9HJYZ or FAM-CUFDVR"
                  className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full py-2.5 px-4 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-sm font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>{loading ? '...' : 'Activer le code'}</span>
              </button>
            </div>
          ) : (
            <>
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {lang === 'ar' ? 'نوع الحساب' : lang === 'en' ? 'Account Type' : 'Profil'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole('student')}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                          role === 'student'
                            ? 'border-[#0B6E8C] bg-[#EEF5F9] text-[#0F2537]'
                            : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        {lang === 'ar' ? 'طالب' : lang === 'en' ? 'Student' : 'Élève'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('parent')}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                          role === 'parent'
                            ? 'border-[#0B6E8C] bg-[#EEF5F9] text-[#0F2537]'
                            : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        {lang === 'ar' ? 'ولي أمر' : lang === 'en' ? 'Parent' : 'Parent'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {lang === 'ar' ? 'الاسم الكامل' : lang === 'en' ? 'Full Name' : 'Nom complet'}
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Youssef Al-Harbi"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {lang === 'ar' ? 'المسار الدراسي' : lang === 'en' ? 'Primary Track' : 'Cursus principal'}
                    </label>
                    <select
                      value={preferredTrack}
                      onChange={(e) => setPreferredTrack(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
                    >
                      <option value="american">American (Digital SAT / AP)</option>
                      <option value="ib">IB Diploma (HL / SL)</option>
                      <option value="british">Cambridge IGCSE &amp; A-Level</option>
                      <option value="nafes">NAFS / نافس (ETEC)</option>
                      <option value="qiyas">Qudurat &amp; Tahsili (قياس)</option>
                      <option value="french">Baccalauréat Français (AEFE)</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="famille@exemple.sa"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'كلمة المرور' : lang === 'en' ? 'Password' : 'Mot de passe'}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 cursor-pointer"
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
            </>
          )}
        </form>

        <div className="mt-6 pt-5 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-600 mb-3">
            <ShieldCheck className="w-4 h-4 text-[#1D4ED8] shrink-0" />
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
              className="py-2.5 px-3 border border-[#BFDBFE] bg-[#F5F8FF] hover:border-[#1D4ED8] rounded-xl text-xs font-semibold text-[#0B1633] transition-colors cursor-pointer"
            >
              {lang === 'ar' ? 'حساب طالب تجريبي' : lang === 'en' ? 'Demo Student' : 'Démo Élève'}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemoAccess('parent')}
              className="py-2.5 px-3 border border-slate-300 hover:border-[#1D4ED8] rounded-xl text-xs font-semibold text-[#0B1633] transition-colors cursor-pointer"
            >
              {lang === 'ar' ? 'حساب ولي أمر' : lang === 'en' ? 'Demo Parent' : 'Démo Parent'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
