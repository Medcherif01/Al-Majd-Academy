import { Type } from '@google/genai';
import { generateContentWithResilience, getGeminiClient } from './gemini.ts';

export type TrackKey = 'american' | 'ib' | 'british' | 'nafes' | 'qiyas' | 'french';

export function mapCurriculumToTrackKey(curriculum: string): TrackKey {
  const c = (curriculum || '').toLowerCase();
  if (c.includes('nafes') || c.includes('نافس')) return 'nafes';
  if (c.includes('qudurat') || c.includes('tahsili') || c.includes('qiyas') || c.includes('قياس') || c.includes('gat')) {
    return 'qiyas';
  }
  if (c.includes('bac') || c.includes('français') || c.includes('aefe') || c.includes('brevet')) {
    return 'french';
  }
  if (c.includes('igcse') || c.includes('a-level') || c.includes('british') || c.includes('cambridge')) {
    return 'british';
  }
  if (c.includes('ib')) return 'ib';
  return 'american';
}

export interface PlacementQuestion {
  id: string;
  domain: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  missingConceptLabel: string;
  strengthLabel: string;
}

export interface PlacementTestPackage {
  gradeLevel: string;
  gradeLabel: string;
  curriculum: string;
  language: 'Français' | 'English' | 'العربية';
  questions: PlacementQuestion[];
}

export interface PaidCourseCatalogItem {
  id: string;
  title: string;
  curriculumKey: 'american' | 'ib' | 'british' | 'nafes' | 'qiyas' | 'french';
  curriculumLabel: string;
  gradeBands: string[];
  language: 'English' | 'Français' | 'العربية';
  trainerId: 'marwan' | 'mohamed';
  trainerName: string;
  durationWeeks: number;
  sessionsCount: number;
  priceSar: number;
  syllabusHighlights: string[];
}

export const PAID_COURSES_CATALOG: PaidCourseCatalogItem[] = [
  {
    id: 'paid-sat-750-bootcamp',
    title: 'Bootcamp Intensif Digital SAT 750+ (Module 1 & 2 Adaptive)',
    curriculumKey: 'american',
    curriculumLabel: 'American · Digital SAT & AP',
    gradeBands: ['grade-10', 'grade-11', 'grade-12'],
    language: 'English',
    trainerId: 'marwan',
    trainerName: 'Marwan Mhamdi',
    durationWeeks: 6,
    sessionsCount: 12,
    priceSar: 690,
    syllabusHighlights: [
      '12 séances live en petit groupe ou 1-to-1 sur les questions difficiles du Module 2',
      'Maîtrise complète de Desmos & stratégie SPR Grid-In',
      '4 examens blancs complets corrigés selon le barème College Board',
    ],
  },
  {
    id: 'paid-ib-math-aa-hl',
    title: 'Masterclass IB DP Math AA HL/SL — Paper 1, Paper 2 & IA',
    curriculumKey: 'ib',
    curriculumLabel: 'IB Diploma (DP1 & DP2)',
    gradeBands: ['grade-10', 'grade-11', 'grade-12'],
    language: 'English',
    trainerId: 'marwan',
    trainerName: 'Marwan Mhamdi',
    durationWeeks: 8,
    sessionsCount: 16,
    priceSar: 890,
    syllabusHighlights: [
      'Démonstrations par récurrence, calcul intégral et équations différentielles',
      'Respect strict des Command Terms IBO (M1 / A1 / R1 / AG)',
      'Relecture et accompagnement structuré de l’Internal Assessment (IA)',
    ],
  },
  {
    id: 'paid-igcse-stem-mastery',
    title: 'Parcours Cambridge IGCSE Extended (Maths 0580 & Physics 0625)',
    curriculumKey: 'british',
    curriculumLabel: 'Cambridge IGCSE & Edexcel',
    gradeBands: ['grade-9', 'grade-10'],
    language: 'English',
    trainerId: 'marwan',
    trainerName: 'Marwan Mhamdi',
    durationWeeks: 6,
    sessionsCount: 12,
    priceSar: 640,
    syllabusHighlights: [
      'Méthodologie Paper 4 Extended & Paper 6 Alternative to Practical',
      'Corrections détaillées des annales CAIE Zone Arabie Saoudite',
      'Règles strictes des chiffres significatifs et unités SI',
    ],
  },
  {
    id: 'paid-nafes-excellence',
    title: 'برنامج التميز لاختبار نافس الوطني (NAFES) — رياضيات وعلوم وقراءة',
    curriculumKey: 'nafes',
    curriculumLabel: 'NAFES / نافس (ETEC)',
    gradeBands: ['grade-3-5', 'grade-6-8', 'grade-9'],
    language: 'العربية',
    trainerId: 'mohamed',
    trainerName: 'Mohamed Cherif',
    durationWeeks: 5,
    sessionsCount: 10,
    priceSar: 520,
    syllabusHighlights: [
      'تدريب مكثف على مؤشرات هيئة تقويم التعليم والتدريب (الصف 3، 6، 9)',
      'مهارات الحساب الذهني وحل المشكلات الهندسية بدون آلة حاسبة',
      'تطبيقات الاستقصاء العلمي واستيعاب المقروء مع اختبارات محاكاة',
    ],
  },
  {
    id: 'paid-qudurat-tahsili-95',
    title: 'دورة القدرات العامة والتحصيلي المكثفة (هدف 95+) — كمي ولفظي',
    curriculumKey: 'qiyas',
    curriculumLabel: 'Qudurat & Tahsili (قياس)',
    gradeBands: ['grade-10', 'grade-11', 'grade-12'],
    language: 'العربية',
    trainerId: 'mohamed',
    trainerName: 'Mohamed Cherif',
    durationWeeks: 6,
    sessionsCount: 14,
    priceSar: 720,
    syllabusHighlights: [
      'قواعد الحل السريع في أقل من 60 ثانية للمقارنات الكمية والهندسة',
      'إتقان التناظر اللفظي والخطأ السياقي واستيعاب المقروء',
      'مراجعة شاملة لمقررات التحصيلي (رياضيات، فيزياء، كيمياء، أحياء)',
    ],
  },
  {
    id: 'paid-bac-fr-aefe',
    title: 'Stage Intensif Baccalauréat & Brevet AEFE — Spécialité Maths & Rédaction',
    curriculumKey: 'french',
    curriculumLabel: 'Système Français (AEFE)',
    gradeBands: ['grade-6-8', 'grade-9', 'grade-10', 'grade-11', 'grade-12'],
    language: 'Français',
    trainerId: 'mohamed',
    trainerName: 'Mohamed Cherif',
    durationWeeks: 6,
    sessionsCount: 12,
    priceSar: 680,
    syllabusHighlights: [
      'Rédaction rigoureuse des théorèmes (Récurrence, TVI, Intégration par parties)',
      'Entraînement sur sujets Centres Étrangers / Arabie Saoudite',
      'Préparation méthodique aux épreuves écrites et au Grand Oral',
    ],
  },
];

