import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAnalyticsSummary,
  calculateCouponDiscount,
  evaluateCertificateEligibility,
  formatReleaseDateLabel,
  gradeDynamicQuiz,
  isContentReleased,
  parseReleaseAtMs,
  resolveLessonReleaseLock
} from '../src/lib/domain';
import { buildCourseScaffoldPayload, parseLessonBlocks } from '../src/lib/lessonBlocks';
import {
  BLUEPRINT_GRADING_BREAKDOWN,
  FINAL_PROJECT_RUBRIC_7,
  INDUSTRY_LEARNING_PATHS_PRESETS,
  PRACTICAL_PROJECTS,
  PRODUCTION_INVENTORY_SECTIONS
} from '../src/data/curriculum';
import { isProtectedUploadUrl, UPLOAD_RULES, validateFileClient } from '../src/lib/uploads';
import type {
  Certificate,
  CouponRecord,
  Course,
  CourseModule,
  Enrollment,
  PaymentRecord,
  ProjectSubmission,
  QuizAttempt,
  QuizQuestionItem,
  StructuredLessonRecord,
  SupportTicket
} from '../src/types';

test('parseReleaseAtMs parses Kigali midnight for YYYY-MM-DD and full ISO timestamps', () => {
  assert.equal(parseReleaseAtMs(''), null);
  assert.equal(parseReleaseAtMs(null), null);
  assert.equal(parseReleaseAtMs(undefined), null);
  assert.equal(parseReleaseAtMs('not-a-date'), null);

  // 2026-06-01 midnight Kigali (UTC+2) === 2026-05-31T22:00:00.000Z
  const kigaliMs = parseReleaseAtMs('2026-06-01');
  assert.equal(kigaliMs, Date.parse('2026-05-31T22:00:00.000Z'));

  const isoMs = parseReleaseAtMs('2026-06-15T14:30:00Z');
  assert.equal(isoMs, Date.parse('2026-06-15T14:30:00Z'));
});

test('isContentReleased checks releaseAtMs and fallback releaseAt accurately', () => {
  const now = Date.parse('2026-06-10T10:00:00Z');
  assert.equal(isContentReleased(undefined, undefined, now), true);
  assert.equal(isContentReleased('', 0, now), true);
  assert.equal(isContentReleased('2026-06-01', undefined, now), true);
  assert.equal(isContentReleased('2026-06-20', undefined, now), false);
  assert.equal(
    isContentReleased('2026-06-01', Date.parse('2026-06-20T00:00:00Z'), now),
    false
  );
});

