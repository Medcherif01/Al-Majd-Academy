import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Briefcase,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Globe2,
  Link2,
  MessageCircle,
  Plus,
  Video,
} from 'lucide-react';
import { COURSE_MODULES } from '../data/curriculumData';
import { TRANSLATIONS } from '../i18n/translations';
import { apiRequest } from '../utils/api';
import {
  getCachedGoogleAccessToken,
  initGoogleWorkspaceAuth,
  signInWithGoogleForMeet,
} from '../utils/googleMeetAuth';
import { TEACHER_WHATSAPP, buildWhatsAppActivationUrl } from '../utils/whatsapp';
import type {
  BookingItem,
  PlacementResult,
  StudentTrackLock,
  TrainerProfile,
  UiLanguage,
  UserProfile,
} from '../types/academy';

interface TutoringSectionProps {
  lang: UiLanguage;
  trainers: TrainerProfile[];
  preselectedTrainerName?: string | null;
  user: UserProfile | null;
  token: string | null;
  latestPlacement: PlacementResult | null;
  trackLock: StudentTrackLock | null;
  onRequireAuth: () => void;
  onBookingCreated: (booking: BookingItem) => void;
  onBookingUpdated?: (booking: BookingItem) => void;
}

const TRAINER_IMAGES: Record<'marwan' | 'mohamed', string> = {
  marwan: '/src/assets/images/trainer_marwan_mhamdi_1795527476961.jpg',
  mohamed: '/src/assets/images/trainer_mohamed_cherif_1795527477326.jpg',
};

const DURATION_OPTIONS: { minutes: 30 | 60 | 90 | 120 | 300; labelFr: string; labelEn: string; labelAr: string }[] = [
  { minutes: 30, labelFr: '30 min (Session ciblée)', labelEn: '30 min (Targeted Session)', labelAr: '30 دقيقة (جلسة مركزة)' },
  { minutes: 60, labelFr: '60 min (1 heure complète)', labelEn: '60 min (1 Full Hour)', labelAr: '60 دقيقة (ساعة كاملة)' },
  { minutes: 90, labelFr: '90 min (1h 30 · Coaching intensif)', labelEn: '90 min (1h 30 · Intensive)', labelAr: '90 دقيقة (تدريب مكثف)' },
  { minutes: 120, labelFr: '120 min (2 heures · Approfondi)', labelEn: '120 min (2 Hours · Deep Dive)', labelAr: '120 دقيقة (ساعتان)' },
  { minutes: 300, labelFr: '300 min (Pack 5 heures)', labelEn: '300 min (5-Hour Pack)', labelAr: '300 دقيقة (باقة 5 ساعات)' },
];

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultDateIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
}

const WEEKDAY_MAP: { pattern: RegExp; day: number }[] = [
  { pattern: /dimanche|sunday|الأحد/i, day: 0 },
  { pattern: /lundi|monday|الإثنين/i, day: 1 },
  { pattern: /mardi|tuesday|الثلاثاء/i, day: 2 },
  { pattern: /mercredi|wednesday|الأربعاء/i, day: 3 },
  { pattern: /jeudi|thursday|الخميس/i, day: 4 },
  { pattern: /vendredi|friday|الجمعة/i, day: 5 },
  { pattern: /samedi|saturday|السبت/i, day: 6 },
];

function getNextDateForSlotLabel(slot: string, fallbackIso: string): string {
  const match = WEEKDAY_MAP.find((w) => w.pattern.test(slot));
  if (!match) return fallbackIso;
  const now = new Date();
  const diff = (match.day - now.getDay() + 7) % 7 || 7;
  const target = new Date(now);
  target.setDate(now.getDate() + diff);
  return target.toISOString().slice(0, 10);
}

