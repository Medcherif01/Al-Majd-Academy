import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookMarked,
  ChevronUp,
  Compass,
  Cpu,
  Globe,
  KeyRound,
  ScrollText,
  UserCheck,
  Video,
} from 'lucide-react';
import type { CurriculumKey, PrepHubTab, UiLanguage, UserProfile } from '../types/academy';
import {
  AcademyCrestIcon,
  StudentPortalEmblem,
  TeacherPortalEmblem,
} from './BrandIcons';

export type PrefaceDestination =
  | { kind: 'placement' }
  | { kind: 'courses'; track: CurriculumKey }
  | { kind: 'hub'; tab: PrepHubTab }
  | { kind: 'ai-exam'; curriculum: string }
  | { kind: 'past-papers' }
  | { kind: 'tutors'; trainerName?: string };

interface PrefaceLandingProps {
  lang: UiLanguage;
  user: UserProfile | null;
  onChangeLang: (lang: UiLanguage) => void;
  onStudentLogin: () => void;
  onTeacherLogin: (preselectedTeacherId?: 'marwan' | 'mohamed') => void;
  onEnterDemo: () => void;
  onNavigateDestination: (dest: PrefaceDestination) => void;
}

type DockId = 'courses' | 'ai-exams' | 'past-papers' | 'tutors';

const COPY: Record<
  UiLanguage,
  {
    brand: string;
    trackLine: string;
    kicker: string;
    heading: string;
    subtitle: string;
    studentTitle: string;
    studentSignedInTitle: string;
    studentDesc: string;
    teacherTitle: string;
    teacherDesc: string;
    enterDemo: string;
    studentSubs: { label: string; action: 'login' | 'demo' }[];
    teacherSubs: { label: string; teacherId: 'marwan' | 'mohamed' }[];
    dock: {
      id: DockId;
      num: string;
      title: string;
      sub: string;
      tone: 'cobalt' | 'violet' | 'gold' | 'emerald';
      items: { label: string; dest: PrefaceDestination }[];
    }[];
  }
