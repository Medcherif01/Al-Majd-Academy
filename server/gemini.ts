import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import mammoth from 'mammoth';
import type { PastPaperItem, PastPaperQuestion } from './catalog.ts';

export interface GenerateExamInput {
  curriculum: string;
  subject: string;
  language: 'Français' | 'English' | 'العربية';
  difficulty: 'Standard' | 'Avancé / HL' | 'Intensif Examen';
  topic: string;
  questionCount: number;
}

export interface GeneratedExamPayload {
  title: string;
  officialRulesSummary: string;
  durationMinutes: number;
  totalMarks: number;
  questions: {
    number: number;
    questionType: 'mcq' | 'short_answer';
    prompt: string;
    options: string[];
    correctAnswer: string;
    points: number;
    officialExplanation: string;
    examinerTip: string;
  }[];
}

export interface ExtractPastPaperInput {
  fileBase64: string;
  mimeType: string;
  fileName: string;
  curriculum: PastPaperItem['curriculum'];
  subject: string;
  year: number;
  examDate: string;
  session: string;
  language: 'English' | 'Français' | 'العربية';
  priceSar: number;
  duration?: string;
  titleOverride?: string;
}

export interface ExtractedPastPaperPayload {
  title: string;
  code: string;
  duration: string;
  pages: number;
  officialRuleSummary: string;
  fullQuestions: PastPaperQuestion[];
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      apiVersion: 'v1beta',
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isTransientOrFallbackError(err: unknown): boolean {
  const raw =
    err instanceof Error
      ? `${err.message} ${JSON.stringify(err)}`
      : String(err ?? '');
  const upper = raw.toUpperCase();
  return (
    upper.includes('503') ||
    upper.includes('429') ||
    upper.includes('404') ||
    upper.includes('UNAVAILABLE') ||
    upper.includes('NOT_FOUND') ||
    upper.includes('RESOURCE_EXHAUSTED') ||
    upper.includes('HIGH DEMAND') ||
    upper.includes('OVERLOADED') ||
    upper.includes('TIMEOUT') ||
    upper.includes('ECONNRESET') ||
    upper.includes('EMPTY_GEMINI_RESPONSE')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GeminiUnavailableError extends Error {
  status = 503;
  constructor(message: string) {
    super(message);
    this.name = 'GeminiUnavailableError';
  }
}

/**
 * Calls Gemini with automatic model resilience:
 * Tries `gemini-4-hydrogen`, falls back immediately to `gemini-2.5-flash` (active low-latency
 * structured JSON & multimodal PDF model) and `gemini-3.1-flash-lite` whenever an upstream
 * model experiences 503 high-demand spikes.
 */
export async function generateContentWithResilience(
  ai: GoogleGenAI,
  params: {
    contents: string | Record<string, any> | Array<Record<string, any>>;
    systemInstruction?: string;
    useThinkingMedium?: boolean;
    responseMimeType?: string;
    responseSchema?: any;
  }
) {
  const attempts: {
    model: 'gemini-4-hydrogen' | 'gemini-2.5-flash' | 'gemini-3.1-flash-lite';
    delayMs: number;
    withThinking: boolean;
  }[] = [
    { model: 'gemini-4-hydrogen', delayMs: 0, withThinking: Boolean(params.useThinkingMedium) },
    { model: 'gemini-2.5-flash', delayMs: 150, withThinking: false },
    { model: 'gemini-3.1-flash-lite', delayMs: 300, withThinking: false },
    { model: 'gemini-2.5-flash', delayMs: 700, withThinking: false },
  ];

  let lastError: unknown = null;

  for (const attempt of attempts) {
    if (attempt.delayMs > 0) {
      await sleep(attempt.delayMs);
    }
    try {
      const config: Record<string, any> = {};
      if (attempt.withThinking && attempt.model === 'gemini-4-hydrogen') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.MEDIUM };
      }
      if (params.responseMimeType) {
        config.responseMimeType = params.responseMimeType;
      }
      if (params.responseSchema) {
        config.responseSchema = params.responseSchema;
      }

      let finalContents: any = params.contents;
      if (params.systemInstruction) {
        if (typeof params.contents === 'string') {
          finalContents = `${params.systemInstruction}\n\n${params.contents}`;
        } else if (Array.isArray(params.contents)) {
          finalContents = [{ text: params.systemInstruction }, ...params.contents];
        } else if (params.contents && Array.isArray(params.contents.parts)) {
          finalContents = {
            ...params.contents,
            parts: [{ text: params.systemInstruction }, ...params.contents.parts],
          };
        }
      }

      const response = await ai.models.generateContent({
        model: attempt.model,
        contents: finalContents,
        config,
      });

      const text = (response.text ?? '').trim();
      if (!text) {
        throw new Error('EMPTY_GEMINI_RESPONSE');
      }
      return response;
    } catch (err) {
      lastError = err;
      if (!isTransientOrFallbackError(err)) {
        throw err;
      }
      console.warn(
        `Gemini fallback from ${attempt.model}:`,
        (err as Error)?.message || err
      );
    }
  }

  if (isTransientOrFallbackError(lastError)) {
    throw new GeminiUnavailableError(
      'Le service Gemini connaît actuellement un pic de demande temporaire (503). Veuillez réessayer dans quelques secondes.'
    );
  }
  throw lastError instanceof Error ? lastError : new Error('Gemini generation failed');
}

export async function generateInternationalExam(input: GenerateExamInput): Promise<GeneratedExamPayload> {
  const ai = getGeminiClient();

  const count = Math.min(Math.max(Number(input.questionCount) || 4, 3), 8);

  const systemInstruction = `You are a senior international examination board author serving international and national schools in Saudi Arabia (Riyadh, Jeddah, Al Khobar).
Generate an authentic, rigorous exam paper strictly adhering to the official rules, formatting, command terms, and mark allocation style of the requested curriculum:
- American Digital SAT / AP: College Board style, realistic problem framing, Desmos/calculator policy, 4 crisp MCQ options (A, B, C, D) or short grid-in.
- IB Diploma (DP): IBO command terms ("State", "Calculate", "Determine", "Show that", "Evaluate"), explicit mark allocation, method & accuracy breakdown.
- Cambridge IGCSE / Edexcel A-Level: Significant figures, SI units, structured mark scheme points.
- Nafes (ETEC نافس): Saudi Education & Training Evaluation Commission national benchmark competencies in Reading, Math, and Science.
- Qudurat (GAT القدرات العامة) & Tahsili (SAAT التحصيلي): Qiyas quantitative comparisons, verbal analogies/comprehension, no-calculator rapid strategies.
- French Baccalauréat / AEFE: Rigorous French academic phrasing, theorem citations, structured step-by-step barème.

Output MUST be entirely in the requested language: "${input.language}".
For MCQ questions, provide exactly 4 clear answer choices in "options" and set "correctAnswer" to match one exact option string.
For short_answer questions, set "options" to an empty array [] and provide the exact canonical answer in "correctAnswer".
Every question must include a detailed "officialExplanation" showing step-by-step working and a practical "examinerTip".
MATHEMATICAL & SCIENTIFIC TYPOGRAPHY RULES:
- Never output messy raw LaTeX delimiters ($) or prose ASCII clutter.
- Use clear structured powers (`x^{2}`, `10^{-5}`, `e^{-2t}`), subscripts (`u_{n+1}`, `CO_{2}`, `H_{2}O`), fractions (`\\frac{a}{b}`), roots (`\\sqrt{x}`), and official mathematical symbols (`≤`, `≥`, `≠`, `×`, `÷`, `±`, `π`, `Δ`, `∑`, `∫`, `→`, `∈ ℝ`, `°`) so equations render cleanly as real academic notation.`;

  const prompt = `Create a ${count}-question exam paper:
- Curriculum / Exam System: ${input.curriculum}
- Subject: ${input.subject}
- Language: ${input.language}
- Difficulty Level: ${input.difficulty}
- Focus Topic: ${input.topic || 'Core Comprehensive Exam Syllabus'}

Ensure official mathematical & scientific formatting (real powers, subscripts, fractions, SI units) and authentic Saudi international school context where relevant.`;

  const response = await generateContentWithResilience(ai, {
    contents: prompt,
    systemInstruction,
    useThinkingMedium: true,
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Official-style title of the generated exam paper.' },
        officialRulesSummary: {
          type: Type.STRING,
          description: 'Concise summary of the official exam rules (calculator policy, timing, grading criteria).',
        },
        durationMinutes: { type: Type.INTEGER, description: 'Recommended duration in minutes.' },
        totalMarks: { type: Type.INTEGER, description: 'Sum of all question points.' },
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              number: { type: Type.INTEGER },
              questionType: { type: Type.STRING, description: 'Either "mcq" or "short_answer".' },
              prompt: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              correctAnswer: { type: Type.STRING },
              points: { type: Type.INTEGER },
              officialExplanation: { type: Type.STRING },
              examinerTip: { type: Type.STRING },
            },
            required: [
              'number',
              'questionType',
              'prompt',
              'options',
              'correctAnswer',
              'points',
              'officialExplanation',
              'examinerTip',
            ],
          },
        },
      },
      required: ['title', 'officialRulesSummary', 'durationMinutes', 'totalMarks', 'questions'],
    },
  });

  const rawText = (response.text ?? '').trim();
  const parsed = JSON.parse(rawText) as GeneratedExamPayload;
  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error('INVALID_GEMINI_STRUCTURE');
  }

  parsed.questions = parsed.questions.map((q, idx) => ({
    number: idx + 1,
    questionType: q.options && q.options.length >= 2 ? 'mcq' : 'short_answer',
    prompt: q.prompt,
    options: Array.isArray(q.options) ? q.options : [],
    correctAnswer: q.correctAnswer,
    points: Number(q.points) > 0 ? Number(q.points) : 2,
    officialExplanation: q.officialExplanation,
    examinerTip: q.examinerTip,
  }));

  parsed.totalMarks = parsed.questions.reduce((sum, q) => sum + q.points, 0);
  return parsed;
}

