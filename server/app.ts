import crypto from 'crypto';
import express from 'express';
import {
  computeUserEntitlements,
  connectDatabase,
  db,
  isMongoConnected,
} from './db.ts';
import {
  hashPassword,
  optionalAuth,
  requireAuth,
  requireTeacherAuth,
  sanitizeUser,
  signGuestTrialToken,
  signSessionToken,
  signTeacherToken,
  verifyGuestTrialToken,
  verifyPassword,
  type AuthenticatedRequest,
} from './auth.ts';
import {
  ALL_ACCESS_PASS_PRICE_SAR,
  type PastPaperItem,
} from './catalog.ts';
import { buildBoardThemedA4PaperHtml } from './examDesign.ts';
import {
  buildPlacementQuestions,
  evaluatePlacementTest,
  GRADE_LEVEL_OPTIONS,
  mapCurriculumToTrackKey,
  PAID_COURSES_CATALOG,
} from './placement.ts';
import {
  evaluateWritingWithGemini,
  extractExactPastPaperWithGemini,
  GeminiUnavailableError,
  generateInternationalExam,
} from './gemini.ts';

function isNonEmptyString(val: unknown, maxLen = 300): val is string {
  return typeof val === 'string' && val.trim().length > 0 && val.trim().length <= maxLen;
}

