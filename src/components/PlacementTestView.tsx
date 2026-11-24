import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  GraduationCap,
  RotateCcw,
  Target,
  UserCheck,
} from 'lucide-react';
import { apiRequest } from '../utils/api';
import type {
  GradeOption,
  PaidCourseItem,
  PlacementQuestionItem,
  PlacementResult,
  UiLanguage,
} from '../types/academy';

interface PlacementTestViewProps {
  lang: UiLanguage;
  token: string | null;
  grades: GradeOption[];
  paidCourses: PaidCourseItem[];
  latestResult: PlacementResult | null;
  onResultReady: (result: PlacementResult) => void;
  onGoToCourse: (courseId: string, curriculumKey?: string) => void;
  onGoToPaidCourse: (paidCourseId: string) => void;
  onGoToTrainer: (trainerId: 'marwan' | 'mohamed') => void;
}

const CURRICULA_OPTIONS = [
  { id: 'American (SAT / AP)', label: 'American (Digital SAT / AP)' },
  { id: 'IB Diploma', label: 'IB Diploma (DP / MYP)' },
  { id: 'IGCSE & A-Level', label: 'Cambridge IGCSE & A-Level' },
  { id: 'NAFES (ETEC)', label: 'NAFES / نافس (ETEC)' },
  { id: 'Qudurat & Tahsili', label: 'Qudurat & Tahsili (قياس)' },
  { id: 'Bac Français AEFE', label: 'Système Français (Brevet / Bac AEFE)' },
];

