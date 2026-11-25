import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  ArrowRight,
  Award,
  Briefcase,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  Globe,
  GraduationCap,
  Layers,
  Lock,
} from 'lucide-react';
import { AiExamStudio } from './components/AiExamStudio';
import { AuthModal } from './components/AuthModal';
import { AcademyCrestIcon } from './components/BrandIcons';
import { CourseWorkspace } from './components/CourseWorkspace';
import { PastPapersVault } from './components/PastPapersVault';
import { PlacementTestView } from './components/PlacementTestView';
import { PrefaceLanding, type PrefaceDestination } from './components/PrefaceLanding';
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
  JoiningRequestItem,
  PaidCourseItem,
  PastPaperSummary,
  PlacementResult,
  PrepHubTab,
  ProgressState,
  StudentTrackLock,
  TrainerProfile,
  UiLanguage,
  UserProfile,
  WorkspaceMode,
} from './types/academy';
import { apiRequest } from './utils/api';

export default function App() {
  const [lang, setLang] = useState<UiLanguage>('fr');
  const [showPreface, setShowPreface] = useState(true);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('student');
  const [preselectedTeacherPortalId, setPreselectedTeacherPortalId] = useState<'marwan' | 'mohamed'>('marwan');
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
  const [joiningRequests, setJoiningRequests] = useState<JoiningRequestItem[]>([]);
  const [savedExams, setSavedExams] = useState<GeneratedExam[]>([]);
  const [reopenExam, setReopenExam] = useState<GeneratedExam | null>(null);
  const [aiInitialCurriculum, setAiInitialCurriculum] = useState<string | null>(null);
  const [preselectedTrainer, setPreselectedTrainer] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressState>({
    completedLessonIds: [],
    quizScores: {},
  });

  // Strict Grade/Curriculum Lock + 30-Minute Free Trial Timer
  const [trackLock, setTrackLock] = useState<StudentTrackLock | null>(null);
  const [trialStartMs, setTrialStartMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'ar';

  const hasPaidAccess = Boolean(
    user?.hasAllAccessPass ||
      user?.hasPaidAccess ||
      (user?.enrolledCourses && user.enrolledCourses.length > 0) ||
      bookings.some((b) => b.paid)
  );

  const trialDurationSec = user?.trialDurationSeconds || 1800;
  const trialSecondsRemaining = hasPaidAccess
    ? trialDurationSec
    : user?.trialExpired
      ? 0
      : trialStartMs
        ? Math.max(0, trialDurationSec - Math.floor((nowMs - trialStartMs) / 1000))
        : trialDurationSec;
  const trialExpired = !hasPaidAccess && trialSecondsRemaining <= 0;

  useEffect(() => {
    if (!trialStartMs || hasPaidAccess) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [trialStartMs, hasPaidAccess]);

  const formatTrialClock = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const syncUserTrackAndTrial = useCallback((u: UserProfile) => {
    if (u.lockedTrackKey && u.lockedCurriculum && u.lockedGrade) {
      const tk = u.lockedTrackKey as Exclude<CurriculumKey, 'all'>;
      setTrackLock({
        gradeLevel: u.lockedGrade,
        curriculum: u.lockedCurriculum,
        trackKey: tk,
      });
      setSelectedTrack(tk);
    }
    if (u.trialStartedAt) {
      const parsed = Date.parse(u.trialStartedAt);
      if (Number.isFinite(parsed)) {
        setTrialStartMs(parsed);
      }
    }
  }, []);

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
      const [bookingsRes, requestsRes, examsRes, progressRes, placementRes] = await Promise.all([
        apiRequest<{ bookings: BookingItem[] }>('/api/bookings', { token: activeToken }),
        apiRequest<{ requests: JoiningRequestItem[] }>('/api/joining-requests/my', {
          token: activeToken,
        }),
        apiRequest<{ exams: GeneratedExam[] }>('/api/exams/history', { token: activeToken }),
        apiRequest<{ progress: ProgressState }>('/api/progress', { token: activeToken }),
        apiRequest<{ result: PlacementResult | null }>('/api/placement/latest', {
          token: activeToken,
        }),
      ]);
      setBookings(bookingsRes.bookings);
      setJoiningRequests(requestsRes.requests || []);
      setSavedExams(examsRes.exams);
      setProgress(progressRes.progress);
      if (placementRes.result) {
        setLatestPlacement(placementRes.result);
      }
    } catch (err) {
      console.error('Failed to load user portal data:', err);
    }
  }, []);

  const refreshStudentWorkspace = useCallback(async () => {
    if (!token) return;
    try {
      const meRes = await apiRequest<{ user: UserProfile }>('/api/auth/me', { token });
      setUser(meRes.user);
      syncUserTrackAndTrial(meRes.user);
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
    await Promise.all([
      fetchPastPapers(token),
      fetchPaidCourses(token),
      fetchUserWorkspaceData(token),
    ]);
  }, [token, syncUserTrackAndTrial, fetchPastPapers, fetchPaidCourses, fetchUserWorkspaceData]);

  const fetchTrainers = useCallback(async () => {
    try {
      const res = await apiRequest<{ trainers: TrainerProfile[] }>('/api/trainers');
      setTrainers(res.trainers);
    } catch (err) {
      console.error('Failed to load trainers:', err);
    }
  }, []);

  useEffect(() => {
    fetchTrainers();

    apiRequest<{ grades: GradeOption[]; paidCourses: PaidCourseItem[] }>('/api/placement/options')
      .then((res) => {
        setGrades(res.grades);
        setPaidCourses(res.paidCourses);
      })
      .catch((err) => console.error('Failed to load placement options:', err));

    fetchPastPapers(null);
  }, [fetchPastPapers, fetchTrainers]);

  const handleAuthSuccess = async (newToken: string, loggedInUser: UserProfile) => {
    setToken(newToken);
    setUser(loggedInUser);
    syncUserTrackAndTrial(loggedInUser);
    if (showPreface) {
      setWorkspaceMode('student');
      setActiveView('portal');
      setShowPreface(false);
    }
    await Promise.all([
      fetchPastPapers(newToken),
      fetchPaidCourses(newToken),
      fetchUserWorkspaceData(newToken),
    ]);
  };

  const handleSignOut = () => {
    setToken(null);
    setUser(null);
    setTrackLock(null);
    setTrialStartMs(null);
    setSelectedTrack('all');
    setBookings([]);
    setJoiningRequests([]);
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
    setSelectedTrack(trackLock && !hasPaidAccess ? trackLock.trackKey : 'all');
    setCourseSubMode('courses');
    setTargetCourseId(courseId);
    setHighlightPaidCourseId(null);
    setActiveView('courses');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openPaidCourse = (paidCourseId: string) => {
    setWorkspaceMode('student');
    setSelectedTrack(trackLock && !hasPaidAccess ? trackLock.trackKey : 'all');
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

  const handlePrefaceDestination = (dest: PrefaceDestination) => {
    setWorkspaceMode('student');
    if (dest.kind === 'placement') {
      setActiveView('placement');
    } else if (dest.kind === 'courses') {
      setSelectedTrack(trackLock && !hasPaidAccess ? trackLock.trackKey : dest.track);
      setCourseSubMode('courses');
      setActiveView('courses');
    } else if (dest.kind === 'hub') {
      setCourseSubMode('hubs');
      setCourseHubTab(dest.tab);
      setActiveView('courses');
    } else if (dest.kind === 'ai-exam') {
      setAiInitialCurriculum(dest.curriculum);
      setActiveView('ai-exams');
    } else if (dest.kind === 'past-papers') {
      setActiveView('past-papers');
    } else if (dest.kind === 'tutors') {
      if (dest.trainerName) {
        setPreselectedTrainer(dest.trainerName);
      }
      setActiveView('tutors');
    }
    setShowPreface(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <MotionConfig reducedMotion="user">
      <div dir={isRtl ? 'rtl' : 'ltr'}>
        {showPreface ? (
          <PrefaceLanding
            lang={lang}
            user={user}
            onChangeLang={setLang}
            onStudentLogin={() => {
              if (user) {
                setWorkspaceMode('student');
                setActiveView('portal');
                setShowPreface(false);
              } else {
                setWorkspaceMode('student');
                setAuthModalOpen(true);
              }
            }}
            onTeacherLogin={(tid) => {
              if (tid) {
                setPreselectedTeacherPortalId(tid);
              }
              setWorkspaceMode('teacher');
              setShowPreface(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onEnterDemo={() => {
              setWorkspaceMode('student');
              setActiveView('placement');
              setShowPreface(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateDestination={handlePrefaceDestination}
          />
        ) : (
          <div className="min-h-screen flex flex-col bg-[#F6F8FC] text-[#0B1633]">
        <TopNav
          lang={lang}
          activeView={activeView}
          workspaceMode={workspaceMode}
          onNavigate={(view) => {
            setWorkspaceMode('student');
            if (view === 'courses') {
              setCourseSubMode('courses');
            }
            if (view === 'portal' && token) {
              void refreshStudentWorkspace();
            }
            setActiveView(view);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onSelectCourseTrack={(track) => {
            setWorkspaceMode('student');
            setSelectedTrack(trackLock && !hasPaidAccess ? trackLock.trackKey : track);
            setCourseSubMode('courses');
            setActiveView('courses');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenPrepHub={openPrepHub}
          onLaunchAiExam={launchAiExam}
          onSelectTrainer={(trainerName) => {
            setWorkspaceMode('student');
            setPreselectedTrainer(trainerName);
            setActiveView('tutors');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          user={user}
          onOpenAuth={() => setAuthModalOpen(true)}
        />

        {/* Workspace Utility Toolbar: Mode Switcher (Student / Teacher Portal) + Language Switcher */}
        <div className="border-b border-[#DCE3F0] bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Practical Workspace Switcher */}
              <div className="inline-flex items-center gap-1 p-0.5 bg-[#EFF3FA] border border-[#D8E1F0] rounded-xl">
                <button
                  type="button"
                  onClick={() => setWorkspaceMode('student')}
                  className={`relative px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    workspaceMode === 'student'
                      ? 'text-white'
                      : 'text-slate-600 hover:text-[#0B1633]'
                  }`}
                >
                  {workspaceMode === 'student' && (
                    <motion.span
                      layoutId="workspaceModePill"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      className="absolute inset-0 bg-[#1D4ED8] rounded-lg shadow-xs"
                    />
                  )}
                  <GraduationCap className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10">{t.modeStudent}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWorkspaceMode('teacher')}
                  className={`relative px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    workspaceMode === 'teacher'
                      ? 'text-amber-300'
                      : 'text-slate-600 hover:text-[#0B1633]'
                  }`}
                >
                  {workspaceMode === 'teacher' && (
                    <motion.span
                      layoutId="workspaceModePill"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      className="absolute inset-0 bg-[#0B1633] rounded-lg shadow-xs"
                    />
                  )}
                  <Briefcase className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10">{t.modeTeacher}</span>
                </button>
              </div>

              {trackLock && !hasPaidAccess && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[11px] font-semibold text-[#1E3A8A]">
                  <Lock className="w-3 h-3 text-[#1D4ED8]" />
                  <span>
                    {trackLock.gradeLevel.toUpperCase()} · {trackLock.curriculum}
                  </span>
                </span>
              )}

              {hasPaidAccess ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Accès Complet Activé</span>
                </span>
              ) : (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono font-semibold tabular-nums ${
                    trialExpired
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-[#0B1633]'
                  }`}
                >
                  <Clock className="w-3 h-3 text-[#1D4ED8]" />
                  <span>
                    {trialExpired
                      ? 'Essai 30m expiré'
                      : `Essai Démo : ${formatTrialClock(trialSecondsRemaining)}`}
                  </span>
                </span>
              )}
            </div>

            <div className="inline-flex items-center gap-1 p-0.5 bg-[#EFF3FA] border border-[#D8E1F0] rounded-xl">
              <Globe className="w-3.5 h-3.5 text-[#1D4ED8] mx-1.5" />
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
                  className={`relative px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    lang === opt.code
                      ? 'text-[#0B1633]'
                      : 'text-slate-600 hover:text-[#0B1633]'
                  }`}
                >
                  {lang === opt.code && (
                    <motion.span
                      layoutId="appLangPill"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      className="absolute inset-0 bg-white rounded-lg shadow-xs"
                    />
                  )}
                  <span className="relative z-10">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="flex-1">
          {workspaceMode === 'teacher' ? (
            <TeacherPortal
              lang={lang}
              trainers={trainers}
              papers={papers}
              paidCourses={paidCourses}
              initialTeacherId={preselectedTeacherPortalId}
              onLaunchAiExam={launchAiExam}
              onTrainersUpdated={fetchTrainers}
              onPapersUpdated={() => fetchPastPapers(token)}
              onExitTeacherMode={() => setWorkspaceMode('student')}
            />
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
                  <section className="bg-white border-b border-[#DCE3F0]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                        <motion.div
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                          className="lg:col-span-7 flex flex-col justify-center py-2"
                        >
                          <p className="font-mono text-xs font-semibold tracking-tight text-[#1D4ED8] mb-3 flex items-center gap-2">
                            <Compass className="w-4 h-4 shrink-0" />
                            <span>{t.heroKicker}</span>
                          </p>
                          <h1 className="font-display text-[clamp(2.15rem,3.8vw,3.35rem)] font-extrabold text-[#0B1633] leading-[1.08] tracking-tight text-balance mb-5">
                            {t.heroTitle}
                          </h1>
                          <p className="text-[15.5px] text-slate-600 leading-relaxed mb-7 max-w-2xl">
                            {t.heroSubtitle}
                          </p>

                          <div className="flex flex-wrap items-center gap-3">
                            <motion.button
                              type="button"
                              whileHover={{ y: -2, scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                              onClick={scrollToPlacement}
                              className="px-6 py-3 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold rounded-xl shadow-xs transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <span>
                                {lang === 'ar'
                                  ? 'ابدأ باختبار تحديد المستوى'
                                  : lang === 'en'
                                    ? 'Start Placement Test'
                                    : 'Commencer mon Test de Niveau'}
                              </span>
                              <ArrowRight className="w-4 h-4" />
                            </motion.button>

                            <motion.button
                              type="button"
                              whileHover={{ y: -2, scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                              onClick={() => openPrepHub('step')}
                              className="px-4 py-3 border border-[#CBD5E1] hover:border-[#6D28D9] bg-[#F5F3FF] text-[#4C1D95] text-sm font-semibold rounded-xl transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <Layers className="w-4 h-4 text-[#6D28D9]" />
                              <span>STEP · GAT · NAFES · IELTS</span>
                            </motion.button>

                            <motion.button
                              type="button"
                              whileHover={{ y: -2, scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                              onClick={() => setWorkspaceMode('teacher')}
                              className="px-4 py-3 border border-[#FDE68A] hover:border-[#D97706] bg-[#FFFBEB] text-[#0B1633] text-sm font-semibold rounded-xl transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <Briefcase className="w-4 h-4 text-[#D97706]" />
                              <span>{t.modeTeacher}</span>
                            </motion.button>
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                          className="lg:col-span-5"
                        >
                          <div className="h-full min-h-[260px] lg:min-h-[340px] rounded-3xl overflow-hidden border border-[#DCE3F0] shadow-sm bg-slate-100">
                            <img
                              src="/src/assets/images/hero_international_academy_1795527475897.jpg"
                              alt="Campus académique d'une école internationale à Riyad"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </motion.div>
                      </div>

                      {/* 4-Step Color-Coded Academic Pathway Strip with Spring Hover Motion */}
                      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <motion.button
                          type="button"
                          whileHover={{ y: -4, scale: 1.01 }}
                          whileTap={{ scale: 0.985 }}
                          transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                          onClick={scrollToPlacement}
                          className="text-start bg-[#F5F8FF] border border-[#BFDBFE] hover:border-[#1D4ED8] rounded-2xl p-5 transition-colors cursor-pointer group shadow-xs hover:shadow-md"
                        >
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="font-mono text-xs font-bold text-[#1D4ED8]">
                              01. Diagnostic
                            </span>
                            <span className="w-9 h-9 rounded-xl bg-[#1D4ED8] text-white flex items-center justify-center shrink-0">
                              <Compass className="w-4 h-4" />
                            </span>
                          </div>
                          <div className="font-display text-lg font-bold text-[#0B1633] mb-1">
                            {lang === 'ar'
                              ? 'اختبار تحديد المستوى'
                              : lang === 'en'
                                ? 'Grade Placement Test'
                                : 'Test de Niveau par Classe'}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {lang === 'ar'
                              ? 'نقاط القوة والضعف وما ينقصك'
                              : lang === 'en'
                                ? 'Strengths, weaknesses & missing gaps'
                                : 'Forces, faiblesses & lacunes ciblées'}
                          </p>
                        </motion.button>

                        <motion.button
                          type="button"
                          whileHover={{ y: -4, scale: 1.01 }}
                          whileTap={{ scale: 0.985 }}
                          transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                          onClick={() => openPrepHub('standards')}
                          className="text-start bg-[#F8F5FF] border border-[#DDD6FE] hover:border-[#6D28D9] rounded-2xl p-5 transition-colors cursor-pointer group shadow-xs hover:shadow-md"
                        >
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="font-mono text-xs font-bold text-[#6D28D9]">
                              02. Prep Hubs
                            </span>
                            <span className="w-9 h-9 rounded-xl bg-[#6D28D9] text-white flex items-center justify-center shrink-0">
                              <Layers className="w-4 h-4" />
                            </span>
                          </div>
                          <div className="font-display text-lg font-bold text-[#0B1633] mb-1">
                            STEP · GAT · NAFES · IELTS
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Phonics · Skill Builder · Standards · Rédaction
                          </p>
                        </motion.button>

                        <motion.button
                          type="button"
                          whileHover={{ y: -4, scale: 1.01 }}
                          whileTap={{ scale: 0.985 }}
                          transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                          onClick={() => {
                            setCourseSubMode('courses');
                            setActiveView('courses');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="text-start bg-[#F2FBF7] border border-[#A7F3D0] hover:border-[#059669] rounded-2xl p-5 transition-colors cursor-pointer group shadow-xs hover:shadow-md"
                        >
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="font-mono text-xs font-bold text-[#059669]">
                              03. Cours &amp; IA
                            </span>
                            <span className="w-9 h-9 rounded-xl bg-[#059669] text-white flex items-center justify-center shrink-0">
                              <Cpu className="w-4 h-4" />
                            </span>
                          </div>
                          <div className="font-display text-lg font-bold text-[#0B1633] mb-1">
                            {lang === 'ar'
                              ? 'دروس مخصصة ومدفوعة + Gemini'
                              : lang === 'en'
                                ? 'Courses, Paid Tracks & Gemini'
                                : 'Cours Ciblés, Payants & IA'}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            SAT · IB · IGCSE · NAFES · Qudurat · Bac FR
                          </p>
                        </motion.button>

                        <motion.button
                          type="button"
                          whileHover={{ y: -4, scale: 1.01 }}
                          whileTap={{ scale: 0.985 }}
                          transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                          onClick={() => {
                            setActiveView('past-papers');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="text-start bg-[#FFFBEB] border border-[#FDE68A] hover:border-[#D97706] rounded-2xl p-5 transition-colors cursor-pointer group shadow-xs hover:shadow-md"
                        >
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="font-mono text-xs font-bold text-[#B45309]">
                              04. Annales &amp; Coachs
                            </span>
                            <span className="w-9 h-9 rounded-xl bg-[#D97706] text-white flex items-center justify-center shrink-0">
                              <Award className="w-4 h-4" />
                            </span>
                          </div>
                          <div className="font-display text-lg font-bold text-[#0B1633] mb-1">
                            {t.benchmarkVault}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Marwan Mhamdi (EN) · Mohamed Cherif (FR/AR)
                          </p>
                        </motion.button>
                      </div>
                    </div>
                  </section>

                  {/* Placement Test Interactive Workspace */}
                  <PlacementTestView
                    lang={lang}
                    token={token}
                    user={user}
                    grades={grades}
                    paidCourses={paidCourses}
                    latestResult={latestPlacement}
                    trackLock={trackLock}
                    hasPaidAccess={hasPaidAccess}
                    onTrackLocked={(lock) => {
                      setTrackLock(lock);
                      setSelectedTrack(lock.trackKey);
                      if (!trialStartMs) {
                        setTrialStartMs(Date.now());
                      }
                    }}
                    onUserUpdated={(updated) => {
                      setUser(updated);
                      syncUserTrackAndTrial(updated);
                    }}
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

                  {/* Bottom Academic Leadership Showcase (Live Teacher Profiles, Photos & Skills) */}
                  <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                    <div className="bg-[#081229] text-white rounded-3xl p-8 sm:p-10 space-y-6 shadow-md border border-white/10">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                          <div className="font-mono text-xs font-semibold text-amber-300 mb-2">
                            {lang === 'ar'
                              ? 'إشراف تربوي ثنائي المسار · بوابة المعلم والطالب'
                              : lang === 'en'
                                ? 'Bilingual Academic Leadership · Student & Teacher Portals'
                                : 'Direction Pédagogique Trilingue · Suivi Formateur & Élève'}
                          </div>
                          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-balance">
                            {lang === 'ar'
                              ? 'مروان المحمدي (المسار الإنجليزي) ومحمد شريف (الفرنسي والعربي، نافس والقدرات)'
                              : lang === 'en'
                                ? 'Marwan Mhamdi (English Tracks) & Mohamed Cherif (French, Arabic, NAFES & Qudurat)'
                                : 'Marwan Mhamdi (cursus anglais) & Mohamed Cherif (français, arabe, NAFES & Qudurat)'}
                          </h2>
                        </div>

                        <div className="flex flex-wrap gap-3 shrink-0">
                          <button
                            type="button"
                            onClick={() => setWorkspaceMode('teacher')}
                            className="px-5 py-3 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                          >
                            {t.modeTeacher}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveView('tutors');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="px-5 py-3 bg-white text-[#081229] hover:bg-slate-100 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                          >
                            {t.bookTrainerBtn}
                          </button>
                        </div>
                      </div>

                      {trainers.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          {trainers.map((tr) => {
                            const isMarwan = tr.id === 'marwan';
                            return (
                              <div
                                key={tr.id}
                                className={`p-5 rounded-2xl border flex items-start gap-4 ${
                                  isMarwan
                                    ? 'bg-[#10214B] border-[#26448A]'
                                    : 'bg-[#161B38] border-[#4A3B1B]'
                                }`}
                              >
                                <div
                                  className={`w-16 h-16 rounded-2xl overflow-hidden border-2 shrink-0 bg-slate-800 ${
                                    isMarwan ? 'border-[#60A5FA]' : 'border-[#FBBF24]'
                                  }`}
                                >
                                  <img
                                    src={
                                      tr.photoUrl ||
                                      (isMarwan
                                        ? '/src/assets/images/trainer_marwan_mhamdi_1795527476961.jpg'
                                        : '/src/assets/images/trainer_mohamed_cherif_1795527477326.jpg')
                                    }
                                    alt={tr.name}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0 space-y-1.5">
                                  <div>
                                    <div className="font-display text-lg font-bold text-white">
                                      {tr.name}
                                    </div>
                                    <div
                                      className={`text-xs font-medium ${
                                        isMarwan ? 'text-sky-300' : 'text-amber-300'
                                      }`}
                                    >
                                      {tr.roleTitle}
                                    </div>
                                  </div>
                                  {tr.experiences?.[0] && (
                                    <div className="text-xs text-slate-200 flex items-center gap-1.5">
                                      <CheckCircle2
                                        className={`w-3.5 h-3.5 shrink-0 ${
                                          isMarwan ? 'text-sky-400' : 'text-emerald-400'
                                        }`}
                                      />
                                      <span className="truncate">{tr.experiences[0]}</span>
                                    </div>
                                  )}
                                  {tr.skills && tr.skills.length > 0 && (
                                    <p className="text-[11px] text-slate-300 truncate">
                                      {tr.skills.slice(0, 3).join(' · ')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
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
                    trackLock={trackLock}
                    trialSecondsRemaining={trialSecondsRemaining}
                    trialExpired={trialExpired}
                    hasPaidAccess={hasPaidAccess}
                    onRequireAuth={() => setAuthModalOpen(true)}
                    onUserUpdated={(updated) => {
                      setUser(updated);
                      syncUserTrackAndTrial(updated);
                    }}
                    onRefreshPaidCourses={() => fetchPaidCourses(token)}
                    onMarkLessonComplete={handleMarkLessonComplete}
                    onNavigateToTutors={(trainerName) => {
                      setPreselectedTrainer(trainerName);
                      setActiveView('tutors');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onLaunchAiExam={launchAiExam}
                    onJoiningRequestCreated={(req) =>
                      setJoiningRequests((prev) => [req, ...prev.filter((r) => r.id !== req.id)])
                    }
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
                    trackLock={trackLock}
                    hasPaidAccess={hasPaidAccess}
                    trialExpired={trialExpired}
                    onUpgradePrompt={() => {
                      setCourseSubMode('courses');
                      setActiveView('courses');
                      setTimeout(() => {
                        document.getElementById('paid-courses-section')?.scrollIntoView({ behavior: 'smooth' });
                      }, 120);
                    }}
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
                    onUserUpdated={(updated) => {
                      setUser(updated);
                      syncUserTrackAndTrial(updated);
                    }}
                    onRefreshPapers={() => fetchPastPapers(token)}
                    onJoiningRequestCreated={(req) =>
                      setJoiningRequests((prev) => [req, ...prev.filter((r) => r.id !== req.id)])
                    }
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
                    latestPlacement={latestPlacement}
                    trackLock={trackLock}
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
                    trackLock={trackLock}
                    progress={progress}
                    papers={papers}
                    paidCourses={paidCourses}
                    latestPlacement={latestPlacement}
                    bookings={bookings}
                    joiningRequests={joiningRequests}
                    savedExams={savedExams}
                    onOpenAuth={() => setAuthModalOpen(true)}
                    onSignOut={handleSignOut}
                    onRefreshPortal={refreshStudentWorkspace}
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
        <footer className="border-t border-[#DCE3F0] bg-white mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-2.5">
              <AcademyCrestIcon className="w-6 h-6 shrink-0" />
              <span className="font-display font-extrabold text-[#0B1633]">{t.brand}</span>
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
              <button
                type="button"
                onClick={() => {
                  setShowPreface(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="hover:text-[#0F2537] cursor-pointer"
              >
                {lang === 'ar' ? 'الواجهة الرئيسية' : lang === 'en' ? 'Preface' : 'Préface'}
              </button>
            </div>
          </div>
        </footer>
          </div>
        )}

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