export const GRADE_LEVEL_OPTIONS = [
  {
    id: 'grade-3-5',
    labelFr: 'Primaire (CE2 – CM2 · Grades 3–5 · نافس الصف الثالث)',
    labelEn: 'Elementary (Grades 3–5 · NAFES Grade 3)',
    labelAr: 'المرحلة الابتدائية (الصفوف 3–5 · نافس الصف الثالث)',
  },
  {
    id: 'grade-6-8',
    labelFr: 'Collège (6e – 4e · Grades 6–8 · نافس الصف السادس)',
    labelEn: 'Middle School (Grades 6–8 · NAFES Grade 6)',
    labelAr: 'المرحلة المتوسطة (الصفوف 6–8 · نافس الصف السادس)',
  },
  {
    id: 'grade-9',
    labelFr: '3e / Grade 9 (Brevet · Pre-IGCSE · نافس الثالث متوسط)',
    labelEn: 'Grade 9 (Pre-IGCSE · Brevet · NAFES Grade 9)',
    labelAr: 'الصف الثالث متوسط (Grade 9 · نافس · تمهيدي IGCSE)',
  },
  {
    id: 'grade-10',
    labelFr: 'Seconde / Grade 10 (IGCSE · Pre-IB · Pre-SAT)',
    labelEn: 'Grade 10 (IGCSE Extended · Pre-IB · Pre-SAT)',
    labelAr: 'الأول ثانوي (Grade 10 · IGCSE · Pre-IB)',
  },
  {
    id: 'grade-11',
    labelFr: 'Première / Grade 11 (IB DP1 · Digital SAT · Qudurat)',
    labelEn: 'Grade 11 (IB DP1 · Digital SAT · Qudurat)',
    labelAr: 'الثاني ثانوي (Grade 11 · IB DP1 · SAT · القدرات)',
  },
  {
    id: 'grade-12',
    labelFr: 'Terminale / Grade 12 (IB DP2 · AP · Bac · Tahsili)',
    labelEn: 'Grade 12 (IB DP2 · AP · French Bac · Tahsili)',
    labelAr: 'الثالث ثانوي (Grade 12 · IB DP2 · التحصيلي · البكالوريا)',
  },
];

