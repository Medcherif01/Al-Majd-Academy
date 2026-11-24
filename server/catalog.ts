export interface PastPaperQuestion {
  number: number;
  marks: number;
  prompt: string;
  markScheme: string;
  examinerNote: string;
}

export interface PastPaperItem {
  id: string;
  code: string;
  title: string;
  curriculum: 'American (SAT/AP)' | 'IB Diploma' | 'IGCSE & A-Level' | 'Nafes (ETEC)' | 'Qudurat & Tahsili' | 'Bac Français';
  subject: string;
  year: number;
  session: string;
  language: 'English' | 'Français' | 'العربية';
  pages: number;
  duration: string;
  priceSar: number;
  officialRuleSummary: string;
  freePreview: PastPaperQuestion;
  fullQuestions: PastPaperQuestion[];
}

export const ALL_ACCESS_PASS_PRICE_SAR = 290;

export const PAST_PAPERS_CATALOG: PastPaperItem[] = [
  {
    id: 'sat-math-2025-intl',
    code: 'SAT-M-2025-KSA',
    title: 'Digital SAT Mathematics — Module 1 & 2 (Adaptive Hard)',
    curriculum: 'American (SAT/AP)',
    subject: 'Mathematics',
    year: 2025,
    session: 'March International',
    language: 'English',
    pages: 28,
    duration: '70 min',
    priceSar: 45,
    officialRuleSummary: 'College Board Digital SAT Rules: Built-in Desmos graphing calculator permitted on all questions; grid-in Student-Produced Responses accept decimals/fractions up to 5 characters.',
    freePreview: {
      number: 1,
      marks: 1,
      prompt:
        'In the xy-plane, the graph of y = 3x^2 - 18x + k intersects the x-axis at exactly one point. What is the value of k?',
      markScheme:
        'For a quadratic ax^2 + bx + c = 0 to intersect the x-axis at exactly one point, the discriminant b^2 - 4ac = 0. Here (-18)^2 - 4(3)(k) = 0 => 324 - 12k = 0 => k = 27.',
      examinerNote: 'Common error: setting the vertex x-coordinate x = 3 as k instead of substituting back or using the discriminant.',
    },
    fullQuestions: [
      {
        number: 1,
        marks: 1,
        prompt:
          'In the xy-plane, the graph of y = 3x^2 - 18x + k intersects the x-axis at exactly one point. What is the value of k?',
        markScheme: 'Discriminant b^2 - 4ac = 0 => 324 - 12k = 0 => k = 27.',
        examinerNote: 'Verify quickly using vertex form: 3(x - 3)^2 = 3x^2 - 18x + 27.',
      },
      {
        number: 2,
        marks: 1,
        prompt:
          'A Riyadh solar microgrid increases output by 12% in Year 1 and decreases by 10% in Year 2. If the final output is 504 MWh, what was the initial output?',
        markScheme: 'Initial * 1.12 * 0.90 = 504 => Initial * 1.008 = 504 => Initial = 500 MWh.',
        examinerNote: 'Never add percentages (+12% - 10% = +2%). Always multiply growth factors.',
      },
      {
        number: 3,
        marks: 1,
        prompt:
          'Line p has equation 4x - 5y = 20. Line q is perpendicular to line p and passes through (8, 3). What is the y-intercept of line q?',
        markScheme: 'Slope of p is 4/5, so slope of q is -5/4. Equation: y - 3 = (-5/4)(x - 8) => y = (-5/4)x + 13. The y-intercept is (0, 13).',
        examinerNote: 'SAT accepts 13 for grid-in questions asking for the value of b in (0, b).',
      },
      {
        number: 4,
        marks: 1,
        prompt:
          'If (2x + 5)/(x - 3) = a + b/(x - 3) for all x != 3, what is the value of a + b?',
        markScheme: 'Rewrite numerator: 2(x - 3) + 11 = 2x + 5. Thus (2x + 5)/(x - 3) = 2 + 11/(x - 3), giving a = 2, b = 11, and a + b = 13.',
        examinerNote: 'Polynomial long division or strategic substitution (x = 4 gives 13 = a + b directly!).',
      },
    ],
  },
  {
    id: 'ib-math-aa-hl-2024',
    code: 'IB-AAHL-P1-2024',
    title: 'IB DP Mathematics AA HL — Paper 1 (No Calculator) & Markscheme',
    curriculum: 'IB Diploma',
    subject: 'Mathematics AA HL',
    year: 2024,
    session: 'May TZ2 (Middle East)',
    language: 'English',
    pages: 34,
    duration: '120 min',
    priceSar: 55,
    officialRuleSummary: 'IBO Paper 1 Rules: Technology/GDC strictly prohibited. Full working required for M1/A1/R1 method & reasoning marks; exact values (pi, e, surds) mandatory.',
    freePreview: {
      number: 1,
      marks: 6,
      prompt:
        'Using mathematical induction, prove that sum_{r=1}^{n} r(r!) = (n+1)! - 1 for all positive integers n >= 1.',
      markScheme:
        'M1 Base case n=1: LHS = 1(1!) = 1, RHS = 2! - 1 = 1 (True). M1 Assume true for n=k: sum_{r=1}^{k} r(r!) = (k+1)! - 1. M1 For n=k+1: [(k+1)! - 1] + (k+1)(k+1)! = (k+1)!(1 + k + 1) - 1 = (k+2)! - 1. R1 Conclusion statement referencing base case and inductive step.',
      examinerNote: 'R1 reasoning mark is frequently lost when candidates omit the explicit closing statement linking n=1 and n=k => n=k+1.',
    },
    fullQuestions: [
      {
        number: 1,
        marks: 6,
        prompt: 'Using mathematical induction, prove that sum_{r=1}^{n} r(r!) = (n+1)! - 1 for all positive integers n >= 1.',
        markScheme: 'M1 Base case n=1; M1 Inductive hypothesis; A1 Algebraic factoring (k+1)!(1 + k + 1) - 1; A1 = (k+2)! - 1; R1 Full formal conclusion.',
        examinerNote: 'State clearly "Assume true for n = k" (not "Let n = k").',
      },
      {
        number: 2,
        marks: 7,
        prompt: 'Let f(x) = ln(x^2 - 4x + 5). Find the minimum value of f(x) and determine the area enclosed by y = f(x), the x-axis, and lines x = 1, x = 3 (leave in terms of integral or symmetry).',
        markScheme: 'M1 Complete the square: x^2 - 4x + 5 = (x - 2)^2 + 1 >= 1. A1 Since ln is strictly increasing, min occurs at x=2 with f(2) = ln(1) = 0. M1/A1 Symmetry around x=2; evaluate integral using integration by parts.',
        examinerNote: 'Notice ln(1) = 0 gives an immediate exact minimum without needing second derivative testing, though f\'\'(2) > 0 also earns credit.',
      },
      {
        number: 3,
        marks: 8,
        prompt: 'Find the complex roots of z^4 + 4 = 0 in the form a + bi, and plot them on an Argand diagram.',
        markScheme: 'M1 Write -4 = 4 cis(pi + 2kpi). A1 r = sqrt(2). A2 Arguments: pi/4, 3pi/4, -3pi/4, -pi/4. A2 Roots: 1+i, -1+i, -1-i, 1-i. A2 Argand diagram showing circle radius sqrt(2) and symmetric vertices.',
        examinerNote: 'Candidates must label axes Re(z) and Im(z) on the Argand diagram.',
      },
    ],
  },
  {
    id: 'igcse-physics-0625-2024',
    code: 'CAIE-0625-42-2024',
    title: 'Cambridge IGCSE Physics (0625) — Paper 4 Extended + Mark Scheme',
    curriculum: 'IGCSE & A-Level',
    subject: 'Physics',
    year: 2024,
    session: 'May/June Variant 2 (KSA)',
    language: 'English',
    pages: 26,
    duration: '75 min',
    priceSar: 45,
    officialRuleSummary: 'Cambridge Assessment Rules: Answers to 2 or 3 significant figures; state formulas clearly before substitution; include SI units for every final quantity.',
    freePreview: {
      number: 1,
      marks: 5,
      prompt:
        'A train of mass 4.2 x 10^5 kg accelerates uniformly from rest to 30 m/s in 45 s along a straight horizontal track. (a) Calculate the acceleration. (b) Calculate the resultant force acting on the train.',
      markScheme:
        '(a) a = (v - u)/t = (30 - 0)/45 = 0.67 m/s^2 (accept 0.667 m/s^2) [2 marks: formula + value/unit]. (b) F = ma = 4.2 x 10^5 x 0.667 = 2.8 x 10^5 N [3 marks: formula, substitution, answer + N].',
      examinerNote: 'Avoid premature rounding: use 30/45 (0.6667) in part (b) to obtain exact 2.8 x 10^5 N.',
    },
    fullQuestions: [
      {
        number: 1,
        marks: 5,
        prompt: 'A train of mass 4.2 x 10^5 kg accelerates uniformly from rest to 30 m/s in 45 s. Calculate (a) acceleration, (b) resultant force.',
        markScheme: '(a) a = 0.67 m/s^2 (2 marks). (b) F = ma = 2.8 x 10^5 N (3 marks).',
        examinerNote: 'Always write SI units.',
      },
      {
        number: 2,
        marks: 6,
        prompt: 'Explain, in terms of molecules, why the pressure of a fixed mass of gas increases when its temperature increases at constant volume.',
        markScheme: '1. Average kinetic energy / speed of molecules increases. 2. Molecules collide with container walls more frequently. 3. Each collision exerts a greater force (greater momentum change per collision). 4. Pressure = Force / Area increases.',
        examinerNote: 'Never say "molecules expand" or "collide with each other more"—Cambridge awards marks specifically for wall collisions.',
      },
    ],
  },
  {
    id: 'nafes-grade9-math-2025',
    code: 'ETEC-NAFES-G9-2025',
    title: 'اختبار نافس الوطني (NAFIS) — الرياضيات والعلوم الصف الثالث متوسط + الحل النموذجي',
    curriculum: 'Nafes (ETEC)',
    subject: 'الرياضيات والعلوم',
    year: 2025,
    session: 'الدورة الوطنية - هيئة تقويم التعليم',
    language: 'العربية',
    pages: 24,
    duration: '60 min',
    priceSar: 40,
    officialRuleSummary: 'ضوابط هيئة تقويم التعليم والتدريب (ETEC): قياس الفهم المفاهيمي وحل المشكلات دون آلة حاسبة، وفق مؤشرات نافس المعتمدة في مدارس المملكة.',
    freePreview: {
      number: 1,
      marks: 2,
      prompt:
        'خزان مياه على شكل أسطوانة نصف قطر قاعدتها 2 م وارتفاعها 3.5 م. ما حجم الخزان بالمتر المكعب؟ (اعتبر ط = 22/7)',
      markScheme:
        'حجم الأسطوانة = ط × نق^2 × ع = (22/7) × 4 × 3.5 = (22/7) × 14 = 44 م^3.',
      examinerNote: 'ملاحظة المصحح: تبسيط 3.5 × 4 = 14 قبل الضرب في 22/7 يختصر الوقت ويمنع الأخطاء الحسابية.',
    },
    fullQuestions: [
      {
        number: 1,
        marks: 2,
        prompt: 'خزان مياه على شكل أسطوانة نصف قطر قاعدتها 2 م وارتفاعها 3.5 م. ما حجم الخزان بالمتر المكعب؟ (ط = 22/7)',
        markScheme: 'الحجم = ط × نق^2 × ع = (22/7) × 4 × 3.5 = 44 م^3.',
        examinerNote: 'تأكد من عدم الخلط بين نصف القطر والقطر الكامل.',
      },
      {
        number: 2,
        marks: 2,
        prompt: 'في تجربة علمية لقياس معدل البناء الضوئي، تم تقريب مصباح من نبات مائي. أي مما يلي يصف التغير المتوقع في عدد فقاعات الأكسجين؟',
        markScheme: 'يزداد عدد فقاعات الأكسجين بزيادة شدة الإضاءة حتى يصل إلى حد التشبع حيث يثبت المعدل بسبب العوامل المحددة الأخرى مثل CO2.',
        examinerNote: 'أسئلة نافس تركز على ربط المتغير المستقل بالمتغير التابع وتفسير المنحنى البياني.',
      },
      {
        number: 3,
        marks: 2,
        prompt: 'إذا كان الوسط الحسابي لخمسة أعداد هو 18، وأضيف إليها عدد سادس فأصبح الوسط 20، فما قيمة العدد السادس؟',
        markScheme: 'مجموع الأعداد الخمسة = 5 × 18 = 90. مجموع الستة أعداد = 6 × 20 = 120. العدد السادس = 120 - 90 = 30.',
        examinerNote: 'استخدم قاعدة (المجموع = الوسط × العدد) مباشرة في اختبارات نافس.',
      },
    ],
  },
  {
    id: 'qudurat-quant-verbal-2025',
    code: 'QIYAS-GAT-2025-AR',
    title: 'تجميعات القدرات العامة (Qudurat الكمي واللفظي) + استراتيجيات الحل السريع',
    curriculum: 'Qudurat & Tahsili',
    subject: 'القدرات العامة (كمي + لفظي)',
    year: 2025,
    session: 'قياس المحوسب - نماذج محدثة',
    language: 'العربية',
    pages: 42,
    duration: '120 min',
    priceSar: 50,
    officialRuleSummary: 'ضوابط المركز الوطني للقياس (Qiyas): يُمنع استخدام الآلة الحاسبة؛ الوقت المخصص ~60 ثانية لكل سؤال؛ يشمل التناظر اللفظي، استيعاب المقروء، والمقارنات الكمية.',
    freePreview: {
      number: 1,
      marks: 1,
      prompt:
        'مقارنة كمية: قارن بين القيمة الأولى: (0.2 × 0.2 × 0.2) والقيمة الثانية: (0.008). (أ) الأولى أكبر (ب) الثانية أكبر (ج) القيمتان متساويتان (د) المعطيات غير كافية.',
      markScheme:
        'الإجابة (ج) القيمتان متساويتان. لأن 2 × 2 × 2 = 8، ونضع الفاصلة بعد ثلاث خانات عشرية فيكون الناتج 0.008.',
      examinerNote: 'انتبه لعدّ الخانات العشرية بعد الفاصلة بدقة في مسائل الضرب العشري بدون آلة حاسبة.',
    },
    fullQuestions: [
      {
        number: 1,
        marks: 1,
        prompt: 'مقارنة كمية: القيمة الأولى (0.2 × 0.2 × 0.2) والقيمة الثانية (0.008).',
        markScheme: 'الإجابة (ج) القيمتان متساويتان: 0.2^3 = 0.008.',
        examinerNote: 'تُحسب الخانات العشرية بجمع عدد الخانات في كل عامل (1+1+1 = 3 خانات).',
      },
      {
        number: 2,
        marks: 1,
        prompt: 'تناظر لفظي: (غمد : سيف). اختر العلاقة المماثلة: (أ) عرين : أسد (ب) كتاب : صفحة (ج) قلم : حبر (د) تاج : ملك.',
        markScheme: 'الإجابة (أ) عرين : أسد. العلاقة مكانية (الغمد مسكن/موضع السيف كما العرين مسكن الأسد) وبنفس الترتيب (المكان أولاً).',
        examinerNote: 'تحقق دائماً من اتجاه العلاقة من اليمين إلى اليسار.',
      },
      {
        number: 3,
        marks: 1,
        prompt: 'انطلقت سيارة بسرعة 80 كم/س، وبعد ساعة انطلقت سيارة أخرى من نفس النقطة بسرعة 100 كم/س. بعد كم ساعة تلحق السيارة الثانية بالأولى؟',
        markScheme: 'الزمن = فرق المسافة ÷ فرق السرعتين = 80 ÷ (100 - 80) = 80 ÷ 20 = 4 ساعات.',
        examinerNote: 'قانون اللحاق في القدرات يوفر 40 ثانية مقارنة بكتابة المعادلات الجبرية.',
      },
    ],
  },
  {
    id: 'bac-fr-maths-2024',
    code: 'AEFE-BAC-MATHS-2024',
    title: 'Baccalauréat Général — Spécialité Mathématiques (Sujet + Corrigé Rédigé)',
    curriculum: 'Bac Français',
    subject: 'Mathématiques Spécialité',
    year: 2024,
    session: 'Centres Étrangers / Arabie Saoudite',
    language: 'Français',
    pages: 30,
    duration: '240 min',
    priceSar: 50,
    officialRuleSummary: 'Règlement Éducation Nationale / AEFE : Rédaction rigoureuse exigée (théorèmes cités explicitement avec hypothèses : TVI, récurrence, continuité) ; calculatrice mode examen.',
    freePreview: {
      number: 1,
      marks: 5,
      prompt:
        'On considère la suite (u_n) définie par u_0 = 2 et u_{n+1} = (1/2)u_n + 3. Démontrer par récurrence que pour tout entier naturel n, u_n <= 6.',
      markScheme:
        'Initialisation (n=0) : u_0 = 2 <= 6, vraie. Hérédité : soit k >= 0 tel que u_k <= 6. Alors (1/2)u_k <= 3, donc (1/2)u_k + 3 <= 6, soit u_{k+1} <= 6. Conclusion : par récurrence, pour tout n in N, u_n <= 6.',
      examinerNote: 'Ne jamais écrire "u_n <= 6" dans l’hérédité sans fixer un entier k donné au préalable (ou préciser "pour un entier n fixé").',
    },
    fullQuestions: [
      {
        number: 1,
        marks: 5,
        prompt: 'Suite définie par u_0 = 2 et u_{n+1} = (1/2)u_n + 3. Démontrer par récurrence que pour tout n in N, u_n <= 6.',
        markScheme: 'Initialisation + Hérédité rigoureuse + Conclusion explicite (5 points barème Bac).',
        examinerNote: 'Préciser le quantificateur et l’initialisation.',
      },
      {
        number: 2,
        marks: 6,
        prompt: 'Soit f(x) = x e^{-x} sur [0, +inf[. Étudier les variations de f et calculer l’intégrale de 0 à 1 de f(x) dx par intégration par parties.',
        markScheme: 'f\'(x) = (1 - x)e^{-x}, croissante sur [0,1] puis décroissante sur [1,+inf[. IPP avec u(x)=x, v\'(x)=e^{-x} : [ -x e^{-x} ]_0^1 + int_0^1 e^{-x} dx = -e^{-1} + 1 - e^{-1} = 1 - 2/e.',
        examinerNote: 'Bien vérifier le signe de v(x) = -e^{-x} lors de l’IPP.',
      },
    ],
  },
];

