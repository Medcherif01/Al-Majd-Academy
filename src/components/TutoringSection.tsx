import { useEffect, useState } from 'react';
import { CalendarCheck, CheckCircle2, Globe2 } from 'lucide-react';
import { apiRequest } from '../utils/api';
import { TRANSLATIONS } from '../i18n/translations';
import type { BookingItem, TrainerProfile, UiLanguage, UserProfile } from '../types/academy';

interface TutoringSectionProps {
  lang: UiLanguage;
  trainers: TrainerProfile[];
  preselectedTrainerName?: string | null;
  user: UserProfile | null;
  token: string | null;
  onRequireAuth: () => void;
  onBookingCreated: (booking: BookingItem) => void;
}

const TRAINER_IMAGES: Record<'marwan' | 'mohamed', string> = {
  marwan: '/src/assets/images/trainer_marwan_mhamdi_1795527476961.jpg',
  mohamed: '/src/assets/images/trainer_mohamed_cherif_1795527477326.jpg',
};

export function TutoringSection({
  lang,
  trainers,
  preselectedTrainerName,
  user,
  token,
  onRequireAuth,
  onBookingCreated,
}: TutoringSectionProps) {
  const t = TRANSLATIONS[lang];
  const [selectedTrainerId, setSelectedTrainerId] = useState<'marwan' | 'mohamed'>('marwan');
  const [language, setLanguage] = useState<'English' | 'Français' | 'العربية'>('English');
  const [curriculum, setCurriculum] = useState<string>('Digital SAT & ACT');
  const [subject, setSubject] = useState<string>('Mathematics');
  const [sessionPackage, setSessionPackage] = useState<'single_60' | 'intensive_90' | 'pack_5'>('single_60');
  const [dateSlot, setDateSlot] = useState<string>('2026-11-28');
  const [timeSlot, setTimeSlot] = useState<string>('17:00 AST');
  const [studentName, setStudentName] = useState<string>(user?.name || '');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<BookingItem | null>(null);

  useEffect(() => {
    if (user?.name && !studentName) {
      setStudentName(user.name);
    }
  }, [user, studentName]);

  useEffect(() => {
    if (!preselectedTrainerName) return;
    if (preselectedTrainerName.toLowerCase().includes('mohamed')) {
      handleSelectTrainer('mohamed');
    } else if (preselectedTrainerName.toLowerCase().includes('marwan')) {
      handleSelectTrainer('marwan');
    }
  }, [preselectedTrainerName]);

  const activeTrainer = trainers.find((tr) => tr.id === selectedTrainerId) || trainers[0];

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

  const estimatedPrice =
    sessionPackage === 'pack_5'
      ? activeTrainer.packRateSar
      : sessionPackage === 'intensive_90'
        ? activeTrainer.hourlyRateSar + 70
        : activeTrainer.hourlyRateSar;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setConfirmedBooking(null);
    if (!user || !token) {
      onRequireAuth();
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest<{ booking: BookingItem }>('/api/bookings', {
        method: 'POST',
        token,
        body: {
          trainerId: activeTrainer.id,
          language,
          curriculum,
          subject,
          sessionPackage,
          dateSlot,
          timeSlot,
          studentName: studentName || user.name,
          notes,
        },
      });
      setConfirmedBooking(res.booking);
      onBookingCreated(res.booking);
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Impossible de confirmer la réservation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="mb-10 max-w-3xl">
        <p className="text-xs font-semibold tracking-wide text-emerald-800 mb-2">
          {lang === 'ar'
            ? 'التدريب المباشر عبر الإنترنت · بتوقيت الرياض'
            : lang === 'en'
              ? 'Paid Online Coaching · Riyadh Time (AST)'
              : 'Tutorat en Ligne Payant · Heure de Riyad (AST)'}
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-semibold text-slate-900 text-balance">
          {t.tutorsTitle}
        </h2>
        <p className="mt-3 text-base text-slate-600 leading-relaxed">{t.tutorsSubtitle}</p>
      </div>

      {/* Two Dedicated Trainer Profiles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        {trainers.map((trainer) => {
          const isSelected = trainer.id === activeTrainer.id;
          const bio =
            lang === 'ar' ? trainer.bioAr : lang === 'en' ? trainer.bioEn : trainer.bioFr;

          return (
            <div
              key={trainer.id}
              className={`bg-white rounded-xl border p-6 sm:p-8 flex flex-col justify-between transition-colors ${
                isSelected ? 'border-emerald-800 shadow-sm' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex flex-col sm:flex-row items-start gap-5 mb-5">
                  <div className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                    <img
                      src={TRAINER_IMAGES[trainer.id]}
                      alt={trainer.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-emerald-800 mb-1 flex items-center gap-1.5">
                      <Globe2 className="w-3.5 h-3.5" />
                      <span>{trainer.languages.join(' · ')}</span>
                    </div>
                    <h3 className="font-display text-2xl font-semibold text-slate-900">
                      {trainer.name}
                    </h3>
                    <p className="text-xs font-medium text-slate-600 mt-0.5">{trainer.roleTitle}</p>
                  </div>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed mb-4">{bio}</p>

                <div className="text-xs text-slate-500 mb-4">{trainer.credentials}</div>

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
                  <span className="font-mono text-base font-semibold text-slate-900">
                    {trainer.hourlyRateSar} SAR
                  </span>{' '}
                  / 60 min · Pack 5 :{' '}
                  <span className="font-mono font-semibold text-slate-900">
                    {trainer.packRateSar} SAR
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectTrainer(trainer.id)}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-800 text-white'
                      : 'bg-slate-900 hover:bg-emerald-900 text-white'
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

      {/* Live Session Booking Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200">
          <div>
            <h3 className="font-display text-2xl font-semibold text-slate-900">
              {lang === 'ar'
                ? `حجز حصة مباشرة مع ${activeTrainer.name}`
                : lang === 'en'
                  ? `Schedule Live Session with ${activeTrainer.name}`
                  : `Réserver une séance en ligne avec ${activeTrainer.name}`}
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              {activeTrainer.id === 'marwan'
                ? 'Langue d’enseignement : Anglais (SAT, AP, IB, IGCSE, A-Level, GAT English)'
                : 'Langues d’enseignement : Français & Arabe (Baccalauréat, Brevet, IB French B, Nafes, Qudurat, Tahsili)'}
            </p>
          </div>
          <div className="font-mono text-xl font-semibold text-emerald-800 tabular-nums">
            {estimatedPrice} SAR
          </div>
        </div>

        {confirmedBooking && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-950">
              <strong>
                {lang === 'ar'
                  ? 'تم تأكيد الحجز!'
                  : lang === 'en'
                    ? 'Booking Confirmed!'
                    : 'Réservation confirmée !'}
              </strong>{' '}
              {confirmedBooking.trainerName} — {confirmedBooking.curriculum} ({confirmedBooking.subject}) ·{' '}
              {confirmedBooking.dateSlot} · {confirmedBooking.timeSlot} ·{' '}
              <span className="font-mono">{confirmedBooking.priceSar} SAR</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-900">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
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
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
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
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              {activeTrainer.curricula.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

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
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {lang === 'ar' ? 'الباقة' : lang === 'en' ? 'Session Format' : 'Formule'}
            </label>
            <select
              value={sessionPackage}
              onChange={(e) =>
                setSessionPackage(e.target.value as 'single_60' | 'intensive_90' | 'pack_5')
              }
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="single_60">
                Séance Individuelle 60 min ({activeTrainer.hourlyRateSar} SAR)
              </option>
              <option value="intensive_90">
                Coaching Intensif Examen 90 min ({activeTrainer.hourlyRateSar + 70} SAR)
              </option>
              <option value="pack_5">
                Pack 5 Séances ({activeTrainer.packRateSar} SAR)
              </option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {lang === 'ar' ? 'التاريخ' : lang === 'en' ? 'Date' : 'Date'}
              </label>
              <input
                type="date"
                required
                value={dateSlot}
                onChange={(e) => setDateSlot(e.target.value)}
                className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {lang === 'ar' ? 'الوقت' : lang === 'en' ? 'Time (AST)' : 'Créneau'}
              </label>
              <select
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                {activeTrainer.availabilitySlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {lang === 'ar'
                ? 'أهداف الحصة أو الصعوبات المحددة'
                : lang === 'en'
                  ? 'Exam Goals & Specific Topics'
                  : 'Objectifs & Chapitres à travailler'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                lang === 'ar'
                  ? 'مثال: التحضير لاختبار نافس أو مراجعة التكامل'
                  : lang === 'en'
                    ? 'e.g. SAT Module 2 pacing, IB Paper 1 Induction'
                    : 'Ex : Préparation examen blanc IB, révision récurrence ou Qudurat'
              }
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-5 bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>
                {submitting
                  ? '...'
                  : lang === 'ar'
                    ? 'تأكيد الحجز المدفوع'
                    : lang === 'en'
                      ? 'Confirm Paid Booking'
                      : 'Confirmer la réservation'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
