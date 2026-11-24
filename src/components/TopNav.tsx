import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { ActiveView, UiLanguage, UserProfile } from '../types/academy';
import { TRANSLATIONS } from '../i18n/translations';

interface TopNavProps {
  lang: UiLanguage;
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
}

export function TopNav({ lang, activeView, onNavigate, user, onOpenAuth }: TopNavProps) {
  const t = TRANSLATIONS[lang];
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: { id: ActiveView; label: string }[] = [
    { id: 'courses', label: t.navCourses },
    { id: 'ai-exams', label: t.navAiExams },
    { id: 'past-papers', label: t.navPastPapers },
    { id: 'tutors', label: t.navTutors },
    { id: 'portal', label: t.navPortal },
  ];

  const handleSelect = (view: ActiveView) => {
    onNavigate(view);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-slate-200/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleSelect('courses')}
          className="font-display text-xl font-semibold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded-sm cursor-pointer"
        >
          {t.brand}
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-slate-900 border-emerald-800'
                    : 'border-transparent hover:text-slate-900 hover:border-slate-300'
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
            onClick={user ? () => handleSelect('portal') : onOpenAuth}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-emerald-900 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {user ? user.name.split(' ')[0] : t.ctaSignIn}
          </button>

          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden p-2 text-slate-700 hover:text-slate-900 rounded-lg border border-slate-200"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-[#FAF9F6] px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              className={`block w-full text-start px-3 py-2.5 rounded-lg text-sm font-medium ${
                activeView === item.id
                  ? 'bg-emerald-900 text-white'
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
            className="w-full px-3 py-2.5 rounded-lg text-sm font-semibold bg-slate-900 text-white"
          >
            {user ? `${t.ctaMyAccount} (${user.name.split(' ')[0]})` : t.ctaSignIn}
          </button>
        </div>
      )}
    </header>
  );
}
