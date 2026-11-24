import { useCallback, useEffect, useState } from 'react';
import {
  Award,
  BookOpenCheck,
  Briefcase,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FileUp,
  GraduationCap,
  Layers,
  PenTool,
  Plus,
  Printer,
  Save,
  Send,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  Video,
} from 'lucide-react';
import { apiRequest } from '../utils/api';
import { ExamPrepHubs } from './ExamPrepHubs';
import type {
  BookingItem,
  DemoReport,
  FullPastPaper,
  PastPaperSummary,
  PrepHubTab,
  RosterStudent,
  TeacherSubTab,
  TrainerProfile,
  UiLanguage,
  WeeklyMission,
  WritingSubmission,
} from '../types/academy';

interface TeacherPortalProps {
  lang: UiLanguage;
  trainers?: TrainerProfile[];
  papers?: PastPaperSummary[];
  onLaunchAiExam?: (curriculum: string) => void;
  onTrainersUpdated?: () => Promise<void> | void;
  onPapersUpdated?: () => Promise<void> | void;
}

const PAST_PAPER_CATEGORIES = [
  'American (SAT/AP)',
  'IB Diploma',
  'IGCSE & A-Level',
  'NAFES (ETEC)',
  'Qudurat & Tahsili',
  'Bac Français',
] as const;

const TRAINER_FALLBACK_PHOTOS: Record<'marwan' | 'mohamed', string> = {
  marwan: '/src/assets/images/trainer_marwan_mhamdi_1795527476961.jpg',
  mohamed: '/src/assets/images/trainer_mohamed_cherif_1795527477326.jpg',
};

function readFileAsBase64Payload(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result || '');
      const commaIdx = res.indexOf(',');
      resolve(commaIdx >= 0 ? res.slice(commaIdx + 1) : res);
    };
    reader.onerror = () => reject(new Error('Impossible de lire le fichier sélectionné.'));
    reader.readAsDataURL(file);
  });
}

function resizeImageFileToDataUrl(file: File, maxDim = 420): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas indisponible pour redimensionner la photo.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('Image invalide ou corrompue.'));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('Lecture de l’image impossible.'));
    reader.readAsDataURL(file);
  });
}

const CURATED_SKILLS_BY_TEACHER: Record<'marwan' | 'mohamed', string[]> = {
  marwan: [
    'STEP Grammar & Sentence Structure',
    'STEP Academic Reading Inference',
    'GAT Quantitative Ratios & Percents',
    'IELTS Task 2 Coherence & Cohesion',
    'Digital SAT Desmos Modeling',
    'IB Math AA Differentiation & Proof',
    'IGCSE 0580 Algebraic Manipulation',
    'Phonics Digraphs & Fluency',
    'Critical Academic Vocabulary',
  ],
  mohamed: [
    'NAFES Lecture & Compréhension ETEC',
    'NAFES Mathématiques Fondamentales',
    'NAFES Sciences Expérimentales',
    'Qudurat Quantitatif Rapide',
    'Qudurat Analogies Verbales (قياس)',
    'Tahsili Mathématiques & Physique',
    'Bac Français Dissertation & Analyse',
    'IB French B Rédaction Structurée',
    'Expression Écrite Bilingue AR/FR',
  ],
};

