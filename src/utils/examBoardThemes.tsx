export interface ExamBoardVisualTheme {
  curriculum: string;
  shortTag: string;
  boardTitle: string;
  accentHex: string;
  secondaryHex: string;
  bgTintClass: string;
  borderClass: string;
  badgeClass: string;
  headerGradientClass: string;
}

export function getExamBoardTheme(curriculum: string): ExamBoardVisualTheme {
  const c = (curriculum || '').toLowerCase();
  if (c.includes('american') || c.includes('sat') || c.includes('ap')) {
    return {
      curriculum,
      shortTag: 'USA · SAT / AP',
      boardTitle: 'College Board International',
      accentHex: '#1D4ED8',
      secondaryHex: '#0F2537',
      bgTintClass: 'bg-blue-50/70',
      borderClass: 'border-blue-200',
      badgeClass: 'bg-blue-900 text-white',
      headerGradientClass: 'from-[#0F2537] via-[#1E3A8A] to-[#1D4ED8]',
    };
  }
  if (c.includes('ib')) {
    return {
      curriculum,
      shortTag: 'IB DIPLOMA',
      boardTitle: 'International Baccalaureate Organisation',
      accentHex: '#0B6E8C',
      secondaryHex: '#0F2537',
      bgTintClass: 'bg-sky-50/70',
      borderClass: 'border-sky-200',
      badgeClass: 'bg-[#0B6E8C] text-white',
      headerGradientClass: 'from-[#0F2537] via-[#0B6E8C] to-[#0284C7]',
    };
  }
  if (c.includes('igcse') || c.includes('a-level') || c.includes('cambridge') || c.includes('british')) {
    return {
      curriculum,
      shortTag: 'CAMBRIDGE · UK',
      boardTitle: 'Cambridge Assessment International',
      accentHex: '#881337',
      secondaryHex: '#4C0519',
      bgTintClass: 'bg-rose-50/70',
      borderClass: 'border-rose-200',
      badgeClass: 'bg-[#881337] text-white',
      headerGradientClass: 'from-[#4C0519] via-[#881337] to-[#BE123C]',
    };
  }
  if (c.includes('nafs') || c.includes('nafes') || c.includes('etec') || c.includes('نافس')) {
    return {
      curriculum,
      shortTag: 'ETEC · نافس',
      boardTitle: 'Education & Training Evaluation Commission (KSA)',
      accentHex: '#047857',
      secondaryHex: '#064E3B',
      bgTintClass: 'bg-emerald-50/70',
      borderClass: 'border-emerald-200',
      badgeClass: 'bg-[#047857] text-white',
      headerGradientClass: 'from-[#064E3B] via-[#047857] to-[#059669]',
    };
  }
  if (c.includes('qudurat') || c.includes('tahsili') || c.includes('قياس') || c.includes('qiyas')) {
    return {
      curriculum,
      shortTag: 'QIYAS · قياس',
      boardTitle: 'National Center for Assessment (GAT & SAAT)',
      accentHex: '#B45309',
      secondaryHex: '#78350F',
      bgTintClass: 'bg-amber-50/70',
      borderClass: 'border-amber-200',
      badgeClass: 'bg-[#B45309] text-white',
      headerGradientClass: 'from-[#78350F] via-[#B45309] to-[#D97706]',
    };
  }
  return {
    curriculum,
    shortTag: 'AEFE · BAC FR',
    boardTitle: 'Baccalauréat Français & Écoles AEFE',
    accentHex: '#3730A3',
    secondaryHex: '#1E1B4B',
    bgTintClass: 'bg-indigo-50/70',
    borderClass: 'border-indigo-200',
    badgeClass: 'bg-[#3730A3] text-white',
    headerGradientClass: 'from-[#1E1B4B] via-[#3730A3] to-[#4338CA]',
  };
}

export function ExamBoardCrestSvg({ curriculum, className = 'w-8 h-8' }: { curriculum: string; className?: string }) {
  const c = (curriculum || '').toLowerCase();

  if (c.includes('ib')) {
    // IB Globe Ring Crest
    return (
      <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2.5" opacity="0.9" />
        <ellipse cx="24" cy="24" rx="10" ry="20" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 24h38M8 14h32M8 34h32" stroke="currentColor" strokeWidth="1.6" />
        <text x="24" y="28" textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="bold" fontFamily="serif">
          IB
        </text>
      </svg>
    );
  }

  if (c.includes('nafs') || c.includes('nafes') || c.includes('etec') || c.includes('نافس')) {
    // NAFS Saudi Academic Palm & Shield Crest
    return (
      <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
        <path d="M24 4L41 11v12c0 11-7.5 18.5-17 21C14.5 41.5 7 34 7 23V11L24 4z" stroke="currentColor" strokeWidth="2.4" />
        <path d="M24 14v18M17 20c3-2 7-2 7 2M31 20c-3-2-7-2-7 2M15 28l9 4 9-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (c.includes('qudurat') || c.includes('tahsili') || c.includes('قياس') || c.includes('qiyas')) {
    // 8-point Geometric Star Crest
    return (
      <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
        <rect x="11" y="11" width="26" height="26" stroke="currentColor" strokeWidth="2.2" />
        <rect x="11" y="11" width="26" height="26" transform="rotate(45 24 24)" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="24" cy="24" r="6" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }

  if (c.includes('igcse') || c.includes('a-level') || c.includes('cambridge')) {
    // Royal Shield Crest
    return (
      <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
        <path d="M9 8h30v15c0 11-6.5 17-15 21C15.5 40 9 34 9 23V8z" stroke="currentColor" strokeWidth="2.4" />
        <path d="M24 8v35M9 21h30" stroke="currentColor" strokeWidth="2" />
        <circle cx="16.5" cy="14.5" r="2.2" fill="currentColor" />
        <circle cx="31.5" cy="14.5" r="2.2" fill="currentColor" />
      </svg>
    );
  }

  if (c.includes('american') || c.includes('sat') || c.includes('ap')) {
    // College Board / American Star & Laurel Columns Crest
    return (
      <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
        <path d="M24 6l5.2 10.5 11.6 1.7-8.4 8.2 2 11.6L24 32.5 13.6 38l2-11.6-8.4-8.2 11.6-1.7L24 6z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M12 42h24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  // French Baccalauréat AEFE Laurel Book Crest
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path d="M8 12c6-2 12-1 16 3 4-4 10-5 16-3v24c-6-2-12-1-16 3-4-4-10-5-16-3V12z" stroke="currentColor" strokeWidth="2.3" strokeLinejoin="round" />
      <path d="M24 15v24" stroke="currentColor" strokeWidth="2" />
      <path d="M12 19h7M12 25h7M29 19h7M29 25h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
