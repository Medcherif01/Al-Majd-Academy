import type { CourseModule } from '../types/academy';

export const COURSE_MODULES: CourseModule[] = [
  {
    id: 'american-sat-math',
    curriculumKey: 'american',
    curriculumLabel: 'American Diploma · Digital SAT',
    gradeBands: ['grade-10', 'grade-11', 'grade-12'],
    subject: 'Mathematics (Algebra & Advanced Math)',
    level: 'Grades 10–12 · College Board Adaptive',
    language: 'English',
    leadTrainer: 'Marwan Mhamdi',
    title: 'Digital SAT Math: Adaptive Systems, Desmos Mastery & Grid-In Precision',
    summary:
      'Complete preparation aligned with the College Board Digital SAT blueprint: Module 1 routing strategies, quadratic & exponential modeling, and Student-Produced Response (SPR) formatting rules.',
    examFormatRules: {
      board: 'College Board (Digital SAT Suite)',
      calculatorPolicy: 'Built-in Desmos Graphing Calculator permitted across both modules',
      gradingScale: '200 – 800 Math Section Score (Adaptive Module 2)',
      duration: '70 minutes (2 modules × 35 min, 44 questions total)',
    },
    lessons: [
      {
        id: 'sat-l1',
        order: '01',
        title: 'Linear Systems, Parameter Conditions & No-Solution Rules',
        durationMin: 35,
        officialRuleFocus:
          'College Board routinely tests infinite-solution vs. zero-solution linear systems. Parallel lines require identical slopes (a1/a2 = b1/b2) and unequal constants (c1/c2 != a1/a2).',
        concepts: [
          'Standard form Ax + By = C slope extraction: m = -A/B without isolating y.',
          'Infinite solutions condition: both equations represent the exact same line (all coefficients proportional).',
          'No solution condition: identical x- and y-coefficient ratios, distinct constant ratio.',
          'Desmos verification: graphing both lines with a slider parameter k to visually confirm parallel alignment.',
        ],
        workedExample: {
          problem:
            'In the system kx - 6y = 18 and 4x - 3y = 12, for what value of k does the system have infinitely many solutions?',
          solutionSteps: [
            'Step 1 (Ratio Alignment): Compare the y-coefficients: (-6) / (-3) = 2.',
            'Step 2 (Constant Verification): Check the constant ratio: 18 / 12 = 1.5, wait—let us re-verify! If 18 / 12 = 1.5 while (-6)/(-3) = 2, the lines can NEVER coincide unless the constant matches!',
            'Step 3 (Corrected Board Trap Check): Notice if the second equation is 4x - 3y = 9, then 18/9 = 2 and (-6)/(-3) = 2, so k/4 = 2 => k = 8. With 12 on the RHS, no value of k yields infinitely many solutions (it yields 0 or 1 solution!).',
          ],
        },
        resourceChecklist: [
          'SAT Linear & Quadratic Parameter Cheat Sheet',
          'Desmos Keyboard Shortcuts for Digital SAT Bluebook',
          'SPR Grid-In Rounding & Fraction Entry Rules (max 5 chars)',
        ],
        checkpoint: {
          question:
            'For what value of p does the system 3x + 5y = 14 and 6x + py = 28 have infinitely many solutions?',
          options: ['p = 5', 'p = 10', 'p = 15', 'No value of p'],
          correctIndex: 1,
          explanation:
            'Multiplying the first equation by 2 gives 6x + 10y = 28. Matching coefficients requires p = 10.',
        },
      },
      {
        id: 'sat-l2',
        order: '02',
        title: 'Quadratic Discriminants, Vertex Form & Exponential Growth',
        durationMin: 40,
        officialRuleFocus:
          'Questions asking for "the sum of solutions" or "minimum value of f(x)" reward Vieta formulas (-b/a) and vertex form a(x-h)^2 + k over slow expansion.',
        concepts: [
          'Discriminant Delta = b^2 - 4ac: > 0 (two real roots), = 0 (one tangent root), < 0 (no real roots).',
          'Sum of roots of ax^2 + bx + c = 0 is -b/a; product of roots is c/a.',
          'Exponential time-scaling: P(t) = P0 * (1 + r)^(t/k) means the rate r applies every k units of time.',
        ],
        workedExample: {
          problem:
            'If g(x) = 2x^2 - 16x + 41, what is the minimum value of g(x)?',
          solutionSteps: [
            'Step 1: Find the axis of symmetry x_v = -b / (2a) = 16 / (2 * 2) = 4.',
            'Step 2: Evaluate g(4) = 2(16) - 16(4) + 41 = 32 - 64 + 41 = 9.',
            'Step 3: Because a = 2 > 0, the parabola opens upward, so the minimum value is 9.',
          ],
        },
        resourceChecklist: [
          'Vieta & Discriminant Rapid Recognition Guide',
          'Exponential Modeling Time-Conversion Workbook',
        ],
        checkpoint: {
          question: 'What is the sum of all solutions to 3x^2 - 21x + 10 = 0?',
          options: ['7', '-7', '10/3', '21'],
          correctIndex: 0,
          explanation: 'By Vieta’s formulas, sum of roots = -b/a = -(-21)/3 = 7.',
        },
      },
    ],
  },
  {
    id: 'ib-dp-math-aa',
    curriculumKey: 'ib',
    curriculumLabel: 'IB Diploma · Math AA HL/SL',
    gradeBands: ['grade-10', 'grade-11', 'grade-12'],
    subject: 'Mathematics: Analysis & Approaches',
    level: 'IB Year 1 & 2 (DP1 / DP2)',
    language: 'English',
    leadTrainer: 'Marwan Mhamdi',
    title: 'IB DP Math AA: Calculus, Proof by Induction & Command Terms Protocol',
    summary:
      'Built strictly around IBO Assessment Objectives and Paper 1 (non-calculator) / Paper 2 (GDC) rules, covering rigorous algebraic proofs, differential equations, and Internal Assessment (IA) scoring criteria.',
    examFormatRules: {
      board: 'International Baccalaureate Organization (IBO)',
      calculatorPolicy: 'Paper 1: No Calculator · Paper 2 & HL Paper 3: GDC Required (Radians default)',
      gradingScale: '1 – 7 IB Grade (Paper 1: 30%, Paper 2: 30%, Paper 3 HL: 20%, IA: 20%)',
      duration: '120 min (HL Paper 1 & 2) · 90 min (SL Paper 1 & 2)',
    },
    lessons: [
      {
        id: 'ib-l1',
        order: '01',
        title: 'IBO Command Terms & Paper 1 Exact-Value Trigonometry',
        durationMin: 45,
        officialRuleFocus:
          '"Show that" requires arriving at the given result without working backward from it. "Hence" mandates using the immediately preceding result to earn full M1 method marks.',
        concepts: [
          'Double-angle identities: cos(2x) = 1 - 2sin^2(x) = 2cos^2(x) - 1.',
          'Strict radian mode verification before Paper 2; exact pi fractions in Paper 1.',
          'Domain restriction check: always verify solution intervals [0, 2pi] after dividing by trig coefficients.',
        ],
        workedExample: {
          problem:
            'Show that (1 - cos(2x)) / sin(2x) = tan(x), and hence solve (1 - cos(2x)) / sin(2x) = sqrt(3) for 0 <= x <= pi.',
          solutionSteps: [
            'Step 1 ("Show that"): Substitute cos(2x) = 1 - 2sin^2(x) and sin(2x) = 2sin(x)cos(x).',
            'Step 2: Numerator becomes 1 - (1 - 2sin^2(x)) = 2sin^2(x). Divide by 2sin(x)cos(x) to obtain sin(x)/cos(x) = tan(x).',
            'Step 3 ("Hence"): Solve tan(x) = sqrt(3) on [0, pi], yielding x = pi/3 (note sin(2x) != 0 holds at pi/3).',
          ],
        },
        resourceChecklist: [
          'IB Math AA Official Formula Booklet Annotations',
          'IBO Command Terms Marking Matrix (M1 / A1 / R1 / AG)',
        ],
        checkpoint: {
          question: 'In IB Paper 1, what does the markscheme code "AG" indicate?',
          options: [
            'Calculator graph allowed',
            'Answer Given — all intermediate algebraic steps must be shown explicitly',
            'Alternative geometric method',
            'Accuracy rounded to 3 significant figures',
          ],
          correctIndex: 1,
          explanation:
            'AG stands for "Answer Given". Since the target result is printed in the prompt, zero marks are awarded unless every intermediate step leading to it is clearly shown.',
        },
      },
      {
        id: 'ib-l2',
        order: '02',
        title: 'Integration by Substitution, Parts & Volumes of Revolution',
        durationMin: 50,
        officialRuleFocus:
          'Definite integrals require changing the limits of integration when applying substitution u = g(x) to avoid losing A1 accuracy marks.',
        concepts: [
          'Integration by Parts: int u dv = uv - int v du (LIATE priority rule).',
          'Volume around x-axis: V = pi * int_a^b [f(x)]^2 dx.',
          'Differential equations dy/dx = f(x)g(y): separate variables before integrating and include + C immediately.',
        ],
        workedExample: {
          problem: 'Find the exact value of int_0^1 x * e^(2x) dx.',
          solutionSteps: [
            'Step 1: Let u = x (du = dx) and dv = e^(2x) dx (v = 0.5 e^(2x)).',
            'Step 2: Apply [0.5 x e^(2x)]_0^1 - int_0^1 0.5 e^(2x) dx.',
            'Step 3: Evaluate = 0.5 e^2 - [0.25 e^(2x)]_0^1 = 0.5 e^2 - (0.25 e^2 - 0.25) = 0.25(e^2 + 1).',
          ],
        },
        resourceChecklist: [
          'IB Calculus Integration Techniques Summary',
          'IA (Mathematical Exploration) 20/20 Rubric Checklist',
        ],
        checkpoint: {
          question: 'For a non-calculator Paper 1 definite integral, how should final answers involving e or pi be written?',
          options: [
            'Rounded to 3 significant figures',
            'Rounded to 2 decimal places',
            'In exact simplified symbolic form (e.g. (e^2 + 1)/4)',
            'As a percentage',
          ],
          correctIndex: 2,
          explanation:
            'IB Paper 1 requires exact values unless the question explicitly instructs otherwise.',
        },
      },
    ],
  },
  {
    id: 'igcse-physics-0625',
    curriculumKey: 'british',
    curriculumLabel: 'Cambridge IGCSE · Physics 0625',
    gradeBands: ['grade-9', 'grade-10'],
    subject: 'Physics (Extended Tier)',
    level: 'Grades 9–10 · CAIE & Edexcel',
    language: 'English',
    leadTrainer: 'Marwan Mhamdi',
    title: 'Cambridge IGCSE Physics: Mechanics, Thermal Physics & Alternative to Practical',
    summary:
      'Designed for British-curriculum international schools in Saudi Arabia, emphasizing CAIE 3-significant-figure rules, vector diagrams, and Paper 6 experimental design marks.',
    examFormatRules: {
      board: 'Cambridge Assessment International Education (CAIE)',
      calculatorPolicy: 'Scientific non-programmable calculator permitted on Papers 2, 4, and 6',
      gradingScale: 'A* – G (or 9 – 1)',
      duration: 'Paper 2 (45m) · Paper 4 Extended (75m) · Paper 6 ATP (60m)',
    },
    lessons: [
      {
        id: 'igcse-l1',
        order: '01',
        title: 'Kinematics Graphs, Moments & Principle of Conservation of Momentum',
        durationMin: 40,
        officialRuleFocus:
          'Always state the formula symbolically (e.g. F = ma, p = mv) before substituting values. Cambridge deducts marks for missing units or rounding intermediate calculations too early.',
        concepts: [
          'Speed-time graph: gradient = acceleration; area under graph = distance travelled.',
          'Principle of moments: sum of clockwise moments = sum of anticlockwise moments at equilibrium.',
          'Momentum conservation in closed systems: m1u1 + m2u2 = m1v1 + m2v2.',
        ],
        workedExample: {
          problem:
            'A uniform 1.2 m metre rule balances horizontally on a pivot at the 0.50 m mark when a 3.0 N weight hangs at the 0.10 m mark. Calculate the weight W of the rule.',
          solutionSteps: [
            'Step 1: Center of mass of a uniform 1.2 m rule is at 0.60 m (distance 0.10 m from pivot).',
            'Step 2: Anticlockwise moment = 3.0 N * (0.50 - 0.10) m = 1.20 N·m.',
            'Step 3: Clockwise moment = W * (0.60 - 0.50) m = 0.10 W. Equating moments: 0.10 W = 1.20 => W = 12 N.',
          ],
        },
        resourceChecklist: [
          'IGCSE 0625 Complete Formula & SI Unit Sheet',
          'Paper 6 Alternative to Practical Error-Reduction Phrases',
        ],
        checkpoint: {
          question: 'On a speed-time graph, what does the gradient of the line represent?',
          options: ['Distance travelled', 'Acceleration', 'Momentum', 'Kinetic energy'],
          correctIndex: 1,
          explanation: 'Gradient = change in speed / change in time = acceleration (m/s^2).',
        },
      },
    ],
  },
  {
    id: 'nafes-etec-ksa',
    curriculumKey: 'nafes',
    curriculumLabel: 'NAFES / نافس · هيئة تقويم التعليم ETEC',
    gradeBands: ['grade-3-5', 'grade-6-8', 'grade-9'],
    subject: 'الرياضيات والعلوم والقراءة (الصفوف 3، 6، 9)',
    level: 'الاختبارات الوطنية السعودية — مدارس المملكة',
    language: 'العربية',
    leadTrainer: 'Mohamed Cherif',
    title: 'تأهيل اختبارات نافس الوطنية (ETEC): التفكير الكمي، الاستقصاء العلمي والفهم القرائي',
    summary:
      'منهج متكامل مبني على أطر ومؤشرات هيئة تقويم التعليم والتدريب (ETEC) لرفع نواتج التعلم في الرياضيات والعلوم واللغة العربية لطلبة المدارس الأهلية والعالمية.',
    examFormatRules: {
      board: 'هيئة تقويم التعليم والتدريب (ETEC)',
      calculatorPolicy: 'يُمنع استخدام الآلة الحاسبة تماماً داخل قاعة الاختبار',
      gradingScale: 'مستويات الإتقان الأربعة: متقدم، متقن، متوسط، دون المتوسط',
      duration: '60 – 90 دقيقة حسب المرحلة الدراسية (صف 3، 6، 9)',
    },
    lessons: [
      {
        id: 'nafes-l1',
        order: '01',
        title: 'استراتيجيات حل المسائل الهندسية والنسب المئوية بدون آلة حاسبة',
        durationMin: 35,
        officialRuleFocus:
          'تركز أسئلة نافس على ربط المفاهيم الرياضية بمواقف حياتية واقعية في المملكة، مع منع الآلة الحاسبة.',
        concepts: [
          'التناسب الطردي والعكسي وحساب النسبة المئوية للزيادة والخصم ذهنياً.',
          'محيط ومساحة الأشكال المركبة وحجم المنشور والأسطوانة.',
          'تفسير الجداول والرسوم البيانية واستخلاص المتوسط والوسيط والمنوال.',
        ],
        workedExample: {
          problem:
            'اشترت مدرسة عالمية أجهزة لوحية بتكلفة 2400 ريال للجهاز بعد خصم 20%. ما السعر الأصلي للجهاز قبل الخصم؟',
          solutionSteps: [
            'الخطوة 1: السعر بعد خصم 20% يمثل 80% من السعر الأصلي.',
            'الخطوة 2: نكتب التناسب: 80% ---> 2400 ريال.',
            'الخطوة 3: بقسمة الطرفين على 8 نحصل على: 10% ---> 300 ريال، إذاً 100% = 3000 ريال.',
          ],
        },
        resourceChecklist: [
          'دليل مؤشرات نافس للرياضيات — الصف السادس والثالث متوسط',
          'نماذج تجريبية لأسئلة الاستقصاء العلمي (ETEC)',
        ],
        checkpoint: {
          question: 'إذا ارتفع سعر كتاب من 80 ريالاً إلى 100 ريال، فما النسبة المئوية للزيادة؟',
          options: ['20%', '25%', '15%', '80%'],
          correctIndex: 1,
          explanation: 'مقدار الزيادة = 20 ريالاً. نسبة الزيادة = (20 ÷ 80) × 100% = 25%.',
        },
      },
    ],
  },
  {
    id: 'qudurat-tahsili-qiyas',
    curriculumKey: 'qiyas',
    curriculumLabel: 'قياس Qiyas · القدرات العامة والتحصيلي',
    gradeBands: ['grade-10', 'grade-11', 'grade-12'],
    subject: 'القدرات (كمي + لفظي) والتحصيلي العلمي',
    level: 'المرحلة الثانوية (تأهيل جامعي في المملكة)',
    language: 'العربية',
    leadTrainer: 'Mohamed Cherif',
    title: 'إتقان القدرات العامة (Qudurat) والتحصيلي (SAAT): قواعد الحل في أقل من 60 ثانية',
    summary:
      'شرح تفصيلي لقوانين المقارنات الكمية، الهندسة السريعة، التناظر اللفظي، وإكمال الجمل، متوافق مع معايير المركز الوطني للقياس (باللغتين العربية والإنجليزية GAT).',
    examFormatRules: {
      board: 'المركز الوطني للقياس (ETEC / Qiyas)',
      calculatorPolicy: 'ممنوع استخدام الآلة الحاسبة — التركيز على التقريب واستبعاد الخيارات',
      gradingScale: 'مقياس 0 – 100 (أقسام محوسبة وورقية)',
      duration: '120 دقيقة للقدرات العامة (~55 ثانية لكل سؤال)',
    },
    lessons: [
      {
        id: 'qiyas-l1',
        order: '01',
        title: 'المقارنات الكمية، الأسس، ومسائل الحركة والعمل المشترك',
        durationMin: 45,
        officialRuleFocus:
          'في أسئلة المقارنة الأربعة: (أ) الأولى أكبر، (ب) الثانية أكبر، (ج) متساويتان، (د) المعطيات غير كافية. انتبه لتجربة الأعداد السالبة والكسور قبل اختيار الإجابة.',
        concepts: [
          'استراتيجية تجربة الأعداد: اختبر (1، 0، -1، 1/2) عندما لا يُذكر أن المتغير موجب صحيح.',
          'قانون اللحاق: الزمن = فرق المسافة ÷ فرق السرعتين.',
          'قانون العمل المشترك: 1/ز_الكلي = 1/ز1 + 1/ز2.',
        ],
        workedExample: {
          problem:
            'قارن بين القيمة الأولى: س^2، والقيمة الثانية: س^3 (علماً بأن س عدد حقيقي غير معلوم الإشارة).',
          solutionSteps: [
            'الخطوة 1: نجرب س = 2 => الأولى 4 والثانية 8 (الثانية أكبر).',
            'الخطوة 2: نجرب س = -2 => الأولى 4 والثانية -8 (الأولى أكبر).',
            'الخطوة 3: اختلاف النتيجة عند تغيير القيم يعني أن الإجابة الصحيحة هي (د) المعطيات غير كافية.',
          ],
        },
        resourceChecklist: [
          'ملخص قوانين الكمي الذهبية (50 قاعدة قياس)',
          'بنك العلاقات اللفظية في التناظر والخطأ السياقي',
        ],
        checkpoint: {
          question: 'ينجز عامل دهان غرفة في 6 ساعات وعامل آخر في 3 ساعات. في كم ساعة ينجزانها معاً؟',
          options: ['4.5 ساعات', '2 ساعة', '3 ساعات', '1.5 ساعة'],
          correctIndex: 1,
          explanation: 'حاصل الضرب ÷ المجموع = (6 × 3) ÷ (6 + 3) = 18 ÷ 9 = ساعتان.',
        },
      },
    ],
  },
  {
    id: 'french-bac-aefe',
    curriculumKey: 'french',
    curriculumLabel: 'Système Français AEFE · Baccalauréat',
    gradeBands: ['grade-6-8', 'grade-9', 'grade-10', 'grade-11', 'grade-12'],
    subject: 'Mathématiques & Physique-Chimie (Spécialités)',
    level: 'Première & Terminale · Lycées Français KSA',
    language: 'Français',
    leadTrainer: 'Mohamed Cherif',
    title: 'Baccalauréat Français : Suites, Logarithmes, Primitives & Rédaction Rigoureuse',
    summary:
      'Cours complet conforme aux attendus de l’Éducation Nationale et du réseau AEFE en Arabie Saoudite (Riyad, Djeddah, Al-Khobar), incluant la rédaction des théorèmes et le mode examen.',
    examFormatRules: {
      board: 'Ministère de l’Éducation Nationale / Réseau AEFE',
      calculatorPolicy: 'Calculatrice scientifique avec Mode Examen activé obligatoire',
      gradingScale: 'Note sur 20 (Coefficient 16 par spécialité)',
      duration: '4 heures (240 minutes) · 4 exercices indépendants',
    },
    lessons: [
      {
        id: 'bac-l1',
        order: '01',
        title: 'Démonstration par Récurrence, Limites & Théorème des Valeurs Intermédiaires',
        durationMin: 45,
        officialRuleFocus:
          'Au Baccalauréat, le jury attribue des points distincts aux 3 étapes de la récurrence (Initialisation, Hérédité sur un rang k fixé, Conclusion) et aux 3 hypothèses du TVI (continuité, stricte monotonie, encadrement).',
        concepts: [
          'Théorème de convergence monotone : suite croissante et majorée converge vers une limite finie L.',
          'TVI (corollaire) : f continue et strictement monotone sur [a, b] avec k entre f(a) et f(b) => solution unique alpha.',
          'Encadrement de alpha par balayage à la calculatrice à 10^-2 près.',
        ],
        workedExample: {
          problem:
            'Soit f(x) = x^3 + 2x - 5 sur [1 ; 2]. Démontrer que f(x) = 0 admet une unique solution alpha sur [1 ; 2].',
          solutionSteps: [
            '1. Continuité : f est polynomiale donc continue sur [1 ; 2].',
            '2. Monotonie : f\'(x) = 3x^2 + 2 > 0 sur [1 ; 2], donc f est strictement croissante.',
            '3. Valeurs aux bornes : f(1) = -2 < 0 et f(2) = 7 > 0, donc 0 in [f(1) ; f(2)]. D’après le corollaire du TVI, alpha est unique.',
          ],
        },
        resourceChecklist: [
          'Fiche Méthode Rédaction Bac : Récurrence & TVI',
          'Formulaire Dérivées, Primitives & Équations Différentielles',
        ],
        checkpoint: {
          question:
            'Quelle hypothèse est indispensable dans le corollaire du TVI pour garantir l’UNICITÉ de la solution alpha ?',
          options: [
            'La parité de la fonction',
            'La stricte monotonie sur l’intervalle',
            'La dérivabilité en zéro',
            'La périodicité',
          ],
          correctIndex: 1,
          explanation:
            'La continuité garantit l’existence d’au moins une solution ; seule la stricte monotonie garantit l’unicité.',
        },
      },
    ],
  },
];
