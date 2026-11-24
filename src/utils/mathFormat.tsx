import type { ReactNode } from 'react';

function normalizeSymbols(input: string): string {
  return input
    // Strip dollar signs around math expressions when paired or wrapping formulas
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^$\n]+?)\$/g, '$1')
    .replace(/\\\((.+?)\\\)/g, '$1')
    .replace(/\\\[(.+?)\\\]/g, '$1')
    // LaTeX common commands & symbols
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
    // Plain ASCII operator upgrades
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
    // Common chemical formulas written plainly (CO2, H2O, O2, CH4, H2SO4, NH3, NO3, SO4)
    .replace(/\b(CO|H|O|N|CH|NH|NO|SO|Fe|Ca|Na|Cl)([2-9])([A-Z]?[2-9]?)/g, (_m, a, n1, rest) => {
      return rest ? `${a}_${n1}${rest}` : `${a}_${n1}`;
    });
}

function parseMathSegments(text: string, keyPrefix: string): ReactNode[] {
  const normalized = normalizeSymbols(text);
  const nodes: ReactNode[] = [];

  // Tokenize \frac{a}{b}, √(expr), ^{expr} or ^token, _{expr} or _token
  const tokenRegex =
    /\\frac\{([^{}]+)\}\{([^{}]+)\}|√\(([^()]+)\)|\^\{([^{}]+)\}|\^([A-Za-z0-9+\-°]+)|_\{([^{}]+)\}|_([A-Za-z0-9+\-]+)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = tokenRegex.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(normalized.slice(lastIndex, match.index));
    }

    const k = `${keyPrefix}-${idx++}`;

    if (match[1] !== undefined && match[2] !== undefined) {
      // Stacked fraction
      nodes.push(
        <span
          key={k}
          className="inline-flex flex-col items-center align-middle mx-1 leading-none text-[0.88em] font-serif"
        >
          <span className="border-b border-current px-1 pb-0.5">{parseMathSegments(match[1], `${k}-n`)}</span>
          <span className="px-1 pt-0.5">{parseMathSegments(match[2], `${k}-d`)}</span>
        </span>
      );
    } else if (match[3] !== undefined) {
      // Square root with top bar (vinculum)
      nodes.push(
        <span key={k} className="inline-flex items-baseline font-serif">
          <span className="me-[1px]">√</span>
          <span className="border-t border-current px-0.5 leading-tight">
            {parseMathSegments(match[3], `${k}-r`)}
          </span>
        </span>
      );
    } else if (match[4] !== undefined || match[5] !== undefined) {
      const supContent = match[4] ?? match[5];
      nodes.push(
        <sup key={k} className="text-[0.74em] font-semibold leading-none ms-[0.5px]">
          {supContent}
        </sup>
      );
    } else if (match[6] !== undefined || match[7] !== undefined) {
      const subContent = match[6] ?? match[7];
      nodes.push(
        <sub key={k} className="text-[0.72em] leading-none ms-[0.5px]">
          {subContent}
        </sub>
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < normalized.length) {
    nodes.push(normalized.slice(lastIndex));
  }

  return nodes;
}

export function MathText({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  return <span className={className}>{parseMathSegments(text, 'm')}</span>;
}
