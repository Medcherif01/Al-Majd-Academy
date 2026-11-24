import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Compass,
  Globe,
  GraduationCap,
  Layers,
} from 'lucide-react';
import { AiExamStudio } from './components/AiExamStudio';
import { AuthModal } from './components/AuthModal';
import { CourseWorkspace } from './components/CourseWorkspace';
import { PastPapersVault } from './components/PastPapersVault';
import { PlacementTestView } from './components/PlacementTestView';
import { StudentPortal } from './components/StudentPortal';
import { TeacherPortal } from './components/TeacherPortal';
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
  PrepHubTab,
  ProgressState,
  TrainerProfile,
  UiLanguage,
  UserProfile,
  WorkspaceMode,
} from './types/academy';
import { apiRequest } from './utils/api';

export default function App() {
  const [lang, setLang] = useState<UiLanguage>('fr');
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('student');
  const [activeView, setActiveView] = useState<ActiveView>('placement');
  const [selectedTrack, setSelectedTrack] = useState<CurriculumKey>('all');
  const [targetCourseId, setTargetCourseId] = useState<string | null>(null);
  const [highlightPaidCourseId, setHighlightPaidCourseId] = useState<string | null>(null);
  const [courseSubMode, setCourseSubMode] = useState<'courses' | 'hubs'>('courses');
  const [courseHubTab, setCourseHubTab] = useState<PrepHubTab>('standards');

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
  const [aiInitialCurriculum, setAiInitialCurriculum] = useState<string | null>(null);
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
    setWorkspaceMode('student');
    setActiveView('placement');
    setTimeout(() => {
      document.getElementById('placement-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const openSpecificCourse = (courseId: string) => {
    setWorkspaceMode('student');
    setSelectedTrack('all');
    setCourseSubMode('courses');
    setTargetCourseId(courseId);
    setHighlightPaidCourseId(null);
    setActiveView('courses');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openPaidCourse = (paidCourseId: string) => {
    setWorkspaceMode('student');
    setSelectedTrack('all');
    setCourseSubMode('courses');
    setHighlightPaidCourseId(paidCourseId);
    setActiveView('courses');
    setTimeout(() => {
      document.getElementById('paid-courses-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 120);
  };

  const openPrepHub = (tab: PrepHubTab) => {
    setWorkspaceMode('student');
    setCourseSubMode('hubs');
    setCourseHubTab(tab);
    setActiveView('courses');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const launchAiExam = (curriculum: string) => {
    setWorkspaceMode('student');
    setAiInitialCurriculum(curriculum);
    setActiveView('ai-exams');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <MotionConfig reducedMotion="user">
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="min-h-screen flex flex-col bg-[#F4F7FA] text-[#0F2537]"
      >
        <TopNav
          lang={lang}
          activeView={activeView}
          workspaceMode={workspaceMode}
          onNavigate={(view) => {
            setWorkspaceMode('student');
            if (view === 'courses') {
              setCourseSubMode('courses');
            }
            setActiveView(view);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          user={user}
          onOpenAuth={() => setAuthModalOpen(true)}
        />

        {/* Workspace Utility Toolbar: Mode Switcher (Student / Teacher Portal) + Language Switcher */}
        <div className="border-b border-[#DCE4ED] bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Practical Workspace Switcher */}
              <div className="inline-flex items-center gap-1 p-0.5 bg-[#EAF1F5] border border-[#D8E3EC] rounded-xl">
                <button
                  type="button"
                  onClick={() => setWorkspaceMode('student')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    workspaceMode === 'student'
                      ? 'bg-white text-[#0F2537] shadow-xs'
                      : 'text-slate-600 hover:text-[#0F2537]'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 text-[#0B6E8C]" />
                  <span>{t.modeStudent}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWorkspaceMode('teacher')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    workspaceMode === 'teacher'
                      ? 'bg-[#0B6E8C] text-white shadow-xs'
                      : 'text-slate-600 hover:text-[#0F2537]'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>{t.modeTeacher}</span>
                </button>
              </div>

              <span className="hidden lg:inline text-xs text-slate-500">
                {lang === 'ar'
                  ? 'الرياض · جدة · الخبر · SAT · IB · IGCSE · NAFES · STEP · GAT · IELTS'
                  : 'Riyad · Djeddah · Al-Khobar · SAT · IB · IGCSE · NAFES · STEP · GAT · IELTS'}
              </span>
            </div>

            <div className="inline-flex items-center gap-1 p-0.5 bg-[#EAF1F5] border border-[#D8E3EC] rounded-xl">
              <Globe className="w-3.5 h-3.5 text-[#0B6E8C] mx-1.5" />
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
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    lang === opt.code
                      ? 'bg-white text-[#0F2537] shadow-xs'
                      : 'text-slate-600 hover:text-[#0F2537]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="flex-1">
          {workspaceMode === 'teacher' ? (
            <TeacherPortal lang={lang} onLaunchAiExam={launchAiExam} />
          ) : (
            <AnimatePresence mode="wait">
              {activeView === 'placement' && (
                <motion.div
                  key="view-placement"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Academic Command Hero */}
                  <section className="bg-white border-b border-[#DCE4ED]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-9 pb-11">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                        <motion.div
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                          className="lg:col-span-7 flex flex-col justify-center py-2"
                        >
                          <p className="text-xs font-semibold tracking-wide text-[#0B6E8C] mb-2.5 flex items-center gap-1.5">
                            <Compass className="w-4 h-4" />
                            <span>{t.heroKicker}</span>
                          </p>
                          <h1 className="font-display text-3xl sm:text-5xl font-bold text-[#0F2537] leading-[1.12] tracking-tight text-balance mb-4">
                            {t.heroTitle}
                          </h1>
                          <p className="text-base text-slate-600 leading-relaxed mb-7 max-w-2xl">
                            {t.heroSubtitle}
                          </p>

                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={scrollToPlacement}
                              className="px-5 py-3 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-sm font-semibold rounded-xl shadow-xs transition-all inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
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
                              onClick={() => openPrepHub('step')}
                              className="px-4 py-3 border border-[#D8E3EC] hover:border-[#0B6E8C] bg-[#F4F7FA] text-[#0F2537] text-sm font-semibold rounded-xl transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <Layers className="w-4 h-4 text-[#0B6E8C]" />
                              <span>STEP · GAT · NAFES · IELTS</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setWorkspaceMode('teacher')}
                              className="px-4 py-3 border border-slate-300 hover:border-[#0F2537] bg-white text-[#0F2537] text-sm font-semibold rounded-xl transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <Briefcase className="w-4 h-4 text-[#0B6E8C]" />
                              <span>{t.modeTeacher}</span>
                            </button>
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                          className="lg:col-span-5"
                        >
                          <div className="h-full min-h-[260px] lg:min-h-[340px] rounded-2xl overflow-hidden border border-[#DCE4ED] shadow-xs bg-slate-100">
                            <img
                              src="/src/assets/images/hero_international_academy_1795527475897.jpg"
                              alt="Campus académique d'une école internationale à Riyad"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </motion.div>
                      </div>

                      {/* 4-Step Practical Academic Pathway Strip */}
                      <div className="mt-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <button
                          type="button"
                          onClick={scrollToPlacement}
                          className="text-start bg-[#F8FAFC] border border-[#DCE4ED] hover:border-[#0B6E8C] rounded-2xl p-5 transition-all cursor-pointer"
                        >
                          <div className="font-mono text-xs font-bold text-[#0B6E8C] mb-1">
                            01 · DIAGNOSTIC
                          </div>
                          <div className="font-display text-base font-bold text-[#0F2537] mb-1">
                            {lang === 'ar'
                              ? 'اختبار تحديد المستوى'
                              : lang === 'en'
                                ? 'Grade Placement Test'
                                : 'Test de Niveau par Classe'}
                          </div>
                          <p className="text-xs text-slate-600">
                            {lang === 'ar'
                              ? 'نقاط القوة والضعف وما ينقصك'
                              : lang === 'en'
                                ? 'Strengths, weaknesses & missing gaps'
                                : 'Forces, faiblesses & lacunes ciblées'}
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => openPrepHub('standards')}
                          className="text-start bg-[#F8FAFC] border border-[#DCE4ED] hover:border-[#0B6E8C] rounded-2xl p-5 transition-all cursor-pointer"
                        >
                          <div className="font-mono text-xs font-bold text-[#0B6E8C] mb-1">
                            02 · PREP HUBS
                          </div>
                          <div className="font-display text-base font-bold text-[#0F2537] mb-1">
                            STEP · GAT · NAFES · IELTS
                          </div>
                          <p className="text-xs text-slate-600">
                            Phonics · Skill Builder · Standards · Rédaction
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCourseSubMode('courses');
                            setActiveView('courses');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="text-start bg-[#F8FAFC] border border-[#DCE4ED] hover:border-[#0B6E8C] rounded-2xl p-5 transition-all cursor-pointer"
                        >
                          <div className="font-mono text-xs font-bold text-emerald-700 mb-1">
                            03 · COURS &amp; IA
                          </div>
                          <div className="font-display text-base font-bold text-[#0F2537] mb-1">
                            {lang === 'ar'
                              ? 'دروس مخصصة ومدفوعة + Gemini'
                              : lang === 'en'
                                ? 'Courses, Paid Tracks & Gemini'
                                : 'Cours Ciblés, Payants & IA'}
                          </div>
                          <p className="text-xs text-slate-600">
                            SAT · IB · IGCSE · NAFES · Qudurat · Bac FR
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveView('past-papers');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="text-start bg-[#F8FAFC] border border-[#DCE4ED] hover:border-amber-600 rounded-2xl p-5 transition-all cursor-pointer"
                        >
                          <div className="font-mono text-xs font-bold text-amber-700 mb-1">
                            04 · ANNALES &amp; COACHS
                          </div>
                          <div className="font-display text-base font-bold text-[#0F2537] mb-1">
                            {t.benchmarkVault}
                          </div>
                          <p className="text-xs text-slate-600">
                            Marwan Mhamdi (EN) · Mohamed Cherif (FR/AR)
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

                  {/* Bottom Academic Leadership Banner */}
                  <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                    <div className="bg-[#0F2537] text-white rounded-2xl p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center shadow-sm">
                      <div className="lg:col-span-2">
                        <div className="text-xs font-semibold text-sky-300 mb-2">
                          {lang === 'ar'
                            ? 'إشراف تربوي ثنائي المسار · بوابة المعلم والطالب'
                            : lang === 'en'
                              ? 'Bilingual Academic Leadership · Student & Teacher Portals'
                              : 'Direction Pédagogique Trilingue · Suivi Formateur & Élève'}
                        </div>
                        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3 text-balance">
                          {lang === 'ar'
                            ? 'مروان المحمدي (المسار الإنجليزي) ومحمد شريف (الفرنسي والعربي، نافس والقدرات)'
                            : lang === 'en'
                              ? 'Marwan Mhamdi (English Tracks) & Mohamed Cherif (French, Arabic, NAFES & Qudurat)'
                              : 'Marwan Mhamdi (cursus anglais) & Mohamed Cherif (français, arabe, NAFES & Qudurat)'}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-200 mt-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                            <span>Marwan Mhamdi — All English Curricula</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                            <span>Mohamed Cherif — Français &amp; العربية</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                        <button
                          type="button"
                          onClick={() => setWorkspaceMode('teacher')}
                          className="px-5 py-3 bg-[#0B6E8C] hover:bg-[#0E83A6] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                        >
                          {t.modeTeacher}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveView('tutors');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-5 py-3 bg-white text-[#0F2537] hover:bg-slate-100 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
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
                    initialSubMode={courseSubMode}
                    initialHubTab={courseHubTab}
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
                    onLaunchAiExam={launchAiExam}
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
                    initialCurriculum={aiInitialCurriculum}
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
          )}
        </main>

        {/* Quiet Academic Footer */}
        <footer className="border-t border-[#DCE4ED] bg-white mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#0B6E8C]" />
              <span className="font-display font-bold text-[#0F2537]">{t.brand}</span>
              <span className="text-slate-300">·</span>
              <span>SAT · IB · IGCSE · NAFES · Qudurat · STEP · IELTS · Bac Français</span>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={() => {
                  setWorkspaceMode('student');
                  setActiveView('placement');
                }}
                className="hover:text-[#0F2537] cursor-pointer"
              >
                {t.navPlacement}
              </button>
              <button
                type="button"
                onClick={() => {
                  setWorkspaceMode('student');
                  setActiveView('courses');
                }}
                className="hover:text-[#0F2537] cursor-pointer"
              >
                {t.navCourses}
              </button>
              <button
                type="button"
                onClick={() => {
                  setWorkspaceMode('student');
                  setActiveView('ai-exams');
                }}
                className="hover:text-[#0F2537] cursor-pointer"
              >
                {t.navAiExams}
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceMode('teacher')}
                className="font-semibold text-[#0B6E8C] hover:underline cursor-pointer"
              >
                {t.modeTeacher}
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
