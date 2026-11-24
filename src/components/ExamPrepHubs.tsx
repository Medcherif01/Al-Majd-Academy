import { useState } from 'react';
import {
  Award,
  BookOpenCheck,
  Calculator,
  CheckCircle2,
  Compass,
  Flame,
  GraduationCap,
  Layers,
  PenTool,
  Send,
  Sparkles,
  Volume2,
  XCircle,
} from 'lucide-react';
import { apiRequest } from '../utils/api';
import type { PrepHubTab, UiLanguage } from '../types/academy';

interface ExamPrepHubsProps {
  lang: UiLanguage;
  activeTab: PrepHubTab;
  onSelectTab: (tab: PrepHubTab) => void;
  hideTabBar?: boolean;
  defaultStudentName?: string;
  onLaunchAiExam?: (curriculum: string) => void;
  onWritingSubmitted?: () => void;
}

interface DrillQuestion {
  id: string;
  tag: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const PREP_DRILLS: Record<'step' | 'gat' | 'nafes' | 'ielts' | 'skill-builder', DrillQuestion[]> = {
  step: [
    {
      id: 'step-1',
      tag: 'STEP · Structure & Grammar',
      prompt: 'Neither the coordinator nor the science teachers _____ informed about the rescheduled lab.',
      options: ['was', 'were', 'has been', 'is'],
      correctIndex: 1,
      explanation:
        'With "neither ... nor", the verb agrees with the nearest subject ("science teachers", plural -> "were").',
    },
    {
      id: 'step-2',
      tag: 'STEP · Academic Vocabulary',
      prompt: 'The committee decided to _____ the proposal until additional financial data could be verified.',
      options: ['defer', 'accelerate', 'publish', 'enforce'],
      correctIndex: 0,
      explanation: '"Defer" means to postpone or put off to a later time pending further review.',
    },
    {
      id: 'step-3',
      tag: 'STEP · Reading Inference',
      prompt: 'If a passage states that solar desalination remains "economically prohibitive outside coastal megaprojects", the author implies it is:',
      options: [
        'Too expensive for small inland towns today',
        'Completely impossible to engineer',
        'Banned in coastal cities',
        'Cheaper than fossil-fuel desalination',
      ],
      correctIndex: 0,
      explanation: '"Economically prohibitive" indicates excessive cost preventing widespread adoption.',
    },
  ],
  gat: [
    {
      id: 'gat-1',
      tag: 'GAT / Qudurat · Quantitative',
      prompt: 'A student scores an average of 82 across 4 tests. What score is needed on the 5th test to raise the average to 85?',
      options: ['94', '97', '92', '95'],
      correctIndex: 1,
      explanation: 'Target sum = 5 × 85 = 425. Current sum = 4 × 82 = 328. Needed = 425 − 328 = 97.',
    },
    {
      id: 'gat-2',
      tag: 'GAT / Qudurat · Ratio & Speed',
      prompt: 'If a car travels 180 km in 2.5 hours, at the same constant rate how long will 288 km take?',
      options: ['3.5 hours', '4.0 hours', '4.2 hours', '3.8 hours'],
      correctIndex: 1,
      explanation: 'Speed = 180 / 2.5 = 72 km/h. Time = 288 / 72 = 4.0 hours.',
    },
    {
      id: 'gat-3',
      tag: 'GAT · Verbal Analogy',
      prompt: 'COMPASS : NAVIGATION :: THERMOMETER : _____',
      options: ['Mercury', 'Temperature', 'Weather', 'Glass'],
      correctIndex: 1,
      explanation: 'A compass is an instrument that measures/guides navigation; a thermometer measures temperature.',
    },
  ],
  nafes: [
    {
      id: 'nafes-1',
      tag: 'NAFES · Grade 6/9 Mathematics',
      prompt: 'في اختبار نافس: إذا كانت نسبة البنين إلى البنات في نادٍ علمي 3 : 5 وكان عدد البنين 18، فكم إجمالي عدد الطلاب؟',
      options: ['30 طالباً', '48 طالباً', '42 طالباً', '36 طالباً'],
      correctIndex: 1,
      explanation: 'قيمة الجزء الواحد = 18 ÷ 3 = 6. إجمالي الأجزاء = 3 + 5 = 8. الإجمالي = 8 × 6 = 48 طالباً.',
    },
    {
      id: 'nafes-2',
      tag: 'NAFES · Grade 9 Science (ETEC)',
      prompt: 'أيّ عضية في الخلية النباتية مسؤولة عن تحويل الطاقة الضوئية إلى طاقة كيميائية؟',
      options: ['الميتوكوندريا', 'البلاستيدات الخضراء', 'جهاز جولجي', 'النواة'],
      correctIndex: 1,
      explanation: 'تتم عملية البناء الضوئي داخل البلاستيدات الخضراء لاحتوائها على الكلوروفيل.',
    },
    {
      id: 'nafes-3',
      tag: 'NAFES · Reading Comprehension',
      prompt: 'When an ETEC reading passage asks for the "main idea", which choice should you eliminate first?',
      options: [
        'A minor detail mentioned in only one sentence',
        'The overarching thesis supported by all paragraphs',
        'A summary matching the title',
        'A synthesis of the opening and conclusion',
      ],
      correctIndex: 0,
      explanation: 'Main-idea distractors in NAFES are almost always true details that are too narrow to cover the whole text.',
    },
  ],
  ielts: [
    {
      id: 'ielts-1',
      tag: 'IELTS Academic · Task 2 Coherence',
      prompt: 'Which opening best fits an IELTS Band 8 "Discuss both views and give your opinion" essay?',
      options: [
        'Nowadays technology is very good and bad in many ways.',
        'While some argue that remote schooling erodes peer collaboration, others highlight its flexibility; I contend that a hybrid model offers the strongest outcomes.',
        'In this essay I will write about remote learning.',
        'Everyone knows online schools are better.',
      ],
      correctIndex: 1,
      explanation:
        'A Band 8 introduction paraphrases both viewpoints concisely and presents a clear, nuanced thesis statement.',
    },
    {
      id: 'ielts-2',
      tag: 'IELTS · Academic Lexical Resource',
      prompt: 'Select the strongest academic replacement for "a lot of problems" in IELTS Writing Task 2:',
      options: [
        'tons of issues',
        'substantial logistical challenges',
        'very big troubles',
        'many bad things',
      ],
      correctIndex: 1,
      explanation: '"Substantial logistical challenges" demonstrates formal academic collocation and precision.',
    },
  ],
  'skill-builder': [
    {
      id: 'sb-1',
      tag: 'Skill Builder · Algebraic Modeling',
      prompt: 'If 3(2x − 4) = 18, what is the value of 4x − 1?',
      options: ['19', '20', '17', '15'],
      correctIndex: 0,
      explanation: '2x − 4 = 6 -> 2x = 10 -> x = 5. Then 4(5) − 1 = 19.',
    },
    {
      id: 'sb-2',
      tag: 'Skill Builder · Calculus Rate of Change',
      prompt: 'For f(x) = x³ − 4x, what is the instantaneous slope f′(2)?',
      options: ['4', '8', '12', '6'],
      correctIndex: 1,
      explanation: 'f′(x) = 3x² − 4. At x = 2, f′(2) = 3(4) − 4 = 8.',
    },
    {
      id: 'sb-3',
      tag: 'Skill Builder · Grammar Precision',
      prompt: 'The research team published its findings _____ demonstrated a 24% gain in reading fluency.',
      options: [', which', 'which', '; which', 'who'],
      correctIndex: 0,
      explanation: 'A non-restrictive relative clause modifying the entire preceding clause requires a comma before "which".',
    },
  ],
};

const PHONICS_CARDS = [
  {
    code: 'ai / ay',
    sound: '/eɪ/',
    rule: '"ai" appears in the middle of a syllable; "ay" appears at the end.',
    examples: ['train', 'explain', 'display', 'pathway'],
    level: 'Grades 3–4 · Decoding',
  },
  {
    code: 'tion / sion',
    sound: '/ʃən/',
    rule: 'Academic suffix turning verbs into nouns (stress stays before the suffix).',
    examples: ['equation', 'fraction', 'comprehension', 'solution'],
    level: 'Grades 4–5 · Morphology',
  },
  {
    code: 'ph / gh',
    sound: '/f/',
    rule: 'Greek-origin "ph" and final "gh" in words like graph, physics, enough.',
    examples: ['phonics', 'photograph', 'paragraph', 'rough'],
    level: 'Grades 3–5 · Spelling',
  },
  {
    code: 'oa / ow',
    sound: '/oʊ/',
    rule: 'Long O vowel teams used across academic and scientific terms.',
    examples: ['approach', 'floating', 'growth', 'shadow'],
    level: 'Grades 3–4 · Fluency',
  },
];

const STANDARDS_MATRIX = [
  {
    code: 'NAFES',
    authority: 'ETEC · Saudi Arabia',
    grades: 'Grades 3, 6, 9',
    subjects: 'Arabic Reading, Mathematics, Science',
    scale: '4 Proficiency Bands',
    rules: 'No calculator in foundational arithmetic sections; competency-based reasoning.',
  },
  {
    code: 'Qudurat / GAT',
    authority: 'Qiyas / ETEC',
    grades: 'Grades 10–12',
    subjects: 'Quantitative & Verbal (AR / EN)',
    scale: '0 – 100 Percentile',
    rules: 'Strict 1 minute/question pacing; zero calculator permitted; mental estimation critical.',
  },
  {
    code: 'STEP',
    authority: 'Qiyas / ETEC',
    grades: 'Grades 10–12 & Univ.',
    subjects: 'Reading, Structure, Listening, Compositional Analysis',
    scale: '0 – 100 (Univ. req. 60–83+)',
    rules: 'Computer-based adaptive sections; grammar precision & academic inference.',
  },
  {
    code: 'IELTS Academic',
    authority: 'British Council / IDP',
    grades: 'Grades 10–12',
    subjects: 'Listening, Reading, Writing Tasks 1 & 2, Speaking',
    scale: 'Band 1.0 – 9.0',
    rules: 'Task 1 (min 150 words data analysis) + Task 2 (min 250 words argumentative essay).',
  },
  {
    code: 'Digital SAT / AP',
    authority: 'College Board',
    grades: 'Grades 9–12',
    subjects: 'Adaptive Reading/Writing & Math (Desmos)',
    scale: '400 – 1600 / AP 1–5',
    rules: '2 adaptive modules per section; built-in Desmos graphing calculator allowed throughout Math.',
  },
  {
    code: 'IB Diploma',
    authority: 'IBO Geneva',
    grades: 'Grades 11–12',
    subjects: '6 Groups (HL/SL) + TOK + EE',
    scale: '1 – 7 per subject (45 max)',
    rules: 'Paper 1 non-calculator (Math AA); Paper 2 & 3 GDC allowed; formal mathematical rigor.',
  },
  {
    code: 'IGCSE / A-Level',
    authority: 'Cambridge / Edexcel',
    grades: 'Grades 9–12',
    subjects: 'Core & Extended (0580, 0625, 9709)',
    scale: 'A* – G / 9 – 1',
    rules: 'Working marks (M1/A1) require explicit intermediate steps; 3 sig. fig. rounding.',
  },
  {
    code: 'Bac Français',
    authority: 'AEFE / Éducation Nationale',
    grades: 'Seconde – Terminale',
    subjects: 'Spécialités Maths, Physique-Chimie, Français',
    scale: '0 – 20 (Mentions AB/B/TB)',
    rules: 'Rédaction rigoureuse en français académique; justification complète de chaque théorème.',
  },
];

export function ExamPrepHubs({
  lang,
  activeTab,
  onSelectTab,
  hideTabBar = false,
  defaultStudentName = '',
  onLaunchAiExam,
  onWritingSubmitted,
}: ExamPrepHubsProps) {
  const [pickedAnswers, setPickedAnswers] = useState<Record<string, number>>({});
  const [checkedQuestions, setCheckedQuestions] = useState<Record<string, boolean>>({});
  const [phonicsQuizIdx, setPhonicsQuizIdx] = useState<number | null>(null);
  const [phonicsChecked, setPhonicsChecked] = useState(false);

  // Student Writing Practice State
  const [studentName, setStudentName] = useState(defaultStudentName);
  const [grade, setGrade] = useState('Grade 11');
  const [track, setTrack] = useState('IELTS Academic Task 2');
  const [teacherId, setTeacherId] = useState<'marwan' | 'mohamed'>('marwan');
  const [promptText, setPromptText] = useState(
    'Some schools in Saudi Arabia are adopting AI-assisted learning labs alongside traditional classrooms. Discuss the benefits and risks, and give your own opinion.'
  );
  const [essayContent, setEssayContent] = useState('');
  const [submittingEssay, setSubmittingEssay] = useState(false);
  const [essaySuccess, setEssaySuccess] = useState('');
  const [essayError, setEssayError] = useState('');

  const tabs: { id: PrepHubTab; label: string }[] = [
    { id: 'standards', label: 'Standards' },
    { id: 'step', label: 'STEP prep' },
    { id: 'gat', label: 'GAT prep' },
    { id: 'nafes', label: 'NAFES prep' },
    { id: 'ielts', label: 'IELTS prep' },
    { id: 'phonics', label: 'Phonics' },
    { id: 'skill-builder', label: 'Skill builder' },
    {
      id: 'writing-practice',
      label: lang === 'ar' ? 'تسليم مقال للمراجعة' : lang === 'en' ? 'Submit Writing' : 'Rédaction & Correction',
    },
  ];

  const isDrillTab =
    activeTab === 'step' ||
    activeTab === 'gat' ||
    activeTab === 'nafes' ||
    activeTab === 'ielts' ||
    activeTab === 'skill-builder';

  const currentDrills = isDrillTab ? PREP_DRILLS[activeTab] : [];
  const totalCheckedInTab = currentDrills.filter((q) => checkedQuestions[q.id]).length;
  const totalCorrectInTab = currentDrills.filter(
    (q) => checkedQuestions[q.id] && pickedAnswers[q.id] === q.correctIndex
  ).length;

  const wordCount = essayContent.trim() ? essayContent.trim().split(/\s+/).length : 0;

  const handleSubmitWriting = async (e: React.FormEvent) => {
    e.preventDefault();
    setEssayError('');
    setEssaySuccess('');
    setSubmittingEssay(true);
    try {
      await apiRequest('/api/teacher/writing/submit', {
        method: 'POST',
        body: {
          teacherId,
          studentName: studentName.trim() || 'Youssef Al-Harbi',
          grade,
          track,
          prompt: promptText,
          content: essayContent,
        },
      });
      setEssayContent('');
      setEssaySuccess(
        lang === 'ar'
          ? 'تم إرسال مقالك بنجاح إلى قائمة المراجعة لدى المدرب.'
          : lang === 'en'
            ? 'Your essay has been sent to the Teacher Portal ("Writing to review") for grading.'
            : 'Votre rédaction a été transmise au Portail Formateur (« Writing to review ») pour correction.'
      );
      if (onWritingSubmitted) onWritingSubmitted();
    } catch (err: any) {
      setEssayError(err.message || 'Erreur lors de l’envoi.');
    } finally {
      setSubmittingEssay(false);
    }
  };

  return (
    <div className="space-y-6">
      {!hideTabBar && (
        <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#0B6E8C] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 1. STANDARDS MATRIX */}
      {activeTab === 'standards' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="text-xs font-semibold text-[#0B6E8C] mb-1 flex items-center gap-1.5">
                <Compass className="w-4 h-4" />
                <span>Standards &amp; Official Examination Rules · KSA &amp; International</span>
              </div>
              <h3 className="font-display text-2xl font-semibold text-[#0F2537]">
                {lang === 'ar'
                  ? 'مصفوفة المعايير الرسمية للاختبارات المعتمدة'
                  : lang === 'en'
                    ? 'Official Examination Standards Matrix'
                    : 'Référentiel Officiel des Examens (Arabie Saoudite & International)'}
              </h3>
            </div>
            {onLaunchAiExam && (
              <button
                type="button"
                onClick={() => onLaunchAiExam('NAFES / نافس (ETEC)')}
                className="px-4 py-2.5 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'توليد اختبار معياري' : lang === 'en' ? 'Generate Standard Exam' : 'Générer un Sujet IA'}</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-3 font-semibold">Exam / Program</th>
                  <th className="py-3 px-3 font-semibold">Board</th>
                  <th className="py-3 px-3 font-semibold">Grades</th>
                  <th className="py-3 px-3 font-semibold">Scoring Scale</th>
                  <th className="py-3 px-3 font-semibold">Official Rules</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {STANDARDS_MATRIX.map((row) => (
                  <tr key={row.code} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-3 font-semibold text-[#0F2537] whitespace-nowrap">
                      {row.code}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-600 whitespace-nowrap">{row.authority}</td>
                    <td className="py-3.5 px-3 text-xs text-slate-700 font-mono tabular-nums whitespace-nowrap">
                      {row.grades}
                    </td>
                    <td className="py-3.5 px-3 text-xs font-medium text-[#0B6E8C] whitespace-nowrap">
                      {row.scale}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-600 max-w-md">{row.rules}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. INTERACTIVE DRILL HUBS (STEP, GAT, NAFES, IELTS, SKILL BUILDER) */}
      {isDrillTab && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <div className="text-xs font-semibold text-[#0B6E8C] mb-1 flex items-center gap-1.5 uppercase tracking-wide">
                {activeTab === 'gat' ? (
                  <Calculator className="w-4 h-4" />
                ) : activeTab === 'skill-builder' ? (
                  <Flame className="w-4 h-4" />
                ) : (
                  <BookOpenCheck className="w-4 h-4" />
                )}
                <span>{activeTab.replace('-', ' ')} Practice Lab</span>
              </div>
              <h3 className="font-display text-2xl font-semibold text-[#0F2537]">
                {activeTab === 'step' && 'Qiyas STEP · Structure, Vocabulary & Academic Reading'}
                {activeTab === 'gat' && 'GAT / Qudurat · Quantitative Speed & Verbal Analogies'}
                {activeTab === 'nafes' && 'NAFES (ETEC) · National Mastery Drills (Math, Science, Reading)'}
                {activeTab === 'ielts' && 'IELTS Academic · Band 7.5+ Writing & Lexical Precision'}
                {activeTab === 'skill-builder' && 'Skill Builder · High-Frequency Core Competency Drills'}
              </h3>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-xs text-slate-600 font-mono tabular-nums">
                Score: <strong className="text-[#0B6E8C]">{totalCorrectInTab}</strong> / {totalCheckedInTab || currentDrills.length}
              </div>
              {onLaunchAiExam && (
                <button
                  type="button"
                  onClick={() =>
                    onLaunchAiExam(
                      activeTab === 'nafes'
                        ? 'NAFES / نافس (ETEC)'
                        : activeTab === 'gat'
                          ? 'Qudurat & Tahsili (قياس)'
                          : 'IB Diploma (DP)'
                    )
                  }
                  className="px-4 py-2 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'توليد أسئلة إضافية' : lang === 'en' ? 'More via Gemini AI' : 'Plus via Gemini IA'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-5">
            {currentDrills.map((q, idx) => {
              const picked = pickedAnswers[q.id];
              const isChecked = checkedQuestions[q.id];
              const isCorrect = picked === q.correctIndex;

              return (
                <div
                  key={q.id}
                  dir={q.prompt.match(/[\u0600-\u06FF]/) ? 'rtl' : 'ltr'}
                  className="p-5 rounded-xl border border-slate-200 bg-[#F8FAFC] space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-[#0B6E8C]">
                      0{idx + 1} · {q.tag}
                    </span>
                    {isChecked && (
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          isCorrect ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {isCorrect ? 'Correct' : 'À revoir'}
                      </span>
                    )}
                  </div>

                  <p className="text-sm sm:text-base font-medium text-[#0F2537] leading-relaxed">
                    {q.prompt}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.options.map((opt, optIdx) => {
                      const active = picked === optIdx;
                      let cls = 'bg-white border-slate-200 text-slate-800 hover:border-[#0B6E8C]';
                      if (isChecked) {
                        if (optIdx === q.correctIndex) {
                          cls = 'bg-emerald-50 border-emerald-600 text-emerald-950 font-semibold';
                        } else if (active) {
                          cls = 'bg-rose-50 border-rose-400 text-rose-900';
                        }
                      } else if (active) {
                        cls = 'bg-[#E6F3F7] border-[#0B6E8C] text-[#0F2537] font-semibold';
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => {
                            setPickedAnswers((prev) => ({ ...prev, [q.id]: optIdx }));
                            setCheckedQuestions((prev) => ({ ...prev, [q.id]: false }));
                          }}
                          className={`text-start px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm transition-colors cursor-pointer ${cls}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-1">
                    <button
                      type="button"
                      disabled={picked === undefined}
                      onClick={() => setCheckedQuestions((prev) => ({ ...prev, [q.id]: true }))}
                      className="px-4 py-1.5 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-xs font-semibold rounded-lg disabled:opacity-40 cursor-pointer"
                    >
                      {lang === 'ar' ? 'تحقق' : lang === 'en' ? 'Check Answer' : 'Vérifier'}
                    </button>
                  </div>

                  {isChecked && (
                    <div className="p-3.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 leading-relaxed">
                      <strong className="text-[#0F2537]">Explication : </strong>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. PHONICS LAB */}
      {activeTab === 'phonics' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <div className="text-xs font-semibold text-[#0B6E8C] mb-1 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4" />
              <span>Grades 3–5 · Foundational Decoding &amp; Fluency</span>
            </div>
            <h3 className="font-display text-2xl font-semibold text-[#0F2537]">
              Phonics &amp; Academic Word Decoding Studio
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PHONICS_CARDS.map((card) => (
              <div key={card.code} className="p-5 rounded-xl border border-slate-200 bg-[#F8FAFC] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-lg font-semibold text-[#0B6E8C]">{card.code}</span>
                  <span className="font-mono text-xs text-slate-500">{card.sound} · {card.level}</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{card.rule}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {card.examples.map((ex) => (
                    <span
                      key={ex}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium text-[#0F2537]"
                    >
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="text-xs font-semibold text-[#0B6E8C]">Quick Decoding Check</div>
            <p className="text-sm font-medium text-[#0F2537]">
              Which word contains the Greek consonant digraph <span className="font-mono font-semibold">/f/</span>?
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['chapter', 'photograph', 'station', 'pathway'].map((w, i) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    setPhonicsQuizIdx(i);
                    setPhonicsChecked(true);
                  }}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer ${
                    phonicsChecked && i === 1
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
                      : phonicsChecked && phonicsQuizIdx === i
                        ? 'bg-rose-50 border-rose-400 text-rose-900'
                        : 'bg-[#F8FAFC] border-slate-200 text-slate-800 hover:border-[#0B6E8C]'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. STUDENT WRITING SUBMISSION -> GOES DIRECTLY TO TEACHER PORTAL */}
      {activeTab === 'writing-practice' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <div className="text-xs font-semibold text-[#0B6E8C] mb-1 flex items-center gap-1.5">
              <PenTool className="w-4 h-4" />
              <span>Soumission Directe · Portail Formateur</span>
            </div>
            <h3 className="font-display text-2xl font-semibold text-[#0F2537]">
              {lang === 'ar'
                ? 'أرسل مقالك للتصحيح من قبل المدرب'
                : lang === 'en'
                  ? 'Submit an Essay for Teacher Review'
                  : 'Envoyer une Rédaction à votre Formateur'}
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              {lang === 'ar'
                ? 'تظهر كتابتك فوراً في تبويب (Writing to review) لدى الأستاذ مروان أو الأستاذ محمد.'
                : lang === 'en'
                  ? 'Your draft immediately enters the Teacher Portal "Writing to review" queue for rubric scoring and feedback.'
                  : 'Votre copie apparaît immédiatement dans l’onglet « Writing to review » de Marwan Mhamdi ou Mohamed Cherif.'}
            </p>
          </div>

          {essaySuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
              {essaySuccess}
            </div>
          )}
          {essayError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-900">
              {essayError}
            </div>
          )}

          <form onSubmit={handleSubmitWriting} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'اسم الطالب' : lang === 'en' ? 'Student Name' : 'Nom de l’élève'}
                </label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Youssef Al-Harbi"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Grade / Classe</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                >
                  <option value="Grade 6">Grade 6</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Exam Track</label>
                <select
                  value={track}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTrack(val);
                    if (val.includes('Bac') || val.includes('Arabe')) setTeacherId('mohamed');
                    else setTeacherId('marwan');
                  }}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                >
                  <option value="IELTS Academic Task 2">IELTS Academic Task 2</option>
                  <option value="STEP Essay Practice">STEP Essay Practice</option>
                  <option value="Digital SAT Rhetoric">Digital SAT Rhetoric</option>
                  <option value="Bac Français Dissertation">Bac Français Dissertation</option>
                  <option value="تعبير عربي / نافس">تعبير عربي / نافس</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Formateur</label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value as 'marwan' | 'mohamed')}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                >
                  <option value="marwan">Mr. Marwan Mhamdi (EN)</option>
                  <option value="mohamed">M. Mohamed Cherif (FR/AR)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject / Prompt</label>
              <input
                type="text"
                required
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Your Draft</span>
                <span className="font-mono text-[#0B6E8C] tabular-nums">{wordCount} words</span>
              </div>
              <textarea
                rows={7}
                required
                value={essayContent}
                onChange={(e) => setEssayContent(e.target.value)}
                placeholder="Write your academic essay or structured paragraph here..."
                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
              />
            </div>

            <button
              type="submit"
              disabled={submittingEssay}
              className="px-6 py-2.5 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {submittingEssay
                  ? '...'
                  : lang === 'ar'
                    ? 'إرسال للمعلم'
                    : lang === 'en'
                      ? 'Submit to Teacher Review'
                      : 'Envoyer au formateur'}
              </span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
