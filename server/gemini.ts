import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

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

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
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
Every question must include a detailed "officialExplanation" showing step-by-step working and a practical "examinerTip".`;

  const prompt = `Create a ${count}-question exam paper:
- Curriculum / Exam System: ${input.curriculum}
- Subject: ${input.subject}
- Language: ${input.language}
- Difficulty Level: ${input.difficulty}
- Focus Topic: ${input.topic || 'Core Comprehensive Exam Syllabus'}

Ensure mathematical clarity (clean readable notation like x^2, sqrt(x), fractions a/b) and authentic Saudi international school context where relevant.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
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
    },
  });

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('EMPTY_GEMINI_RESPONSE');
  }

  const parsed = JSON.parse(rawText) as GeneratedExamPayload;
  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error('INVALID_GEMINI_STRUCTURE');
  }

  // Normalize question types and totalMarks
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
