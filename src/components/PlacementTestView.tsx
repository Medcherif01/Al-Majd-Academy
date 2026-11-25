import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  GraduationCap,
  Lock,
  RotateCcw,
  Target,
  UserCheck,
} from 'lucide-react';
import { apiRequest } from '../utils/api';
import type {
  CurriculumKey,
  GradeOption,
  PaidCourseItem,
  PlacementQuestionItem,
  PlacementResult,
  StudentTrackLock,
  UiLanguage,
  UserProfile,
} from '../types/academy';

interface PlacementTestViewProps {
  lang: UiLanguage;
  token: string | null;
  user: UserProfile | null;
  grades: GradeOption[];
  paidCourses: PaidCourseItem[];
  latestResult: PlacementResult | null;
  trackLock: StudentTrackLock | null;
  hasPaidAccess: boolean;
  onTrackLocked: (lock: StudentTrackLock) => void;
  onUserUpdated?: (user: UserProfile) => void;
  onResultReady: (result: PlacementResult) => void;
  onGoToCourse: (courseId: string, curriculumKey?: string) => void;
  onGoToPaidCourse: (paidCourseId: string) => void;
  onGoToTrainer: (trainerId: 'marwan' | 'mohamed') => void;
}

const CURRICULA_OPTIONS: {
  id: string;
  label: string;
  trackKey: Exclude<CurriculumKey, 'all'>;
}[] = [
  { id: 'American (SAT / AP)', label: 'American (Digital SAT / AP)', trackKey: 'american' },
  { id: 'IB Diploma', label: 'IB Diploma (DP / MYP)', trackKey: 'ib' },
  { id: 'IGCSE & A-Level', label: 'Cambridge IGCSE & A-Level', trackKey: 'british' },
  { id: 'NAFS (ETEC)', label: 'NAFS / نافس (ETEC)', trackKey: 'nafes' },
  { id: 'Qudurat & Tahsili', label: 'Qudurat & Tahsili (قياس)', trackKey: 'qiyas' },
  { id: 'Bac Français AEFE', label: 'Système Français (Brevet / Bac AEFE)', trackKey: 'french' },
];

function resolveTrackKey(currId: string): Exclude<CurriculumKey, 'all'> {
  const found = CURRICULA_OPTIONS.find((c) => c.id === currId);
  if (found) return found.trackKey;
  const lower = currId.toLowerCase();
  if (lower.includes('nafs') || lower.includes('nafes')) return 'nafes';
  if (lower.includes('qudurat') || lower.includes('tahsili') || lower.includes('qiyas')) return 'qiyas';
  if (lower.includes('bac') || lower.includes('français')) return 'french';
  if (lower.includes('igcse')) return 'british';
  if (lower.includes('ib')) return 'ib';
  return 'american';
}

