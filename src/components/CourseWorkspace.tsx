import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Download,
  FileText,
  Scale,
  Sparkles,
  Unlock,
  X,
} from 'lucide-react';
import { COURSE_MODULES } from '../data/curriculumData';
import { TRANSLATIONS } from '../i18n/translations';
import { apiRequest } from '../utils/api';
import { ExamPrepHubs } from './ExamPrepHubs';
import type {
  CourseLesson,
  CourseModule,
  CurriculumKey,
  PaidCourseItem,
  PrepHubTab,
  ProgressState,
  UiLanguage,
  UserProfile,
} from '../types/academy';

interface CourseWorkspaceProps {
  lang: UiLanguage;
  selectedTrack: CurriculumKey;
  onSelectTrack: (track: CurriculumKey) => void;
  initialCourseId?: string | null;
  highlightPaidCourseId?: string | null;
  initialSubMode?: 'courses' | 'hubs';
  initialHubTab?: PrepHubTab;
  progress: ProgressState;
  paidCourses: PaidCourseItem[];
  user: UserProfile | null;
  token: string | null;
  onRequireAuth: () => void;
  onUserUpdated: (user: UserProfile) => void;
  onRefreshPaidCourses: () => Promise<void>;
  onMarkLessonComplete: (lessonId: string, quizScore?: number) => Promise<void>;
  onNavigateToTutors: (trainerName: string) => void;
  onLaunchAiExam?: (curriculum: string) => void;
}