export function TeacherPortal({
  lang,
  trainers = [],
  papers = [],
  onLaunchAiExam,
  onTrainersUpdated,
  onPapersUpdated,
}: TeacherPortalProps) {
  const [teacherId, setTeacherId] = useState<'marwan' | 'mohamed'>('marwan');
  const [activeTab, setActiveTab] = useState<TeacherSubTab>('students-codes');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string>('');

  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [missions, setMissions] = useState<WeeklyMission[]>([]);
  const [writings, setWritings] = useState<WritingSubmission[]>([]);
  const [pendingWritingCount, setPendingWritingCount] = useState(0);
  const [demoReports, setDemoReports] = useState<DemoReport[]>([]);
  const [pendingDemoReportsCount, setPendingDemoReportsCount] = useState(0);
  const [bookings, setBookings] = useState<BookingItem[]>([]);

  // Demo Report Skill Attribution Editor
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportStrengthsText, setReportStrengthsText] = useState('');
  const [reportWeaknessesText, setReportWeaknessesText] = useState('');
  const [reportSkills, setReportSkills] = useState<string[]>([]);
  const [customReportSkill, setCustomReportSkill] = useState('');
  const [reportFeedback, setReportFeedback] = useState('');
  const [savingReport, setSavingReport] = useState(false);

  // Add Students Form (matches reference screenshot)
  const [namesText, setNamesText] = useState('');
  const [grade, setGrade] = useState('Grade 11');
  const [className, setClassName] = useState('B');
  const [program, setProgram] = useState<'Boost' | 'Stretch'>('Boost');
  const [creatingStudents, setCreatingStudents] = useState(false);
  const [searchRoster, setSearchRoster] = useState('');

  // Assign Skills Form
  const [assignGrade, setAssignGrade] = useState('All');
  const [assignProgram, setAssignProgram] = useState<'All' | 'Boost' | 'Stretch'>('All');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([
    CURATED_SKILLS_BY_TEACHER.marwan[0],
    CURATED_SKILLS_BY_TEACHER.marwan[2],
  ]);
  const [assigningSkills, setAssigningSkills] = useState(false);

  // Weekly Mission Form
  const [missionTitle, setMissionTitle] = useState('');
  const [missionExam, setMissionExam] = useState('STEP & GAT');
  const [missionGrade, setMissionGrade] = useState('Grade 11');
  const [missionClass, setMissionClass] = useState('B');
  const [missionProgram, setMissionProgram] = useState<'All' | 'Boost' | 'Stretch'>('All');
  const [missionDueDate, setMissionDueDate] = useState('2026-12-05');
  const [creatingMission, setCreatingMission] = useState(false);

  // Writing Review State
  const [selectedWritingId, setSelectedWritingId] = useState<string | null>(null);
  const [reviewScore, setReviewScore] = useState<number>(85);
  const [reviewFeedback, setReviewFeedback] = useState<string>('');
  const [aiDrafting, setAiDrafting] = useState(false);
  const [savingReview, setSavingReview] = useState(false);

  // Admin Past Paper Importer (PDF / Word -> Gemini Verbatim -> HTML)
  const [paperFile, setPaperFile] = useState<File | null>(null);
  const [paperCategory, setPaperCategory] = useState<string>('IB Diploma');
  const [paperSubject, setPaperSubject] = useState<string>('Mathematics');
  const [paperYear, setPaperYear] = useState<number>(2025);
  const [paperExamDate, setPaperExamDate] = useState<string>('Mai 2025');
  const [paperSession, setPaperSession] = useState<string>('Session Principale');
  const [paperLanguage, setPaperLanguage] = useState<'English' | 'Français' | 'العربية'>('English');
  const [paperDuration, setPaperDuration] = useState<string>('120 min');
  const [paperPriceSar, setPaperPriceSar] = useState<number>(49);
  const [paperTitleOverride, setPaperTitleOverride] = useState<string>('');
  const [importingPaper, setImportingPaper] = useState(false);
  const [importError, setImportError] = useState('');
  const [importedResult, setImportedResult] = useState<{
    paper: FullPastPaper;
    previewHtml: string;
  } | null>(null);
  const [adminPaperFilter, setAdminPaperFilter] = useState<string>('all');

  // Teacher Profile, Photo, Experiences & Skills Editor
  const activeTrainerObj = trainers.find((tr) => tr.id === teacherId) || null;
  const [profName, setProfName] = useState('');
  const [profRoleTitle, setProfRoleTitle] = useState('');
  const [profPhotoUrl, setProfPhotoUrl] = useState('');
  const [profCredentials, setProfCredentials] = useState('');
  const [profBioFr, setProfBioFr] = useState('');
  const [profBioEn, setProfBioEn] = useState('');
  const [profBioAr, setProfBioAr] = useState('');
  const [profHourlyRate, setProfHourlyRate] = useState<number>(190);
  const [profPackRate, setProfPackRate] = useState<number>(850);
  const [profCurricula, setProfCurricula] = useState<string[]>([]);
  const [newCurriculum, setNewCurriculum] = useState('');
  const [profExperiences, setProfExperiences] = useState<string[]>([]);
  const [newExperience, setNewExperience] = useState('');
  const [profSkills, setProfSkills] = useState<string[]>([]);
  const [newProfileSkill, setNewProfileSkill] = useState('');
  const [profSlots, setProfSlots] = useState<string[]>([]);
  const [newSlot, setNewSlot] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadReportIntoEditor = (rep: DemoReport) => {
    setSelectedReportId(rep.id);
    setReportStrengthsText(rep.strengths.join('\n'));
    setReportWeaknessesText(rep.weaknesses.join('\n'));
    setReportSkills(rep.attributedSkills || []);
    setReportFeedback(rep.teacherFeedback || '');
  };

  const fetchOverview = useCallback(async (tid: 'marwan' | 'mohamed') => {
    setLoading(true);
    try {
      const res = await apiRequest<{
        students: RosterStudent[];
        missions: WeeklyMission[];
        writings: WritingSubmission[];
        demoReports?: DemoReport[];
        bookings?: BookingItem[];
        pendingWritingCount: number;
        pendingDemoReportsCount?: number;
      }>(`/api/teacher/overview?teacherId=${tid}`);
      setStudents(res.students);
      setMissions(res.missions);
      setWritings(res.writings);
      setPendingWritingCount(res.pendingWritingCount);

      const reports = res.demoReports || [];
      setDemoReports(reports);
      setPendingDemoReportsCount(res.pendingDemoReportsCount ?? reports.filter((r) => r.status === 'new').length);
      setBookings(res.bookings || []);

      if (reports.length > 0) {
        const firstNew = reports.find((r) => r.status === 'new') || reports[0];
        loadReportIntoEditor(firstNew);
      } else {
        setSelectedReportId(null);
      }

      if (res.writings.length > 0) {
        const firstPending = res.writings.find((w) => w.status === 'pending') || res.writings[0];
        setSelectedWritingId(firstPending.id);
        setReviewScore(firstPending.score ?? 85);
        setReviewFeedback(firstPending.teacherFeedback || '');
      } else {
        setSelectedWritingId(null);
      }
    } catch (err) {
      console.error('Failed to fetch teacher overview:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview(teacherId);
    setSelectedSkills([
      CURATED_SKILLS_BY_TEACHER[teacherId][0],
      CURATED_SKILLS_BY_TEACHER[teacherId][1],
    ]);
    setPaperLanguage(teacherId === 'mohamed' ? 'Français' : 'English');
    setPaperCategory(teacherId === 'mohamed' ? 'NAFES (ETEC)' : 'IB Diploma');
  }, [teacherId, fetchOverview]);

  useEffect(() => {
    if (!activeTrainerObj) return;
    setProfName(activeTrainerObj.name);
    setProfRoleTitle(activeTrainerObj.roleTitle);
    setProfPhotoUrl(activeTrainerObj.photoUrl || TRAINER_FALLBACK_PHOTOS[activeTrainerObj.id]);
    setProfCredentials(activeTrainerObj.credentials);
    setProfBioFr(activeTrainerObj.bioFr);
    setProfBioEn(activeTrainerObj.bioEn);
    setProfBioAr(activeTrainerObj.bioAr);
    setProfHourlyRate(activeTrainerObj.hourlyRateSar);
    setProfPackRate(activeTrainerObj.packRateSar);
    setProfCurricula(activeTrainerObj.curricula || []);
    setProfExperiences(activeTrainerObj.experiences || []);
    setProfSkills(activeTrainerObj.skills || []);
    setProfSlots(activeTrainerObj.availabilitySlots || []);
  }, [activeTrainerObj]);

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(label);
    } catch {
      showToast(text);
    }
  };

  const handleCreateStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namesText.trim()) return;
    setCreatingStudents(true);
    try {
      const res = await apiRequest<{ created: RosterStudent[] }>('/api/teacher/students', {
        method: 'POST',
        body: { teacherId, namesText, grade, className, program },
      });
      setStudents((prev) => [...res.created, ...prev]);
      setNamesText('');
      showToast(
        `${res.created.length} invitation(s) PATH-... & FAM-... créées avec succès.`
      );
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la création.');
    } finally {
      setCreatingStudents(false);
    }
  };

  const handleAssignSkills = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSkills.length === 0) return;
    setAssigningSkills(true);
    try {
      const res = await apiRequest<{ students: RosterStudent[] }>('/api/teacher/assign-skills', {
        method: 'POST',
        body: {
          teacherId,
          grade: assignGrade,
          program: assignProgram,
          skills: selectedSkills,
        },
      });
      setStudents(res.students);
      showToast(`${selectedSkills.length} compétence(s) assignée(s) aux élèves sélectionnés.`);
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de l’assignation.');
    } finally {
      setAssigningSkills(false);
    }
  };

  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!missionTitle.trim()) return;
    setCreatingMission(true);
    try {
      const res = await apiRequest<{ mission: WeeklyMission }>('/api/teacher/missions', {
        method: 'POST',
        body: {
          teacherId,
          grade: missionGrade,
          className: missionClass,
          title: missionTitle,
          targetExam: missionExam,
          skills: selectedSkills.slice(0, 3),
          dueDate: missionDueDate,
          program: missionProgram,
        },
      });
      setMissions((prev) => [res.mission, ...prev]);
      setMissionTitle('');
      showToast('Nouvelle mission hebdomadaire publiée.');
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la création de la mission.');
    } finally {
      setCreatingMission(false);
    }
  };

  const handleAiDraftFeedback = async (submissionId: string) => {
    setAiDrafting(true);
    try {
      const draft = await apiRequest<{ suggestedScore: number; suggestedFeedback: string }>(
        `/api/teacher/writing/${encodeURIComponent(submissionId)}/ai-draft`,
        { method: 'POST' }
      );
      setReviewScore(draft.suggestedScore);
      setReviewFeedback(draft.suggestedFeedback);
      showToast('Suggestion de correction générée par Gemini IA.');
    } catch (err: any) {
      showToast(err.message || 'Gemini IA indisponible — saisissez votre correction manuellement.');
    } finally {
      setAiDrafting(false);
    }
  };

  const handlePublishReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWritingId || !reviewFeedback.trim()) return;
    setSavingReview(true);
    try {
      const res = await apiRequest<{ submission: WritingSubmission }>(
        `/api/teacher/writing/${encodeURIComponent(selectedWritingId)}/review`,
        {
          method: 'POST',
          body: {
            score: reviewScore,
            teacherFeedback: reviewFeedback,
            reviewedBy: teacherId === 'marwan' ? 'Mr. Marwan Mhamdi' : 'M. Mohamed Cherif',
          },
        }
      );
      setWritings((prev) =>
        prev.map((w) => (w.id === res.submission.id ? res.submission : w))
      );
      setPendingWritingCount((c) => Math.max(0, c - 1));
      showToast('Correction publiée et transmise à l’élève.');
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la publication.');
    } finally {
      setSavingReview(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    if (!searchRoster.trim()) return true;
    const q = searchRoster.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.studentCode.toLowerCase().includes(q) ||
      s.parentCode.toLowerCase().includes(q) ||
      s.grade.toLowerCase().includes(q)
    );
  });

  const boostCount = students.filter((s) => s.program === 'Boost').length;
  const stretchCount = students.filter((s) => s.program === 'Stretch').length;
  const avgMastery =
    students.length > 0
      ? Math.round(
          (students.reduce((acc, s) => acc + s.skillsMastered / Math.max(1, s.skillsTotal), 0) /
            students.length) *
            100
        )
      : 0;

  const selectedWriting = writings.find((w) => w.id === selectedWritingId) || writings[0] || null;
  const selectedReport = demoReports.find((r) => r.id === selectedReportId) || demoReports[0] || null;

  const handleAttributeReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || reportSkills.length === 0) return;
    setSavingReport(true);
    try {
      const strengths = reportStrengthsText
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      const weaknesses = reportWeaknessesText
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await apiRequest<{ report: DemoReport }>(
        `/api/teacher/demo-reports/${encodeURIComponent(selectedReport.id)}/attribute`,
        {
          method: 'POST',
          body: {
            strengths,
            weaknesses,
            attributedSkills: reportSkills,
            teacherFeedback: reportFeedback,
            reviewedBy: teacherId === 'marwan' ? 'Mr. Marwan Mhamdi' : 'M. Mohamed Cherif',
          },
        }
      );
      setDemoReports((prev) => {
        const updated = prev.map((r) => (r.id === res.report.id ? res.report : r));
        setPendingDemoReportsCount(updated.filter((r) => r.status === 'new').length);
        return updated;
      });
      showToast(`Compétences & bilan attribués à ${res.report.studentName}.`);
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la validation du bilan.');
    } finally {
      setSavingReport(false);
    }
  };

  const handleImportPastPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError('');
    if (!paperFile) {
      setImportError('Veuillez sélectionner un fichier PDF ou Word (.docx).');
      return;
    }
    setImportingPaper(true);
    try {
      const fileBase64 = await readFileAsBase64Payload(paperFile);
      const res = await apiRequest<{ paper: FullPastPaper; previewHtml: string }>(
        '/api/teacher/past-papers/import',
        {
          method: 'POST',
          body: {
            teacherId,
            curriculum: paperCategory,
            subject: paperSubject,
            year: paperYear,
            examDate: paperExamDate,
            session: paperSession,
            language: paperLanguage,
            duration: paperDuration,
            priceSar: paperPriceSar,
            titleOverride: paperTitleOverride.trim() || undefined,
            fileName: paperFile.name,
            mimeType: paperFile.type || 'application/octet-stream',
            fileBase64,
          },
        }
      );
      setImportedResult(res);
      setPaperFile(null);
      setPaperTitleOverride('');
      await onPapersUpdated?.();
      showToast(`Past Paper "${res.paper.title}" extrait à l’identique en HTML et publié !`);
    } catch (err: any) {
      setImportError(err?.message || 'Erreur lors de l’importation Gemini.');
    } finally {
      setImportingPaper(false);
    }
  };

  const handleDeletePaper = async (paperId: string) => {
    try {
      await apiRequest(`/api/teacher/past-papers/${encodeURIComponent(paperId)}`, {
        method: 'DELETE',
      });
      await onPapersUpdated?.();
      showToast('Past Paper supprimé du catalogue.');
    } catch (err: any) {
      showToast(err?.message || 'Erreur lors de la suppression.');
    }
  };

  const handleDownloadGeneratedHtml = (htmlContent: string, code: string) => {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${code.replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageFileToDataUrl(file);
      setProfPhotoUrl(dataUrl);
      showToast('Photo préparée — cliquez sur Enregistrer le profil pour publier côté élève.');
    } catch (err: any) {
      showToast(err?.message || 'Impossible de charger cette photo.');
    }
  };

  const handleSaveTrainerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiRequest(`/api/teacher/profile/${teacherId}`, {
        method: 'PUT',
        body: {
          name: profName,
          roleTitle: profRoleTitle,
          photoUrl: profPhotoUrl,
          credentials: profCredentials,
          bioFr: profBioFr,
          bioEn: profBioEn,
          bioAr: profBioAr,
          hourlyRateSar: Number(profHourlyRate) || 190,
          packRateSar: Number(profPackRate) || 850,
          curricula: profCurricula,
          experiences: profExperiences,
          skills: profSkills,
          availabilitySlots: profSlots,
        },
      });
      await onTrainersUpdated?.();
      showToast('Profil enseignant, photo, expériences et compétences mis à jour côté élève !');
    } catch (err: any) {
      showToast(err?.message || 'Erreur lors de l’enregistrement du profil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const row1Tabs: { id: TeacherSubTab; label: string; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'demo-reports', label: 'Demo test reports', badge: pendingDemoReportsCount },
    { id: 'tutoring-bookings', label: 'Private Meet bookings', badge: bookings.length },
    { id: 'weekly-mission', label: 'Weekly mission' },
    { id: 'students-codes', label: 'Students & codes' },
    { id: 'assign-skills', label: 'Assign skills' },
    { id: 'progress', label: 'Progress' },
    { id: 'standards', label: 'Standards' },
    { id: 'step', label: 'STEP prep' },
    { id: 'gat', label: 'GAT prep' },
    { id: 'nafes', label: 'NAFES prep' },
    { id: 'ielts', label: 'IELTS prep' },
  ];

  const row2Tabs: { id: TeacherSubTab; label: string; badge?: number }[] = [
    { id: 'past-papers-admin', label: 'Importer Past Papers (HTML)', badge: papers.length },
    { id: 'profile-admin', label: 'Profil, Photo & Compétences' },
    { id: 'phonics', label: 'Phonics' },
    { id: 'skill-builder', label: 'Skill builder' },
    { id: 'writing-review', label: 'Writing to review', badge: pendingWritingCount },
    { id: 'weekly-reports', label: 'Weekly reports' },
  ];

  const isPrepSubTab =
    activeTab === 'standards' ||
    activeTab === 'step' ||
    activeTab === 'gat' ||
    activeTab === 'nafes' ||
    activeTab === 'ielts' ||
    activeTab === 'phonics' ||
    activeTab === 'skill-builder';

  const headerPhoto = activeTrainerObj?.photoUrl || TRAINER_FALLBACK_PHOTOS[teacherId];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header matching the reference screenshot architecture */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 shadow-xs">
            <img
              src={headerPhoto}
              alt={activeTrainerObj?.name || teacherId}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">
              {teacherId === 'marwan'
                ? 'ADMIN TEACHER PORTAL · RMARWAN26@ALEKHAASCHOOLS.COM'
                : 'ADMIN TEACHER PORTAL · M.CHERIF@ALMAJD-ACADEMY.SA'}
            </p>
            <h1 className="font-display text-3xl font-bold text-[#0F2537] tracking-tight">
              {activeTrainerObj?.name || (teacherId === 'marwan' ? 'MR. Mhamdi' : 'M. Mohamed Cherif')}
            </h1>
          </div>
        </div>

        {/* Clean Lead Teacher Switcher */}
        <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setTeacherId('marwan')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              teacherId === 'marwan'
                ? 'bg-[#0B6E8C] text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mr. Marwan Mhamdi (EN)
          </button>
          <button
            type="button"
            onClick={() => setTeacherId('mohamed')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              teacherId === 'mohamed'
                ? 'bg-[#0B6E8C] text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            M. Mohamed Cherif (FR / AR)
          </button>
        </div>
      </div>

      {/* 2-Row Academic Portal Sub-Navigation Bar */}
      <div className="bg-[#EAF1F5] border border-[#D8E3EC] rounded-2xl p-2 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1">
          {row1Tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 inline-flex items-center gap-2 cursor-pointer ${
                  active
                    ? 'bg-white text-[#0F2537] shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-[#0F2537] hover:bg-white/60'
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold leading-none tabular-nums ${
                      tab.id === 'demo-reports' ? 'bg-[#D93829] text-white' : 'bg-[#0B6E8C] text-white'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {row2Tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 inline-flex items-center gap-2 cursor-pointer ${
                  active
                    ? 'bg-white text-[#0F2537] shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-[#0F2537] hover:bg-white/60'
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-[#D93829] text-white font-mono text-[10px] font-bold leading-none tabular-nums">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {toast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* TAB 1: STUDENTS & CODES (Matches Reference Screenshot + Extra Controls) */}
      {activeTab === 'students-codes' && (
        <div className="space-y-6">
          {/* Add Students Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
            <h2 className="font-display text-lg font-bold text-[#0F2537] mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#0B6E8C]" />
              <span>Add students</span>
            </h2>

            <form onSubmit={handleCreateStudents} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6">
                <label className="block text-xs font-semibold text-[#0F2537] mb-2">
                  Student names, one per line
                </label>
                <textarea
                  rows={5}
                  value={namesText}
                  onChange={(e) => setNamesText(e.target.value)}
                  placeholder={'Yousef Ahmed\nOmar Khalid\nFaisal Saeed'}
                  className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6E8C] resize-y"
                />
              </div>

              <div className="lg:col-span-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F2537] mb-1.5">
                      Grade
                    </label>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
                    >
                      <option value="Grade 3">Grade 3</option>
                      <option value="Grade 6">Grade 6</option>
                      <option value="Grade 9">Grade 9</option>
                      <option value="Grade 10">Grade 10</option>
                      <option value="Grade 11">Grade 11</option>
                      <option value="Grade 12">Grade 12</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F2537] mb-1.5">
                      Class
                    </label>
                    <input
                      type="text"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      placeholder="B"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F2537] mb-1.5">
                    Program
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setProgram('Boost')}
                      className={`px-3.5 py-2.5 rounded-xl border text-start text-xs transition-colors flex items-center gap-2.5 cursor-pointer ${
                        program === 'Boost'
                          ? 'bg-[#EEF5F9] border-[#0B6E8C] text-[#0F2537]'
                          : 'bg-[#F8FAFC] border-slate-200 text-slate-600'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          program === 'Boost' ? 'border-[#0B6E8C]' : 'border-slate-400'
                        }`}
                      >
                        {program === 'Boost' && (
                          <span className="w-2 h-2 rounded-full bg-[#0B6E8C]" />
                        )}
                      </span>
                      <span>
                        <strong className="font-semibold">Boost</strong>{' '}
                        <span className="text-slate-500">remedial</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProgram('Stretch')}
                      className={`px-3.5 py-2.5 rounded-xl border text-start text-xs transition-colors flex items-center gap-2.5 cursor-pointer ${
                        program === 'Stretch'
                          ? 'bg-[#EEF5F9] border-[#0B6E8C] text-[#0F2537]'
                          : 'bg-[#F8FAFC] border-slate-200 text-slate-600'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          program === 'Stretch' ? 'border-[#0B6E8C]' : 'border-slate-400'
                        }`}
                      >
                        {program === 'Stretch' && (
                          <span className="w-2 h-2 rounded-full bg-[#0B6E8C]" />
                        )}
                      </span>
                      <span>
                        <strong className="font-semibold">Stretch</strong>{' '}
                        <span className="text-slate-500">high achievers</span>
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingStudents || !namesText.trim()}
                  className="w-full py-3 px-4 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {creatingStudents ? 'Generating...' : 'Create invitation codes'}
                </button>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Each student gets a student code (<span className="font-mono">PATH-...</span>) and his parents get a parent code (<span className="font-mono">FAM-...</span>). Next, choose their skills on the Assign skills tab.
                </p>
              </div>
            </form>
          </div>

          {/* My Students Table Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h2 className="font-display text-lg font-bold text-[#0F2537] tabular-nums">
                  My students · {students.length}
                </h2>
                <input
                  type="text"
                  value={searchRoster}
                  onChange={(e) => setSearchRoster(e.target.value)}
                  placeholder="Rechercher élève ou code..."
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      students.map((s) => `${s.name}: ${s.studentCode}`).join('\n'),
                      `${students.length} codes élèves copiés dans le presse-papiers.`
                    )
                  }
                  className="px-3.5 py-2 bg-white border border-slate-300 hover:border-[#0B6E8C] rounded-xl text-xs font-semibold text-[#0F2537] transition-colors cursor-pointer"
                >
                  Copy {students.length} student invitations
                </button>
                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      students.map((s) => `Parent of ${s.name}: ${s.parentCode}`).join('\n'),
                      `Tous les codes parents FAM-... ont été copiés.`
                    )
                  }
                  className="px-3.5 py-2 bg-white border border-slate-300 hover:border-[#0B6E8C] rounded-xl text-xs font-semibold text-[#0F2537] transition-colors cursor-pointer"
                >
                  Copy all parent invitations
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-3 font-semibold">Student</th>
                    <th className="py-3 px-3 font-semibold">Grade · Class</th>
                    <th className="py-3 px-3 font-semibold">Program</th>
                    <th className="py-3 px-3 font-semibold">Skills</th>
                    <th className="py-3 px-3 font-semibold">Student Code</th>
                    <th className="py-3 px-3 font-semibold">Parent Code</th>
                    <th className="py-3 px-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-3 font-semibold text-[#0F2537] whitespace-nowrap">
                        {st.name}
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-600 font-mono tabular-nums whitespace-nowrap">
                        {st.grade.replace('Grade ', '')} · {st.className || '—'}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                            st.program === 'Stretch'
                              ? 'bg-violet-100 text-violet-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {st.program}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-700 font-mono tabular-nums whitespace-nowrap">
                        {st.skillsMastered}/{st.skillsTotal} mastered
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#0F2537]">
                            {st.studentCode}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              copyText(
                                `Al-Majd Academy — Code élève pour ${st.name}: ${st.studentCode}`,
                                `Invitation élève ${st.studentCode} copiée.`
                              )
                            }
                            className="px-2.5 py-1 border border-slate-200 hover:border-[#0B6E8C] rounded-lg text-[11px] font-semibold text-slate-700 cursor-pointer"
                          >
                            Send
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#0F2537]">
                            {st.parentCode}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              copyText(
                                `Al-Majd Academy — Code parent pour ${st.name}: ${st.parentCode}`,
                                `Invitation parent ${st.parentCode} copiée.`
                              )
                            }
                            className="px-2.5 py-1 border border-slate-200 hover:border-[#0B6E8C] rounded-lg text-[11px] font-semibold text-slate-700 cursor-pointer"
                          >
                            Send
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                            st.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {st.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#0B6E8C]" />
                <span>Total Roster Students</span>
              </div>
              <div className="font-mono text-2xl font-bold text-[#0F2537] tabular-nums">
                {students.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
                Boost: {boostCount} · Stretch: {stretchCount}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                <span>Average Mastery</span>
              </div>
              <div className="font-mono text-2xl font-bold text-emerald-700 tabular-nums">
                {avgMastery}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Across assigned skills</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-[#D93829]" />
                <span>Writing to Review</span>
              </div>
              <div className="font-mono text-2xl font-bold text-[#0F2537] tabular-nums">
                {pendingWritingCount}
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('writing-review')}
                className="text-[11px] font-semibold text-[#0B6E8C] hover:underline mt-1 cursor-pointer"
              >
                Open review queue →
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#D93829]" />
                <span>Demo Test Reports</span>
              </div>
              <div className="font-mono text-2xl font-bold text-[#0F2537] tabular-nums">
                {demoReports.length}
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('demo-reports')}
                className="text-[11px] font-semibold text-[#0B6E8C] hover:underline mt-1 cursor-pointer"
              >
                {pendingDemoReportsCount} pending skill attribution →
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-[#0B6E8C]" />
                <span>Private Meet Sessions</span>
              </div>
              <div className="font-mono text-2xl font-bold text-[#0F2537] tabular-nums">
                {bookings.length}
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('tutoring-bookings')}
                className="text-[11px] font-semibold text-[#0B6E8C] hover:underline mt-1 cursor-pointer"
              >
                View dates, themes &amp; Meet links →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-[#0F2537]">
                  Active Weekly Missions
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('weekly-mission')}
                  className="text-xs font-semibold text-[#0B6E8C] hover:underline cursor-pointer"
                >
                  + New mission
                </button>
              </div>
              <div className="space-y-3">
                {missions.map((m) => (
                  <div key={m.id} className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="font-semibold text-[#0B6E8C]">{m.targetExam}</span>
                      <span className="font-mono tabular-nums">Due {m.dueDate}</span>
                    </div>
                    <div className="text-sm font-semibold text-[#0F2537]">{m.title}</div>
                    <div className="text-xs text-slate-600 mt-1">
                      {m.grade} · Class {m.className} · {m.program}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-[#0F2537]">
                  Recent Writing Submissions
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('writing-review')}
                  className="text-xs font-semibold text-[#0B6E8C] hover:underline cursor-pointer"
                >
                  Grade all →
                </button>
              </div>
              <div className="space-y-3">
                {writings.slice(0, 4).map((w) => (
                  <div
                    key={w.id}
                    className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC] flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-xs font-semibold text-[#0B6E8C]">
                        {w.studentName} · {w.track}
                      </div>
                      <div className="text-xs text-slate-600 line-clamp-1 mt-0.5">{w.prompt}</div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold shrink-0 ${
                        w.status === 'reviewed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {w.status === 'reviewed' ? `${w.score}/100` : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WEEKLY MISSION */}
      {activeTab === 'weekly-mission' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateMission}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4"
          >
            <h2 className="font-display text-lg font-bold text-[#0F2537] flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#0B6E8C]" />
              <span>Create Weekly Mission</span>
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mission Title</label>
              <input
                type="text"
                required
                value={missionTitle}
                onChange={(e) => setMissionTitle(e.target.value)}
                placeholder="e.g. Week 12 · STEP Grammar + SAT Linear Systems"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Exam</label>
                <select
                  value={missionExam}
                  onChange={(e) => setMissionExam(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                >
                  <option value="STEP & GAT">STEP &amp; GAT</option>
                  <option value="NAFES (ETEC)">NAFES (ETEC)</option>
                  <option value="IELTS Academic">IELTS Academic</option>
                  <option value="Digital SAT">Digital SAT</option>
                  <option value="IB Diploma">IB Diploma</option>
                  <option value="Bac Français">Bac Français</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={missionDueDate}
                  onChange={(e) => setMissionDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Grade</label>
                <select
                  value={missionGrade}
                  onChange={(e) => setMissionGrade(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                >
                  <option value="Grade 6">Grade 6</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Class</label>
                <input
                  type="text"
                  value={missionClass}
                  onChange={(e) => setMissionClass(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Program</label>
                <select
                  value={missionProgram}
                  onChange={(e) => setMissionProgram(e.target.value as 'All' | 'Boost' | 'Stretch')}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                >
                  <option value="All">All</option>
                  <option value="Boost">Boost</option>
                  <option value="Stretch">Stretch</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingMission}
              className="w-full py-2.5 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              {creatingMission ? 'Publishing...' : 'Publish Weekly Mission'}
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="font-display text-lg font-bold text-[#0F2537]">
              Assigned Missions ({missions.length})
            </h2>
            <div className="space-y-3">
              {missions.map((m) => (
                <div key={m.id} className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#0B6E8C]">{m.targetExam}</span>
                    <span className="font-mono text-slate-500 tabular-nums">Due {m.dueDate}</span>
                  </div>
                  <div className="text-base font-semibold text-[#0F2537]">{m.title}</div>
                  <div className="text-xs text-slate-600">
                    {m.grade} · Class {m.className} · Program: <strong>{m.program}</strong>
                  </div>
                  {m.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {m.skills.map((sk) => (
                        <span
                          key={sk}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] text-slate-700"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ASSIGN SKILLS */}
      {activeTab === 'assign-skills' && (
        <form
          onSubmit={handleAssignSkills}
          className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-[#0F2537]">
                Assign Curriculum Skills
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Select target cohort and skills; updates apply immediately to student dashboards and skill counts.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={assignGrade}
                onChange={(e) => setAssignGrade(e.target.value)}
                className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white"
              >
                <option value="All">All Grades</option>
                <option value="Grade 6">Grade 6</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12</option>
              </select>
              <select
                value={assignProgram}
                onChange={(e) => setAssignProgram(e.target.value as 'All' | 'Boost' | 'Stretch')}
                className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white"
              >
                <option value="All">Boost &amp; Stretch</option>
                <option value="Boost">Boost remedial only</option>
                <option value="Stretch">Stretch high achievers only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CURATED_SKILLS_BY_TEACHER[teacherId].map((skill) => {
              const checked = selectedSkills.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() =>
                    setSelectedSkills((prev) =>
                      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
                    )
                  }
                  className={`p-4 rounded-xl border text-start text-xs font-semibold flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    checked
                      ? 'bg-[#EEF5F9] border-[#0B6E8C] text-[#0F2537]'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <span>{skill}</span>
                  {checked && <Check className="w-4 h-4 text-[#0B6E8C] shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <span className="text-xs text-slate-600 tabular-nums">
              {selectedSkills.length} skill(s) selected
            </span>
            <button
              type="submit"
              disabled={assigningSkills || selectedSkills.length === 0}
              className="px-6 py-2.5 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50"
            >
              {assigningSkills ? 'Updating...' : 'Assign Selected Skills to Roster'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 5: PROGRESS */}
      {activeTab === 'progress' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
          <h2 className="font-display text-xl font-bold text-[#0F2537]">
            Class Skill Mastery &amp; Progress
          </h2>
          <div className="space-y-4">
            {students.map((st) => {
              const pct = Math.round((st.skillsMastered / Math.max(1, st.skillsTotal)) * 100);
              return (
                <div
                  key={st.id}
                  className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC] flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-sm text-[#0F2537]">{st.name}</span>
                      <span className="text-xs font-mono text-slate-500">
                        {st.grade} · Class {st.className}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          st.program === 'Stretch'
                            ? 'bg-violet-100 text-violet-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {st.program}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      Assigned: {st.assignedSkills.join(' · ')}
                    </div>
                  </div>

                  <div className="w-full md:w-56 shrink-0">
                    <div className="flex items-center justify-between text-xs font-mono mb-1 tabular-nums">
                      <span>
                        {st.skillsMastered}/{st.skillsTotal} mastered
                      </span>
                      <span className="font-bold text-[#0B6E8C]">{pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0B6E8C] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: WRITING TO REVIEW */}
      {activeTab === 'writing-review' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h2 className="font-display text-lg font-bold text-[#0F2537] flex items-center justify-between">
              <span>Essays Queue ({writings.length})</span>
              <span className="text-xs font-mono text-[#D93829]">{pendingWritingCount} pending</span>
            </h2>

            <div className="space-y-2.5">
              {writings.map((w) => {
                const active = selectedWriting?.id === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      setSelectedWritingId(w.id);
                      setReviewScore(w.score ?? 85);
                      setReviewFeedback(w.teacherFeedback || '');
                    }}
                    className={`w-full text-start p-4 rounded-xl border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#EEF5F9] border-[#0B6E8C]'
                        : 'bg-[#F8FAFC] border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-[#0F2537]">{w.studentName}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          w.status === 'reviewed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {w.status === 'reviewed' ? `Reviewed · ${w.score}` : 'Pending'}
                      </span>
                    </div>
                    <div className="text-xs text-[#0B6E8C] font-medium">
                      {w.track} · {w.grade} · {w.wordCount} words
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            {!selectedWriting ? (
              <p className="text-sm text-slate-600">Select an essay to review.</p>
            ) : (
              <form onSubmit={handlePublishReview} className="space-y-5">
                <div className="border-b border-slate-200 pb-4">
                  <div className="text-xs font-semibold text-[#0B6E8C] mb-1">
                    {selectedWriting.studentName} · {selectedWriting.grade} · {selectedWriting.track}
                  </div>
                  <p className="text-sm font-semibold text-[#0F2537]">{selectedWriting.prompt}</p>
                </div>

                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {selectedWriting.content}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-[#0F2537]">Score (/100):</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={reviewScore}
                      onChange={(e) => setReviewScore(Number(e.target.value))}
                      className="w-20 px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-lg"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={aiDrafting}
                    onClick={() => handleAiDraftFeedback(selectedWriting.id)}
                    className="px-3.5 py-2 border border-[#0B6E8C] text-[#0B6E8C] hover:bg-[#EEF5F9] text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{aiDrafting ? 'Gemini analyzing...' : 'Aide Gemini IA (Rubric Draft)'}</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Teacher Feedback &amp; Corrections
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    placeholder="Write constructive feedback on grammar, argument structure, and target exam score..."
                    className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingReview}
                  className="px-6 py-2.5 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>{savingReview ? 'Saving...' : 'Publish Feedback & Grade'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB: DEMO TEST REPORTS & TEACHER SKILL ATTRIBUTION */}
      {activeTab === 'demo-reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h2 className="font-display text-lg font-bold text-[#0F2537] flex items-center justify-between">
              <span>Student Demo Reports ({demoReports.length})</span>
              <span className="text-xs font-mono text-[#D93829]">{pendingDemoReportsCount} new</span>
            </h2>

            {demoReports.length === 0 ? (
              <p className="text-xs text-slate-600 py-4">
                No placement demo tests received yet for this teacher.
              </p>
            ) : (
              <div className="space-y-2.5">
                {demoReports.map((rep) => {
                  const active = selectedReport?.id === rep.id;
                  return (
                    <button
                      key={rep.id}
                      type="button"
                      onClick={() => loadReportIntoEditor(rep)}
                      className={`w-full text-start p-4 rounded-xl border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#EEF5F9] border-[#0B6E8C]'
                          : 'bg-[#F8FAFC] border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-[#0F2537]">{rep.studentName}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            rep.status === 'reviewed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {rep.status === 'reviewed' ? 'Skills Attributed' : `New · ${rep.overallScore}%`}
                        </span>
                      </div>
                      <div className="text-xs text-[#0B6E8C] font-medium">
                        {rep.curriculum} · {rep.gradeLevel.toUpperCase()} · {rep.language}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                        Weaknesses: {rep.weaknesses.join(', ') || 'None'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            {!selectedReport ? (
              <p className="text-sm text-slate-600">Select a student demo report to assign skills.</p>
            ) : (
              <form onSubmit={handleAttributeReport} className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <div className="text-xs font-semibold text-[#0B6E8C] mb-1">
                      {selectedReport.curriculum} · {selectedReport.gradeLevel.toUpperCase()} · {selectedReport.studentEmail}
                    </div>
                    <h3 className="font-display text-xl font-bold text-[#0F2537]">
                      {selectedReport.studentName} — {selectedReport.levelLabel}
                    </h3>
                  </div>
                  <div className="font-mono text-2xl font-bold text-[#0B6E8C] tabular-nums">
                    {selectedReport.overallScore}%
                  </div>
                </div>

                <p className="text-xs text-slate-600 bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                  {selectedReport.summaryText}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-emerald-900 mb-1.5">
                      Points forts (Strengths · one per line)
                    </label>
                    <textarea
                      rows={3}
                      value={reportStrengthsText}
                      onChange={(e) => setReportStrengthsText(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-900 mb-1.5">
                      Points faibles (Weaknesses · one per line)
                    </label>
                    <textarea
                      rows={3}
                      value={reportWeaknessesText}
                      onChange={(e) => setReportWeaknessesText(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F2537] mb-2">
                    Attribute Needed Skills to {selectedReport.studentName}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    {CURATED_SKILLS_BY_TEACHER[teacherId].map((sk) => {
                      const checked = reportSkills.includes(sk);
                      return (
                        <button
                          key={sk}
                          type="button"
                          onClick={() =>
                            setReportSkills((prev) =>
                              prev.includes(sk) ? prev.filter((x) => x !== sk) : [...prev, sk]
                            )
                          }
                          className={`px-3 py-2 rounded-xl border text-start text-xs font-semibold flex items-center justify-between gap-2 cursor-pointer ${
                            checked
                              ? 'bg-[#EEF5F9] border-[#0B6E8C] text-[#0F2537]'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <span>{sk}</span>
                          {checked && <Check className="w-3.5 h-3.5 text-[#0B6E8C] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customReportSkill}
                      onChange={(e) => setCustomReportSkill(e.target.value)}
                      placeholder="Add custom required skill..."
                      className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = customReportSkill.trim();
                        if (val && !reportSkills.includes(val)) {
                          setReportSkills((prev) => [...prev, val]);
                        }
                        setCustomReportSkill('');
                      }}
                      className="px-3.5 py-2 border border-slate-300 hover:border-[#0B6E8C] rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      + Add Skill
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Diagnostic Guidance Sent to Student Account
                  </label>
                  <textarea
                    rows={3}
                    value={reportFeedback}
                    onChange={(e) => setReportFeedback(e.target.value)}
                    placeholder="Explain what the student mastered, what gaps to prioritize, and recommended coaching focus..."
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B6E8C]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingReport || reportSkills.length === 0}
                  className="px-5 py-2.5 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>
                    {savingReport
                      ? 'Saving...'
                      : `Attribute ${reportSkills.length} Skill(s) & Feedback to Student`}
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB: PRIVATE MEET BOOKING REPORTS */}
      {activeTab === 'tutoring-bookings' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-[#0F2537]">
                Paid Private Tutoring Reports &amp; Google Meet Links ({bookings.length})
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Every paid booking transmits the student’s chosen date, time, training duration, attached weaknesses, requested lessons, and instant Google Meet link.
              </p>
            </div>
          </div>

          {bookings.length === 0 ? (
            <p className="text-sm text-slate-600 py-6">
              No private tutoring bookings scheduled yet for this trainer.
            </p>
          ) : (
            <div className="space-y-4">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-[#F8FAFC] space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-[#0B6E8C]">
                        {b.curriculum} · {b.subject} · {b.language}
                      </div>
                      <h3 className="font-display text-lg font-bold text-[#0F2537]">
                        {b.studentName}{' '}
                        <span className="text-xs font-normal text-slate-500">({b.contactEmail})</span>
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-semibold">
                        Paid · {b.priceSar} SAR ({b.paymentReference})
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[#0F2537] font-semibold">
                        {b.dateSlot} · {b.timeSlot} · {b.durationLabel}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200/80 text-xs">
                    <div>
                      <div className="font-semibold text-amber-900 mb-1">
                        Points faibles signalés par l’élève :
                      </div>
                      {b.attachedWeaknesses && b.attachedWeaknesses.length > 0 ? (
                        <ul className="space-y-1 text-slate-700">
                          {b.attachedWeaknesses.map((w, i) => (
                            <li key={i}>• {w}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-slate-500">Aucun point faible spécifique joint.</span>
                      )}
                    </div>

                    <div>
                      <div className="font-semibold text-[#0F2537] mb-1">
                        Thèmes &amp; Leçons demandés :
                      </div>
                      {b.themesToCover && b.themesToCover.length > 0 ? (
                        <ul className="space-y-1 text-slate-700">
                          {b.themesToCover.map((th, i) => (
                            <li key={i}>• {th}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-slate-500">{b.notes || 'Programme général du cursus.'}</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                    {b.meetLink ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <a
                          href={b.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Rejoindre Google Meet</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className="font-mono text-xs text-slate-600 select-all">{b.meetLink}</span>
                        {b.calendarEventLink && (
                          <a
                            href={b.calendarEventLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Agenda</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-amber-800">
                        Paiement confirmé — en attente de génération Google Meet depuis le compte élève.
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: WEEKLY REPORTS */}
      {activeTab === 'weekly-reports' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-[#0F2537]">
                Weekly Parent Progress Reports
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Ready-to-share parent digest combining skill mastery, program tier, and invitation codes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Weekly Digest</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {students.map((st) => (
              <div key={st.id} className="p-5 rounded-xl border border-slate-200 bg-[#F8FAFC] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-[#0F2537]">{st.name}</span>
                  <span className="font-mono text-xs font-semibold text-[#0B6E8C]">
                    Parent Code: {st.parentCode}
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  {st.grade} · Class {st.className} · Program: <strong>{st.program}</strong> · Mastery:{' '}
                  <strong className="tabular-nums">
                    {st.skillsMastered}/{st.skillsTotal}
                  </strong>
                </div>
                <div className="text-xs text-slate-700 pt-1">
                  Weekly Focus: {st.weeklyMission}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      `Weekly Academic Report — ${st.name} (${st.grade}): ${st.skillsMastered}/${st.skillsTotal} skills mastered (${st.program}). Parent portal code: ${st.parentCode}`,
                      `Rapport hebdomadaire de ${st.name} copié.`
                    )
                  }
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B6E8C] hover:underline cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Parent WhatsApp/Email Summary</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: ADMIN PAST PAPERS IMPORT (PDF / WORD -> GEMINI VERBATIM -> HTML) */}
      {activeTab === 'past-papers-admin' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleImportPastPaper}
              className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4"
            >
              <div className="border-b border-slate-200 pb-4">
                <h2 className="font-display text-xl font-bold text-[#0F2537] flex items-center gap-2">
                  <FileUp className="w-5 h-5 text-[#0B6E8C]" />
                  <span>Importer un Past Paper (PDF / Word → HTML)</span>
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  En tant qu’administrateur, importez une fiche PDF ou Word (.docx). Gemini transcrit exactement le même examen (mêmes questions, chiffres et consignes) au format HTML par catégorie, avec matière et date/année.
                </p>
              </div>

              {importError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900">
                  {importError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#0F2537] mb-1.5">
                  Fichier d’examen officiel (.pdf ou .docx)
                </label>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setPaperFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2.5 text-xs border border-dashed border-[#0B6E8C] rounded-xl bg-[#F8FAFC] cursor-pointer"
                />
                {paperFile && (
                  <p className="text-[11px] text-[#0B6E8C] font-semibold mt-1">
                    Fichier prêt : {paperFile.name} ({Math.round(paperFile.size / 1024)} Ko)
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catégorie d’examen
                  </label>
                  <select
                    value={paperCategory}
                    onChange={(e) => setPaperCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                  >
                    {PAST_PAPER_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Matière exacte
                  </label>
                  <input
                    type="text"
                    required
                    value={paperSubject}
                    onChange={(e) => setPaperSubject(e.target.value)}
                    placeholder="Ex : Mathématiques, Physics HL, NAFES Reading..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date de l’examen
                  </label>
                  <input
                    type="text"
                    required
                    value={paperExamDate}
                    onChange={(e) => setPaperExamDate(e.target.value)}
                    placeholder="14 Mai 2025"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Année
                  </label>
                  <input
                    type="number"
                    required
                    min={1990}
                    max={2035}
                    value={paperYear}
                    onChange={(e) => setPaperYear(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Langue
                  </label>
                  <select
                    value={paperLanguage}
                    onChange={(e) =>
                      setPaperLanguage(e.target.value as 'English' | 'Français' | 'العربية')
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="English">English</option>
                    <option value="Français">Français</option>
                    <option value="العربية">العربية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prix (SAR)
                  </label>
                  <input
                    type="number"
                    required
                    min={10}
                    max={500}
                    value={paperPriceSar}
                    onChange={(e) => setPaperPriceSar(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Session
                  </label>
                  <input
                    type="text"
                    value={paperSession}
                    onChange={(e) => setPaperSession(e.target.value)}
                    placeholder="Session Mai / Zone Europe & KSA"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Durée officielle
                  </label>
                  <input
                    type="text"
                    value={paperDuration}
                    onChange={(e) => setPaperDuration(e.target.value)}
                    placeholder="120 min"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Titre personnalisé (optionnel — sinon extrait du document)
                </label>
                <input
                  type="text"
                  value={paperTitleOverride}
                  onChange={(e) => setPaperTitleOverride(e.target.value)}
                  placeholder="Laisser vide pour utiliser le titre officiel du fichier"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={importingPaper || !paperFile}
                className="w-full py-3 px-4 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-xs font-semibold rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {importingPaper
                    ? 'Extraction fidèle avec Gemini & conversion HTML...'
                    : 'Traiter avec Gemini & Publier en HTML'}
                </span>
              </button>
            </form>

            {/* Right: Live Verbatim HTML Exam Preview */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <h3 className="font-display text-lg font-bold text-[#0F2537] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0B6E8C]" />
                  <span>Aperçu HTML fidèle à l’original</span>
                </h3>
                {importedResult && (
                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadGeneratedHtml(
                        importedResult.previewHtml,
                        importedResult.paper.code
                      )
                    }
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger .html</span>
                  </button>
                )}
              </div>

              {!importedResult ? (
                <div className="p-6 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-2">
                  <p>
                    Une fois votre PDF ou Word traité par Gemini, l’examen exact s’affiche ici au format HTML prêt à l’achat par les élèves dans la catégorie choisie.
                  </p>
                  <p className="text-slate-500">
                    Aucune question n’est inventée ni modifiée : le contenu est transcrit mot pour mot avec sa matière, sa date/année et ses barèmes.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[540px] overflow-y-auto pe-1">
                  <div className="p-4 rounded-xl bg-[#EEF5F9] border border-[#BFD8E6] space-y-1">
                    <div className="text-[11px] font-mono font-semibold text-[#0B6E8C]">
                      {importedResult.paper.code} · {importedResult.paper.curriculum} ·{' '}
                      {importedResult.paper.subject} ·{' '}
                      {importedResult.paper.examDate || importedResult.paper.year}
                    </div>
                    <div className="font-display text-base font-bold text-[#0F2537]">
                      {importedResult.paper.title}
                    </div>
                    <div className="text-xs text-slate-600">
                      {importedResult.paper.fullQuestions.length} question(s) exactes ·{' '}
                      {importedResult.paper.priceSar} SAR
                    </div>
                  </div>

                  {importedResult.paper.fullQuestions.map((q) => (
                    <div
                      key={q.number}
                      className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC] space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                        <span>Question {q.number}</span>
                        <span>{q.marks} pts</span>
                      </div>
                      <p className="text-xs font-medium text-slate-900 whitespace-pre-wrap leading-relaxed">
                        {q.prompt}
                      </p>
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-950 whitespace-pre-wrap">
                        <strong>Correction :</strong> {q.markScheme}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Published Past Papers Catalog Management */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-[#0F2537]">
                  Catalogue Past Papers HTML en vente ({papers.length})
                </h3>
                <p className="text-xs text-slate-600">
                  Tous les sujets visibles et achetables par les élèves classés par catégorie.
                </p>
              </div>
              <select
                value={adminPaperFilter}
                onChange={(e) => setAdminPaperFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white"
              >
                <option value="all">Toutes les catégories</option>
                {PAST_PAPER_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {papers
                .filter((p) => adminPaperFilter === 'all' || p.curriculum === adminPaperFilter)
                .map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC] flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-[#0B6E8C] mb-1">
                        <span>{p.code}</span>
                        <span className="font-bold">{p.priceSar} SAR</span>
                      </div>
                      <div className="text-sm font-semibold text-[#0F2537] mb-1">{p.title}</div>
                      <div className="text-xs text-slate-600">
                        {p.curriculum} · <strong>{p.subject}</strong> · {p.examDate || p.year}
                      </div>
                      {p.uploadedByTeacherName && (
                        <div className="text-[11px] text-slate-500 mt-1">
                          Ajouté par : {p.uploadedByTeacherName}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                      <span className="text-slate-500">{p.questionCount} question(s) · HTML</span>
                      <button
                        type="button"
                        onClick={() => handleDeletePaper(p.id)}
                        className="px-2.5 py-1 text-red-700 hover:bg-red-50 border border-red-200 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: TEACHER PROFILE, PHOTO, EXPERIENCES & SKILLS EDITOR */}
      {activeTab === 'profile-admin' && (
        <form
          onSubmit={handleSaveTrainerProfile}
          className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-[#0F2537]">
                Profil Formateur, Photo, Expériences &amp; Compétences
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Toutes ces informations sont immédiatement visibles dans l’espace élève pour présenter votre parcours et attirer les inscriptions.
              </p>
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 bg-[#0B6E8C] hover:bg-[#08566E] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingProfile ? 'Enregistrement...' : 'Enregistrer & Publier côté élève'}</span>
            </button>
          </div>

          {/* Photo + Identity */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-3">
              <div className="w-32 h-32 mx-auto rounded-2xl overflow-hidden border border-slate-300 bg-white">
                <img
                  src={profPhotoUrl || TRAINER_FALLBACK_PHOTOS[teacherId]}
                  alt={profName}
                  className="w-full h-full object-cover"
                />
              </div>
              <label className="block w-full py-2 px-3 bg-white border border-slate-300 hover:border-[#0B6E8C] rounded-xl text-center text-xs font-semibold text-[#0F2537] cursor-pointer">
                <span className="inline-flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#0B6E8C]" />
                  <span>Changer ma photo (PNG/JPG)</span>
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Ou URL directe de photo (https://...)
                </label>
                <input
                  type="text"
                  value={profPhotoUrl.startsWith('data:') ? '' : profPhotoUrl}
                  onChange={(e) => setProfPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="lg:col-span-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nom complet affiché
                  </label>
                  <input
                    type="text"
                    required
                    value={profName}
                    onChange={(e) => setProfName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Titre académique
                  </label>
                  <input
                    type="text"
                    required
                    value={profRoleTitle}
                    onChange={(e) => setProfRoleTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Diplômes &amp; Accréditations
                </label>
                <input
                  type="text"
                  value={profCredentials}
                  onChange={(e) => setProfCredentials(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tarif 60 min (SAR)
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={2000}
                    value={profHourlyRate}
                    onChange={(e) => setProfHourlyRate(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tarif Pack 5h (SAR)
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={10000}
                    value={profPackRate}
                    onChange={(e) => setProfPackRate(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Multilingual Bios */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2 border-t border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Présentation (Français)
              </label>
              <textarea
                rows={3}
                value={profBioFr}
                onChange={(e) => setProfBioFr(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Présentation (English)
              </label>
              <textarea
                rows={3}
                value={profBioEn}
                onChange={(e) => setProfBioEn(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Présentation (العربية)
              </label>
              <textarea
                rows={3}
                dir="rtl"
                value={profBioAr}
                onChange={(e) => setProfBioAr(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          {/* Experiences & Skills */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-slate-200">
            <div className="space-y-3">
              <div className="text-xs font-semibold text-[#0F2537] flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-[#0B6E8C]" />
                <span>Expériences &amp; Réalisations</span>
              </div>
              <div className="space-y-2">
                {profExperiences.map((exp, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs"
                  >
                    <span>{exp}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setProfExperiences((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-red-600 hover:text-red-800 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newExperience}
                  onChange={(e) => setNewExperience(e.target.value)}
                  placeholder="Ex : 10 ans d'enseignement IB Math AA HL à Riyad..."
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => {
                    const v = newExperience.trim();
                    if (v) setProfExperiences((prev) => [...prev, v]);
                    setNewExperience('');
                  }}
                  className="px-3 py-2 border border-slate-300 hover:border-[#0B6E8C] rounded-xl text-xs font-semibold cursor-pointer"
                >
                  + Ajouter
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold text-[#0F2537] flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#0B6E8C]" />
                <span>Compétences clés pour attirer les élèves</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {profSkills.map((sk, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EEF5F9] border border-[#BFD8E6] text-xs font-semibold text-[#0F2537]"
                  >
                    <span>{sk}</span>
                    <button
                      type="button"
                      onClick={() => setProfSkills((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-red-700 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newProfileSkill}
                  onChange={(e) => setNewProfileSkill(e.target.value)}
                  placeholder="Ex : Préparation Score 1500+ SAT, Coaching Intensif NAFES..."
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => {
                    const v = newProfileSkill.trim();
                    if (v && !profSkills.includes(v)) setProfSkills((prev) => [...prev, v]);
                    setNewProfileSkill('');
                  }}
                  className="px-3 py-2 border border-slate-300 hover:border-[#0B6E8C] rounded-xl text-xs font-semibold cursor-pointer"
                >
                  + Ajouter
                </button>
              </div>
            </div>
          </div>

          {/* Curricula & Suggested Slots */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-slate-200">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#0F2537]">Programmes couverts</div>
              <div className="flex flex-wrap gap-1.5">
                {profCurricula.map((c, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-medium text-slate-800"
                  >
                    <span>{c}</span>
                    <button
                      type="button"
                      onClick={() => setProfCurricula((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-red-700 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCurriculum}
                  onChange={(e) => setNewCurriculum(e.target.value)}
                  placeholder="Ajouter un programme..."
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => {
                    const v = newCurriculum.trim();
                    if (v && !profCurricula.includes(v)) setProfCurricula((prev) => [...prev, v]);
                    setNewCurriculum('');
                  }}
                  className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#0F2537]">Créneaux suggérés (AST)</div>
              <div className="flex flex-wrap gap-1.5">
                {profSlots.map((sl, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-medium text-slate-800"
                  >
                    <span>{sl}</span>
                    <button
                      type="button"
                      onClick={() => setProfSlots((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-red-700 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value)}
                  placeholder="Ex : Mardi · 18:00 AST"
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => {
                    const v = newSlot.trim();
                    if (v && !profSlots.includes(v)) setProfSlots((prev) => [...prev, v]);
                    setNewSlot('');
                  }}
                  className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* EMBEDDED PREP & STANDARDS TABS (Standards, STEP, GAT, NAFES, IELTS, Phonics, Skill Builder) */}
      {isPrepSubTab && (
        <ExamPrepHubs
          lang={lang}
          activeTab={activeTab as PrepHubTab}
          onSelectTab={(tab) => setActiveTab(tab as TeacherSubTab)}
          hideTabBar
          onLaunchAiExam={onLaunchAiExam}
        />
      )}

      {loading && (
        <div className="text-xs text-slate-500 text-center py-2">Synchronizing portal data...</div>
      )}
    </section>
  );
}
