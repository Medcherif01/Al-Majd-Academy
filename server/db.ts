import mongoose, { Schema, type Model } from 'mongoose';
import crypto from 'crypto';

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'parent';
  preferredTrack: string;
  passwordHash: string;
  salt: string;
  unlockedPapers: string[];
  enrolledCourses: string[];
  hasAllAccessPass: boolean;
  createdAt: string;
}

export interface PlacementResultRecord {
  id: string;
  userId: string;
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

export interface RosterStudentRecord {
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

export interface WeeklyMissionRecord {
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

export interface WritingSubmissionRecord {
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

export interface BookingRecord {
  id: string;
  userId: string;
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

export interface OrderRecord {
  id: string;
  userId: string;
  customerEmail: string;
  items: { paperId: string; title: string; priceSar: number }[];
  isAllAccessPass: boolean;
  totalSar: number;
  paymentMethod: string;
  referenceCode: string;
  status: 'paid';
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

export interface GeneratedExamRecord {
  id: string;
  userId: string;
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

export interface ProgressRecord {
  userId: string;
  completedLessonIds: string[];
  quizScores: Record<string, number>;
  updatedAt: string;
}

// Mongoose Schemas (used when MONGODB_URI is configured)
const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['student', 'parent'], default: 'student' },
    preferredTrack: { type: String, default: 'ib' },
    passwordHash: { type: String, required: true },
    salt: { type: String, required: true },
    unlockedPapers: { type: [String], default: [] },
    enrolledCourses: { type: [String], default: [] },
    hasAllAccessPass: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const BookingSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    studentName: { type: String, required: true },
    contactEmail: { type: String, required: true },
    trainerId: { type: String, enum: ['marwan', 'mohamed'], required: true },
    trainerName: { type: String, required: true },
    language: { type: String, enum: ['English', 'Français', 'العربية'], required: true },
    curriculum: { type: String, required: true },
    subject: { type: String, required: true },
    sessionPackage: { type: String, required: true },
    dateSlot: { type: String, required: true },
    timeSlot: { type: String, required: true },
    priceSar: { type: Number, required: true },
    status: { type: String, enum: ['confirmed', 'pending'], default: 'confirmed' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

const OrderSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    customerEmail: { type: String, required: true },
    items: [
      {
        paperId: String,
        title: String,
        priceSar: Number,
      },
    ],
    isAllAccessPass: { type: Boolean, default: false },
    totalSar: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    referenceCode: { type: String, required: true },
    status: { type: String, default: 'paid' },
  },
  { timestamps: true }
);

const GeneratedExamSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    curriculum: { type: String, required: true },
    subject: { type: String, required: true },
    language: { type: String, required: true },
    difficulty: { type: String, required: true },
    topic: { type: String, required: true },
    title: { type: String, required: true },
    officialRulesSummary: { type: String, required: true },
    durationMinutes: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    questions: [
      {
        number: Number,
        questionType: String,
        prompt: String,
        options: [String],
        correctAnswer: String,
        points: Number,
        officialExplanation: String,
        examinerTip: String,
      },
    ],
  },
  { timestamps: true }
);

const ProgressSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true },
    completedLessonIds: { type: [String], default: [] },
    quizScores: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const PlacementResultSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    gradeLevel: { type: String, required: true },
    curriculum: { type: String, required: true },
    language: { type: String, required: true },
    overallScore: { type: Number, required: true },
    levelLabel: { type: String, required: true },
    domainBreakdown: { type: [Schema.Types.Mixed], default: [] },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    missingGaps: { type: [String], default: [] },
    summaryText: { type: String, required: true },
    recommendedCourseIds: { type: [String], default: [] },
    recommendedPaidCourseId: { type: String, default: '' },
    recommendedTrainerId: { type: String, enum: ['marwan', 'mohamed'], default: 'marwan' },
  },
  { timestamps: true }
);

const UserModel: Model<any> = mongoose.models.User || mongoose.model('User', UserSchema);
const BookingModel: Model<any> = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);
const OrderModel: Model<any> = mongoose.models.Order || mongoose.model('Order', OrderSchema);
const GeneratedExamModel: Model<any> =
  mongoose.models.GeneratedExam || mongoose.model('GeneratedExam', GeneratedExamSchema);
