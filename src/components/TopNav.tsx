import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import type {
  ActiveView,
  CurriculumKey,
  PrepHubTab,
  UiLanguage,
  UserProfile,
  WorkspaceMode,
} from '../types/academy';
import { TRANSLATIONS } from '../i18n/translations';
import { AcademyCrestIcon } from './BrandIcons';

interface TopNavProps {
  lang: UiLanguage;
  activeView: ActiveView;
  workspaceMode: WorkspaceMode;
  onNavigate: (view: ActiveView) => void;
  onSelectCourseTrack?: (track: CurriculumKey) => void;
  onOpenPrepHub?: (tab: PrepHubTab) => void;
  onLaunchAiExam?: (curriculum: string) => void;
  onSelectTrainer?: (trainerName: string) => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
}

interface SubMenuItem {
  label: string;
  action: () => void;
}

export function TopNav({
  lang,
  activeView,
  workspaceMode,
  onNavigate,
  onSelectCourseTrack,
  onOpenPrepHub,
  onLaunchAiExam,
  onSelectTrainer,
  user,
  onOpenAuth,
}: TopNavProps) {
  const t = TRANSLATIONS[lang];
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<ActiveView | null>(null);

  const navItems: { id: ActiveView; label: string; subItems: SubMenuItem[] }[] = [
    {
      id: 'placement',
      label: t.navPlacement,
      subItems: [
        {
          label:
            lang === 'ar'
              ? 'ابدأ اختبار تحديد المستوى'
              : lang === 'en'
                ? 'Start Placement Diagnostic'
                : 'Démarrer le Test de Niveau',
          action: () => handleSelect('placement'),
        },
        {
          label:
            lang === 'ar'
              ? 'بوابة الطالب والنتائج'
              : lang === 'en'
                ? 'Student Portal & Results'
                : 'Mon Espace & Résultats',
          action: () => handleSelect('portal'),
        },
      ],
    },
    {
      id: 'courses',
      label: t.navCourses,
      subItems: [
        {
          label: lang === 'ar' ? 'جميع المسارات' : lang === 'en' ? 'All Curriculum Tracks' : 'Tous les cursus',
          action: () => {
            onSelectCourseTrack?.('all');
            setHoveredNav(null);
          },
        },
        {
          label: 'American (SAT / AP)',
          action: () => {
            onSelectCourseTrack?.('american');
            setHoveredNav(null);
          },
        },
        {
          label: 'IB Diploma',
          action: () => {
            onSelectCourseTrack?.('ib');
            setHoveredNav(null);
          },
        },
        {
          label: 'IGCSE & A-Level',
          action: () => {
            onSelectCourseTrack?.('british');
            setHoveredNav(null);
          },
        },
        {
          label: 'NAFES (ETEC)',
          action: () => {
            onSelectCourseTrack?.('nafes');
            setHoveredNav(null);
          },
        },
        {
          label: 'Qudurat & Tahsili',
          action: () => {
            onSelectCourseTrack?.('qiyas');
            setHoveredNav(null);
          },
        },
        {
          label: 'Bac Français (AEFE)',
          action: () => {
            onSelectCourseTrack?.('french');
            setHoveredNav(null);
          },
        },
        {
          label: 'Prep Hubs (STEP · GAT · IELTS)',
          action: () => {
            onOpenPrepHub?.('step');
            setHoveredNav(null);
          },
        },
      ],
    },
    {
      id: 'ai-exams',
      label: t.navAiExams,
      subItems: [
        {
          label: 'Digital SAT / AP',
          action: () => {
            onLaunchAiExam?.('American SAT');
            setHoveredNav(null);
          },
        },
        {
          label: 'IB Diploma',
          action: () => {
            onLaunchAiExam?.('IB Diploma');
            setHoveredNav(null);
          },
        },
        {
          label: 'Cambridge IGCSE',
          action: () => {
            onLaunchAiExam?.('Cambridge IGCSE');
            setHoveredNav(null);
          },
        },
        {
          label: 'NAFES & Qudurat',
          action: () => {
            onLaunchAiExam?.('Qudurat & Tahsili');
            setHoveredNav(null);
          },
        },
        {
          label: 'Bac Français',
          action: () => {
            onLaunchAiExam?.('Bac Français');
            setHoveredNav(null);
          },
        },
      ],
    },
    {
      id: 'past-papers',
      label: t.navPastPapers,
      subItems: [
        {
          label:
            lang === 'ar'
              ? 'خزنة الأوراق السابقة'
              : lang === 'en'
                ? 'Full Past Papers Vault'
                : 'Coffre Past Papers complet',
          action: () => handleSelect('past-papers'),
        },
        {
          label:
            lang === 'ar'
              ? 'معاينة مجانية + تفعيل واتساب'
              : lang === 'en'
                ? 'Free Q1 Preview & WhatsApp'
                : 'Aperçu Q1 & Activation WhatsApp',
          action: () => handleSelect('past-papers'),
        },
      ],
    },
    {
      id: 'tutors',
      label: t.navTutors,
      subItems: [
        {
          label: 'Mr. Marwan Mhamdi (EN)',
          action: () => {
            onSelectTrainer?.('Marwan Mhamdi');
            setHoveredNav(null);
          },
        },
        {
          label: 'M. Mohamed Cherif (FR / AR)',
          action: () => {
            onSelectTrainer?.('Mohamed Cherif');
            setHoveredNav(null);
          },
        },
      ],
    },
  ];

  const handleSelect = (view: ActiveView) => {
    onNavigate(view);
    setHoveredNav(null);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#DCE3F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleSelect('placement')}
          className="inline-flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight text-[#0B1633] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] rounded-sm cursor-pointer"
        >
          <AcademyCrestIcon className="w-7 h-7 shrink-0" />
          <span>{t.brand}</span>
        </motion.button>

        {/* Zone 2: 5 concise single-line navigation links with animated sliding sub-menus on hover */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          {navItems.map((item) => {
            const isActive = workspaceMode === 'student' && activeView === item.id;
            const isHovered = hoveredNav === item.id;
            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredNav(item.id)}
                onMouseLeave={() => setHoveredNav((prev) => (prev === item.id ? null : prev))}
                className="relative py-2"
              >
                <button
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={`relative whitespace-nowrap shrink-0 py-1 inline-flex items-center gap-1 transition-colors cursor-pointer ${
                    isActive ? 'text-[#0B1633] font-semibold' : 'hover:text-[#0B1633]'
                  }`}
                >
                  <span>{item.label}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isHovered ? 'rotate-180 text-[#1D4ED8]' : 'text-slate-400'
                    }`}
                    aria-hidden="true"
                  />
                  {isActive && (
                    <motion.span
                      layoutId="topNavActiveBar"
                      transition={{ type: 'spring', stiffness: 460, damping: 32 }}
                      className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-[#1D4ED8] rounded-full"
                    />
                  )}
                </button>

                {/* Sliding Sub-Button Tray on Hover */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                      className="absolute top-full start-0 pt-1.5 z-50 min-w-[235px]"
                    >
                      <div className="bg-white border border-[#DCE3F0] rounded-2xl p-2 shadow-xl shadow-[#081229]/12 space-y-1">
                        {item.subItems.map((sub, subIdx) => (
                          <motion.button
                            key={sub.label}
                            type="button"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              duration: 0.16,
                              delay: subIdx * 0.025,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={sub.action}
                            className="w-full px-3 py-2 rounded-xl text-start text-xs font-semibold text-[#0B1633] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] transition-colors flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <span className="truncate">{sub.label}</span>
                            <ArrowRight className="w-3 h-3 shrink-0 opacity-60" aria-hidden="true" />
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <motion.button
            type="button"
            whileHover={{ y: -1, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 440, damping: 25 }}
            onClick={() => (user ? handleSelect('portal') : onOpenAuth())}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {user ? `${t.navPortal} · ${user.name.split(' ')[0]}` : t.ctaSignIn}
          </motion.button>

          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden p-2 text-slate-700 hover:text-[#0B1633] rounded-lg border border-slate-200"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Animated Mobile Dropdown Navigation */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden border-t border-slate-200 bg-white overflow-hidden"
          >
            <div className="px-4 py-4 space-y-2">
              {navItems.map((item, idx) => (
                <motion.button
                  key={item.id}
                  type="button"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18, delay: idx * 0.04 }}
                  onClick={() => handleSelect(item.id)}
                  className={`block w-full text-start px-3 py-2.5 rounded-xl text-sm font-medium ${
                    workspaceMode === 'student' && activeView === item.id
                      ? 'bg-[#1D4ED8] text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </motion.button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  if (user) {
                    handleSelect('portal');
                  } else {
                    onOpenAuth();
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold bg-[#0B1633] text-white"
              >
                {user ? `${t.ctaMyAccount} (${user.name.split(' ')[0]})` : t.ctaSignIn}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
