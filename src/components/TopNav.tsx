import { GraduationCap, Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { ActiveView, UiLanguage, UserProfile, WorkspaceMode } from '../types/academy';
import { TRANSLATIONS } from '../i18n/translations';

interface TopNavProps {
  lang: UiLanguage;
  activeView: ActiveView;
  workspaceMode: WorkspaceMode;
  onNavigate: (view: ActiveView) => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
}

export function TopNav({
  lang,
  activeView,
  workspaceMode,
  onNavigate,
  user,
  onOpenAuth,
}: TopNavProps) {
  const t = TRANSLATIONS[lang];
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: { id: ActiveView; label: string }[] = [
    { id: 'placement', label: t.navPlacement },
    { id: 'courses', label: t.navCourses },
    { id: 'ai-exams', label: t.navAiExams },
    { id: 'past-papers', label: t.navPastPapers },
    { id: 'tutors', label: t.navTutors },
  ];

  const handleSelect = (view: ActiveView) => {
    onNavigate(view);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleSelect('placement')}
          className="inline-flex items-center gap-2 font-display text-xl font-bold tracking-tight text-[#0F2537] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E8C] rounded-sm cursor-pointer"
        >
          <GraduationCap className="w-5 h-5 text-[#0B6E8C] shrink-0" />
          <span>{t.brand}</span>
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          {navItems.map((item) => {
            const isActive = workspaceMode === 'student' && activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#0F2537] font-semibold border-[#0B6E8C]'
                    : 'border-transparent hover:text-[#0F2537] hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => (user ? handleSelect('portal') : onOpenAuth())}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-[#0B6E8C] hover:bg-[#08566E] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {user ? `${t.navPortal} · ${user.name.split(' ')[0]}` : t.ctaSignIn}
          </button>

          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden p-2 text-slate-700 hover:text-[#0F2537] rounded-lg border border-slate-200"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              className={`block w-full text-start px-3 py-2.5 rounded-xl text-sm font-medium ${
                workspaceMode === 'student' && activeView === item.id
                  ? 'bg-[#0B6E8C] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
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
            className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold bg-[#0F2537] text-white"
          >
            {user ? `${t.ctaMyAccount} (${user.name.split(' ')[0]})` : t.ctaSignIn}
          </button>
        </div>
      )}
    </header>
  );
}
