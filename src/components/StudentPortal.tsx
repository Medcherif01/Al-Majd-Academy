import { Calendar, Download, FileCheck2, LogOut, Sparkles } from 'lucide-react';
import { downloadProtectedPaper } from '../utils/api';
import { TRANSLATIONS } from '../i18n/translations';
import type {
  BookingItem,
  GeneratedExam,
  PastPaperSummary,
  ProgressState,
  UiLanguage,
  UserProfile,
} from '../types/academy';

interface StudentPortalProps {
  lang: UiLanguage;
  user: UserProfile | null;
  token: string | null;
  progress: ProgressState;
  papers: PastPaperSummary[];
  bookings: BookingItem[];
  savedExams: GeneratedExam[];
  onOpenAuth: () => void;
  onSignOut: () => void;
  onReopenAiExam: (exam: GeneratedExam) => void;
  onGoToPastPapers: () => void;
  onGoToTutors: () => void;
}

export function StudentPortal({
  lang,
  user,
  token,
  progress,
  papers,
  bookings,
  savedExams,
  onOpenAuth,
  onSignOut,
  onReopenAiExam,
  onGoToPastPapers,
  onGoToTutors,
}: StudentPortalProps) {
  const t = TRANSLATIONS[lang];

  if (!user || !token) {
    return (
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-xs font-semibold text-emerald-800 mb-2">{t.portalTitle}</p>
        <h2 className="font-display text-3xl font-semibold text-slate-900 mb-3">
          {lang === 'ar'
            ? 'سجّل الدخول لمتابعة التقدم والاختبارات'
            : lang === 'en'
              ? 'Sign in to access your academic records'
              : 'Connectez-vous pour accéder à votre espace élève & parents'}
        </h2>
        <p className="text-sm text-slate-600 max-w-xl mx-auto mb-6 leading-relaxed">
          {t.portalSubtitle}
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="px-6 py-3 bg-slate-900 hover:bg-emerald-900 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
        >
          {t.ctaSignIn}
        </button>
      </section>
    );
  }

  const unlockedPapers = papers.filter((p) => p.isUnlocked);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-semibold text-emerald-800 mb-1">
            {user.role === 'parent'
              ? lang === 'ar'
                ? 'حساب ولي الأمر'
                : lang === 'en'
                  ? 'Parent Account'
                  : 'Compte Parent'
              : lang === 'ar'
                ? 'حساب الطالب'
                : lang === 'en'
                  ? 'Student Account'
                  : 'Compte Élève'}{' '}
            · {user.email}
          </p>
          <h2 className="font-display text-3xl font-semibold text-slate-900">{user.name}</h2>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 hover:border-slate-900 rounded-lg text-xs font-semibold text-slate-800 self-start cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t.signOut}</span>
        </button>
      </div>

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 mb-1">
            {lang === 'ar' ? 'الدروس المكتملة' : lang === 'en' ? 'Lessons Completed' : 'Leçons validées'}
          </div>
          <div className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {progress.completedLessonIds.length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 mb-1">
            {lang === 'ar' ? 'الاختبارات المفتوحة' : lang === 'en' ? 'Unlocked Papers' : 'Past Papers débloqués'}
          </div>
          <div className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {user.hasAllAccessPass ? `${papers.length} (Pass)` : unlockedPapers.length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 mb-1">
            {lang === 'ar' ? 'حصص المدربين' : lang === 'en' ? 'Tutoring Sessions' : 'Séances réservées'}
          </div>
          <div className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {bookings.length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 mb-1">
            {lang === 'ar' ? 'اختبارات Gemini' : lang === 'en' ? 'AI Exams Saved' : 'Examens IA enregistrés'}
          </div>
          <div className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {savedExams.length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Unlocked Past Papers */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-xl font-semibold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-800" />
              <span>
                {lang === 'ar'
                  ? 'الاختبارات السابقة والحلول المتاحة'
                  : lang === 'en'
                    ? 'Unlocked Past Papers & Mark Schemes'
                    : 'Past Papers & Corrections Débloqués'}
              </span>
            </h3>
            <button
              type="button"
              onClick={onGoToPastPapers}
              className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer"
            >
              {lang === 'ar' ? 'تصفح الكل' : lang === 'en' ? 'Browse Vault' : 'Voir le coffre'}
            </button>
          </div>

          {unlockedPapers.length === 0 ? (
            <p className="text-sm text-slate-600 py-4">
              {lang === 'ar'
                ? 'لم تقم بشراء أي اختبارات سابقة بعد.'
                : lang === 'en'
                  ? 'No Past Papers unlocked yet.'
                  : 'Aucun Past Paper débloqué pour le moment.'}
            </p>
          ) : (
            <div className="space-y-3">
              {unlockedPapers.map((paper) => (
                <div
                  key={paper.id}
                  className="p-4 rounded-lg border border-slate-200 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-xs font-mono text-emerald-800">{paper.code}</div>
                    <div className="text-sm font-semibold text-slate-900">{paper.title}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadProtectedPaper(paper.id, token, paper.code)}
                    className="px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'تحميل' : lang === 'en' ? 'Download' : 'Télécharger'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tutoring Reservations */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-800" />
              <span>
                {lang === 'ar'
                  ? 'حجوزات المدربين المباشرين'
                  : lang === 'en'
                    ? 'Booked Online Tutoring'
                    : 'Mes Séances avec les Formateurs'}
              </span>
            </h3>
            <button
              type="button"
              onClick={onGoToTutors}
              className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer"
            >
              {t.bookTrainerBtn}
            </button>
          </div>

          {bookings.length === 0 ? (
            <p className="text-sm text-slate-600 py-4">
              {lang === 'ar'
                ? 'لا توجد حصص محجوزة حالياً مع مروان المحمدي أو محمد شريف.'
                : lang === 'en'
                  ? 'No tutoring sessions booked yet with Marwan Mhamdi or Mohamed Cherif.'
                  : 'Aucune séance réservée pour le moment avec Marwan Mhamdi ou Mohamed Cherif.'}
            </p>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div key={b.id} className="p-4 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-800">{b.trainerName}</span>
                    <span className="font-mono text-slate-700 tabular-nums">{b.priceSar} SAR</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {b.curriculum} · {b.subject}
                  </div>
                  <div className="text-xs text-slate-600 tabular-nums">
                    {b.dateSlot} · {b.timeSlot} · {b.language} · {b.sessionPackage}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Saved AI Exams */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-display text-xl font-semibold text-slate-900 mb-5 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-800" />
          <span>
            {lang === 'ar'
              ? 'الاختبارات المحفوظة عبر Gemini'
              : lang === 'en'
                ? 'Saved Gemini AI Exam Papers'
                : 'Historique des Examens Générés par Gemini IA'}
          </span>
        </h3>

        {savedExams.length === 0 ? (
          <p className="text-sm text-slate-600">
            {lang === 'ar'
              ? 'قم بتوليد اختبار في استوديو الذكاء لحفظه هنا.'
              : lang === 'en'
                ? 'Generate an exam in the AI Studio while signed in to save it here.'
                : 'Générez une épreuve dans le Studio Examens IA pour la retrouver ici.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedExams.map((ex) => (
              <div
                key={ex.id}
                className="p-4 rounded-lg border border-slate-200 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="text-xs text-slate-500 mb-1">
                    {ex.curriculum} · {ex.language}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 line-clamp-2">{ex.title}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onReopenAiExam(ex)}
                  className="px-3 py-2 bg-slate-900 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {lang === 'ar' ? 'فتح الاختبار' : lang === 'en' ? 'Open Exam' : 'Ouvrir l’épreuve'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