export function buildPlacementQuestions(
  gradeLevel: string,
  curriculum: string,
  language: 'Français' | 'English' | 'العربية'
): PlacementTestPackage {
  const gradeObj = GRADE_LEVEL_OPTIONS.find((g) => g.id === gradeLevel) || GRADE_LEVEL_OPTIONS[3];
  const gradeLabel =
    language === 'العربية' ? gradeObj.labelAr : language === 'English' ? gradeObj.labelEn : gradeObj.labelFr;

  const isLowerGrade = gradeLevel === 'grade-3-5' || gradeLevel === 'grade-6-8';
  const isMidGrade = gradeLevel === 'grade-9' || gradeLevel === 'grade-10';

  if (language === 'العربية') {
    if (isLowerGrade) {
      return {
        gradeLevel,
        gradeLabel,
        curriculum,
        language,
        questions: [
          {
            id: 'q1',
            domain: 'الحساب والنسب المئوية',
            prompt: 'اشترى طالب حقيبة بمبلغ 160 ريالاً بعد خصم 20%. كم كان سعرها الأصلي قبل الخصم؟',
            options: ['180 ريالاً', '192 ريالاً', '200 ريال', '220 ريالاً'],
            correctIndex: 2,
            missingConceptLabel: 'حساب السعر الأصلي عبر النسبة المئوية العكسية (80% = 160)',
            strengthLabel: 'إتقان مسائل النسب المئوية العكسية بدون آلة حاسبة',
          },
          {
            id: 'q2',
            domain: 'الهندسة والقياس',
            prompt: 'مستطيل محيطه 30 سم، وطوله 9 سم. ما مساحته بالسنتيمتر المربع؟',
            options: ['54 سم²', '45 سم²', '60 سم²', '270 سم²'],
            correctIndex: 0,
            missingConceptLabel: 'الربط بين قانون المحيط 2×(الطول+العرض) وقانون المساحة',
            strengthLabel: 'تحويل المحيط إلى أبعاد ثم حساب المساحة بدقة',
          },
          {
            id: 'q3',
            domain: 'الاستقصاء العلمي',
            prompt: 'في تجربة نباتية، أي المتغيرات يُعد "متغيراً مستقلاً" عند اختبار أثر كمية الماء على نمو النبتة؟',
            options: ['ارتفاع الساق بعد أسبوعين', 'كمية الماء المضافة يومياً', 'لون الأوراق', 'نوع التربة الثابت'],
            correctIndex: 1,
            missingConceptLabel: 'التمييز بين المتغير المستقل والتابع والعوامل الثابتة في نافس',
            strengthLabel: 'فهم تصميم التجارب العلمية وتحديد المتغيرات',
          },
          {
            id: 'q4',
            domain: 'تفسير البيانات',
            prompt: 'الوسط الحسابي لأربعة أعداد هو 15. إذا أضفنا عدداً خامساً قيمته 25، فما الوسط الحسابي الجديد؟',
            options: ['16', '17', '18', '20'],
            correctIndex: 1,
            missingConceptLabel: 'استخدام قاعدة المجموع الكلي = الوسط × العدد عند إضافة قيم جديدة',
            strengthLabel: 'حساب المتوسط الحسابي وتحديث المجموع الكلي بسرعة',
          },
          {
            id: 'q5',
            domain: 'الكسور والعمليات الذهنية',
            prompt: 'ما ناتج (3/4 + 1/8) × 16 بدون استخدام آلة حاسبة؟',
            options: ['12', '14', '15', '18'],
            correctIndex: 1,
            missingConceptLabel: 'توحيد المقامات السريع وترتيب العمليات الحسابية',
            strengthLabel: 'طلاقة حسابية ممتازة في الكسور وترتيب العمليات',
          },
        ],
      };
    }

    return {
      gradeLevel,
      gradeLabel,
      curriculum,
      language,
      questions: [
        {
          id: 'q1',
          domain: 'الكمي — المعادلات والمقارنات',
          prompt: 'إذا كان 3س - 7 = 2س + 5، فما قيمة س^2 - 4؟',
          options: ['140', '144', '120', '136'],
          correctIndex: 0,
          missingConceptLabel: 'حل المعادلات الخطية والتعويض في المقادير الجبرية بسرعة',
          strengthLabel: 'دقة وسرعة في حل المعادلات الجبرية',
        },
        {
          id: 'q2',
          domain: 'القدرات — مسائل الحركة والعمل',
          prompt: 'ينجز خالد عملاً في 4 ساعات وينجزه سعد في 12 ساعة. في كم ساعة ينجزانه معاً؟',
          options: ['8 ساعات', '3 ساعات', '4 ساعات', '2.5 ساعة'],
          correctIndex: 1,
          missingConceptLabel: 'قانون العمل المشترك في القدرات: حاصل الضرب ÷ المجموع',
          strengthLabel: 'تطبيق قوانين المعدل والعمل المشترك باحترافية',
        },
        {
          id: 'q3',
          domain: 'الهندسة والزوايا',
          prompt: 'مثلث قياسات زواياه بالدرجات هي (2س) و(3س) و(4س). ما قياس أكبر زاوية فيه؟',
          options: ['60°', '80°', '90°', '100°'],
          correctIndex: 1,
          missingConceptLabel: 'تكوين معادلة مجموع زوايا المثلث (180°) وإيجاد قيمة الزاوية المطلوبة',
          strengthLabel: 'تمكن قوي من خصائص المثلثات والمعادلات الهندسية',
        },
        {
          id: 'q4',
          domain: 'الاستيعاب اللفظي والتناظر',
          prompt: 'التناظر اللفظي: (طبيب : مشرط). اختر العلاقة المماثلة من حيث الترتيب:',
          options: ['نجار : منشار', 'قلم : كاتب', 'مدرسة : فصل', 'مريض : دواء'],
          correctIndex: 0,
          missingConceptLabel: 'تحليل علاقة (صاحب المهنة : الأداة) مع مراعاة اتجاه العلاقة',
          strengthLabel: 'دقة تحليل العلاقات اللفظية والمنطق اللغوي',
        },
        {
          id: 'q5',
          domain: 'التحصيلي والدوال',
          prompt: 'إذا كانت د(س) = س^2 - 6س + 11، فما القيمة الصغرى للدالة د(س)؟',
          options: ['2', '3', '11', '-2'],
          correctIndex: 0,
          missingConceptLabel: 'إيجاد إحداثي رأس القطع المكافئ (-ب/2أ) أو إكمال المربع',
          strengthLabel: 'إتقان خصائص الدوال التربيعية والقيم العظمى والصغرى',
        },
      ],
    };
  }

  if (language === 'English') {
    if (isLowerGrade) {
      return {
        gradeLevel,
        gradeLabel,
        curriculum,
        language,
        questions: [
          {
            id: 'q1',
            domain: 'Ratios & Percentages',
            prompt: 'A school library has 240 science books, which is 60% of its STEM collection. How many books are in the entire STEM collection?',
            options: ['360', '400', '384', '420'],
            correctIndex: 1,
            missingConceptLabel: 'Reverse percentage reasoning (finding the 100% whole from a given part)',
            strengthLabel: 'Strong proportional reasoning and percentage inversion',
          },
          {
            id: 'q2',
            domain: 'Geometry & Spatial Reasoning',
            prompt: 'A rectangular classroom measures 8.5 m by 6 m. What is its perimeter in meters?',
            options: ['29 m', '51 m', '14.5 m', '24 m'],
            correctIndex: 0,
            missingConceptLabel: 'Distinguishing perimeter P = 2(l + w) from area A = l × w',
            strengthLabel: 'Accurate geometric perimeter and decimal computation',
          },
          {
            id: 'q3',
            domain: 'Algebraic Thinking',
            prompt: 'If 4n + 7 = 31, what is the value of 2n - 1?',
            options: ['11', '12', '6', '13'],
            correctIndex: 0,
            missingConceptLabel: 'Multi-step linear equations and substituting back into a target expression',
            strengthLabel: 'Clean multi-step linear equation solving',
          },
          {
            id: 'q4',
            domain: 'Scientific Inquiry',
            prompt: 'In an experiment testing how water temperature affects sugar dissolving speed, what is the dependent variable?',
            options: ['Water temperature', 'Time taken for sugar to dissolve', 'Volume of water', 'Mass of sugar'],
            correctIndex: 1,
            missingConceptLabel: 'Identifying independent vs. dependent vs. control variables',
            strengthLabel: 'Clear grasp of scientific experimental design',
          },
          {
            id: 'q5',
            domain: 'Data & Statistics',
            prompt: 'The scores of 5 students are 78, 84, 90, 84, and 94. What is the median score?',
            options: ['84', '86', '90', '85'],
            correctIndex: 0,
            missingConceptLabel: 'Ordering datasets before identifying the median value',
            strengthLabel: 'Reliable statistical summary interpretation',
          },
        ],
      };
    }

    if (isMidGrade) {
      return {
        gradeLevel,
        gradeLabel,
        curriculum,
        language,
        questions: [
          {
            id: 'q1',
            domain: 'Linear Systems & Coordinates',
            prompt: 'Line L passes through (2, 5) and (6, 13). What is the y-intercept of a line perpendicular to L passing through (4, 1)?',
            options: ['(0, 3)', '(0, -1)', '(0, 5)', '(0, 2)'],
            correctIndex: 0,
            missingConceptLabel: 'Perpendicular slope negative reciprocal (-1/m) and point-slope line equation',
            strengthLabel: 'Mastery of coordinate geometry and perpendicular slopes',
          },
          {
            id: 'q2',
            domain: 'Quadratics & Factoring',
            prompt: 'For what positive value of k does 2x^2 - kx + 8 = 0 have exactly one real solution?',
            options: ['4', '8', '16', '6'],
            correctIndex: 1,
            missingConceptLabel: 'Applying the discriminant b^2 - 4ac = 0 for tangent/single roots',
            strengthLabel: 'Command of quadratic discriminant conditions',
          },
          {
            id: 'q3',
            domain: 'Physics & Kinematics Rules',
            prompt: 'A car accelerates uniformly from 6 m/s to 22 m/s in 4.0 s. Which value obeys CAIE 2-3 significant figure rules for acceleration?',
            options: ['4 m/s^2', '4.0 m/s^2', '3.5 m/s^2', '5.5 m/s^2'],
            correctIndex: 1,
            missingConceptLabel: 'Acceleration formula a = (v - u)/t combined with CAIE significant figure rules',
            strengthLabel: 'Accurate kinematics calculation and board sig-fig precision',
          },
          {
            id: 'q4',
            domain: 'Exponents & Radicals',
            prompt: 'Simplify (x^6 * y^-2)^(1/2) for x > 0, y > 0.',
            options: ['x^3 / y', 'x^3 * y', 'x^4 / y', 'x^12 / y^4'],
            correctIndex: 0,
            missingConceptLabel: 'Fractional and negative exponent laws',
            strengthLabel: 'Fluent manipulation of indices and negative exponents',
          },
          {
            id: 'q5',
            domain: 'Exam Command Terms',
            prompt: 'On an IB or IGCSE paper, what does the command term "State" require?',
            options: [
              'A full multi-step derivation with commentary',
              'A concise specific value or brief answer without supporting explanation',
              'A labeled Cartesian sketch',
              'A comparison of two opposing theories',
            ],
            correctIndex: 1,
            missingConceptLabel: 'Official IBO/Cambridge command terms to avoid wasting exam time',
            strengthLabel: 'Strong awareness of official exam board command terms',
          },
        ],
      };
    }

    // Grades 11–12 (SAT / IB DP / AP / A-Level)
    return {
      gradeLevel,
      gradeLabel,
      curriculum,
      language,
      questions: [
        {
          id: 'q1',
          domain: 'Algebraic Modeling (SAT / IB)',
          prompt: 'If 3x + 5y = 14 and 6x + ky = 28 have infinitely many solutions, what is the value of k?',
          options: ['5', '10', '14', 'No value exists'],
          correctIndex: 1,
          missingConceptLabel: 'Proportionality conditions for infinite solutions in linear systems',
          strengthLabel: 'Sharp recognition of linear system solution conditions',
        },
        {
          id: 'q2',
          domain: 'Differential Calculus',
          prompt: 'Let f(x) = x * e^(2x). What is f\'(0)?',
          options: ['0', '1', '2', 'e'],
          correctIndex: 1,
          missingConceptLabel: 'Product rule (u\'v + uv\') combined with chain rule on e^(2x)',
          strengthLabel: 'Solid command of Product & Chain Rule differentiation',
        },
        {
          id: 'q3',
          domain: 'Trigonometry & Exact Values',
          prompt: 'Without a calculator (IB Paper 1), solve sin(2x) = sqrt(3)/2 for 0 <= x <= pi/2.',
          options: ['x = pi/6 and pi/3', 'x = pi/3 only', 'x = pi/4 only', 'x = pi/12 and pi/6'],
          correctIndex: 0,
          missingConceptLabel: 'Doubling the domain [0, pi] before taking inverse trig solutions for 2x',
          strengthLabel: 'Exact non-calculator trigonometric solving across adjusted intervals',
        },
        {
          id: 'q4',
          domain: 'Probability & Distributions',
          prompt: 'Events A and B are independent with P(A) = 0.4 and P(B) = 0.5. What is P(A union B)?',
          options: ['0.90', '0.70', '0.20', '0.65'],
          correctIndex: 1,
          missingConceptLabel: 'Inclusion-exclusion P(A u B) = P(A) + P(B) - P(A)P(B) for independent events',
          strengthLabel: 'Accurate probability union and independence modeling',
        },
        {
          id: 'q5',
          domain: 'Official Board Method Rules',
          prompt: 'In an IB Paper 1 proof marked "AG" (Answer Given), what happens if a candidate skips intermediate algebraic steps?',
          options: [
            'Full marks are awarded if the final line matches',
            'Zero method/accuracy marks are awarded for the unshown transition',
            'Half credit is automatically granted',
            'A calculator graph substitutes for algebraic proof',
          ],
          correctIndex: 1,
          missingConceptLabel: 'Official IB Paper 1 "Show that / AG" explicit step-by-step justification rules',
          strengthLabel: 'Disciplined exam-board proof structure and markscheme awareness',
        },
      ],
    };
  }

  // Français (Primaire / Collège / Lycée / Bac AEFE)
  if (isLowerGrade) {
    return {
      gradeLevel,
      gradeLabel,
      curriculum,
      language,
      questions: [
        {
          id: 'q1',
          domain: 'Calcul & Pourcentages',
          prompt: 'Un manuel coûte 120 SAR avant une remise de 25 %. Quel est son prix après remise ?',
          options: ['85 SAR', '90 SAR', '95 SAR', '100 SAR'],
          correctIndex: 1,
          missingConceptLabel: 'Calcul rapide d’une réduction en pourcentage (25 % = un quart)',
          strengthLabel: 'Maîtrise solide des pourcentages et du calcul mental',
        },
        {
          id: 'q2',
          domain: 'Fractions & Priorités',
          prompt: 'Calculer : 2/3 + 5/6.',
          options: ['7/9', '3/2', '7/6', '10/18'],
          correctIndex: 1,
          missingConceptLabel: 'Mise au même dénominateur et simplification irréductible d’une fraction',
          strengthLabel: 'Addition et simplification exacte des fractions',
        },
        {
          id: 'q3',
          domain: 'Géométrie & Grandeurs',
          prompt: 'Un triangle rectangle a des côtés de l’angle droit de 6 cm et 8 cm. Quelle est son aire ?',
          options: ['48 cm²', '24 cm²', '14 cm²', '28 cm²'],
          correctIndex: 1,
          missingConceptLabel: 'Formule de l’aire du triangle (Base × Hauteur) / 2',
          strengthLabel: 'Application rigoureuse des formules d’aire géométrique',
        },
        {
          id: 'q4',
          domain: 'Proportionnalité',
          prompt: 'Si 4 cahiers pèsent 600 g, combien pèsent 7 cahiers identiques ?',
          options: ['950 g', '1 050 g', '1 150 g', '1 200 g'],
          correctIndex: 1,
          missingConceptLabel: 'Passage à l’unité (coefficient de proportionnalité)',
          strengthLabel: 'Raisonnement proportionnel fluide',
        },
        {
          id: 'q5',
          domain: 'Logique & Résolution',
          prompt: 'La moyenne de 3 notes est 14/20. Deux de ces notes sont 12 et 15. Quelle est la troisième ?',
          options: ['14', '15', '16', '13'],
          correctIndex: 1,
          missingConceptLabel: 'Lien entre moyenne arithmétique et somme totale des valeurs',
          strengthLabel: 'Calcul inverse sur les moyennes statistiques',
        },
      ],
    };
  }

  if (isMidGrade) {
    return {
      gradeLevel,
      gradeLabel,
      curriculum,
      language,
      questions: [
        {
          id: 'q1',
          domain: 'Calcul Littéral & Identités',
          prompt: 'Développer et réduire (2x - 3)^2.',
          options: ['4x^2 - 9', '4x^2 - 6x + 9', '4x^2 - 12x + 9', '2x^2 - 12x + 9'],
          correctIndex: 2,
          missingConceptLabel: 'Identité remarquable (a - b)^2 = a^2 - 2ab + b^2 (ne pas oublier le double produit)',
          strengthLabel: 'Maîtrise précise des identités remarquables',
        },
        {
          id: 'q2',
          domain: 'Théorème de Pythagore & Trigonométrie',
          prompt: 'Dans un triangle rectangle en A, AB = 5 cm et AC = 12 cm. Quelle est la longueur de l’hypoténuse BC ?',
          options: ['13 cm', '17 cm', '11 cm', '15 cm'],
          correctIndex: 0,
          missingConceptLabel: 'Application exacte du théorème de Pythagore (BC^2 = AB^2 + AC^2)',
          strengthLabel: 'Calcul géométrique fiable avec le théorème de Pythagore',
        },
        {
          id: 'q3',
          domain: 'Fonctions Linéaires & Affines',
          prompt: 'Soit f(x) = -3x + 7. Quel est l’antécédent de 1 par f ?',
          options: ['4', '2', '-2', '10'],
          correctIndex: 1,
          missingConceptLabel: 'Distinction entre image f(1) et antécédent (résoudre f(x) = 1)',
          strengthLabel: 'Distinction claire entre image et antécédent d’une fonction',
        },
        {
          id: 'q4',
          domain: 'Probabilités',
          prompt: 'Une urne contient 3 boules vertes et 5 boules bleues. Quelle est la probabilité de tirer une boule verte ?',
          options: ['3/5', '3/8', '5/8', '1/3'],
          correctIndex: 1,
          missingConceptLabel: 'Quotient cas favorables / nombre total d’issues possibles',
          strengthLabel: 'Calcul juste des probabilités élémentaires',
        },
        {
          id: 'q5',
          domain: 'Méthode Brevet / Seconde',
          prompt: 'Pour justifier que deux droites sont parallèles avec la réciproque de Thalès, que faut-il impérativement vérifier en plus de l’égalité des rapports ?',
          options: [
            'Que les droites sont perpendiculaires',
            'L’alignement et le même ordre des points sur les deux sécantes',
            'Que le triangle est isocèle',
            'La valeur de l’aire du triangle',
          ],
          correctIndex: 1,
          missingConceptLabel: 'Hypothèse d’ordre des points obligatoire dans la réciproque de Thalès',
          strengthLabel: 'Rigueur de rédaction conforme aux attendus du Brevet / AEFE',
        },
      ],
    };
  }

  // Première & Terminale (Bac Français / IB French / SAT)
  return {
    gradeLevel,
    gradeLabel,
    curriculum,
    language,
    questions: [
      {
        id: 'q1',
        domain: 'Suites & Récurrence (Bac)',
        prompt: 'Soit (u_n) définie par u_0 = 1 et u_{n+1} = 0,5 u_n + 4. Vers quelle limite finie L converge (u_n) ?',
        options: ['4', '8', '2', '6'],
        correctIndex: 1,
        missingConceptLabel: 'Résolution de l’équation du point fixe L = 0,5L + 4 pour les suites arithmético-géométriques',
        strengthLabel: 'Calcul rapide de limite par équation du point fixe',
      },
      {
        id: 'q2',
        domain: 'Dérivation & Exponentielle',
        prompt: 'Quelle est la dérivée de f(x) = (2x + 1)e^{-x} ?',
        options: ['(1 - 2x)e^{-x}', '(2x + 3)e^{-x}', '-2e^{-x}', '(1 + 2x)e^{-x}'],
        correctIndex: 0,
        missingConceptLabel: 'Dérivée d’un produit u\'v + uv\' avec (e^{-x})\' = -e^{-x}',
        strengthLabel: 'Dérivation sans erreur de signe sur les fonctions exponentielles',
      },
      {
        id: 'q3',
        domain: 'Théorème des Valeurs Intermédiaires',
        prompt: 'Dans le corollaire du TVI, quelle condition garantit l’UNICITÉ de la solution alpha sur [a ; b] ?',
        options: [
          'La parité de f',
          'La stricte monotonie de f sur [a ; b]',
          'La périodicité de f',
          'La positivité de f(a)',
        ],
        correctIndex: 1,
        missingConceptLabel: 'Les 3 hypothèses exigées par le jury du Bac (continuité, stricte monotonie, encadrement)',
        strengthLabel: 'Rédaction rigoureuse des hypothèses du TVI',
      },
      {
        id: 'q4',
        domain: 'Logarithme Népérien',
        prompt: 'Résoudre dans ]0 ; +inf[ l’équation ln(x) + ln(2) = ln(10).',
        options: ['x = 8', 'x = 5', 'x = 12', 'x = 20'],
        correctIndex: 1,
        missingConceptLabel: 'Propriété algébrique ln(a) + ln(b) = ln(ab) et domaine de définition',
        strengthLabel: 'Maîtrise des équations logarithmiques',
      },
      {
        id: 'q5',
        domain: 'Probabilités Conditionnelles',
        prompt: 'On donne P(A) = 0,4 et P_A(B) = 0,7. Que vaut P(A inter B) ?',
        options: ['0,28', '1,10', '0,30', '0,57'],
        correctIndex: 0,
        missingConceptLabel: 'Formule P(A inter B) = P(A) × P_A(B) sur un arbre pondéré',
        strengthLabel: 'Lecture et calcul exact sur arbres de probabilités',
      },
    ],
  };
}