const ProgressModel: Model<any> = mongoose.models.Progress || mongoose.model('Progress', ProgressSchema);
const PlacementResultModel: Model<any> =
  mongoose.models.PlacementResult || mongoose.model('PlacementResult', PlacementResultSchema);

const RosterStudentSchema = new Schema(
  {
    teacherId: { type: String, enum: ['marwan', 'mohamed'], required: true, index: true },
    name: { type: String, required: true },
    grade: { type: String, required: true },
    className: { type: String, default: 'A' },
    program: { type: String, enum: ['Boost', 'Stretch'], default: 'Boost' },
    skillsMastered: { type: Number, default: 0 },
    skillsTotal: { type: Number, default: 9 },
    assignedSkills: { type: [String], default: [] },
    studentCode: { type: String, required: true, unique: true },
    parentCode: { type: String, required: true, unique: true },
    status: { type: String, enum: ['Active', 'Waiting to join'], default: 'Waiting to join' },
    weeklyMission: { type: String, default: '' },
  },
  { timestamps: true }
);

const WeeklyMissionSchema = new Schema(
  {
    teacherId: { type: String, enum: ['marwan', 'mohamed'], required: true, index: true },
    grade: { type: String, required: true },
    className: { type: String, default: 'All' },
    title: { type: String, required: true },
    targetExam: { type: String, required: true },
    skills: { type: [String], default: [] },
    dueDate: { type: String, required: true },
    program: { type: String, enum: ['Boost', 'Stretch', 'All'], default: 'All' },
  },
  { timestamps: true }
);

const WritingSubmissionSchema = new Schema(
  {
    teacherId: { type: String, enum: ['marwan', 'mohamed'], required: true, index: true },
    studentName: { type: String, required: true },
    grade: { type: String, required: true },
    track: { type: String, required: true },
    prompt: { type: String, required: true },
    content: { type: String, required: true },
    wordCount: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'reviewed'], default: 'pending' },
    score: { type: Number, default: null },
    teacherFeedback: { type: String, default: '' },
    reviewedBy: { type: String, default: '' },
  },
  { timestamps: true }
);

const RosterStudentModel: Model<any> =
  mongoose.models.RosterStudent || mongoose.model('RosterStudent', RosterStudentSchema);
const WeeklyMissionModel: Model<any> =
  mongoose.models.WeeklyMission || mongoose.model('WeeklyMission', WeeklyMissionSchema);
const WritingSubmissionModel: Model<any> =
  mongoose.models.WritingSubmission || mongoose.model('WritingSubmission', WritingSubmissionSchema);

// Cached connection for Vercel serverless cold-starts
let connectionPromise: Promise<boolean> | null = null;
let mongoAvailable = false;

export async function connectDatabase(): Promise<boolean> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    mongoAvailable = false;
    return false;
  }

  if (mongoose.connection.readyState === 1) {
    mongoAvailable = true;
    return true;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 5000,
      })
      .then(() => {
        mongoAvailable = true;
        return true;
      })
      .catch((err) => {
        console.warn('MongoDB connection unavailable, using in-memory store:', err?.message || err);
        connectionPromise = null;
        mongoAvailable = false;
        return false;
      });
  }

  return connectionPromise;
}

export function isMongoConnected(): boolean {
  return mongoAvailable && mongoose.connection.readyState === 1;
}

// In-memory store fallback when MONGODB_URI is not configured
const memoryUsers = new Map<string, UserRecord>();
const memoryBookings: BookingRecord[] = [];
const memoryOrders: OrderRecord[] = [];
const memoryExams: GeneratedExamRecord[] = [];
const memoryProgress = new Map<string, ProgressRecord>();
const memoryPlacements: PlacementResultRecord[] = [];