export function PlacementTestView({
  lang,
  token,
  user,
  grades,
  paidCourses,
  latestResult,
  trackLock,
  hasPaidAccess,
  onTrackLocked,
  onUserUpdated,
  onResultReady,
  onGoToCourse,
  onGoToPaidCourse,
  onGoToTrainer,
}: PlacementTestViewProps) {
  const isLocked = Boolean(trackLock && !hasPaidAccess);

  const [step, setStep] = useState<'setup' | 'quiz' | 'report'>(latestResult ? 'report' : 'setup');
  const [selectedGrade, setSelectedGrade] = useState<string>(trackLock?.gradeLevel || 'grade-9');
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>(
    trackLock?.curriculum || 'NAFS (ETEC)'
  );
  const [testLanguage, setTestLanguage] = useState<'Français' | 'English' | 'العربية'>(
    lang === 'ar' ? 'العربية' : lang === 'en' ? 'English' : 'Français'
  );
  const [guestName, setGuestName] = useState<string>('');

  const [questions, setQuestions] = useState<PlacementQuestionItem[]>([]);
  const [gradeLabel, setGradeLabel] = useState<string>(trackLock?.gradeLabel || '');
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<PlacementResult | null>(latestResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (trackLock) {
      setSelectedGrade(trackLock.gradeLevel);
      setSelectedCurriculum(trackLock.curriculum);
      if (trackLock.gradeLabel) setGradeLabel(trackLock.gradeLabel);
    }
  }, [trackLock]);

  useEffect(() => {
    if (latestResult) {
      setResult(latestResult);
    }
  }, [latestResult]);

  const handleCurriculumSelect = (currId: string) => {
    if (isLocked) return;
    setSelectedCurriculum(currId);
    if (currId.includes('NAFS') || currId.includes('NAFES') || currId.includes('Qudurat')) {
      setTestLanguage('العربية');
    } else if (currId.includes('Bac Français')) {
      setTestLanguage('Français');
    } else {
      setTestLanguage('English');
    }
  };

  const handleStartTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const targetGrade = isLocked && trackLock ? trackLock.gradeLevel : selectedGrade;
      const targetCurr = isLocked && trackLock ? trackLock.curriculum : selectedCurriculum;

      const res = await apiRequest<{
        gradeLabel: string;
        questions: PlacementQuestionItem[];
      }>('/api/placement/start', {
        method: 'POST',
        body: {
          gradeLevel: targetGrade,
          curriculum: targetCurr,
          language: testLanguage,
        },
      });

      const lockObj: StudentTrackLock = {
        gradeLevel: targetGrade,
        gradeLabel: res.gradeLabel,
        curriculum: targetCurr,
        trackKey: resolveTrackKey(targetCurr),
      };
      onTrackLocked(lockObj);

      if (token) {
        try {
          const lockRes = await apiRequest<{ user: UserProfile }>('/api/auth/lock-track', {
            method: 'POST',
            token,
            body: { gradeLevel: targetGrade, curriculum: targetCurr },
          });
          onUserUpdated?.(lockRes.user);
        } catch {
          // Non-fatal if already locked
        }
      }

      setGradeLabel(res.gradeLabel);
      setQuestions(res.questions);
      setAnswers({});
      setCurrentIdx(0);
      setStep('quiz');
    } catch (err: any) {
      setError(err.message || 'Impossible de lancer le test de niveau.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTest = async () => {
    setError('');
    setLoading(true);
    try {
      const targetGrade = isLocked && trackLock ? trackLock.gradeLevel : selectedGrade;
      const targetCurr = isLocked && trackLock ? trackLock.curriculum : selectedCurriculum;

      const res = await apiRequest<{
        result: PlacementResult;
        reportId?: string;
        user?: UserProfile;
      }>('/api/placement/evaluate', {
        method: 'POST',
        token,
        body: {
          gradeLevel: targetGrade,
          curriculum: targetCurr,
          language: testLanguage,
          answers,
          studentName: user?.name || guestName.trim() || undefined,
          studentEmail: user?.email,
        },
      });

      if (res.user) {
        onUserUpdated?.(res.user);
      }
      setResult(res.result);
      onResultReady(res.result);
      setStep('report');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l’analyse.');
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentIdx];
  const recommendedPaidCourse = paidCourses.find(
    (c) => c.id === result?.recommendedPaidCourseId
  );

  return (
    <section id="placement-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header Banner */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-wide text-[#0B6E8C] mb-2 flex items-center gap-1.5">
            <Compass className="w-4 h-4" />
            <span>
              {lang === 'ar'
                ? 'الخطوة الأولى · تشخيص المستوى وتثبيت المسار'
                : lang === 'en'
                  ? 'Step 01 · Diagnostic Placement & Track Assignment'
                  : 'Étape 01 · Test de Niveau & Orientation Verrouillée'}
            </span>
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0F2537] text-balance">
            {lang === 'ar'
              ? 'ابدأ باختبار تحديد المستوى المناسب لصفك الدراسي'
              : lang === 'en'
                ? 'Start with your grade-specific Placement Test'
                : 'Commencez par votre Test de Niveau selon votre classe'}
          </h2>
          <p className="mt-2.5 text-base text-slate-600 leading-relaxed">
            {lang === 'ar'
              ? 'بمجرد اختيار صفك ومسارك، يقتصر حسابك على دروس واختبارات هذا المسار فقط، ويُرسل تقريرك للمدرب لتحديد المهارات المطلوبة.'
              : lang === 'en'
                ? 'Your selection routes you strictly to your chosen grade and exam track (with 30-min free demo access), and automatically sends a diagnostic report to your teacher.'
                : 'Votre choix oriente immédiatement votre espace vers la classe et l’examen choisis (sans passer aux autres systèmes), et transfère automatiquement votre rapport au formateur.'}
          </p>
        </div>

        {step !== 'setup' && (
          <button
            type="button"
            onClick={() => {
              setStep('setup');
              setError('');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#0F2537] bg-white border border-slate-300 hover:border-[#0B6E8C] rounded-xl transition-colors self-start cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>
              {isLocked
                ? lang === 'ar'
                  ? 'إعادة الاختبار في مساري'
                  : lang === 'en'
                    ? 'Retake Within Locked Track'
                    : 'Refaire le test dans mon parcours'
                : lang === 'ar'
                  ? 'تغيير الصف / إعادة الاختبار'
                  : lang === 'en'
                    ? 'Change Class / Retake'
                    : 'Changer de classe / Refaire le test'}
            </span>
          </button>
        )}
      </div>

      {/* Active Strict Track Lock Notice */}
      {isLocked && trackLock && (
        <div className="mb-6 p-4 rounded-2xl bg-[#EEF5F9] border border-[#BFD8E6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Lock className="w-4 h-4 text-[#0B6E8C] shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-[#0F2537]">
              <strong>
                {lang === 'ar'
                  ? 'مسارك الدراسي المثبت :'
                  : lang === 'en'
                    ? 'Locked Grade & Exam Track:'
                    : 'Parcours académique verrouillé :'}
              </strong>{' '}
              <span className="font-semibold text-[#0B6E8C]">
                {trackLock.gradeLevel.toUpperCase()} · {trackLock.curriculum}
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                {lang === 'ar'
                  ? 'حسابك موجه حصرياً لهذا الصف وهذا الاختبار خلال فترة التجربة المجانية (30 دقيقة).'
                  : lang === 'en'
                    ? 'Your account stays focused exclusively on this grade and exam format during your 30-minute free demo trial.'
                    : 'Votre compte reste orienté exclusivement sur cette classe et ce type d’examen (accès démo 30 min) sans basculer vers d’autres examens.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 'setup' && (
          <motion.form
            key="setup"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onSubmit={handleStartTest}
            className="bg-white border border-[#DCE4ED] rounded-2xl p-6 sm:p-8 shadow-xs space-y-8"
          >
            {!user && (
              <div className="max-w-md">
                <label className="block text-xs font-semibold text-[#0F2537] mb-1.5">
                  {lang === 'ar'
                    ? 'اسم الطالب (ليظهر في تقرير المعلم)'
                    : lang === 'en'
                      ? 'Student Full Name (sent on teacher report)'
                      : 'Nom complet de l’élève (transmis au formateur)'}
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Ex : Youssef Al-Harbi"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
                />
              </div>
            )}

            {/* 1. Grade / Class Selection */}
            <div>
              <div className="flex items-center justify-between gap-2 text-sm font-semibold text-[#0F2537] mb-3">
                <span className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#0B6E8C]" />
                  <span>
                    {lang === 'ar'
                      ? '1. اختر الصف الدراسي المناسب لك'
                      : lang === 'en'
                        ? '1. Choose your current Grade / Class Level'
                        : '1. Choisissez la classe qui vous convient (ex : 5e ou 9e)'}
                  </span>
                </span>
                {isLocked && (
                  <span className="text-[11px] font-mono text-[#0B6E8C] inline-flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Verrouillé
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {grades.map((g) => {
                  const active = selectedGrade === g.id;
                  const disabled = isLocked && !active;
                  const label =
                    lang === 'ar' ? g.labelAr : lang === 'en' ? g.labelEn : g.labelFr;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => !isLocked && setSelectedGrade(g.id)}
                      className={`text-start p-4 rounded-xl border transition-all ${
                        disabled
                          ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-55 cursor-not-allowed'
                          : active
                            ? 'bg-[#0F2537] text-white border-[#0F2537] shadow-xs cursor-pointer'
                            : 'bg-[#F8FAFC] border-[#DCE4ED] text-[#0F2537] hover:border-[#0B6E8C] hover:bg-white cursor-pointer'
                      }`}
                    >
                      <div className="text-xs font-mono opacity-75 mb-1 flex items-center justify-between">
                        <span>{g.id.toUpperCase()}</span>
                        {disabled && <Lock className="w-3 h-3" />}
                      </div>
                      <div className="text-sm font-semibold leading-snug">{label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Curriculum & Language */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 border-t border-slate-200">
              <div className="lg:col-span-8">
                <label className="block text-sm font-semibold text-[#0F2537] mb-3">
                  {lang === 'ar'
                    ? '2. النظام الدراسي / الاختبار المستهدف'
                    : lang === 'en'
                      ? '2. Select Exam System / Curriculum'
                      : '2. Système d’examen visé'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {CURRICULA_OPTIONS.map((curr) => {
                    const active = selectedCurriculum === curr.id;
                    const disabled = isLocked && !active;
                    return (
                      <button
                        key={curr.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleCurriculumSelect(curr.id)}
                        className={`text-start px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-colors flex items-center justify-between gap-2 ${
                          disabled
                            ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-55 cursor-not-allowed'
                            : active
                              ? 'bg-[#0B6E8C] text-white border-[#0B6E8C] cursor-pointer'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-[#0B6E8C] cursor-pointer'
                        }`}
                      >
                        <span>{curr.label}</span>
                        {disabled && <Lock className="w-3 h-3 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-4">
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  {lang === 'ar'
                    ? '3. لغة أسئلة الاختبار'
                    : lang === 'en'
                      ? '3. Assessment Language'
                      : '3. Langue du test'}
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
                  {(['Français', 'English', 'العربية'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setTestLanguage(l)}
                      className={`py-2.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        testLanguage === l ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {error}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <div className="text-xs text-slate-600">
                {lang === 'ar'
                  ? '5 أسئلة تشخيصية · يُرسل التقرير تلقائياً للمدرب لتحديد نقاط القوة والضعف والمهارات المطلوبة'
                  : lang === 'en'
                    ? '5 diagnostic questions · Report sent automatically to your teacher to assign required skills'
                    : '5 questions diagnostiques · Rapport transmis au formateur pour attribution de vos compétences'}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-sm font-semibold rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <span>
                  {loading
                    ? '...'
                    : lang === 'ar'
                      ? 'بدء اختبار تحديد المستوى'
                      : lang === 'en'
                        ? 'Start Placement Test'
                        : 'Démarrer le Test de Niveau'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.form>
        )}

        {step === 'quiz' && currentQuestion && (
          <motion.div
            key={`quiz-${currentIdx}`}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            dir={testLanguage === 'العربية' ? 'rtl' : 'ltr'}
            className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm max-w-3xl mx-auto"
          >
            <div className="flex items-center justify-between gap-4 text-xs text-slate-500 mb-3">
              <span>
                {gradeLabel} · {selectedCurriculum}
              </span>
              <span className="font-mono font-semibold text-emerald-800 tabular-nums">
                {currentIdx + 1} / {questions.length}
              </span>
            </div>

            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-6">
              <motion.div
                className="h-full bg-emerald-700"
                initial={{ width: 0 }}
                animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <div className="text-xs font-semibold text-blue-700 mb-2">
              {currentQuestion.domain}
            </div>
            <h3 className="font-display text-xl sm:text-2xl font-semibold text-slate-900 leading-snug mb-6">
              {currentQuestion.prompt}
            </h3>

            <div className="space-y-3 mb-8">
              {currentQuestion.options.map((opt, idx) => {
                const picked = answers[currentQuestion.id] === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: idx }))
                    }
                    className={`w-full text-start px-4 py-3.5 rounded-xl border text-sm transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      picked
                        ? 'border-emerald-800 bg-emerald-50 text-emerald-950 font-semibold'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400'
                    }`}
                  >
                    <span>{opt}</span>
                    {picked && <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between gap-4 pt-5 border-t border-slate-200">
              <button
                type="button"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg disabled:opacity-40 cursor-pointer"
              >
                {testLanguage === 'العربية' ? 'السابق' : testLanguage === 'English' ? 'Previous' : 'Précédent'}
              </button>

              {currentIdx < questions.length - 1 ? (
                <button
                  type="button"
                  disabled={answers[currentQuestion.id] === undefined}
                  onClick={() => setCurrentIdx((i) => i + 1)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg disabled:opacity-40 cursor-pointer"
                >
                  {testLanguage === 'العربية' ? 'السؤال التالي' : testLanguage === 'English' ? 'Next Question' : 'Question suivante'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading || answers[currentQuestion.id] === undefined}
                  onClick={handleSubmitTest}
                  className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg disabled:opacity-40 cursor-pointer"
                >
                  {loading
                    ? '...'
                    : testLanguage === 'العربية'
                      ? 'عرض التشخيص والنتائج'
                      : testLanguage === 'English'
                        ? 'View Diagnostic Summary'
                        : 'Afficher mon bilan détaillé'}
                </button>
              )}
            </div>
          </motion.div>
        )}

        {step === 'report' && result && (
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            dir={result.language === 'العربية' ? 'rtl' : 'ltr'}
            className="space-y-8"
          >
            {/* Teacher Report Transferred Confirmation */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-xs sm:text-sm text-emerald-950">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                <span>
                  {result.language === 'العربية'
                    ? `تم إرسال تقرير هذا الاختبار تلقائياً إلى المدرب ${result.recommendedTrainerId === 'mohamed' ? 'محمد شريف' : 'مروان المحمدي'} لإسناد المهارات المطلوبة.`
                    : result.language === 'English'
                      ? `Demo test report automatically sent to ${result.recommendedTrainerId === 'mohamed' ? 'Mohamed Cherif' : 'Marwan Mhamdi'} for targeted skill attribution.`
                      : `Rapport de test transmis automatiquement au formateur ${result.recommendedTrainerId === 'mohamed' ? 'Mohamed Cherif' : 'Marwan Mhamdi'} pour vous attribuer les compétences nécessaires.`}
                </span>
              </div>
            </div>

            {/* Top Diagnostic Score Card */}
            <div className="bg-gradient-to-br from-[#0B172A] via-[#0F243E] to-[#06382E] text-white rounded-2xl p-6 sm:p-10 shadow-md">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8">
                  <div className="text-xs font-medium text-emerald-300 mb-2">
                    {result.curriculum} · {result.gradeLevel.toUpperCase()} · {result.language}
                  </div>
                  <h3 className="font-display text-2xl sm:text-3xl font-semibold text-white mb-3">
                    {result.levelLabel}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-2xl">
                    {result.summaryText}
                  </p>
                </div>

                <div className="lg:col-span-4 flex lg:justify-end">
                  <div className="bg-white/10 border border-white/15 rounded-2xl p-6 text-center min-w-[190px]">
                    <div className="text-xs text-slate-300 mb-1">
                      {result.language === 'العربية'
                        ? 'النتيجة التشخيصية'
                        : result.language === 'English'
                          ? 'Diagnostic Score'
                          : 'Score Diagnostique'}
                    </div>
                    <div className="font-mono text-4xl font-semibold text-amber-300 tabular-nums">
                      {result.overallScore}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Domain Bars */}
              <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {result.domainBreakdown.map((item, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                    <div className="text-xs text-slate-200 font-medium mb-2 line-clamp-1">
                      {item.domain}
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.scorePct}%` }}
                        transition={{ duration: 0.5, delay: 0.1 * i }}
                        className={`h-full ${
                          item.status === 'strong'
                            ? 'bg-emerald-400'
                            : item.status === 'moderate'
                              ? 'bg-amber-400'
                              : 'bg-rose-400'
                        }`}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                      <span
                        className={
                          item.status === 'strong'
                            ? 'text-emerald-300'
                            : item.status === 'moderate'
                              ? 'text-amber-300'
                              : 'text-rose-300'
                        }
                      >
                        {item.status === 'strong'
                          ? result.language === 'العربية'
                            ? 'متقن'
                            : result.language === 'English'
                              ? 'Strong'
                              : 'Acquis'
                          : result.language === 'العربية'
                            ? 'بحاجة لتقوية'
                            : result.language === 'English'
                              ? 'Priority Gap'
                              : 'À renforcer'}
                      </span>
                      <span className="text-white">{item.scorePct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths, Weaknesses & What is Missing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-emerald-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900 mb-4">
                  <Award className="w-4 h-4 text-emerald-700" />
                  <span>
                    {result.language === 'العربية'
                      ? 'نقاط القوة'
                      : result.language === 'English'
                        ? 'Your Strengths'
                        : 'Vos Points Forts'}
                  </span>
                </div>
                <ul className="space-y-2.5 text-sm text-slate-700">
                  {(user?.teacherStrengths?.length ? user.teacherStrengths : result.strengths).map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white border border-amber-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 mb-4">
                  <Target className="w-4 h-4 text-amber-700" />
                  <span>
                    {result.language === 'العربية'
                      ? 'نقاط الضعف'
                      : result.language === 'English'
                        ? 'Areas to Strengthen'
                        : 'Points Faibles'}
                  </span>
                </div>
                {(user?.teacherWeaknesses?.length ? user.teacherWeaknesses : result.weaknesses).length === 0 ? (
                  <p className="text-sm text-slate-600">
                    {result.language === 'العربية'
                      ? 'لا توجد نقاط ضعف مسجلة في هذا الاختبار.'
                      : result.language === 'English'
                        ? 'No weak domains detected in this assessment.'
                        : 'Aucun point faible détecté sur cette évaluation.'}
                  </p>
                ) : (
                  <ul className="space-y-2.5 text-sm text-slate-700">
                    {(user?.teacherWeaknesses?.length ? user.teacherWeaknesses : result.weaknesses).map((w, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-white border border-rose-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-rose-950 mb-4">
                  <BookOpen className="w-4 h-4 text-rose-700" />
                  <span>
                    {result.language === 'العربية'
                      ? 'ما ينقصك قبل الاختبار'
                      : result.language === 'English'
                        ? 'What You Are Missing'
                        : 'Ce qui vous manque'}
                  </span>
                </div>
                <ul className="space-y-2.5 text-sm text-slate-700">
                  {result.missingGaps.map((gap, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                      <span className="font-mono text-xs font-semibold text-rose-700 mt-0.5">
                        0{idx + 1}.
                      </span>
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Teacher-Attributed Skills if Reviewed */}
            {user && ((user.assignedSkills && user.assignedSkills.length > 0) || user.teacherFeedbackSummary) && (
              <div className="bg-white border border-[#BFD8E6] rounded-2xl p-6 space-y-3">
                <div className="text-xs font-semibold text-[#0B6E8C]">
                  Bilan &amp; Compétences attribuées par votre formateur
                </div>
                {user.teacherFeedbackSummary && (
                  <p className="text-sm text-slate-700 leading-relaxed">{user.teacherFeedbackSummary}</p>
                )}
                {user.assignedSkills && user.assignedSkills.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {user.assignedSkills.map((sk) => (
                      <span
                        key={sk}
                        className="px-3 py-1 rounded-lg bg-[#EEF5F9] border border-[#BFD8E6] text-xs font-semibold text-[#0F2537]"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actionable Next Steps */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 flex flex-col justify-between gap-5">
                <div>
                  <div className="text-xs font-semibold text-blue-700 mb-1.5">
                    {result.language === 'العربية'
                      ? 'دروس المسار التجريبي (30 دقيقة)'
                      : result.language === 'English'
                        ? 'Your Locked Track Demo Modules (30-min Free Trial)'
                        : 'Vos Cours Démo Ciblés (Essai Gratuit 30 min)'}
                  </div>
                  <h4 className="font-display text-xl font-semibold text-slate-900 mb-2">
                    {result.language === 'العربية'
                      ? 'ابدأ بدراسة الدرس التجريبي المخصص لمسارك'
                      : result.language === 'English'
                        ? 'Open your track demo lesson to close these gaps'
                        : 'Accéder au chapitre démo de votre parcours ciblé'}
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {result.language === 'العربية'
                      ? 'الفصل الأول متاح مجاناً خلال الـ 30 دقيقة، بينما تفتح الفصول المتقدمة بعد التسجيل.'
                      : result.language === 'English'
                        ? 'Chapter 01 is unlocked for your 30-minute free demo trial; advanced chapters unlock with full enrollment.'
                        : 'Le Chapitre 01 est accessible pendant votre essai gratuit de 30 minutes ; les chapitres complets se débloquent sur inscription.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onGoToCourse(result.recommendedCourseIds[0] || 'ib-dp-math-aa')}
                  className="px-5 py-3 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-2 self-start cursor-pointer"
                >
                  <span>
                    {result.language === 'العربية'
                      ? 'الذهاب إلى الدروس الموصى بها'
                      : result.language === 'English'
                        ? 'Open Recommended Demo Course'
                        : 'Suivre le cours démo spécifique'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 sm:p-7 flex flex-col justify-between gap-5">
                <div>
                  <div className="text-xs font-semibold text-amber-900 mb-1.5">
                    {result.language === 'العربية'
                      ? 'التفعيل المباشر عبر واتساب والتدريب الخاص (Google Meet)'
                      : result.language === 'English'
                        ? 'Intensive Courses & Private Coaching · Direct WhatsApp Activation'
                        : 'Programmes Intensifs & Coaching Privé · Activation WhatsApp'}
                  </div>
                  <h4 className="font-display text-xl font-semibold text-slate-900 mb-2">
                    {recommendedPaidCourse
                      ? recommendedPaidCourse.title
                      : result.recommendedTrainerId === 'marwan'
                        ? 'Coaching Anglais avec Marwan Mhamdi'
                        : 'Coaching Français / Arabe avec Mohamed Cherif'}
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {lang === 'ar'
                      ? 'اختر الدورة أو الموعد المناسب وتواصل مباشرة مع مدربك عبر واتساب لتفعيل الحساب وإطلاق الحصص.'
                      : lang === 'en'
                        ? 'Select your course or preferred schedule and connect directly with your teacher on WhatsApp to activate your access.'
                        : 'Sélectionnez votre cours ou votre créneau et contactez directement votre formateur sur WhatsApp pour activer votre accès.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {recommendedPaidCourse && (
                    <button
                      type="button"
                      onClick={() => onGoToPaidCourse(recommendedPaidCourse.id)}
                      className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      {result.language === 'العربية'
                        ? `تفعيل الدورة عبر واتساب (${recommendedPaidCourse.priceSar} ر.س)`
                        : result.language === 'English'
                          ? `Activate via WhatsApp (${recommendedPaidCourse.priceSar} SAR)`
                          : `Activer via WhatsApp (${recommendedPaidCourse.priceSar} SAR)`}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onGoToTrainer(result.recommendedTrainerId)}
                    className="px-4 py-2.5 bg-white border border-amber-300 hover:border-slate-900 text-slate-900 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>
                      {result.recommendedTrainerId === 'marwan'
                        ? 'Contacter Marwan (WhatsApp & Meet)'
                        : 'Contacter Mohamed Cherif (WhatsApp & Meet)'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