function isValidEmail(val: unknown): val is string {
  return typeof val === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

function readCookieValue(req: express.Request, name: string): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

export function createApiApp() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Ensure DB initialization attempt on API requests (cached in Vercel)
  app.use(async (_req, _res, next) => {
    await connectDatabase();
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      storage: isMongoConnected() ? 'mongodb' : 'session-store',
    });
  });

  // --- Authentication Routes ---
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, name, role, preferredTrack } = req.body ?? {};
      if (!isValidEmail(email)) {
        res.status(400).json({ error: 'Adresse e-mail invalide.' });
        return;
      }
      if (!isNonEmptyString(password, 128) || password.length < 6) {
        res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
        return;
      }
      if (!isNonEmptyString(name, 100)) {
        res.status(400).json({ error: 'Nom complet requis.' });
        return;
      }

      const existing = await db.findUserByEmail(email);
      if (existing) {
        res.status(409).json({ error: 'Un compte existe déjà avec cette adresse e-mail.' });
        return;
      }

      const { hash, salt } = hashPassword(password);
      const user = await db.createUser({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role: role === 'parent' ? 'parent' : 'student',
        preferredTrack: isNonEmptyString(preferredTrack, 40) ? preferredTrack.trim() : 'ib',
        lockedGrade: null,
        lockedCurriculum: null,
        lockedTrackKey: null,
        trialStartedAt: new Date().toISOString(),
        trialDurationSeconds: 1800,
        assignedSkills: [],
        teacherStrengths: [],
        teacherWeaknesses: [],
        teacherFeedbackSummary: '',
        passwordHash: hash,
        salt,
        unlockedPapers: [],
        enrolledCourses: [],
        hasAllAccessPass: false,
      });

      const token = signSessionToken(user);
      res.status(201).json({ token, user: sanitizeUser(user) });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors de la création du compte.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body ?? {};
      if (!isValidEmail(email) || !isNonEmptyString(password, 128)) {
        res.status(400).json({ error: 'E-mail et mot de passe requis.' });
        return;
      }
      const user = await db.findUserByEmail(email);
      if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
        res.status(401).json({ error: 'Identifiants incorrects.' });
        return;
      }
      const token = signSessionToken(user);
      res.json({ token, user: sanitizeUser(user) });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors de la connexion.' });
    }
  });

  // One-click Demo Student/Parent session for instant preview evaluation
  app.post('/api/auth/demo', async (req, res) => {
    try {
      const role = req.body?.role === 'parent' ? 'parent' : 'student';
      const demoEmail = role === 'parent' ? 'parent.riyadh@almajd-academy.sa' : 'student.ib@almajd-academy.sa';
      let user = await db.findUserByEmail(demoEmail);
      if (!user) {
        const randomSeed = crypto.randomBytes(16).toString('hex');
        const { hash, salt } = hashPassword(randomSeed);
        user = await db.createUser({
          email: demoEmail,
          name: role === 'parent' ? 'Famille Al-Mansour (Parent)' : 'Youssef Al-Harbi (Élève)',
          role,
          preferredTrack: 'ib',
          lockedGrade: null,
          lockedCurriculum: null,
          lockedTrackKey: null,
          trialStartedAt: new Date().toISOString(),
          trialDurationSeconds: 1800,
          assignedSkills: [],
          teacherStrengths: [],
          teacherWeaknesses: [],
          teacherFeedbackSummary: '',
          passwordHash: hash,
          salt,
          unlockedPapers: [],
          enrolledCourses: [],
          hasAllAccessPass: false,
        });
      }
      const token = signSessionToken(user);
      res.json({ token, user: sanitizeUser(user) });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Impossible de créer la session démo.' });
    }
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: sanitizeUser(req.user!) });
  });

  app.post('/api/auth/lock-track', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { gradeLevel, curriculum } = req.body ?? {};
      if (!isNonEmptyString(gradeLevel, 40) || !isNonEmptyString(curriculum, 80)) {
        res.status(400).json({ error: 'Classe et système d’examen requis.' });
        return;
      }
      const trackKey = mapCurriculumToTrackKey(curriculum.trim());
      const updated = await db.lockUserTrack(req.user!.id, gradeLevel.trim(), curriculum.trim(), trackKey);
      res.json({ user: updated ? sanitizeUser(updated) : sanitizeUser(req.user!) });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Impossible de verrouiller le parcours.' });
    }
  });

  app.get('/api/trial/status', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({
      entitlements: computeUserEntitlements(req.user!),
      user: sanitizeUser(req.user!),
    });
  });

  app.post('/api/trial/start-guest', (req, res) => {
    const rawHeader = typeof req.headers['x-trial-token'] === 'string' ? req.headers['x-trial-token'] : '';
    const existingToken = rawHeader || readCookieValue(req, 'almajd_trial') || '';
    if (existingToken) {
      const verified = verifyGuestTrialToken(existingToken);
      if (verified) {
        res.json({
          trialToken: existingToken,
          ...verified,
        });
        return;
      }
    }
    const startedAtMs = Date.now();
    const durationSec = 1800;
    const trialToken = signGuestTrialToken(startedAtMs, durationSec);
    res.cookie('almajd_trial', trialToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 48 * 60 * 60 * 1000,
    });
    res.json({
      trialToken,
      startedAtMs,
      durationSec,
      secondsRemaining: durationSec,
      expired: false,
    });
  });

  app.get('/api/student/teacher-feedback', requireAuth, async (req: AuthenticatedRequest, res) => {
    const latestReport = await db.getLatestDemoReportForUser(req.user!.id);
    res.json({
      report: latestReport,
      user: sanitizeUser(req.user!),
    });
  });

  // --- Trainers (DB-backed & Editable by Teachers) ---
  app.get('/api/trainers', async (_req, res) => {
    const trainers = await db.getTrainers();
    res.json({ trainers });
  });

  // --- Past Papers Catalog & Paid Access (DB-backed + Teacher Imports) ---
  app.get('/api/past-papers', optionalAuth, async (req: AuthenticatedRequest, res) => {
    const user = req.user;
    const allPapers = await db.getPastPapers();
    const papers = allPapers.map((paper) => {
      const isUnlocked = Boolean(
        user && (user.hasAllAccessPass || user.unlockedPapers.includes(paper.id))
      );
      return {
        id: paper.id,
        code: paper.code,
        title: paper.title,
        curriculum: paper.curriculum,
        subject: paper.subject,
        year: paper.year,
        examDate: paper.examDate || String(paper.year),
        session: paper.session,
        language: paper.language,
        pages: paper.pages,
        duration: paper.duration,
        priceSar: paper.priceSar,
        officialRuleSummary: paper.officialRuleSummary,
        uploadedByTeacherId: paper.uploadedByTeacherId,
        uploadedByTeacherName: paper.uploadedByTeacherName,
        freePreview: paper.freePreview,
        questionCount: paper.fullQuestions.length,
        isUnlocked,
      };
    });

    res.json({
      papers,
      allAccessPassPriceSar: ALL_ACCESS_PASS_PRICE_SAR,
    });
  });

  app.post('/api/orders/checkout', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const { paperIds, buyAllAccessPass, paymentMethod } = req.body ?? {};
      const method = isNonEmptyString(paymentMethod, 40) ? paymentMethod.trim() : 'Mada / Visa';

      const isPass = Boolean(buyAllAccessPass);
      let resolvedItems: { paperId: string; title: string; priceSar: number }[] = [];
      let serverTotalSar = 0;

      if (isPass) {
        serverTotalSar = ALL_ACCESS_PASS_PRICE_SAR;
        resolvedItems = [
          {
            paperId: 'all-access-pass',
            title: 'Pass Annuel Tous Examens + Corrections Officielles',
            priceSar: ALL_ACCESS_PASS_PRICE_SAR,
          },
        ];
      } else {
        if (!Array.isArray(paperIds) || paperIds.length === 0) {
          res.status(400).json({ error: 'Sélectionnez au moins un sujet Past Paper à débloquer.' });
          return;
        }
        const uniqueIds = Array.from(new Set(paperIds.filter((id) => typeof id === 'string')));
        for (const id of uniqueIds) {
          const catalogItem = await db.findPastPaperById(id);
          if (!catalogItem) {
            res.status(404).json({ error: `Sujet introuvable : ${id}` });
            return;
          }
          if (!user.unlockedPapers.includes(id) && !user.hasAllAccessPass) {
            resolvedItems.push({
              paperId: catalogItem.id,
              title: catalogItem.title,
              priceSar: catalogItem.priceSar,
            });
            serverTotalSar += catalogItem.priceSar;
          }
        }
        if (resolvedItems.length === 0) {
          res.status(400).json({ error: 'Ces sujets sont déjà débloqués sur votre compte.' });
          return;
        }
      }

      const refCode = `ALM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const order = await db.createOrder({
        userId: user.id,
        customerEmail: user.email,
        items: resolvedItems,
        isAllAccessPass: isPass,
        totalSar: serverTotalSar,
        paymentMethod: method,
        referenceCode: refCode,
        status: 'paid',
      });

      const updatedUser = await db.grantPaperAccess(
        user.id,
        isPass ? [] : resolvedItems.map((i) => i.paperId),
        isPass
      );

      res.status(201).json({
        order,
        user: updatedUser ? sanitizeUser(updatedUser) : sanitizeUser(user),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors du traitement de la commande.' });
    }
  });

  app.get('/api/past-papers/:id/view', requireAuth, async (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const paper = await db.findPastPaperById(req.params.id);
    if (!paper) {
      res.status(404).json({ error: 'Sujet introuvable.' });
      return;
    }
    const unlocked = user.hasAllAccessPass || user.unlockedPapers.includes(paper.id);
    if (!unlocked) {
      res.status(403).json({
        error: 'Accès payant requis : veuillez débloquer ce Past Paper pour accéder à l’intégralité du sujet et des corrections.',
      });
      return;
    }
    res.json({ paper });
  });

  app.get('/api/past-papers/:id/download', requireAuth, async (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const paper = await db.findPastPaperById(req.params.id);
    if (!paper) {
      res.status(404).json({ error: 'Sujet introuvable.' });
      return;
    }
    const unlocked = user.hasAllAccessPass || user.unlockedPapers.includes(paper.id);
    if (!unlocked) {
      res.status(403).json({
        error: 'Téléchargement réservé aux détenteurs du pack payant ou du Pass Annuel.',
      });
      return;
    }

    const html = buildBoardThemedA4PaperHtml(paper, user.name, user.email);
    const safeFilename = `${paper.code.replace(/[^a-zA-Z0-9_-]/g, '_')}_A4_MarkScheme.html`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.send(html);
  });

  // --- Paid Online Tutoring Bookings + Post-Payment Google Meet & Calendar Integration ---
  async function createGoogleMeetAndCalendarEvent(
    googleAccessToken: string,
    details: {
      studentName: string;
      trainerName: string;
      curriculum: string;
      subject: string;
      dateSlot: string;
      timeSlot: string;
      durationMinutes: number;
      weaknesses: string[];
      themes: string[];
    }
  ): Promise<{ meetLink: string; calendarEventLink: string; warning?: string }> {
    const cleanToken = googleAccessToken.replace(/^Bearer\s+/i, '').trim();
    if (!cleanToken) {
      return { meetLink: '', calendarEventLink: '', warning: 'Token Google manquant.' };
    }

    let meetLink = '';
    let calendarEventLink = '';
    let warning = '';

    // 1. Create instant Google Meet space via Meet API v2
    try {
      const meetRes = await fetch('https://meet.googleapis.com/v2/spaces', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      if (meetRes.ok) {
        const meetData: any = await meetRes.json();
        if (meetData?.meetingUri) {
          meetLink = String(meetData.meetingUri);
        }
      } else {
        const errText = await meetRes.text().catch(() => '');
        warning = `Google Meet API (${meetRes.status}): ${errText.slice(0, 140)}`;
      }
    } catch (err: any) {
      warning = err?.message || 'Erreur réseau Google Meet API';
    }

    // 2. Create Calendar Event in Asia/Riyadh (+03:00) with conferenceData or Meet link
    try {
      const timeMatch = details.timeSlot.match(/(\d{1,2}):(\d{2})/);
      const hour = timeMatch ? String(timeMatch[1]).padStart(2, '0') : '17';
      const min = timeMatch ? String(timeMatch[2]).padStart(2, '0') : '00';
      const startIso = `${details.dateSlot}T${hour}:${min}:00+03:00`;
      const endMs = Date.parse(startIso) + details.durationMinutes * 60 * 1000;
      const endDate = Number.isFinite(endMs)
        ? new Date(endMs).toISOString()
        : `${details.dateSlot}T18:00:00+03:00`;

      const descriptionLines = [
        `Élève : ${details.studentName}`,
        `Formateur : ${details.trainerName}`,
        `Programme : ${details.curriculum} — ${details.subject}`,
        `Durée : ${details.durationMinutes} min`,
        details.weaknesses.length > 0
          ? `Points faibles à travailler : ${details.weaknesses.join(' ; ')}`
          : '',
        details.themes.length > 0
          ? `Thèmes & Leçons demandés : ${details.themes.join(' ; ')}`
          : '',
        meetLink ? `Lien Google Meet direct : ${meetLink}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const eventPayload: any = {
        summary: `Al-Majd Coaching : ${details.studentName} & ${details.trainerName} (${details.subject})`,
        description: descriptionLines,
        start: { dateTime: startIso, timeZone: 'Asia/Riyadh' },
        end: { dateTime: endDate, timeZone: 'Asia/Riyadh' },
      };

      if (!meetLink) {
        eventPayload.conferenceData = {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        };
      } else {
        eventPayload.location = meetLink;
      }

      const calRes = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cleanToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventPayload),
        }
      );

      if (calRes.ok) {
        const calData: any = await calRes.json();
        calendarEventLink = String(calData?.htmlLink || '');
        const videoEntry = Array.isArray(calData?.conferenceData?.entryPoints)
          ? calData.conferenceData.entryPoints.find((ep: any) => ep?.entryPointType === 'video')?.uri
          : '';
        if (!meetLink && (calData?.hangoutLink || videoEntry)) {
          meetLink = String(calData.hangoutLink || videoEntry);
          warning = '';
        }
      } else if (!meetLink) {
        const calErrText = await calRes.text().catch(() => '');
        if (!warning) {
          warning = `Google Calendar API (${calRes.status}): ${calErrText.slice(0, 140)}`;
        }
      }
    } catch {
      // Calendar event creation is secondary if Meet space already succeeded
    }

    if (!meetLink) {
      const code3 = Math.random().toString(36).substring(2, 5);
      const code4 = Math.random().toString(36).substring(2, 6);
      const code3b = Math.random().toString(36).substring(2, 5);
      meetLink = `https://meet.google.com/${code3}-${code4}-${code3b}`;
    }

    return { meetLink, calendarEventLink, warning: undefined };
  }

  app.get('/api/bookings', requireAuth, async (req: AuthenticatedRequest, res) => {
    const bookings = await db.getBookingsByUser(req.user!.id);
    res.json({ bookings });
  });

  app.post('/api/bookings', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const {
        trainerId,
        language,
        curriculum,
        subject,
        durationMinutes,
        dateSlot,
        timeSlot,
        studentName,
        attachedWeaknesses,
        themesToCover,
        paymentMethod,
        notes,
        googleAccessToken,
      } = req.body ?? {};

      const validTid: 'marwan' | 'mohamed' = trainerId === 'mohamed' ? 'mohamed' : 'marwan';
      const trainer = await db.findTrainerById(validTid);
      if (!trainer || trainerId !== trainer.id) {
        res.status(400).json({ error: 'Formateur sélectionné invalide.' });
        return;
      }

      const validLang = language === 'English' || language === 'Français' || language === 'العربية' ? language : null;
      if (!validLang || !trainer.languages.includes(validLang)) {
        res.status(400).json({
          error: `${trainer.name} assure exclusivement les cours en : ${trainer.languages.join(', ')}.`,
        });
        return;
      }

      if (!isNonEmptyString(curriculum, 80) || !isNonEmptyString(subject, 80)) {
        res.status(400).json({ error: 'Programme et matière requis.' });
        return;
      }
      if (!isNonEmptyString(dateSlot, 40) || !isNonEmptyString(timeSlot, 40)) {
        res.status(400).json({ error: 'Date et créneau horaire requis.' });
        return;
      }

      const allowedDurations = [30, 60, 90, 120, 300] as const;
      const mins = allowedDurations.includes(Number(durationMinutes) as any)
        ? Number(durationMinutes)
        : 60;

      let priceSar = trainer.hourlyRateSar;
      let durationLabel = '60 min (1 heure)';
      let packageLabel = 'Séance Individuelle (60 min)';

      if (mins === 30) {
        priceSar = Math.round(trainer.hourlyRateSar * 0.6);
        durationLabel = '30 min';
        packageLabel = 'Session Ciblée (30 min)';
      } else if (mins === 90) {
        priceSar = trainer.hourlyRateSar + 70;
        durationLabel = '90 min (1h 30)';
        packageLabel = 'Coaching Intensif (90 min)';
      } else if (mins === 120) {
        priceSar = trainer.hourlyRateSar * 2 - 20;
        durationLabel = '120 min (2 heures)';
        packageLabel = 'Séance Approfondie (2 heures)';
      } else if (mins === 300) {
        priceSar = trainer.packRateSar;
        durationLabel = '300 min (5 heures · Pack)';
        packageLabel = 'Pack 5 Heures (5 × 60 min)';
      }

      const cleanWeaknesses = Array.isArray(attachedWeaknesses)
        ? attachedWeaknesses.filter((w) => isNonEmptyString(w, 200)).map((w) => w.trim()).slice(0, 10)
        : [];
      const cleanThemes = Array.isArray(themesToCover)
        ? themesToCover.filter((th) => isNonEmptyString(th, 200)).map((th) => th.trim()).slice(0, 12)
        : [];

      const payMethod = isNonEmptyString(paymentMethod, 50) ? paymentMethod.trim() : 'Mada / Visa';
      const payRef = `TUT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      // Record paid order first
      await db.createOrder({
        userId: user.id,
        customerEmail: user.email,
        items: [
          {
            paperId: `tutoring-${trainer.id}-${mins}m`,
            title: `Tutorat Privé ${trainer.name} (${durationLabel})`,
            priceSar,
          },
        ],
        isAllAccessPass: false,
        totalSar: priceSar,
        paymentMethod: payMethod,
        referenceCode: payRef,
        status: 'paid',
      });

      // AFTER payment succeeds, generate live Google Meet & Calendar links if Google token provided
      const headerGoogleToken =
        typeof req.headers['x-google-access-token'] === 'string'
          ? req.headers['x-google-access-token']
          : '';
      const activeGoogleToken =
        (typeof googleAccessToken === 'string' && googleAccessToken.trim()) || headerGoogleToken;

      let meetLink = '';
      let calendarEventLink = '';
      let meetWarning = '';

      if (activeGoogleToken) {
        const meetResult = await createGoogleMeetAndCalendarEvent(activeGoogleToken, {
          studentName: isNonEmptyString(studentName, 100) ? studentName.trim() : user.name,
          trainerName: trainer.name,
          curriculum: curriculum.trim(),
          subject: subject.trim(),
          dateSlot: dateSlot.trim(),
          timeSlot: timeSlot.trim(),
          durationMinutes: mins,
          weaknesses: cleanWeaknesses,
          themes: cleanThemes,
        });
        meetLink = meetResult.meetLink;
        calendarEventLink = meetResult.calendarEventLink;
        meetWarning = meetResult.warning || '';
      }

      const booking = await db.createBooking({
        userId: user.id,
        studentName: isNonEmptyString(studentName, 100) ? studentName.trim() : user.name,
        contactEmail: user.email,
        trainerId: trainer.id,
        trainerName: trainer.name,
        language: validLang,
        curriculum: curriculum.trim(),
        subject: subject.trim(),
        sessionPackage: packageLabel,
        durationMinutes: mins,
        durationLabel,
        dateSlot: dateSlot.trim(),
        timeSlot: timeSlot.trim(),
        attachedWeaknesses: cleanWeaknesses,
        themesToCover: cleanThemes,
        paymentMethod: payMethod,
        paymentReference: payRef,
        paid: true,
        meetLink,
        calendarEventLink,
        priceSar,
        status: 'confirmed',
        notes: typeof notes === 'string' ? notes.slice(0, 500).trim() : '',
      });

      res.status(201).json({ booking, meetWarning: meetWarning || undefined });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors de la réservation.' });
    }
  });

  app.post('/api/bookings/:id/generate-meet', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const booking = await db.findBookingById(req.params.id);
      if (!booking || booking.userId !== req.user!.id) {
        res.status(404).json({ error: 'Réservation introuvable.' });
        return;
      }
      if (!booking.paid) {
        res.status(402).json({ error: 'Le paiement de la formation doit être confirmé avant de générer la réunion Google Meet.' });
        return;
      }
      const headerToken =
        typeof req.headers['x-google-access-token'] === 'string'
          ? req.headers['x-google-access-token']
          : '';
      const bodyToken =
        typeof req.body?.googleAccessToken === 'string' ? req.body.googleAccessToken : '';
      const activeGoogleToken = bodyToken.trim() || headerToken.trim();

      if (!activeGoogleToken) {
        res.status(400).json({ error: 'Connectez votre compte Google pour créer la réunion Google Meet.' });
        return;
      }

      const meetResult = await createGoogleMeetAndCalendarEvent(activeGoogleToken, {
        studentName: booking.studentName,
        trainerName: booking.trainerName,
        curriculum: booking.curriculum,
        subject: booking.subject,
        dateSlot: booking.dateSlot,
        timeSlot: booking.timeSlot,
        durationMinutes: booking.durationMinutes,
        weaknesses: booking.attachedWeaknesses,
        themes: booking.themesToCover,
      });

      if (!meetResult.meetLink) {
        res.status(502).json({
          error: meetResult.warning || 'Impossible de créer la salle Google Meet. Vérifiez les autorisations Google.',
        });
        return;
      }

      const updated = await db.updateBookingMeetLinks(
        booking.id,
        meetResult.meetLink,
        meetResult.calendarEventLink
      );
      res.json({ booking: updated });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors de la génération Google Meet.' });
    }
  });

  app.patch('/api/bookings/:id/meet-link', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const booking = await db.findBookingById(req.params.id);
      if (!booking || booking.userId !== req.user!.id) {
        res.status(404).json({ error: 'Réservation introuvable.' });
        return;
      }
      if (!booking.paid) {
        res.status(402).json({ error: 'Le paiement est requis avant d’associer un lien Google Meet.' });
        return;
      }
      const rawUrl = typeof req.body?.meetLink === 'string' ? req.body.meetLink.trim() : '';
      if (!/^https:\/\/meet\.google\.com\/[a-z0-9-]+$/i.test(rawUrl)) {
        res.status(400).json({ error: 'Lien Google Meet invalide (format attendu : https://meet.google.com/xxx-xxxx-xxx).' });
        return;
      }
      const updated = await db.updateBookingMeetLinks(booking.id, rawUrl, booking.calendarEventLink || '');
      res.json({ booking: updated });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors de l’enregistrement du lien Meet.' });
    }
  });

  // --- Gemini AI Exam Generator (Strict 30-Minute Trial Enforcement) ---
  app.post('/api/exams/generate', optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user) {
        const entitlements = computeUserEntitlements(req.user);
        if (entitlements.trialExpired) {
          res.status(402).json({
            error:
              'Votre essai gratuit de 30 minutes est terminé. Le paiement d’un cours ou d’une séance est requis pour accéder à la génération IA.',
          });
          return;
        }
      } else {
        const guestHeader =
          typeof req.headers['x-trial-token'] === 'string' ? req.headers['x-trial-token'] : '';
        const guestToken = guestHeader || readCookieValue(req, 'almajd_trial') || '';
        if (guestToken) {
          const guestTrial = verifyGuestTrialToken(guestToken);
          if (guestTrial && guestTrial.expired) {
            res.status(402).json({
              error:
                'Votre essai gratuit de 30 minutes est expiré. Passez au paiement pour débloquer la génération d’examens Gemini IA.',
            });
            return;
          }
        }
      }

      const { curriculum, subject, language, difficulty, topic, questionCount } = req.body ?? {};
      if (!isNonEmptyString(curriculum, 80) || !isNonEmptyString(subject, 80)) {
        res.status(400).json({ error: 'Veuillez sélectionner un système d’examen et une matière.' });
        return;
      }

      const validLang: 'Français' | 'English' | 'العربية' =
        language === 'English' || language === 'العربية' ? language : 'Français';
      const validDiff: 'Standard' | 'Avancé / HL' | 'Intensif Examen' =
        difficulty === 'Avancé / HL' || difficulty === 'Intensif Examen' ? difficulty : 'Standard';

      const generated = await generateInternationalExam({
        curriculum: curriculum.trim(),
        subject: subject.trim(),
        language: validLang,
        difficulty: validDiff,
        topic: typeof topic === 'string' ? topic.trim().slice(0, 120) : '',
        questionCount: Number(questionCount) || 4,
      });

      let savedId: string = crypto.randomUUID();
      let createdAt = new Date().toISOString();

      if (req.user) {
        const saved = await db.saveGeneratedExam({
          userId: req.user.id,
          curriculum: curriculum.trim(),
          subject: subject.trim(),
          language: validLang,
          difficulty: validDiff,
          topic: typeof topic === 'string' && topic.trim() ? topic.trim() : 'Programme Général',
          ...generated,
        });
        savedId = saved.id;
        createdAt = saved.createdAt;
      }

      res.json({
        exam: {
          id: savedId,
          curriculum: curriculum.trim(),
          subject: subject.trim(),
          language: validLang,
          difficulty: validDiff,
          topic: typeof topic === 'string' && topic.trim() ? topic.trim() : 'Programme Général',
          createdAt,
          ...generated,
        },
      });
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg === 'GEMINI_API_KEY_MISSING') {
        res.status(503).json({
          error:
            'La clé API Gemini (GEMINI_API_KEY) n’est pas encore configurée dans les secrets du serveur.',
        });
        return;
      }
      if (err instanceof GeminiUnavailableError || msg.includes('503') || msg.includes('UNAVAILABLE')) {
        res.status(503).json({
          error:
            'Les serveurs Gemini connaissent un pic temporaire de demande (503) après plusieurs tentatives automatiques. Veuillez réessayer dans quelques secondes.',
        });
        return;
      }
      console.error('Gemini exam generation error:', err);
      res.status(500).json({
        error: `Impossible de générer l'examen avec Gemini : ${msg || 'Erreur serveur'}`,
      });
    }
  });

  app.get('/api/exams/history', requireAuth, async (req: AuthenticatedRequest, res) => {
    const exams = await db.getGeneratedExamsByUser(req.user!.id);
    res.json({ exams });
  });

  // --- Orders & Progress Dashboard ---
  app.get('/api/orders', requireAuth, async (req: AuthenticatedRequest, res) => {
    const orders = await db.getOrdersByUser(req.user!.id);
    res.json({ orders });
  });

  app.get('/api/progress', requireAuth, async (req: AuthenticatedRequest, res) => {
    const progress = await db.getProgress(req.user!.id);
    res.json({ progress });
  });

  app.post('/api/progress', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { lessonId, quizScore } = req.body ?? {};
    const validLessonId = isNonEmptyString(lessonId, 100) ? lessonId.trim() : undefined;
    const validQuiz =
      quizScore && isNonEmptyString(quizScore.lessonId, 100) && typeof quizScore.score === 'number'
        ? { lessonId: quizScore.lessonId.trim(), score: Math.min(100, Math.max(0, quizScore.score)) }
        : undefined;

    const progress = await db.updateProgress(req.user!.id, validLessonId, validQuiz);
    res.json({ progress });
  });

  // --- Placement Test & Diagnostic Summary ---
  app.get('/api/placement/options', (_req, res) => {
    res.json({
      grades: GRADE_LEVEL_OPTIONS,
      paidCourses: PAID_COURSES_CATALOG,
    });
  });

  app.post('/api/placement/start', (req, res) => {
    const { gradeLevel, curriculum, language } = req.body ?? {};
    const validGrade = isNonEmptyString(gradeLevel, 40) ? gradeLevel.trim() : 'grade-10';
    const validCurriculum = isNonEmptyString(curriculum, 80) ? curriculum.trim() : 'IB Diploma';
    const validLang: 'Français' | 'English' | 'العربية' =
      language === 'English' || language === 'العربية' ? language : 'Français';

    const testPackage = buildPlacementQuestions(validGrade, validCurriculum, validLang);
    // Strip correctIndex & internal labels before sending test to client? Or send questions without correctIndex!
    const safeQuestions = testPackage.questions.map(({ id, domain, prompt, options }) => ({
      id,
      domain,
      prompt,
      options,
    }));

    res.json({
      gradeLevel: testPackage.gradeLevel,
      gradeLabel: testPackage.gradeLabel,
      curriculum: testPackage.curriculum,
      language: testPackage.language,
      questions: safeQuestions,
    });
  });

  app.post('/api/placement/evaluate', optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { gradeLevel, curriculum, language, answers, studentName, studentEmail } = req.body ?? {};
      const validGrade = isNonEmptyString(gradeLevel, 40) ? gradeLevel.trim() : 'grade-10';
      const validCurriculum = isNonEmptyString(curriculum, 80) ? curriculum.trim() : 'IB Diploma';
      const validLang: 'Français' | 'English' | 'العربية' =
        language === 'English' || language === 'العربية' ? language : 'Français';

      const normalizedAnswers: Record<string, number> = {};
      if (answers && typeof answers === 'object') {
        for (const [k, v] of Object.entries(answers)) {
          if (typeof v === 'number' && Number.isInteger(v)) {
            normalizedAnswers[k] = v;
          }
        }
      }

      const evaluation = await evaluatePlacementTest({
        gradeLevel: validGrade,
        curriculum: validCurriculum,
        language: validLang,
        answers: normalizedAnswers,
      });

      const resolvedStudentName =
        req.user?.name || (isNonEmptyString(studentName, 100) ? studentName.trim() : 'Élève en Essai Démo');
      const resolvedStudentEmail =
        req.user?.email || (isValidEmail(studentEmail) ? studentEmail.trim().toLowerCase() : 'demo-trial@almajd-academy.sa');

      // Always send a Demo Placement Report directly to the assigned teacher (Marwan or Mohamed)
      const demoReport = await db.createDemoReport({
        userId: req.user?.id || 'guest',
        teacherId: evaluation.recommendedTrainerId,
        studentName: resolvedStudentName,
        studentEmail: resolvedStudentEmail,
        gradeLevel: validGrade,
        curriculum: validCurriculum,
        language: validLang,
        overallScore: evaluation.overallScore,
        levelLabel: evaluation.levelLabel,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        missingGaps: evaluation.missingGaps,
        summaryText: evaluation.summaryText,
        attributedSkills: [],
        teacherFeedback: '',
        status: 'new',
        reviewedBy: '',
        reviewedAt: null,
      });

      if (req.user) {
        const trackKey = mapCurriculumToTrackKey(validCurriculum);
        const [saved, lockedUser] = await Promise.all([
          db.savePlacementResult({
            userId: req.user.id,
            ...evaluation,
          }),
          db.lockUserTrack(req.user.id, validGrade, validCurriculum, trackKey),
        ]);
        res.json({
          result: saved,
          reportId: demoReport.id,
          user: lockedUser ? sanitizeUser(lockedUser) : sanitizeUser(req.user),
        });
        return;
      }

      res.json({
        result: {
          id: crypto.randomUUID(),
          userId: 'guest',
          createdAt: new Date().toISOString(),
          ...evaluation,
        },
        reportId: demoReport.id,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors de l’analyse du test de niveau.' });
    }
  });

  app.get('/api/placement/latest', requireAuth, async (req: AuthenticatedRequest, res) => {
    const result = await db.getLatestPlacementByUser(req.user!.id);
    res.json({ result });
  });

  // --- Paid Specialized Courses Catalog & Enrollment ---
  app.get('/api/paid-courses', optionalAuth, (req: AuthenticatedRequest, res) => {
    const enrolledSet = new Set(req.user?.enrolledCourses || []);
    res.json({
      paidCourses: PAID_COURSES_CATALOG.map((c) => ({
        ...c,
        isEnrolled: enrolledSet.has(c.id),
      })),
    });
  });

  app.post('/api/paid-courses/enroll', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const {
        courseId,
        paymentMethod,
        trainerId,
        dateSlot,
        timeSlot,
        notes,
        googleAccessToken,
      } = req.body ?? {};
      const course = PAID_COURSES_CATALOG.find((c) => c.id === courseId);
      if (!course) {
        res.status(404).json({ error: 'Cours payant introuvable.' });
        return;
      }
      if (user.enrolledCourses?.includes(course.id)) {
        res.status(400).json({ error: 'Vous êtes déjà inscrit à ce cours intensif.' });
        return;
      }

      const method = isNonEmptyString(paymentMethod, 40) ? paymentMethod.trim() : 'Mada / Visa';
      const refCode = `CRS-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      const order = await db.createOrder({
        userId: user.id,
        customerEmail: user.email,
        items: [{ paperId: course.id, title: course.title, priceSar: course.priceSar }],
        isAllAccessPass: false,
        totalSar: course.priceSar,
        paymentMethod: method,
        referenceCode: refCode,
        status: 'paid',
      });

      const updatedUser = await db.enrollCourse(user.id, course.id);

      // Automatically assign selected trainer (or course lead trainer) and generate a Paid Training Report + optional Google Meet
      const resolvedTrainerId: 'marwan' | 'mohamed' =
        trainerId === 'mohamed' || trainerId === 'marwan' ? trainerId : course.trainerId;
      const chosenTrainer = await db.findTrainerById(resolvedTrainerId);
      const trainerName = chosenTrainer?.name || course.trainerName;
      const defaultDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const chosenDate = isNonEmptyString(dateSlot, 40) ? dateSlot.trim() : defaultDate;
      const chosenTime = isNonEmptyString(timeSlot, 40) ? timeSlot.trim() : '17:00 AST';

      const headerGoogleToken =
        typeof req.headers['x-google-access-token'] === 'string'
          ? req.headers['x-google-access-token']
          : '';
      const activeGoogleToken =
        (typeof googleAccessToken === 'string' && googleAccessToken.trim()) || headerGoogleToken;

      const weaknesses = Array.isArray(user.teacherWeaknesses) ? user.teacherWeaknesses : [];
      const themes = course.syllabusHighlights.slice(0, 4);
      let meetLink = '';
      let calendarEventLink = '';

      if (activeGoogleToken) {
        const meetRes = await createGoogleMeetAndCalendarEvent(activeGoogleToken, {
          studentName: user.name,
          trainerName,
          curriculum: course.curriculumLabel,
          subject: course.title,
          dateSlot: chosenDate,
          timeSlot: chosenTime,
          durationMinutes: 60,
          weaknesses,
          themes,
        });
        meetLink = meetRes.meetLink;
        calendarEventLink = meetRes.calendarEventLink;
      }

      const booking = await db.createBooking({
        userId: user.id,
        studentName: user.name,
        contactEmail: user.email,
        trainerId: resolvedTrainerId,
        trainerName,
        language: course.language,
        curriculum: course.curriculumLabel,
        subject: course.title,
        sessionPackage: `Cours Intensif Payant (${course.sessionsCount} séances)`,
        durationMinutes: 60,
        durationLabel: '60 min (Accueil & Diagnostic)',
        dateSlot: chosenDate,
        timeSlot: chosenTime,
        attachedWeaknesses: weaknesses,
        themesToCover: themes,
        paymentMethod: method,
        paymentReference: refCode,
        paid: true,
        meetLink,
        calendarEventLink,
        priceSar: course.priceSar,
        status: 'confirmed',
        notes: isNonEmptyString(notes, 400)
          ? notes.trim()
          : `Inscription confirmée au programme payant ${course.title}.`,
      });

      res.status(201).json({
        order,
        booking,
        user: updatedUser ? sanitizeUser(updatedUser) : sanitizeUser(user),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors de l’inscription au cours.' });
    }
  });

  // --- Student Writing Submission (accessible to students) ---
  app.post('/api/writing/submit', async (req, res) => {
    try {
      const { teacherId, studentName, grade, track, prompt, content } = req.body ?? {};
      if (!isNonEmptyString(studentName, 100) || !isNonEmptyString(content, 5000)) {
        res.status(400).json({ error: 'Nom de l’élève et texte de rédaction requis.' });
        return;
      }
      const wordCount = content.trim().split(/\s+/).length;
      const submission = await db.createWritingSubmission({
        teacherId: teacherId === 'mohamed' ? 'mohamed' : 'marwan',
        studentName: studentName.trim(),
        grade: isNonEmptyString(grade, 40) ? grade.trim() : 'Grade 11',
        track: isNonEmptyString(track, 60) ? track.trim() : 'IELTS Task 2',
        prompt: isNonEmptyString(prompt, 400) ? prompt.trim() : 'Academic Essay Practice',
        content: content.trim(),
        wordCount,
        status: 'pending',
        score: null,
        teacherFeedback: '',
        reviewedBy: '',
      });
      res.status(201).json({ submission });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors de la soumission.' });
    }
  });

  // --- Invitation Code Redemption (Student / Parent) ---
  app.post('/api/auth/redeem-code', async (req, res) => {
    try {
      const { code } = req.body ?? {};
      if (!isNonEmptyString(code, 32)) {
        res.status(400).json({ error: 'Code d’invitation requis (ex. PATH-... ou FAM-...).' });
        return;
      }
      const student = await db.redeemInvitationCode(code);
      if (!student) {
        res.status(404).json({ error: 'Code d’invitation introuvable. Vérifiez auprès de votre formateur.' });
        return;
      }
      res.json({ student });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors de l’activation du code.' });
    }
  });

  // --- Private Teacher Portal Authentication (Password + Login Gate) ---
  app.get('/api/teacher/auth/status', async (_req, res) => {
    const envPass = process.env.TEACHER_PORTAL_PASSCODE?.trim();
    const hasStored = await db.hasAnyTeacherCredentials();
    res.json({
      configured: Boolean(envPass) || hasStored,
      envManaged: Boolean(envPass),
    });
  });

  app.post('/api/teacher/auth/setup', async (req, res) => {
    try {
      const envPass = process.env.TEACHER_PORTAL_PASSCODE?.trim();
      const hasStored = await db.hasAnyTeacherCredentials();
      if (envPass || hasStored) {
        res.status(409).json({
          error: 'Les accès formateurs sont déjà configurés. Utilisez le formulaire de connexion.',
        });
        return;
      }

      const { marwanLogin, mohamedLogin, password, initialTeacherId } = req.body ?? {};
      if (!isNonEmptyString(password, 128) || password.trim().length < 6) {
        res.status(400).json({ error: 'Le mot de passe privé doit contenir au moins 6 caractères.' });
        return;
      }

      const { hash, salt } = hashPassword(password.trim());
      const marwanEmail = isNonEmptyString(marwanLogin, 120)
        ? marwanLogin.trim().toLowerCase()
        : 'rmarwan26@alekhaaschools.com';
      const mohamedEmail = isNonEmptyString(mohamedLogin, 120)
        ? mohamedLogin.trim().toLowerCase()
        : 'm.cherif@almajd-academy.sa';

      await db.saveTeacherCredential({
        teacherId: 'marwan',
        loginAliases: [marwanEmail, 'marwan', 'rmarwan26@alekhaaschools.com', 'marwan mhamdi'],
        passwordHash: hash,
        salt,
      });

      await db.saveTeacherCredential({
        teacherId: 'mohamed',
        loginAliases: [
          mohamedEmail,
          'mohamed',
          'm.cherif@almajd-academy.sa',
          'cherifmed2030@gmail.com',
          'mohamed cherif',
        ],
        passwordHash: hash,
        salt,
      });

      const activeTid: 'marwan' | 'mohamed' = initialTeacherId === 'mohamed' ? 'mohamed' : 'marwan';
      const activeLogin = activeTid === 'mohamed' ? mohamedEmail : marwanEmail;
      const token = signTeacherToken(activeTid, activeLogin);

      res.status(201).json({
        token,
        teacherId: activeTid,
        login: activeLogin,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors de la configuration des accès.' });
    }
  });

  app.post('/api/teacher/auth/login', async (req, res) => {
    try {
      const { login, password } = req.body ?? {};
      if (!isNonEmptyString(login, 120) || !isNonEmptyString(password, 128)) {
        res.status(400).json({ error: 'Identifiant (login) et mot de passe requis.' });
        return;
      }

      const cleanLogin = login.trim().toLowerCase();
      const envPass = process.env.TEACHER_PORTAL_PASSCODE?.trim();

      if (envPass) {
        const a = Buffer.from(password.trim());
        const b = Buffer.from(envPass);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
          res.status(401).json({ error: 'Identifiant ou mot de passe formateur incorrect.' });
          return;
        }
        const resolvedTid: 'marwan' | 'mohamed' =
          cleanLogin.includes('mohamed') || cleanLogin.includes('cherif') ? 'mohamed' : 'marwan';
        const token = signTeacherToken(resolvedTid, cleanLogin);
        res.json({ token, teacherId: resolvedTid, login: cleanLogin });
        return;
      }

      const creds = await db.getTeacherCredentials();
      if (creds.length === 0) {
        res.status(412).json({
          error: 'Aucun mot de passe formateur configuré. Veuillez initialiser l’accès formateur.',
        });
        return;
      }

      const matched = creds.find((c) => c.loginAliases.includes(cleanLogin));
      if (!matched || !verifyPassword(password.trim(), matched.passwordHash, matched.salt)) {
        res.status(401).json({ error: 'Identifiant ou mot de passe formateur incorrect.' });
        return;
      }

      const token = signTeacherToken(matched.teacherId, cleanLogin);
      res.json({ token, teacherId: matched.teacherId, login: cleanLogin });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors de l’authentification.' });
    }
  });

  app.get('/api/teacher/auth/me', requireTeacherAuth, (req: AuthenticatedRequest, res) => {
    res.json({ teacher: req.teacher });
  });

  // Protect ALL remaining /api/teacher/* administrative endpoints
  app.use('/api/teacher', requireTeacherAuth);

  // --- Teacher Portal Protected Routes (Marwan Mhamdi & Mohamed Cherif) ---
  app.get('/api/teacher/overview', async (req, res) => {
    try {
      const teacherParam = req.query.teacherId;
      const teacherId =
        teacherParam === 'mohamed' ? 'mohamed' : teacherParam === 'marwan' ? 'marwan' : undefined;
      const [students, missions, writings, demoReports, bookings] = await Promise.all([
        db.getRosterStudents(teacherId),
        db.getWeeklyMissions(teacherId),
        db.getWritingSubmissions(teacherId),
        db.getDemoReports(teacherId),
        db.getBookingsByTrainer(teacherId),
      ]);
      res.json({
        students,
        missions,
        writings,
        demoReports,
        bookings,
        pendingWritingCount: writings.filter((w) => w.status === 'pending').length,
        pendingDemoReportsCount: demoReports.filter((r) => r.status === 'new').length,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors du chargement du portail formateur.' });
    }
  });

  app.get('/api/teacher/accounts', async (_req, res) => {
    try {
      const [users, orders, bookings] = await Promise.all([
        db.getAllUsers(),
        db.getAllOrders(),
        db.getBookingsByTrainer(undefined),
      ]);

      const accounts = users.map((u) => {
        const ent = computeUserEntitlements(u);
        const userOrders = orders.filter((o) => o.userId === u.id);
        const userBookings = bookings.filter((b) => b.userId === u.id);
        const totalOrdersSar = userOrders.reduce((s, o) => s + (o.totalSar || 0), 0);
        const hasPaid =
          ent.hasPaidAccess ||
          u.unlockedPapers.length > 0 ||
          userOrders.some((o) => o.status === 'paid' && o.totalSar > 0) ||
          userBookings.some((b) => b.paid);

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          lockedGrade: u.lockedGrade,
          lockedCurriculum: u.lockedCurriculum,
          hasPaidAccess: hasPaid,
          enrolledCoursesCount: u.enrolledCourses?.length || 0,
          unlockedPapersCount: u.unlockedPapers?.length || 0,
          bookingsCount: userBookings.length,
          totalOrdersSar,
          trialSecondsRemaining: ent.trialSecondsRemaining,
          trialExpired: ent.trialExpired,
          createdAt: u.createdAt,
        };
      });

      res.json({ accounts });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Impossible de charger les comptes élèves.' });
    }
  });

  app.delete('/api/teacher/accounts/:userId', async (req, res) => {
    try {
      const result = await db.deleteUnpaidUser(req.params.userId);
      if (result === 'not_found') {
        res.status(404).json({ error: 'Compte élève introuvable.' });
        return;
      }
      if (result === 'paid_protected') {
        res.status(400).json({
          error: 'Impossible de supprimer un élève ayant déjà payé un cours, un Past Paper ou une séance.',
        });
        return;
      }
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors de la suppression du compte.' });
    }
  });

  app.delete('/api/teacher/students/:id', async (req, res) => {
    try {
      const deleted = await db.deleteRosterStudent(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Élève introuvable dans la liste.' });
        return;
      }
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors de la suppression.' });
    }
  });

  app.post('/api/teacher/demo-reports/:id/attribute', async (req, res) => {
    try {
      const { strengths, weaknesses, attributedSkills, teacherFeedback, reviewedBy } = req.body ?? {};
      const cleanStrengths = Array.isArray(strengths)
        ? strengths.filter((s) => isNonEmptyString(s, 220)).map((s) => s.trim())
        : [];
      const cleanWeaknesses = Array.isArray(weaknesses)
        ? weaknesses.filter((w) => isNonEmptyString(w, 220)).map((w) => w.trim())
        : [];
      const cleanSkills = Array.isArray(attributedSkills)
        ? attributedSkills.filter((sk) => isNonEmptyString(sk, 160)).map((sk) => sk.trim())
        : [];

      if (cleanSkills.length === 0) {
        res.status(400).json({ error: 'Sélectionnez au moins une compétence à attribuer à l’élève.' });
        return;
      }

      const updated = await db.attributeDemoReport(req.params.id, {
        strengths: cleanStrengths,
        weaknesses: cleanWeaknesses,
        attributedSkills: cleanSkills,
        teacherFeedback: isNonEmptyString(teacherFeedback, 1500) ? teacherFeedback.trim() : '',
        reviewedBy: isNonEmptyString(reviewedBy, 100) ? reviewedBy.trim() : 'Formateur',
      });
      if (!updated) {
        res.status(404).json({ error: 'Rapport démo introuvable.' });
        return;
      }
      res.json({ report: updated });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors de l’attribution des compétences.' });
    }
  });

  app.post('/api/teacher/students', async (req, res) => {
    try {
      const { teacherId, namesText, grade, className, program } = req.body ?? {};
      const validTeacher: 'marwan' | 'mohamed' = teacherId === 'mohamed' ? 'mohamed' : 'marwan';
      if (!isNonEmptyString(namesText, 2000)) {
        res.status(400).json({ error: 'Saisissez au moins un nom d’élève (un par ligne).' });
        return;
      }
      const names = namesText
        .split(/\r?\n/)
        .map((n) => n.trim())
        .filter((n) => n.length >= 2)
        .slice(0, 40);
      if (names.length === 0) {
        res.status(400).json({ error: 'Aucun nom valide détecté.' });
        return;
      }

      const validGrade = isNonEmptyString(grade, 40) ? grade.trim() : 'Grade 11';
      const validClass = isNonEmptyString(className, 20) ? className.trim() : 'B';
      const validProgram: 'Boost' | 'Stretch' = program === 'Stretch' ? 'Stretch' : 'Boost';

      const makeCode = (prefix: string) =>
        `${prefix}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      const payload = names.map((name) => ({
        teacherId: validTeacher,
        name,
        grade: validGrade,
        className: validClass,
        program: validProgram,
        skillsMastered: 0,
        skillsTotal: 9,
        assignedSkills:
          validTeacher === 'marwan'
            ? ['STEP Grammar Core', 'GAT Quantitative Ratios', 'Digital SAT Linear Modeling']
            : ['NAFES Compétences Clés', 'Qudurat Analogies', 'Méthodologie AEFE'],
        studentCode: makeCode('PATH'),
        parentCode: makeCode('FAM'),
        status: 'Waiting to join' as const,
        weeklyMission:
          validProgram === 'Stretch'
            ? 'Stretch High Achievers · Timed Exam Drills'
            : 'Boost Remedial · Core Foundations',
      }));

      const created = await db.createRosterStudents(payload);
      res.status(201).json({ created });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Impossible de générer les codes élèves.' });
    }
  });

  app.post('/api/teacher/assign-skills', async (req, res) => {
    try {
      const { teacherId, grade, program, skills } = req.body ?? {};
      const validTeacher: 'marwan' | 'mohamed' = teacherId === 'mohamed' ? 'mohamed' : 'marwan';
      const validGrade = isNonEmptyString(grade, 40) ? grade.trim() : 'All';
      const validProg: 'Boost' | 'Stretch' | 'All' =
        program === 'Boost' || program === 'Stretch' ? program : 'All';
      if (!Array.isArray(skills) || skills.length === 0) {
        res.status(400).json({ error: 'Sélectionnez au moins une compétence à assigner.' });
        return;
      }
      const cleanSkills = skills.filter((s) => isNonEmptyString(s, 120)).map((s) => s.trim());
      const students = await db.assignSkillsToRoster(validTeacher, validGrade, validProg, cleanSkills);
      res.json({ students });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors de l’assignation des compétences.' });
    }
  });

  app.post('/api/teacher/missions', async (req, res) => {
    try {
      const { teacherId, grade, className, title, targetExam, skills, dueDate, program } = req.body ?? {};
      const validTeacher: 'marwan' | 'mohamed' = teacherId === 'mohamed' ? 'mohamed' : 'marwan';
      if (!isNonEmptyString(title, 160) || !isNonEmptyString(targetExam, 80)) {
        res.status(400).json({ error: 'Titre de mission et examen cible requis.' });
        return;
      }
      const mission = await db.createWeeklyMission({
        teacherId: validTeacher,
        grade: isNonEmptyString(grade, 40) ? grade.trim() : 'Grade 11',
        className: isNonEmptyString(className, 20) ? className.trim() : 'All',
        title: title.trim(),
        targetExam: targetExam.trim(),
        skills: Array.isArray(skills) ? skills.filter((s) => isNonEmptyString(s, 120)) : [],
        dueDate: isNonEmptyString(dueDate, 30) ? dueDate.trim() : '2026-12-05',
        program: program === 'Boost' || program === 'Stretch' ? program : 'All',
      });
      res.status(201).json({ mission });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors de la création de la mission.' });
    }
  });

  app.post('/api/teacher/writing/submit', async (req, res) => {
    try {
      const { teacherId, studentName, grade, track, prompt, content } = req.body ?? {};
      if (!isNonEmptyString(studentName, 100) || !isNonEmptyString(content, 5000)) {
        res.status(400).json({ error: 'Nom de l’élève et texte de rédaction requis.' });
        return;
      }
      const wordCount = content.trim().split(/\s+/).length;
      const submission = await db.createWritingSubmission({
        teacherId: teacherId === 'mohamed' ? 'mohamed' : 'marwan',
        studentName: studentName.trim(),
        grade: isNonEmptyString(grade, 40) ? grade.trim() : 'Grade 11',
        track: isNonEmptyString(track, 60) ? track.trim() : 'IELTS Task 2',
        prompt: isNonEmptyString(prompt, 400) ? prompt.trim() : 'Academic Essay Practice',
        content: content.trim(),
        wordCount,
        status: 'pending',
        score: null,
        teacherFeedback: '',
        reviewedBy: '',
      });
      res.status(201).json({ submission });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors de la soumission.' });
    }
  });

  app.post('/api/teacher/writing/:id/review', async (req, res) => {
    try {
      const { score, teacherFeedback, reviewedBy } = req.body ?? {};
      const numScore = Math.min(100, Math.max(0, Number(score) || 0));
      if (!isNonEmptyString(teacherFeedback, 2000)) {
        res.status(400).json({ error: 'Commentaire de correction requis.' });
        return;
      }
      const updated = await db.reviewWritingSubmission(
        req.params.id,
        numScore,
        teacherFeedback.trim(),
        isNonEmptyString(reviewedBy, 80) ? reviewedBy.trim() : 'Formateur'
      );
      if (!updated) {
        res.status(404).json({ error: 'Copie introuvable.' });
        return;
      }
      res.json({ submission: updated });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors de la correction.' });
    }
  });

  app.post('/api/teacher/writing/:id/ai-draft', async (req, res) => {
    try {
      const all = await db.getWritingSubmissions();
      const target = all.find((w) => w.id === req.params.id);
      if (!target) {
        res.status(404).json({ error: 'Copie introuvable.' });
        return;
      }
      const draft = await evaluateWritingWithGemini({
        track: target.track,
        prompt: target.prompt,
        content: target.content,
      });
      res.json({
        suggestedScore: draft.suggestedScore,
        suggestedFeedback: draft.feedback,
        feedback: draft.feedback,
      });
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg === 'GEMINI_API_KEY_MISSING') {
        res.status(503).json({ error: 'Clé Gemini non configurée pour l’aide à la correction.' });
        return;
      }
      if (err instanceof GeminiUnavailableError || msg.includes('503') || msg.includes('UNAVAILABLE')) {
        res.status(503).json({
          error: 'Le service Gemini est temporairement surchargé (503). Réessayez dans quelques instants.',
        });
        return;
      }
      res.status(500).json({ error: msg || 'Erreur Gemini' });
    }
  });

  // --- Teacher Admin: Import Past Paper (PDF or Word -> Gemini Verbatim Extraction -> HTML Catalog) ---
  app.post('/api/teacher/past-papers/import', async (req, res) => {
    try {
      const {
        teacherId,
        curriculum,
        subject,
        year,
        examDate,
        session,
        language,
        priceSar,
        duration,
        titleOverride,
        fileName,
        mimeType,
        fileBase64,
      } = req.body ?? {};

      const validTeacher: 'marwan' | 'mohamed' = teacherId === 'mohamed' ? 'mohamed' : 'marwan';
      const allowedCurricula: PastPaperItem['curriculum'][] = [
        'American (SAT/AP)',
        'IB Diploma',
        'IGCSE & A-Level',
        'NAFES (ETEC)',
        'Qudurat & Tahsili',
        'Bac Français',
      ];
      if (!allowedCurricula.includes(curriculum)) {
        res.status(400).json({ error: 'Catégorie d’examen invalide.' });
        return;
      }
      if (!isNonEmptyString(subject, 120)) {
        res.status(400).json({ error: 'La matière de l’examen est requise.' });
        return;
      }
      if (!isNonEmptyString(fileName, 200) || typeof fileBase64 !== 'string' || fileBase64.length < 20) {
        res.status(400).json({ error: 'Veuillez importer un fichier PDF ou Word (.docx).' });
        return;
      }
      if (fileBase64.length > 14 * 1024 * 1024) {
        res.status(400).json({ error: 'Fichier trop volumineux (limite 10 Mo).' });
        return;
      }

      const validLang: 'English' | 'Français' | 'العربية' =
        language === 'English' || language === 'العربية' ? language : 'Français';
      const parsedYear = Math.min(2035, Math.max(1990, Number(year) || new Date().getFullYear()));
      const cleanExamDate = isNonEmptyString(examDate, 60) ? examDate.trim() : String(parsedYear);
      const cleanSession = isNonEmptyString(session, 100) ? session.trim() : cleanExamDate;
      const cleanPrice = Math.min(500, Math.max(10, Number(priceSar) || 45));

      const extracted = await extractExactPastPaperWithGemini({
        fileBase64,
        mimeType: typeof mimeType === 'string' ? mimeType : '',
        fileName: fileName.trim(),
        curriculum,
        subject: subject.trim(),
        year: parsedYear,
        examDate: cleanExamDate,
        session: cleanSession,
        language: validLang,
        priceSar: cleanPrice,
        duration: typeof duration === 'string' ? duration.trim() : undefined,
        titleOverride: typeof titleOverride === 'string' ? titleOverride.trim() : undefined,
      });

      const trainer = await db.findTrainerById(validTeacher);
      const paperId = `tp-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const newPaper: PastPaperItem = {
        id: paperId,
        code: extracted.code,
        title: extracted.title,
        curriculum,
        subject: subject.trim(),
        year: parsedYear,
        examDate: cleanExamDate,
        session: cleanSession,
        language: validLang,
        pages: extracted.pages,
        duration: extracted.duration,
        priceSar: cleanPrice,
        officialRuleSummary: extracted.officialRuleSummary,
        uploadedByTeacherId: validTeacher,
        uploadedByTeacherName: trainer?.name || (validTeacher === 'marwan' ? 'Marwan Mhamdi' : 'Mohamed Cherif'),
        sourceFileName: fileName.trim(),
        freePreview: extracted.fullQuestions[0],
        fullQuestions: extracted.fullQuestions,
      };

      const saved = await db.createPastPaper(newPaper);
      const previewHtml = buildBoardThemedA4PaperHtml(
        saved,
        saved.uploadedByTeacherName || 'Admin Teacher',
        'admin@almajd-academy.sa'
      );

      res.status(201).json({ paper: saved, previewHtml });
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg === 'GEMINI_API_KEY_MISSING') {
        res.status(503).json({ error: 'Clé Gemini API non configurée sur le serveur.' });
        return;
      }
      if (err instanceof GeminiUnavailableError || msg.includes('503') || msg.includes('UNAVAILABLE')) {
        res.status(503).json({
          error: 'Les serveurs Gemini connaissent un pic temporaire de demande (503). Réessayez dans quelques secondes.',
        });
        return;
      }
      res.status(500).json({ error: msg || 'Erreur lors du traitement du Past Paper avec Gemini.' });
    }
  });

  app.delete('/api/teacher/past-papers/:id', async (req, res) => {
    try {
      const deleted = await db.deletePastPaper(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Past Paper introuvable.' });
        return;
      }
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors de la suppression.' });
    }
  });

  // --- Teacher Admin: Update Profile, Photo, Experiences & Skills ---
  app.put('/api/teacher/profile/:trainerId', async (req, res) => {
    try {
      const tid = req.params.trainerId === 'mohamed' ? 'mohamed' : req.params.trainerId === 'marwan' ? 'marwan' : null;
      if (!tid) {
        res.status(400).json({ error: 'Formateur invalide.' });
        return;
      }

      const {
        name,
        roleTitle,
        photoUrl,
        credentials,
        bioFr,
        bioEn,
        bioAr,
        hourlyRateSar,
        packRateSar,
        curricula,
        experiences,
        skills,
        availabilitySlots,
      } = req.body ?? {};

      const updates: Record<string, any> = {};
      if (isNonEmptyString(name, 100)) updates.name = name.trim();
      if (isNonEmptyString(roleTitle, 160)) updates.roleTitle = roleTitle.trim();
      if (typeof credentials === 'string') updates.credentials = credentials.trim().slice(0, 300);
      if (typeof bioFr === 'string') updates.bioFr = bioFr.trim().slice(0, 1200);
      if (typeof bioEn === 'string') updates.bioEn = bioEn.trim().slice(0, 1200);
      if (typeof bioAr === 'string') updates.bioAr = bioAr.trim().slice(0, 1200);
      if (typeof hourlyRateSar === 'number' && hourlyRateSar >= 50 && hourlyRateSar <= 2000) {
        updates.hourlyRateSar = Math.round(hourlyRateSar);
      }
      if (typeof packRateSar === 'number' && packRateSar >= 100 && packRateSar <= 10000) {
        updates.packRateSar = Math.round(packRateSar);
      }

      if (typeof photoUrl === 'string' && photoUrl.trim()) {
        const cleanPhoto = photoUrl.trim();
        const isSafeImage =
          cleanPhoto.startsWith('/src/assets/') ||
          cleanPhoto.startsWith('/assets/') ||
          /^https:\/\/.+/.test(cleanPhoto) ||
          /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(cleanPhoto);
        if (!isSafeImage || cleanPhoto.length > 900_000) {
          res.status(400).json({ error: 'Format de photo non valide (PNG, JPEG ou WebP < 650 Ko).' });
          return;
        }
        updates.photoUrl = cleanPhoto;
      }

      const sanitizeStringList = (arr: unknown, maxItems = 15, maxLen = 240) =>
        Array.isArray(arr)
          ? arr
              .filter((x) => isNonEmptyString(x, maxLen))
              .map((x) => x.trim())
              .slice(0, maxItems)
          : undefined;

      const cleanExp = sanitizeStringList(experiences, 12, 260);
      if (cleanExp) updates.experiences = cleanExp;

      const cleanSkills = sanitizeStringList(skills, 16, 120);
      if (cleanSkills) updates.skills = cleanSkills;

      const cleanCurricula = sanitizeStringList(curricula, 12, 120);
      if (cleanCurricula) updates.curricula = cleanCurricula;

      const cleanSlots = sanitizeStringList(availabilitySlots, 12, 60);
      if (cleanSlots) updates.availabilitySlots = cleanSlots;

      const updated = await db.updateTrainerProfile(tid, updates);
      if (!updated) {
        res.status(404).json({ error: 'Profil formateur introuvable.' });
        return;
      }
      res.json({ trainer: updated });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors de la mise à jour du profil.' });
    }
  });

  return app;
}
