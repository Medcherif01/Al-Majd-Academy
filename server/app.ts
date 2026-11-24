import crypto from 'crypto';
import express from 'express';
import {
  connectDatabase,
  db,
  isMongoConnected,
} from './db.ts';
import {
  hashPassword,
  optionalAuth,
  requireAuth,
  sanitizeUser,
  signSessionToken,
  verifyPassword,
  type AuthenticatedRequest,
} from './auth.ts';
import {
  ALL_ACCESS_PASS_PRICE_SAR,
  PAST_PAPERS_CATALOG,
  TRAINERS,
  type PastPaperItem,
} from './catalog.ts';
import {
  buildPlacementQuestions,
  evaluatePlacementTest,
  GRADE_LEVEL_OPTIONS,
  PAID_COURSES_CATALOG,
} from './placement.ts';
import { generateInternationalExam, evaluateWritingWithGemini } from './gemini.ts';

function isNonEmptyString(val: unknown, maxLen = 300): val is string {
  return typeof val === 'string' && val.trim().length > 0 && val.trim().length <= maxLen;
}

function isValidEmail(val: unknown): val is string {
  return typeof val === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPrintablePaperHtml(paper: PastPaperItem, buyerName: string, buyerEmail: string): string {
  const isRtl = paper.language === 'العربية';
  const dirAttr = isRtl ? 'rtl' : 'ltr';
  const questionsHtml = paper.fullQuestions
    .map(
      (q) => `
      <section class="question-block">
        <div class="q-header">
          <span class="q-num">Question ${q.number}</span>
          <span class="q-marks">${q.marks} ${q.marks > 1 ? 'marks' : 'mark'}</span>
        </div>
        <p class="q-prompt">${escapeHtml(q.prompt)}</p>
        <div class="mark-scheme">
          <div class="ms-title">Official Mark Scheme / Correction Officielle</div>
          <p>${escapeHtml(q.markScheme)}</p>
          <p class="examiner-note"><strong>Examiner Note:</strong> ${escapeHtml(q.examinerNote)}</p>
        </div>
      </section>
    `
    )
    .join('\n');

  return `<!doctype html>
<html lang="${isRtl ? 'ar' : paper.language === 'Français' ? 'fr' : 'en'}" dir="${dirAttr}">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(paper.code)} — ${escapeHtml(paper.title)}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; max-width: 820px; margin: 40px auto; padding: 0 24px; color: #0f172a; line-height: 1.6; }
    header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #047857; font-weight: bold; }
    h1 { font-size: 24px; margin: 8px 0; }
    .meta { font-size: 14px; color: #475569; }
    .rules { background: #f8fafc; border: 1px solid #cbd5e1; padding: 14px 18px; margin-bottom: 28px; font-size: 14px; }
    .question-block { border-bottom: 1px solid #e2e8f0; padding: 20px 0; page-break-inside: avoid; }
    .q-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 8px; font-family: sans-serif; }
    .q-marks { color: #047857; }
    .q-prompt { font-size: 16px; margin-bottom: 14px; }
    .mark-scheme { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px 16px; font-size: 14px; }
    .ms-title { font-weight: bold; color: #065f46; margin-bottom: 6px; font-family: sans-serif; }
    .examiner-note { color: #334155; margin-top: 8px; font-size: 13px; }
    footer { margin-top: 36px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <header>
    <div class="brand">Al-Majd International Academy · Official Exam Pack &amp; Mark Scheme</div>
    <h1>${escapeHtml(paper.title)}</h1>
    <div class="meta">${escapeHtml(paper.code)} · ${escapeHtml(paper.curriculum)} · ${escapeHtml(paper.session)} (${paper.year}) · ${escapeHtml(paper.duration)}</div>
  </header>
  <div class="rules">
    <strong>Official Examination Rules:</strong> ${escapeHtml(paper.officialRuleSummary)}
  </div>
  ${questionsHtml}
  <footer>
    Licensed to ${escapeHtml(buyerName)} (${escapeHtml(buyerEmail)}) · Al-Majd International Academy (Saudi Arabia International Schools Portal).
  </footer>
</body>
</html>`;
}

export function createApiApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

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
          name: role === 'parent' ? 'Famille Al-Mansour (Parent)' : 'Youssef Al-Harbi (Élève IB/SAT)',
          role,
          preferredTrack: 'ib',
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

  // --- Trainers ---
  app.get('/api/trainers', (_req, res) => {
    res.json({ trainers: TRAINERS });
  });

  // --- Past Papers Catalog & Paid Access ---
  app.get('/api/past-papers', optionalAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user;
    const papers = PAST_PAPERS_CATALOG.map((paper) => {
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
        session: paper.session,
        language: paper.language,
        pages: paper.pages,
        duration: paper.duration,
        priceSar: paper.priceSar,
        officialRuleSummary: paper.officialRuleSummary,
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
          const catalogItem = PAST_PAPERS_CATALOG.find((p) => p.id === id);
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

  app.get('/api/past-papers/:id/view', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const paper = PAST_PAPERS_CATALOG.find((p) => p.id === req.params.id);
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

  app.get('/api/past-papers/:id/download', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const paper = PAST_PAPERS_CATALOG.find((p) => p.id === req.params.id);
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

    const html = buildPrintablePaperHtml(paper, user.name, user.email);
    const safeFilename = `${paper.code.replace(/[^a-zA-Z0-9_-]/g, '_')}_with_MarkScheme.html`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.send(html);
  });

  // --- Paid Online Tutoring Bookings ---
  app.get('/api/bookings', requireAuth, async (req: AuthenticatedRequest, res) => {
    const bookings = await db.getBookingsByUser(req.user!.id);
    res.json({ bookings });
  });

  app.post('/api/bookings', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const { trainerId, language, curriculum, subject, sessionPackage, dateSlot, timeSlot, studentName, notes } =
        req.body ?? {};

      const trainer = TRAINERS.find((t) => t.id === trainerId);
      if (!trainer) {
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
        res.status(400).json({ error: 'Créneau horaire requis.' });
        return;
      }

      const isPack = sessionPackage === 'pack_5';
      const isIntensive = sessionPackage === 'intensive_90';
      const priceSar = isPack
        ? trainer.packRateSar
        : isIntensive
          ? trainer.hourlyRateSar + 70
          : trainer.hourlyRateSar;
      const packageLabel = isPack
        ? 'Pack 5 Séances (5 × 60 min)'
        : isIntensive
          ? 'Coaching Intensif Examen (90 min)'
          : 'Séance Individuelle (60 min)';

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
        dateSlot: dateSlot.trim(),
        timeSlot: timeSlot.trim(),
        priceSar,
        status: 'confirmed',
        notes: typeof notes === 'string' ? notes.slice(0, 500).trim() : '',
      });

      res.status(201).json({ booking });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors de la réservation.' });
    }
  });

  // --- Gemini AI Exam Generator ---
  app.post('/api/exams/generate', optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
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
      const { gradeLevel, curriculum, language, answers } = req.body ?? {};
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

      if (req.user) {
        const saved = await db.savePlacementResult({
          userId: req.user.id,
          ...evaluation,
        });
        res.json({ result: saved });
        return;
      }

      res.json({
        result: {
          id: crypto.randomUUID(),
          userId: 'guest',
          createdAt: new Date().toISOString(),
          ...evaluation,
        },
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
      const { courseId, paymentMethod } = req.body ?? {};
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
      res.status(201).json({
        order,
        user: updatedUser ? sanitizeUser(updatedUser) : sanitizeUser(user),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors de l’inscription au cours.' });
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

  // --- Teacher Portal Routes (Marwan Mhamdi & Mohamed Cherif) ---
  app.get('/api/teacher/overview', async (req, res) => {
    try {
      const teacherParam = req.query.teacherId;
      const teacherId =
        teacherParam === 'mohamed' ? 'mohamed' : teacherParam === 'marwan' ? 'marwan' : undefined;
      const [students, missions, writings] = await Promise.all([
        db.getRosterStudents(teacherId),
        db.getWeeklyMissions(teacherId),
        db.getWritingSubmissions(teacherId),
      ]);
      res.json({
        students,
        missions,
        writings,
        pendingWritingCount: writings.filter((w) => w.status === 'pending').length,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur lors du chargement du portail formateur.' });
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
      res.json(draft);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg === 'GEMINI_API_KEY_MISSING') {
        res.status(503).json({ error: 'Clé Gemini non configurée pour l’aide à la correction.' });
        return;
      }
      res.status(500).json({ error: msg || 'Erreur Gemini' });
    }
  });

  return app;
}