export interface TrainerProfile {
  id: 'marwan' | 'mohamed';
  name: string;
  roleTitle: string;
  languages: ('English' | 'Français' | 'العربية')[];
  curricula: string[];
  hourlyRateSar: number;
  packRateSar: number;
  credentials: string;
  bioFr: string;
  bioEn: string;
  bioAr: string;
  availabilitySlots: string[];
}

export const TRAINERS: TrainerProfile[] = [
  {
    id: 'marwan',
    name: 'Marwan Mhamdi',
    roleTitle: 'Lead International Tutor — All English Tracks',
    languages: ['English'],
    curricula: ['Digital SAT & ACT', 'AP Calculus / Physics / Chem', 'IB Diploma (HL/SL)', 'Cambridge IGCSE & A-Level', 'GAT (Qudurat English)'],
    hourlyRateSar: 190,
    packRateSar: 850,
    credentials: 'M.Sc. Applied Mathematics · Certified IB & College Board Coach · 9+ Years in KSA International Schools',
    bioFr:
      'Formateur dédié à tous les cursus enseignés en anglais (American SAT/AP, IB DP HL/SL, Cambridge IGCSE & A-Level, GAT English). Approche méthodique axée sur les critères officiels de notation et la gestion du temps d’examen.',
    bioEn:
      'Lead specialist for every English-language international track in Saudi Arabia: Digital SAT, AP STEM, IB Diploma HL/SL, Cambridge IGCSE/A-Level, and English GAT. Focused on official mark-scheme precision and timed exam strategy.',
    bioAr:
      'مدرب رئيسي لجميع المسارات الدولية باللغة الإنجليزية في المملكة: السات الرقمي، AP، البكالوريا الدولية IB، كامبريدج IGCSE و A-Level، والقدرات باللغة الإنجليزية.',
    availabilitySlots: ['Dimanche 17:00 AST', 'Lundi 18:30 AST', 'Mercredi 17:30 AST', 'Jeudi 19:00 AST', 'Samedi 11:00 AST'],
  },
  {
    id: 'mohamed',
    name: 'Mohamed Cherif',
    roleTitle: 'Formateur Principal — Cursus Français & Arabe',
    languages: ['Français', 'العربية'],
    curricula: ['Baccalauréat Français (AEFE)', 'Brevet (DNB)', 'IB French B', 'NAFIS / نافس (ETEC)', 'Qudurat (القدرات العامة)', 'Tahsili (التحصيلي)'],
    hourlyRateSar: 180,
    packRateSar: 800,
    credentials: 'Agrégation & Master Pédagogie · Expert AEFE, ETEC Nafes & Qiyas (Qudurat / Tahsili)',
    bioFr:
      'Formateur expert pour l’ensemble des programmes en français et en arabe : Baccalauréat & Brevet des lycées français d’Arabie Saoudite, IB French B, ainsi que la préparation intensive aux examens nationaux Nafes, Qudurat et Tahsili.',
    bioEn:
      'Lead specialist for all French and Arabic curricula: AEFE French Baccalauréat & Brevet, IB French B, plus intensive preparation for Saudi national assessments NAFES, Qudurat (GAT), and Tahsili (SAAT).',
    bioAr:
      'المدرب الرئيسي للمسارات الفرنسية والعربية: البكالوريا الفرنسية (AEFE)، البريفيه، IB فرنسي، بالإضافة إلى التأهيل المتقن لاختبارات نافس (ETEC) والقدرات العامة والتحصيلي (قياس).',
    availabilitySlots: ['Dimanche 18:30 AST', 'Mardi 17:00 AST', 'Mercredi 19:00 AST', 'Vendredi 16:00 AST', 'Samedi 14:00 AST'],
  },
];
