import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ArrowRight, BookOpen, CheckCircle2, Globe } from 'lucide-react';
import { AiExamStudio } from './components/AiExamStudio';
import { AuthModal } from './components/AuthModal';
import { CourseWorkspace } from './components/CourseWorkspace';
import { PastPapersVault } from './components/PastPapersVault';
import { PlacementTestView } from './components/PlacementTestView';
import { StudentPortal } from './components/StudentPortal';
import { TopNav } from './components/TopNav';
import { TutoringSection } from './components/TutoringSection';
import { TRANSLATIONS } from './i18n/translations';
import type {
  ActiveView,
  BookingItem,
  CurriculumKey,
  GeneratedExam,
  GradeOption,
  PaidCourseItem,
  PastPaperSummary,
  PlacementResult,
  ProgressState,
  TrainerProfile,
  UiLanguage,
  UserProfile,
} from './types/academy';
import { apiRequest } from './utils/api';

export default function App() {
  const [lang, setLang] = useState<UiLanguage>('fr');
  const [activeView, setActiveView] = useState<ActiveView>('placement');
  const [selectedTrack, setSelectedTrack] = useState<CurriculumKey>('all');
  const [targetCourseId, setTargetCourseId] = useState<string | null>(null);
  const [highlightPaidCourseId, setHighlightPaidCourseId] = useState<string | null>(null);

  // Auth held strictly in React state memory
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Domain Data from Server
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [paidCourses, setPaidCourses] = useState<PaidCourseItem[]>([]);
  const [latestPlacement, setLatestPlacement] = useState<PlacementResult | null>(null);
  const [trainers, setTrainers] = useState<TrainerProfile[]>([]);
  const [papers, setPapers] = useState<PastPaperSummary[]>([]);
  const [allAccessPrice, setAllAccessPrice] = useState<number>(290);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [savedExams, setSavedExams] = useState<GeneratedExam[]>([]);
  const [reopenExam, setReopenExam] = useState<GeneratedExam | null>(null);
  const [preselectedTrainer, setPreselectedTrainer] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressState>({
    completedLessonIds: [],
    quizScores: {},
  });

  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'ar';

  const fetchPastPapers = useCallback(async (activeToken: string | null) => {
    try {
      const res = await apiRequest<{
        papers: PastPaperSummary[];
        allAccessPassPriceSar: number;
      }>('/api/past-papers', { token: activeToken });
      setPapers(res.papers);
      setAllAccessPrice(res.allAccessPassPriceSar);
    } catch (err) {
      console.error('Failed to load past papers:', err);
    }
  }, []);

  const fetchPaidCourses = useCallback(async (activeToken: string | null) => {
    try {
      const res = await apiRequest<{ paidCourses: PaidCourseItem[] }>('/api/paid-courses', {
        token: activeToken,
      });
      setPaidCourses(res.paidCourses);
    } catch (err) {
      console.error('Failed to load paid courses:', err);
    }
  }, []);

  const fetchUserWorkspaceData = useCallback(async (activeToken: string) => {
    try {
      const [bookingsRes, examsRes, progressRes, placementRes] = await Promise.all([
        apiRequest<{ bookings: BookingItem[] }>('/api/bookings', { token: activeToken }),
        apiRequest<{ exams: GeneratedExam[] }>('/api/exams/history', { token: activeToken }),
        apiRequest<{ progress: ProgressState }>('/api/progress', { token: activeToken }),
        apiRequest<{ result: PlacementResult | null }>('/api/placement/latest', {
          token: activeToken,
        }),
      ]);
      setBookings(bookingsRes.bookings);
      setSavedExams(examsRes.exams);
      setProgress(progressRes.progress);
      if (placementRes.result) {
        setLatestPlacement(placementRes.result);
      }
    } catch (err) {
      console.error('Failed to load user portal data:', err);
    }
  }, []);

  useEffect(() => {
    apiRequest<{ trainers: TrainerProfile[] }>('/api/trainers')
      .then((res) => setTrainers(res.trainers))
      .catch((err) => console.error('Failed to load trainers:', err));

    apiRequest<{ grades: GradeOption[]; paidCourses: PaidCourseItem[] }>('/api/placement/options')
      .then((res) => {
        setGrades(res.grades);
        setPaidCourses(res.paidCourses);
      })
      .catch((err) => console.error('Failed to load placement options:', err));

    fetchPastPapers(null);
  }, [fetchPastPapers]);

  const handleAuthSuccess = async (newToken: string, loggedInUser: UserProfile) => {
    setToken(newToken);
    setUser(loggedInUser);
    await Promise.all([
      fetchPastPapers(newToken),
      fetchPaidCourses(newToken),
      fetchUserWorkspaceData(newToken),
    ]);
  };

  const handleSignOut = () => {
    setToken(null);
    setUser(null);
    setBookings([]);
    setSavedExams([]);
    setLatestPlacement(null);
    setProgress({ completedLessonIds: [], quizScores: {} });
    fetchPastPapers(null);
    fetchPaidCourses(null);
  };

  const handleMarkLessonComplete = async (lessonId: string, quizScore?: number) => {
    setProgress((prev) => ({
      completedLessonIds: Array.from(new Set([...prev.completedLessonIds, lessonId])),
      quizScores:
        quizScore !== undefined
          ? { ...prev.quizScores, [lessonId]: quizScore }
          : prev.quizScores,
    }));

    if (token) {
      try {
        const res = await apiRequest<{ progress: ProgressState }>('/api/progress', {
          method: 'POST',
          token,
          body: {
            lessonId,
            quizScore: quizScore !== undefined ? { lessonId, score: quizScore } : undefined,
          },
        });
        setProgress(res.progress);
      } catch (err) {
        console.error('Progress sync failed:', err);
      }
    }
  };

  const scrollToPlacement = () => {
    setActiveView('placement');
    setTimeout(() => {
      document.getElementById('placement-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const openSpecificCourse = (courseId: string) => {
    setSelectedTrack('all');
    setTargetCourseId(courseId);
    setHighlightPaidCourseId(null);
    setActiveView('courses');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openPaidCourse = (paidCourseId: string) => {
    setSelectedTrack('all');
    setHighlightPaidCourseId(paidCourseId);
    setActiveView('courses');
    setTimeout(() => {
      document.getElementById('paid-courses-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 120);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="min-h-screen flex flex-col bg-[#FBFBF9] text-slate-900"
      >
        <TopNav
          lang={lang}
          activeView={activeView}
          onNavigate={(view) => {
            setActiveView(view);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          user={user}
          onOpenAuth={() => setAuthModalOpen(true)}
        />

        {/* Workspace Utility Strip for Trilingual Language Switching (FR / EN / AR) */}
        <div className="border-b border-slate-200/80 bg-white/90">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-slate-600">
              <span>
                {lang === 'ar'
                  ? 'الرياض · جدة · الخبر · مدارس المملكة العالمية والوطنية (NAFES · Qudurat · SAT · IB · IGCSE · Bac)'
                  : lang === 'en'
                    ? 'Riyadh · Jeddah · Al-Khobar · KSA International & National Schools (SAT · IB · IGCSE · NAFES · Qudurat · Bac)'
                    : 'Riyad · Djeddah · Al-Khobar · Écoles Internationales & Nationales (SAT · IB · IGCSE · NAFES · Qudurat · Bac)'}
              </span>
            </div>

            <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 border border-slate-200 rounded-lg">
              <Globe className="w-3.5 h-3.5 text-slate-500 mx-1.5" />
              {(
                [
                  { code: 'fr', label: 'FR' },
                  { code: 'en', label: 'EN' },
                  { code: 'ar', label: 'العربية' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => setLang(opt.code)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    lang === opt.code
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="flex-1">
          <AnimatePresence mode="wait">
            {activeView === 'placement' && (
              <motion.div
                key="view-placement"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {/* Luminous Editorial Hero */}
                <section className="relative overflow-hidden bg-gradient-to-br from-[#FBFBF9] via-[#F2F7F5] to-[#EEF3FB] border-b border-slate-200/80">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                      <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="lg:col-span-6 flex flex-col justify-center py-2 lg:py-6"
                      >
                        <p className="text-xs font-semibold tracking-wide text-emerald-700 mb-3">
                          {t.heroKicker}
                        </p>
                        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-slate-900 leading-[1.12] tracking-tight text-balance mb-5">
                          {t.heroTitle}
                        </h1>
                        <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-8 max-w-xl">
                          {t.heroSubtitle}
                        </p>

                        <div className="flex flex-wrap items-center gap-4">
                          <button
                            type="button"
                            onClick={scrollToPlacement}
                            className="px-6 py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold rounded-xl shadow-sm transition-all hover:-translate-y-0.5 inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <span>
                              {lang === 'ar'
                                ? 'ابدأ باختبار تحديد المستوى'
                                : lang === 'en'
                                  ? 'Start Placement Test'
                                  : 'Commencer mon Test de Niveau'}
                            </span>
                            <ArrowRight className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveView('courses');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="px-5 py-3.5 border border-slate-300 hover:border-slate-900 bg-white text-slate-900 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            {t.heroPrimaryCta}
                          </button>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="lg:col-span-6"
                      >
                        <div className="h-full min-h-[300px] lg:min-h-[420px] rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-100">
                          <img
                            src="/src/assets/images/hero_international_academy_1795527475897.jpg"
                            alt="Bibliothèque moderne d'une école internationale à Riyad"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </motion.div>
                    </div>

                    {/* 4-Step Guided Pathway Strip */}
                    <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <button
                        type="button"
                        onClick={scrollToPlacement}
                        className="text-start bg-white border border-blue-200 hover:border-blue-600 rounded-2xl p-5 shadow-xs transition-all hover:-translate-y-0.5 cursor-pointer"
                      >
                        <div className="font-mono text-xs font-semibold text-blue-700 mb-1">01</div>
                        <div className="font-display text-lg font-semibold text-slate-900 mb-1">
                          {lang === 'ar'
                            ? 'اختبار تحديد المستوى'
                            : lang === 'en'
                              ? 'Grade Placement Test'
                              : 'Test de Niveau par Classe'}
                        </div>
                        <p className="text-xs text-slate-600">
                          {lang === 'ar'
                            ? 'اختر صفك واكتشف نقاط القوة والضعف وما ينقصك'
                            : lang === 'en'
                              ? 'Choose your grade · Strengths, weaknesses & gaps'
                              : 'Choix de la classe · Forces, faiblesses & lacunes'}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveView('courses');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-start bg-white border border-slate-200 hover:border-emerald-700 rounded-2xl p-5 shadow-xs transition-all hover:-translate-y-0.5 cursor-pointer"
                      >
                        <div className="font-mono text-xs font-semibold text-emerald-700 mb-1">02</div>
                        <div className="font-display text-lg font-semibold text-slate-900 mb-1">
                          {lang === 'ar'
                            ? 'دروس مخصصة ومدفوعة'
                            : lang === 'en'
                              ? 'Specific & Paid Courses'
                              : 'Cours Ciblés & Payants'}
                        </div>
                        <p className="text-xs text-slate-600">
                          SAT · IB · IGCSE · NAFES · Qudurat · Bac FR
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveView('ai-exams');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-start bg-white border border-slate-200 hover:border-emerald-700 rounded-2xl p-5 shadow-xs transition-all hover:-translate-y-0.5 cursor-pointer"
                      >
                        <div className="font-mono text-xs font-semibold text-emerald-700 mb-1">03</div>
                        <div className="font-display text-lg font-semibold text-slate-900 mb-1">
                          {t.benchmarkAi}
                        </div>
                        <p className="text-xs text-slate-600">
                          {lang === 'ar'
                            ? 'توليد امتحانات تفاعلية مع التصحيح'
                            : lang === 'en'
                              ? 'Timed mock exams & instant marking'
                              : 'Sujets sur mesure & correction instantanée'}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveView('past-papers');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-start bg-white border border-slate-200 hover:border-amber-600 rounded-2xl p-5 shadow-xs transition-all hover:-translate-y-0.5 cursor-pointer"
                      >
                        <div className="font-mono text-xs font-semibold text-amber-700 mb-1">04</div>
                        <div className="font-display text-lg font-semibold text-slate-900 mb-1">
                          {t.benchmarkVault}
                        </div>
                        <p className="text-xs text-slate-600">
                          {lang === 'ar'
                            ? 'تحميل الاختبارات السابقة والحلول + المدربون'
                            : lang === 'en'
                              ? 'Paid papers + Marwan Mhamdi & Mohamed Cherif'
                              : 'Annales corrigées & formateurs en ligne'}
                        </p>
                      </button>
                    </div>
                  </div>
                </section>

                {/* Placement Test Interactive Workspace */}
                <PlacementTestView
                  lang={lang}
                  token={token}
                  grades={grades}
                  paidCourses={paidCourses}
                  latestResult={latestPlacement}
                  onResultReady={(res) => setLatestPlacement(res)}
                  onGoToCourse={openSpecificCourse}
                  onGoToPaidCourse={openPaidCourse}
                  onGoToTrainer={(trainerId) => {
                    setPreselectedTrainer(
                      trainerId === 'mohamed' ? 'Mohamed Cherif' : 'Marwan Mhamdi'
                    );
                    setActiveView('tutors');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />

                {/* Bottom Trust Strip */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                  <div className="bg-gradient-to-r from-[#0B172A] to-[#0E312B] text-white rounded-2xl p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center shadow-md">
                    <div className="lg:col-span-2">
                      <div className="text-xs font-semibold text-emerald-300 mb-2">
                        {lang === 'ar'
                          ? 'إشراف تربوي ثنائي المسار'
                          : lang === 'en'
                            ? 'Bilingual & Trilingual Academic Leadership'
                            : 'Accompagnement Personnalisé par nos Formateurs'}
                      </div>
                      <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-3 text-balance">
                        {lang === 'ar'
                          ? 'مروان المحمدي (المسار الإنجليزي) ومحمد شريف (الفرنسي والعربي، نافس والقدرات)'
                          : lang === 'en'
                            ? 'Marwan Mhamdi (English Tracks) & Mohamed Cherif (French, Arabic, NAFES & Qudurat)'
                            : 'Marwan Mhamdi (cursus anglais) & Mohamed Cherif (français, arabe, NAFES & Qudurat)'}
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-200 mt-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Marwan Mhamdi — All English Curricula</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Mohamed Cherif — Français &amp; العربية</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveView('courses');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-5 py-3 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                      >
                        {t.heroPrimaryCta}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveView('tutors');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                      >
                        {t.bookTrainerBtn}
                      </button>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeView === 'courses' && (
              <motion.div
                key="view-courses"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <CourseWorkspace
                  lang={lang}
                  selectedTrack={selectedTrack}
                  onSelectTrack={setSelectedTrack}
                  initialCourseId={targetCourseId}
                  highlightPaidCourseId={highlightPaidCourseId}
                  progress={progress}
                  paidCourses={paidCourses}
                  user={user}
                  token={token}
                  onRequireAuth={() => setAuthModalOpen(true)}
                  onUserUpdated={(updated) => setUser(updated)}
                  onRefreshPaidCourses={() => fetchPaidCourses(token)}
                  onMarkLessonComplete={handleMarkLessonComplete}
                  onNavigateToTutors={(trainerName) => {
                    setPreselectedTrainer(trainerName);
                    setActiveView('tutors');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </motion.div>
            )}

            {activeView === 'ai-exams' && (
              <motion.div
                key="view-ai"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <AiExamStudio
                  lang={lang}
                  token={token}
                  initialExam={reopenExam}
                  onExamSaved={(exam) => {
                    setSavedExams((prev) => [exam, ...prev]);
                  }}
                />
              </motion.div>
            )}

            {activeView === 'past-papers' && (
              <motion.div
                key="view-papers"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <PastPapersVault
                  lang={lang}
                  papers={papers}
                  allAccessPassPriceSar={allAccessPrice}
                  user={user}
                  token={token}
                  onRequireAuth={() => setAuthModalOpen(true)}
                  onUserUpdated={(updated) => setUser(updated)}
                  onRefreshPapers={() => fetchPastPapers(token)}
                />
              </motion.div>
            )}

            {activeView === 'tutors' && (
              <motion.div
                key="view-tutors"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <TutoringSection
                  lang={lang}
                  trainers={trainers}
                  preselectedTrainerName={preselectedTrainer}
                  user={user}
                  token={token}
                  onRequireAuth={() => setAuthModalOpen(true)}
                  onBookingCreated={(booking) => setBookings((prev) => [booking, ...prev])}
                />
              </motion.div>
            )}

            {activeView === 'portal' && (
              <motion.div
                key="view-portal"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <StudentPortal
                  lang={lang}
                  user={user}
                  token={token}
                  progress={progress}
                  papers={papers}
                  paidCourses={paidCourses}
                  latestPlacement={latestPlacement}
                  bookings={bookings}
                  savedExams={savedExams}
                  onOpenAuth={() => setAuthModalOpen(true)}
                  onSignOut={handleSignOut}
                  onReopenAiExam={(ex) => {
                    setReopenExam(ex);
                    setActiveView('ai-exams');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onGoToPlacement={() => {
                    setActiveView('placement');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onGoToPastPapers={() => {
                    setActiveView('past-papers');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onGoToTutors={() => {
                    setActiveView('tutors');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onGoToCourse={openSpecificCourse}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Quiet Footer */}
        <footer className="border-t border-slate-200 bg-white mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-700" />
              <span className="font-display font-semibold text-slate-900">{t.brand}</span>
              <span className="text-slate-300">·</span>
              <span>American · IB · IGCSE · NAFES · Qudurat · Bac Français</span>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={() => setActiveView('placement')}
                className="hover:text-slate-900 cursor-pointer"
              >
                {t.navPlacement}
              </button>
              <button
                type="button"
                onClick={() => setActiveView('courses')}
                className="hover:text-slate-900 cursor-pointer"
              >
                {t.navCourses}
              </button>
              <button
                type="button"
                onClick={() => setActiveView('ai-exams')}
                className="hover:text-slate-900 cursor-pointer"
              >
                {t.navAiExams}
              </button>
              <button
                type="button"
                onClick={() => setActiveView('past-papers')}
                className="hover:text-slate-900 cursor-pointer"
              >
                {t.navPastPapers}
              </button>
              <button
                type="button"
                onClick={() => setActiveView('tutors')}
                className="hover:text-slate-900 cursor-pointer"
              >
                {t.navTutors}
              </button>
            </div>
          </div>
        </footer>

        <AuthModal
          open={authModalOpen}
          lang={lang}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      </div>
    </MotionConfig>
  );
}
