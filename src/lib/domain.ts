import type {
  Certificate,
  Cohort,
  CouponRecord,
  Course,
  CourseModule,
  DynamicQuiz,
  Enrollment,
  Language,
  PaymentRecord,
  ProjectSubmission,
  QuizAttempt,
  QuizQuestionItem,
  StructuredLessonRecord,
  SupportTicket
} from '../types';

export interface CouponValidationResult {
  valid: boolean;
  discountRwf: number;
  netAmountRwf: number;
  reason?: string;
}

export function calculateCouponDiscount(
  priceRwf: number,
  coupon: CouponRecord | null,
  courseId: string,
  todayIso = new Date().toISOString().slice(0, 10)
): CouponValidationResult {
  const basePrice = Math.max(0, Math.round(priceRwf));
  if (!coupon) {
    return { valid: false, discountRwf: 0, netAmountRwf: basePrice, reason: 'Coupon code not found.' };
  }
  if (!coupon.isActive) {
    return { valid: false, discountRwf: 0, netAmountRwf: basePrice, reason: 'This coupon is currently inactive.' };
  }
  if (coupon.courseId !== 'all' && coupon.courseId !== courseId) {
    return { valid: false, discountRwf: 0, netAmountRwf: basePrice, reason: 'Coupon does not apply to this course.' };
  }
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, discountRwf: 0, netAmountRwf: basePrice, reason: 'Coupon usage limit has been reached.' };
  }
  if (coupon.expiresAt && coupon.expiresAt < todayIso) {
    return { valid: false, discountRwf: 0, netAmountRwf: basePrice, reason: 'This coupon has expired.' };
  }

  let discount = 0;
  if (coupon.discountType === 'percent') {
    const pct = Math.max(0, Math.min(100, coupon.discountValue));
    discount = Math.round((basePrice * pct) / 100);
  } else {
    discount = Math.round(Math.max(0, coupon.discountValue));
  }
  discount = Math.min(basePrice, discount);
  const net = Math.max(0, basePrice - discount);

  return {
    valid: true,
    discountRwf: discount,
    netAmountRwf: net
  };
}

export function parseQuizQuestions(questionsJson?: string): QuizQuestionItem[] {
  if (!questionsJson) return [];
  try {
    const parsed = JSON.parse(questionsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (q): q is QuizQuestionItem =>
        Boolean(q && typeof q === 'object' && typeof q.id === 'string' && typeof q.questionEn === 'string')
    );
  } catch {
    return [];
  }
}

export interface QuizGradeResult {
  score: number;
  earnedMarks: number;
  totalMarks: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
}

export function gradeDynamicQuiz(
  questions: QuizQuestionItem[],
  answers: Record<string, string | number>,
  passThreshold = 70
): QuizGradeResult {
  if (questions.length === 0) {
    return {
      score: 0,
      earnedMarks: 0,
      totalMarks: 0,
      correctCount: 0,
      totalQuestions: 0,
      passed: false
    };
  }

  let totalMarks = 0;
  let earnedMarks = 0;
  let correctCount = 0;

  for (const q of questions) {
    const marks = Math.max(1, Number(q.marks || 1));
    totalMarks += marks;
    const given = answers[q.id];

    if (q.type === 'short_answer') {
      const expected = (q.correctText || '').trim().toLowerCase();
      const actual = typeof given === 'string' ? given.trim().toLowerCase() : '';
      if (expected && actual && (actual === expected || actual.includes(expected))) {
        earnedMarks += marks;
        correctCount += 1;
      }
    } else {
      if (typeof given === 'number' && given === q.correctIndex) {
        earnedMarks += marks;
        correctCount += 1;
      }
    }
  }

  const score = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0;
  return {
    score,
    earnedMarks,
    totalMarks,
    correctCount,
    totalQuestions: questions.length,
    passed: score >= passThreshold
  };
}

export interface CertificateEligibilityResult {
  eligible: boolean;
  alreadyIssued: boolean;
  completionPct: number;
  quizAvg: number;
  projectScore: number;
  weightedFinalScore: number;
  reasons: string[];
}

