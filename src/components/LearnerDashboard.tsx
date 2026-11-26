import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  MessageSquare,
  Printer,
  ShieldCheck,
  Upload,
  X
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  Announcement,
  Certificate,
  Cohort,
  Course,
  CourseModule,
  DynamicQuiz,
  Enrollment,
  EventRegistration,
  Language,
  LearnerNote,
  NotificationRecord,
  PageRoute,
  PlatformSettings,
  ProjectSubmission,
  QuizAttempt,
  QuizQuestionItem,
  RubricConfig,
  StructuredLessonRecord,
  SupportTicket,
  TicketMessage,
  UserProfile
} from '../types';
import {
  BLUEPRINT_GRADING_BREAKDOWN,
  COURSES,
  FINAL_PROJECT_RUBRIC_7,
  PRACTICAL_PROJECTS
} from '../data/curriculum';
import { WEEKLY_ASSESSMENTS } from '../data/lessons28';
import {
  evaluateCertificateEligibility,
  formatReleaseDateLabel,
  gradeDynamicQuiz,
  parseQuizQuestions,
  resolveLessonReleaseLock,
  type QuizGradeResult
} from '../lib/domain';
import {
  isProtectedUploadUrl,
  openProtectedFile,
  UPLOAD_RULES,
  uploadPlatformFile
} from '../lib/uploads';
import { CertificateQrCode } from './BrandVisuals';

interface LearnerDashboardProps {
  lang: Language;
  user: User;
  profile: UserProfile | null;
  courses?: Course[];
  modules?: CourseModule[];
  structuredLessons?: StructuredLessonRecord[];
  cohorts?: Cohort[];
  quizzes?: DynamicQuiz[];
  rubrics?: RubricConfig[];
  learnerNotes?: LearnerNote[];
  ticketMessages?: TicketMessage[];
  platformSettings?: PlatformSettings | null;
  enrollments: Enrollment[];
  quizAttempts: QuizAttempt[];
  submissions: ProjectSubmission[];
  certificates: Certificate[];
  eventRegistrations: EventRegistration[];
  notifications: NotificationRecord[];
  announcements: Announcement[];
  supportTickets: SupportTicket[];
  onChangeLang: (lang: Language) => void;
  onOpenLesson: (courseId: string, day: number) => void;
  onNavigate: (route: PageRoute) => void;
  onRefreshData: () => void;
}