const memoryRoster: RosterStudentRecord[] = [
  {
    id: 'stu-1',
    teacherId: 'marwan',
    name: 'Yahya Ashraf Al Refaee',
    grade: 'Grade 11',
    className: 'B',
    program: 'Stretch',
    skillsMastered: 6,
    skillsTotal: 9,
    assignedSkills: ['Digital SAT Linear Systems', 'IELTS Writing Task 2 Cohesion', 'STEP Sentence Structure'],
    studentCode: 'PATH-Z9HJYZ',
    parentCode: 'FAM-CUFDVR',
    status: 'Active',
    weeklyMission: 'SAT Module 2 & IELTS Argumentation',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'stu-2',
    teacherId: 'marwan',
    name: 'Youssef Ahmed Al-Harbi',
    grade: 'Grade 11',
    className: 'B',
    program: 'Boost',
    skillsMastered: 3,
    skillsTotal: 9,
    assignedSkills: ['STEP Grammar Foundations', 'GAT Quantitative Ratios', 'Quadratic Discriminants'],
    studentCode: 'PATH-M4KQ8P',
    parentCode: 'FAM-R7LP2W',
    status: 'Waiting to join',
    weeklyMission: 'Core Algebra & STEP Reading Timing',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'stu-3',
    teacherId: 'marwan',
    name: 'Omar Khalid Al-Otaibi',
    grade: 'Grade 10',
    className: 'A',
    program: 'Stretch',
    skillsMastered: 7,
    skillsTotal: 9,
    assignedSkills: ['IGCSE Physics Moments', 'IB Command Terms Protocol', 'IELTS Academic Reading'],
    studentCode: 'PATH-K2VN9T',
    parentCode: 'FAM-T6YW3N',
    status: 'Active',
    weeklyMission: 'IGCSE Extended Paper 4 Drill',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'stu-4',
    teacherId: 'mohamed',
    name: 'Lina Al-Qahtani',
    grade: 'Grade 9',
    className: 'A',
    program: 'Stretch',
    skillsMastered: 8,
    skillsTotal: 9,
    assignedSkills: ['NAFES Math Geometry', 'Brevet Réciproque de Thalès', 'Qudurat Analogies'],
    studentCode: 'PATH-F8DX4M',
    parentCode: 'FAM-B9QM5Z',
    status: 'Active',
    weeklyMission: 'Objectif NAFES 95% + Rédaction AEFE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'stu-5',
    teacherId: 'mohamed',
    name: 'Faisal Saeed Al-Dosari',
    grade: 'Grade 12',
    className: 'C',
    program: 'Boost',
    skillsMastered: 4,
    skillsTotal: 9,
    assignedSkills: ['Qudurat Comparaisons Quantitatives', 'TVI & Récurrence Bac', 'Tahsili Cinématique'],
    studentCode: 'PATH-C5WR7J',
    parentCode: 'FAM-H3PK8L',
    status: 'Waiting to join',
    weeklyMission: 'Qudurat 60-Second Drills & Bac Récurrence',
    createdAt: new Date().toISOString(),
  },
];

const memoryMissions: WeeklyMissionRecord[] = [
  {
    id: 'mis-1',
    teacherId: 'marwan',
    grade: 'Grade 11',
    className: 'B',
    title: 'Week 12 · Digital SAT Adaptive Systems & IELTS Task 2 Cohesion',
    targetExam: 'Digital SAT / IELTS',
    skills: ['Linear Systems & Parameters', 'Quadratic Discriminant', 'IELTS Academic Paragraphing'],
    dueDate: '2026-12-02',
    program: 'All',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mis-2',
    teacherId: 'mohamed',
    grade: 'Grade 9',
    className: 'A',
    title: 'Semaine 12 · Préparation NAFES ETEC & Rédaction AEFE',
    targetExam: 'NAFES / Brevet',
    skills: ['النسب المئوية العكسية بدون حاسبة', 'الاستقصاء العلمي (المتغير المستقل)', 'Théorème de Thalès'],
    dueDate: '2026-12-02',
    program: 'All',
    createdAt: new Date().toISOString(),
  },
];