function downloadStudySheet(course: CourseModule, lesson: CourseLesson) {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${esc(lesson.title)} — Fiche de Synthèse</title>
  <style>
    body { font-family: Georgia, serif; max-width: 780px; margin: 40px auto; padding: 0 20px; color: #0f172a; line-height: 1.65; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .meta { color: #475569; font-size: 13px; margin-bottom: 24px; border-bottom: 1px solid #cbd5e1; padding-bottom: 12px; }
    .box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 14px 18px; margin: 18px 0; }
    h2 { font-size: 16px; color: #047857; margin-top: 24px; }
  </style>
</head>
<body>
  <h1>${esc(lesson.title)}</h1>
  <div class="meta">${esc(course.curriculumLabel)} · ${esc(course.subject)} · Formateur : ${esc(course.leadTrainer)}</div>
  <div class="box"><strong>Règlement officiel de l'épreuve :</strong> ${esc(lesson.officialRuleFocus)}</div>
  <h2>Points Clés du Cours</h2>
  <ul>${lesson.concepts.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
  <h2>Exemple Rédigé Pas à Pas</h2>
  <p><strong>Énoncé :</strong> ${esc(lesson.workedExample.problem)}</p>
  <ol>${lesson.workedExample.solutionSteps.map((st) => `<li>${esc(st)}</li>`).join('')}</ol>
  <h2>Ressources &amp; Checklist</h2>
  <ul>${lesson.resourceChecklist.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${course.id}_${lesson.id}_fiche.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function CourseWorkspace({
  lang,
  selectedTrack,
  onSelectTrack,
  initialCourseId,
  highlightPaidCourseId,
  initialSubMode = 'courses',
  initialHubTab = 'standards',
  progress,
  paidCourses,
  user,
  token,
  onRequireAuth,
  onUserUpdated,
  onRefreshPaidCourses,
  onMarkLessonComplete,
  onNavigateToTutors,
  onLaunchAiExam,
}: CourseWorkspaceProps) {
  const t = TRANSLATIONS[lang];
  const [subMode, setSubMode] = useState<'courses' | 'hubs'>(initialSubMode);
  const [hubTab, setHubTab] = useState<PrepHubTab>(initialHubTab);
  const [activeCourseId, setActiveCourseId] = useState<string>(initialCourseId || COURSE_MODULES[0].id);
  const [activeLessonIndex, setActiveLessonIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [checkpointSubmitted, setCheckpointSubmitted] = useState(false);

  // Paid Course Enrollment Modal
  const [checkoutCourse, setCheckoutCourse] = useState<PaidCourseItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('Mada · Saudi Payments');
  const [enrolling, setEnrolling] = useState(false);
  const [enrollMessage, setEnrollMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setSubMode(initialSubMode);
  }, [initialSubMode]);

  useEffect(() => {
    setHubTab(initialHubTab);
  }, [initialHubTab]);

  useEffect(() => {
    if (initialCourseId) {
      setSubMode('courses');
      setActiveCourseId(initialCourseId);
      setActiveLessonIndex(0);
      setSelectedOption(null);
      setCheckpointSubmitted(false);
    }
  }, [initialCourseId]);

  useEffect(() => {
    if (highlightPaidCourseId) {
      setSubMode('courses');
      const target = paidCourses.find((c) => c.id === highlightPaidCourseId);
      if (target && !target.isEnrolled) {
        setCheckoutCourse(target);
      }
    }
  }, [highlightPaidCourseId, paidCourses]);

  const filters: { key: CurriculumKey; label: string }[] = [
    { key: 'all', label: t.filterAll },
    { key: 'american', label: t.filterAmerican },
    { key: 'ib', label: t.filterIb },
    { key: 'british', label: t.filterBritish },
    { key: 'nafes', label: t.filterNafes },
    { key: 'qiyas', label: t.filterQiyas },
    { key: 'french', label: t.filterFrench },
  ];

  const filteredCourses =
    selectedTrack === 'all'
      ? COURSE_MODULES
      : COURSE_MODULES.filter((c) => c.curriculumKey === selectedTrack);

  const activeCourse =
    filteredCourses.find((c) => c.id === activeCourseId) || filteredCourses[0] || COURSE_MODULES[0];
  const activeLesson = activeCourse.lessons[activeLessonIndex] || activeCourse.lessons[0];
  const isLessonDone = progress.completedLessonIds.includes(activeLesson.id);

  const visiblePaidCourses =
    selectedTrack === 'all'
      ? paidCourses
      : paidCourses.filter((c) => c.curriculumKey === selectedTrack);

  const handleSelectCourse = (courseId: string) => {
    setActiveCourseId(courseId);
    setActiveLessonIndex(0);
    setSelectedOption(null);
    setCheckpointSubmitted(false);
  };

  const handleSelectLesson = (idx: number) => {
    setActiveLessonIndex(idx);
    setSelectedOption(null);
    setCheckpointSubmitted(false);
  };

  const handleCheckAnswer = async () => {
    if (selectedOption === null) return;
    setCheckpointSubmitted(true);
    const isCorrect = selectedOption === activeLesson.checkpoint.correctIndex;
    await onMarkLessonComplete(activeLesson.id, isCorrect ? 100 : 50);
  };

  const handleEnrollPaidCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutCourse) return;
    if (!user || !token) {
      setCheckoutCourse(null);
      onRequireAuth();
      return;
    }

    setEnrolling(true);
    setEnrollMessage(null);
    try {
      const res = await apiRequest<{
        order: { referenceCode: string };
        user: UserProfile;
      }>('/api/paid-courses/enroll', {
        method: 'POST',
        token,
        body: { courseId: checkoutCourse.id, paymentMethod },
      });
      onUserUpdated(res.user);
      await onRefreshPaidCourses();
      setEnrollMessage({
        type: 'success',
        text:
          lang === 'ar'
            ? `تم تسجيلك في الدورة بنجاح (${res.order.referenceCode}).`
            : lang === 'en'
              ? `Enrolled successfully (${res.order.referenceCode}). Your intensive course is now active in your portal.`
              : `Inscription confirmée (${res.order.referenceCode}). Ce cours intensif est désormais actif dans votre espace.`,
      });
      setCheckoutCourse(null);
    } catch (err: any) {
      setEnrollMessage({ type: 'error', text: err.message });
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <section id="courses-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Mode Switcher: Structured Courses vs Practical Exam Prep Hubs */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-wide text-[#0B6E8C] mb-2">
            {t.heroKicker}
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0F2537] text-balance">
            {t.coursesHeading}
          </h2>
          <p className="mt-2.5 text-base text-slate-600 leading-relaxed">{t.coursesSubheading}</p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-xs self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setSubMode('courses')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subMode === 'courses'
                ? 'bg-[#0B6E8C] text-white'
                : 'text-slate-600 hover:text-[#0F2537]'
            }`}
          >
            {lang === 'ar'
              ? 'الدروس والدورات المدفوعة'
              : lang === 'en'
                ? 'Curriculum & Paid Courses'
                : 'Cours & Programmes Payants'}
          </button>
          <button
            type="button"
            onClick={() => setSubMode('hubs')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subMode === 'hubs'
                ? 'bg-[#0B6E8C] text-white'
                : 'text-slate-600 hover:text-[#0F2537]'
            }`}
          >
            {t.navPrepHubs}
          </button>
        </div>
      </div>

      {subMode === 'hubs' ? (
        <ExamPrepHubs
          lang={lang}
          activeTab={hubTab}
          onSelectTab={setHubTab}
          defaultStudentName={user?.name || ''}
          onLaunchAiExam={onLaunchAiExam}
        />
      ) : (
        <div className="space-y-14">
          <div>
            <div className="flex items-center justify-between gap-4 mb-5">
              <div className="text-sm text-slate-600 tabular-nums">
                <span>
                  {filteredCourses.length}{' '}
                  {lang === 'ar' ? 'وحدات متاحة' : lang === 'en' ? 'modules available' : 'modules disponibles'}
                </span>
                <span className="mx-2 text-slate-300">·</span>
                <span>
                  {progress.completedLessonIds.length}{' '}
                  {lang === 'ar' ? 'دروس مكتملة' : lang === 'en' ? 'lessons completed' : 'leçons validées'}
                </span>
              </div>
            </div>

        {/* Segmented Interactive Curriculum Filter Bar */}
        <div className="overflow-x-auto pb-2 mb-8">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl">
            {filters.map((f) => {
              const active = selectedTrack === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => {
                    onSelectTrack(f.key);
                    setActiveLessonIndex(0);
                    setSelectedOption(null);
                    setCheckpointSubmitted(false);
                  }}
                  className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Course Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {filteredCourses.map((course, idx) => {
            const isSelected = activeCourse.id === course.id;
            const completedInCourse = course.lessons.filter((l) =>
              progress.completedLessonIds.includes(l.id)
            ).length;

            return (
              <motion.button
                key={course.id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.04 }}
                onClick={() => handleSelectCourse(course.id)}
                className={`text-start p-6 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer hover:-translate-y-0.5 ${
                  isSelected
                    ? 'bg-white border-emerald-700 shadow-md ring-1 ring-emerald-700/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div>
                  <div className="text-xs font-medium text-emerald-700 mb-2">
                    <span>{course.curriculumLabel}</span>
                    <span className="mx-1.5 text-slate-300">·</span>
                    <span className="text-slate-500">{course.language}</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-slate-900 leading-snug mb-2">
                    {course.title}
                  </h3>
                  <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{course.summary}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 tabular-nums">
                  <span>
                    {course.lessons.length}{' '}
                    {lang === 'ar' ? 'دروس' : lang === 'en' ? 'lessons' : 'leçons'} · {completedInCourse}/
                    {course.lessons.length}
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                    {t.openCourse}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Interactive Split-Pane Lesson & Official Exam Rules Reader */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-6 sm:p-8 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-emerald-50/30">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div>
                <div className="text-xs font-medium text-slate-500 mb-1">
                  <span>{activeCourse.curriculumLabel}</span>
                  <span className="mx-2">·</span>
                  <span>{activeCourse.level}</span>
                  <span className="mx-2">·</span>
                  <span>
                    {lang === 'ar' ? 'المدرب:' : lang === 'en' ? 'Lead Tutor:' : 'Formateur :'}{' '}
                    <strong className="text-slate-800">{activeCourse.leadTrainer}</strong>
                  </span>
                </div>
                <h3 className="font-display text-2xl font-semibold text-slate-900">
                  {activeCourse.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToTutors(activeCourse.leadTrainer)}
                className="px-4 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:border-slate-900 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start lg:self-auto"
              >
                {lang === 'ar'
                  ? `حجز حصة مع ${activeCourse.leadTrainer}`
                  : lang === 'en'
                    ? `Book live coaching with ${activeCourse.leadTrainer}`
                    : `Réserver un cours avec ${activeCourse.leadTrainer}`}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5 border-t border-slate-200/80">
              <div>
                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{t.examRulesTitle}</span>
                </div>
                <div className="text-xs font-semibold text-slate-900">{activeCourse.examFormatRules.board}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">
                  {lang === 'ar' ? 'الآلة الحاسبة' : lang === 'en' ? 'Calculator Policy' : 'Calculatrice'}
                </div>
                <div className="text-xs font-medium text-slate-800">
                  {activeCourse.examFormatRules.calculatorPolicy}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">
                  {lang === 'ar' ? 'نظام الدرجات' : lang === 'en' ? 'Grading Scale' : 'Barème officiel'}
                </div>
                <div className="text-xs font-medium text-slate-800 tabular-nums">
                  {activeCourse.examFormatRules.gradingScale}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">
                  {lang === 'ar' ? 'المدة الرسمية' : lang === 'en' ? 'Official Timing' : 'Durée réglementaire'}
                </div>
                <div className="text-xs font-medium text-slate-800 tabular-nums">
                  {activeCourse.examFormatRules.duration}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12">
            <aside className="lg:col-span-4 border-b lg:border-b-0 lg:border-e border-slate-200 p-5 sm:p-6 bg-[#FBFBF9]">
              <div className="text-xs font-semibold text-slate-500 mb-4">
                {lang === 'ar' ? 'فصول الوحدة' : lang === 'en' ? 'Module Chapters' : 'Chapitres du Module'}
              </div>
              <div className="space-y-2">
                {activeCourse.lessons.map((lesson, idx) => {
                  const isCurrent = idx === activeLessonIndex;
                  const done = progress.completedLessonIds.includes(lesson.id);
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => handleSelectLesson(idx)}
                      className={`w-full text-start p-4 rounded-xl border transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-white border-emerald-700 shadow-xs'
                          : 'bg-white/60 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1 tabular-nums">
                        <span className="font-mono font-semibold text-emerald-700">{lesson.order}</span>
                        <span>
                          {lesson.durationMin} min {done ? '· ✓' : ''}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900 leading-snug">
                        {lesson.title}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 mb-3">
                  <img
                    src="/src/assets/images/course_stem_lab_1795527476888.jpg"
                    alt="Matériel de préparation aux examens internationaux"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {lang === 'ar'
                    ? 'كل درس يشمل قواعد التصحيح الرسمية، مثالاً تطبيقياً، وورقة ملخص قابلة للطباعة.'
                    : lang === 'en'
                      ? 'Every chapter includes official examiner criteria, worked steps, and a printable study sheet.'
                      : 'Chaque chapitre inclut les critères des correcteurs, un exemple rédigé et une fiche imprimable.'}
                </p>
              </div>
            </aside>

            <div className="lg:col-span-8 p-6 sm:p-8 space-y-8" dir={activeCourse.language === 'العربية' ? 'rtl' : 'ltr'}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                  <div className="text-xs font-mono text-emerald-700 mb-1">
                    {activeLesson.order} · {activeLesson.durationMin} min
                  </div>
                  <h4 className="font-display text-2xl font-semibold text-slate-900">
                    {activeLesson.title}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => downloadStudySheet(activeCourse, activeLesson)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t.downloadSheet}
                </button>
              </div>

              <div className="p-5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                <div className="text-xs font-semibold text-amber-900 mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{t.examRulesTitle}</span>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed">{activeLesson.officialRuleFocus}</p>
              </div>

              <div>
                <h5 className="text-sm font-semibold text-slate-900 mb-3">
                  {lang === 'ar' ? 'الشرح المفصل والمفاهيم الأساسية' : lang === 'en' ? 'Core Explanations & Concepts' : 'Explications Détaillées du Cours'}
                </h5>
                <ul className="space-y-2.5">
                  {activeLesson.concepts.map((concept, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed">
                      <span className="font-mono text-xs font-semibold text-emerald-700 mt-0.5 tabular-nums">
                        0{i + 1}.
                      </span>
                      <span>{concept}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 sm:p-6 rounded-xl bg-slate-50 border border-slate-200">
                <h5 className="text-sm font-semibold text-slate-900 mb-2">{t.workedExampleTitle}</h5>
                <p className="text-sm font-medium text-slate-900 mb-4 leading-relaxed">
                  {activeLesson.workedExample.problem}
                </p>
                <div className="space-y-2 pt-3 border-t border-slate-200">
                  {activeLesson.workedExample.solutionSteps.map((step, idx) => (
                    <p key={idx} className="text-sm text-slate-700 leading-relaxed">
                      {step}
                    </p>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span>{t.resourcesTitle}</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeLesson.resourceChecklist.map((resItem, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 flex items-center justify-between gap-3"
                    >
                      <span>{resItem}</span>
                      <button
                        type="button"
                        onClick={() => downloadStudySheet(activeCourse, activeLesson)}
                        className="text-emerald-700 hover:text-emerald-950 font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {lang === 'ar' ? 'تحميل' : lang === 'en' ? 'Get' : 'Ouvrir'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 sm:p-6 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <h5 className="text-sm font-semibold text-slate-900">{t.checkpointTitle}</h5>
                  {isLessonDone && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      {t.lessonCompleted}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-800 mb-4 leading-relaxed">{activeLesson.checkpoint.question}</p>
                <div className="space-y-2 mb-4">
                  {activeLesson.checkpoint.options.map((opt, idx) => {
                    const isPicked = selectedOption === idx;
                    const isCorrectOpt = idx === activeLesson.checkpoint.correctIndex;
                    let style = 'border-slate-200 bg-white text-slate-800 hover:border-slate-400';
                    if (checkpointSubmitted) {
                      if (isCorrectOpt) style = 'border-emerald-700 bg-emerald-50 text-emerald-950';
                      else if (isPicked) style = 'border-red-400 bg-red-50 text-red-900';
                    } else if (isPicked) {
                      style = 'border-slate-900 bg-slate-50 text-slate-900';
                    }
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedOption(idx);
                          setCheckpointSubmitted(false);
                        }}
                        className={`w-full text-start px-4 py-2.5 rounded-lg border text-sm transition-colors cursor-pointer ${style}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {checkpointSubmitted && (
                  <div className="mb-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                    <strong>
                      {selectedOption === activeLesson.checkpoint.correctIndex
                        ? lang === 'ar'
                          ? 'إجابة صحيحة — '
                          : lang === 'en'
                            ? 'Correct — '
                            : 'Exact — '
                        : lang === 'ar'
                          ? 'تصحيح — '
                          : lang === 'en'
                            ? 'Explanation — '
                            : 'Correction — '}
                    </strong>
                    {activeLesson.checkpoint.explanation}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={selectedOption === null}
                    onClick={handleCheckAnswer}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {lang === 'ar' ? 'تحقق من الإجابة' : lang === 'en' ? 'Verify Answer' : 'Vérifier la réponse'}
                  </button>
                  {!isLessonDone && (
                    <button
                      type="button"
                      onClick={() => onMarkLessonComplete(activeLesson.id)}
                      className="px-4 py-2 border border-slate-300 hover:border-slate-900 text-slate-800 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                    >
                      {t.markLessonDone}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Paid Specialized Intensive Courses Catalog */}
      <div id="paid-courses-section" className="pt-6 border-t border-slate-200">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-semibold tracking-wide text-amber-800 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span>
              {lang === 'ar'
                ? 'الدورات المكثفة المدفوعة · بإشراف المدربين'
                : lang === 'en'
                  ? 'Paid Intensive Programs · Led by Our Senior Tutors'
                  : 'Cours Payants Spécialisés · Programmes Intensifs Encadrés'}
            </span>
          </p>
          <h3 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 text-balance">
            {lang === 'ar'
              ? 'برامج مدفوعة متخصصة لسد الفجوات والتفوق في الامتحان'
              : lang === 'en'
                ? 'Enroll in targeted paid masterclasses for your exam track'
                : 'Rejoignez un cours payant ciblé pour accélérer votre progression'}
          </h3>
        </div>

        {enrollMessage && (
          <div
            className={`mb-6 p-4 rounded-xl border text-sm ${
              enrollMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {enrollMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visiblePaidCourses.map((pc) => (
            <div
              key={pc.id}
              dir={pc.language === 'العربية' ? 'rtl' : 'ltr'}
              className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-xs hover:border-[#0B6E8C] transition-colors"
            >
              <div>
                <div className="text-xs font-medium text-amber-800 mb-2">
                  <span>{pc.curriculumLabel}</span>
                  <span className="mx-1.5 text-slate-300">·</span>
                  <span className="text-slate-600">{pc.language}</span>
                </div>
                <h4 className="font-display text-lg font-semibold text-[#0F2537] leading-snug mb-3">
                  {pc.title}
                </h4>
                <div className="text-xs text-slate-600 mb-4 tabular-nums">
                  <span>{pc.trainerName}</span>
                  <span className="mx-1.5">·</span>
                  <span>{pc.durationWeeks} sem.</span>
                  <span className="mx-1.5">·</span>
                  <span>{pc.sessionsCount} séances</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {pc.syllabusHighlights.map((hl, i) => (
                    <li key={i} className="text-xs text-slate-700 leading-relaxed flex items-start gap-2">
                      <span className="font-mono text-[#0B6E8C] font-semibold">•</span>
                      <span>{hl}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="font-mono text-lg font-semibold text-[#0F2537] tabular-nums">
                  {pc.priceSar} SAR
                </span>

                {pc.isEnrolled ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold">
                    <Unlock className="w-3.5 h-3.5" />
                    {lang === 'ar' ? 'مسجل' : lang === 'en' ? 'Enrolled' : 'Inscrit'}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!user || !token) {
                        onRequireAuth();
                        return;
                      }
                      setCheckoutCourse(pc);
                    }}
                    className="px-4 py-2 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'ar'
                        ? 'التسجيل في الدورة'
                        : lang === 'en'
                          ? 'Enroll Now'
                          : 'S’inscrire au cours'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
        </div>
      )}

      {/* Paid Course Checkout Modal */}
      {checkoutCourse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-xl relative">
            <button
              type="button"
              onClick={() => setCheckoutCourse(null)}
              aria-label="Fermer"
              className="absolute top-4 end-4 p-2 text-slate-500 hover:text-slate-900 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-xs font-semibold text-amber-800 mb-1">
              {checkoutCourse.curriculumLabel} · {checkoutCourse.trainerName}
            </div>
            <h3 className="font-display text-xl font-semibold text-slate-900 mb-4">
              {checkoutCourse.title}
            </h3>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-5 flex items-center justify-between">
              <span className="text-sm text-slate-700">
                {checkoutCourse.sessionsCount} séances ({checkoutCourse.durationWeeks} semaines)
              </span>
              <span className="font-mono text-xl font-semibold text-slate-900 tabular-nums">
                {checkoutCourse.priceSar} SAR
              </span>
            </div>

            <form onSubmit={handleEnrollPaidCourse} className="space-y-4">
              <div className="space-y-2">
                {['Mada · Saudi Payments', 'Visa / Mastercard', 'Apple Pay'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`w-full text-start px-4 py-2.5 rounded-lg border text-xs font-medium cursor-pointer ${
                      paymentMethod === m
                        ? 'border-emerald-800 bg-emerald-50 text-emerald-950'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={enrolling}
                className="w-full py-3 px-4 bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                {enrolling
                  ? '...'
                  : lang === 'ar'
                    ? 'تأكيد التسجيل والدفع'
                    : lang === 'en'
                      ? 'Confirm Course Enrollment'
                      : 'Confirmer l’inscription payante'}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
