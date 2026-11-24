export type UiLanguage = 'fr' | 'en' | 'ar';

export type ActiveView = 'placement' | 'courses' | 'ai-exams' | 'past-papers' | 'tutors' | 'portal';

export type CurriculumKey =
  | 'all'
  | 'american'
  | 'ib'
  | 'british'
  | 'nafes'
  | 'qiyas'
  | 'french';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'parent';
  preferredTrack: string;
  unlockedPapers: string[];
  enrolledCourses: string[];
  hasAllAccessPass: boolean;
}

export interface GradeOption {
  id: string;
  labelFr: string;
  labelEn: string;
  labelAr: string;
}

export interface PlacementQuestionItem {
  id: string;
  domain: string;
  prompt: string;
  options: string[];
}

export interface PlacementResult {
  id: string;
  gradeLevel: string;
  curriculum: string;
  language: 'Français' | 'English' | 'العربية';
  overallScore: number;
  levelLabel: string;
  domainBreakdown: {
    domain: string;
    scorePct: number;
    status: 'strong' | 'moderate' | 'weak';
  }[];
  strengths: string[];
  weaknesses: string[];
  missingGaps: string[];
  summaryText: string;
  recommendedCourseIds: string[];
  recommendedPaidCourseId: string;
  recommendedTrainerId: 'marwan' | 'mohamed';
  createdAt: string;
}

export interface PaidCourseItem {
  id: string;
  title: string;
  curriculumKey: Exclude<CurriculumKey, 'all'>;
  curriculumLabel: string;
  gradeBands: string[];
  language: 'English' | 'Français' | 'العربية';
  trainerId: 'marwan' | 'mohamed';
  trainerName: string;
  durationWeeks: number;
  sessionsCount: number;
  priceSar: number;
  syllabusHighlights: string[];
  isEnrolled?: boolean;
}

export interface LessonCheckpoint {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface CourseLesson {
  id: string;
  order: string;
  title: string;
  durationMin: number;
  officialRuleFocus: string;
  concepts: string[];
  workedExample: {
    problem: string;
    solutionSteps: string[];
  };
  resourceChecklist: string[];
  checkpoint: LessonCheckpoint;
}

export interface CourseModule {
  id: string;
  curriculumKey: Exclude<CurriculumKey, 'all'>;
  curriculumLabel: string;
  gradeBands: string[];
  subject: string;
  level: string;
  language: 'English' | 'Français' | 'العربية';
  leadTrainer: string;
  title: string;
  summary: string;
  examFormatRules: {
    board: string;
    calculatorPolicy: string;
    gradingScale: string;
    duration: string;
  };
  lessons: CourseLesson[];
}

export interface PastPaperSummary {
  id: string;
  code: string;
  title: string;
  curriculum: string;
  subject: string;
  year: number;
  session: string;
  language: 'English' | 'Français' | 'العربية';
  pages: number;
  duration: string;
  priceSar: number;
  officialRuleSummary: string;
  freePreview: {
    number: number;
    marks: number;
    prompt: string;
    markScheme: string;
    examinerNote: string;
  };
  questionCount: number;
  isUnlocked: boolean;
}

export interface FullPastPaper extends PastPaperSummary {
  fullQuestions: {
    number: number;
    marks: number;
    prompt: string;
    markScheme: string;
    examinerNote: string;
  }[];
}

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

export interface BookingItem {
  id: string;
  studentName: string;
  contactEmail: string;
  trainerId: 'marwan' | 'mohamed';
  trainerName: string;
  language: 'English' | 'Français' | 'العربية';
  curriculum: string;
  subject: string;
  sessionPackage: string;
  dateSlot: string;
  timeSlot: string;
  priceSar: number;
  status: 'confirmed' | 'pending';
  notes: string;
  createdAt: string;
}

export interface GeneratedExamQuestion {
  number: number;
  questionType: 'mcq' | 'short_answer';
  prompt: string;
  options: string[];
  correctAnswer: string;
  points: number;
  officialExplanation: string;
  examinerTip: string;
}

export interface GeneratedExam {
  id: string;
  curriculum: string;
  subject: string;
  language: 'Français' | 'English' | 'العربية';
  difficulty: string;
  topic: string;
  title: string;
  officialRulesSummary: string;
  durationMinutes: number;
  totalMarks: number;
  questions: GeneratedExamQuestion[];
  createdAt: string;
}

export interface ProgressState {
  completedLessonIds: string[];
  quizScores: Record<string, number>;
}