> = {
  fr: {
    brand: 'Al-Majd Academy',
    trackLine: 'SAT · IB · IGCSE · NAFES · Qudurat · Bac Français',
    kicker: 'Portail Académique KSA · FR / EN / AR',
    heading: 'Choisissez votre accès',
    subtitle: 'Connectez-vous ou survolez un module ci-dessous pour afficher les parcours.',
    studentTitle: 'Connexion Élève',
    studentSignedInTitle: 'Ouvrir mon Espace Élève',
    studentDesc: 'Cours, Examens IA, Past Papers & Meet',
    teacherTitle: 'Connexion Formateur',
    teacherDesc: 'Portail privé Marwan & Mohamed',
    enterDemo: 'Test de Niveau (Essai 30 min)',
    studentSubs: [
      { label: 'Se connecter / Créer un compte', action: 'login' },
      { label: 'Explorer le Test de Niveau', action: 'demo' },
    ],
    teacherSubs: [
      { label: 'Mr. Marwan Mhamdi (EN)', teacherId: 'marwan' },
      { label: 'M. Mohamed Cherif (FR / AR)', teacherId: 'mohamed' },
    ],
    dock: [
      {
        id: 'courses',
        num: '01',
        title: 'Courses',
        sub: '6 cursus + Prep Hubs',
        tone: 'cobalt',
        items: [
          { label: 'Tous les cours', dest: { kind: 'courses', track: 'all' } },
          { label: 'American (SAT / AP)', dest: { kind: 'courses', track: 'american' } },
          { label: 'IB Diploma', dest: { kind: 'courses', track: 'ib' } },
          { label: 'IGCSE & A-Level', dest: { kind: 'courses', track: 'british' } },
          { label: 'NAFES (ETEC)', dest: { kind: 'courses', track: 'nafes' } },
          { label: 'Qudurat & Tahsili', dest: { kind: 'courses', track: 'qiyas' } },
          { label: 'Bac Français (AEFE)', dest: { kind: 'courses', track: 'french' } },
          { label: 'Prep Hubs (STEP · GAT · IELTS)', dest: { kind: 'hub', tab: 'step' } },
        ],
      },
      {
        id: 'ai-exams',
        num: '02',
        title: 'AI Exams',
        sub: 'Générateur Gemini',
        tone: 'violet',
        items: [
          { label: 'Digital SAT / AP', dest: { kind: 'ai-exam', curriculum: 'American SAT' } },
          { label: 'IB Diploma', dest: { kind: 'ai-exam', curriculum: 'IB Diploma' } },
          { label: 'IGCSE & A-Level', dest: { kind: 'ai-exam', curriculum: 'Cambridge IGCSE' } },
          { label: 'NAFES & Qudurat', dest: { kind: 'ai-exam', curriculum: 'Qudurat & Tahsili' } },
          { label: 'Bac Français', dest: { kind: 'ai-exam', curriculum: 'Bac Français' } },
        ],
      },
      {
        id: 'past-papers',
        num: '03',
        title: 'Past Papers',
        sub: 'Sujets & corrigés',
        tone: 'gold',
        items: [
          { label: 'Coffre Past Papers complet', dest: { kind: 'past-papers' } },
          { label: 'Aperçu Q1 & Règlements', dest: { kind: 'past-papers' } },
          { label: 'Activation WhatsApp directe', dest: { kind: 'past-papers' } },
        ],
      },
      {
        id: 'tutors',
        num: '04',
        title: 'Formateurs',
        sub: 'Live Google Meet',
        tone: 'emerald',
        items: [
          { label: 'Mr. Marwan Mhamdi (EN)', dest: { kind: 'tutors', trainerName: 'Marwan Mhamdi' } },
          { label: 'M. Mohamed Cherif (FR / AR)', dest: { kind: 'tutors', trainerName: 'Mohamed Cherif' } },
          { label: 'Réserver une séance live', dest: { kind: 'tutors' } },
        ],
      },
    ],
  },
  en: {
    brand: 'Al-Majd Academy',
    trackLine: 'SAT · IB · IGCSE · NAFES · Qudurat · French Bac',
    kicker: 'KSA Academic Portal · FR / EN / AR',
    heading: 'Choose Your Portal',
    subtitle: 'Sign in above or hover any module below to slide out direct track shortcuts.',
    studentTitle: 'Student Login',
    studentSignedInTitle: 'Open Student Portal',
    studentDesc: 'Courses, AI Exams, Past Papers & Meet',
    teacherTitle: 'Teacher Login',
    teacherDesc: 'Private Marwan & Mohamed Portal',
    enterDemo: 'Placement Test (30 min Demo)',
    studentSubs: [
      { label: 'Sign In / Create Account', action: 'login' },
      { label: 'Try Placement Test Demo', action: 'demo' },
    ],
    teacherSubs: [
      { label: 'Mr. Marwan Mhamdi (EN)', teacherId: 'marwan' },
      { label: 'M. Mohamed Cherif (FR / AR)', teacherId: 'mohamed' },
    ],
    dock: [
      {
        id: 'courses',
        num: '01',
        title: 'Courses',
        sub: '6 tracks + Prep Hubs',
        tone: 'cobalt',
        items: [
          { label: 'All Courses', dest: { kind: 'courses', track: 'all' } },
          { label: 'American (SAT / AP)', dest: { kind: 'courses', track: 'american' } },
          { label: 'IB Diploma', dest: { kind: 'courses', track: 'ib' } },
          { label: 'IGCSE & A-Level', dest: { kind: 'courses', track: 'british' } },
          { label: 'NAFES (ETEC)', dest: { kind: 'courses', track: 'nafes' } },
          { label: 'Qudurat & Tahsili', dest: { kind: 'courses', track: 'qiyas' } },
          { label: 'French Bac (AEFE)', dest: { kind: 'courses', track: 'french' } },
          { label: 'Prep Hubs (STEP · GAT · IELTS)', dest: { kind: 'hub', tab: 'step' } },
        ],
      },
      {
        id: 'ai-exams',
        num: '02',
        title: 'AI Exams',
        sub: 'Gemini Generator',
        tone: 'violet',
        items: [
          { label: 'Digital SAT / AP', dest: { kind: 'ai-exam', curriculum: 'American SAT' } },
          { label: 'IB Diploma', dest: { kind: 'ai-exam', curriculum: 'IB Diploma' } },
          { label: 'IGCSE & A-Level', dest: { kind: 'ai-exam', curriculum: 'Cambridge IGCSE' } },
          { label: 'NAFES & Qudurat', dest: { kind: 'ai-exam', curriculum: 'Qudurat & Tahsili' } },
          { label: 'French Bac', dest: { kind: 'ai-exam', curriculum: 'Bac Français' } },
        ],
      },
      {
        id: 'past-papers',
        num: '03',
        title: 'Past Papers',
        sub: 'Mark Schemes',
        tone: 'gold',
        items: [
          { label: 'Full Past Papers Vault', dest: { kind: 'past-papers' } },
          { label: 'Free Q1 Preview', dest: { kind: 'past-papers' } },
          { label: 'WhatsApp Activation', dest: { kind: 'past-papers' } },
        ],
      },
      {
        id: 'tutors',
        num: '04',
        title: 'Tutors',
        sub: 'Live Google Meet',
        tone: 'emerald',
        items: [
          { label: 'Mr. Marwan Mhamdi (EN)', dest: { kind: 'tutors', trainerName: 'Marwan Mhamdi' } },
          { label: 'M. Mohamed Cherif (FR / AR)', dest: { kind: 'tutors', trainerName: 'Mohamed Cherif' } },
          { label: 'Book Live Session', dest: { kind: 'tutors' } },
        ],
      },
    ],
  },
  ar: {
    brand: 'أكاديمية المجد',
    trackLine: 'SAT · IB · IGCSE · نافس · قدرات · البكالوريا الفرنسية',
    kicker: 'البوابة الأكاديمية السعودية · عربي / فرنسي / إنجليزي',
    heading: 'اختر بوابة الدخول',
    subtitle: 'سجّل الدخول أو مرّر المؤشر على أي قسم بالأسفل لعرض المسارات الفرعية.',
    studentTitle: 'تسجيل دخول الطالب',
    studentSignedInTitle: 'فتح بوابة الطالب',
    studentDesc: 'الدروس، اختبارات الذكاء، الأوراق السابقة و Meet',
    teacherTitle: 'تسجيل دخول المعلم',
    teacherDesc: 'البوابة الخاصة بمروان ومحمد',
    enterDemo: 'اختبار تحديد المستوى (٣٠ دقيقة)',
    studentSubs: [
      { label: 'دخول / إنشاء حساب طالب', action: 'login' },
      { label: 'تجربة اختبار المستوى', action: 'demo' },
    ],
    teacherSubs: [
      { label: 'أ. مروان المحمدي (EN)', teacherId: 'marwan' },
      { label: 'أ. محمد شريف (FR / AR)', teacherId: 'mohamed' },
    ],
    dock: [
      {
        id: 'courses',
        num: '01',
        title: 'Courses · الدروس',
        sub: '٦ مسارات تعليمية',
        tone: 'cobalt',
        items: [
          { label: 'كل الدروس', dest: { kind: 'courses', track: 'all' } },
          { label: 'المسار الأمريكي SAT / AP', dest: { kind: 'courses', track: 'american' } },
          { label: 'البكالوريا الدولية IB', dest: { kind: 'courses', track: 'ib' } },
          { label: 'البريطاني IGCSE', dest: { kind: 'courses', track: 'british' } },
          { label: 'اختبارات نافس NAFES', dest: { kind: 'courses', track: 'nafes' } },
          { label: 'القدرات والتحصيلي', dest: { kind: 'courses', track: 'qiyas' } },
          { label: 'البكالوريا الفرنسية', dest: { kind: 'courses', track: 'french' } },
          { label: 'مراكز التدريب STEP · GAT · IELTS', dest: { kind: 'hub', tab: 'step' } },
        ],
      },
      {
        id: 'ai-exams',
        num: '02',
        title: 'AI Exams · اختبارات AI',
        sub: 'توليد Gemini الرسمي',
        tone: 'violet',
        items: [
          { label: 'Digital SAT / AP', dest: { kind: 'ai-exam', curriculum: 'American SAT' } },
          { label: 'IB Diploma', dest: { kind: 'ai-exam', curriculum: 'IB Diploma' } },
          { label: 'IGCSE & A-Level', dest: { kind: 'ai-exam', curriculum: 'Cambridge IGCSE' } },
          { label: 'نافس والقدرات', dest: { kind: 'ai-exam', curriculum: 'Qudurat & Tahsili' } },
          { label: 'البكالوريا الفرنسية', dest: { kind: 'ai-exam', curriculum: 'Bac Français' } },
        ],
      },
      {
        id: 'past-papers',
        num: '03',
        title: 'Past Papers · الأوراق',
        sub: 'مع نماذج الإجابة',
        tone: 'gold',
        items: [
          { label: 'خزنة الأوراق السابقة', dest: { kind: 'past-papers' } },
          { label: 'معاينة السؤال الأول مجاناً', dest: { kind: 'past-papers' } },
          { label: 'التفعيل عبر واتساب المعلم', dest: { kind: 'past-papers' } },
        ],
      },
      {
        id: 'tutors',
        num: '04',
        title: 'المعلمون',
        sub: 'حصص Google Meet',
        tone: 'emerald',
        items: [
          { label: 'أ. مروان المحمدي (EN)', dest: { kind: 'tutors', trainerName: 'Marwan Mhamdi' } },
          { label: 'أ. محمد شريف (FR / AR)', dest: { kind: 'tutors', trainerName: 'Mohamed Cherif' } },
          { label: 'حجز حصة مباشرة', dest: { kind: 'tutors' } },
        ],
      },
    ],
  },
};

