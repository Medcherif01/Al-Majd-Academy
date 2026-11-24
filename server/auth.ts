import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { computeUserEntitlements, db, type UserRecord } from './db.ts';

const EPHEMERAL_SECRET = crypto.randomBytes(32).toString('hex');

function getSessionSecret(): string {
  const configured = process.env.SESSION_SECRET?.trim();
  return configured && configured.length >= 16 ? configured : EPHEMERAL_SECRET;
}

export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash: derived, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, 'hex');
  if (derived.length !== stored.length) return false;
  return crypto.timingSafeEqual(derived, stored);
}

interface SessionPayload {
  userId: string;
  email: string;
  exp: number;
}

interface TeacherTokenPayload {
  type: 'teacher';
  teacherId: 'marwan' | 'mohamed';
  login: string;
  exp: number;
}

interface GuestTrialPayload {
  type: 'guest-trial';
  startedAtMs: number;
  durationSec: number;
  exp: number;
}

function signHmacToken(payload: object): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyHmacToken<T extends { exp?: number }>(token: string): T | null {
  if (!token || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T;
    if (!parsed.exp || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function signSessionToken(user: Pick<UserRecord, 'id' | 'email'>): string {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  return signHmacToken(payload);
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parsed = verifyHmacToken<SessionPayload>(token);
  return parsed && parsed.userId ? parsed : null;
}

export function signTeacherToken(teacherId: 'marwan' | 'mohamed', login: string): string {
  const payload: TeacherTokenPayload = {
    type: 'teacher',
    teacherId,
    login,
    exp: Date.now() + 24 * 60 * 60 * 1000,
  };
  return signHmacToken(payload);
}

export function verifyTeacherToken(token: string): TeacherTokenPayload | null {
  const parsed = verifyHmacToken<TeacherTokenPayload>(token);
  if (!parsed || parsed.type !== 'teacher') return null;
  if (parsed.teacherId !== 'marwan' && parsed.teacherId !== 'mohamed') return null;
  return parsed;
}

export function signGuestTrialToken(startedAtMs = Date.now(), durationSec = 1800): string {
  const payload: GuestTrialPayload = {
    type: 'guest-trial',
    startedAtMs,
    durationSec,
    exp: Date.now() + 48 * 60 * 60 * 1000,
  };
  return signHmacToken(payload);
}

export function verifyGuestTrialToken(token: string): {
  startedAtMs: number;
  durationSec: number;
  secondsRemaining: number;
  expired: boolean;
} | null {
  const parsed = verifyHmacToken<GuestTrialPayload>(token);
  if (!parsed || parsed.type !== 'guest-trial' || !Number.isFinite(parsed.startedAtMs)) {
    return null;
  }
  const elapsed = Math.floor((Date.now() - parsed.startedAtMs) / 1000);
  const secondsRemaining = Math.max(0, parsed.durationSec - Math.max(0, elapsed));
  return {
    startedAtMs: parsed.startedAtMs,
    durationSec: parsed.durationSec,
    secondsRemaining,
    expired: secondsRemaining <= 0,
  };
}

export interface AuthenticatedRequest extends Request {
  user?: UserRecord;
  teacher?: { teacherId: 'marwan' | 'mohamed'; login: string };
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

export async function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> {
  const token = extractBearerToken(req);
  if (token) {
    const payload = verifySessionToken(token);
    if (payload) {
      const user = await db.findUserById(payload.userId);
      if (user) {
        req.user = user;
      }
    }
  }
  next();
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentification requise pour accéder à cette ressource.' });
    return;
  }
  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expirée ou invalide. Veuillez vous reconnecter.' });
    return;
  }
  const user = await db.findUserById(payload.userId);
  if (!user) {
    res.status(401).json({ error: 'Compte utilisateur introuvable.' });
    return;
  }
  req.user = user;
  next();
}

export function requireTeacherAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Accès formateur privé requis. Veuillez vous authentifier.' });
    return;
  }
  const payload = verifyTeacherToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session formateur expirée ou invalide.' });
    return;
  }
  req.teacher = { teacherId: payload.teacherId, login: payload.login };
  next();
}

export function sanitizeUser(user: UserRecord) {
  const entitlements = computeUserEntitlements(user);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    preferredTrack: user.preferredTrack,
    lockedGrade: user.lockedGrade ?? null,
    lockedCurriculum: user.lockedCurriculum ?? null,
    lockedTrackKey: user.lockedTrackKey ?? null,
    trialStartedAt: user.trialStartedAt ?? null,
    trialDurationSeconds: user.trialDurationSeconds || 1800,
    trialSecondsRemaining: entitlements.trialSecondsRemaining,
    trialExpired: entitlements.trialExpired,
    hasPaidAccess: entitlements.hasPaidAccess,
    assignedSkills: user.assignedSkills || [],
    teacherStrengths: user.teacherStrengths || [],
    teacherWeaknesses: user.teacherWeaknesses || [],
    teacherFeedbackSummary: user.teacherFeedbackSummary || '',
    unlockedPapers: user.unlockedPapers,
    enrolledCourses: user.enrolledCourses || [],
    hasAllAccessPass: user.hasAllAccessPass,
  };
}
