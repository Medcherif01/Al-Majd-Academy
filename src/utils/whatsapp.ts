import type { UiLanguage } from '../types/academy';

export interface TeacherWhatsAppInfo {
  id: 'marwan' | 'mohamed';
  defaultName: string;
  phoneDisplay: string;
  phoneE164: string;
  digits: string;
  tracksLabel: string;
}

export const TEACHER_WHATSAPP: Record<'marwan' | 'mohamed', TeacherWhatsAppInfo> = {
  marwan: {
    id: 'marwan',
    defaultName: 'Marwan Mhamdi',
    phoneDisplay: '+966 50 319 7969',
    phoneE164: '+966503197969',
    digits: '966503197969',
    tracksLabel: 'English Tracks (SAT, IB, IGCSE, IELTS, STEP, GAT)',
  },
  mohamed: {
    id: 'mohamed',
    defaultName: 'Mohamed Cherif',
    phoneDisplay: '+966 59 422 8783',
    phoneE164: '+966594228783',
    digits: '966594228783',
    tracksLabel: 'FR / AR Tracks (NAFS, Qudurat, Tahsili, Bac Français)',
  },
};

export function isLanguageAssignedTeacher(language?: string | null): boolean {
  const val = (language || '').trim().toLowerCase();
  return (
    val.includes('english') ||
    val === 'en' ||
    val.includes('anglais') ||
    val.includes('franç') ||
    val.includes('franc') ||
    val.includes('french') ||
    val === 'fr' ||
    val.includes('عرب') ||
    val.includes('arab') ||
    val === 'ar'
  );
}

export function resolveTeacherForItem(params: {
  language?: string | null;
  curriculum?: string | null;
  explicitTeacherId?: 'marwan' | 'mohamed' | null;
}): 'marwan' | 'mohamed' {
  const langVal = (params.language || '').trim().toLowerCase();
  if (langVal.includes('english') || langVal === 'en' || langVal.includes('anglais')) {
    return 'marwan';
  }
  if (
    langVal.includes('franç') ||
    langVal.includes('franc') ||
    langVal.includes('french') ||
    langVal === 'fr' ||
    langVal.includes('عرب') ||
    langVal.includes('arab') ||
    langVal === 'ar'
  ) {
    return 'mohamed';
  }
  return resolveTeacherIdForCurriculum(params.curriculum, params.explicitTeacherId);
}

export function resolveTeacherIdForCurriculum(
  curriculumOrTrack?: string | null,
  explicitTeacherId?: 'marwan' | 'mohamed' | null
): 'marwan' | 'mohamed' {
  if (explicitTeacherId === 'marwan' || explicitTeacherId === 'mohamed') {
    return explicitTeacherId;
  }
  const val = (curriculumOrTrack || '').toLowerCase();
  if (
    val.includes('nafs') ||
    val.includes('nafes') ||
    val.includes('qudurat') ||
    val.includes('tahsili') ||
    val.includes('qiyas') ||
    val.includes('bac') ||
    val.includes('french') ||
    val.includes('français') ||
    val.includes('mohamed') ||
    val.includes('cherif') ||
    val.includes('arab')
  ) {
    return 'mohamed';
  }
  return 'marwan';
}

