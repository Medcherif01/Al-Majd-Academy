import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Lock, Printer, RotateCcw, Sparkles, XCircle } from 'lucide-react';
import { apiRequest } from '../utils/api';
import { ExamBoardCrestSvg, getExamBoardTheme } from '../utils/examBoardThemes';
import { MathText } from '../utils/mathFormat';
import { TRANSLATIONS } from '../i18n/translations';
import type { CurriculumKey, GeneratedExam, StudentTrackLock, UiLanguage } from '../types/academy';

interface AiExamStudioProps {
  lang: UiLanguage;
  token: string | null;
  trialToken?: string | null;
  initialExam?: GeneratedExam | null;
  initialCurriculum?: string | null;
  trackLock: StudentTrackLock | null;
  hasPaidAccess: boolean;
  trialExpired: boolean;
  onUpgradePrompt?: () => void;
  onExamSaved?: (exam: GeneratedExam) => void;
}

const CURRICULUM_SUBJECTS: Record<string, string[]> = {
  'American Digital SAT': ['Mathematics (Adaptive)', 'Reading & Writing'],
  'American AP': ['AP Calculus AB/BC', 'AP Physics 1', 'AP Chemistry', 'AP Biology'],
  'IB Diploma (DP)': ['Mathematics AA HL/SL', 'Physics HL/SL', 'Chemistry HL/SL', 'French B', 'Economics'],
  'Cambridge IGCSE / A-Level': ['IGCSE Mathematics (0580)', 'IGCSE Physics (0625)', 'IGCSE Chemistry (0620)', 'A-Level Mathematics (9709)'],
  'NAFS / نافس (ETEC)': ['الرياضيات (Math)', 'العلوم (Science)', 'القراءة (Reading)'],
  'Qudurat & Tahsili (قياس)': ['القدرات — القسم الكمي (Quantitative)', 'القدرات — القسم اللفظي (Verbal)', 'التحصيلي العلمي (Tahsili STEM)'],
  'Baccalauréat Français (AEFE)': ['Mathématiques Spécialité', 'Physique-Chimie Spécialité', 'SVT Spécialité', 'Français (Première)'],
};

function mapTrackKeyToAiCurricula(trackKey: Exclude<CurriculumKey, 'all'>): string[] {
  switch (trackKey) {
    case 'american':
      return ['American Digital SAT', 'American AP'];
    case 'ib':
      return ['IB Diploma (DP)'];
    case 'british':
      return ['Cambridge IGCSE / A-Level'];
    case 'nafes':
      return ['NAFS / نافس (ETEC)'];
    case 'qiyas':
      return ['Qudurat & Tahsili (قياس)'];
    case 'french':
      return ['Baccalauréat Français (AEFE)'];
  }
}