export function evaluateCertificateEligibility(params: {
  enrollment: Enrollment;
  course?: Course;
  quizAttempts: QuizAttempt[];
  submissions: ProjectSubmission[];
  existingCerts: Certificate[];
  minQuizAvg?: number;
  minProjectScore?: number;
}): CertificateEligibilityResult {
  const {
    enrollment,
    course,
    quizAttempts,
    submissions,
    existingCerts,
    minQuizAvg = 70,
    minProjectScore = 70
  } = params;

  const durationDays = Math.max(1, course?.durationDays ?? 28);
  const completionPct = Math.min(
    100,
    Math.round((enrollment.completedDays.length / durationDays) * 100)
  );

  const userQuizzes = quizAttempts.filter(
    (q) => q.userId === enrollment.userId && q.courseId === enrollment.courseId
  );
  const bestByBucket = new Map<string, number>();
  for (const qa of userQuizzes) {
    const key = qa.quizId || `week_${qa.weekNumber}`;
    const prev = bestByBucket.get(key) ?? 0;
    if (qa.score > prev) bestByBucket.set(key, qa.score);
  }
  const scores = Array.from(bestByBucket.values());
  const quizAvg =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const userSubs = submissions.filter(
    (s) =>
      s.userId === enrollment.userId &&
      s.courseId === enrollment.courseId &&
      s.status === 'approved' &&
      typeof s.score === 'number'
  );
  const projectScore =
    userSubs.length > 0 ? Math.max(...userSubs.map((s) => Number(s.score ?? 0))) : 0;

  const weightedFinalScore = Math.round(quizAvg * 0.2 + projectScore * 0.8);

  const alreadyIssued = existingCerts.some(
    (c) =>
      c.userId === enrollment.userId &&
      c.courseId === enrollment.courseId &&
      c.status === 'valid'
  );

  const reasons: string[] = [];
  if (enrollment.status !== 'active') reasons.push('Enrollment is not active');
  if (completionPct < 100) reasons.push(`Lessons ${completionPct}% / 100%`);
  if (quizAvg < minQuizAvg) reasons.push(`Quiz avg ${quizAvg}% < ${minQuizAvg}%`);
  if (projectScore < minProjectScore) reasons.push(`Project ${projectScore}% < ${minProjectScore}%`);

  return {
    eligible: reasons.length === 0 && !alreadyIssued,
    alreadyIssued,
    completionPct,
    quizAvg,
    projectScore,
    weightedFinalScore,
    reasons
  };
}

export interface AnalyticsSummary {
  totalEnrollments: number;
  activeEnrollments: number;
  startedLearners: number;
  completedLearners: number;
  completionRatePct: number;
  progressBuckets: Array<{ label: string; count: number }>;
  grossVerifiedRwf: number;
  totalDiscountsRwf: number;
  refundedRwf: number;
  netRevenueRwf: number;
  quizAttemptsCount: number;
  quizAvgScore: number;
  quizPassRatePct: number;
  openTicketsCount: number;
  resolvedTicketsCount: number;
}

export function buildAnalyticsSummary(params: {
  enrollments: Enrollment[];
  courses: Course[];
  payments: PaymentRecord[];
  quizAttempts: QuizAttempt[];
  supportTickets: SupportTicket[];
  cohorts?: Cohort[];
  quizzes?: DynamicQuiz[];
}): AnalyticsSummary {
  const { enrollments, courses, payments, quizAttempts, supportTickets } = params;
  const activeEnrs = enrollments.filter((e) => e.status === 'active');
  const startedLearners = activeEnrs.filter((e) => e.completedDays.length > 0).length;

  let completedLearners = 0;
  const buckets = {
    notStarted: 0,
    early: 0,
    mid: 0,
    almost: 0,
    completed: 0
  };

  for (const enr of activeEnrs) {
    const course = courses.find((c) => c.id === enr.courseId);
    const totalDays = Math.max(1, course?.durationDays ?? 28);
    const pct = Math.min(100, Math.round((enr.completedDays.length / totalDays) * 100));
    if (pct === 0) buckets.notStarted += 1;
    else if (pct <= 25) buckets.early += 1;
    else if (pct <= 75) buckets.mid += 1;
    else if (pct < 100) buckets.almost += 1;
    else {
      buckets.completed += 1;
      completedLearners += 1;
    }
  }

  const verifiedPays = payments.filter((p) => p.status === 'verified');
  const refundedPays = payments.filter((p) => p.status === 'refunded');
  const grossVerifiedRwf = verifiedPays.reduce((acc, p) => acc + Number(p.amountRwf || 0), 0);
  const totalDiscountsRwf = verifiedPays.reduce((acc, p) => acc + Number(p.discountRwf || 0), 0);
  const refundedRwf = refundedPays.reduce((acc, p) => acc + Number(p.amountRwf || 0), 0);

  const quizAvgScore =
    quizAttempts.length > 0
      ? Math.round(quizAttempts.reduce((acc, q) => acc + q.score, 0) / quizAttempts.length)
      : 0;
  const quizPassRatePct =
    quizAttempts.length > 0
      ? Math.round(
          (quizAttempts.filter((q) => (typeof q.passed === 'boolean' ? q.passed : q.score >= 70)).length /
            quizAttempts.length) *
            100
        )
      : 0;

  return {
    totalEnrollments: enrollments.length,
    activeEnrollments: activeEnrs.length,
    startedLearners,
    completedLearners,
    completionRatePct:
      activeEnrs.length > 0 ? Math.round((completedLearners / activeEnrs.length) * 100) : 0,
    progressBuckets: [
      { label: '0% (Not Started)', count: buckets.notStarted },
      { label: '1% – 25%', count: buckets.early },
      { label: '26% – 75%', count: buckets.mid },
      { label: '76% – 99%', count: buckets.almost },
      { label: '100% Completed', count: buckets.completed }
    ],
    grossVerifiedRwf,
    totalDiscountsRwf,
    refundedRwf,
    netRevenueRwf: Math.max(0, grossVerifiedRwf - refundedRwf),
    quizAttemptsCount: quizAttempts.length,
    quizAvgScore,
    quizPassRatePct,
    openTicketsCount: supportTickets.filter(
      (t) => t.status === 'open' || t.status === 'in_progress'
    ).length,
    resolvedTicketsCount: supportTickets.filter(
      (t) => t.status === 'resolved' || t.status === 'closed'
    ).length
  };
}