const memoryWritings: WritingSubmissionRecord[] = [
  {
    id: 'wrt-1',
    teacherId: 'marwan',
    studentName: 'Yahya Ashraf Al Refaee',
    grade: 'Grade 11',
    track: 'IELTS Task 2',
    prompt: 'Some educators believe international schools in Saudi Arabia should prioritize bilingual STEM instruction over monolingual tracks. To what extent do you agree or disagree?',
    content: 'In an increasingly interconnected academic landscape, international schools across Saudi Arabia face a pivotal curriculum decision. While monolingual English instruction streamlines preparation for standardized examinations such as the Digital SAT and IB Diploma, bilingual STEM education fosters deeper conceptual transfer and cultural fluency. I strongly agree that integrating structured Arabic and English scientific terminology strengthens analytical flexibility, provided core examination command terms are explicitly taught.',
    wordCount: 68,
    status: 'pending',
    score: null,
    teacherFeedback: '',
    reviewedBy: '',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'wrt-2',
    teacherId: 'marwan',
    studentName: 'Omar Khalid Al-Otaibi',
    grade: 'Grade 10',
    track: 'STEP Essay & Grammar',
    prompt: 'Describe how daily reading habits improve performance on timed standardized English tests.',
    content: 'Consistent reading develops both vocabulary depth and structural intuition. When students encounter complex clauses daily in scientific articles, they recognize subject-verb agreement errors and transitions much faster during the STEP exam without translating word by word.',
    wordCount: 38,
    status: 'pending',
    score: null,
    teacherFeedback: '',
    reviewedBy: '',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'wrt-3',
    teacherId: 'mohamed',
    studentName: 'Lina Al-Qahtani',
    grade: 'Grade 12',
    track: 'Bac Français Dissertation',
    prompt: 'En quoi la rigueur démonstrative en mathématiques reflète-t-elle l’exigence d’une argumentation littéraire ?',
    content: 'Qu’il s’agisse d’une démonstration par récurrence ou d’une dissertation au Baccalauréat, la valeur d’un raisonnement repose sur l’enchaînement explicite des hypothèses et des preuves. Omettre une étape intermédiaire fragilise autant la validité logique que la force persuasive.',
    wordCount: 39,
    status: 'pending',
    score: null,
    teacherFeedback: '',
    reviewedBy: '',
    createdAt: new Date().toISOString(),
  },
];

function mapUserDoc(doc: any): UserRecord {
  return {
    id: String(doc._id),
    email: doc.email,
    name: doc.name,
    role: doc.role,
    preferredTrack: doc.preferredTrack,
    passwordHash: doc.passwordHash,
    salt: doc.salt,
    unlockedPapers: Array.isArray(doc.unlockedPapers) ? doc.unlockedPapers : [],
    enrolledCourses: Array.isArray(doc.enrolledCourses) ? doc.enrolledCourses : [],
    hasAllAccessPass: Boolean(doc.hasAllAccessPass),
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
  };
}