export function buildWhatsAppActivationMessage(params: {
  teacherId: 'marwan' | 'mohamed';
  teacherDisplayName?: string;
  itemType: 'course' | 'past_paper' | 'all_access' | 'tutoring';
  itemTitle: string;
  itemCode?: string;
  curriculum?: string;
  priceSar?: number;
  studentName?: string;
  studentEmail?: string;
  extraDetails?: string;
  lang?: UiLanguage;
}): string {
  const info = TEACHER_WHATSAPP[params.teacherId];
  const teacherName = params.teacherDisplayName || info.defaultName;
  const lang = params.lang || 'fr';

  const typeLabel =
    lang === 'ar'
      ? params.itemType === 'course'
        ? 'تفعيل دورة تدريبية'
        : params.itemType === 'past_paper'
          ? 'تفعيل اختبار سابق مع الحل'
          : params.itemType === 'all_access'
            ? 'تفعيل الباقة الشاملة لجميع الاختبارات'
            : 'تفعيل حصة تدريب خاصة'
      : lang === 'en'
        ? params.itemType === 'course'
          ? 'Course Activation'
          : params.itemType === 'past_paper'
            ? 'Past Paper & Mark Scheme Activation'
            : params.itemType === 'all_access'
              ? 'All-Access Pass Activation'
              : 'Private Tutoring Session Request'
        : params.itemType === 'course'
          ? 'Activation d’un Cours'
          : params.itemType === 'past_paper'
            ? 'Activation d’un Past Paper & Corrigé'
            : params.itemType === 'all_access'
              ? 'Activation du Pass Annuel Tous Examens'
              : 'Demande de Séance Privée';

  const lines: string[] = [];
  if (lang === 'ar') {
    lines.push(`السلام عليكم أستاذ ${teacherName}،`);
    lines.push(`أرغب في ${typeLabel} على منصة Dateacher:`);
    lines.push(`• المحتوى: ${params.itemTitle}${params.itemCode ? ` (${params.itemCode})` : ''}`);
    if (params.curriculum) lines.push(`• المسار: ${params.curriculum}`);
    if (typeof params.priceSar === 'number') lines.push(`• الرسوم: ${params.priceSar} SAR`);
    if (params.studentName) lines.push(`• اسم الطالب: ${params.studentName}`);
    if (params.studentEmail) lines.push(`• بريد الحساب للتفعيل: ${params.studentEmail}`);
    if (params.extraDetails) lines.push(`• تفاصيل إضافية: ${params.extraDetails}`);
    lines.push(`شكراً لتفعيل الحساب.`);
  } else if (lang === 'en') {
    lines.push(`Hello ${teacherName},`);
    lines.push(`I would like to request ${typeLabel} on Dateacher:`);
    lines.push(`• Item: ${params.itemTitle}${params.itemCode ? ` (${params.itemCode})` : ''}`);
    if (params.curriculum) lines.push(`• Curriculum: ${params.curriculum}`);
    if (typeof params.priceSar === 'number') lines.push(`• Price: ${params.priceSar} SAR`);
    if (params.studentName) lines.push(`• Student Name: ${params.studentName}`);
    if (params.studentEmail) lines.push(`• Account Email to Activate: ${params.studentEmail}`);
    if (params.extraDetails) lines.push(`• Details: ${params.extraDetails}`);
    lines.push(`Thank you!`);
  } else {
    lines.push(`Bonjour ${teacherName},`);
    lines.push(`Je souhaite demander l’${typeLabel} sur Dateacher :`);
    lines.push(`• Contenu : ${params.itemTitle}${params.itemCode ? ` (${params.itemCode})` : ''}`);
    if (params.curriculum) lines.push(`• Programme : ${params.curriculum}`);
    if (typeof params.priceSar === 'number') lines.push(`• Tarif : ${params.priceSar} SAR`);
    if (params.studentName) lines.push(`• Élève : ${params.studentName}`);
    if (params.studentEmail) lines.push(`• E-mail du compte à activer : ${params.studentEmail}`);
    if (params.extraDetails) lines.push(`• Précisions : ${params.extraDetails}`);
    lines.push(`Merci d’avance pour l’activation.`);
  }

  return lines.join('\n');
}

export function buildWhatsAppActivationUrl(
  params: Parameters<typeof buildWhatsAppActivationMessage>[0]
): string {
  const info = TEACHER_WHATSAPP[params.teacherId];
  const text = buildWhatsAppActivationMessage(params);
  return `https://wa.me/${info.digits}?text=${encodeURIComponent(text)}`;
}