test('resolveLessonReleaseLock enforces strictest future release across module and lesson with staff bypass', () => {
  const now = Date.parse('2026-06-10T10:00:00Z');
  const modPast: CourseModule = {
    id: 'm1',
    courseId: 'challenge-28',
    orderIndex: 1,
    titleEn: 'Week 1',
    titleRw: 'Icyumweru 1',
    releaseAt: '2026-06-01',
    releaseAtMs: Date.parse('2026-05-31T22:00:00.000Z'),
    isPublished: true
  };
  const modFuture: CourseModule = {
    ...modPast,
    id: 'm2',
    orderIndex: 2,
    releaseAt: '2026-06-25',
    releaseAtMs: Date.parse('2026-06-24T22:00:00.000Z')
  };
  const lesUnlocked: StructuredLessonRecord = {
    id: 'l1',
    courseId: 'challenge-28',
    moduleId: 'm1',
    dayNumber: 1,
    weekNumber: 1,
    orderIndex: 1,
    titleEn: 'Day 1',
    titleRw: 'Umunsi 1',
    summaryEn: '',
    summaryRw: '',
    estimatedMinutes: 30,
    isSample: true,
    releaseAtMs: 0
  };
  const lesFutureEarlier: StructuredLessonRecord = {
    ...lesUnlocked,
    id: 'l2',
    moduleId: 'm2',
    dayNumber: 2,
    isSample: false,
    releaseAt: '2026-06-15',
    releaseAtMs: Date.parse('2026-06-14T22:00:00.000Z')
  };
  const lesFutureLater: StructuredLessonRecord = {
    ...lesUnlocked,
    id: 'l3',
    moduleId: 'm2',
    dayNumber: 3,
    isSample: false,
    releaseAt: '2026-07-01',
    releaseAtMs: Date.parse('2026-06-30T22:00:00.000Z')
  };

  // Both released
  const r1 = resolveLessonReleaseLock({
    courseModule: modPast,
    lesson: lesUnlocked,
    isStaff: false,
    nowMs: now
  });
  assert.equal(r1.locked, false);

  // Module locked blocks even an unlocked lesson
  const r2 = resolveLessonReleaseLock({
    courseModule: modFuture,
    lesson: lesUnlocked,
    isStaff: false,
    nowMs: now
  });
  assert.equal(r2.locked, true);
  assert.equal(r2.scope, 'module');
  assert.equal(r2.effectiveReleaseAt, '2026-06-25');

  // Strictest date wins between module and lesson
  const r3 = resolveLessonReleaseLock({
    courseModule: modFuture,
    lesson: lesFutureEarlier,
    isStaff: false,
    nowMs: now
  });
  assert.equal(r3.locked, true);
  assert.equal(r3.scope, 'module');

  const r4 = resolveLessonReleaseLock({
    courseModule: modFuture,
    lesson: lesFutureLater,
    isStaff: false,
    nowMs: now
  });
  assert.equal(r4.locked, true);
  assert.equal(r4.scope, 'lesson');
  assert.equal(r4.effectiveReleaseAt, '2026-07-01');

  // Staff bypass unlocks preview
  const rStaff = resolveLessonReleaseLock({
    courseModule: modFuture,
    lesson: lesFutureLater,
    isStaff: true,
    nowMs: now
  });
  assert.equal(rStaff.locked, false);
  assert.equal(rStaff.effectiveReleaseAtMs, lesFutureLater.releaseAtMs);

  const label = formatReleaseDateLabel('2026-07-01', lesFutureLater.releaseAtMs, 'en');
  assert.ok(label.length >= 4);
});

test('validateFileClient enforces file extension, MIME, non-empty, and size bounds per scope', () => {
  const validPdf = { name: 'report.pdf', type: 'application/pdf', size: 1024 } as unknown as File;
  assert.equal(validateFileClient(validPdf, 'submission'), null);

  const validMedia = { name: 'intro.mp4', type: 'video/mp4', size: 12 * 1024 * 1024 } as unknown as File;
  assert.equal(validateFileClient(validMedia, 'course_media'), null);

  const tooBigSubmission = {
    name: 'huge.pdf',
    type: 'application/pdf',
    size: UPLOAD_RULES.submission.maxBytes + 1
  } as unknown as File;
  assert.match(validateFileClient(tooBigSubmission, 'submission') || '', /exceeds/i);

  const badExt = { name: 'payload.html', type: 'text/html', size: 500 } as unknown as File;
  assert.match(validateFileClient(badExt, 'submission') || '', /Unsupported file extension/i);

  const emptyFile = { name: 'empty.pdf', type: 'application/pdf', size: 0 } as unknown as File;
  assert.match(validateFileClient(emptyFile, 'resource') || '', /empty/i);

  assert.equal(isProtectedUploadUrl('/api/files/file_0123456789abcdef0123'), true);
  assert.equal(isProtectedUploadUrl('https://example.com/resource.pdf'), false);
});