export async function evaluatePlacementTest(input: {
  gradeLevel: string;
  curriculum: string;
  language: 'Français' | 'English' | 'العربية';
  answers: Record<string, number>;
}) {
  const pkg = buildPlacementQuestions(input.gradeLevel, input.curriculum, input.language);

  let correctCount = 0;
  const domainMap = new Map<string, { correct: number; total: number }>();
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const missingGaps: string[] = [];

  for (const q of pkg.questions) {
    const picked = input.answers[q.id];
    const isCorrect = picked === q.correctIndex;
    if (isCorrect) {
      correctCount += 1;
      strengths.push(q.strengthLabel);
    } else {
      weaknesses.push(q.domain);
      missingGaps.push(q.missingConceptLabel);
    }

    const entry = domainMap.get(q.domain) || { correct: 0, total: 0 };
    entry.total += 1;
    if (isCorrect) entry.correct += 1;
    domainMap.set(q.domain, entry);
  }

  const overallScore = Math.round((correctCount / pkg.questions.length) * 100);
  const domainBreakdown = Array.from(domainMap.entries()).map(([domain, stats]) => {
    const scorePct = Math.round((stats.correct / stats.total) * 100);
    const status: 'strong' | 'moderate' | 'weak' =
      scorePct >= 80 ? 'strong' : scorePct >= 50 ? 'moderate' : 'weak';
    return { domain, scorePct, status };
  });

  // Ensure balanced summary arrays even at 100% or 0%
  if (strengths.length === 0) {
    strengths.push(
      input.language === 'العربية'
        ? 'الاستعداد للبدء بمنهجية منظمة والتدرج في الأساسيات'
        : input.language === 'English'
          ? 'Commitment to structured diagnostic benchmarking before exam prep'
          : 'Volonté de structurer ses bases avant la préparation intensive'
    );
  }
  if (weaknesses.length === 0) {
    missingGaps.push(
      input.language === 'العربية'
        ? 'لا توجد فجوات أساسية — يُنصح بالانتقال مباشرة إلى نماذج الاختبارات المتقدمة والسرعة الزمنية.'
        : input.language === 'English'
          ? 'No foundational gaps detected — ready for timed Past Papers & high-tier extension drills.'
          : 'Aucune lacune majeure détectée — prêt(e) pour les annales chronométrées et le perfectionnement.'
    );
  }

  const levelLabel =
    input.language === 'العربية'
      ? overallScore >= 80
        ? 'مستوى متقدم — جاهز للتدريب المكثف'
        : overallScore >= 50
          ? 'مستوى متوسط — يحتاج إلى سد بعض الفجوات'
          : 'مستوى تأسيسي — يتطلب خطة تقوية موجهة'
      : input.language === 'English'
        ? overallScore >= 80
          ? 'Advanced Readiness — Exam-Track Ready'
          : overallScore >= 50
            ? 'Developing Proficiency — Targeted Gaps to Close'
            : 'Foundational Stage — Structured Reinforcement Needed'
        : overallScore >= 80
          ? 'Niveau Avancé — Prêt pour les épreuves officielles'
          : overallScore >= 50
            ? 'Niveau Intermédiaire — Notions clés à consolider'
            : 'Niveau Fondamental — Remise à niveau ciblée recommandée';

  // Determine matching course & trainer recommendations
  const isFrenchOrArabic =
    input.language === 'Français' ||
    input.language === 'العربية' ||
    input.curriculum.toLowerCase().includes('nafes') ||
    input.curriculum.toLowerCase().includes('qudurat') ||
    input.curriculum.toLowerCase().includes('bac');

  const recommendedTrainerId: 'marwan' | 'mohamed' = isFrenchOrArabic ? 'mohamed' : 'marwan';

  const currLower = input.curriculum.toLowerCase();
  let recommendedCourseIds: string[] = ['american-sat-math'];
  let recommendedPaidCourseId = 'paid-sat-750-bootcamp';

  if (currLower.includes('ib')) {
    recommendedCourseIds = ['ib-dp-math-aa'];
    recommendedPaidCourseId = 'paid-ib-math-aa-hl';
  } else if (currLower.includes('igcse') || currLower.includes('british')) {
    recommendedCourseIds = ['igcse-physics-0625'];
    recommendedPaidCourseId = 'paid-igcse-stem-mastery';
  } else if (currLower.includes('nafes')) {
    recommendedCourseIds = ['nafes-etec-ksa'];
    recommendedPaidCourseId = 'paid-nafes-excellence';
  } else if (currLower.includes('qudurat') || currLower.includes('tahsili') || currLower.includes('qiyas')) {
    recommendedCourseIds = ['qudurat-tahsili-qiyas'];
    recommendedPaidCourseId = 'paid-qudurat-tahsili-95';
  } else if (currLower.includes('bac') || currLower.includes('français')) {
    recommendedCourseIds = ['french-bac-aefe'];
    recommendedPaidCourseId = 'paid-bac-fr-aefe';
  }

  // Optional Gemini diagnostic summary synthesis (falls back seamlessly if API key unset)
  let summaryText =
    input.language === 'العربية'
      ? `حصل الطالب في تقييم (${pkg.gradeLabel}) على نسبة ${overallScore}%. ${
          missingGaps.length > 0 && weaknesses.length > 0
            ? `تركزت الصعوبات في: ${weaknesses.join('، ')}.`
            : 'أداء ممتاز يؤهلك مباشرة للمرحلة المتقدمة.'
        }`
      : input.language === 'English'
        ? `In this ${pkg.gradeLabel} diagnostic (${input.curriculum}), you scored ${overallScore}%. ${
            weaknesses.length > 0
              ? `Priority gaps were identified in ${weaknesses.join(', ')}.`
              : 'Strong command across all tested exam competencies.'
          }`
        : `Sur l’évaluation diagnostique (${pkg.gradeLabel} · ${input.curriculum}), votre score est de ${overallScore} %. ${
            weaknesses.length > 0
              ? `Les points prioritaires à renforcer concernent : ${weaknesses.join(', ')}.`
              : 'Très bonne maîtrise globale des attendus officiels.'
          }`;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (apiKey) {
    try {
      const ai = getGeminiClient();
      const response = await generateContentWithResilience(ai, {
        contents: `Write a crisp 2-sentence academic diagnostic summary in ${input.language} for a student in "${pkg.gradeLabel}" (${input.curriculum}) who scored ${overallScore}%. Strengths: ${strengths.join('; ')}. Missing concepts: ${missingGaps.join('; ')}.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
          },
          required: ['summary'],
        },
      });
      const parsed = JSON.parse((response.text ?? '{}').trim());
      if (parsed?.summary && typeof parsed.summary === 'string') {
        summaryText = parsed.summary;
      }
    } catch {
      // Keep deterministic summary cleanly if Gemini is temporarily unavailable
    }
  }

  return {
    gradeLevel: input.gradeLevel,
    curriculum: input.curriculum,
    language: input.language,
    overallScore,
    levelLabel,
    domainBreakdown,
    strengths,
    weaknesses,
    missingGaps,
    summaryText,
    recommendedCourseIds,
    recommendedPaidCourseId,
    recommendedTrainerId,
  };
}
