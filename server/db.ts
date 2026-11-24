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
  hasAllAccessPass: boolean;
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

const UserModel: Model<any> = mongoose.models.User || mongoose.model('User', UserSchema);
const BookingModel: Model<any> = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);
const OrderModel: Model<any> = mongoose.models.Order || mongoose.model('Order', OrderSchema);
const GeneratedExamModel: Model<any> =
  mongoose.models.GeneratedExam || mongoose.model('GeneratedExam', GeneratedExamSchema);
const ProgressModel: Model<any> = mongoose.models.Progress || mongoose.model('Progress', ProgressSchema);

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
};