export const db = {
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.trim().toLowerCase();
    if (await connectDatabase()) {
      const doc = await UserModel.findOne({ email: normalized }).lean();
      return doc ? mapUserDoc(doc) : null;
    }
    for (const user of memoryUsers.values()) {
      if (user.email === normalized) return user;
    }
    return null;
  },

  async findUserById(id: string): Promise<UserRecord | null> {
    if (await connectDatabase()) {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = await UserModel.findById(id).lean();
      return doc ? mapUserDoc(doc) : null;
    }
    return memoryUsers.get(id) ?? null;
  },

  async createUser(input: Omit<UserRecord, 'id' | 'createdAt'>): Promise<UserRecord> {
    const normalized = input.email.trim().toLowerCase();
    if (await connectDatabase()) {
      const created = await UserModel.create({
        ...input,
        email: normalized,
      });
      return mapUserDoc(created.toObject());
    }
    const record: UserRecord = {
      ...input,
      email: normalized,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    memoryUsers.set(record.id, record);
    return record;
  },

  async grantPaperAccess(userId: string, paperIds: string[], allAccess: boolean): Promise<UserRecord | null> {
    if (await connectDatabase()) {
      const update: any = {};
      if (paperIds.length > 0) {
        update.$addToSet = { unlockedPapers: { $each: paperIds } };
      }
      if (allAccess) {
        update.$set = { hasAllAccessPass: true };
      }
      const updated = await UserModel.findByIdAndUpdate(userId, update, { new: true }).lean();
      return updated ? mapUserDoc(updated) : null;
    }
    const existing = memoryUsers.get(userId);
    if (!existing) return null;
    const merged = Array.from(new Set([...existing.unlockedPapers, ...paperIds]));
    existing.unlockedPapers = merged;
    if (allAccess) existing.hasAllAccessPass = true;
    memoryUsers.set(userId, existing);
    return existing;
  },

  async enrollCourse(userId: string, courseId: string): Promise<UserRecord | null> {
    if (await connectDatabase()) {
      const updated = await UserModel.findByIdAndUpdate(
        userId,
        { $addToSet: { enrolledCourses: courseId } },
        { new: true }
      ).lean();
      return updated ? mapUserDoc(updated) : null;
    }
    const existing = memoryUsers.get(userId);
    if (!existing) return null;
    existing.enrolledCourses = Array.from(new Set([...existing.enrolledCourses, courseId]));
    memoryUsers.set(userId, existing);
    return existing;
  },

  async savePlacementResult(
    result: Omit<PlacementResultRecord, 'id' | 'createdAt'>
  ): Promise<PlacementResultRecord> {
    if (await connectDatabase()) {
      const doc = await PlacementResultModel.create(result);
      return {
        ...result,
        id: String(doc._id),
        createdAt: new Date(doc.createdAt).toISOString(),
      };
    }
    const record: PlacementResultRecord = {
      ...result,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    memoryPlacements.unshift(record);
    return record;
  },

  async getLatestPlacementByUser(userId: string): Promise<PlacementResultRecord | null> {
    if (await connectDatabase()) {
      const doc: any = await PlacementResultModel.findOne({ userId }).sort({ createdAt: -1 }).lean();
      if (!doc) return null;
      return {
        id: String(doc._id),
        userId: doc.userId,
        gradeLevel: doc.gradeLevel,
        curriculum: doc.curriculum,
        language: doc.language,
        overallScore: doc.overallScore,
        levelLabel: doc.levelLabel,
        domainBreakdown: doc.domainBreakdown || [],
        strengths: doc.strengths || [],
        weaknesses: doc.weaknesses || [],
        missingGaps: doc.missingGaps || [],
        summaryText: doc.summaryText,
        recommendedCourseIds: doc.recommendedCourseIds || [],
        recommendedPaidCourseId: doc.recommendedPaidCourseId || '',
        recommendedTrainerId: doc.recommendedTrainerId || 'marwan',
        createdAt: new Date(doc.createdAt).toISOString(),
      };
    }
    return memoryPlacements.find((p) => p.userId === userId) || null;
  },

  async createOrder(order: Omit<OrderRecord, 'id' | 'createdAt'>): Promise<OrderRecord> {
    if (await connectDatabase()) {
      const doc = await OrderModel.create(order);
      return {
        ...order,
        id: String(doc._id),
        createdAt: new Date(doc.createdAt).toISOString(),
      };
    }
    const record: OrderRecord = {
      ...order,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    memoryOrders.unshift(record);
    return record;
  },

  async getOrdersByUser(userId: string): Promise<OrderRecord[]> {
    if (await connectDatabase()) {
      const docs = await OrderModel.find({ userId }).sort({ createdAt: -1 }).lean();
      return docs.map((d: any) => ({
        id: String(d._id),
        userId: d.userId,
        customerEmail: d.customerEmail,
        items: d.items || [],
        isAllAccessPass: Boolean(d.isAllAccessPass),
        totalSar: d.totalSar,
        paymentMethod: d.paymentMethod,
        referenceCode: d.referenceCode,
        status: d.status || 'paid',
        createdAt: new Date(d.createdAt).toISOString(),
      }));
    }
    return memoryOrders.filter((o) => o.userId === userId);
  },

  async createBooking(booking: Omit<BookingRecord, 'id' | 'createdAt'>): Promise<BookingRecord> {
    if (await connectDatabase()) {
      const doc = await BookingModel.create(booking);
      return {
        ...booking,
        id: String(doc._id),
        createdAt: new Date(doc.createdAt).toISOString(),
      };
    }
    const record: BookingRecord = {
      ...booking,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    memoryBookings.unshift(record);
    return record;
  },

  async getBookingsByUser(userId: string): Promise<BookingRecord[]> {
    if (await connectDatabase()) {
      const docs = await BookingModel.find({ userId }).sort({ createdAt: -1 }).lean();
      return docs.map((d: any) => ({
        id: String(d._id),
        userId: d.userId,
        studentName: d.studentName,
        contactEmail: d.contactEmail,
        trainerId: d.trainerId,
        trainerName: d.trainerName,
        language: d.language,
        curriculum: d.curriculum,
        subject: d.subject,
        sessionPackage: d.sessionPackage,
        dateSlot: d.dateSlot,
        timeSlot: d.timeSlot,
        priceSar: d.priceSar,
        status: d.status,
        notes: d.notes || '',
        createdAt: new Date(d.createdAt).toISOString(),
      }));
    }
    return memoryBookings.filter((b) => b.userId === userId);
  },

  async saveGeneratedExam(exam: Omit<GeneratedExamRecord, 'id' | 'createdAt'>): Promise<GeneratedExamRecord> {
    if (await connectDatabase()) {
      const doc = await GeneratedExamModel.create(exam);
      return {
        ...exam,
        id: String(doc._id),
        createdAt: new Date(doc.createdAt).toISOString(),
      };
    }
    const record: GeneratedExamRecord = {
      ...exam,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    memoryExams.unshift(record);
    return record;
  },

  async getGeneratedExamsByUser(userId: string): Promise<GeneratedExamRecord[]> {
    if (await connectDatabase()) {
      const docs = await GeneratedExamModel.find({ userId }).sort({ createdAt: -1 }).limit(15).lean();
      return docs.map((d: any) => ({
        id: String(d._id),
        userId: d.userId,
        curriculum: d.curriculum,
        subject: d.subject,
        language: d.language,
        difficulty: d.difficulty,
        topic: d.topic,
        title: d.title,
        officialRulesSummary: d.officialRulesSummary,
        durationMinutes: d.durationMinutes,
        totalMarks: d.totalMarks,
        questions: d.questions || [],
        createdAt: new Date(d.createdAt).toISOString(),
      }));
    }
    return memoryExams.filter((e) => e.userId === userId).slice(0, 15);
  },

  async getProgress(userId: string): Promise<ProgressRecord> {
    if (await connectDatabase()) {
      const doc: any = await ProgressModel.findOne({ userId }).lean();
      if (!doc) {
        return {
          userId,
          completedLessonIds: [],
          quizScores: {},
          updatedAt: new Date().toISOString(),
        };
      }
      return {
        userId,
        completedLessonIds: Array.isArray(doc.completedLessonIds) ? doc.completedLessonIds : [],
        quizScores: doc.quizScores || {},
        updatedAt: new Date(doc.updatedAt).toISOString(),
      };
    }
    return (
      memoryProgress.get(userId) ?? {
        userId,
        completedLessonIds: [],
        quizScores: {},
        updatedAt: new Date().toISOString(),
      }
    );
  },

  async updateProgress(
    userId: string,
    lessonId?: string,
    quizScore?: { lessonId: string; score: number }
  ): Promise<ProgressRecord> {
    const current = await this.getProgress(userId);
    const completed = lessonId
      ? Array.from(new Set([...current.completedLessonIds, lessonId]))
      : current.completedLessonIds;
    const quizScores = { ...current.quizScores };
    if (quizScore) {
      quizScores[quizScore.lessonId] = quizScore.score;
    }

    if (await connectDatabase()) {
      const doc: any = await ProgressModel.findOneAndUpdate(
        { userId },
        { completedLessonIds: completed, quizScores },
        { upsert: true, new: true }
      ).lean();
      return {
        userId,
        completedLessonIds: doc.completedLessonIds || completed,
        quizScores: doc.quizScores || quizScores,
        updatedAt: new Date(doc.updatedAt).toISOString(),
      };
    }

    const updated: ProgressRecord = {
      userId,
      completedLessonIds: completed,
      quizScores,
      updatedAt: new Date().toISOString(),
    };
    memoryProgress.set(userId, updated);
    return updated;
  },

  // --- Teacher Portal Methods ---
  async getRosterStudents(teacherId?: 'marwan' | 'mohamed'): Promise<RosterStudentRecord[]> {
    if (await connectDatabase()) {
      const filter = teacherId ? { teacherId } : {};
      let docs = await RosterStudentModel.find(filter).sort({ createdAt: -1 }).lean();
      if (docs.length === 0 && (await RosterStudentModel.countDocuments()) === 0) {
        await RosterStudentModel.insertMany(
          memoryRoster.map(({ id: _id, createdAt: _c, ...rest }) => rest)
        );
        docs = await RosterStudentModel.find(filter).sort({ createdAt: -1 }).lean();
      }
      return docs.map((d: any) => ({
        id: String(d._id),
        teacherId: d.teacherId,
        name: d.name,
        grade: d.grade,
        className: d.className,
        program: d.program,
        skillsMastered: d.skillsMastered ?? 0,
        skillsTotal: d.skillsTotal ?? 9,
        assignedSkills: Array.isArray(d.assignedSkills) ? d.assignedSkills : [],
        studentCode: d.studentCode,
        parentCode: d.parentCode,
        status: d.status || 'Waiting to join',
        weeklyMission: d.weeklyMission || '',
        createdAt: new Date(d.createdAt).toISOString(),
      }));
    }
    return teacherId ? memoryRoster.filter((s) => s.teacherId === teacherId) : memoryRoster;
  },

  async createRosterStudents(
    items: Omit<RosterStudentRecord, 'id' | 'createdAt'>[]
  ): Promise<RosterStudentRecord[]> {
    if (await connectDatabase()) {
      const inserted = await RosterStudentModel.insertMany(items);
      return inserted.map((d: any) => ({
        id: String(d._id),
        teacherId: d.teacherId,
        name: d.name,
        grade: d.grade,
        className: d.className,
        program: d.program,
        skillsMastered: d.skillsMastered ?? 0,
        skillsTotal: d.skillsTotal ?? 9,
        assignedSkills: Array.isArray(d.assignedSkills) ? d.assignedSkills : [],
        studentCode: d.studentCode,
        parentCode: d.parentCode,
        status: d.status || 'Waiting to join',
        weeklyMission: d.weeklyMission || '',
        createdAt: new Date(d.createdAt).toISOString(),
      }));
    }
    const created = items.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }));
    memoryRoster.unshift(...created);
    return created;
  },

  async assignSkillsToRoster(
    teacherId: 'marwan' | 'mohamed',
    grade: string,
    program: 'Boost' | 'Stretch' | 'All',
    skills: string[]
  ): Promise<RosterStudentRecord[]> {
    if (await connectDatabase()) {
      const filter: any = { teacherId };
      if (grade !== 'All') filter.grade = grade;
      if (program !== 'All') filter.program = program;
      await RosterStudentModel.updateMany(filter, {
        $addToSet: { assignedSkills: { $each: skills } },
        $set: { skillsTotal: Math.max(9, skills.length + 5) },
      });
      return this.getRosterStudents(teacherId);
    }
    for (const st of memoryRoster) {
      if (
        st.teacherId === teacherId &&
        (grade === 'All' || st.grade === grade) &&
        (program === 'All' || st.program === program)
      ) {
        st.assignedSkills = Array.from(new Set([...st.assignedSkills, ...skills]));
        st.skillsTotal = Math.max(st.skillsTotal, st.assignedSkills.length);
      }
    }
    return memoryRoster.filter((s) => s.teacherId === teacherId);
  },

  async redeemInvitationCode(code: string): Promise<RosterStudentRecord | null> {
    const normalized = code.trim().toUpperCase();
    if (await connectDatabase()) {
      const doc: any = await RosterStudentModel.findOneAndUpdate(
        { $or: [{ studentCode: normalized }, { parentCode: normalized }] },
        { $set: { status: 'Active' } },
        { new: true }
      ).lean();
      if (!doc) return null;
      return {
        id: String(doc._id),
        teacherId: doc.teacherId,
        name: doc.name,
        grade: doc.grade,
        className: doc.className,
        program: doc.program,
        skillsMastered: doc.skillsMastered ?? 0,
        skillsTotal: doc.skillsTotal ?? 9,
        assignedSkills: doc.assignedSkills || [],
        studentCode: doc.studentCode,
        parentCode: doc.parentCode,
        status: 'Active',
        weeklyMission: doc.weeklyMission || '',
        createdAt: new Date(doc.createdAt).toISOString(),
      };
    }
    const found = memoryRoster.find(
      (s) => s.studentCode === normalized || s.parentCode === normalized
    );
    if (!found) return null;
    found.status = 'Active';
    return found;
  },

  async getWeeklyMissions(teacherId?: 'marwan' | 'mohamed'): Promise<WeeklyMissionRecord[]> {
    if (await connectDatabase()) {
      const filter = teacherId ? { teacherId } : {};
      let docs = await WeeklyMissionModel.find(filter).sort({ createdAt: -1 }).lean();
      if (docs.length === 0 && (await WeeklyMissionModel.countDocuments()) === 0) {
        await WeeklyMissionModel.insertMany(
          memoryMissions.map(({ id: _id, createdAt: _c, ...rest }) => rest)
        );
        docs = await WeeklyMissionModel.find(filter).sort({ createdAt: -1 }).lean();
      }
      return docs.map((d: any) => ({
        id: String(d._id),
        teacherId: d.teacherId,
        grade: d.grade,
        className: d.className,
        title: d.title,
        targetExam: d.targetExam,
        skills: d.skills || [],
        dueDate: d.dueDate,
        program: d.program,
        createdAt: new Date(d.createdAt).toISOString(),
      }));
    }
    return teacherId ? memoryMissions.filter((m) => m.teacherId === teacherId) : memoryMissions;
  },

  async createWeeklyMission(
    mission: Omit<WeeklyMissionRecord, 'id' | 'createdAt'>
  ): Promise<WeeklyMissionRecord> {
    if (await connectDatabase()) {
      const doc = await WeeklyMissionModel.create(mission);
      return {
        ...mission,
        id: String(doc._id),
        createdAt: new Date(doc.createdAt).toISOString(),
      };
    }
    const record: WeeklyMissionRecord = {
      ...mission,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    memoryMissions.unshift(record);
    return record;
  },

  async getWritingSubmissions(teacherId?: 'marwan' | 'mohamed'): Promise<WritingSubmissionRecord[]> {
    if (await connectDatabase()) {
      const filter = teacherId ? { teacherId } : {};
      let docs = await WritingSubmissionModel.find(filter).sort({ createdAt: -1 }).lean();
      if (docs.length === 0 && (await WritingSubmissionModel.countDocuments()) === 0) {
        await WritingSubmissionModel.insertMany(
          memoryWritings.map(({ id: _id, createdAt: _c, ...rest }) => rest)
        );
        docs = await WritingSubmissionModel.find(filter).sort({ createdAt: -1 }).lean();
      }
      return docs.map((d: any) => ({
        id: String(d._id),
        teacherId: d.teacherId,
        studentName: d.studentName,
        grade: d.grade,
        track: d.track,
        prompt: d.prompt,
        content: d.content,
        wordCount: d.wordCount,
        status: d.status,
        score: d.score ?? null,
        teacherFeedback: d.teacherFeedback || '',
        reviewedBy: d.reviewedBy || '',
        createdAt: new Date(d.createdAt).toISOString(),
      }));
    }
    return teacherId ? memoryWritings.filter((w) => w.teacherId === teacherId) : memoryWritings;
  },

  async createWritingSubmission(
    sub: Omit<WritingSubmissionRecord, 'id' | 'createdAt'>
  ): Promise<WritingSubmissionRecord> {
    if (await connectDatabase()) {
      const doc = await WritingSubmissionModel.create(sub);
      return {
        ...sub,
        id: String(doc._id),
        createdAt: new Date(doc.createdAt).toISOString(),
      };
    }
    const record: WritingSubmissionRecord = {
      ...sub,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    memoryWritings.unshift(record);
    return record;
  },

  async reviewWritingSubmission(
    id: string,
    score: number,
    teacherFeedback: string,
    reviewedBy: string
  ): Promise<WritingSubmissionRecord | null> {
    if (await connectDatabase()) {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc: any = await WritingSubmissionModel.findByIdAndUpdate(
        id,
        { status: 'reviewed', score, teacherFeedback, reviewedBy },
        { new: true }
      ).lean();
      if (!doc) return null;
      return {
        id: String(doc._id),
        teacherId: doc.teacherId,
        studentName: doc.studentName,
        grade: doc.grade,
        track: doc.track,
        prompt: doc.prompt,
        content: doc.content,
        wordCount: doc.wordCount,
        status: 'reviewed',
        score: doc.score,
        teacherFeedback: doc.teacherFeedback,
        reviewedBy: doc.reviewedBy,
        createdAt: new Date(doc.createdAt).toISOString(),
      };
    }
    const found = memoryWritings.find((w) => w.id === id);
    if (!found) return null;
    found.status = 'reviewed';
    found.score = score;
    found.teacherFeedback = teacherFeedback;
    found.reviewedBy = reviewedBy;
    return found;
  },
};
