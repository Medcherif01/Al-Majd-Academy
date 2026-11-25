import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Calculator,
  Circle,
  Clock,
  Download,
  Eraser,
  ExternalLink,
  Grid3X3,
  Highlighter,
  Minus,
  PenTool,
  Play,
  Pause,
  Redo2,
  RotateCcw,
  Square,
  Trash2,
  Type,
  Undo2,
  Video,
  X,
} from 'lucide-react';

interface InteractiveWhiteboardProps {
  sessionStudentName?: string;
  sessionSubject?: string;
  sessionMeetLink?: string;
  onCloseSessionBanner?: () => void;
}

type ToolType = 'pen' | 'highlighter' | 'eraser' | 'line' | 'arrow' | 'rect' | 'circle' | 'text';
type BgPattern = 'blank' | 'grid' | 'axes' | 'lined';

const COLOR_SWATCHES = [
  { hex: '#0F2537', label: 'Encre Marine' },
  { hex: '#0B6E8C', label: 'Bleu Académique' },
  { hex: '#DC2626', label: 'Rouge Correction' },
  { hex: '#047857', label: 'Vert Validation' },
  { hex: '#D97706', label: 'Ambre Annotation' },
  { hex: '#4338CA', label: 'Indigo Démonstration' },
];

const QUICK_MATH_STAMPS = [
  'x²',
  'xⁿ',
  '√(x)',
  '∫ f(x) dx',
  '∑ uₙ',
  'π',
  'Δ',
  '≤',
  '≥',
  '≠',
  '∈ ℝ',
  'CO₂',
  'H₂O',
  '⇒',
];

// Safe mathematical expression parser (no eval / Function constructor)
function evaluateMathExpression(rawExpr: string): string {
  const cleaned = rawExpr
    .trim()
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/gi, 'pi')
    .replace(/√\(/g, 'sqrt(');

  if (!cleaned) return '';

  const tokens: string[] = [];
  let i = 0;
  while (i < cleaned.length) {
    const ch = cleaned[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if ('+-*/^(),'.includes(ch)) {
      tokens.push(ch);
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < cleaned.length && /[0-9.]/.test(cleaned[i])) {
        num += cleaned[i++];
      }
      tokens.push(num);
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      let ident = '';
      while (i < cleaned.length && /[a-zA-Z]/.test(cleaned[i])) {
        ident += cleaned[i++].toLowerCase();
      }
      tokens.push(ident);
      continue;
    }
    throw new Error('Caractère non supporté');
  }

  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseExpression(): number {
    let val = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const right = parseTerm();
      val = op === '+' ? val + right : val - right;
    }
    return val;
  }

  function parseTerm(): number {
    let val = parsePower();
    while (peek() === '*' || peek() === '/') {
      const op = consume();
      const right = parsePower();
      if (op === '/') {
        if (right === 0) throw new Error('Division par zéro');
        val /= right;
      } else {
        val *= right;
      }
    }
    return val;
  }

  function parsePower(): number {
    const base = parseUnary();
    if (peek() === '^') {
      consume();
      const exp = parsePower();
      return Math.pow(base, exp);
    }
    return base;
  }

  function parseUnary(): number {
    if (peek() === '-') {
      consume();
      return -parseUnary();
    }
    if (peek() === '+') {
      consume();
      return parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const tok = peek();
    if (!tok) throw new Error('Expression incomplète');
    if (tok === '(') {
      consume();
      const val = parseExpression();
      if (consume() !== ')') throw new Error('Parenthèse manquante');
      return val;
    }
    if (/^[0-9.]+$/.test(tok)) {
      consume();
      const n = Number(tok);
      if (!Number.isFinite(n)) throw new Error('Nombre invalide');
      return n;
    }
    if (/^[a-z]+$/.test(tok)) {
      consume();
      if (tok === 'pi') return Math.PI;
      if (tok === 'e') return Math.E;
      if (consume() !== '(') throw new Error(`Attendu '(' après ${tok}`);
      const arg = parseExpression();
      if (consume() !== ')') throw new Error('Parenthèse manquante');
      switch (tok) {
        case 'sin':
          return Math.sin(arg);
        case 'cos':
          return Math.cos(arg);
        case 'tan':
          return Math.tan(arg);
        case 'sqrt':
          if (arg < 0) throw new Error('Racine négative');
          return Math.sqrt(arg);
        case 'ln':
          if (arg <= 0) throw new Error('Domaine ln invalide');
          return Math.log(arg);
        case 'log':
          if (arg <= 0) throw new Error('Domaine log invalide');
          return Math.log10(arg);
        case 'abs':
          return Math.abs(arg);
        default:
          throw new Error(`Fonction inconnue: ${tok}`);
      }
    }
    throw new Error('Syntaxe invalide');
  }

  const result = parseExpression();
  if (pos < tokens.length) throw new Error('Syntaxe invalide');
  if (!Number.isFinite(result)) throw new Error('Résultat non défini');
  return Number.isInteger(result) ? String(result) : Number(result.toFixed(6)).toString();
}

