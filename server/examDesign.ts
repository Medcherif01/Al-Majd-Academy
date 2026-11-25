import type { PastPaperItem } from './catalog.ts';

export function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeMathInput(input: string): string {
  return String(input ?? '')
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^$\n]+?)\$/g, '$1')
    .replace(/\\\((.+?)\\\)/g, '$1')
    .replace(/\\\[(.+?)\\\]/g, '$1')
    .replace(/\\(?:le|leq)\b/g, '≤')
    .replace(/\\(?:ge|geq)\b/g, '≥')
    .replace(/\\(?:neq|ne)\b/g, '≠')
    .replace(/\\approx\b/g, '≈')
    .replace(/\\equiv\b/g, '≡')
    .replace(/\\times\b/g, '×')
    .replace(/\\cdot\b/g, '·')
    .replace(/\\div\b/g, '÷')
    .replace(/\\pm\b/g, '±')
    .replace(/\\infty\b/g, '∞')
    .replace(/\\rightarrow\b|\\to\b/g, '→')
    .replace(/\\Rightarrow\b/g, '⇒')
    .replace(/\\leftrightarrow\b/g, '↔')
    .replace(/\\in\b/g, '∈')
    .replace(/\\notin\b/g, '∉')
    .replace(/\\forall\b/g, '∀')
    .replace(/\\exists\b/g, '∃')
    .replace(/\\mathbb\{R\}/g, 'ℝ')
    .replace(/\\mathbb\{N\}/g, 'ℕ')
    .replace(/\\mathbb\{Z\}/g, 'ℤ')
    .replace(/\\mathbb\{Q\}/g, 'ℚ')
    .replace(/\\mathbb\{C\}/g, 'ℂ')
    .replace(/\\pi\b/g, 'π')
    .replace(/\\theta\b/g, 'θ')
    .replace(/\\alpha\b/g, 'α')
    .replace(/\\beta\b/g, 'β')
    .replace(/\\gamma\b/g, 'γ')
    .replace(/\\delta\b/g, 'δ')
    .replace(/\\Delta\b/g, 'Δ')
    .replace(/\\lambda\b/g, 'λ')
    .replace(/\\mu\b/g, 'μ')
    .replace(/\\sigma\b/g, 'σ')
    .replace(/\\Sigma\b|\\sum\b/g, '∑')
    .replace(/\\Omega\b/g, 'Ω')
    .replace(/\\int\b/g, '∫')
    .replace(/\\circ\b/g, '°')
    .replace(/\\(sin|cos|tan|ln|log|lim|exp)\b/g, '$1')
    .replace(/\\sqrt\b/g, '√')
    .replace(/<=/g, '≤')
    .replace(/>=/g, '≥')
    .replace(/!=/g, '≠')
    .replace(/\+\/-/g, '±')
    .replace(/\+-/g, '±')
    .replace(/<->/g, '↔')
    .replace(/->/g, '→')
    .replace(/=>/g, '⇒')
    .replace(/\bsqrt\s*\(([^()]+)\)/gi, '√($1)')
    .replace(/√\{([^}]+)\}/g, '√($1)')
    .replace(/\^\\circ|\^o\b/g, '°')
    .replace(/\b(CO|H|O|N|CH|NH|NO|SO|Fe|Ca|Na|Cl)([2-9])([A-Z]?[2-9]?)/g, (_m, a, n1, rest) => {
      return rest ? `${a}_${n1}${rest}` : `${a}_${n1}`;
    });
}

/**
 * Escapes raw text first and transforms mathematical/scientific notation into clean semantic HTML
 * (<sup>, <sub>, stacked .math-frac, vinculum roots) with zero raw HTML injection risk.
 */
export function formatScientificHtmlMath(rawText: string): string {
  const normalized = normalizeMathInput(rawText);
  const tokenRegex =
    /\\frac\{([^{}]+)\}\{([^{}]+)\}|√\(([^()]+)\)|\^\{([^{}]+)\}|\^([A-Za-z0-9+\-°]+)|_\{([^{}]+)\}|_([A-Za-z0-9+\-]+)/g;

  let out = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      out += escapeHtml(normalized.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      out += `<span class="math-frac"><span class="num">${formatScientificHtmlMath(match[1])}</span><span class="den">${formatScientificHtmlMath(match[2])}</span></span>`;
    } else if (match[3] !== undefined) {
      out += `<span class="math-sqrt">√<span class="rad">${formatScientificHtmlMath(match[3])}</span></span>`;
    } else if (match[4] !== undefined || match[5] !== undefined) {
      out += `<sup class="math-sup">${escapeHtml(match[4] ?? match[5])}</sup>`;
    } else if (match[6] !== undefined || match[7] !== undefined) {
      out += `<sub class="math-sub">${escapeHtml(match[6] ?? match[7])}</sub>`;
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < normalized.length) {
    out += escapeHtml(normalized.slice(lastIndex));
  }

  return out;
}