export function parseReleaseAtMs(releaseAt?: string | null): number | null {
  if (!releaseAt || typeof releaseAt !== 'string') return null;
  const trimmed = releaseAt.trim();
  if (!trimmed) return null;
  // Date-only strings (YYYY-MM-DD) release at midnight Kigali time (UTC+2)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const ms = Date.parse(`${trimmed}T00:00:00+02:00`);
    return Number.isFinite(ms) ? ms : null;
  }
  const ms = Date.parse(trimmed);
  return Number.isFinite(ms) ? ms : null;
}

export function isContentReleased(
  releaseAt?: string | null,
  releaseAtMs?: number | null,
  nowMs = Date.now()
): boolean {
  const effectiveMs =
    typeof releaseAtMs === 'number' && Number.isFinite(releaseAtMs) && releaseAtMs > 0
      ? releaseAtMs
      : parseReleaseAtMs(releaseAt);
  if (effectiveMs === null) return true;
  return nowMs >= effectiveMs;
}

export interface LessonReleaseLockResult {
  locked: boolean;
  scope: 'module' | 'lesson' | null;
  effectiveReleaseAt?: string;
  effectiveReleaseAtMs: number | null;
}

export function resolveLessonReleaseLock(params: {
  courseModule?: CourseModule | null;
  lesson?: StructuredLessonRecord | null;
  isStaff?: boolean;
  nowMs?: number;
}): LessonReleaseLockResult {
  const { courseModule, lesson, isStaff = false, nowMs = Date.now() } = params;

  const modMs =
    typeof courseModule?.releaseAtMs === 'number' && Number.isFinite(courseModule.releaseAtMs)
      ? courseModule.releaseAtMs
      : parseReleaseAtMs(courseModule?.releaseAt);

  const lesMs =
    typeof lesson?.releaseAtMs === 'number' && Number.isFinite(lesson.releaseAtMs)
      ? lesson.releaseAtMs
      : parseReleaseAtMs(lesson?.releaseAt);

  let effectiveMs: number | null = null;
  let effectiveReleaseAt: string | undefined;
  let scope: 'module' | 'lesson' | null = null;

  if (modMs !== null && (lesMs === null || modMs >= lesMs)) {
    effectiveMs = modMs;
    effectiveReleaseAt = courseModule?.releaseAt;
    scope = 'module';
  } else if (lesMs !== null) {
    effectiveMs = lesMs;
    effectiveReleaseAt = lesson?.releaseAt;
    scope = 'lesson';
  }

  if (effectiveMs === null) {
    return { locked: false, scope: null, effectiveReleaseAtMs: null };
  }

  const isFuture = nowMs < effectiveMs;
  if (isStaff || !isFuture) {
    return {
      locked: false,
      scope: isFuture ? scope : null,
      effectiveReleaseAt,
      effectiveReleaseAtMs: effectiveMs
    };
  }

  return {
    locked: true,
    scope,
    effectiveReleaseAt,
    effectiveReleaseAtMs: effectiveMs
  };
}

export function formatReleaseDateLabel(
  releaseAt?: string | null,
  releaseAtMs?: number | null,
  lang: Language = 'en'
): string {
  const ms =
    typeof releaseAtMs === 'number' && Number.isFinite(releaseAtMs)
      ? releaseAtMs
      : parseReleaseAtMs(releaseAt);
  if (ms === null) return releaseAt || '';
  try {
    const locale = lang === 'rw' ? 'rw-RW' : 'en-RW';
    const hasTime = Boolean(releaseAt && /T\d{2}:\d{2}/.test(releaseAt));
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      ...(hasTime ? { timeStyle: 'short' } : {}),
      timeZone: 'Africa/Kigali'
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString().slice(0, 10);
  }
}