test('calculateCouponDiscount handles percentage, fixed, expiry, maxUses, and course restriction', () => {
  const pctCoupon: CouponRecord = {
    id: 'c1',
    code: 'KIGALI25',
    discountType: 'percent',
    discountValue: 25,
    courseId: 'challenge-28',
    maxUses: 100,
    usedCount: 5,
    expiresAt: '2026-12-31',
    isActive: true
  };
  const r1 = calculateCouponDiscount(20000, pctCoupon, 'challenge-28', '2026-06-01');
  assert.equal(r1.valid, true);
  assert.equal(r1.discountRwf, 5000);
  assert.equal(r1.netAmountRwf, 15000);

  const expired = calculateCouponDiscount(20000, pctCoupon, 'challenge-28', '2027-01-01');
  assert.equal(expired.valid, false);
  assert.equal(expired.netAmountRwf, 20000);

  const wrongCourse = calculateCouponDiscount(20000, pctCoupon, 'other-course', '2026-06-01');
  assert.equal(wrongCourse.valid, false);

  const maxed: CouponRecord = { ...pctCoupon, maxUses: 5, usedCount: 5 };
  assert.equal(calculateCouponDiscount(20000, maxed, 'challenge-28', '2026-06-01').valid, false);

  const fixedFull: CouponRecord = {
    ...pctCoupon,
    courseId: 'all',
    discountType: 'fixed_rwf',
    discountValue: 50000
  };
  const rFree = calculateCouponDiscount(20000, fixedFull, 'challenge-28', '2026-06-01');
  assert.equal(rFree.valid, true);
  assert.equal(rFree.discountRwf, 20000);
  assert.equal(rFree.netAmountRwf, 0);
});

test('gradeDynamicQuiz, evaluateCertificateEligibility, and buildAnalyticsSummary compute exact totals', () => {
  const questions: QuizQuestionItem[] = [
    {
      id: 'q1',
      type: 'multiple_choice',
      questionEn: 'What is a structured prompt?',
      questionRw: 'Ibwiriza ryiza ni iki?',
      optionsEn: ['Role+Context+Task', 'Random word'],
      optionsRw: ['A', 'B'],
      correctIndex: 0,
      marks: 2,
      explanationEn: 'Structured prompts combine role, context, and task.',
      explanationRw: 'Ibwiriza ryiza rihuza uruhare, imiterere, n’igikorwa.'
    },
    {
      id: 'q2',
      type: 'short_answer',
      questionEn: 'Capital of Rwanda?',
      questionRw: 'Umurwa mukuru w’u Rwanda?',
      optionsEn: [],
      optionsRw: [],
      correctIndex: 0,
      correctText: 'Kigali',
      marks: 2,
      explanationEn: 'Kigali is the capital city of Rwanda.',
      explanationRw: 'Kigali ni umurwa mukuru w’u Rwanda.'
    }
  ];
  const quizRes = gradeDynamicQuiz(questions, { q1: 0, q2: 'kigali' }, 70);
  assert.equal(quizRes.score, 100);
  assert.equal(quizRes.earnedMarks, 4);
  assert.equal(quizRes.passed, true);

  const course: Course = {
    id: 'challenge-28',
    slug: '28-day-practical-ai-challenge',
    code: 'AI-28',
    status: 'active',
    category: 'foundations',
    durationDays: 4,
    priceRwf: 20000,
    levelRange: 'L1-L7',
    title: { en: '28-Day Challenge', rw: 'Iminsi 28' },
    subtitle: { en: 'Practical AI', rw: 'AI ngiro' },
    description: { en: '', rw: '' },
    outcomes: { en: [], rw: [] },
    audience: { en: [], rw: [] },
    deviceNote: { en: 'Phone or Laptop', rw: 'Telefoni cyangwa mudasobwa' }
  };
  const enr: Enrollment = {
    id: 'u1_challenge-28',
    userId: 'u1',
    userName: 'Aline',
    userEmail: 'aline@example.com',
    courseId: 'challenge-28',
    status: 'active',
    amountRwf: 20000,
    currentDay: 4,
    completedDays: [1, 2, 3, 4],
    paymentRef: 'MOMO-123'
  };
  const attempts: QuizAttempt[] = [
    {
      id: 'qa1',
      userId: 'u1',
      courseId: 'challenge-28',
      weekNumber: 1,
      score: 80,
      totalQuestions: 2,
      correctCount: 2
    }
  ];
  const submissions: ProjectSubmission[] = [
    {
      id: 's1',
      userId: 'u1',
      userName: 'Aline',
      userEmail: 'aline@example.com',
      courseId: 'challenge-28',
      projectKey: 'study_assistant',
      title: 'Capstone',
      problemStatement: 'Automated study plan generator',
      toolsUsed: ['Gemini'],
      artifactUrl: '/api/files/file_0123456789abcdef0123',
      documentationSummary: 'Done',
      status: 'approved',
      score: 90
    }
  ];
  const certs: Certificate[] = [];

  const elig = evaluateCertificateEligibility({
    enrollment: enr,
    course,
    quizAttempts: attempts,
    submissions,
    existingCerts: certs
  });
  assert.equal(elig.eligible, true);
  assert.equal(elig.completionPct, 100);
  assert.equal(elig.weightedFinalScore, 88);

  const payments: PaymentRecord[] = [
    {
      id: 'pay1',
      userId: 'u1',
      courseId: 'challenge-28',
      provider: 'mtn_momo',
      phoneMasked: '+250 788 *** 56',
      amountRwf: 20000,
      transactionRef: 'MOMO-1',
      status: 'verified'
    },
    {
      id: 'pay2',
      userId: 'u2',
      courseId: 'challenge-28',
      provider: 'airtel_money',
      phoneMasked: '+250 738 *** 56',
      amountRwf: 5000,
      transactionRef: 'AIRTEL-2',
      status: 'refunded'
    }
  ];
  const tickets: SupportTicket[] = [
    {
      id: 't1',
      userId: 'u1',
      userEmail: 'aline@example.com',
      userName: 'Aline',
      subject: 'Help',
      description: 'Need syllabus unlock info',
      category: 'access',
      priority: 'normal',
      status: 'open'
    }
  ];

  const summary = buildAnalyticsSummary({
    enrollments: [enr],
    courses: [course],
    payments,
    quizAttempts: attempts,
    supportTickets: tickets
  });
  assert.equal(summary.grossVerifiedRwf, 20000);
  assert.equal(summary.refundedRwf, 5000);
  assert.equal(summary.netRevenueRwf, 15000);
  assert.equal(summary.completedLearners, 1);
  assert.equal(summary.openTicketsCount, 1);
});

