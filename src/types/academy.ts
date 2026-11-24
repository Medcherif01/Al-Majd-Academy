export type UiLanguage = 'fr' | 'en' | 'ar';

export type WorkspaceMode = 'student' | 'teacher';

export type ActiveView =
  | 'placement'
  | 'courses'
  | 'prep-hubs'
  | 'ai-exams'
  | 'past-papers'
  | 'tutors'
  | 'portal';

export type PrepHubTab =
  | 'standards'
  | 'step'
  | 'gat'
  | 'nafes'
  | 'ielts'
  | 'phonics'
  | 'skill-builder'
  | 'writing-practice';

export type TeacherSubTab =
  | 'dashboard'
  | 'demo-reports'
  | 'tutoring-bookings'
  | 'weekly-mission'
  | 'students-codes'
  | 'assign-skills'
  | 'progress'
  | 'standards'
  | 'step'
  | 'gat'
  | 'nafes'
  | 'ielts'
  | 'phonics'
  | 'skill-builder'
  | 'writing-review'
  | 'weekly-reports'
  | 'past-papers-admin'
  | 'profile-admin'
  | 'whiteboard'
  | 'accounts';

export type CurriculumKey =
  | 'all'
  | 'american'
  | 'ib'
  | 'british'
  | 'nafes'
  | 'qiyas'
  | 'french';

export interface RosterStudent {
  id: string;
  teacherId: 'marwan' | 'mohamed';
  name: string;
  grade: string;
  className: string;
  program: 'Boost' | 'Stretch';
  skillsMastered: number;
  skillsTotal: number;
  assignedSkills: string[];
  studentCode: string;
  parentCode: string;
  status: 'Active' | 'Waiting to join';
  weeklyMission: string;
  createdAt: string;
}

export interface WeeklyMission {
  id: string;
  teacherId: 'marwan' | 'mohamed';
  grade: string;
  className: string;
  title: string;
  targetExam: string;
  skills: string[];
  dueDate: string;
  program: 'Boost' | 'Stretch' | 'All';
  createdAt: string;
}

export interface WritingSubmission {
  id: string;
  teacherId: 'marwan' | 'mohamed';
  studentName: string;
  grade: string;
  track: string;
  prompt: string;
  content: string;
  wordCount: number;
  status: 'pending' | 'reviewed';
  score: number | null;
  teacherFeedback: string;
  reviewedBy: string;
  createdAt: string;
}

export interface DemoReport {
  id: string;
  userId: string;
  teacherId: 'marwan' | 'mohamed';
  studentName: string;
  studentEmail: string;
  gradeLevel: string;
  curriculum: string;
  language: 'Français' | 'English' | 'العربية';
  overallScore: number;
  levelLabel: string;
  strengths: string[];
  weaknesses: string[];
  missingGaps: string[];
  summaryText: string;
  attributedSkills: string[];
  teacherFeedback: string;
  status: 'new' | 'reviewed';
  reviewedBy: string;
  reviewedAt: string | null;
  createdAt: string;
}

export interface StudentTrackLock {
  gradeLevel: string;
  gradeLabel?: string;
  curriculum: string;
  trackKey: Exclude<CurriculumKey, 'all'>;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'parent';
  preferredTrack: string;
  lockedGrade?: string | null;
  lockedCurriculum?: string | null;
  lockedTrackKey?: string | null;
  trialStartedAt?: string | null;
  trialDurationSeconds?: number;
  trialSecondsRemaining?: number;
  trialExpired?: boolean;
  hasPaidAccess?: boolean;
  assignedSkills?: string[];
  teacherStrengths?: string[];
  teacherWeaknesses?: string[];
  teacherFeedbackSummary?: string;
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
  examDate?: string;
  session: string;
  language: 'English' | 'Français' | 'العربية';
  pages: number;
  duration: string;
  priceSar: number;
  officialRuleSummary: string;
  uploadedByTeacherId?: 'marwan' | 'mohamed';
  uploadedByTeacherName?: string;
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
  photoUrl: string;
  languages: ('English' | 'Français' | 'العربية')[];
  curricula: string[];
  hourlyRateSar: number;
  packRateSar: number;
  credentials: string;
  bioFr: string;
  bioEn: string;
  bioAr: string;
  experiences: string[];
  skills: string[];
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
  durationMinutes: number;
  durationLabel: string;
  dateSlot: string;
  timeSlot: string;
  attachedWeaknesses: string[];
  themesToCover: string[];
  paymentMethod: string;
  paymentReference: string;
  paid: boolean;
  meetLink: string;
  calendarEventLink: string;
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

export interface RegisteredStudentSummary {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'parent';
  preferredTrack: string;
  lockedGrade: string | null;
  lockedCurriculum: string | null;
  hasPaidAccess: boolean;
  hasAllAccessPass: boolean;
  enrolledCoursesCount: number;
  unlockedPapersCount: number;
  enrolledCourseIds?: string[];
  unlockedPaperIds?: string[];
  paidBookingsCount: number;
  paidTotalSar: number;
  trialStartedAt: string | null;
  trialSecondsRemaining: number;
  trialExpired: boolean;
  assignedSkills: string[];
  createdAt: string;
}