interface BoardHtmlTheme {
  accentHex: string;
  secondaryHex: string;
  softBgHex: string;
  borderHex: string;
  boardBadge: string;
  crestSvg: string;
}

function getServerBoardTheme(curriculum: string): BoardHtmlTheme {
  const c = (curriculum || '').toLowerCase();

  if (c.includes('ib')) {
    return {
      accentHex: '#0B6E8C',
      secondaryHex: '#0F2537',
      softBgHex: '#EEF6FA',
      borderHex: '#BFD8E6',
      boardBadge: 'IB DIPLOMA PROGRAMME · IBO',
      crestSvg: `<svg viewBox="0 0 48 48" width="44" height="44" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="20" stroke="#ffffff" stroke-width="2.4"/><ellipse cx="24" cy="24" rx="10" ry="20" stroke="#ffffff" stroke-width="1.6"/><path d="M5 24h38M8 14h32M8 34h32" stroke="#ffffff" stroke-width="1.5"/><text x="24" y="28" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="bold" font-family="Georgia,serif">IB</text></svg>`,
    };
  }
  if (c.includes('american') || c.includes('sat') || c.includes('ap')) {
    return {
      accentHex: '#1D4ED8',
      secondaryHex: '#0F2537',
      softBgHex: '#EFF6FF',
      borderHex: '#BFDBFE',
      boardBadge: 'COLLEGE BOARD · DIGITAL SAT & AP',
      crestSvg: `<svg viewBox="0 0 48 48" width="44" height="44" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 6l5.2 10.5 11.6 1.7-8.4 8.2 2 11.6L24 32.5 13.6 38l2-11.6-8.4-8.2 11.6-1.7L24 6z" stroke="#ffffff" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 42h24" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    };
  }
  if (c.includes('igcse') || c.includes('a-level') || c.includes('cambridge')) {
    return {
      accentHex: '#881337',
      secondaryHex: '#4C0519',
      softBgHex: '#FFF1F2',
      borderHex: '#FECDD3',
      boardBadge: 'CAMBRIDGE INTERNATIONAL · IGCSE & A-LEVEL',
      crestSvg: `<svg viewBox="0 0 48 48" width="44" height="44" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 8h30v15c0 11-6.5 17-15 21C15.5 40 9 34 9 23V8z" stroke="#ffffff" stroke-width="2.4"/><path d="M24 8v35M9 21h30" stroke="#ffffff" stroke-width="1.8"/><circle cx="16.5" cy="14.5" r="2.2" fill="#ffffff"/><circle cx="31.5" cy="14.5" r="2.2" fill="#ffffff"/></svg>`,
    };
  }
  if (c.includes('nafs') || c.includes('nafes') || c.includes('etec') || c.includes('نافس')) {
    return {
      accentHex: '#047857',
      secondaryHex: '#064E3B',
      softBgHex: '#ECFDF5',
      borderHex: '#A7F3D0',
      boardBadge: 'ETEC · NAFS (نـافـس)',
      crestSvg: `<svg viewBox="0 0 48 48" width="44" height="44" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 4L41 11v12c0 11-7.5 18.5-17 21C14.5 41.5 7 34 7 23V11L24 4z" stroke="#ffffff" stroke-width="2.4"/><path d="M24 14v18M17 20c3-2 7-2 7 2M31 20c-3-2-7-2-7 2M15 28l9 4 9-4" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/></svg>`,
    };
  }
  if (c.includes('qudurat') || c.includes('tahsili') || c.includes('قياس') || c.includes('qiyas')) {
    return {
      accentHex: '#B45309',
      secondaryHex: '#78350F',
      softBgHex: '#FFFBEB',
      borderHex: '#FDE68A',
      boardBadge: 'QIYAS · QUDURAT & TAHSILI (قـيـاس)',
      crestSvg: `<svg viewBox="0 0 48 48" width="44" height="44" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="11" y="11" width="26" height="26" stroke="#ffffff" stroke-width="2.2"/><rect x="11" y="11" width="26" height="26" transform="rotate(45 24 24)" stroke="#ffffff" stroke-width="2.2"/><circle cx="24" cy="24" r="6" stroke="#ffffff" stroke-width="2"/></svg>`,
    };
  }
  return {
    accentHex: '#3730A3',
    secondaryHex: '#1E1B4B',
    softBgHex: '#EEF2FF',
    borderHex: '#C7D2FE',
    boardBadge: 'BACCALAURÉAT FRANÇAIS · AEFE',
    crestSvg: `<svg viewBox="0 0 48 48" width="44" height="44" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 12c6-2 12-1 16 3 4-4 10-5 16-3v24c-6-2-12-1-16 3-4-4-10-5-16-3V12z" stroke="#ffffff" stroke-width="2.3" stroke-linejoin="round"/><path d="M24 15v24" stroke="#ffffff" stroke-width="2"/></svg>`,
  };
}

