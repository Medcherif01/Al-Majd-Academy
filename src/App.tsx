import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Globe } from 'lucide-react';
import { AiExamStudio } from './components/AiExamStudio';
import { AuthModal } from './components/AuthModal';
import { CourseWorkspace } from './components/CourseWorkspace';
import { PastPapersVault } from './components/PastPapersVault';
import { StudentPortal } from './components/StudentPortal';
import { TopNav } from './components/TopNav';
import { TutoringSection } from './components/TutoringSection';
import { TRANSLATIONS } from './i18n/translations';
import type {
  ActiveView,
  BookingItem,
  CurriculumKey,
  GeneratedExam,
  PastPaperSummary,
  ProgressState,
  TrainerProfile,
  UiLanguage,
  UserProfile,
} from './types/academy';
import { apiRequest } from './utils/api';

export default function App() {
  const [lang, setLang] = useState<UiLanguage>('fr');
  const [activeView, setActiveView] = useState<ActiveView>('courses');
  const [selectedTrack, setSelectedTrack] = useState<CurriculumKey>('all');

  // Auth held strictly in React state memory
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Domain Data from Server
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

  const fetchUserWorkspaceData = useCallback(async (activeToken: string) => {
    try {
      const [bookingsRes, examsRes, progressRes] = await Promise.all([
        apiRequest<{ bookings: BookingItem[] }>('/api/bookings', { token: activeToken }),
        apiRequest<{ exams: GeneratedExam[] }>('/api/exams/history', { token: activeToken }),
        apiRequest<{ progress: ProgressState }>('/api/progress', { token: activeToken }),
      ]);
      setBookings(bookingsRes.bookings);
      setSavedExams(examsRes.exams);
      setProgress(progressRes.progress);
    } catch (err) {
      console.error('Failed to load user portal data:', err);
    }
  }, []);

  useEffect(() => {
    apiRequest<{ trainers: TrainerProfile[] }>('/api/trainers')
      .then((res) => setTrainers(res.trainers))
      .catch((err) => console.error('Failed to load trainers:', err));
    fetchPastPapers(null);
  }, [fetchPastPapers]);

  const handleAuthSuccess = async (newToken: string, loggedInUser: UserProfile) => {
    setToken(newToken);
    setUser(loggedInUser);
    await Promise.all([fetchPastPapers(newToken), fetchUserWorkspaceData(newToken)]);
  };

  const handleSignOut = () => {
    setToken(null);
    setUser(null);
    setBookings([]);
    setSavedExams([]);
    setProgress({ completedLessonIds: [], quizScores: {} });
    fetchPastPapers(null);
  };

  const handleMarkLessonComplete = async (lessonId: string, quizScore?: number) => {
    // Optimistically update local progress and persist if signed in
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

  const scrollToCourses = () => {
    setActiveView('courses');
    setTimeout(() => {
      document.getElementById('courses-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col bg-[#FAF9F6] text-slate-900">
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
      <div className="border-b border-slate-200/80 bg-white/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-slate-600">
            <span>
              {lang === 'ar'
                ? 'الرياض · جدة · الخبر · مدارس المملكة العالمية والوطنية'
                : lang === 'en'
                  ? 'Riyadh · Jeddah · Al-Khobar · KSA International & National Schools'
                  : 'Riyad · Djeddah · Al-Khobar · Écoles Internationales d’Arabie Saoudite'}
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
                  lang === opt.code ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1">
        {activeView === 'courses' && (
          <>
            {/* Editorial 2-Column Hero */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-6 flex flex-col justify-center py-4 lg:py-8">
                  <p className="text-xs font-semibold tracking-wide text-emerald-800 mb-3">
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
                      onClick={scrollToCourses}
                      className="px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>{t.heroPrimaryCta}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveView('ai-exams')}
                      className="px-5 py-3 border border-slate-300 hover:border-slate-900 bg-white text-slate-900 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {t.heroSecondaryCta}
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <div className="h-full min-h-[300px] lg:min-h-[420px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    <img
                      src="/src/assets/images/hero_international_academy_1795527475897.jpg"
                      alt="Bibliothèque moderne d'une école internationale à Riyad"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* 4-Column Academic Benchmark Strip */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={scrollToCourses}
                  className="text-start bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-5 transition-colors cursor-pointer"
                >
                  <div className="font-mono text-xs font-semibold text-emerald-800 mb-1">01</div>
                  <div className="font-display text-lg font-semibold text-slate-900 mb-1">
                    {t.benchmarkTracks}
                  </div>
                  <p className="text-xs text-slate-600">
                    SAT / AP · IB DP · IGCSE · Nafes · Qudurat · Bac FR
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView('tutors')}
                  className="text-start bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-5 transition-colors cursor-pointer"
                >
                  <div className="font-mono text-xs font-semibold text-emerald-800 mb-1">02</div>
                  <div className="font-display text-lg font-semibold text-slate-900 mb-1">
                    {t.benchmarkTutors}
                  </div>
                  <p className="text-xs text-slate-600">
                    Marwan Mhamdi (EN) · Mohamed Cherif (FR / AR)
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView('ai-exams')}
                  className="text-start bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-5 transition-colors cursor-pointer"
                >
                  <div className="font-mono text-xs font-semibold text-emerald-800 mb-1">03</div>
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
                  onClick={() => setActiveView('past-papers')}
                  className="text-start bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-5 transition-colors cursor-pointer"
                >
                  <div className="font-mono text-xs font-semibold text-emerald-800 mb-1">04</div>
                  <div className="font-display text-lg font-semibold text-slate-900 mb-1">
                    {t.benchmarkVault}
                  </div>
                  <p className="text-xs text-slate-600">
                    {lang === 'ar'
                      ? 'تحميل الاختبارات الكاملة والحلول الرسمية'
                      : lang === 'en'
                        ? 'Download full papers & official mark schemes'
                        : 'Téléchargement sujets & corrigés officiels'}
                  </p>
                </button>
              </div>
            </section>

            {/* Courses & Rules Library */}
            <CourseWorkspace
              lang={lang}
              selectedTrack={selectedTrack}
              onSelectTrack={setSelectedTrack}
              progress={progress}
              onMarkLessonComplete={handleMarkLessonComplete}
              onNavigateToTutors={(trainerName) => {
                setPreselectedTrainer(trainerName);
                setActiveView('tutors');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            {/* Adjacent Claim-to-Proof Trust Strip for Parents & Students */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
              <div className="bg-slate-900 text-white rounded-xl p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                <div className="lg:col-span-2">
                  <div className="text-xs font-semibold text-emerald-300 mb-2">
                    {lang === 'ar'
                      ? 'معايير أكاديمية موثوقة لأولياء الأمور والطلبة'
                      : lang === 'en'
                        ? 'Built for KSA International School Families'
                        : 'Conçu pour les Élèves et Parents en Arabie Saoudite'}
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-3 text-balance">
                    {lang === 'ar'
                      ? 'دمج المناهج الدولية مع الاختبارات الوطنية السعودية في منصة واحدة'
                      : lang === 'en'
                        ? 'Combine official Past Papers, Gemini AI practice, and live bilingual tutoring'
                        : 'Associez cours officiels, annales corrigées et accompagnement par nos deux formateurs'}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-300 mt-4">
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
                      setActiveView('past-papers');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-5 py-3 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    {t.navPastPapers}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('tutors');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    {t.bookTrainerBtn}
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {activeView === 'ai-exams' && (
          <AiExamStudio
            lang={lang}
            token={token}
            initialExam={reopenExam}
            onExamSaved={(exam) => {
              setSavedExams((prev) => [exam, ...prev]);
            }}
          />
        )}

        {activeView === 'past-papers' && (
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
        )}

        {activeView === 'tutors' && (
          <TutoringSection
            lang={lang}
            trainers={trainers}
            preselectedTrainerName={preselectedTrainer}
            user={user}
            token={token}
            onRequireAuth={() => setAuthModalOpen(true)}
            onBookingCreated={(booking) => setBookings((prev) => [booking, ...prev])}
          />
        )}

        {activeView === 'portal' && (
          <StudentPortal
            lang={lang}
            user={user}
            token={token}
            progress={progress}
            papers={papers}
            bookings={bookings}
            savedExams={savedExams}
            onOpenAuth={() => setAuthModalOpen(true)}
            onSignOut={handleSignOut}
            onReopenAiExam={(ex) => {
              setReopenExam(ex);
              setActiveView('ai-exams');
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
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-800" />
            <span className="font-display font-semibold text-slate-900">{t.brand}</span>
            <span className="text-slate-300">·</span>
            <span>American · IB · IGCSE · Nafes · Qudurat · Bac Français</span>
          </div>
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => setActiveView('courses')} className="hover:text-slate-900 cursor-pointer">
              {t.navCourses}
            </button>
            <button type="button" onClick={() => setActiveView('ai-exams')} className="hover:text-slate-900 cursor-pointer">
              {t.navAiExams}
            </button>
            <button type="button" onClick={() => setActiveView('past-papers')} className="hover:text-slate-900 cursor-pointer">
              {t.navPastPapers}
            </button>
            <button type="button" onClick={() => setActiveView('tutors')} className="hover:text-slate-900 cursor-pointer">
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
  );
}