export function PlacementTestView({
  lang,
  token,
  grades,
  paidCourses,
  latestResult,
  onResultReady,
  onGoToCourse,
  onGoToPaidCourse,
  onGoToTrainer,
}: PlacementTestViewProps) {
  const [step, setStep] = useState<'setup' | 'quiz' | 'report'>(latestResult ? 'report' : 'setup');
  const [selectedGrade, setSelectedGrade] = useState<string>('grade-10');
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>('IB Diploma');
  const [testLanguage, setTestLanguage] = useState<'Français' | 'English' | 'العربية'>(
    lang === 'ar' ? 'العربية' : lang === 'en' ? 'English' : 'Français'
  );

  const [questions, setQuestions] = useState<PlacementQuestionItem[]>([]);
  const [gradeLabel, setGradeLabel] = useState<string>('');
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<PlacementResult | null>(latestResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCurriculumSelect = (currId: string) => {
    setSelectedCurriculum(currId);
    if (currId.includes('NAFES') || currId.includes('Qudurat')) {
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
      const res = await apiRequest<{
        gradeLabel: string;
        questions: PlacementQuestionItem[];
      }>('/api/placement/start', {
        method: 'POST',
        body: {
          gradeLevel: selectedGrade,
          curriculum: selectedCurriculum,
          language: testLanguage,
        },
      });
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
      const res = await apiRequest<{ result: PlacementResult }>('/api/placement/evaluate', {
        method: 'POST',
        token,
        body: {
          gradeLevel: selectedGrade,
          curriculum: selectedCurriculum,
          language: testLanguage,
          answers,
        },
      });
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
                ? 'الخطوة الأولى · تشخيص المستوى الأكاديمي'
                : lang === 'en'
                  ? 'Step 01 · Diagnostic Placement Assessment'
                  : 'Étape 01 · Test de Niveau & Bilan Personnalisé'}
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
              ? 'اختر صفك ومسارك التعليمي لنحدد لك بدقة نقاط القوة، نقاط الضعف، وما ينقصك مع ترشيح الدروس والمدرب الأنسب.'
              : lang === 'en'
                ? 'Select your class level and exam system to receive an immediate summary of your strengths, weaknesses, missing concepts, and targeted course plan.'
                : 'Choisissez votre classe et votre programme : obtenez un bilan clair de vos points forts, points faibles, notions manquantes et un accès direct aux cours adaptés.'}
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
              {lang === 'ar'
                ? 'تغيير الصف / إعادة الاختبار'
                : lang === 'en'
                  ? 'Change Class / Retake'
                  : 'Changer de classe / Refaire le test'}
            </span>
          </button>
        )}
      </div>

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
            {/* 1. Grade / Class Selection */}
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0F2537] mb-3">
                <GraduationCap className="w-4 h-4 text-[#0B6E8C]" />
                <span>
                  {lang === 'ar'
                    ? '1. اختر الصف الدراسي المناسب لك'
                    : lang === 'en'
                      ? '1. Choose your current Grade / Class Level'
                      : '1. Choisissez la classe qui vous convient'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {grades.map((g) => {
                  const active = selectedGrade === g.id;
                  const label =
                    lang === 'ar' ? g.labelAr : lang === 'en' ? g.labelEn : g.labelFr;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGrade(g.id)}
                      className={`text-start p-4 rounded-xl border transition-all cursor-pointer ${
                        active
                          ? 'bg-[#0F2537] text-white border-[#0F2537] shadow-xs'
                          : 'bg-[#F8FAFC] border-[#DCE4ED] text-[#0F2537] hover:border-[#0B6E8C] hover:bg-white'
                      }`}
                    >
                      <div className="text-xs font-mono opacity-75 mb-1">
                        {g.id.toUpperCase()}
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
                    return (
                      <button
                        key={curr.id}
                        type="button"
                        onClick={() => handleCurriculumSelect(curr.id)}
                        className={`text-start px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#0B6E8C] text-white border-[#0B6E8C]'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-[#0B6E8C]'
                        }`}
                      >
                        {curr.label}
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
                  ? '5 أسئلة تشخيصية سريعة · تحليل فوري لنقاط القوة والضعف والفجوات'
                  : lang === 'en'
                    ? '5 targeted diagnostic questions · Instant strengths, weaknesses & gap summary'
                    : '5 questions diagnostiques ciblées · Résumé immédiat de vos forces, faiblesses et lacunes'}
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

            {/* Animated Progress Track */}
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
                  {result.strengths.map((s, idx) => (
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
                {result.weaknesses.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    {result.language === 'العربية'
                      ? 'لا توجد نقاط ضعف مسجلة في هذا الاختبار.'
                      : result.language === 'English'
                        ? 'No weak domains detected in this assessment.'
                        : 'Aucun point faible détecté sur cette évaluation.'}
                  </p>
                ) : (
                  <ul className="space-y-2.5 text-sm text-slate-700">
                    {result.weaknesses.map((w, idx) => (
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

            {/* Actionable Next Steps: Specific Free Course + Paid Intensive Course + Personal Tutor */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 flex flex-col justify-between gap-5">
                <div>
                  <div className="text-xs font-semibold text-blue-700 mb-1.5">
                    {result.language === 'العربية'
                      ? 'مسار الدروس المخصص'
                      : result.language === 'English'
                        ? 'Recommended Specific Modules'
                        : 'Cours Spécifiques Recommandés'}
                  </div>
                  <h4 className="font-display text-xl font-semibold text-slate-900 mb-2">
                    {result.language === 'العربية'
                      ? 'ابدأ بدراسة الدروس المحددة لسد الفجوات'
                      : result.language === 'English'
                        ? 'Open targeted lessons to close your gaps'
                        : 'Accéder directement aux cours ciblés pour combler vos lacunes'}
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {result.language === 'العربية'
                      ? 'دروس مفصلة بالقواعد الرسمية، أمثلة محلولة، وملخصات قابلة للتحميل.'
                      : result.language === 'English'
                        ? 'Detailed board-rule explanations, step-by-step worked examples, and downloadable revision sheets.'
                        : 'Cours détaillés avec règles officielles, exemples rédigés pas à pas et fiches de révision.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onGoToCourse(result.recommendedCourseIds[0] || 'ib-dp-math-aa')}
                  className="px-5 py-3 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-2 self-start cursor-pointer"
                >
                  <span>
                    {result.language === 'العربية'
                      ? 'الذهاب إلى الدروس الموصى بها'
                      : result.language === 'English'
                        ? 'Open Recommended Course'
                        : 'Suivre le cours spécifique'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 sm:p-7 flex flex-col justify-between gap-5">
                <div>
                  <div className="text-xs font-semibold text-amber-900 mb-1.5">
                    {result.language === 'العربية'
                      ? 'خيار الدورات المدفوعة والتدريب المباشر'
                      : result.language === 'English'
                        ? 'Paid Intensive Courses & Live Tutoring'
                        : 'Cours Payants & Coaching Individuel'}
                  </div>
                  <h4 className="font-display text-xl font-semibold text-slate-900 mb-2">
                    {recommendedPaidCourse
                      ? recommendedPaidCourse.title
                      : result.recommendedTrainerId === 'marwan'
                        ? 'Coaching Anglais avec Marwan Mhamdi'
                        : 'Coaching Français / Arabe avec Mohamed Cherif'}
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {result.recommendedTrainerId === 'marwan'
                      ? 'Marwan Mhamdi (Tous cursus en anglais : SAT, AP, IB, IGCSE, GAT English)'
                      : 'Mohamed Cherif (Français & Arabe : Bac AEFE, Brevet, NAFES, Qudurat, Tahsili)'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {recommendedPaidCourse && (
                    <button
                      type="button"
                      onClick={() => onGoToPaidCourse(recommendedPaidCourse.id)}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-emerald-900 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      {result.language === 'العربية'
                        ? `التسجيل في الدورة (${recommendedPaidCourse.priceSar} ر.س)`
                        : result.language === 'English'
                          ? `Enroll in Course (${recommendedPaidCourse.priceSar} SAR)`
                          : `Rejoindre le cours payant (${recommendedPaidCourse.priceSar} SAR)`}
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
                        ? 'Réserver Marwan Mhamdi'
                        : 'Réserver Mohamed Cherif'}
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
