import { useState } from 'react';
import {
  Award,
  Calendar,
  Compass,
  Download,
  ExternalLink,
  FileCheck2,
  GraduationCap,
  Lock,
  LogOut,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Target,
  Video,
} from 'lucide-react';
import { downloadProtectedPaper } from '../utils/api';
import { TEACHER_WHATSAPP, buildWhatsAppActivationUrl } from '../utils/whatsapp';
import { TRANSLATIONS } from '../i18n/translations';
import type {
  BookingItem,
  GeneratedExam,
  JoiningRequestItem,
  PaidCourseItem,
  PastPaperSummary,
  PlacementResult,
  ProgressState,
  StudentTrackLock,
  UiLanguage,
  UserProfile,
} from '../types/academy';

interface StudentPortalProps {
  lang: UiLanguage;
  user: UserProfile | null;
  token: string | null;
  trackLock: StudentTrackLock | null;
  progress: ProgressState;
  papers: PastPaperSummary[];
  paidCourses: PaidCourseItem[];
  latestPlacement: PlacementResult | null;
  bookings: BookingItem[];
  joiningRequests?: JoiningRequestItem[];
  savedExams: GeneratedExam[];
  onOpenAuth: () => void;
  onSignOut: () => void;
  onRefreshPortal?: () => Promise<void> | void;
  onReopenAiExam: (exam: GeneratedExam) => void;
  onGoToPlacement: () => void;
  onGoToPastPapers: () => void;
  onGoToTutors: () => void;
  onGoToCourse: (courseId: string) => void;
}