export function buildBoardThemedA4PaperHtml(
  paper: PastPaperItem,
  buyerName: string,
  buyerEmail: string
): string {
  const isRtl = paper.language === 'العربية';
  const dirAttr = isRtl ? 'rtl' : 'ltr';
  const theme = getServerBoardTheme(paper.curriculum);
  const dateDisplay = paper.examDate ? `${paper.examDate} (${paper.year})` : String(paper.year);
  const totalMarks = paper.fullQuestions.reduce((s, q) => s + (Number(q.marks) || 0), 0);

  const questionsHtml = paper.fullQuestions
    .map(
      (q) => `
      <section class="question-block">
        <div class="q-header">
          <span class="q-num">Question ${q.number}</span>
          <span class="q-marks">[${q.marks} ${q.marks > 1 ? 'marks' : 'mark'}]</span>
        </div>
        <div class="q-prompt">${formatScientificHtmlMath(q.prompt)}</div>
        <div class="mark-scheme">
          <div class="ms-title">Official Mark Scheme · Correction Officielle</div>
          <div class="ms-body">${formatScientificHtmlMath(q.markScheme)}</div>
          <p class="examiner-note"><strong>Examiner Note:</strong> ${formatScientificHtmlMath(q.examinerNote)}</p>
        </div>
      </section>
    `
    )
    .join('\n');

  return `<!doctype html>
<html lang="${isRtl ? 'ar' : paper.language === 'Français' ? 'fr' : 'en'}" dir="${dirAttr}">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(paper.code)} — ${escapeHtml(paper.title)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 15mm 16mm 15mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      background: #e2e8f0;
      color: #0f172a;
      margin: 0;
      padding: 24px 12px;
      line-height: 1.65;
    }
    .toolbar {
      max-width: 210mm;
      margin: 0 auto 14px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .print-btn {
      background: ${theme.accentHex};
      color: #ffffff;
      border: none;
      border-radius: 10px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .sheet {
      width: 210mm;
      max-width: 100%;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
      box-shadow: 0 12px 35px rgba(15, 23, 42, 0.14);
      border-top: 6px solid ${theme.accentHex};
      overflow: hidden;
    }
    .hero-banner {
      background: linear-gradient(135deg, ${theme.secondaryHex} 0%, ${theme.accentHex} 100%);
      color: #ffffff;
      padding: 22px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    }
    .hero-left { flex: 1; }
    .board-pill {
      display: inline-block;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.16);
      border: 1px solid rgba(255, 255, 255, 0.28);
      margin-bottom: 8px;
    }
    h1 {
      font-size: 22px;
      margin: 4px 0 6px 0;
      line-height: 1.25;
      color: #ffffff;
    }
    .submeta {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 12.5px;
      opacity: 0.92;
    }
    .crest-box {
      width: 68px;
      height: 68px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.14);
      border: 1px solid rgba(255, 255, 255, 0.28);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .content {
      padding: 22px 28px 28px 28px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 18px;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .meta-cell {
      background: ${theme.softBgHex};
      border: 1px solid ${theme.borderHex};
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 11.5px;
    }
    .meta-cell .lbl {
      color: #475569;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      display: block;
      margin-bottom: 2px;
    }
    .meta-cell strong { color: ${theme.secondaryHex}; }
    .rules {
      background: #f8fafc;
      border-inline-start: 4px solid ${theme.accentHex};
      border-top: 1px solid #cbd5e1;
      border-right: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
      border-left: 1px solid #cbd5e1;
      padding: 12px 16px;
      margin-bottom: 22px;
      font-size: 13px;
      border-radius: 6px;
    }
    .question-block {
      border-bottom: 1px solid #e2e8f0;
      padding: 16px 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .q-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: system-ui, -apple-system, sans-serif;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .q-num {
      color: ${theme.secondaryHex};
      font-size: 14px;
    }
    .q-marks {
      color: ${theme.accentHex};
      font-family: monospace;
      font-size: 12.5px;
      background: ${theme.softBgHex};
      border: 1px solid ${theme.borderHex};
      padding: 2px 8px;
      border-radius: 6px;
    }
    .q-prompt {
      font-size: 15px;
      white-space: pre-wrap;
      margin-bottom: 12px;
    }
    .mark-scheme {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 12px 15px;
      font-size: 13.5px;
    }
    .ms-title {
      font-family: system-ui, -apple-system, sans-serif;
      font-weight: 700;
      font-size: 12px;
      color: #065f46;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .ms-body { white-space: pre-wrap; color: #0f172a; }
    .examiner-note {
      color: #334155;
      margin: 8px 0 0 0;
      font-size: 12px;
      border-top: 1px dashed #bbf7d0;
      padding-top: 6px;
    }
    .math-sup { font-size: 0.72em; vertical-align: super; line-height: 0; font-weight: 600; }
    .math-sub { font-size: 0.72em; vertical-align: sub; line-height: 0; }
    .math-frac {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      vertical-align: middle;
      margin: 0 3px;
      line-height: 1.05;
      font-size: 0.88em;
    }
    .math-frac .num { border-bottom: 1px solid currentColor; padding: 0 4px 1px 4px; }
    .math-frac .den { padding: 1px 4px 0 4px; }
    .math-sqrt { display: inline-flex; align-items: baseline; }
    .math-sqrt .rad { border-top: 1px solid currentColor; padding: 0 2px; margin-inline-start: 1px; }
    footer {
      margin-top: 26px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 11px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      gap: 10px;
    }
    @media print {
      body { background: #ffffff; padding: 0; margin: 0; }
      .toolbar { display: none !important; }
      .sheet { width: 100%; min-height: auto; box-shadow: none; border-top: 4px solid ${theme.accentHex}; }
      .hero-banner { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .meta-cell, .q-marks, .mark-scheme { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div style="font-size:12px;color:#334155;"><strong>Dateacher</strong> · Format A4 Officiel (${escapeHtml(paper.code)})</div>
    <button class="print-btn" onclick="window.print()">Imprimer / Télécharger PDF A4</button>
  </div>
  <div class="sheet">
    <div class="hero-banner">
      <div class="hero-left">
        <div class="board-pill">${escapeHtml(theme.boardBadge)}</div>
        <h1>${formatScientificHtmlMath(paper.title)}</h1>
        <div class="submeta">${escapeHtml(paper.code)} · ${escapeHtml(paper.session)} · ${escapeHtml(paper.duration)} · Total : ${totalMarks} pts</div>
      </div>
      <div class="crest-box">${theme.crestSvg}</div>
    </div>
    <div class="content">
      <div class="meta-grid">
        <div class="meta-cell"><span class="lbl">Catégorie</span><strong>${escapeHtml(paper.curriculum)}</strong></div>
        <div class="meta-cell"><span class="lbl">Matière</span><strong>${escapeHtml(paper.subject)}</strong></div>
        <div class="meta-cell"><span class="lbl">Date / Année</span><strong>${escapeHtml(dateDisplay)}</strong></div>
        <div class="meta-cell"><span class="lbl">Publié par</span><strong>${escapeHtml(paper.uploadedByTeacherName || 'Dateacher Faculty')}</strong></div>
      </div>

      <div class="rules">
        <strong>Consignes &amp; Règlement Officiel :</strong> ${formatScientificHtmlMath(paper.officialRuleSummary)}
      </div>

      ${questionsHtml}

      <footer>
        <span>Délivré à ${escapeHtml(buyerName)} (${escapeHtml(buyerEmail)})</span>
        <span>Dateacher · Format A4 Officiel</span>
      </footer>
    </div>
  </div>
</body>
</html>`;
}