export function InteractiveWhiteboard({
  sessionStudentName,
  sessionSubject,
  sessionMeetLink,
  onCloseSessionBanner,
}: InteractiveWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapshotBeforeShapeRef = useRef<ImageData | null>(null);
  const drawingRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [tool, setTool] = useState<ToolType>('pen');
  const [color, setColor] = useState<string>('#0F2537');
  const [lineWidth, setLineWidth] = useState<number>(3);
  const [bgPattern, setBgPattern] = useState<BgPattern>('grid');
  const [stampText, setStampText] = useState<string>('f(x) = x² + 2x - 3');
  const [pendingStampPos, setPendingStampPos] = useState<{ x: number; y: number } | null>(null);

  const historyRef = useRef<ImageData[]>([]);
  const historyIdxRef = useRef<number>(-1);
  const [historyMeta, setHistoryMeta] = useState({ idx: -1, len: 0 });

  // Collapsible Teaching Utilities: Scientific Calculator & Session Timer
  const [showUtilities, setShowUtilities] = useState<boolean>(true);
  const [calcInput, setCalcInput] = useState<string>('sqrt(144) + 3^2');
  const [calcResult, setCalcResult] = useState<string>('21');
  const [timerSeconds, setTimerSeconds] = useState<number>(45 * 60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  const paintBackground = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, pattern: BgPattern) => {
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    if (pattern === 'grid') {
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      const step = 32;
      for (let x = step; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = step; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    } else if (pattern === 'axes') {
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      const step = 28;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      const cx = Math.round(w / 2);
      const cy = Math.round(h / 2);
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.stroke();
      ctx.fillStyle = '#475569';
      ctx.font = '600 12px Inter, sans-serif';
      ctx.fillText('y', cx + 8, 18);
      ctx.fillText('x', w - 18, cy - 8);
      ctx.fillText('O', cx + 6, cy + 16);
    } else if (pattern === 'lined') {
      ctx.strokeStyle = '#DCE8F2';
      ctx.lineWidth = 1;
      for (let y = 40; y < h; y += 36) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.strokeStyle = '#FCA5A5';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(76, 0);
      ctx.lineTo(76, h);
      ctx.stroke();
    }
    ctx.restore();
  }, []);

  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const nextHistory = historyRef.current.slice(0, historyIdxRef.current + 1);
    nextHistory.push(snap);
    if (nextHistory.length > 25) nextHistory.shift();
    historyRef.current = nextHistory;
    historyIdxRef.current = nextHistory.length - 1;
    setHistoryMeta({ idx: historyIdxRef.current, len: nextHistory.length });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 1120;
    canvas.height = 620;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    paintBackground(ctx, canvas.width, canvas.height, bgPattern);
    pushHistory();
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  const handlePatternChange = (nextPattern: BgPattern) => {
    setBgPattern(nextPattern);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    paintBackground(ctx, canvas.width, canvas.height, nextPattern);
    pushHistory();
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    paintBackground(ctx, canvas.width, canvas.height, bgPattern);
    pushHistory();
  };

  const handleUndo = () => {
    if (historyIdxRef.current <= 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    historyIdxRef.current -= 1;
    ctx.putImageData(historyRef.current[historyIdxRef.current], 0, 0);
    setHistoryMeta({ idx: historyIdxRef.current, len: historyRef.current.length });
  };

  const handleRedo = () => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    historyIdxRef.current += 1;
    ctx.putImageData(historyRef.current[historyIdxRef.current], 0, 0);
    setHistoryMeta({ idx: historyIdxRef.current, len: historyRef.current.length });
  };

  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const placeTextAt = (x: number, y: number, textToDraw: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !textToDraw.trim()) return;
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = '600 22px "IBM Plex Mono", "Plus Jakarta Sans", sans-serif';
    ctx.fillText(textToDraw, x, y);
    ctx.restore();
    pushHistory();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const pt = getCoords(e);

    if (tool === 'text') {
      setPendingStampPos(pt);
      return;
    }

    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    startPointRef.current = pt;

    if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (tool === 'eraser') {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = Math.max(14, lineWidth * 4);
      } else if (tool === 'highlighter') {
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.28;
        ctx.lineWidth = Math.max(16, lineWidth * 5);
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
      }
      ctx.lineTo(pt.x + 0.01, pt.y + 0.01);
      ctx.stroke();
    } else {
      snapshotBeforeShapeRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
  };

  const drawShape = (
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number }
  ) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    } else if (tool === 'arrow') {
      const headLen = 14 + lineWidth * 1.5;
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.lineTo(
        to.x - headLen * Math.cos(angle - Math.PI / 6),
        to.y - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(
        to.x - headLen * Math.cos(angle + Math.PI / 6),
        to.y - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    } else if (tool === 'rect') {
      ctx.strokeRect(from.x, from.y, to.x - from.x, to.y - from.y);
    } else if (tool === 'circle') {
      const rx = Math.abs(to.x - from.x) / 2;
      const ry = Math.abs(to.y - from.y) / 2;
      const cx = (from.x + to.x) / 2;
      const cy = (from.y + to.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const pt = getCoords(e);

    if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    } else if (snapshotBeforeShapeRef.current) {
      ctx.putImageData(snapshotBeforeShapeRef.current, 0, 0);
      drawShape(ctx, startPointRef.current, pt);
    }
  };

  const handlePointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && (tool === 'pen' || tool === 'highlighter' || tool === 'eraser')) {
      ctx.restore();
    }
    snapshotBeforeShapeRef.current = null;
    pushHistory();
  };

  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `dateacher_tableau_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleEvaluateCalc = (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      setCalcResult(evaluateMathExpression(calcInput));
    } catch (err: any) {
      setCalcResult(err?.message || 'Erreur');
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {sessionStudentName && (
        <div className="p-4 rounded-2xl bg-[#0F2537] text-white flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">
              Session en ligne active · Tableau partagé
            </div>
            <div className="font-display text-lg font-bold">
              {sessionStudentName} {sessionSubject ? `· ${sessionSubject}` : ''}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sessionMeetLink && (
              <a
                href={sessionMeetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#0B6E8C] hover:bg-[#0E83A6] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Rejoindre Google Meet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {onCloseSessionBanner && (
              <button
                type="button"
                onClick={onCloseSessionBanner}
                className="p-2 text-slate-300 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Drawing Tools */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            {(
              [
                { id: 'pen', label: 'Stylo', icon: PenTool },
                { id: 'highlighter', label: 'Surligneur', icon: Highlighter },
                { id: 'eraser', label: 'Gomme', icon: Eraser },
                { id: 'line', label: 'Ligne', icon: Minus },
                { id: 'arrow', label: 'Vecteur', icon: ArrowUpRight },
                { id: 'rect', label: 'Rectangle', icon: Square },
                { id: 'circle', label: 'Cercle', icon: Circle },
                { id: 'text', label: 'Formule / Texte', icon: Type },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = tool === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTool(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                    active ? 'bg-[#0B6E8C] text-white' : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Actions: Undo / Redo / Clear / Export / Calc Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={historyMeta.idx <= 0}
              onClick={handleUndo}
              title="Annuler"
              className="p-2 rounded-lg border border-slate-200 hover:border-[#0B6E8C] disabled:opacity-40 cursor-pointer"
            >
              <Undo2 className="w-4 h-4 text-slate-700" />
            </button>
            <button
              type="button"
              disabled={historyMeta.idx >= historyMeta.len - 1}
              onClick={handleRedo}
              title="Rétablir"
              className="p-2 rounded-lg border border-slate-200 hover:border-[#0B6E8C] disabled:opacity-40 cursor-pointer"
            >
              <Redo2 className="w-4 h-4 text-slate-700" />
            </button>
            <button
              type="button"
              onClick={handleClearCanvas}
              className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Effacer</span>
            </button>
            <button
              type="button"
              onClick={handleExportPng}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PNG</span>
            </button>
            <button
              type="button"
              onClick={() => setShowUtilities((v) => !v)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                showUtilities
                  ? 'border-[#0B6E8C] bg-[#EEF5F9] text-[#0B6E8C]'
                  : 'border-slate-300 text-slate-700'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Outils Prof</span>
            </button>
          </div>
        </div>

        {/* Row 2: Color Palette + Stroke + Paper Background + Math Stamp Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              {COLOR_SWATCHES.map((sw) => (
                <button
                  key={sw.hex}
                  type="button"
                  title={sw.label}
                  onClick={() => setColor(sw.hex)}
                  className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${
                    color === sw.hex ? 'border-slate-900 scale-110' : 'border-white shadow-xs'
                  }`}
                  style={{ backgroundColor: sw.hex }}
                />
              ))}
            </div>

            <span className="text-slate-300">|</span>

            <div className="flex items-center gap-1">
              {[2, 4, 7, 12].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setLineWidth(w)}
                  className={`px-2 py-1 rounded text-[11px] font-mono font-semibold cursor-pointer ${
                    lineWidth === w ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {w}px
                </button>
              ))}
            </div>

            <span className="text-slate-300">|</span>

            <div className="inline-flex items-center gap-1">
              <Grid3X3 className="w-3.5 h-3.5 text-slate-500 me-1" />
              {(
                [
                  { id: 'grid', label: 'Quadrillé' },
                  { id: 'axes', label: 'Repère (O,x,y)' },
                  { id: 'lined', label: 'Ligné' },
                  { id: 'blank', label: 'Vierge' },
                ] as const
              ).map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => handlePatternChange(bg.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                    bgPattern === bg.id
                      ? 'bg-[#0B6E8C] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {bg.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {QUICK_MATH_STAMPS.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => {
                  setTool('text');
                  setStampText((prev) => (prev ? `${prev} ${sym}` : sym));
                }}
                className="px-2 py-1 rounded border border-slate-200 bg-[#F8FAFC] hover:border-[#0B6E8C] text-xs font-mono text-[#0F2537] cursor-pointer"
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        {tool === 'text' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 bg-[#EEF5F9] p-3 rounded-xl">
            <span className="text-xs font-semibold text-[#0F2537]">
              Tampon Scientifique / Texte :
            </span>
            <input
              type="text"
              value={stampText}
              onChange={(e) => setStampText(e.target.value)}
              placeholder="Saisissez une formule ou annotation puis cliquez sur le tableau..."
              className="flex-1 min-w-[220px] px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg"
            />
            {pendingStampPos ? (
              <button
                type="button"
                onClick={() => {
                  placeTextAt(pendingStampPos.x, pendingStampPos.y, stampText);
                  setPendingStampPos(null);
                }}
                className="px-3.5 py-1.5 bg-[#0B6E8C] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Coller sur le point choisi
              </button>
            ) : (
              <span className="text-[11px] text-[#0B6E8C] font-medium">
                Cliquez sur le tableau blanc pour placer cette expression.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Canvas + Optional Utilities Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className={`${showUtilities ? 'lg:col-span-9' : 'lg:col-span-12'} bg-white border border-slate-200 rounded-2xl p-2 shadow-xs overflow-hidden`}>
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="w-full h-auto rounded-xl border border-slate-200 touch-none cursor-crosshair bg-white block"
          />
        </div>

        {showUtilities && (
          <aside className="lg:col-span-3 space-y-4">
            {/* Session Timer */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#0F2537]">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#0B6E8C]" />
                  <span>Chronomètre Séance</span>
                </span>
                <span className="font-mono text-lg text-[#0B6E8C] tabular-nums">
                  {formatTimer(timerSeconds)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {[30, 45, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setTimerRunning(false);
                      setTimerSeconds(m * 60);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-mono font-semibold text-slate-700 cursor-pointer"
                  >
                    {m}m
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTimerRunning((r) => !r)}
                  className="flex-1 py-2 bg-[#0B6E8C] text-white text-xs font-semibold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{timerRunning ? 'Pause' : 'Démarrer'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTimerRunning(false);
                    setTimerSeconds(45 * 60);
                  }}
                  className="p-2 border border-slate-300 rounded-xl text-slate-700 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Scientific Calculator */}
            <form
              onSubmit={handleEvaluateCalc}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F2537]">
                <Calculator className="w-4 h-4 text-[#0B6E8C]" />
                <span>Calculatrice Scientifique</span>
              </div>
              <input
                type="text"
                value={calcInput}
                onChange={(e) => setCalcInput(e.target.value)}
                placeholder="ex: sin(pi/4) * 2^3"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl bg-[#F8FAFC]"
              />
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0F2537] text-white font-mono text-sm">
                <span className="text-[11px] text-sky-300">=</span>
                <span className="font-bold truncate">{calcResult}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-xs font-mono">
                {['sin(', 'cos(', 'tan(', 'sqrt(', 'ln(', 'log(', 'pi', '^'].map((fn) => (
                  <button
                    key={fn}
                    type="button"
                    onClick={() => setCalcInput((prev) => prev + fn)}
                    className="py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold cursor-pointer"
                  >
                    {fn}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#0B6E8C] text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Calculer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTool('text');
                    setStampText(`${calcInput} = ${calcResult}`);
                  }}
                  className="px-3 py-2 border border-[#0B6E8C] text-[#0B6E8C] text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Envoyer au tableau
                </button>
              </div>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
}