export function StudentPortal({
  lang,
  user,
  token,
  trackLock,
  progress,
  papers,
  paidCourses,
  latestPlacement,
  bookings,
  joiningRequests = [],
  savedExams,
  onOpenAuth,
  onSignOut,
  onRefreshPortal,
  onReopenAiExam,
  onGoToPlacement,
  onGoToPastPapers,
  onGoToTutors,
  onGoToCourse,
}: StudentPortalProps) {
  const t = TRANSLATIONS[lang];
  const [refreshing, setRefreshing] = useState(false);

  if (!user || !token) {
    return (
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-xs font-semibold text-emerald-700 mb-2">{t.portalTitle}</p>
        <h2 className="font-display text-3xl font-semibold text-slate-900 mb-3">
          {lang === 'ar'
            ? 'سجّل الدخول لمتابعة التقدم والاختبارات'
            : lang === 'en'
              ? 'Sign in to access your academic records'
              : 'Connectez-vous pour accéder à votre espace élève & parents'}
        </h2>
        <p className="text-sm text-slate-600 max-w-xl mx-auto mb-6 leading-relaxed">
          {t.portalSubtitle}
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="px-6 py-3 bg-slate-900 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
        >
          {t.ctaSignIn}
        </button>
      </section>
    );
  }

  const unlockedPapers = papers.filter((p) => p.isUnlocked);
  const enrolledPaidCourses = paidCourses.filter((c) => c.isEnrolled || user.enrolledCourses?.includes(c.id));

  const activeGrade = user.lockedGrade || trackLock?.gradeLevel;
  const activeCurr = user.lockedCurriculum || trackLock?.curriculum;

  const handleRefresh = async () => {
    if (!onRefreshPortal) return;
    setRefreshing(true);
    try {
      await onRefreshPortal();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-semibold text-emerald-700 mb-1">
            {user.role === 'parent'
              ? lang === 'ar'
                ? 'حساب ولي الأمر'
                : lang === 'en'
                  ? 'Parent Account'
                  : 'Compte Parent'
              : lang === 'ar'
                ? 'حساب الطالب'
                : lang === 'en'
                  ? 'Student Account'
                  : 'Compte Élève'}{' '}
            · {user.email}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-3xl font-semibold text-slate-900">{user.name}</h2>
            {activeGrade && activeCurr && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#EEF5F9] border border-[#BFD8E6] text-xs font-semibold text-[#0B6E8C]">
                <Lock className="w-3.5 h-3.5" />
                {activeGrade.toUpperCase()} · {activeCurr}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          {onRefreshPortal && (
            <button
              type="button"
              disabled={refreshing}
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#BFD8E6] bg-[#EEF5F9] hover:border-[#0B6E8C] rounded-lg text-xs font-semibold text-[#0F2537] cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{lang === 'ar' ? 'تحديث' : lang === 'en' ? 'Refresh' : 'Actualiser'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 hover:border-slate-900 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.signOut}</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 mb-1">
            {lang === 'ar' ? 'الدروس المكتملة' : lang === 'en' ? 'Lessons Completed' : 'Leçons validées'}
          </div>
          <div className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {progress.completedLessonIds.length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 mb-1">
            {lang === 'ar' ? 'الاختبارات المفتوحة' : lang === 'en' ? 'Unlocked Papers' : 'Past Papers débloqués'}
          </div>
          <div className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {user.hasAllAccessPass ? `${papers.length} (Pass)` : unlockedPapers.length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 mb-1">
            {lang === 'ar' ? 'الدورات والحصص' : lang === 'en' ? 'Courses & Tutoring' : 'Cours & Séances'}
          </div>
          <div className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {enrolledPaidCourses.length + bookings.length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 mb-1">
            {lang === 'ar' ? 'نتيجة تحديد المستوى' : lang === 'en' ? 'Placement Score' : 'Test de Niveau'}
          </div>
          <div className="font-mono text-2xl font-semibold text-emerald-700 tabular-nums">
            {latestPlacement ? `${latestPlacement.overallScore}%` : '—'}
          </div>
        </div>
      </div>

      {/* Latest Placement Diagnostic Summary */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="font-display text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-700" />
            <span>
              {lang === 'ar'
                ? 'ملخص اختبار تحديد المستوى'
                : lang === 'en'
                  ? 'Latest Placement Diagnostic Summary'
                  : 'Bilan du Test de Niveau'}
            </span>
          </h3>
          <button
            type="button"
            onClick={onGoToPlacement}
            className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
          >
            {latestPlacement
              ? lang === 'ar'
                ? 'عرض أو إعادة الاختبار'
                : lang === 'en'
                  ? 'View or Retake'
                  : 'Voir ou refaire'
              : lang === 'ar'
                ? 'ابدأ الاختبار الآن'
                : lang === 'en'
                  ? 'Take Placement Test'
                  : 'Passer le test'}
          </button>
        </div>

        {!latestPlacement ? (
          <p className="text-sm text-slate-600">
            {lang === 'ar'
              ? 'لم تقم بإجراء اختبار تحديد المستوى بعد.'
              : lang === 'en'
                ? 'No placement assessment recorded yet.'
                : 'Aucun test de niveau enregistré pour le moment.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="text-xs text-slate-500">
                {latestPlacement.curriculum} · {latestPlacement.gradeLevel.toUpperCase()}
              </div>
              <div className="text-base font-semibold text-slate-900">{latestPlacement.levelLabel}</div>
              <p className="text-xs text-slate-600 leading-relaxed">{latestPlacement.summaryText}</p>
            </div>

            <div>
              <div className="text-xs font-semibold text-emerald-800 mb-2">
                {lang === 'ar' ? 'نقاط القوة' : lang === 'en' ? 'Strengths' : 'Points forts'}
              </div>
              <ul className="space-y-1 text-xs text-slate-700">
                {latestPlacement.strengths.map((s, idx) => (
                  <li key={idx}>• {s}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-xs font-semibold text-rose-800 mb-2">
                {lang === 'ar' ? 'ما ينقصك' : lang === 'en' ? 'Gaps to Close' : 'Notions manquantes'}
              </div>
              <ul className="space-y-1 text-xs text-slate-700 mb-3">
                {latestPlacement.missingGaps.map((g, idx) => (
                  <li key={idx}>• {g}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => onGoToCourse(latestPlacement.recommendedCourseIds[0] || 'ib-dp-math-aa')}
                className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer"
              >
                → {lang === 'ar' ? 'فتح الدرس الموصى به' : lang === 'en' ? 'Open Recommended Course' : 'Ouvrir le cours recommandé'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Teacher-Attributed Skills & Strengths/Weaknesses Evaluation */}
      {((user.assignedSkills && user.assignedSkills.length > 0) ||
        (user.teacherStrengths && user.teacherStrengths.length > 0) ||
        (user.teacherWeaknesses && user.teacherWeaknesses.length > 0) ||
        user.teacherFeedbackSummary) && (
        <div className="bg-white border border-[#BFD8E6] rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <h3 className="font-display text-xl font-semibold text-[#0F2537] flex items-center gap-2">
              <Award className="w-5 h-5 text-[#0B6E8C]" />
              <span>
                {lang === 'ar'
                  ? 'المهارات المحددة وتقييم المدرب'
                  : lang === 'en'
                    ? 'Teacher-Attributed Skills & Evaluation'
                    : 'Compétences & Bilan Attribués par le Formateur'}
              </span>
            </h3>
          </div>

          {user.teacherFeedbackSummary && (
            <p className="text-sm text-slate-700 bg-[#F8FAFC] p-4 rounded-xl border border-slate-200 leading-relaxed">
              {user.teacherFeedbackSummary}
            </p>
          )}

          {user.assignedSkills && user.assignedSkills.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#0B6E8C] mb-2">
                {lang === 'ar'
                  ? 'المهارات المطلوب إتقانها :'
                  : lang === 'en'
                    ? 'Required Skills Assigned to Your Plan:'
                    : 'Compétences prioritaires attribuées à votre parcours :'}
              </div>
              <div className="flex flex-wrap gap-2">
                {user.assignedSkills.map((sk) => (
                  <span
                    key={sk}
                    className="px-3 py-1.5 rounded-xl bg-[#EEF5F9] border border-[#BFD8E6] text-xs font-semibold text-[#0F2537]"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {user.teacherStrengths && user.teacherStrengths.length > 0 && (
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <div className="text-xs font-semibold text-emerald-900 mb-2">
                  Points forts validés par le formateur
                </div>
                <ul className="space-y-1 text-xs text-slate-700">
                  {user.teacherStrengths.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>
            )}
            {user.teacherWeaknesses && user.teacherWeaknesses.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                <div className="text-xs font-semibold text-amber-900 mb-2 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  <span>Points faibles à travailler en cours privé</span>
                </div>
                <ul className="space-y-1 text-xs text-slate-700">
                  {user.teacherWeaknesses.map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Unlocked Past Papers */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-xl font-semibold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-700" />
              <span>
                {lang === 'ar'
                  ? 'الاختبارات السابقة والحلول المتاحة'
                  : lang === 'en'
                    ? 'Unlocked Past Papers & Mark Schemes'
                    : 'Past Papers & Corrections Débloqués'}
              </span>
            </h3>
            <button
              type="button"
              onClick={onGoToPastPapers}
              className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
            >
              {lang === 'ar' ? 'تصفح الكل' : lang === 'en' ? 'Browse Vault' : 'Voir le coffre'}
            </button>
          </div>

          {unlockedPapers.length === 0 ? (
            <p className="text-sm text-slate-600 py-4">
              {lang === 'ar'
                ? 'لم تقم بشراء أي اختبارات سابقة بعد.'
                : lang === 'en'
                  ? 'No Past Papers unlocked yet.'
                  : 'Aucun Past Paper débloqué pour le moment.'}
            </p>
          ) : (
            <div className="space-y-3">
              {unlockedPapers.map((paper) => (
                <div
                  key={paper.id}
                  className="p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-xs font-mono text-emerald-700">{paper.code}</div>
                    <div className="text-sm font-semibold text-slate-900">{paper.title}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadProtectedPaper(paper.id, token, paper.code)}
                    className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'تحميل' : lang === 'en' ? 'Download' : 'Télécharger'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Enrolled Paid Courses & Tutoring */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-700" />
              <span>
                {lang === 'ar'
                  ? 'الدورات المدفوعة وحجوزات المدربين'
                  : lang === 'en'
                    ? 'Enrolled Paid Courses & Tutoring'
                    : 'Cours Payants & Séances Réservées'}
              </span>
            </h3>
            <button
              type="button"
              onClick={onGoToTutors}
              className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
            >
              {t.bookTrainerBtn}
            </button>
          </div>

          {enrolledPaidCourses.length === 0 && bookings.length === 0 && joiningRequests.length === 0 ? (
            <p className="text-sm text-slate-600 py-4">
              {lang === 'ar'
                ? 'لا توجد دورات مدفوعة أو حصص محجوزة حالياً.'
                : lang === 'en'
                  ? 'No paid courses or tutoring sessions booked yet.'
                  : 'Aucun cours payant ou séance réservée pour le moment.'}
            </p>
          ) : (
            <div className="space-y-3">
              {enrolledPaidCourses.map((pc) => {
                const matchingCourseReq = joiningRequests.find(
                  (jr) =>
                    jr.itemType === 'course' &&
                    jr.itemId === pc.id &&
                    jr.status === 'approved' &&
                    Boolean(jr.meetLink)
                );
                return (
                  <div key={pc.id} className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-900 inline-flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5" />
                        {pc.curriculumLabel}
                      </span>
                      <span className="font-mono text-slate-700 tabular-nums">{pc.priceSar} SAR</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{pc.title}</div>
                    <div className="text-xs text-slate-600">
                      {pc.trainerName} · {pc.sessionsCount} séances ({pc.durationWeeks} sem.)
                    </div>
                    {matchingCourseReq?.meetLink && (
                      <div className="pt-2 border-t border-amber-200/80 flex flex-wrap items-center gap-2">
                        <a
                          href={matchingCourseReq.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Rejoindre Google Meet du cours</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {matchingCourseReq.calendarEventLink && (
                          <a
                            href={matchingCourseReq.calendarEventLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1"
                          >
                            <Calendar className="w-3 h-3" />
                            <span>Agenda</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {joiningRequests.map((jr) => {
                const teacherInfo = TEACHER_WHATSAPP[jr.teacherId];
                const statusBadge =
                  jr.status === 'approved'
                    ? lang === 'ar'
                      ? 'مؤكد ومفعّل'
                      : lang === 'en'
                        ? 'Confirmed & Active'
                        : 'Confirmé & Activé'
                    : jr.status === 'rejected'
                      ? lang === 'ar'
                        ? 'مرفوض'
                        : lang === 'en'
                          ? 'Declined'
                          : 'Refusé'
                      : lang === 'ar'
                        ? 'بانتظار تأكيد المدرب'
                        : lang === 'en'
                          ? 'Pending Teacher Confirmation'
                          : 'En attente de confirmation';
                return (
                  <div
                    key={jr.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-mono font-semibold text-[#0B6E8C]">
                        {jr.referenceCode} · {teacherInfo.defaultName}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-md font-semibold text-[11px] ${
                          jr.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-900'
                            : jr.status === 'rejected'
                              ? 'bg-red-100 text-red-900'
                              : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {statusBadge}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{jr.itemTitle}</div>
                    <div className="text-xs text-slate-600">
                      {jr.curriculum} · {jr.language} · <strong className="font-mono">{jr.priceSar} SAR</strong>
                      {jr.preferredSlot ? ` · ${jr.preferredSlot}` : ''}
                    </div>
                    {jr.meetLink && jr.status === 'approved' && (
                      <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-2">
                        <a
                          href={jr.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Rejoindre Google Meet</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {jr.calendarEventLink && (
                          <a
                            href={jr.calendarEventLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1"
                          >
                            <Calendar className="w-3 h-3" />
                            <span>Agenda</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {bookings.map((b) => (
                <div key={b.id} className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#0B6E8C]">{b.trainerName}</span>
                    <span className="font-mono text-slate-700 tabular-nums">
                      {b.priceSar} SAR {b.paymentReference ? `· ${b.paymentReference}` : ''}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {b.curriculum} · {b.subject}
                  </div>
                  <div className="text-xs text-slate-600 tabular-nums">
                    {b.dateSlot} · {b.timeSlot} · {b.durationLabel || `${b.durationMinutes || 60} min`} · {b.language}
                  </div>
                  {b.attachedWeaknesses && b.attachedWeaknesses.length > 0 && (
                    <div className="text-[11px] text-amber-900">
                      <strong>Points faibles :</strong> {b.attachedWeaknesses.join(' · ')}
                    </div>
                  )}
                  {b.themesToCover && b.themesToCover.length > 0 && (
                    <div className="text-[11px] text-slate-700">
                      <strong>Thèmes :</strong> {b.themesToCover.join(' · ')}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-2">
                    {b.meetLink ? (
                      <>
                        <a
                          href={b.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Rejoindre Google Meet</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {b.calendarEventLink && (
                          <a
                            href={b.calendarEventLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1"
                          >
                            <Calendar className="w-3 h-3" />
                            <span>Agenda</span>
                          </a>
                        )}
                      </>
                    ) : b.paid ? (
                      <div className="w-full flex items-center gap-2 text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                        <Video className="w-3.5 h-3.5 text-[#0B6E8C] shrink-0" />
                        <span>
                          {lang === 'ar'
                            ? 'تم تأكيد الحصة — بانتظار مشاركة رابط Google Meet من المدرب.'
                            : lang === 'en'
                              ? 'Session confirmed — waiting for your teacher to share the Google Meet link.'
                              : 'Séance confirmée — en attente du lien Google Meet partagé par votre formateur.'}
                        </span>
                      </div>
                    ) : (
                      <div className="w-full flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 text-[11px] font-semibold">
                          {lang === 'ar'
                            ? 'في انتظار التفعيل عبر واتساب'
                            : lang === 'en'
                              ? 'Pending WhatsApp Activation'
                              : 'En attente d’activation WhatsApp'}
                        </span>
                        {(() => {
                          const tId = b.trainerId === 'mohamed' ? 'mohamed' : 'marwan';
                          const teacherInfo = TEACHER_WHATSAPP[tId];
                          const waUrl = buildWhatsAppActivationUrl({
                            teacherId: tId,
                            lang,
                            itemTitle: `${b.subject} — ${b.dateSlot} ${b.timeSlot}`,
                            itemType: 'tutoring',
                            curriculum: b.curriculum,
                            priceSar: b.priceSar,
                            studentName: user.name,
                            studentEmail: user.email,
                            extraDetails: b.paymentReference ? `Réf: ${b.paymentReference}` : undefined,
                          });
                          return (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-[#128C7E] hover:bg-[#0E7266] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>
                                {lang === 'ar'
                                  ? `واتساب (${teacherInfo.phoneDisplay})`
                                  : lang === 'en'
                                    ? `WhatsApp ${teacherInfo.defaultName} (${teacherInfo.phoneDisplay})`
                                    : `WhatsApp ${teacherInfo.defaultName} (${teacherInfo.phoneDisplay})`}
                              </span>
                            </a>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Saved AI Exams */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="font-display text-xl font-semibold text-slate-900 mb-5 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-700" />
          <span>
            {lang === 'ar'
              ? 'الاختبارات المحفوظة عبر Gemini'
              : lang === 'en'
                ? 'Saved Gemini AI Exam Papers'
                : 'Historique des Examens Générés par Gemini IA'}
          </span>
        </h3>

        {savedExams.length === 0 ? (
          <p className="text-sm text-slate-600">
            {lang === 'ar'
              ? 'قم بتوليد اختبار في استوديو الذكاء لحفظه هنا.'
              : lang === 'en'
                ? 'Generate an exam in the AI Studio while signed in to save it here.'
                : 'Générez une épreuve dans le Studio Examens IA pour la retrouver ici.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedExams.map((ex) => (
              <div
                key={ex.id}
                className="p-4 rounded-xl border border-slate-200 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="text-xs text-slate-500 mb-1">
                    {ex.curriculum} · {ex.language}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 line-clamp-2">{ex.title}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onReopenAiExam(ex)}
                  className="px-3 py-2 bg-slate-900 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {lang === 'ar' ? 'فتح الاختبار' : lang === 'en' ? 'Open Exam' : 'Ouvrir l’épreuve'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