const DOCK_THEMES = {
  cobalt: {
    pill: 'bg-[#0B1C47]/88 border-[#3B82F6]/45 hover:border-[#60A5FA]',
    iconWrap: 'bg-[#1D4ED8] text-white',
    numText: 'text-sky-300',
    subBtnHover: 'hover:bg-[#1D4ED8] hover:text-white hover:border-[#60A5FA]',
    Icon: BookMarked,
  },
  violet: {
    pill: 'bg-[#1A133F]/88 border-[#8B5CF6]/45 hover:border-[#A78BFA]',
    iconWrap: 'bg-[#6D28D9] text-white',
    numText: 'text-violet-300',
    subBtnHover: 'hover:bg-[#6D28D9] hover:text-white hover:border-[#A78BFA]',
    Icon: Cpu,
  },
  gold: {
    pill: 'bg-[#221A10]/88 border-[#F59E0B]/45 hover:border-[#FBBF24]',
    iconWrap: 'bg-[#D97706] text-white',
    numText: 'text-amber-300',
    subBtnHover: 'hover:bg-[#D97706] hover:text-white hover:border-[#FBBF24]',
    Icon: ScrollText,
  },
  emerald: {
    pill: 'bg-[#092425]/88 border-[#10B981]/45 hover:border-[#34D399]',
    iconWrap: 'bg-[#059669] text-white',
    numText: 'text-emerald-300',
    subBtnHover: 'hover:bg-[#059669] hover:text-white hover:border-[#34D399]',
    Icon: Video,
  },
};