function getTimeMillis(ts: unknown): number {
  if (!ts) return 0;
  if (typeof ts === 'object' && ts !== null && 'toMillis' in ts) {
    const fn = (ts as { toMillis?: () => number }).toMillis;
    if (typeof fn === 'function') return fn();
  }
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function LearnerDashboard({
  lang,
  user,
  profile,
  courses = COURSES,
  modules = [],
  structuredLessons = [],
  cohorts = [],
  quizzes = [],
  rubrics = [],
  learnerNotes = [],
  ticketMessages = [],
  platformSettings,
  enrollments,
  quizAttempts,
  submissions,
  certificates,
  eventRegistrations,
  notifications,
  announcements,
  supportTickets,
  onChangeLang,
  onOpenLesson,
  onNavigate,
  onRefreshData
}: LearnerDashboardProps) {
  const [tab, setTab] = useState<
    'courses' | 'quizzes' | 'projects' | 'certificates' | 'notifications' | 'support' | 'settings'
  >('courses');

  const catalog = courses.length > 0 ? courses : COURSES;

  // Dynamic quiz runner state
  const [activeQuiz, setActiveQuiz] = useState<DynamicQuiz | null>(null);
  const [runQuestions, setRunQuestions] = useState<QuizQuestionItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [quizSaving, setQuizSaving] = useState(false);
  const [lastQuizReview, setLastQuizReview] = useState<{
    quiz: DynamicQuiz;
    questions: QuizQuestionItem[];
    answers: Record<string, string | number>;
    result: QuizGradeResult;
  } | null>(null);

  // Project submission & revision state
  const activeEnrollments = enrollments.filter((e) => e.status === 'active');
  const pendingEnrollments = enrollments.filter((e) => e.status === 'pending');

  const [projCourseId, setProjCourseId] = useState<string>(
    activeEnrollments[0]?.courseId || catalog[0]?.id || 'challenge-28'
  );
  const [projKey, setProjKey] = useState<ProjectSubmission['projectKey']>('study_assistant');
  const [projTitle, setProjTitle] = useState('');
  const [projProblem, setProjProblem] = useState('');
  const [projTools, setProjTools] = useState('ChatGPT, Google Gemini');
  const [projUrl, setProjUrl] = useState('');
  const [projSummary, setProjSummary] = useState('');
  const [projSaving, setProjSaving] = useState(false);
  const [projUploading, setProjUploading] = useState(false);
  const [projMsg, setProjMsg] = useState<string | null>(null);

  // Inline project edit/resubmit state
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editProblem, setEditProblem] = useState('');
  const [editTools, setEditTools] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editUploading, setEditUploading] = useState(false);

  // Printable certificate modal state
  const [printCert, setPrintCert] = useState<Certificate | null>(null);

  // Support ticket form & reply state
  const [ticketCategory, setTicketCategory] = useState<SupportTicket['category']>('access');
  const [ticketPriority, setTicketPriority] = useState<SupportTicket['priority']>('normal');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketSaving, setTicketSaving] = useState(false);
  const [ticketMsg, setTicketMsg] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyBusyId, setReplyBusyId] = useState<string | null>(null);

  // Account settings state
  const [displayName, setDisplayName] = useState(profile?.displayName || user.displayName || '');
  const [marketingOptIn, setMarketingOptIn] = useState<boolean>(Boolean(profile?.marketingOptIn));
  const [privacyAccepted, setPrivacyAccepted] = useState<boolean>(
    Boolean(profile?.privacyConsentAcceptedAt)
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.displayName || user.displayName || '');
    setMarketingOptIn(Boolean(profile?.marketingOptIn));
    setPrivacyAccepted(Boolean(profile?.privacyConsentAcceptedAt));
  }, [profile, user.displayName]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const publishedAnnouncements = announcements.filter(
    (a) => a.isPublished && (a.audience === 'all' || a.audience === 'learners')
  );

  // Unified quizzes list: combine published Firestore quizzes + any uncovered starter weekly assessments
  const availableQuizzes: DynamicQuiz[] = useMemo(() => {
    const published = quizzes.filter((q) => q.isPublished);
    const coveredChallengeWeeks = new Set(
      published.filter((q) => q.courseId === 'challenge-28').map((q) => q.weekNumber)
    );
    const starterFallbacks: DynamicQuiz[] = WEEKLY_ASSESSMENTS.filter(
      (wa) => !coveredChallengeWeeks.has(wa.weekNumber)
    ).map((wa) => {
      const mapped: QuizQuestionItem[] = wa.questions.map((q, idx) => ({
        id: `starter_w${wa.weekNumber}_q${idx + 1}`,
        type: 'multiple_choice',
        questionEn: q.question.en,
        questionRw: q.question.rw,
        optionsEn: q.options.en,
        optionsRw: q.options.rw,
        correctIndex: q.correctIndex,
        marks: 1,
        explanationEn: q.explanation.en,
        explanationRw: q.explanation.rw
      }));
      return {
        id: `starter_challenge28_w${wa.weekNumber}`,
        courseId: 'challenge-28',
        weekNumber: wa.weekNumber,
        titleEn: wa.title.en,
        titleRw: wa.title.rw,
        descriptionEn: wa.weightLabel,
        descriptionRw: wa.weightLabel,
        passThreshold: platformSettings?.certificateMinQuizAvg ?? 70,
        timeLimitMinutes: 0,
        maxAttempts: 0,
        randomizeQuestions: false,
        isPublished: true,
        questionsJson: JSON.stringify(mapped)
      };
    });

    return [...published, ...starterFallbacks].sort((a, b) => a.weekNumber - b.weekNumber);
  }, [quizzes, platformSettings?.certificateMinQuizAvg]);

  // Persist active quiz answers whenever updated
  useEffect(() => {
    if (!activeQuiz || typeof window === 'undefined') return;
    const storageKey = `aer_quiz_${user.uid}_${activeQuiz.id}`;
    try {
      const existingRaw = window.localStorage.getItem(storageKey);
      const parsed = existingRaw ? (JSON.parse(existingRaw) as { startedAt?: number; questionIds?: string[] }) : {};
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          quizId: activeQuiz.id,
          startedAt: parsed.startedAt || Date.now(),
          questionIds: parsed.questionIds || runQuestions.map((q) => q.id),
          answers
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [activeQuiz, answers, runQuestions, user.uid]);

  // Quiz countdown timer with auto-submit on expiry
  useEffect(() => {
    if (!activeQuiz || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      void submitActiveQuiz();
      return;
    }
    const timer = window.setTimeout(() => {
      setSecondsLeft((prev) => (prev !== null ? Math.max(0, prev - 1) : null));
    }, 1000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuiz, secondsLeft]);

  const primaryEnrollment =
    activeEnrollments.find((e) => e.courseId === 'challenge-28') || activeEnrollments[0];
  const primaryCourse = catalog.find(
    (c) => c.id === (primaryEnrollment?.courseId || 'challenge-28')
  );
  const primaryEligibility = primaryEnrollment
    ? evaluateCertificateEligibility({
        enrollment: primaryEnrollment,
        course: primaryCourse,
        quizAttempts,
        submissions,
        existingCerts: certificates,
        minQuizAvg: platformSettings?.certificateMinQuizAvg ?? 70,
        minProjectScore: platformSettings?.certificateMinProjectScore ?? 70
      })
    : null;

  const totalCompletedLessons = activeEnrollments.reduce(
    (acc, enr) => acc + enr.completedDays.length,
    0
  );
  const totalEnrolledDays = activeEnrollments.reduce((acc, enr) => {
    const c = catalog.find((item) => item.id === enr.courseId);
    return acc + (c?.durationDays || 28);
  }, 0);

  const passedQuizBuckets = new Set(
    quizAttempts
      .filter((a) => (typeof a.passed === 'boolean' ? a.passed : a.score >= 70))
      .map((a) => a.quizId || `${a.courseId}_w${a.weekNumber}`)
  ).size;

  const savedNotes = useMemo(
    () =>
      learnerNotes
        .filter((n) => n.bookmarked || n.noteText.trim().length > 0)
        .sort((a, b) => a.dayNumber - b.dayNumber),
    [learnerNotes]
  );

  const startQuiz = (quiz: DynamicQuiz) => {
    const parsed = parseQuizQuestions(quiz.questionsJson);
    const storageKey = `aer_quiz_${user.uid}_${quiz.id}`;
    let restored: {
      startedAt?: number;
      questionIds?: string[];
      answers?: Record<string, string | number>;
    } | null = null;

    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) restored = JSON.parse(raw);
      } catch {
        restored = null;
      }
    }

    let prepared = [...parsed];
    if (restored?.questionIds && restored.questionIds.length === parsed.length) {
      const byId = new Map(parsed.map((q) => [q.id, q]));
      const ordered = restored.questionIds
        .map((id) => byId.get(id))
        .filter((x): x is QuizQuestionItem => Boolean(x));
      if (ordered.length === parsed.length) {
        prepared = ordered;
      }
    } else if (quiz.randomizeQuestions) {
      for (let i = prepared.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [prepared[i], prepared[j]] = [prepared[j], prepared[i]];
      }
    }

    const totalSec = quiz.timeLimitMinutes > 0 ? quiz.timeLimitMinutes * 60 : null;
    let initialSecondsLeft = totalSec;
    if (totalSec !== null && restored?.startedAt) {
      const elapsedSec = Math.floor((Date.now() - restored.startedAt) / 1000);
      initialSecondsLeft = Math.max(5, totalSec - elapsedSec);
    }

    if (typeof window !== 'undefined' && !restored?.startedAt) {
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            quizId: quiz.id,
            startedAt: Date.now(),
            questionIds: prepared.map((q) => q.id),
            answers: {}
          })
        );
      } catch {
        // Ignore storage error
      }
    }

    setLastQuizReview(null);
    setRunQuestions(prepared);
    setAnswers(restored?.answers || {});
    setSecondsLeft(initialSecondsLeft);
    setActiveQuiz(quiz);
  };

  const submitActiveQuiz = async () => {
    if (!activeQuiz || quizSaving) return;
    setQuizSaving(true);
    const quizToGrade = activeQuiz;
    const questionsToGrade = runQuestions;
    const givenAnswers = { ...answers };
    const result = gradeDynamicQuiz(
      questionsToGrade,
      givenAnswers,
      quizToGrade.passThreshold || 70
    );

    const attemptId = `qa_${user.uid}_w${quizToGrade.weekNumber}_${Date.now()}`;
    const path = `quizAttempts/${attemptId}`;

    try {
      await setDoc(doc(db, 'quizAttempts', attemptId), {
        id: attemptId,
        userId: user.uid,
        courseId: quizToGrade.courseId,
        quizId: quizToGrade.id,
        quizTitle: (lang === 'en' ? quizToGrade.titleEn : quizToGrade.titleRw).slice(0, 180),
        weekNumber: quizToGrade.weekNumber,
        score: result.score,
        passed: result.passed,
        totalQuestions: Math.max(1, result.totalQuestions),
        correctCount: result.correctCount,
        createdAt: serverTimestamp()
      });
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(`aer_quiz_${user.uid}_${quizToGrade.id}`);
        } catch {
          // Ignore
        }
      }
      setLastQuizReview({
        quiz: quizToGrade,
        questions: questionsToGrade,
        answers: givenAnswers,
        result
      });
      setActiveQuiz(null);
      setSecondsLeft(null);
      setAnswers({});
      onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setQuizSaving(false);
    }
  };

  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setProjSaving(true);
    setProjMsg(null);
    const subId = `sub_${Date.now()}`;
    const path = `projectSubmissions/${subId}`;
    const toolsList = projTools
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);

    try {
      await setDoc(doc(db, 'projectSubmissions', subId), {
        id: subId,
        userId: user.uid,
        userName: profile?.displayName || user.displayName || 'Learner',
        userEmail: user.email || '',
        courseId: projCourseId || 'challenge-28',
        projectKey: projKey,
        title: projTitle.trim(),
        problemStatement: projProblem.trim(),
        toolsUsed: toolsList.length > 0 ? toolsList : ['ChatGPT'],
        ...(projUrl.trim() ? { artifactUrl: projUrl.trim() } : {}),
        documentationSummary: projSummary.trim(),
        status: 'submitted',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setProjTitle('');
      setProjProblem('');
      setProjUrl('');
      setProjSummary('');
      setProjMsg(
        lang === 'en'
          ? 'Project submitted for instructor rubric review.'
          : 'Umushinga wawe woherejwe kugira ngo usuzumwe.'
      );
      onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setProjSaving(false);
    }
  };

  const handleSaveSubmissionRevision = async (sub: ProjectSubmission) => {
    setEditSaving(true);
    const path = `projectSubmissions/${sub.id}`;
    const toolsList = editTools
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);

    try {
      const payload: Record<string, unknown> = {
        title: editTitle.trim(),
        problemStatement: editProblem.trim(),
        toolsUsed: toolsList.length > 0 ? toolsList : sub.toolsUsed,
        documentationSummary: editSummary.trim(),
        status: 'submitted',
        updatedAt: serverTimestamp()
      };
      if (editUrl.trim() || sub.artifactUrl !== undefined) {
        payload.artifactUrl = editUrl.trim();
      }
      await updateDoc(doc(db, 'projectSubmissions', sub.id), payload);
      setEditingSubId(null);
      setProjMsg(
        lang === 'en'
          ? 'Project updated and resubmitted for review.'
          : 'Umushinga wavuguruwe kandi wongeye koherezwa.'
      );
      onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    } finally {
      setEditSaving(false);
    }
  };

  const handleMarkNotificationRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { isRead: true });
      onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${notifId}`);
    }
  };

  const handleSubmitSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (platformSettings?.enableSupportTickets === false) return;
    setTicketSaving(true);
    setTicketMsg(null);
    const ticketId = `tkt_${Date.now()}`;
    try {
      await setDoc(doc(db, 'supportTickets', ticketId), {
        id: ticketId,
        userId: user.uid,
        userEmail: user.email || '',
        userName: profile?.displayName || user.displayName || 'Learner',
        category: ticketCategory,
        priority: ticketPriority,
        status: 'open',
        subject: ticketSubject.trim(),
        description: ticketDesc.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setTicketSubject('');
      setTicketDesc('');
      setTicketMsg(
        lang === 'en'
          ? 'Support request submitted. Our team will respond in this ticket.'
          : 'Ikibazo cyawe cyoherejwe. Ubufasha burasubiza vuba.'
      );
      onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `supportTickets/${ticketId}`);
    } finally {
      setTicketSaving(false);
    }
  };

  const handleSendTicketReply = async (tkt: SupportTicket) => {
    const text = (replyDrafts[tkt.id] || '').trim();
    if (!text) return;
    setReplyBusyId(tkt.id);
    const msgId = `tm_${Date.now()}`;
    try {
      await setDoc(doc(db, 'ticketMessages', msgId), {
        id: msgId,
        ticketId: tkt.id,
        ticketOwnerUid: user.uid,
        senderUid: user.uid,
        senderName: (profile?.displayName || user.displayName || 'Learner').slice(0, 120),
        senderRole: 'learner',
        message: text.slice(0, 2000),
        createdAt: serverTimestamp()
      });
      setReplyDrafts((prev) => ({ ...prev, [tkt.id]: '' }));
      onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `ticketMessages/${msgId}`);
    } finally {
      setReplyBusyId(null);
    }
  };

  const handleCloseTicket = async (tkt: SupportTicket) => {
    setReplyBusyId(tkt.id);
    try {
      await updateDoc(doc(db, 'supportTickets', tkt.id), {
        status: 'closed',
        updatedAt: serverTimestamp()
      });
      onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `supportTickets/${tkt.id}`);
    } finally {
      setReplyBusyId(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSaved(false);
    const path = `users/${user.uid}`;
    try {
      const payload: Record<string, unknown> = {
        displayName: displayName.trim() || user.displayName || 'Learner',
        preferredLanguage: lang,
        marketingOptIn,
        updatedAt: serverTimestamp()
      };
      if (privacyAccepted) {
        payload.privacyConsentAcceptedAt =
          profile?.privacyConsentAcceptedAt || new Date().toISOString();
      }
      await updateDoc(doc(db, 'users', user.uid), payload);
      setSettingsSaved(true);
      onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    } finally {
      setSavingSettings(false);
    }
  };

  const activeRubric =
    rubrics.find((r) => r.courseId === projCourseId) ||
    rubrics.find((r) => r.courseId === 'challenge-28') ||
    null;

  if (profile?.accountStatus === 'suspended') {
    return (
      <div className="max-w-xl mx-auto px-6 py-16">
        <div className="bg-[#FEF2F2] border border-[#DC2626]/25 rounded-2xl p-8 space-y-3">
          <p className="text-xs font-mono text-[#DC2626] uppercase">Account Suspended</p>
          <h1 className="text-2xl font-display font-semibold text-[#0D0D0F]">
            {lang === 'en'
              ? 'Your learner workspace access is currently paused'
              : 'Konti yawe yabaye ihagaritswe'}
          </h1>
          <p className="text-sm text-[#5D5D66]">
            {profile.suspensionReason ||
              (lang === 'en'
                ? 'Please contact AI Education Rwanda support for account reactivation review.'
                : 'Nyamuneka andikira ubuyobozi bwa AI Education Rwanda.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-8 border-b border-black/[0.08] mb-8">
        <div>
          <p className="text-xs font-medium text-[#0D7A5F] mb-1">
            {lang === 'en' ? 'Learner Portal' : 'Ibikorwa by’Umunyeshuri'}
          </p>
          <h1 className="text-3xl font-display font-semibold tracking-tight text-[#0D0D0F]">
            {profile?.displayName || user.displayName || user.email}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F4F5F7] rounded-xl">
          {[
            { key: 'courses', label: lang === 'en' ? 'My Courses' : 'Amasomo' },
            { key: 'quizzes', label: lang === 'en' ? 'Assessments' : 'Amasuzuma' },
            { key: 'projects', label: lang === 'en' ? 'Projects' : 'Imishinga' },
            { key: 'certificates', label: lang === 'en' ? 'Certificates' : 'Impamyabumenyi' },
            {
              key: 'notifications',
              label:
                unreadCount > 0
                  ? `${lang === 'en' ? 'Updates' : 'Amakuru'} (${unreadCount})`
                  : lang === 'en'
                    ? 'Updates'
                    : 'Amakuru'
            },
            { key: 'support', label: lang === 'en' ? 'Support' : 'Ubufasha' },
            { key: 'settings', label: lang === 'en' ? 'Account' : 'Konti' }
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key as typeof tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                tab === item.key
                  ? 'bg-white text-[#0D0D0F] shadow-xs'
                  : 'text-[#5D5D66] hover:text-[#0D0D0F]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* TAB 1: MY COURSES */}
      {tab === 'courses' && (
        <div className="space-y-8">
          {publishedAnnouncements.length > 0 && (
            <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs">
                <span className="font-semibold text-[#0D7A5F]">
                  {publishedAnnouncements[0][lang === 'en' ? 'titleEn' : 'titleRw']}
                </span>
                <span className="text-[#5D5D66] ml-2">
                  {publishedAnnouncements[0][lang === 'en' ? 'bodyEn' : 'bodyRw']}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTab('notifications')}
                className="text-xs font-medium text-[#0D0D0F] underline underline-offset-4 whitespace-nowrap shrink-0"
              >
                {lang === 'en' ? 'View all updates' : 'Reba amakuru yose'}
              </button>
            </div>
          )}

          {activeEnrollments.length > 0 ? (
            <div className="space-y-4">
              {activeEnrollments.map((enr) => {
                const course = catalog.find((c) => c.id === enr.courseId) || COURSES[0];
                const totalDays = Math.max(1, course.durationDays || 28);
                const doneDays = enr.completedDays.length;
                const pct = Math.min(100, Math.round((doneDays / totalDays) * 100));
                const cohort = enr.cohortId ? cohorts.find((ch) => ch.id === enr.cohortId) : undefined;
                const nextStructuredLesson = structuredLessons.find(
                  (l) => l.courseId === enr.courseId && l.dayNumber === enr.currentDay
                );
                const nextModule = nextStructuredLesson?.moduleId
                  ? modules.find((m) => m.id === nextStructuredLesson.moduleId)
                  : undefined;
                const nextReleaseLock = resolveLessonReleaseLock({
                  courseModule: nextModule,
                  lesson: nextStructuredLesson,
                  isStaff: false
                });
                const elig = evaluateCertificateEligibility({
                  enrollment: enr,
                  course,
                  quizAttempts,
                  submissions,
                  existingCerts: certificates,
                  minQuizAvg: platformSettings?.certificateMinQuizAvg ?? 70,
                  minProjectScore: platformSettings?.certificateMinProjectScore ?? 70
                });

                return (
                  <div
                    key={enr.id}
                    className="bg-white border border-black/[0.08] rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                  >
                    <div className="max-w-xl flex-1">
                      <p className="text-xs font-mono text-[#0D7A5F] mb-1">
                        {course.code} · {lang === 'en' ? 'Active Enrollment' : 'Wariyandikishije'}
                        {enr.accessType && enr.accessType !== 'paid'
                          ? ` · ${enr.accessType.replace('_', ' ')}`
                          : ''}
                        {enr.cohortName || cohort?.name
                          ? ` · ${enr.cohortName || cohort?.name}`
                          : ''}
                      </p>
                      <h2 className="text-2xl font-display font-semibold text-[#0D0D0F] mb-2">
                        {course.title[lang]}
                      </h2>
                      <p className="text-sm text-[#5D5D66] mb-3">
                        {lang === 'en'
                          ? `Progress: ${doneDays} of ${totalDays} lessons completed (${pct}%). Next lesson: Day ${enr.currentDay}.`
                          : `Aho ugeze: Amasomo ${doneDays} kuri ${totalDays} (${pct}%). Isomo rikurikira: Umunsi wa ${enr.currentDay}.`}
                      </p>
                      {nextReleaseLock.locked && (
                        <p className="text-xs text-[#B45309] font-medium mb-3 inline-flex items-center gap-1.5 bg-[#FFFBEB] border border-[#D97706]/30 rounded-lg px-2.5 py-1.5">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {lang === 'en'
                              ? `Day ${enr.currentDay} unlocks on ${formatReleaseDateLabel(nextReleaseLock.effectiveReleaseAt, nextReleaseLock.effectiveReleaseAtMs, 'en')}`
                              : `Umunsi wa ${enr.currentDay} uzafunguka ku wa ${formatReleaseDateLabel(nextReleaseLock.effectiveReleaseAt, nextReleaseLock.effectiveReleaseAtMs, 'rw')}`}
                          </span>
                        </p>
                      )}
                      <div className="w-full h-2 bg-[#ECEEF2] rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full bg-[#0D7A5F] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {course.certificateEligible !== false && (
                        <p className="text-xs text-[#5D5D66]">
                          {elig.alreadyIssued ? (
                            <span className="text-[#0D7A5F] font-medium">
                              {lang === 'en'
                                ? 'Certificate issued — view in Certificates tab.'
                                : 'Impamyabumenyi yasohotse — irebe mu gice cy’Impamyabumenyi.'}
                            </span>
                          ) : elig.eligible ? (
                            <span className="text-[#0D7A5F] font-medium">
                              {lang === 'en'
                                ? `Certificate criteria met (${elig.weightedFinalScore}% weighted). Pending staff issuance.`
                                : `Wujuje ibisabwa by’impamyabumenyi (${elig.weightedFinalScore}%).`}
                            </span>
                          ) : (
                            <span>
                              {lang === 'en' ? 'Certificate checklist: ' : 'Ibisabwa: '}
                              {elig.reasons.join(' · ')}
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenLesson(enr.courseId, enr.currentDay)}
                        className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-white bg-[#0D0D0F] rounded-lg hover:bg-[#232329]"
                      >
                        <span>
                          {nextReleaseLock.locked
                            ? lang === 'en'
                              ? `View Schedule (Day ${enr.currentDay})`
                              : `Reba Gahunda (Umunsi wa ${enr.currentDay})`
                            : lang === 'en'
                              ? `Continue Day ${enr.currentDay}`
                              : `Komeza Umunsi wa ${enr.currentDay}`}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {pendingEnrollments.length > 0 && (
            <div className="space-y-4">
              {pendingEnrollments.map((enr) => {
                const course = catalog.find((c) => c.id === enr.courseId) || COURSES[0];
                return (
                  <div
                    key={enr.id}
                    className="bg-[#FFFBEB] border border-[#D97706]/30 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                  >
                    <div>
                      <p className="text-xs font-mono text-[#B45309] mb-1">
                        {lang === 'en' ? 'Payment Pending Verification' : 'Ubwishyu Butegereje Kwemezwa'}
                      </p>
                      <h2 className="text-xl font-display font-semibold text-[#0D0D0F] mb-2">
                        {course.title[lang]}
                      </h2>
                      <p className="text-sm text-[#5D5D66] max-w-xl">
                        {lang === 'en'
                          ? `Reference ${enr.paymentRef} is awaiting staff confirmation. While verification completes, you can read all free sample lessons.`
                          : `Nimero yawe ${enr.paymentRef} itegereje kwemezwa. Ushobora gusoma amasomo y’ubuntu ubu.`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenLesson(enr.courseId, 1)}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-[#0D0D0F] rounded-lg whitespace-nowrap shrink-0"
                    >
                      {lang === 'en' ? 'Open Day 1 Sample' : 'Soma Umunsi wa 1'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeEnrollments.length === 0 && pendingEnrollments.length === 0 && (
            <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <h2 className="text-xl font-display font-semibold text-[#0D0D0F] mb-2">
                  {lang === 'en'
                    ? 'You are not enrolled in an active course yet'
                    : 'Nturiyandikisha mu isomo na rimwe'}
                </h2>
                <p className="text-sm text-[#5D5D66] max-w-xl">
                  {lang === 'en'
                    ? 'Browse the course catalog to enroll in a free or paid course via MTN MoMo / Airtel Money, or start reading free sample lessons.'
                    : 'Reba amasomo ahari cyangwa usome amasomo y’igerageza ku buntu.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('courses')}
                className="px-5 py-2.5 text-sm font-medium text-white bg-[#0D0D0F] rounded-lg whitespace-nowrap shrink-0"
              >
                {lang === 'en' ? 'Browse Courses' : 'Reba Amasomo'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-xl p-5">
              <p className="text-xs text-[#5D5D66] mb-1">
                {lang === 'en' ? 'Lessons Completed' : 'Amasomo Yarangiye'}
              </p>
              <p className="text-2xl font-display font-semibold tabular-nums text-[#0D0D0F]">
                {totalCompletedLessons} / {totalEnrolledDays || 28}
              </p>
            </div>
            <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-xl p-5">
              <p className="text-xs text-[#5D5D66] mb-1">
                {lang === 'en' ? 'Assessments Passed' : 'Amasuzuma Yatsinzwe'}
              </p>
              <p className="text-2xl font-display font-semibold tabular-nums text-[#0D0D0F]">
                {passedQuizBuckets} / {Math.max(4, availableQuizzes.length)}
              </p>
            </div>
            <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-xl p-5">
              <p className="text-xs text-[#5D5D66] mb-1">
                {lang === 'en' ? 'Estimated Weighted Score' : 'Amanota Muri Rusange'}
              </p>
              <p className="text-2xl font-display font-semibold tabular-nums text-[#0D0D0F]">
                {primaryEligibility?.weightedFinalScore ?? 0}%
              </p>
            </div>
          </div>

          {/* Bookmarked Lessons & Study Notes */}
          <div className="bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[#0D7A5F]" />
                <h2 className="text-lg font-display font-semibold text-[#0D0D0F]">
                  {lang === 'en'
                    ? 'Bookmarked Lessons & Study Notes'
                    : 'Amasomo Wabitse & Inyandiko Zawe'}
                </h2>
              </div>
              <span className="text-xs font-mono text-[#5D5D66]">{savedNotes.length} saved</span>
            </div>

            {savedNotes.length === 0 ? (
              <p className="text-xs text-[#5D5D66]">
                {lang === 'en'
                  ? 'Bookmark any lesson or save personal study notes while reading to find them quickly here.'
                  : 'Bika isomo cyangwa wandike iby’ingenzi igihe usoma kugira ngo ubibone hano.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedNotes.map((note) => {
                  const noteCourse = catalog.find((c) => c.id === note.courseId);
                  return (
                    <div
                      key={note.id}
                      className="bg-[#F9F9FB] border border-black/[0.08] rounded-xl p-4 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 text-xs mb-1">
                          <span className="font-mono text-[#0D7A5F] font-semibold">
                            {noteCourse?.code || note.courseId} · Day {note.dayNumber}
                          </span>
                          {note.bookmarked && (
                            <span className="text-[11px] font-mono text-[#0D0D0F]">
                              Bookmarked
                            </span>
                          )}
                        </div>
                        {note.noteText ? (
                          <p className="text-xs text-[#0D0D0F] whitespace-pre-line line-clamp-3">
                            {note.noteText}
                          </p>
                        ) : (
                          <p className="text-xs text-[#5D5D66] italic">
                            {lang === 'en' ? 'Bookmarked lesson' : 'Isomo ryabitswe'}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenLesson(note.courseId, note.dayNumber)}
                        className="self-start text-xs font-medium text-[#0D7A5F] hover:underline"
                      >
                        {lang === 'en' ? 'Open Lesson ->' : 'Fungura Isomo ->'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ASSESSMENTS & DYNAMIC QUIZZES */}
      {tab === 'quizzes' && (
        <div className="space-y-8">
          <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-[#0D0D0F] mb-1">
                {lang === 'en'
                  ? `Course Assessment Weighting (${platformSettings?.certificateMinQuizAvg ?? 70}% Minimum Pass Threshold)`
                  : `Imiterere y’Amasuzuma (${platformSettings?.certificateMinQuizAvg ?? 70}% Fatizo)`}
              </h2>
              <p className="text-xs text-[#5D5D66]">
                {lang === 'en'
                  ? 'Passing requires completing all weekly assessments, submitting & demonstrating your final project, and earning >=70% overall.'
                  : 'Impamyabumenyi itangwa ku warangije amasuzuma yose, akamurika umushinga wa nyuma afite nibura 70%.'}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              {BLUEPRINT_GRADING_BREAKDOWN.map((w) => (
                <div key={w.id} className="bg-white border border-black/[0.06] rounded-xl p-3">
                  <p className="text-[#5D5D66] leading-snug">{w.label[lang]}</p>
                  <p className="font-mono font-semibold text-[#0D7A5F] tabular-nums mt-1.5">
                    {w.weightPct}%
                  </p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-[#0D0D0F] mb-2">
                {lang === 'en'
                  ? 'Final Project 7-Criterion Rubric (30% Weight)'
                  : 'Ibipimo 7 by’Umushinga wa Nyuma (30%)'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-[11px]">
                {(activeRubric
                  ? [
                      { name: 'Problem', weight: `${activeRubric.problemWeight}%` },
                      { name: 'Workflow Design', weight: `${activeRubric.approachWeight}%` },
                      { name: 'Implementation', weight: `${activeRubric.implementationWeight}%` },
                      { name: 'Testing & Safety', weight: `${activeRubric.testingWeight}%` },
                      { name: 'Documentation', weight: `${activeRubric.docsWeight}%` }
                    ]
                  : FINAL_PROJECT_RUBRIC_7.map((c) => ({
                      name: c.criterion[lang],
                      weight: `${c.weightPct}%`
                    }))
                ).map((item) => (
                  <div key={item.name} className="bg-white border border-black/[0.06] rounded-lg p-2.5">
                    <p className="text-[#5D5D66] leading-tight">{item.name}</p>
                    <p className="font-mono font-semibold text-[#0D0D0F] tabular-nums mt-1">
                      {item.weight}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {lastQuizReview && (
            <div className="bg-white border border-black/15 rounded-2xl p-6 sm:p-8 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/[0.08] pb-4">
                <div>
                  <p
                    className={`text-xs font-mono font-semibold uppercase ${
                      lastQuizReview.result.passed ? 'text-[#0D7A5F]' : 'text-[#DC2626]'
                    }`}
                  >
                    {lastQuizReview.result.passed
                      ? lang === 'en'
                        ? 'Assessment Passed'
                        : 'Watsinze Isuzuma'
                      : lang === 'en'
                        ? 'Review & Retry Recommended'
                        : 'Subiramo Witegure Neza'}
                  </p>
                  <h3 className="text-xl font-display font-semibold text-[#0D0D0F]">
                    {lang === 'en' ? lastQuizReview.quiz.titleEn : lastQuizReview.quiz.titleRw}
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-display font-semibold tabular-nums text-[#0D0D0F]">
                    {lastQuizReview.result.score}%
                  </p>
                  <p className="text-xs font-mono text-[#5D5D66]">
                    {lastQuizReview.result.correctCount}/{lastQuizReview.result.totalQuestions} correct (
                    {lastQuizReview.result.earnedMarks}/{lastQuizReview.result.totalMarks} pts)
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {lastQuizReview.questions.map((q, idx) => {
                  const given = lastQuizReview.answers[q.id];
                  const isCorrect =
                    q.type === 'short_answer'
                      ? typeof given === 'string' &&
                        Boolean(q.correctText) &&
                        given.trim().toLowerCase().includes((q.correctText || '').trim().toLowerCase())
                      : given === q.correctIndex;
                  const explanation = lang === 'en' ? q.explanationEn : q.explanationRw || q.explanationEn;

                  return (
                    <div
                      key={q.id}
                      className={`rounded-xl border p-4 text-xs space-y-1.5 ${
                        isCorrect
                          ? 'bg-[#F2FBF8] border-[#0D7A5F]/25'
                          : 'bg-[#FEF2F2] border-[#DC2626]/20'
                      }`}
                    >
                      <p className="font-semibold text-[#0D0D0F]">
                        {idx + 1}. {lang === 'en' ? q.questionEn : q.questionRw || q.questionEn}{' '}
                        <span className="font-mono">({isCorrect ? 'Correct' : 'Incorrect'})</span>
                      </p>
                      {explanation && <p className="text-[#5D5D66] leading-relaxed">{explanation}</p>}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setLastQuizReview(null)}
                className="px-4 py-2 text-xs font-medium text-white bg-[#0D0D0F] rounded-lg"
              >
                {lang === 'en' ? 'Back to Assessments' : 'Subira ku Masuzuma'}
              </button>
            </div>
          )}

          {activeQuiz ? (
            <div className="bg-white border border-black/[0.08] rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/[0.08] pb-4">
                <div>
                  <p className="text-xs font-mono text-[#0D7A5F]">
                    Week {activeQuiz.weekNumber} · Pass ≥{activeQuiz.passThreshold}%
                  </p>
                  <h3 className="text-xl font-display font-semibold text-[#0D0D0F]">
                    {lang === 'en' ? activeQuiz.titleEn : activeQuiz.titleRw || activeQuiz.titleEn}
                  </h3>
                </div>
                <div className="flex items-center gap-4">
                  {secondsLeft !== null && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F4F5F7] font-mono text-xs font-semibold text-[#0D0D0F]">
                      <Clock className="w-3.5 h-3.5 text-[#0D7A5F]" />
                      {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
                      {String(secondsLeft % 60).padStart(2, '0')}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (activeQuiz && typeof window !== 'undefined') {
                        try {
                          window.localStorage.removeItem(`aer_quiz_${user.uid}_${activeQuiz.id}`);
                        } catch {
                          // Ignore
                        }
                      }
                      setActiveQuiz(null);
                      setSecondsLeft(null);
                      setAnswers({});
                    }}
                    className="text-xs font-medium text-[#5D5D66]"
                  >
                    {lang === 'en' ? 'Cancel' : 'Hagarika'}
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {runQuestions.map((q, qIdx) => {
                  const promptText =
                    lang === 'en' ? q.questionEn : q.questionRw || q.questionEn;
                  const opts =
                    lang === 'en'
                      ? q.optionsEn
                      : q.optionsRw.length > 0 && q.optionsRw.some(Boolean)
                        ? q.optionsRw
                        : q.optionsEn;

                  return (
                    <div key={q.id} className="space-y-2.5">
                      <p className="text-sm font-medium text-[#0D0D0F]">
                        {qIdx + 1}. {promptText}{' '}
                        <span className="text-xs font-mono text-[#5D5D66]">
                          ({q.marks} {q.marks === 1 ? 'pt' : 'pts'})
                        </span>
                      </p>
                      {q.type === 'short_answer' ? (
                        <input
                          type="text"
                          value={typeof answers[q.id] === 'string' ? (answers[q.id] as string) : ''}
                          onChange={(e) =>
                            setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                          placeholder={
                            lang === 'en' ? 'Type your short answer...' : 'Andika igisubizo...'
                          }
                          className="w-full px-4 py-2.5 text-sm border border-black/15 rounded-xl"
                        />
                      ) : (
                        <div className="space-y-2">
                          {opts.map((opt, oIdx) => (
                            <button
                              key={`${q.id}_${oIdx}`}
                              type="button"
                              onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: oIdx }))}
                              className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs sm:text-sm transition-colors ${
                                answers[q.id] === oIdx
                                  ? 'bg-[#0D0D0F] text-white border-[#0D0D0F]'
                                  : 'bg-[#F9F9FB] text-[#0D0D0F] border-black/[0.08] hover:border-black/25'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={quizSaving}
                onClick={submitActiveQuiz}
                className="px-5 py-2.5 text-sm font-medium text-white bg-[#0D7A5F] rounded-lg hover:bg-[#0B664F]"
              >
                {quizSaving
                  ? lang === 'en'
                    ? 'Grading...'
                    : 'Birakorwa...'
                  : lang === 'en'
                    ? 'Submit Assessment'
                    : 'Ohereza Isuzuma'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {availableQuizzes.map((quiz) => {
                const qList = parseQuizQuestions(quiz.questionsJson);
                const matchingAttempts = quizAttempts.filter(
                  (a) =>
                    a.quizId === quiz.id ||
                    (!a.quizId && a.courseId === quiz.courseId && a.weekNumber === quiz.weekNumber)
                );
                const best =
                  matchingAttempts.length > 0
                    ? Math.max(...matchingAttempts.map((a) => a.score))
                    : null;
                const limitReached =
                  quiz.maxAttempts > 0 && matchingAttempts.length >= quiz.maxAttempts;
                const course = catalog.find((c) => c.id === quiz.courseId);

                return (
                  <div
                    key={quiz.id}
                    className="bg-white border border-black/[0.08] rounded-2xl p-6 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <p className="text-xs font-mono text-[#0D7A5F] mb-1">
                        {course?.code || quiz.courseId} · Week {quiz.weekNumber} · {qList.length} Qs
                        {quiz.timeLimitMinutes > 0 ? ` · ${quiz.timeLimitMinutes} min` : ''}
                      </p>
                      <h3 className="text-base font-semibold text-[#0D0D0F] mb-1">
                        {lang === 'en' ? quiz.titleEn : quiz.titleRw || quiz.titleEn}
                      </h3>
                      <p className="text-xs text-[#5D5D66]">
                        {best !== null
                          ? lang === 'en'
                            ? `Best score: ${best}% (${matchingAttempts.length}${
                                quiz.maxAttempts > 0 ? `/${quiz.maxAttempts}` : ''
                              } attempt${matchingAttempts.length > 1 ? 's' : ''})`
                            : `Amanota meza: ${best}%`
                          : lang === 'en'
                            ? `Pass threshold: ${quiz.passThreshold}%`
                            : `Fatizo: ${quiz.passThreshold}%`}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={limitReached || qList.length === 0}
                      onClick={() => startQuiz(quiz)}
                      className="self-start px-4 py-2 text-xs font-medium text-white bg-[#0D0D0F] rounded-lg disabled:opacity-50"
                    >
                      {limitReached
                        ? lang === 'en'
                          ? 'Max Attempts Reached'
                          : 'Umubare w’igerageza wuzuye'
                        : best !== null
                          ? lang === 'en'
                            ? 'Retake quiz'
                            : 'Ongera ugerageze'
                          : lang === 'en'
                            ? 'Start quiz'
                            : 'Tangira isuzuma'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PROJECT SUBMISSIONS */}
      {tab === 'projects' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 bg-white border border-black/[0.08] rounded-2xl p-6">
            <h2 className="text-lg font-display font-semibold text-[#0D0D0F] mb-2">
              {lang === 'en' ? 'Submit Practical Project' : 'Tanga Umushinga Ngiro'}
            </h2>
            <p className="text-xs text-[#5D5D66] mb-5">
              {lang === 'en'
                ? 'Choose one of the 6 blueprint projects (including Project 06: Independent Final Project) or submit a custom AI workflow addressing a problem you understand.'
                : 'Hitamo umwe mu mishinga 6 irimo umushinga wa nyuma wigenga cyangwa utange uwawe.'}
            </p>

            <form onSubmit={handleSubmitProject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#0D0D0F] mb-1">
                  {lang === 'en' ? 'Course' : 'Isomo'}
                </label>
                <select
                  value={projCourseId}
                  onChange={(e) => setProjCourseId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-black/15 rounded-lg bg-white"
                >
                  {catalog.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.title[lang]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#0D0D0F] mb-1">
                  {lang === 'en' ? 'Project Track' : 'Icyiciro cy’umushinga'}
                </label>
                <select
                  value={projKey}
                  onChange={(e) => setProjKey(e.target.value as ProjectSubmission['projectKey'])}
                  className="w-full px-3.5 py-2 text-sm border border-black/15 rounded-lg bg-white"
                >
                  {PRACTICAL_PROJECTS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.number}. {p.title[lang]}
                    </option>
                  ))}
                  <option value="custom">
                    {lang === 'en' ? 'Custom Problem Proposal' : 'Umushinga wihariye'}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#0D0D0F] mb-1">
                  {lang === 'en' ? 'Project Title' : 'Izina ry’umushinga'}
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={projTitle}
                  onChange={(e) => setProjTitle(e.target.value)}
                  placeholder="e.g. Kigali Bakery Inquiry Triage Assistant"
                  className="w-full px-3.5 py-2 text-sm border border-black/15 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#0D0D0F] mb-1">
                  {lang === 'en' ? 'Problem Statement' : 'Ikibazo ukemura'}
                </label>
                <textarea
                  rows={3}
                  required
                  minLength={10}
                  value={projProblem}
                  onChange={(e) => setProjProblem(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-black/15 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#0D0D0F] mb-1">
                  {lang === 'en' ? 'Tools Used (comma-separated)' : 'Porogaramu zakoreshejwe'}
                </label>
                <input
                  type="text"
                  required
                  value={projTools}
                  onChange={(e) => setProjTools(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-black/15 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#0D0D0F] mb-1">
                  {lang === 'en'
                    ? 'Documentation & Human Oversight Summary'
                    : 'Ibisobanuro n’uko umuntu agenzura'}
                </label>
                <textarea
                  rows={3}
                  required
                  minLength={10}
                  value={projSummary}
                  onChange={(e) => setProjSummary(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-black/15 rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#0D0D0F]">
                  {lang === 'en'
                    ? 'Demo Link or Uploaded File (PDF, DOCX, ZIP, PNG/JPG, MD — max 10 MB)'
                    : 'Link cyangwa Dosiye y’umushinga (PDF, DOCX, ZIP, PNG/JPG — max 10 MB)'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={projUrl}
                    onChange={(e) => setProjUrl(e.target.value)}
                    placeholder="https://docs.google.com/... or /api/files/..."
                    className="flex-1 min-w-0 px-3.5 py-2 text-sm border border-black/15 rounded-lg"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#F4F5F7] border border-black/15 rounded-lg cursor-pointer hover:bg-[#ECEEF2] shrink-0">
                    <Upload className="w-3.5 h-3.5 text-[#0D7A5F]" />
                    <span>{projUploading ? 'Uploading...' : 'Upload File'}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept={UPLOAD_RULES.submission.acceptAttr}
                      disabled={projUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        setProjUploading(true);
                        setProjMsg(null);
                        try {
                          const uploaded = await uploadPlatformFile(file, 'submission', user);
                          setProjUrl(uploaded.url);
                          setProjMsg(`Attached file: ${uploaded.filename}`);
                        } catch (err) {
                          setProjMsg(err instanceof Error ? err.message : 'File upload failed.');
                        } finally {
                          setProjUploading(false);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {projMsg && (
                <p className="text-xs text-[#0D7A5F] bg-[#ECFDF5] border border-[#0D7A5F]/20 rounded-lg px-3 py-2">
                  {projMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={projSaving}
                className="px-5 py-2.5 text-sm font-medium text-white bg-[#0D0D0F] rounded-lg"
              >
                {projSaving
                  ? lang === 'en'
                    ? 'Submitting...'
                    : 'Birimo koherezwa...'
                  : lang === 'en'
                    ? 'Submit Project'
                    : 'Ohereza Umushinga'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-lg font-display font-semibold text-[#0D0D0F]">
              {lang === 'en' ? 'Your Submissions & Feedback' : 'Imishinga Watanze'}
            </h2>
            {submissions.length === 0 ? (
              <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6 text-sm text-[#5D5D66]">
                {lang === 'en'
                  ? 'No project submissions yet. Download the rubric in Projects & Tools before submitting.'
                  : 'Nta mushinga uratanga.'}
              </div>
            ) : (
              submissions.map((sub) => {
                const canEdit = sub.status === 'submitted' || sub.status === 'needs_revision';
                const isEditing = editingSubId === sub.id;

                return (
                  <div
                    key={sub.id}
                    className="bg-white border border-black/[0.08] rounded-2xl p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[#0D0D0F]">{sub.title}</h3>
                      <span
                        className={`text-xs font-mono uppercase ${
                          sub.status === 'needs_revision'
                            ? 'text-[#B45309]'
                            : sub.status === 'approved'
                              ? 'text-[#0D7A5F]'
                              : 'text-[#5D5D66]'
                        }`}
                      >
                        {sub.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-[#5D5D66]">{sub.problemStatement}</p>
                    {sub.artifactUrl && (
                      isProtectedUploadUrl(sub.artifactUrl) ? (
                        <button
                          type="button"
                          onClick={() => openProtectedFile(sub.artifactUrl!, user)}
                          className="text-xs font-mono text-[#0D7A5F] underline hover:text-[#0B664F]"
                        >
                          {lang === 'en' ? 'Open Attached File' : 'Fungura Dosiye'} ({sub.artifactUrl})
                        </button>
                      ) : (
                        <a
                          href={sub.artifactUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-xs font-mono text-[#0D7A5F] underline truncate"
                        >
                          {sub.artifactUrl}
                        </a>
                      )
                    )}
                    {typeof sub.score === 'number' && (
                      <p className="text-xs font-mono font-semibold text-[#0D0D0F] tabular-nums">
                        Score: {sub.score}/100
                      </p>
                    )}
                    {sub.reviewerFeedback && (
                      <p className="text-xs bg-[#F9F9FB] border border-black/[0.06] rounded-lg p-3 text-[#0D0D0F]">
                        <strong>Feedback:</strong> {sub.reviewerFeedback}
                      </p>
                    )}

                    {canEdit && !isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSubId(sub.id);
                          setEditTitle(sub.title);
                          setEditProblem(sub.problemStatement);
                          setEditTools(sub.toolsUsed.join(', '));
                          setEditUrl(sub.artifactUrl || '');
                          setEditSummary(sub.documentationSummary);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0D0D0F] border border-black/15 rounded-lg px-3 py-1.5 hover:border-black/35"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>
                          {sub.status === 'needs_revision'
                            ? lang === 'en'
                              ? 'Revise & Resubmit'
                              : 'Vugurura Wongere Wohereze'
                            : lang === 'en'
                              ? 'Edit Submission'
                              : 'Hindura Umushinga'}
                        </span>
                      </button>
                    )}

                    {isEditing && (
                      <div className="pt-3 border-t border-black/[0.08] space-y-2.5 text-xs">
                        <input
                          type="text"
                          required
                          minLength={3}
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Title"
                          className="w-full px-3 py-2 border border-black/15 rounded-lg"
                        />
                        <textarea
                          rows={2}
                          required
                          minLength={10}
                          value={editProblem}
                          onChange={(e) => setEditProblem(e.target.value)}
                          placeholder="Problem statement"
                          className="w-full px-3 py-2 border border-black/15 rounded-lg"
                        />
                        <input
                          type="text"
                          required
                          value={editTools}
                          onChange={(e) => setEditTools(e.target.value)}
                          placeholder="Tools (comma-separated)"
                          className="w-full px-3 py-2 border border-black/15 rounded-lg"
                        />
                        <textarea
                          rows={2}
                          required
                          minLength={10}
                          value={editSummary}
                          onChange={(e) => setEditSummary(e.target.value)}
                          placeholder="Documentation & oversight summary"
                          className="w-full px-3 py-2 border border-black/15 rounded-lg"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editUrl}
                            onChange={(e) => setEditUrl(e.target.value)}
                            placeholder="Demo URL or /api/files/..."
                            className="flex-1 min-w-0 px-3 py-2 border border-black/15 rounded-lg"
                          />
                          <label className="inline-flex items-center gap-1 px-2.5 py-2 bg-[#F4F5F7] border border-black/15 rounded-lg cursor-pointer hover:bg-[#ECEEF2] shrink-0 font-medium">
                            <Upload className="w-3.5 h-3.5 text-[#0D7A5F]" />
                            <span>{editUploading ? '...' : 'Upload'}</span>
                            <input
                              type="file"
                              className="hidden"
                              accept={UPLOAD_RULES.submission.acceptAttr}
                              disabled={editUploading}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (!file) return;
                                setEditUploading(true);
                                try {
                                  const uploaded = await uploadPlatformFile(file, 'submission', user);
                                  setEditUrl(uploaded.url);
                                } catch (err) {
                                  setProjMsg(err instanceof Error ? err.message : 'File upload failed.');
                                } finally {
                                  setEditUploading(false);
                                }
                              }}
                            />
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={editSaving}
                            onClick={() => handleSaveSubmissionRevision(sub)}
                            className="px-3.5 py-1.5 font-medium text-white bg-[#0D7A5F] rounded-lg"
                          >
                            {editSaving
                              ? 'Saving...'
                              : lang === 'en'
                                ? 'Resubmit Project'
                                : 'Ongera Wohereze'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSubId(null)}
                            className="px-3 py-1.5 border border-black/15 rounded-lg"
                          >
                            {lang === 'en' ? 'Cancel' : 'Hagarika'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CERTIFICATES & EVENTS */}
      {tab === 'certificates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-lg font-display font-semibold text-[#0D0D0F]">
              {lang === 'en' ? 'Earned Certificates' : 'Impamyabumenyi Zawe'}
            </h2>
            {certificates.length === 0 ? (
              <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6 space-y-3">
                <FileText className="w-6 h-6 text-[#5D5D66]" />
                <p className="text-sm font-medium text-[#0D0D0F]">
                  {lang === 'en'
                    ? 'Certificate issued upon completion'
                    : 'Impamyabumenyi itangwa iyo urangije'}
                </p>
                <p className="text-xs text-[#5D5D66] leading-relaxed">
                  {lang === 'en'
                    ? `Complete your course lessons, achieve at least ${
                        platformSettings?.certificateMinQuizAvg ?? 70
                      }% on assessments and ${
                        platformSettings?.certificateMinProjectScore ?? 70
                      }% on your final project to receive your QR-verified Certificate of Completion from ${
                        platformSettings?.certificateOrgName || 'AI Education Rwanda'
                      }.`
                    : 'Rangiza amasomo n’amasuzuma, ugire nibura 70% kandi umushinga wawe wemezwe kugira ngo uhabwe impamyabumenyi.'}
                </p>
                {platformSettings?.enablePublicVerify !== false && (
                  <button
                    type="button"
                    onClick={() => onNavigate('verify')}
                    className="text-xs font-medium text-[#0D7A5F] hover:underline"
                  >
                    {lang === 'en'
                      ? 'Preview public verifier (RW-AI-2026-0042) ->'
                      : 'Reba uko igenzura rikora ->'}
                  </button>
                )}
              </div>
            ) : (
              certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="bg-white border border-black/15 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0D7A5F]">
                      <ShieldCheck className="w-4 h-4" />
                      <span>{cert.status.toUpperCase()}</span>
                    </div>
                    <h3 className="text-base font-semibold text-[#0D0D0F]">{cert.courseTitle}</h3>
                    <p className="text-xs text-[#5D5D66]">
                      {platformSettings?.certificateOrgName || 'AI Education Rwanda'} ·{' '}
                      {platformSettings?.certificateSignatoryName || 'Academic Director'}
                    </p>
                    <p className="text-xs text-[#5D5D66] font-mono">
                      ID: {cert.id} · Score: {cert.finalScore}%
                    </p>
                    <button
                      type="button"
                      onClick={() => setPrintCert(cert)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-black/15 rounded-lg hover:border-black/35"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{lang === 'en' ? 'Print / Save PDF' : 'Sohora PDF'}</span>
                    </button>
                  </div>
                  <CertificateQrCode value={`${window.location.origin}/?verify=${cert.id}`} />
                </div>
              ))
            )}
          </div>

          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-lg font-display font-semibold text-[#0D0D0F]">
              {lang === 'en' ? 'Your Event Registrations' : 'Ibiganiro Wiyandikishijemo'}
            </h2>
            {eventRegistrations.length === 0 ? (
              <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6 text-xs text-[#5D5D66]">
                {lang === 'en' ? 'No workshop RSVPs yet.' : 'Nta kiganiro uriyandikishamo.'}
              </div>
            ) : (
              eventRegistrations.map((reg) => (
                <div
                  key={reg.id}
                  className="bg-white border border-black/[0.08] rounded-xl p-4 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-medium text-[#0D0D0F]">{reg.eventTitle}</p>
                    <p className="text-xs text-[#5D5D66] font-mono">
                      {reg.attendanceMode === 'kigali_in_person' ? 'Kigali In-Person' : 'Online'}
                    </p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-[#0D7A5F] shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: NOTIFICATIONS & ANNOUNCEMENTS */}
      {tab === 'notifications' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-lg font-display font-semibold text-[#0D0D0F]">
              {lang === 'en' ? 'Your Notifications' : 'Ubutumwa Bwawe'}
            </h2>
            {notifications.length === 0 ? (
              <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6 text-sm text-[#5D5D66]">
                {lang === 'en'
                  ? 'No account notifications yet. Enrollment confirmations, payment approvals, and project feedback will appear here.'
                  : 'Nta butumwa bwa konti buraboneka.'}
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`border rounded-2xl p-5 flex items-start justify-between gap-4 ${
                    notif.isRead
                      ? 'bg-white border-black/[0.08]'
                      : 'bg-[#F2FBF8] border-[#0D7A5F]/25'
                  }`}
                >
                  <div>
                    <p className="text-xs font-mono text-[#0D7A5F] uppercase mb-1">
                      {notif.category} {notif.isRead ? '· Read' : '· Unread'}
                    </p>
                    <h3 className="text-sm font-semibold text-[#0D0D0F]">{notif.title}</h3>
                    <p className="text-xs text-[#5D5D66] mt-1 leading-relaxed">{notif.message}</p>
                  </div>
                  {!notif.isRead && (
                    <button
                      type="button"
                      onClick={() => handleMarkNotificationRead(notif.id)}
                      className="px-3 py-1.5 text-xs font-medium border border-black/15 rounded-lg bg-white shrink-0"
                    >
                      {lang === 'en' ? 'Mark read' : 'Byasomwe'}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-lg font-display font-semibold text-[#0D0D0F]">
              {lang === 'en' ? 'Platform Announcements' : 'Amatangazo Rusange'}
            </h2>
            {publishedAnnouncements.length === 0 ? (
              <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6 text-xs text-[#5D5D66]">
                {lang === 'en' ? 'No active announcements.' : 'Nta matangazo ahari ubu.'}
              </div>
            ) : (
              publishedAnnouncements.map((ann) => (
                <div key={ann.id} className="bg-white border border-black/[0.08] rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-[#0D0D0F]">
                    {lang === 'en' ? ann.titleEn : ann.titleRw}
                  </h3>
                  <p className="text-xs text-[#5D5D66] mt-1.5 leading-relaxed">
                    {lang === 'en' ? ann.bodyEn : ann.bodyRw}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: SUPPORT REQUESTS */}
      {tab === 'support' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 bg-white border border-black/[0.08] rounded-2xl p-6">
            <h2 className="text-lg font-display font-semibold text-[#0D0D0F] mb-2">
              {lang === 'en' ? 'Request Learner Support' : 'Saba Ubufasha'}
            </h2>
            {platformSettings?.enableSupportTickets === false ? (
              <p className="text-xs text-[#5D5D66] bg-[#F9F9FB] border border-black/[0.08] rounded-xl p-4">
                {lang === 'en'
                  ? 'New support ticket submissions are temporarily paused by administrators. You can still review and reply to existing tickets on the right.'
                  : 'Gufungura ibibazo bishya byahagaritswe by’agateganyo. Ushobora gukomeza kureba ibibazo bisanzwe iburyo.'}
              </p>
            ) : (
              <>
                <p className="text-xs text-[#5D5D66] mb-4">
                  {lang === 'en'
                    ? 'Need help with Mobile Money verification, course access, or a lesson question? Open a ticket.'
                    : 'Ukeneye ubufasha ku bwishyu, amasomo, cyangwa impamyabumenyi? Tanga ikibazo hano.'}
                </p>
                <form onSubmit={handleSubmitSupportTicket} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        {lang === 'en' ? 'Category' : 'Icyiciro'}
                      </label>
                      <select
                        value={ticketCategory}
                        onChange={(e) =>
                          setTicketCategory(e.target.value as SupportTicket['category'])
                        }
                        className="w-full px-3 py-2 text-xs border border-black/15 rounded-lg bg-white"
                      >
                        <option value="access">Course Access</option>
                        <option value="payment">Payment / MoMo</option>
                        <option value="curriculum">Lesson / Quiz</option>
                        <option value="certificate">Certificate</option>
                        <option value="technical">Technical</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        {lang === 'en' ? 'Priority' : 'Uburemere'}
                      </label>
                      <select
                        value={ticketPriority}
                        onChange={(e) =>
                          setTicketPriority(e.target.value as SupportTicket['priority'])
                        }
                        className="w-full px-3 py-2 text-xs border border-black/15 rounded-lg bg-white"
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      {lang === 'en' ? 'Subject' : 'Umutwe w’ikibazo'}
                    </label>
                    <input
                      type="text"
                      required
                      minLength={3}
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="e.g. Confirm MoMo reference MOMO-..."
                      className="w-full px-3.5 py-2 text-sm border border-black/15 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      {lang === 'en' ? 'Details' : 'Ibisobanuro'}
                    </label>
                    <textarea
                      rows={4}
                      required
                      minLength={5}
                      value={ticketDesc}
                      onChange={(e) => setTicketDesc(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-black/15 rounded-lg"
                    />
                  </div>

                  {ticketMsg && (
                    <p className="text-xs text-[#0D7A5F] bg-[#ECFDF5] border border-[#0D7A5F]/20 rounded-lg px-3 py-2">
                      {ticketMsg}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={ticketSaving}
                    className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#0D0D0F] rounded-lg"
                  >
                    {ticketSaving
                      ? lang === 'en'
                        ? 'Submitting...'
                        : 'Biroherezwa...'
                      : lang === 'en'
                        ? 'Submit Support Ticket'
                        : 'Ohereza Ikibazo'}
                  </button>
                </form>
              </>
            )}
          </div>

          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-lg font-display font-semibold text-[#0D0D0F]">
              {lang === 'en' ? 'Your Support Requests' : 'Ibibazo Watanze'}
            </h2>
            {supportTickets.length === 0 ? (
              <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6 text-sm text-[#5D5D66]">
                {lang === 'en' ? 'No support tickets opened yet.' : 'Nta kibazo uratanga.'}
              </div>
            ) : (
              supportTickets.map((tkt) => {
                const thread = ticketMessages
                  .filter((m) => m.ticketId === tkt.id)
                  .sort((a, b) => getTimeMillis(a.createdAt) - getTimeMillis(b.createdAt));

                return (
                  <div
                    key={tkt.id}
                    className="bg-white border border-black/[0.08] rounded-2xl p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[#0D0D0F]">{tkt.subject}</h3>
                      <span className="text-xs font-mono uppercase text-[#0D7A5F]">
                        {tkt.status.replace('_', ' ')} · {tkt.priority}
                      </span>
                    </div>
                    <p className="text-xs text-[#5D5D66]">{tkt.description}</p>
                    {tkt.resolutionNote && (
                      <div className="bg-[#F9F9FB] border border-black/[0.06] rounded-lg p-3 text-xs text-[#0D0D0F]">
                        <strong>Staff Resolution:</strong> {tkt.resolutionNote}
                      </div>
                    )}

                    {/* Conversation Thread */}
                    {thread.length > 0 && (
                      <div className="pt-2 border-t border-black/[0.06] space-y-2">
                        <p className="text-[11px] font-mono text-[#5D5D66] flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          <span>Conversation ({thread.length})</span>
                        </p>
                        {thread.map((msg) => (
                          <div
                            key={msg.id}
                            className={`rounded-xl px-3.5 py-2.5 text-xs ${
                              msg.senderRole === 'staff'
                                ? 'bg-[#F2FBF8] border border-[#0D7A5F]/20 text-[#0D0D0F]'
                                : 'bg-[#F9F9FB] border border-black/[0.06] text-[#0D0D0F]'
                            }`}
                          >
                            <p className="font-semibold text-[11px] text-[#5D5D66] mb-0.5">
                              {msg.senderName} ({msg.senderRole === 'staff' ? 'Support Staff' : 'You'})
                            </p>
                            <p className="whitespace-pre-line">{msg.message}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {tkt.status !== 'closed' && (
                      <div className="pt-2 border-t border-black/[0.06] flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={replyDrafts[tkt.id] || ''}
                          onChange={(e) =>
                            setReplyDrafts((prev) => ({ ...prev, [tkt.id]: e.target.value }))
                          }
                          placeholder={
                            lang === 'en' ? 'Write a reply to support...' : 'Andika igisubizo...'
                          }
                          className="flex-1 px-3 py-1.5 text-xs border border-black/15 rounded-lg"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={replyBusyId === tkt.id || !(replyDrafts[tkt.id] || '').trim()}
                            onClick={() => handleSendTicketReply(tkt)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-[#0D0D0F] rounded-lg disabled:opacity-50"
                          >
                            {lang === 'en' ? 'Send Reply' : 'Ohereza'}
                          </button>
                          <button
                            type="button"
                            disabled={replyBusyId === tkt.id}
                            onClick={() => handleCloseTicket(tkt)}
                            className="px-3 py-1.5 text-xs font-medium border border-black/15 rounded-lg text-[#5D5D66] hover:text-[#0D0D0F]"
                          >
                            {lang === 'en' ? 'Close Ticket' : 'Funga Ikibazo'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 7: ACCOUNT SETTINGS */}
      {tab === 'settings' && (
        <div className="max-w-lg bg-white border border-black/[0.08] rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-display font-semibold text-[#0D0D0F] mb-4">
            {lang === 'en' ? 'Profile, Language & Privacy Settings' : 'Amakuru ya Konti n’Ururimi'}
          </h2>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#0D0D0F] mb-1">
                {lang === 'en' ? 'Display Name (appears on Certificate)' : 'Amazina yawe'}
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-black/15 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#0D0D0F] mb-1">
                {lang === 'en' ? 'Preferred Course Language' : 'Ururimi uhisemo'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeLang('en')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border ${
                    lang === 'en'
                      ? 'bg-[#0D0D0F] text-white border-[#0D0D0F]'
                      : 'bg-white text-[#0D0D0F] border-black/15'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => onChangeLang('rw')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border ${
                    lang === 'rw'
                      ? 'bg-[#0D0D0F] text-white border-[#0D0D0F]'
                      : 'bg-white text-[#0D0D0F] border-black/15'
                  }`}
                >
                  Kinyarwanda
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-black/[0.08] space-y-2.5">
              <label className="flex items-start gap-2.5 text-xs text-[#0D0D0F]">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  {lang === 'en'
                    ? 'I accept the AI Education Rwanda privacy and learner record verification policy.'
                    : 'Nemeye amabwiriza y’ibanga n’ububiko bw’amakuru bya AI Education Rwanda.'}
                  {profile?.privacyConsentAcceptedAt && (
                    <span className="block text-[11px] font-mono text-[#0D7A5F] mt-0.5">
                      Accepted: {profile.privacyConsentAcceptedAt.slice(0, 10)}
                    </span>
                  )}
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-[#0D0D0F]">
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(e) => setMarketingOptIn(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  {lang === 'en'
                    ? 'Receive announcements about upcoming Kigali workshops, cohorts, and new courses.'
                    : 'Nakire amakuru y’amahugurwa mashya i Kigali n’amasomo mashya.'}
                </span>
              </label>
            </div>

            {settingsSaved && (
              <p className="text-xs text-[#0D7A5F]">
                {lang === 'en' ? 'Preferences saved.' : 'Byabitswe neza.'}
              </p>
            )}

            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2.5 text-sm font-medium text-white bg-[#0D0D0F] rounded-lg"
            >
              {savingSettings
                ? lang === 'en'
                  ? 'Saving...'
                  : 'Birabikwa...'
                : lang === 'en'
                  ? 'Save Settings'
                  : 'Bika Impinduka'}
            </button>
          </form>
        </div>
      )}

      {/* Printable Certificate Modal */}
      {printCert && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-black/15 rounded-t-2xl sm:rounded-2xl max-w-2xl w-full max-h-[92dvh] overflow-y-auto p-5 sm:p-8 space-y-6">
            <div className="flex items-center justify-between print:hidden">
              <span className="text-xs font-mono text-[#5D5D66]">Certificate Preview</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#0D7A5F] rounded-lg"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintCert(null)}
                  className="p-1.5 rounded-lg hover:bg-[#F4F5F7]"
                  aria-label="Close certificate preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-2 border-[#0D0D0F] rounded-xl p-8 space-y-6 bg-[#FAFAFC]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-mono tracking-widest uppercase text-[#0D7A5F]">
                    {platformSettings?.certificateOrgName || 'AI Education Rwanda'}
                  </p>
                  <h2 className="text-2xl font-display font-semibold text-[#0D0D0F] mt-1">
                    Certificate of Practical Completion
                  </h2>
                </div>
                <CertificateQrCode value={`${window.location.origin}/?verify=${printCert.id}`} />
              </div>

              <div className="py-4 border-y border-black/10 space-y-2">
                <p className="text-xs text-[#5D5D66]">This certifies that</p>
                <p className="text-3xl font-display font-semibold text-[#0D0D0F]">
                  {printCert.learnerName}
                </p>
                <p className="text-sm text-[#5D5D66]">
                  successfully completed{' '}
                  <strong className="text-[#0D0D0F]">{printCert.courseTitle}</strong> with a final
                  rubric-verified score of{' '}
                  <strong className="text-[#0D0D0F]">{printCert.finalScore}%</strong>.
                </p>
              </div>

              <div className="flex items-end justify-between gap-4 text-xs">
                <div>
                  <p className="font-semibold text-[#0D0D0F]">
                    {platformSettings?.certificateSignatoryName || 'Founder & Academic Director'}
                  </p>
                  <p className="text-[#5D5D66]">
                    {platformSettings?.certificateSignatoryTitle || 'AI Education Rwanda'}
                  </p>
                </div>
                <div className="text-right font-mono text-[#5D5D66]">
                  <p>Certificate ID: {printCert.id}</p>
                  <p>Status: {printCert.status.toUpperCase()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