export function AiExamStudio({
  lang,
  token,
  trialToken,
  initialExam,
  initialCurriculum,
  trackLock,
  hasPaidAccess,
  trialExpired,
  onUpgradePrompt,
  onExamSaved,
}: AiExamStudioProps) {
  const t = TRANSLATIONS[lang];
  const isLocked = Boolean(trackLock && !hasPaidAccess);
  const allowedCurricula = isLocked && trackLock
    ? mapTrackKeyToAiCurricula(trackLock.trackKey)
    : Object.keys(CURRICULUM_SUBJECTS);

  const defaultCurr =
    (initialCurriculum && allowedCurricula.includes(initialCurriculum) && initialCurriculum) ||
    allowedCurricula[0] ||
    'IB Diploma (DP)';

  const [curriculum, setCurriculum] = useState<string>(defaultCurr);
  const [subject, setSubject] = useState<string>(
    (CURRICULUM_SUBJECTS[defaultCurr] || ['Mathematics'])[0]
  );
  const [examLanguage, setExamLanguage] = useState<'Français' | 'English' | 'العربية'>(
    defaultCurr.includes('NAFS') || defaultCurr.includes('NAFES') || defaultCurr.includes('Qudurat')
      ? 'العربية'
      : defaultCurr.includes('Baccalauréat')
        ? 'Français'
        : 'English'
  );
  const [difficulty, setDifficulty] = useState<'Standard' | 'Avancé / HL' | 'Intensif Examen'>('Avancé / HL');
  const [topic, setTopic] = useState<string>('');
  const [questionCount, setQuestionCount] = useState<number>(4);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [activeExam, setActiveExam] = useState<GeneratedExam | null>(initialExam || null);

  // Interactive Exam Runner State
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    if (isLocked && trackLock) {
      const list = mapTrackKeyToAiCurricula(trackLock.trackKey);
      if (!list.includes(curriculum)) {
        const next = list[0];
        setCurriculum(next);
        setSubject((CURRICULUM_SUBJECTS[next] || ['Mathematics'])[0]);
        setExamLanguage(
          next.includes('NAFS') || next.includes('NAFES') || next.includes('Qudurat')
            ? 'العربية'
            : next.includes('Baccalauréat')
              ? 'Français'
              : 'English'
        );
      }
    }
  }, [isLocked, trackLock, curriculum]);

  useEffect(() => {
    if (initialCurriculum && CURRICULUM_SUBJECTS[initialCurriculum] && allowedCurricula.includes(initialCurriculum)) {
      setCurriculum(initialCurriculum);
      setSubject(CURRICULUM_SUBJECTS[initialCurriculum][0]);
      if (initialCurriculum.includes('NAFS') || initialCurriculum.includes('NAFES') || initialCurriculum.includes('Qudurat')) {
        setExamLanguage('العربية');
      } else if (initialCurriculum.includes('Baccalauréat')) {
        setExamLanguage('Français');
      } else {
        setExamLanguage('English');
      }
    }
  }, [initialCurriculum]);

  useEffect(() => {
    if (initialExam) {
      setActiveExam(initialExam);
      setAnswers({});
      setSubmitted(false);
      setSecondsElapsed(0);
    }
  }, [initialExam]);

  useEffect(() => {
    if (!activeExam || submitted) return;
    const timer = setInterval(() => {
      setSecondsElapsed((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeExam, submitted]);

  const handleCurriculumChange = (nextCurr: string) => {
    setCurriculum(nextCurr);
    const list = CURRICULUM_SUBJECTS[nextCurr] || ['Mathematics'];
    setSubject(list[0]);
    if (nextCurr.includes('NAFS') || nextCurr.includes('NAFES') || nextCurr.includes('Qudurat')) {
      setExamLanguage('العربية');
    } else if (nextCurr.includes('Baccalauréat')) {
      setExamLanguage('Français');
    } else {
      setExamLanguage('English');
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trialExpired && !hasPaidAccess) {
      setError(
        'Votre essai gratuit de 30 minutes est terminé. Veuillez souscrire à un cours payant ou réserver un formateur.'
      );
      return;
    }
    setError('');
    setGenerating(true);
    try {
      const res = await apiRequest<{ exam: GeneratedExam }>('/api/exams/generate', {
        method: 'POST',
        token,
        headers: !token && trialToken ? { 'x-trial-token': trialToken } : undefined,
        body: {
          curriculum,
          subject,
          language: examLanguage,
          difficulty,
          topic,
          questionCount,
        },
      });
      setActiveExam(res.exam);
      setAnswers({});
      setSubmitted(false);
      setSecondsElapsed(0);
      if (onExamSaved) onExamSaved(res.exam);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la génération de l’examen.');
    } finally {
      setGenerating(false);
    }
  };

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const computeScore = () => {
    if (!activeExam) return { earned: 0, total: 0 };
    let earned = 0;
    for (const q of activeExam.questions) {
      const userAns = (answers[q.number] || '').trim().toLowerCase();
      const canonical = q.correctAnswer.trim().toLowerCase();
      if (userAns && (userAns === canonical || (canonical.includes(userAns) && userAns.length > 1))) {
        earned += q.points;
      }
    }
    return { earned, total: activeExam.totalMarks };
  };

  const scoreSummary = computeScore();

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold tracking-wide text-emerald-800 mb-2">
          Gemini AI · International Exam Standards
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-semibold text-slate-900 text-balance">
          {t.aiStudioTitle}
        </h2>
        <p className="mt-3 text-base text-slate-600 leading-relaxed">{t.aiStudioSubtitle}</p>
      </div>

      {isLocked && trackLock && (
        <div className="mb-6 p-4 rounded-xl bg-[#EEF5F9] border border-[#BFD8E6] flex items-center gap-3 text-xs sm:text-sm text-[#0F2537]">
          <Lock className="w-4 h-4 text-[#0B6E8C] shrink-0" />
          <span>
            Générateur restreint à votre parcours verrouillé :{' '}
            <strong className="text-[#0B6E8C]">
              {trackLock.gradeLevel.toUpperCase()} · {trackLock.curriculum}
            </strong>
          </span>
        </div>
      )}

      {trialExpired && !hasPaidAccess && (
        <div className="mb-6 p-5 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-sm text-amber-950">
            <strong>Essai gratuit de 30 minutes expiré.</strong> Débloquez un cours payant ou réservez un formateur pour continuer à générer des examens Gemini IA.
          </div>
          {onUpgradePrompt && (
            <button
              type="button"
              onClick={onUpgradePrompt}
              className="px-4 py-2 bg-[#0B6E8C] text-white text-xs font-semibold rounded-xl shrink-0 cursor-pointer"
            >
              Débloquer l’accès complet
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Control Panel */}
        <form
          onSubmit={handleGenerate}
          className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {lang === 'ar' ? 'النظام التعليمي' : lang === 'en' ? 'Exam System' : 'Système d’Examen'}
            </label>
            <select
              value={curriculum}
              disabled={allowedCurricula.length <= 1}
              onChange={(e) => handleCurriculumChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700 disabled:bg-slate-50"
            >
              {allowedCurricula.map((curr) => (
                <option key={curr} value={curr}>
                  {curr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {lang === 'ar' ? 'المادة' : lang === 'en' ? 'Subject' : 'Matière'}
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              {(CURRICULUM_SUBJECTS[curriculum] || ['Mathematics']).map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {lang === 'ar' ? 'لغة الاختبار' : lang === 'en' ? 'Language' : 'Langue'}
              </label>
              <select
                value={examLanguage}
                onChange={(e) => setExamLanguage(e.target.value as 'Français' | 'English' | 'العربية')}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <option value="English">English</option>
                <option value="Français">Français</option>
                <option value="العربية">العربية</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {lang === 'ar' ? 'عدد الأسئلة' : lang === 'en' ? 'Questions' : 'Questions'}
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={6}>6</option>
                <option value={8}>8</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {lang === 'ar' ? 'مستوى الصعوبة' : lang === 'en' ? 'Difficulty Tier' : 'Niveau d’Exigence'}
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
              {(['Standard', 'Avancé / HL', 'Intensif Examen'] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setDifficulty(tier)}
                  className={`py-2 px-2 text-[11px] font-medium rounded-md transition-colors truncate cursor-pointer ${
                    difficulty === tier ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {lang === 'ar' ? 'الموضوع المحدد (اختياري)' : lang === 'en' ? 'Specific Topic (Optional)' : 'Chapitre / Notion ciblée (optionnel)'}
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={
                examLanguage === 'العربية'
                  ? 'مثال: الهندسة والنسب المئوية'
                  : examLanguage === 'Français'
                    ? 'Ex : Suites numériques, Loi normale'
                    : 'e.g. Differential Equations, Quadratics'
              }
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 leading-relaxed">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={generating || (trialExpired && !hasPaidAccess)}
            className="w-full py-3 px-4 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{generating ? t.generatingExamBtn : t.generateExamBtn}</span>
          </button>
        </form>

        {/* Right Interactive Exam Runner */}
        <div className="lg:col-span-8">
          {!activeExam ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 text-center">
              <div className="max-w-md mx-auto">
                <p className="text-xs font-semibold text-emerald-800 mb-2">
                  {lang === 'ar' ? 'جاهز للتوليد' : lang === 'en' ? 'Ready to Compose' : 'Prêt à Composer'}
                </p>
                <h3 className="font-display text-2xl font-semibold text-slate-900 mb-3">
                  {lang === 'ar'
                    ? 'أنشئ امتحاناً مطابقاً للأنظمة الدولية'
                    : lang === 'en'
                      ? 'Configure your board-compliant exam'
                      : 'Configurez votre sujet d’examen sur mesure'}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {lang === 'ar'
                    ? 'اختر النظام والمادة واللغة من اللوحة الجانبية، وسيقوم محرك Gemini بإعداد الأسئلة مع نموذج الإجابة وتوجيهات المصحح.'
                    : lang === 'en'
                      ? 'Select your curriculum, subject, and language on the left. Gemini will generate authentic exam questions with an interactive timer and official mark scheme.'
                      : 'Sélectionnez un cursus, une matière et une langue à gauche. L’IA Gemini génère une épreuve chronométrée accompagnée du barème et de la correction détaillée.'}
                </p>
              </div>
            </div>
          ) : (() => {
            const examTheme = getExamBoardTheme(activeExam.curriculum);
            const triggerA4ExamPrint = () => {
              document.body.classList.add('printing-a4-sheet');
              const cleanup = () => {
                document.body.classList.remove('printing-a4-sheet');
                window.removeEventListener('afterprint', cleanup);
              };
              window.addEventListener('afterprint', cleanup);
              window.print();
              setTimeout(cleanup, 1500);
            };
            return (
            <div
              className="a4-printable-document bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
              dir={activeExam.language === 'العربية' ? 'rtl' : 'ltr'}
            >
              <div className={`p-6 sm:p-8 bg-gradient-to-r ${examTheme.headerGradientClass} text-white`}>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3 text-xs text-white/90 font-medium">
                    <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                      <ExamBoardCrestSvg curriculum={activeExam.curriculum} className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-white/80">
                        {examTheme.boardTitle}
                      </div>
                      <div>
                        <span>{activeExam.curriculum}</span>
                        <span className="mx-2">·</span>
                        <span>{activeExam.subject}</span>
                        <span className="mx-2">·</span>
                        <span>{activeExam.difficulty}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
                    <span className="inline-flex items-center gap-1.5 text-white/90">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTimer(secondsElapsed)} / {activeExam.durationMinutes}m
                    </span>
                    <button
                      type="button"
                      onClick={triggerA4ExamPrint}
                      className="no-a4-print inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'طباعة PDF A4' : lang === 'en' ? 'Print A4 PDF' : 'Imprimer PDF A4'}</span>
                    </button>
                  </div>
                </div>

                <h3 className="font-display text-2xl font-semibold text-white mb-3">
                  <MathText text={activeExam.title} />
                </h3>
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
                  <MathText text={activeExam.officialRulesSummary} />
                </p>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                {activeExam.questions.map((q) => {
                  const userChoice = answers[q.number] || '';
                  const isCorrect =
                    userChoice.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();

                  return (
                    <div
                      key={q.number}
                      className="a4-avoid-break pb-6 border-b border-slate-200 last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between gap-4 mb-2.5">
                        <span className="font-mono text-xs font-semibold text-emerald-800">
                          Question {q.number}
                        </span>
                        <span className="font-mono text-xs text-slate-500 tabular-nums">
                          {q.points} {q.points > 1 ? 'pts' : 'pt'}
                        </span>
                      </div>

                      <p className="text-base font-medium text-slate-900 mb-4 leading-relaxed">
                        <MathText text={q.prompt} />
                      </p>

                      {q.questionType === 'mcq' && q.options.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {q.options.map((opt, idx) => {
                            const selected = userChoice === opt;
                            const isCanonical = opt.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
                            let cls = 'border-slate-200 bg-white text-slate-800 hover:border-slate-400';
                            if (submitted) {
                              if (isCanonical) cls = 'border-emerald-700 bg-emerald-50 text-emerald-950 font-medium';
                              else if (selected) cls = 'border-red-400 bg-red-50 text-red-900';
                            } else if (selected) {
                              cls = 'border-slate-900 bg-slate-100 text-slate-900 font-medium';
                            }

                            return (
                              <button
                                key={idx}
                                type="button"
                                disabled={submitted}
                                onClick={() => setAnswers((prev) => ({ ...prev, [q.number]: opt }))}
                                className={`text-start px-4 py-3 rounded-lg border text-sm transition-colors cursor-pointer ${cls}`}
                              >
                                <MathText text={opt} />
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <input
                          type="text"
                          disabled={submitted}
                          value={userChoice}
                          onChange={(e) =>
                            setAnswers((prev) => ({ ...prev, [q.number]: e.target.value }))
                          }
                          placeholder={
                            activeExam.language === 'العربية'
                              ? 'اكتب إجابتك النهائية هنا...'
                              : activeExam.language === 'Français'
                                ? 'Saisissez votre réponse ici...'
                                : 'Type your final answer here...'
                          }
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                        />
                      )}

                      {submitted && (
                        <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-sm">
                          <div className="flex items-center gap-2 font-semibold">
                            {isCorrect ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                                <span className="text-emerald-800">
                                  <MathText text={q.correctAnswer} />
                                </span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 text-amber-700" />
                                <span className="text-slate-900">
                                  {activeExam.language === 'العربية'
                                    ? 'الإجابة النموذجية:'
                                    : activeExam.language === 'Français'
                                      ? 'Réponse attendue :'
                                      : 'Official Answer:'}{' '}
                                  <MathText text={q.correctAnswer} />
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-slate-700 leading-relaxed">
                            <MathText text={q.officialExplanation} />
                          </p>
                          <p className="text-xs text-slate-500">
                            <strong>
                              {activeExam.language === 'العربية'
                                ? 'ملاحظة المصحح:'
                                : activeExam.language === 'Français'
                                  ? 'Conseil du jury :'
                                  : 'Examiner Tip:'}
                            </strong>{' '}
                            <MathText text={q.examinerTip} />
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="no-a4-print pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  {!submitted ? (
                    <button
                      type="button"
                      onClick={() => setSubmitted(true)}
                      className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      {activeExam.language === 'العربية'
                        ? 'تصحيح الاختبار وعرض الشرح'
                        : activeExam.language === 'Français'
                          ? 'Corriger ma copie et afficher le barème'
                          : 'Grade Exam & Show Official Solutions'}
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between w-full gap-4">
                      <div className="font-mono text-base font-semibold text-slate-900 tabular-nums">
                        {activeExam.language === 'العربية'
                          ? 'النتيجة:'
                          : activeExam.language === 'Français'
                            ? 'Score obtenu :'
                            : 'Score:'}{' '}
                        <span className="text-emerald-800">
                          {scoreSummary.earned} / {scoreSummary.total}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setAnswers({});
                          setSubmitted(false);
                          setSecondsElapsed(0);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 hover:border-slate-900 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>
                          {activeExam.language === 'العربية'
                            ? 'إعادة المحاولة'
                            : activeExam.language === 'Français'
                              ? 'Refaire l’épreuve'
                              : 'Retake Exam'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            );
          })()}
        </div>
      </div>
    </section>
  );
}