/**
 * Processes an uploaded PDF or Word (.docx) exam file with Gemini, faithfully reconstructing
 * the EXACT same exam verbatim (same questions, sub-questions, options, marks, and corrections),
 * preserving the exam date/year and subject so it can be published in HTML format.
 */
export async function extractExactPastPaperWithGemini(
  input: ExtractPastPaperInput
): Promise<ExtractedPastPaperPayload> {
  const ai = getGeminiClient();

  const lowerName = input.fileName.toLowerCase();
  const cleanBase64 = input.fileBase64.replace(/^data:[^;]+;base64,/, '').trim();
  const buffer = Buffer.from(cleanBase64, 'base64');

  const isPdf =
    input.mimeType === 'application/pdf' || lowerName.endsWith('.pdf');
  const isDocx =
    input.mimeType.includes('wordprocessingml') ||
    lowerName.endsWith('.docx');
  const isPlainText =
    input.mimeType.startsWith('text/') ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md');

  let extractedDocumentText = '';

  if (isDocx) {
    const res = await mammoth.extractRawText({ buffer });
    extractedDocumentText = (res.value || '').trim();
    if (!extractedDocumentText) {
      throw new Error('Le fichier Word (.docx) semble vide ou illisible.');
    }
  } else if (isPlainText) {
    extractedDocumentText = buffer.toString('utf8').trim();
    if (!extractedDocumentText) {
      throw new Error('Le fichier texte importé est vide.');
    }
  } else if (!isPdf) {
    // Attempt best-effort UTF-8 extraction for legacy .doc or reject clearly if binary gibberish
    const utf8 = buffer.toString('utf8').replace(/[^\x20-\x7E\u0600-\u06FF\u00C0-\u024F\n\r\t]/g, ' ').trim();
    if (utf8.length < 40) {
      throw new Error('Format non pris en charge. Veuillez importer un fichier PDF (.pdf) ou Word (.docx).');
    }
    extractedDocumentText = utf8;
  }

  const systemInstruction = `You are a meticulous academic archival transcriber for Al-Majd International Academy.
Your ONLY task is to convert the uploaded official exam document into a structured JSON representation of the EXACT SAME EXAM.

STRICT VERBATIM PRESERVATION RULES:
1. NEVER invent, alter, simplify, paraphrase, or substitute questions. Every question, sub-question (a, b, c...), multiple-choice option (A, B, C, D), numerical value, equation, and passage MUST match the uploaded document word-for-word.
2. Preserve the original question numbering and exact mark allocations.
3. If the document includes a mark scheme / correction / answer key, transcribe that exact official answer & working verbatim in "markScheme". Only if the document has no answer key provided, write a concise, mathematically accurate solution directly solving that exact verbatim question in "markScheme" and clearly note "Correction rédigée à partir de l'énoncé officiel".
4. Preserve the exact language of the exam (${input.language}).
5. Include all instructions/rules from the exam header in "officialRuleSummary".
6. For mathematical or scientific expressions in the document, preserve exact values using clean structured exponents (x^{2}, 10^{-5}), subscripts (u_{n}, CO_{2}), fractions (\\frac{a}{b}), roots (\\sqrt{x}), and official symbols (≤, ≥, ≠, ×, π, Δ, ∫, ∑) without raw "$" delimiters.`;

  const metadataHeader = `Document metadata supplied by the Teacher Admin:
- File Name: ${input.fileName}
- Category / Exam System: ${input.curriculum}
- Subject: ${input.subject}
- Exam Year: ${input.year}
- Exam Date / Session: ${input.examDate || input.session} (${input.session})
- Language: ${input.language}
${input.titleOverride ? `- Preferred Title: ${input.titleOverride}` : ''}

Extract ALL questions from the uploaded exam verbatim so it renders identically in HTML.`;

  const contents = isPdf
    ? {
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: cleanBase64,
            },
          },
          {
            text: `${metadataHeader}\n\nTranscribe EVERY question from this PDF exam verbatim into the JSON schema.`,
          },
        ],
      }
    : `${metadataHeader}\n\n--- UPLOADED EXAM DOCUMENT TEXT START ---\n${extractedDocumentText.slice(0, 45000)}\n--- UPLOADED EXAM DOCUMENT TEXT END ---\n\nTranscribe EVERY question from the text above verbatim into the JSON schema.`;

  const response = await generateContentWithResilience(ai, {
    contents,
    systemInstruction,
    useThinkingMedium: false,
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Exact exam title including subject and year/date.' },
        code: { type: Type.STRING, description: 'Short official exam reference code (e.g., IB-MATH-2024).' },
        duration: { type: Type.STRING, description: 'Exam duration string from header (e.g., 90 min).' },
        pages: { type: Type.INTEGER, description: 'Estimated page count.' },
        officialRuleSummary: {
          type: Type.STRING,
          description: 'Verbatim exam instructions, rules, calculator policy from the document header.',
        },
        fullQuestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              number: { type: Type.INTEGER },
              marks: { type: Type.INTEGER },
              prompt: {
                type: Type.STRING,
                description: 'Exact verbatim question text including any sub-parts and MCQ choices.',
              },
              markScheme: {
                type: Type.STRING,
                description: 'Official mark scheme / correction matching this exact question.',
              },
              examinerNote: {
                type: Type.STRING,
                description: 'Examiner marking note or common pitfall.',
              },
            },
            required: ['number', 'marks', 'prompt', 'markScheme', 'examinerNote'],
          },
        },
      },
      required: ['title', 'code', 'duration', 'pages', 'officialRuleSummary', 'fullQuestions'],
    },
  });

  const parsed = JSON.parse((response.text ?? '').trim()) as ExtractedPastPaperPayload;
  if (!Array.isArray(parsed.fullQuestions) || parsed.fullQuestions.length === 0) {
    throw new Error('Gemini n’a détecté aucune question exploitable dans ce document.');
  }

  return {
    title:
      (input.titleOverride && input.titleOverride.trim()) ||
      parsed.title ||
      `${input.subject} — ${input.curriculum} (${input.examDate || input.year})`,
    code:
      (parsed.code || `${input.curriculum.slice(0, 4)}-${input.year}`)
        .toUpperCase()
        .replace(/[^A-Z0-9_-]/g, '-')
        .slice(0, 24),
    duration: input.duration?.trim() || parsed.duration || '90 min',
    pages: Math.max(1, Number(parsed.pages) || Math.max(2, parsed.fullQuestions.length * 2)),
    officialRuleSummary:
      parsed.officialRuleSummary ||
      `${input.curriculum} · ${input.subject} · Date/Année : ${input.examDate || input.year}`,
    fullQuestions: parsed.fullQuestions.map((q, idx) => ({
      number: Number(q.number) || idx + 1,
      marks: Math.max(1, Number(q.marks) || 2),
      prompt: String(q.prompt || '').trim(),
      markScheme: String(q.markScheme || '').trim(),
      examinerNote: String(q.examinerNote || 'Conforme au barème officiel.').trim(),
    })),
  };
}

export async function evaluateWritingWithGemini(input: {
  track: string;
  prompt: string;
  content: string;
}): Promise<{ suggestedScore: number; feedback: string }> {
  const ai = getGeminiClient();
  const response = await generateContentWithResilience(ai, {
    contents: `You are an expert international exam writing grader (${input.track}).
Prompt: ${input.prompt}
Student Essay: ${input.content}

Grade on a 0-100 percentage scale (or IELTS/STEP equivalent converted to 0-100) and provide concise, actionable feedback covering structure, grammar/lexis, and official rubric alignment in the language of the essay.`,
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        suggestedScore: { type: Type.INTEGER },
        feedback: { type: Type.STRING },
      },
      required: ['suggestedScore', 'feedback'],
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim());
  return {
    suggestedScore: Math.min(100, Math.max(0, Number(parsed.suggestedScore) || 75)),
    feedback: String(parsed.feedback || 'Rédaction structurée. Poursuivez le travail sur les transitions académiques.'),
  };
}