export function PrefaceLanding({
  lang,
  user,
  onChangeLang,
  onStudentLogin,
  onTeacherLogin,
  onEnterDemo,
  onNavigateDestination,
}: PrefaceLandingProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [hoveredDock, setHoveredDock] = useState<DockId | null>(null);
  const [hoveredLoginCard, setHoveredLoginCard] = useState<'student' | 'teacher' | null>(null);
  const t = COPY[lang];
  const isRtl = lang === 'ar';
  const DirectionalArrow = isRtl ? ArrowLeft : ArrowRight;

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="relative min-h-screen w-full overflow-x-hidden flex flex-col justify-between bg-[#071330] text-white"
    >
      {/* Full-Bleed Landscape Background Photo */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {imageFailed ? (
          <div className="w-full h-full bg-[#081534]" />
        ) : (
          <motion.img
            initial={{ scale: 1.04, opacity: 0.85 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            src="/assets/aistudio/image_c25ca50d.png"
            alt="DaTeacher — Learn. Practice. Succeed."
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="w-full h-full object-cover object-center"
          />
        )}
        {/* Peripheral Gradient Scrims: keep center artwork luminous while guaranteeing high UI contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#061028]/75 via-[#061028]/10 to-[#061028]/88" />
        <div
          className={`absolute inset-0 ${
            isRtl
              ? 'bg-gradient-to-r from-[#061028]/80 via-[#061028]/25 to-transparent'
              : 'bg-gradient-to-l from-[#061028]/80 via-[#061028]/25 to-transparent'
          }`}
        />
      </div>

      {/* Top Glass Header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-30 border-b border-white/15 bg-[#061028]/60 backdrop-blur-md"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          <div className="inline-flex items-center gap-3 font-display text-xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0">
            <AcademyCrestIcon className="w-8 h-8 shrink-0" />
            <span>{t.brand}</span>
          </div>

          <p className="hidden lg:block text-xs font-medium text-slate-200 tracking-wide whitespace-nowrap">
            {t.trackLine}
          </p>

          <div className="inline-flex items-center gap-1 p-1 bg-white/10 border border-white/20 rounded-xl shrink-0">
            <Globe className="w-3.5 h-3.5 text-amber-300 mx-1.5" aria-hidden="true" />
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
                onClick={() => onChangeLang(opt.code)}
                className={`relative px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  lang === opt.code ? 'text-[#081229]' : 'text-slate-100 hover:text-white'
                }`}
              >
                {lang === opt.code && (
                  <motion.span
                    layoutId="prefaceLangPill"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    className="absolute inset-0 bg-white rounded-lg shadow-xs"
                  />
                )}
                <span className="relative z-10">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.header>

      {/* Center Stage: Open Landscape View of Photo + Right-Aligned Frosted Portal Sign-In Card */}
      <main className="relative z-20 flex-1 flex items-center">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row items-center lg:items-center justify-end gap-8">
          <motion.aside
            initial={{ opacity: 0, x: isRtl ? -24 : 24, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[430px] bg-[#081534]/82 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black/50 space-y-5"
          >
            <div className="space-y-1.5">
              <p className="font-mono text-[11px] font-semibold text-amber-300 tracking-tight">
                {t.kicker}
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight text-balance">
                {t.heading}
              </h1>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">{t.subtitle}</p>
            </div>

            {/* Dual Login Icon Cards with Sliding Sub-Buttons on Hover */}
            <div className="space-y-3">
              {/* 1. Student Login Icon Card */}
              <div
                onMouseEnter={() => setHoveredLoginCard('student')}
                onMouseLeave={() => setHoveredLoginCard(null)}
                className="rounded-2xl border border-[#60A5FA]/45 bg-[#0E2459]/85 hover:border-[#60A5FA] transition-colors overflow-hidden"
              >
                <motion.button
                  type="button"
                  whileHover={{ x: isRtl ? -3 : 3 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ duration: 0.18 }}
                  onClick={onStudentLogin}
                  aria-label={user ? t.studentSignedInTitle : t.studentTitle}
                  className="w-full min-h-[78px] p-3.5 flex items-center gap-3.5 text-start cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  <StudentPortalEmblem className="w-13 h-13 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-base sm:text-lg font-bold text-white truncate">
                        {user ? t.studentSignedInTitle : t.studentTitle}
                      </span>
                      <span className="w-8 h-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                        <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                      </span>
                    </div>
                    <p className="text-xs text-sky-100/90 mt-0.5 truncate">{t.studentDesc}</p>
                  </div>
                </motion.button>

                <AnimatePresence>
                  {hoveredLoginCard === 'student' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -6 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -6 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="border-t border-white/15 bg-[#08173B]/90 px-3.5 py-2.5 flex flex-wrap gap-2"
                    >
                      {t.studentSubs.map((sub, i) => (
                        <motion.button
                          key={sub.label}
                          type="button"
                          initial={{ opacity: 0, x: isRtl ? 10 : -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.18, delay: i * 0.05 }}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => (sub.action === 'login' ? onStudentLogin() : onEnterDemo())}
                          className="px-3 py-1.5 rounded-lg bg-[#1D4ED8]/80 hover:bg-[#2563EB] border border-sky-300/30 text-[11px] font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <UserCheck className="w-3 h-3 text-sky-200" aria-hidden="true" />
                          <span>{sub.label}</span>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 2. Teacher Login Icon Card */}
              <div
                onMouseEnter={() => setHoveredLoginCard('teacher')}
                onMouseLeave={() => setHoveredLoginCard(null)}
                className="rounded-2xl border border-[#F59E0B]/45 bg-[#1B1726]/85 hover:border-[#FBBF24] transition-colors overflow-hidden"
              >
                <motion.button
                  type="button"
                  whileHover={{ x: isRtl ? -3 : 3 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => onTeacherLogin()}
                  aria-label={t.teacherTitle}
                  className="w-full min-h-[78px] p-3.5 flex items-center gap-3.5 text-start cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <TeacherPortalEmblem className="w-13 h-13 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-base sm:text-lg font-bold text-white truncate">
                        {t.teacherTitle}
                      </span>
                      <span className="w-8 h-8 rounded-lg bg-[#D97706] text-white flex items-center justify-center shrink-0">
                        <KeyRound className="w-4 h-4" aria-hidden="true" />
                      </span>
                    </div>
                    <p className="text-xs text-amber-100/90 mt-0.5 truncate">{t.teacherDesc}</p>
                  </div>
                </motion.button>

                <AnimatePresence>
                  {hoveredLoginCard === 'teacher' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -6 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -6 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="border-t border-white/15 bg-[#120F1C]/90 px-3.5 py-2.5 flex flex-wrap gap-2"
                    >
                      {t.teacherSubs.map((sub, i) => (
                        <motion.button
                          key={sub.teacherId}
                          type="button"
                          initial={{ opacity: 0, x: isRtl ? 10 : -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.18, delay: i * 0.05 }}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => onTeacherLogin(sub.teacherId)}
                          className="px-3 py-1.5 rounded-lg bg-[#B45309]/80 hover:bg-[#D97706] border border-amber-300/30 text-[11px] font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <KeyRound className="w-3 h-3 text-amber-200" aria-hidden="true" />
                          <span>{sub.label}</span>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Animated Primary Demo Button */}
            <motion.button
              type="button"
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              onClick={onEnterDemo}
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#3B82F6] hover:to-[#1E40AF] text-white text-sm font-semibold inline-flex items-center justify-center gap-2.5 shadow-lg shadow-blue-950/50 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-amber-300 shrink-0" aria-hidden="true" />
              <span>{t.enterDemo}</span>
              <DirectionalArrow className="w-4 h-4 shrink-0" aria-hidden="true" />
            </motion.button>
          </motion.aside>
        </div>
      </main>

      {/* Bottom Interactive Dock with Sliding Sub-Buttons on Cursor Hover */}
      <section className="relative z-30 pb-5 pt-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {t.dock.map((item, idx) => {
              const theme = DOCK_THEMES[item.tone];
              const Icon = theme.Icon;
              const isOpen = hoveredDock === item.id;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.08 + idx * 0.06,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  onMouseEnter={() => setHoveredDock(item.id)}
                  onMouseLeave={() => setHoveredDock((prev) => (prev === item.id ? null : prev))}
                  className="relative"
                >
                  {/* Sliding Sub-Button Tray above hovered dock button */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 14, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                        className="absolute bottom-full inset-x-0 pb-2.5 z-40"
                      >
                        <div className="rounded-2xl bg-[#071330]/95 backdrop-blur-xl border border-white/20 p-2.5 shadow-2xl space-y-1.5">
                          <div className="px-2 py-1 flex items-center justify-between text-[11px] font-mono text-slate-300 border-b border-white/10">
                            <span>{item.title}</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                          </div>
                          <div className="grid grid-cols-1 gap-1 max-h-60 overflow-y-auto">
                            {item.items.map((sub, subIdx) => (
                              <motion.button
                                key={`${item.id}-${sub.label}`}
                                type="button"
                                initial={{ opacity: 0, x: isRtl ? 14 : -14 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{
                                  duration: 0.2,
                                  delay: subIdx * 0.03,
                                  ease: [0.16, 1, 0.3, 1],
                                }}
                                whileHover={{ x: isRtl ? -4 : 4 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onNavigateDestination(sub.dest)}
                                className={`w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-start text-xs font-semibold text-slate-100 transition-colors flex items-center justify-between gap-2 cursor-pointer ${theme.subBtnHover}`}
                              >
                                <span className="truncate">{sub.label}</span>
                                <DirectionalArrow className="w-3.5 h-3.5 shrink-0 opacity-75" aria-hidden="true" />
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Main Dock Button */}
                  <motion.button
                    type="button"
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                    onClick={() => {
                      if (hoveredDock !== item.id) {
                        setHoveredDock(item.id);
                      } else {
                        onNavigateDestination(item.items[0].dest);
                      }
                    }}
                    className={`w-full p-4 rounded-2xl border backdrop-blur-xl text-start transition-colors cursor-pointer shadow-xl shadow-black/30 ${theme.pill}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`font-mono text-[11px] font-bold ${theme.numText}`}>
                        {item.num}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <ChevronUp
                          className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-200 ${
                            isOpen ? 'rotate-180 text-amber-300' : ''
                          }`}
                          aria-hidden="true"
                        />
                        <span
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${theme.iconWrap}`}
                        >
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                    <div className="font-display text-sm sm:text-base font-bold text-white leading-tight truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5 truncate">{item.sub}</div>
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