export function TutoringSection({
  lang,
  trainers,
  preselectedTrainerName,
  user,
  token,
  latestPlacement,
  trackLock,
  onRequireAuth,
  onBookingCreated,
  onBookingUpdated,
}: TutoringSectionProps) {
  const t = TRANSLATIONS[lang];
  const [selectedTrainerId, setSelectedTrainerId] = useState<'marwan' | 'mohamed'>('marwan');
  const [language, setLanguage] = useState<'English' | 'Français' | 'العربية'>('English');
  const [curriculum, setCurriculum] = useState<string>('Digital SAT & ACT');
  const [subject, setSubject] = useState<string>('Mathematics');
  const [durationMinutes, setDurationMinutes] = useState<30 | 60 | 90 | 120 | 300>(60);
  const [dateSlot, setDateSlot] = useState<string>(getDefaultDateIso);
  const [timeValue, setTimeValue] = useState<string>('17:00');
  const [studentName, setStudentName] = useState<string>(user?.name || '');
  const [notes, setNotes] = useState<string>('');

  // Weaknesses & Themes attached to teacher report
  const [attachedWeaknesses, setAttachedWeaknesses] = useState<string[]>([]);
  const [customWeakness, setCustomWeakness] = useState('');
  const [themesToCover, setThemesToCover] = useState<string[]>([]);
  const [customTheme, setCustomTheme] = useState('');

  // Google Workspace OAuth (Meet & Calendar)
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(() => getCachedGoogleAccessToken());
  const [googleConnecting, setGoogleConnecting] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [generatingMeet, setGeneratingMeet] = useState(false);
  const [manualMeetUrl, setManualMeetUrl] = useState('');
  const [savingManualMeet, setSavingManualMeet] = useState(false);
  const [error, setError] = useState('');
  const [meetWarning, setMeetWarning] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<BookingItem | null>(null);

  const timeSlot = `${timeValue} AST`;

  useEffect(() => {
    const unsub = initGoogleWorkspaceAuth(
      (gUser, gTok) => {
        setGoogleEmail(gUser.email || gUser.displayName || 'Google Connecté');
        setGoogleToken(gTok);
      },
      () => {
        setGoogleEmail(null);
        setGoogleToken(null);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user?.name && !studentName) {
      setStudentName(user.name);
    }
  }, [user, studentName]);

  // Pre-fill weaknesses from diagnostic / teacher feedback
  const suggestedWeaknesses = useMemo(() => {
    const list = [
      ...(user?.teacherWeaknesses || []),
      ...(latestPlacement?.weaknesses || []),
      ...(latestPlacement?.missingGaps || []),
    ];
    return Array.from(new Set(list.filter(Boolean)));
  }, [user, latestPlacement]);

  useEffect(() => {
    if (suggestedWeaknesses.length > 0 && attachedWeaknesses.length === 0) {
      setAttachedWeaknesses(suggestedWeaknesses.slice(0, 4));
    }
  }, [suggestedWeaknesses, attachedWeaknesses.length]);

  // Preselect trainer from prop or trackLock
  useEffect(() => {
    if (preselectedTrainerName) {
      if (preselectedTrainerName.toLowerCase().includes('mohamed')) {
        handleSelectTrainer('mohamed');
        return;
      }
      if (preselectedTrainerName.toLowerCase().includes('marwan')) {
        handleSelectTrainer('marwan');
        return;
      }
    }
    if (trackLock) {
      const isFrenchOrArabic =
        trackLock.trackKey === 'nafes' ||
        trackLock.trackKey === 'qiyas' ||
        trackLock.trackKey === 'french';
      const tid = isFrenchOrArabic ? 'mohamed' : 'marwan';
      setSelectedTrainerId(tid);
      if (tid === 'mohamed') {
        setLanguage(trackLock.trackKey === 'french' ? 'Français' : 'العربية');
        setCurriculum(
          trackLock.trackKey === 'nafes'
            ? 'NAFES (ETEC Grade 3/6/9)'
            : trackLock.trackKey === 'qiyas'
              ? 'Qudurat & Tahsili (قياس)'
              : 'Baccalauréat Français (AEFE)'
        );
      } else {
        setLanguage('English');
        setCurriculum(
          trackLock.trackKey === 'ib'
            ? 'IB Diploma (Math AA / Physics / Chem)'
            : trackLock.trackKey === 'british'
              ? 'Cambridge IGCSE & A-Level'
              : 'Digital SAT & ACT'
        );
      }
    }
  }, [preselectedTrainerName, trackLock]);

  const activeTrainer = trainers.find((tr) => tr.id === selectedTrainerId) || trainers[0];

  // Curated themes from curriculum lessons matching active trainer / curriculum
  const suggestedThemes = useMemo(() => {
    const matchingCourses = COURSE_MODULES.filter((c) => {
      if (selectedTrainerId === 'mohamed') {
        return c.leadTrainer.toLowerCase().includes('mohamed');
      }
      return c.leadTrainer.toLowerCase().includes('marwan');
    });
    const lessonTitles = matchingCourses.flatMap((c) =>
      c.lessons.map((l) => `${c.subject}: ${l.title}`)
    );
    return lessonTitles.slice(0, 8);
  }, [selectedTrainerId]);

  const handleSelectTrainer = (id: 'marwan' | 'mohamed') => {
    setSelectedTrainerId(id);
    setConfirmedBooking(null);
    setError('');
    if (id === 'marwan') {
      setLanguage('English');
      setCurriculum('Digital SAT & ACT');
    } else {
      setLanguage('Français');
      setCurriculum('Baccalauréat Français (AEFE)');
    }
  };

  if (!activeTrainer) return null;

  const estimatedPrice = (() => {
    if (durationMinutes === 30) return Math.round(activeTrainer.hourlyRateSar * 0.6);
    if (durationMinutes === 90) return activeTrainer.hourlyRateSar + 70;
    if (durationMinutes === 120) return activeTrainer.hourlyRateSar * 2 - 20;
    if (durationMinutes === 300) return activeTrainer.packRateSar;
    return activeTrainer.hourlyRateSar;
  })();

  const handleConnectGoogle = async () => {
    setError('');
    setGoogleConnecting(true);
    try {
      const authResult = await signInWithGoogleForMeet();
      if (authResult) {
        setGoogleEmail(authResult.user.email || authResult.user.displayName || 'Google Connecté');
        setGoogleToken(authResult.accessToken);
      }
    } catch (err: any) {
      setError(err.message || 'Connexion Google annulée.');
    } finally {
      setGoogleConnecting(false);
    }
  };

  const toggleWeakness = (item: string) => {
    setAttachedWeaknesses((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const addCustomWeakness = () => {
    const val = customWeakness.trim();
    if (!val) return;
    if (!attachedWeaknesses.includes(val)) {
      setAttachedWeaknesses((prev) => [...prev, val]);
    }
    setCustomWeakness('');
  };

  const toggleTheme = (item: string) => {
    setThemesToCover((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const addCustomTheme = () => {
    const val = customTheme.trim();
    if (!val) return;
    if (!themesToCover.includes(val)) {
      setThemesToCover((prev) => [...prev, val]);
    }
    setCustomTheme('');
  };

  const applySuggestedSlot = (slot: string) => {
    const timeMatch = slot.match(/(\d{1,2}:\d{2})/);
    if (timeMatch) {
      const [h, m] = timeMatch[1].split(':');
      setTimeValue(`${h.padStart(2, '0')}:${m}`);
    }
    setDateSlot(getNextDateForSlotLabel(slot, dateSlot));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMeetWarning('');
    setConfirmedBooking(null);
    if (!user || !token) {
      onRequireAuth();
      return;
    }

    setSubmitting(true);
    try {
      const activeGoogleToken = googleToken || getCachedGoogleAccessToken() || '';
      const res = await apiRequest<{ booking: BookingItem; meetWarning?: string }>('/api/bookings', {
        method: 'POST',
        token,
        headers: activeGoogleToken ? { 'x-google-access-token': activeGoogleToken } : undefined,
        body: {
          trainerId: activeTrainer.id,
          language,
          curriculum,
          subject,
          durationMinutes,
          dateSlot,
          timeSlot,
          studentName: studentName || user.name,
          attachedWeaknesses,
          themesToCover,
          notes,
        },
      });
      setConfirmedBooking(res.booking);
      if (res.meetWarning) {
        setMeetWarning(res.meetWarning);
      }
      onBookingCreated(res.booking);
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Impossible de confirmer la réservation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateMeetPostPayment = async () => {
    if (!confirmedBooking || !token) return;
    setError('');
    setMeetWarning('');
    setGeneratingMeet(true);
    try {
      let activeGoogleToken = googleToken || getCachedGoogleAccessToken();
      if (!activeGoogleToken) {
        const authResult = await signInWithGoogleForMeet();
        if (authResult) {
          activeGoogleToken = authResult.accessToken;
          setGoogleToken(authResult.accessToken);
          setGoogleEmail(authResult.user.email || authResult.user.displayName || 'Google Connecté');
        }
      }
      if (!activeGoogleToken) {
        throw new Error('Connexion Google requise pour générer la salle Google Meet.');
      }

      const res = await apiRequest<{ booking: BookingItem }>(
        `/api/bookings/${encodeURIComponent(confirmedBooking.id)}/generate-meet`,
        {
          method: 'POST',
          token,
          headers: { 'x-google-access-token': activeGoogleToken },
          body: { googleAccessToken: activeGoogleToken },
        }
      );
      setConfirmedBooking(res.booking);
      onBookingUpdated?.(res.booking);
    } catch (err: any) {
      setError(err.message || 'Impossible de générer le lien Google Meet.');
    } finally {
      setGeneratingMeet(false);
    }
  };

  const handleSaveManualMeetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmedBooking || !token || !manualMeetUrl.trim()) return;
    setError('');
    setSavingManualMeet(true);
    try {
      const res = await apiRequest<{ booking: BookingItem }>(
        `/api/bookings/${encodeURIComponent(confirmedBooking.id)}/meet-link`,
        {
          method: 'PATCH',
          token,
          body: { meetLink: manualMeetUrl.trim() },
        }
      );
      setConfirmedBooking(res.booking);
      setManualMeetUrl('');
      setMeetWarning('');
      onBookingUpdated?.(res.booking);
    } catch (err: any) {
      setError(err.message || 'Impossible d’enregistrer le lien Google Meet.');
    } finally {
      setSavingManualMeet(false);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="mb-10 max-w-3xl">
        <p className="text-xs font-semibold tracking-wide text-[#0B6E8C] mb-2">
          {lang === 'ar'
            ? 'التدريب المباشر عبر Google Meet · بتوقيت الرياض'
            : lang === 'en'
              ? 'Paid Private Coaching via Google Meet · Riyadh Time (AST)'
              : 'Tutorat Privé en Ligne via Google Meet · Heure de Riyad (AST)'}
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0F2537] text-balance">
          {t.tutorsTitle}
        </h2>
        <p className="mt-3 text-base text-slate-600 leading-relaxed">{t.tutorsSubtitle}</p>
      </div>

      {/* Two Dedicated Trainer Profiles (Live Photo, Experiences & Skills from Teacher Portal) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        {trainers.map((trainer) => {
          const isSelected = trainer.id === activeTrainer.id;
          const bio =
            lang === 'ar' ? trainer.bioAr : lang === 'en' ? trainer.bioEn : trainer.bioFr;
          const photoSrc = trainer.photoUrl || TRAINER_IMAGES[trainer.id];

          return (
            <div
              key={trainer.id}
              className={`bg-white rounded-2xl border p-6 sm:p-8 flex flex-col justify-between transition-colors ${
                isSelected ? 'border-[#0B6E8C] shadow-sm ring-1 ring-[#0B6E8C]/20' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex flex-col sm:flex-row items-start gap-5 mb-5">
                  <div className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                    <img
                      src={photoSrc}
                      alt={trainer.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#0B6E8C] mb-1 flex items-center gap-1.5">
                      <Globe2 className="w-3.5 h-3.5" />
                      <span>{trainer.languages.join(' · ')}</span>
                    </div>
                    <h3 className="font-display text-2xl font-semibold text-[#0F2537]">
                      {trainer.name}
                    </h3>
                    <p className="text-xs font-medium text-slate-600 mt-0.5">{trainer.roleTitle}</p>
                  </div>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed mb-4">{bio}</p>

                <div className="text-xs text-slate-500 mb-4">{trainer.credentials}</div>

                {/* Experiences */}
                {trainer.experiences && trainer.experiences.length > 0 && (
                  <div className="mb-4 p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200/80 space-y-1.5">
                    <div className="text-xs font-semibold text-[#0F2537] flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-[#0B6E8C]" />
                      <span>
                        {lang === 'ar'
                          ? 'الخبرات الأكاديمية:'
                          : lang === 'en'
                            ? 'Teaching Experience:'
                            : 'Expériences & Parcours :'}
                      </span>
                    </div>
                    <ul className="space-y-1 text-xs text-slate-700">
                      {trainer.experiences.map((exp, idx) => (
                        <li key={idx}>• {exp}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Attractive Skills */}
                {trainer.skills && trainer.skills.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-[#0F2537] mb-2 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-[#0B6E8C]" />
                      <span>
                        {lang === 'ar'
                          ? 'المهارات والتخصصات:'
                          : lang === 'en'
                            ? 'Key Skills & Specialties:'
                            : 'Compétences Clés :'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {trainer.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-[#EEF5F9] border border-[#BFD8E6] text-[11px] font-semibold text-[#0F2537]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-800 mb-2">
                    {lang === 'ar'
                      ? 'المناهج والاختبارات المغطاة:'
                      : lang === 'en'
                        ? 'Covered Exam Tracks:'
                        : 'Programmes & Examens couverts :'}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {trainer.curricula.join(' · ')}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-slate-600 tabular-nums">
                  <span className="font-mono text-base font-semibold text-[#0F2537]">
                    {trainer.hourlyRateSar} SAR
                  </span>{' '}
                  / 60 min · Pack 5h :{' '}
                  <span className="font-mono font-semibold text-[#0F2537]">
                    {trainer.packRateSar} SAR
                  </span>
                  <div className="font-mono text-[11px] font-semibold text-emerald-800 mt-1" dir="ltr">
                    WhatsApp : {TEACHER_WHATSAPP[trainer.id].phoneDisplay}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectTrainer(trainer.id)}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-[#0B6E8C] text-white'
                      : 'bg-[#0F2537] hover:bg-[#0B6E8C] text-white'
                  }`}
                >
                  {isSelected
                    ? lang === 'ar'
                      ? 'المدرب المختار'
                      : lang === 'en'
                        ? 'Selected for Booking'
                        : 'Formateur sélectionné'
                    : t.bookTrainerBtn}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Session Booking + WhatsApp Teacher Activation Form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h3 className="font-display text-2xl font-bold text-[#0F2537]">
              {lang === 'ar'
                ? `حجز حصة خاصة وتفعيلها عبر واتساب مع ${activeTrainer.name}`
                : lang === 'en'
                  ? `Request Private Coaching & Activate via WhatsApp with ${activeTrainer.name}`
                  : `Demander une séance privée et activer sur WhatsApp avec ${activeTrainer.name}`}
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              {lang === 'ar'
                ? `اختر التاريخ والوقت والمدة وأرفق نقاط الضعف، ثم تواصل عبر واتساب (${TEACHER_WHATSAPP[activeTrainer.id].phoneE164}) لتأكيد وتفعيل الحصة.`
                : lang === 'en'
                  ? `Pick your date, time & duration, attach weaknesses and target lessons, then confirm directly with your teacher on WhatsApp (${TEACHER_WHATSAPP[activeTrainer.id].phoneDisplay}).`
                  : `Choisissez la date, l’horaire, la durée, vos points faibles et thèmes, puis finalisez l’activation directement sur WhatsApp (${TEACHER_WHATSAPP[activeTrainer.id].phoneDisplay}).`}
            </p>
          </div>
          <div className="font-mono text-2xl font-bold text-[#0B6E8C] tabular-nums shrink-0">
            {estimatedPrice} SAR
          </div>
        </div>

        {/* Saved Booking Request + Direct WhatsApp Confirmation / Post-Activation Meet */}
        {confirmedBooking && (() => {
          const trainerWaInfo = TEACHER_WHATSAPP[confirmedBooking.trainerId];
          const bookingWaUrl = buildWhatsAppActivationUrl({
            teacherId: confirmedBooking.trainerId,
            teacherDisplayName: confirmedBooking.trainerName,
            itemType: 'tutoring',
            itemTitle: `${confirmedBooking.curriculum} · ${confirmedBooking.subject} (${confirmedBooking.durationLabel})`,
            itemCode: confirmedBooking.paymentReference,
            curriculum: confirmedBooking.curriculum,
            priceSar: confirmedBooking.priceSar,
            studentName: confirmedBooking.studentName,
            studentEmail: confirmedBooking.contactEmail,
            extraDetails: `Créneau : ${confirmedBooking.dateSlot} à ${confirmedBooking.timeSlot}`,
            lang,
          });

          return (
            <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm text-emerald-950">
                  <div className="font-semibold">
                    {confirmedBooking.paid
                      ? `Séance activée (${confirmedBooking.paymentReference}) · ${confirmedBooking.trainerName}`
                      : `Demande enregistrée (${confirmedBooking.paymentReference}) · En attente d’activation WhatsApp avec ${confirmedBooking.trainerName}`}
                  </div>
                  <div className="text-xs text-emerald-900 tabular-nums">
                    {confirmedBooking.curriculum} ({confirmedBooking.subject}) · {confirmedBooking.dateSlot} ·{' '}
                    {confirmedBooking.timeSlot} · {confirmedBooking.durationLabel} ·{' '}
                    <strong className="font-mono">{confirmedBooking.priceSar} SAR</strong>
                  </div>
                  {confirmedBooking.attachedWeaknesses.length > 0 && (
                    <div className="text-xs text-emerald-900 pt-1">
                      <strong>Points faibles envoyés :</strong> {confirmedBooking.attachedWeaknesses.join(' · ')}
                    </div>
                  )}
                  {confirmedBooking.themesToCover.length > 0 && (
                    <div className="text-xs text-emerald-900">
                      <strong>Thèmes &amp; leçons :</strong> {confirmedBooking.themesToCover.join(' · ')}
                    </div>
                  )}
                </div>
              </div>

              {!confirmedBooking.paid ? (
                <div className="pt-3 border-t border-emerald-200 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-emerald-900">
                    Cliquez ci-contre pour envoyer cette demande à <strong>{trainerWaInfo.defaultName}</strong> sur WhatsApp et activer votre séance.
                  </span>
                  <a
                    href={bookingWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 shrink-0"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Envoyer sur WhatsApp ({trainerWaInfo.phoneDisplay})</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : confirmedBooking.meetLink ? (
                <div className="pt-3 border-t border-emerald-200 flex flex-wrap items-center gap-3">
                  <a
                    href={confirmedBooking.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2"
                  >
                    <Video className="w-4 h-4" />
                    <span>Rejoindre la salle Google Meet</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <span className="font-mono text-xs text-emerald-900 bg-white px-3 py-2 rounded-lg border border-emerald-200 select-all">
                    {confirmedBooking.meetLink}
                  </span>
                  {confirmedBooking.calendarEventLink && (
                    <a
                      href={confirmedBooking.calendarEventLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-white border border-emerald-300 text-emerald-900 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Google Agenda</span>
                    </a>
                  )}
                </div>
              ) : (
                <div className="pt-3 border-t border-emerald-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs text-emerald-900">
                      {meetWarning
                        ? `${meetWarning} — Cliquez ci-contre pour générer automatiquement la salle Google Meet.`
                        : 'Votre séance est activée. Connectez Google pour générer le lien Google Meet partagé avec votre formateur.'}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={generatingMeet}
                        onClick={handleGenerateMeetPostPayment}
                        className="px-4 py-2.5 bg-[#0F2537] hover:bg-[#0B6E8C] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Video className="w-4 h-4" />
                        <span>{generatingMeet ? 'Création Google Meet...' : 'Générer le lien Google Meet'}</span>
                      </button>
                      <a
                        href="https://meet.google.com/new"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2.5 bg-white border border-emerald-300 hover:border-[#0B6E8C] text-[#0F2537] text-xs font-semibold rounded-xl inline-flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ouvrir Google Meet directement</span>
                      </a>
                    </div>
                  </div>

                  <form onSubmit={handleSaveManualMeetLink} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      value={manualMeetUrl}
                      onChange={(e) => setManualMeetUrl(e.target.value)}
                      placeholder="Ou collez le lien Google Meet créé (https://meet.google.com/xxx-xxxx-xxx) pour le partager au formateur..."
                      className="flex-1 px-3 py-2 text-xs bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
                    />
                    <button
                      type="submit"
                      disabled={savingManualMeet || !manualMeetUrl.trim()}
                      className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>{savingManualMeet ? 'Enregistrement...' : 'Associer le lien Meet'}</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          );
        })()}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-900">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Row 1: Student, Language, Curriculum */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {lang === 'ar' ? 'اسم الطالب' : lang === 'en' ? 'Student Name' : 'Nom de l’élève'}
              </label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Youssef Al-Harbi"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {lang === 'ar' ? 'لغة الحصة' : lang === 'en' ? 'Instruction Language' : 'Langue du cours'}
              </label>
              <select
                value={language}
                onChange={(e) =>
                  setLanguage(e.target.value as 'English' | 'Français' | 'العربية')
                }
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
              >
                {activeTrainer.languages.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {lang === 'ar' ? 'البرنامج / الاختبار' : lang === 'en' ? 'Curriculum' : 'Programme d’examen'}
              </label>
              <select
                value={curriculum}
                onChange={(e) => setCurriculum(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
              >
                {activeTrainer.curricula.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Subject, Exact Duration, Flexible Date & Free Time Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {lang === 'ar' ? 'المادة' : lang === 'en' ? 'Subject' : 'Matière'}
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Mathématiques / Physics / Qudurat"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {lang === 'ar' ? 'مدة التدريب (بالدقائق / الساعات)' : lang === 'en' ? 'Training Duration (min / hours)' : 'Durée de formation (minutes / heures)'}
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value) as 30 | 60 | 90 | 120 | 300)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
              >
                {DURATION_OPTIONS.map((opt) => {
                  const p =
                    opt.minutes === 30
                      ? Math.round(activeTrainer.hourlyRateSar * 0.6)
                      : opt.minutes === 90
                        ? activeTrainer.hourlyRateSar + 70
                        : opt.minutes === 120
                          ? activeTrainer.hourlyRateSar * 2 - 20
                          : opt.minutes === 300
                            ? activeTrainer.packRateSar
                            : activeTrainer.hourlyRateSar;
                  const lbl = lang === 'ar' ? opt.labelAr : lang === 'en' ? opt.labelEn : opt.labelFr;
                  return (
                    <option key={opt.minutes} value={opt.minutes}>
                      {lbl} — {p} SAR
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {lang === 'ar' ? 'التاريخ المناسب لك' : lang === 'en' ? 'Your Available Date' : 'Date disponible'}
                </label>
                <input
                  type="date"
                  required
                  min={getTodayIso()}
                  value={dateSlot}
                  onChange={(e) => setDateSlot(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {lang === 'ar' ? 'الوقت المناسب (AST)' : lang === 'en' ? 'Preferred Time (AST)' : 'Heure exacte (AST)'}
                </label>
                <input
                  type="time"
                  required
                  value={timeValue}
                  onChange={(e) => setTimeValue(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
                />
              </div>
            </div>
          </div>

          {/* Clickable Trainer Availability Suggestions */}
          {activeTrainer.availabilitySlots && activeTrainer.availabilitySlots.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-600 me-1">
                {lang === 'ar'
                  ? 'أوقات مقترحة من المدرب (أو اختر أي وقت أعلاه):'
                  : lang === 'en'
                    ? 'Suggested teacher slots (or pick any date & time above):'
                    : 'Créneaux suggérés par le formateur (ou choisissez librement ci-dessus) :'}
              </span>
              {activeTrainer.availabilitySlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => applySuggestedSlot(slot)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-[#0B6E8C] text-[11px] font-medium text-[#0F2537] cursor-pointer transition-colors"
                >
                  {slot}
                </button>
              ))}
            </div>
          )}

          {/* Row 3: Weaknesses & Target Lessons/Themes sent to Teacher */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-slate-200">
            <div className="space-y-3">
              <div className="text-xs font-semibold text-[#0F2537]">
                {lang === 'ar'
                  ? 'نقاط الضعف المرفقة في تقرير المدرب'
                  : lang === 'en'
                    ? 'Weaknesses Sent to Teacher Report'
                    : 'Points faibles transmis au formateur'}
              </div>

              {suggestedWeaknesses.length > 0 && (
                <div className="space-y-1.5">
                  {suggestedWeaknesses.map((w) => {
                    const checked = attachedWeaknesses.includes(w);
                    return (
                      <label
                        key={w}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                          checked
                            ? 'bg-amber-50 border-amber-300 text-amber-950'
                            : 'bg-[#F8FAFC] border-slate-200 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleWeakness(w)}
                          className="mt-0.5 accent-[#0B6E8C]"
                        />
                        <span>{w}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {attachedWeaknesses
                .filter((w) => !suggestedWeaknesses.includes(w))
                .map((w) => (
                  <label
                    key={w}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl border bg-amber-50 border-amber-300 text-amber-950 text-xs cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked
                      onChange={() => toggleWeakness(w)}
                      className="mt-0.5 accent-[#0B6E8C]"
                    />
                    <span>{w}</span>
                  </label>
                ))}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customWeakness}
                  onChange={(e) => setCustomWeakness(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomWeakness();
                    }
                  }}
                  placeholder="Ajouter un point faible (ex : Fractions, Rédaction)..."
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
                <button
                  type="button"
                  onClick={addCustomWeakness}
                  className="px-3 py-2 border border-slate-300 hover:border-[#0B6E8C] rounded-xl text-xs font-semibold text-[#0F2537] inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold text-[#0F2537]">
                {lang === 'ar'
                  ? 'الدروس والمواضيع المطلوب العمل عليها'
                  : lang === 'en'
                    ? 'Lessons & Themes to Cover in This Coaching'
                    : 'Thèmes & Leçons sur lesquels effectuer la formation'}
              </div>

              <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pe-1">
                {suggestedThemes.map((th) => {
                  const checked = themesToCover.includes(th);
                  return (
                    <label
                      key={th}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                        checked
                          ? 'bg-[#EEF5F9] border-[#0B6E8C] text-[#0F2537]'
                          : 'bg-[#F8FAFC] border-slate-200 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTheme(th)}
                        className="mt-0.5 accent-[#0B6E8C]"
                      />
                      <span>{th}</span>
                    </label>
                  );
                })}
                {themesToCover
                  .filter((th) => !suggestedThemes.includes(th))
                  .map((th) => (
                    <label
                      key={th}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl border bg-[#EEF5F9] border-[#0B6E8C] text-[#0F2537] text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked
                        onChange={() => toggleTheme(th)}
                        className="mt-0.5 accent-[#0B6E8C]"
                      />
                      <span>{th}</span>
                    </label>
                  ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTheme}
                  onChange={(e) => setCustomTheme(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomTheme();
                    }
                  }}
                  placeholder="Ajouter un thème ou chapitre précis..."
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
                <button
                  type="button"
                  onClick={addCustomTheme}
                  className="px-3 py-2 border border-slate-300 hover:border-[#0B6E8C] rounded-xl text-xs font-semibold text-[#0F2537] inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
              </div>
            </div>
          </div>

          {/* Row 4: Direct WhatsApp Teacher Activation & Request Submission */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4 border-t border-slate-200 items-center">
            <div className="lg:col-span-6 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-emerald-950">
                  {lang === 'ar'
                    ? `واتساب ${activeTrainer.name}`
                    : lang === 'en'
                      ? `WhatsApp · ${activeTrainer.name}`
                      : `WhatsApp · ${activeTrainer.name}`}
                </div>
                <div className="font-mono text-xs font-semibold text-emerald-800" dir="ltr">
                  {TEACHER_WHATSAPP[activeTrainer.id].phoneDisplay}
                </div>
              </div>
              <a
                href={buildWhatsAppActivationUrl({
                  teacherId: activeTrainer.id,
                  teacherDisplayName: activeTrainer.name,
                  itemType: 'tutoring',
                  itemTitle: `${curriculum} · ${subject} (${durationMinutes} min)`,
                  curriculum,
                  priceSar: estimatedPrice,
                  studentName: studentName || user?.name,
                  studentEmail: user?.email,
                  extraDetails: `Créneau : ${dateSlot} à ${timeSlot}${notes ? ` | ${notes}` : ''}`,
                  lang,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shrink-0"
              >
                <MessageCircle className="w-4 h-4" />
                <span>
                  {lang === 'ar'
                    ? 'واتساب مباشر'
                    : lang === 'en'
                      ? 'Open WhatsApp'
                      : 'Ouvrir WhatsApp'}
                </span>
              </a>
            </div>

            <div className="lg:col-span-6">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-5 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-sm font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'Enregistrement...'
                    : lang === 'ar'
                      ? `حفظ الطلب والتفعيل عبر واتساب (${estimatedPrice} ر.س)`
                      : lang === 'en'
                        ? `Save Request & Activate via WhatsApp (${estimatedPrice} SAR)`
                        : `Enregistrer la demande & Activer via WhatsApp (${estimatedPrice} SAR)`}
                </span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {lang === 'ar'
                ? 'ملاحظات إضافية للمدرب'
                : lang === 'en'
                  ? 'Additional Notes for Teacher'
                  : 'Précisions complémentaires pour le formateur'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                lang === 'ar'
                  ? 'مثال: التحضير لاختبار نافس أو مراجعة التكامل'
                  : lang === 'en'
                    ? 'e.g. Target exam date or specific exercises to review'
                    : 'Ex : Objectif de note visé ou exercices spécifiques à préparer'
              }
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
            />
          </div>
        </form>
      </div>
    </section>
  );
}