test('Blueprint v1.0 curriculum constants and universal buildCourseScaffoldPayload work consistently', () => {
  assert.equal(PRACTICAL_PROJECTS.length, 6);
  assert.ok(PRACTICAL_PROJECTS.some((p) => p.key === 'independent_final'));

  const weightTotal = BLUEPRINT_GRADING_BREAKDOWN.reduce((acc, w) => acc + w.weightPct, 0);
  assert.equal(weightTotal, 100);

  const rubricTotal = FINAL_PROJECT_RUBRIC_7.reduce((acc, c) => acc + c.weightPct, 0);
  assert.equal(rubricTotal, 100);

  assert.equal(INDUSTRY_LEARNING_PATHS_PRESETS.length, 8);
  const inventoryTotal = PRODUCTION_INVENTORY_SECTIONS.reduce((acc, s) => acc + s.items.length, 0);
  assert.equal(inventoryTotal, 62);

  const scaffold = buildCourseScaffoldPayload({
    courseId: 'ai-sme-202',
    courseTitleEn: 'AI for Rwandan SMEs',
    courseTitleRw: 'AI ku Bigabanya Umurimo',
    weekCount: 3,
    daysCount: 15,
    levelTag: 'Level 3'
  });

  assert.equal(scaffold.modules.length, 3);
  assert.equal(scaffold.lessons.length, 15);
  assert.equal(scaffold.lessons[0].isSample, true);
  assert.equal(scaffold.lessons[0].moduleId, 'ai-sme-202_mod_w1');
  assert.equal(scaffold.lessons[14].weekNumber, 3);
  assert.ok(parseLessonBlocks(scaffold.lessons[0].blocksEnJson).length >= 12);
  assert.ok(parseLessonBlocks(scaffold.lessons[0].blocksRwJson).length >= 12);
});
