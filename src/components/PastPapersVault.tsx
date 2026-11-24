import { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Lock,
  MessageCircle,
  Printer,
  Unlock,
  X,
} from 'lucide-react';
import { apiRequest, downloadProtectedPaper } from '../utils/api';
import { ExamBoardCrestSvg, getExamBoardTheme } from '../utils/examBoardThemes';
import { MathText } from '../utils/mathFormat';
import {
  TEACHER_WHATSAPP,
  buildWhatsAppActivationMessage,
  buildWhatsAppActivationUrl,
  resolveTeacherIdForCurriculum,
} from '../utils/whatsapp';
import { TRANSLATIONS } from '../i18n/translations';
import type { FullPastPaper, PastPaperSummary, UiLanguage, UserProfile } from '../types/academy';

interface PastPapersVaultProps {
  lang: UiLanguage;
  papers: PastPaperSummary[];
  allAccessPassPriceSar: number;
  user: UserProfile | null;
  token: string | null;
  onRequireAuth: () => void;
  onUserUpdated?: (user: UserProfile) => void;
  onRefreshPapers: () => Promise<void>;
}

export function PastPapersVault({
  lang,
  papers,
  allAccessPassPriceSar,
  user,
  token,
  onRequireAuth,
  onRefreshPapers,
}: PastPapersVaultProps) {
  const t = TRANSLATIONS[lang];
  const [curriculumFilter, setCurriculumFilter] = useState<string>('all');
  const [previewPaper, setPreviewPaper] = useState<PastPaperSummary | null>(null);
  const [fullPaperModal, setFullPaperModal] = useState<FullPastPaper | null>(null);
  const [activationTarget, setActivationTarget] = useState<{
    isAllAccess: boolean;
    paper?: PastPaperSummary;
  } | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<'marwan' | 'mohamed'>('marwan');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const curricula = ['all', ...Array.from(new Set(papers.map((p) => p.curriculum)))];
  const visiblePapers =
    curriculumFilter === 'all' ? papers : papers.filter((p) => p.curriculum === curriculumFilter);

  const handleOpenWhatsAppActivation = (target: { isAllAccess: boolean; paper?: PastPaperSummary }) => {
    setFeedback(null);
    setCopiedMsg(false);
    const defaultTid = target.paper
      ? resolveTeacherIdForCurriculum(target.paper.curriculum, target.paper.uploadedByTeacherId)
      : resolveTeacherIdForCurriculum(user?.lockedCurriculum || user?.preferredTrack);
    setSelectedTeacherId(defaultTid);
    setActivationTarget(target);
  };

  const handleCopyMessage = async (msg: string) => {
    try {
      await navigator.clipboard.writeText(msg);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2500);
    } catch {
      setCopiedMsg(false);
    }
  };

  const handleDownload = async (paper: PastPaperSummary) => {
    if (!token) {
      onRequireAuth();
      return;
    }
    setDownloadingId(paper.id);
    setFeedback(null);
    try {
      await downloadProtectedPaper(paper.id, token, paper.code);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleViewFull = async (paper: PastPaperSummary) => {
    if (!token) {
      onRequireAuth();
      return;
    }
    try {
      const res = await apiRequest<{ paper: FullPastPaper }>(
        `/api/past-papers/${encodeURIComponent(paper.id)}/view`,
        { token }
      );
      setFullPaperModal(res.paper);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const triggerA4Print = () => {
    document.body.classList.add('printing-a4-sheet');
    const cleanup = () => {
      document.body.classList.remove('printing-a4-sheet');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1500);
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold tracking-wide text-amber-800 mb-2">
          {lang === 'ar'
            ? 'أرشيف الامتحانات المعتمدة · التفعيل عبر واتساب المدرب'
            : lang === 'en'
              ? 'Official Exam Archives · Direct Teacher WhatsApp Activation'
              : 'Archives d’Examens Officiels · Activation Directe WhatsApp Formateur'}
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-semibold text-slate-900 text-balance">
          {t.pastPapersTitle}
        </h2>
        <p className="mt-3 text-base text-slate-600 leading-relaxed">{t.pastPapersSubtitle}</p>
      </div>

      {/* All-Access Pass Banner */}
      <div className="mb-8 p-6 sm:p-8 rounded-xl bg-slate-900 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold text-emerald-300 mb-1.5">
            {lang === 'ar' ? 'العرض الشامل' : lang === 'en' ? 'Semester Access' : 'Accès Intégral'} ·{' '}
            <span className="font-mono tabular-nums">{allAccessPassPriceSar} SAR</span>
          </div>
          <h3 className="font-display text-2xl font-semibold text-white mb-2">
            {t.allAccessBannerTitle}
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">{t.allAccessBannerDesc}</p>
        </div>

        <div className="shrink-0">
          {user?.hasAllAccessPass ? (
            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-emerald-800 text-white text-xs font-semibold">
              <Unlock className="w-4 h-4" />
              <span>
                {lang === 'ar'
                  ? 'الباقة الشاملة مفعّلة'
                  : lang === 'en'
                    ? 'All-Access Pass Active'
                    : 'Pass Intégral Actif'}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenWhatsAppActivation({ isAllAccess: true })}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>
                {t.unlockAllAccessBtn} · {allAccessPassPriceSar} SAR
              </span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`mb-6 p-4 rounded-xl border text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Segmented Filter */}
      <div className="overflow-x-auto pb-2 mb-8">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg">
          {curricula.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurriculumFilter(c)}
              className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                curriculumFilter === c
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {c === 'all' ? t.filterAll : c}
            </button>
          ))}
        </div>
      </div>

      {/* Past Papers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visiblePapers.map((paper) => {
          const theme = getExamBoardTheme(paper.curriculum);
          return (
            <article
              key={paper.id}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow"
              dir={paper.language === 'العربية' ? 'rtl' : 'ltr'}
            >
              <div>
                <div className={`bg-gradient-to-r ${theme.headerGradientClass} text-white px-5 py-3.5 flex items-center justify-between gap-3`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0 text-white">
                      <ExamBoardCrestSvg curriculum={paper.curriculum} className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] font-bold tracking-wider uppercase text-white/90 truncate">
                        {theme.shortTag} · {paper.code}
                      </div>
                      <div className="text-xs font-semibold text-white truncate">{paper.subject}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-white/15 font-mono text-[11px] font-bold shrink-0">
                    {paper.examDate || paper.year}
                  </span>
                </div>

                <div className="p-6 pb-4">
                  <h3 className="font-display text-lg font-semibold text-slate-900 leading-snug mb-2">
                    <MathText text={paper.title} />
                  </h3>

                  <div className="text-xs text-slate-600 mb-3 tabular-nums flex flex-wrap items-center gap-1.5">
                    <span>{paper.session}</span>
                    <span>·</span>
                    <span>{paper.duration}</span>
                    <span>·</span>
                    <span>{paper.pages} pages</span>
                    <span>·</span>
                    <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${theme.bgTintClass} text-[#0F2537]`}>
                      HTML + A4 PDF
                    </span>
                  </div>

                  {paper.uploadedByTeacherName && (
                    <div className="text-[11px] font-medium text-[#0B6E8C] mb-2">
                      Publié par : {paper.uploadedByTeacherName}
                    </div>
                  )}

                  <p className="text-xs text-slate-600 leading-relaxed mb-2 line-clamp-3">
                    <MathText text={paper.officialRuleSummary} />
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6 pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {paper.isUnlocked ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
                        <Unlock className="w-3.5 h-3.5" />
                        {lang === 'ar' ? 'متاح للتحميل' : lang === 'en' ? 'Unlocked' : 'Débloqué'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                        <Lock className="w-3.5 h-3.5 text-amber-700" />
                        {lang === 'ar'
                          ? 'يشمل التصحيح الرسمي'
                          : lang === 'en'
                            ? 'Includes Full Mark Scheme'
                            : 'Sujet + Corrigé inclus'}
                      </span>
                    )}
                  </span>

                  <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                    {paper.isUnlocked ? '✓' : `${paper.priceSar} SAR`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewPaper(paper)}
                    className="px-3 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:border-slate-900 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t.previewQ1}</span>
                  </button>

                  {paper.isUnlocked ? (
                    <div className="flex-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownload(paper)}
                        disabled={downloadingId === paper.id}
                        className="flex-1 px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{downloadingId === paper.id ? '...' : t.downloadPaperBtn}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleViewFull(paper)}
                        className="px-3 py-2 border border-emerald-800 text-emerald-900 text-xs font-semibold rounded-lg hover:bg-emerald-50 cursor-pointer"
                      >
                        {lang === 'ar' ? 'عرض' : lang === 'en' ? 'Read' : 'Lire'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenWhatsAppActivation({ isAllAccess: false, paper })}
                      className="flex-1 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{t.unlockPaperBtn}</span>
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Free Q1 Preview Modal */}
      {previewPaper && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 sm:p-8 shadow-xl relative max-h-[90vh] overflow-y-auto"
            dir={previewPaper.language === 'العربية' ? 'rtl' : 'ltr'}
          >
            <button
              type="button"
              onClick={() => setPreviewPaper(null)}
              aria-label="Fermer"
              className="absolute top-4 end-4 p-2 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-xs font-mono text-emerald-800 mb-1">
              {previewPaper.code} · {previewPaper.curriculum}
            </div>
            <h3 className="font-display text-2xl font-semibold text-slate-900 mb-4">
              {previewPaper.title}
            </h3>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 mb-5 leading-relaxed">
              <strong>{t.examRulesTitle}:</strong> <MathText text={previewPaper.officialRuleSummary} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                <span>Question {previewPaper.freePreview.number} (Free Sample)</span>
                <span>{previewPaper.freePreview.marks} marks</span>
              </div>
              <p className="text-base font-medium text-slate-900 leading-relaxed">
                <MathText text={previewPaper.freePreview.prompt} />
              </p>

              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2 text-sm">
                <div className="font-semibold text-emerald-900">
                  Official Mark Scheme / Correction Officielle
                </div>
                <p className="text-slate-800 leading-relaxed">
                  <MathText text={previewPaper.freePreview.markScheme} />
                </p>
                <p className="text-xs text-slate-600">
                  <strong>Examiner Note:</strong> <MathText text={previewPaper.freePreview.examinerNote} />
                </p>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-200 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-600">
                {previewPaper.questionCount} questions + corrigé complet ({previewPaper.pages} pages)
              </span>
              {!previewPaper.isUnlocked ? (
                <button
                  type="button"
                  onClick={() => {
                    const target = previewPaper;
                    setPreviewPaper(null);
                    handleOpenWhatsAppActivation({ isAllAccess: false, paper: target });
                  }}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>
                    {t.unlockPaperBtn} ({previewPaper.priceSar} SAR)
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleDownload(previewPaper)}
                  className="px-5 py-2.5 bg-emerald-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {t.downloadPaperBtn}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full Unlocked Paper Reader Modal (with A4 Printable Sheet) */}
      {fullPaperModal && (() => {
        const modalTheme = getExamBoardTheme(fullPaperModal.curriculum);
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="a4-printable-document bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-xl relative max-h-[90vh] overflow-y-auto"
              dir={fullPaperModal.language === 'العربية' ? 'rtl' : 'ltr'}
            >
              <button
                type="button"
                onClick={() => setFullPaperModal(null)}
                aria-label="Fermer"
                className="no-a4-print absolute top-4 end-4 p-2 text-white/80 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className={`bg-gradient-to-r ${modalTheme.headerGradientClass} text-white rounded-xl p-5 sm:p-6 mb-5 flex flex-wrap items-center justify-between gap-4`}>
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                    <ExamBoardCrestSvg curriculum={fullPaperModal.curriculum} className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-white/90">
                      {modalTheme.boardTitle} · {fullPaperModal.code}
                    </div>
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-white leading-tight">
                      <MathText text={fullPaperModal.title} />
                    </h3>
                    <div className="text-xs text-white/90 mt-1">
                      {fullPaperModal.curriculum} · {fullPaperModal.subject} · {fullPaperModal.examDate || fullPaperModal.year} · {fullPaperModal.duration}
                    </div>
                  </div>
                </div>

                <div className="no-a4-print flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={triggerA4Print}
                    className="px-3.5 py-2 bg-white text-[#0F2537] hover:bg-slate-100 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimer PDF A4</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(fullPaperModal)}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger (.html)</span>
                  </button>
                </div>
              </div>

              <div className={`p-3.5 rounded-lg ${modalTheme.bgTintClass} border ${modalTheme.borderClass} text-xs text-slate-800 mb-5 leading-relaxed`}>
                <strong>{t.examRulesTitle} :</strong> <MathText text={fullPaperModal.officialRuleSummary} />
              </div>

              <div className="space-y-6">
                {fullPaperModal.fullQuestions.map((q) => (
                  <div key={q.number} className="a4-avoid-break pb-5 border-b border-slate-200 last:border-b-0">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-2">
                      <span className="font-bold text-[#0F2537]">Question {q.number}</span>
                      <span>{q.marks} pts</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 mb-3 leading-relaxed whitespace-pre-wrap">
                      <MathText text={q.prompt} />
                    </p>
                    <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs sm:text-sm space-y-1.5">
                      <div className="font-semibold text-emerald-900">Mark Scheme / Correction Officielle</div>
                      <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                        <MathText text={q.markScheme} />
                      </p>
                      <p className="text-slate-600 text-xs">
                        <strong>Examiner Note:</strong> <MathText text={q.examinerNote} />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Direct Teacher WhatsApp Activation Modal (Replaces Online Payment) */}
      {activationTarget && (() => {
        const activeInfo = TEACHER_WHATSAPP[selectedTeacherId];
        const effectiveName = user?.name || guestName.trim();
        const effectiveEmail = user?.email || guestEmail.trim();
        const itemTitle = activationTarget.isAllAccess
          ? t.allAccessBannerTitle
          : activationTarget.paper?.title || '';
        const priceSar = activationTarget.isAllAccess
          ? allAccessPassPriceSar
          : activationTarget.paper?.priceSar;
        const waParams = {
          teacherId: selectedTeacherId,
          teacherDisplayName: activeInfo.defaultName,
          itemType: activationTarget.isAllAccess ? ('all_access' as const) : ('past_paper' as const),
          itemTitle,
          itemCode: activationTarget.paper?.code,
          curriculum: activationTarget.paper?.curriculum || user?.lockedCurriculum || undefined,
          priceSar,
          studentName: effectiveName || undefined,
          studentEmail: effectiveEmail || undefined,
          lang,
        };
        const waMessage = buildWhatsAppActivationMessage(waParams);
        const waUrl = buildWhatsAppActivationUrl(waParams);

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-xl relative max-h-[90vh] overflow-y-auto space-y-5">
              <button
                type="button"
                onClick={() => setActivationTarget(null)}
                aria-label="Fermer"
                className="absolute top-4 end-4 p-2 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 mb-1">
                  <MessageCircle className="w-4 h-4" />
                  <span>
                    {lang === 'ar'
                      ? 'تفعيل مباشر عبر واتساب المدرب'
                      : lang === 'en'
                        ? 'Direct Teacher WhatsApp Activation'
                        : 'Activation Directe sur WhatsApp'}
                  </span>
                </div>
                <h3 className="font-display text-2xl font-semibold text-slate-900">{itemTitle}</h3>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-sm text-slate-700">
                  {lang === 'ar' ? 'الرسوم' : lang === 'en' ? 'Amount' : 'Tarif'}
                </span>
                <span className="font-mono text-xl font-semibold text-slate-900 tabular-nums">
                  {priceSar} SAR
                </span>
              </div>

              {/* Teacher WhatsApp Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {lang === 'ar'
                    ? 'اختر المدرب المسؤول عن تفعيل حسابك'
                    : lang === 'en'
                      ? 'Assigned Teacher WhatsApp'
                      : 'Formateur à contacter sur WhatsApp'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(['marwan', 'mohamed'] as const).map((tid) => {
                    const info = TEACHER_WHATSAPP[tid];
                    const active = selectedTeacherId === tid;
                    return (
                      <button
                        key={tid}
                        type="button"
                        onClick={() => setSelectedTeacherId(tid)}
                        className={`p-3 rounded-xl border text-start transition-colors cursor-pointer ${
                          active
                            ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
                            : 'border-slate-200 text-slate-700 hover:border-slate-400'
                        }`}
                      >
                        <div className="text-xs font-bold">{info.defaultName}</div>
                        <div className="font-mono text-[11px] font-semibold text-emerald-800 mt-0.5" dir="ltr">
                          {info.phoneDisplay}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{info.tracksLabel}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Student Account Info for Activation */}
              {user ? (
                <div className="p-3.5 rounded-xl bg-[#EEF5F9] border border-[#BFD8E6] text-xs text-[#0F2537] flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{user.name}</div>
                    <div className="text-slate-600">{user.email}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRefreshPapers()}
                    className="px-3 py-1.5 bg-white border border-[#0B6E8C] text-[#0B6E8C] rounded-lg text-[11px] font-semibold cursor-pointer"
                  >
                    {lang === 'ar' ? 'تحديث الحالة' : lang === 'en' ? 'Refresh' : 'Actualiser'}
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-950">
                    <span className="font-semibold">
                      {lang === 'ar'
                        ? 'أدخل اسمك وبريدك (أو سجّل الدخول) ليتمكن المدرب من تفعيل حسابك :'
                        : lang === 'en'
                          ? 'Enter your name & account email (or sign in) so your teacher can activate your access:'
                          : 'Indiquez votre nom et e-mail de compte (ou connectez-vous) pour l’activation :'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActivationTarget(null);
                        onRequireAuth();
                      }}
                      className="text-xs font-bold text-[#0B6E8C] hover:underline cursor-pointer"
                    >
                      {t.ctaSignIn}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder={lang === 'ar' ? 'اسم الطالب' : lang === 'en' ? 'Student Name' : 'Nom de l’élève'}
                      className="px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg"
                    />
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder={lang === 'ar' ? 'البريد الإلكتروني' : lang === 'en' ? 'Account Email' : 'E-mail du compte'}
                      className="px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Pre-filled Message Preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-700">
                    {lang === 'ar'
                      ? 'الرسالة الجاهزة عبر واتساب'
                      : lang === 'en'
                        ? 'Pre-filled WhatsApp Message'
                        : 'Message pré-rempli pour WhatsApp'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyMessage(waMessage)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B6E8C] hover:underline cursor-pointer"
                  >
                    {copiedMsg ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>
                      {copiedMsg
                        ? lang === 'ar'
                          ? 'تم النسخ'
                          : lang === 'en'
                            ? 'Copied'
                            : 'Copié'
                        : lang === 'ar'
                          ? 'نسخ الرسالة'
                          : lang === 'en'
                            ? 'Copy Message'
                            : 'Copier'}
                    </span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {waMessage}
                </pre>
              </div>

              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>
                  {lang === 'ar'
                    ? `تواصل عبر واتساب (${activeInfo.defaultName} · ${activeInfo.phoneE164})`
                    : lang === 'en'
                      ? `Open WhatsApp · ${activeInfo.defaultName} (${activeInfo.phoneDisplay})`
                      : `Contacter sur WhatsApp · ${activeInfo.defaultName} (${activeInfo.phoneDisplay})`}
                </span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        );
      })()}
    </section>
  );
}
