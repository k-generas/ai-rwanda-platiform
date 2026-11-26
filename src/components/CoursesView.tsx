import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  FileText,
  Flag,
  Laptop,
  List,
  Lock,
  Play,
  Search,
  Smartphone,
  Tag
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  arrayUnion,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  Cohort,
  CouponRecord,
  Course,
  CourseModule,
  Enrollment,
  Language,
  LearnerNote,
  LearningPath,
  LessonContent,
  PageRoute,
  PlatformSettings,
  StructuredLessonRecord
} from '../types';
import {
  BLUEPRINT_GRADING_BREAKDOWN,
  COURSES,
  FINAL_PROJECT_RUBRIC_7,
  INDUSTRY_LEARNING_PATHS_PRESETS,
  LEARNING_LEVELS
} from '../data/curriculum';
import { LESSONS_28 } from '../data/lessons28';
import { parseLessonBlocks } from '../lib/lessonBlocks';
import {
  calculateCouponDiscount,
  formatReleaseDateLabel,
  resolveLessonReleaseLock
} from '../lib/domain';
import { CourseArtwork, LuminousCover, type LuminousCoverVariant } from './BrandVisuals';
import { Day2LessonView } from './Day2LessonView';
import { LessonBlocksRenderer } from './LessonBlocksRenderer';

interface CoursesViewProps {
  lang: Language;
  courses: Course[];
  modules: CourseModule[];
  learningPaths: LearningPath[];
  structuredLessons: StructuredLessonRecord[];
  cohorts?: Cohort[];
  learnerNotes?: LearnerNote[];
  platformSettings?: PlatformSettings | null;
  selectedCourseId: string | null;
  selectedDay: number | null;
  initialCategoryFilter?: string;
  user: User | null;
  enrollments: Enrollment[];
  isAdmin: boolean;
  customLessonsMap: Record<number, Partial<LessonContent>>;
  onSelectCourse: (courseId: string | null) => void;
  onSelectDay: (day: number | null) => void;
  onSignIn: () => void;
  onNavigate?: (route: PageRoute) => void;
  onEnrollmentSuccess: () => void;
  onNotesUpdated?: () => void;
  onSubmitWaitlist: (courseSlug: string, name: string, email: string) => Promise<void>;
}

const COURSE_CATALOG_COVERS: Record<string, LuminousCoverVariant> = {
  foundations: 'emerald',
  prompting: 'teal',
  automation: 'amber',
  agents: 'lime',
  industry: 'coral'
};

export function CoursesView({
  lang,
  courses,
  modules,
  learningPaths,
  structuredLessons,
  cohorts = [],
  learnerNotes = [],
  platformSettings,
  selectedCourseId,
  selectedDay,
  initialCategoryFilter = 'all',
  user,
  enrollments,
  isAdmin,
  customLessonsMap,
  onSelectCourse,
  onSelectDay,
  onSignIn,
  onNavigate,
  onEnrollmentSuccess,
  onNotesUpdated,
  onSubmitWaitlist
}: CoursesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategoryFilter);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [cardOutlineOpen, setCardOutlineOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCategoryFilter(initialCategoryFilter);
  }, [initialCategoryFilter]);

  const [openWeek, setOpenWeek] = useState<number>(1);
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [railSearch, setRailSearch] = useState('');
  const [railWeekFilter, setRailWeekFilter] = useState<'all' | number>('all');
  const [syllabusSearch, setSyllabusSearch] = useState('');
  const [syllabusWeekFilter, setSyllabusWeekFilter] = useState<'all' | number>('all');
  const [expandAllSyllabus, setExpandAllSyllabus] = useState(false);
  const [showAllOutcomes, setShowAllOutcomes] = useState(false);
  const [detailTab, setDetailTab] = useState<'syllabus' | 'blueprint'>('syllabus');
  const [lastVisitedByCourse, setLastVisitedByCourse] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem('aer_last_visited_day');
      return raw ? (JSON.parse(raw) as Record<string, number>) : {};
    } catch {
      return {};
    }
  });
  const [copiedDay, setCopiedDay] = useState<number | null>(null);
  const [quizAnswer, setQuizAnswer] = useState<Record<number, number | null>>({});
  const [markingComplete, setMarkingComplete] = useState(false);
  const [freeEnrolling, setFreeEnrolling] = useState(false);

  // Study Notes & Bookmark state for current lesson
  const [noteText, setNoteText] = useState('');
  const [noteBookmarked, setNoteBookmarked] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [noteSavedMsg, setNoteSavedMsg] = useState<string | null>(null);

  // Payment Checkout Modal + Coupon + Cohort state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');
  const [provider, setProvider] = useState<'mtn_momo' | 'airtel_money'>('mtn_momo');
  const [phone, setPhone] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountRwf: number;
    netAmountRwf: number;
  } | null>(null);
  const [couponFeedback, setCouponFeedback] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [freeEnrollError, setFreeEnrollError] = useState<string | null>(null);
  const [paySuccessInfo, setPaySuccessInfo] = useState<{
    transactionRef: string;
    status: 'pending' | 'verified';
    gatewayMessage?: string;
  } | null>(null);

  // Waitlist Modal state
  const [waitlistCourse, setWaitlistCourse] = useState<Course | null>(null);
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistDone, setWaitlistDone] = useState(false);
  const [waitlistBusy, setWaitlistBusy] = useState(false);

  const catalog = courses.length > 0 ? courses : COURSES;
  const activeCourse = selectedCourseId
    ? catalog.find((c) => c.id === selectedCourseId) ?? null
    : null;

  const activeEnrollment = activeCourse
    ? enrollments.find((e) => e.courseId === activeCourse.id && e.status === 'active') ?? null
    : null;

  const pendingEnrollment = activeCourse
    ? enrollments.find((e) => e.courseId === activeCourse.id && e.status === 'pending') ?? null
    : null;

  const hasFullAccess = Boolean(activeEnrollment) || isAdmin;

  // Persist last visited day per course & smooth scroll to top on lesson navigation
  useEffect(() => {
    if (!activeCourse || selectedDay === null) return;
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      try {
        setLastVisitedByCourse((prev) => {
          if (prev[activeCourse.id] === selectedDay) return prev;
          const next = { ...prev, [activeCourse.id]: selectedDay };
          window.localStorage.setItem('aer_last_visited_day', JSON.stringify(next));
          return next;
        });
      } catch {
        // Ignore storage restrictions
      }
    }
    const existingNote = learnerNotes.find(
      (n) => n.courseId === activeCourse.id && n.dayNumber === selectedDay
    );
    setNoteText(existingNote?.noteText || '');
    setNoteBookmarked(Boolean(existingNote?.bookmarked));
    setNoteSavedMsg(null);
    setDrawerOpen(false);
  }, [activeCourse?.id, selectedDay, learnerNotes]);

  // Fast keyboard navigation inside Lesson Reader (Alt + Left / Alt + Right)
  useEffect(() => {
    if (!activeCourse || selectedDay === null) return;
    const maxDays = Math.max(activeCourse.durationDays || 1, activeCourse.id === 'challenge-28' ? 28 : 1);
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const targetTag = (e.target as HTMLElement | null)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') return;
      if (e.key === 'ArrowLeft' && selectedDay > 1) {
        e.preventDefault();
        onSelectDay(selectedDay - 1);
      } else if (e.key === 'ArrowRight' && selectedDay < maxDays) {
        e.preventDefault();
        onSelectDay(selectedDay + 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeCourse?.id, activeCourse?.durationDays, selectedDay, onSelectDay]);

  const resumeBanner = useMemo(() => {
    const firstActive = enrollments.find((e) => e.status === 'active');
    if (firstActive) {
      const c = catalog.find((x) => x.id === firstActive.courseId);
      if (c) {
        return {
          course: c,
          day: lastVisitedByCourse[c.id] || firstActive.currentDay || 1,
          completedCount: firstActive.completedDays.length
        };
      }
    }
    const localIds = Object.keys(lastVisitedByCourse);
    for (const cid of localIds) {
      const c = catalog.find((x) => x.id === cid);
      if (c) {
        return {
          course: c,
          day: lastVisitedByCourse[cid],
          completedCount: 0
        };
      }
    }
    return null;
  }, [enrollments, catalog, lastVisitedByCourse]);

  const filteredCatalog = catalog.filter((course) => {
    const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter;
    const matchesLevel =
      levelFilter === 'all' || course.levelRange.toLowerCase().includes(levelFilter.toLowerCase());
    const isFreeCourse = Boolean(course.isFree || course.priceRwf === 0);
    const matchesPrice =
      priceFilter === 'all' || (priceFilter === 'free' ? isFreeCourse : !isFreeCourse);
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      course.title.en.toLowerCase().includes(q) ||
      course.title.rw.toLowerCase().includes(q) ||
      course.subtitle.en.toLowerCase().includes(q) ||
      course.subtitle.rw.toLowerCase().includes(q);
    return matchesCategory && matchesLevel && matchesPrice && matchesQuery;
  });

  const handleToggleCompare = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompareIds((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : prev.length < 3
          ? [...prev, courseId]
          : prev
    );
  };

  const handleCopyTemplate = (day: number, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedDay(day);
      setTimeout(() => setCopiedDay(null), 2000);
    });
  };

  const handleMarkDayComplete = async (dayNumber: number) => {
    if (!user || !activeCourse || !activeEnrollment) return;
    const courseStructured = structuredLessons.filter((l) => l.courseId === activeCourse.id);
    const structuredRec = courseStructured.find((l) => l.dayNumber === dayNumber) ?? null;
    const staticLesson =
      activeCourse.id === 'challenge-28'
        ? LESSONS_28.find((l) => l.dayNumber === dayNumber) ?? null
        : null;
    const weekNumber = structuredRec?.weekNumber ?? staticLesson?.weekNumber ?? 1;
    const parentModule = structuredRec?.moduleId
      ? modules.find((m) => m.id === structuredRec.moduleId) ?? null
      : modules.find((m) => m.courseId === activeCourse.id && m.orderIndex === weekNumber - 1) ?? null;
    const releaseLock = resolveLessonReleaseLock({
      courseModule: parentModule,
      lesson: structuredRec,
      isStaff: isAdmin
    });
    if (releaseLock.locked) return;

    setMarkingComplete(true);
    const totalCourseDays = Math.max(
      activeCourse.durationDays || 1,
      courseStructured.length,
      activeCourse.id === 'challenge-28' ? 28 : 1
    );
    const enrollmentPath = `enrollments/${user.uid}_${activeCourse.id}`;
    try {
      await updateDoc(doc(db, 'enrollments', `${user.uid}_${activeCourse.id}`), {
        completedDays: arrayUnion(dayNumber),
        currentDay: Math.min(totalCourseDays, dayNumber + 1),
        updatedAt: serverTimestamp()
      });
      onEnrollmentSuccess();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, enrollmentPath);
    } finally {
      setMarkingComplete(false);
    }
  };

  const handleFreeEnroll = async () => {
    if (!user || !activeCourse) return;
    setFreeEnrolling(true);
    setFreeEnrollError(null);
    const enrollmentId = `${user.uid}_${activeCourse.id}`;
    const openCohorts = cohorts.filter(
      (ch) => ch.courseId === activeCourse.id && (ch.status === 'enrolling' || ch.status === 'active')
    );
    const pickedCohort =
      openCohorts.find((c) => c.id === selectedCohortId) ?? openCohorts[0] ?? null;

    try {
      await runTransaction(db, async (tx) => {
        const enrRef = doc(db, 'enrollments', enrollmentId);
        const existingEnr = await tx.get(enrRef);
        if (existingEnr.exists()) {
          throw new Error(
            lang === 'en' ? 'You are already enrolled in this course.' : 'Wariyandikishije kuri iri somo.'
          );
        }

        if (pickedCohort) {
          const cohRef = doc(db, 'cohorts', pickedCohort.id);
          const cohSnap = await tx.get(cohRef);
          if (cohSnap.exists()) {
            const coh = cohSnap.data() as Cohort;
            const currentCount = Number(coh.enrolledCount ?? 0);
            if (coh.capacity > 0 && currentCount >= coh.capacity) {
              throw new Error(
                lang === 'en'
                  ? `Cohort ${coh.name} has reached capacity.`
                  : `Icyiciro ${coh.name} cyuzuye.`
              );
            }
            tx.update(cohRef, {
              enrolledCount: currentCount + 1,
              updatedAt: serverTimestamp()
            });
          }
        }

        tx.set(enrRef, {
          id: enrollmentId,
          userId: user.uid,
          courseId: activeCourse.id,
          userEmail: user.email || '',
          userName: user.displayName || 'Learner',
          status: 'active',
          accessType: 'free',
          paymentRef: 'FREE_ACCESS',
          amountRwf: 0,
          ...(pickedCohort ? { cohortId: pickedCohort.id, cohortName: pickedCohort.name } : {}),
          completedDays: [],
          currentDay: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      onEnrollmentSuccess();
    } catch (err) {
      if (err instanceof Error && !err.message.includes('permission')) {
        setFreeEnrollError(err.message);
      } else {
        handleFirestoreError(err, OperationType.CREATE, `enrollments/${enrollmentId}`);
      }
    } finally {
      setFreeEnrolling(false);
    }
  };

  const handleSaveStudyNote = async (nextBookmarked = noteBookmarked) => {
    if (!user || !activeCourse || selectedDay === null) return;
    setSavingNote(true);
    setNoteSavedMsg(null);
    const noteId = `${user.uid}_${activeCourse.id}_${selectedDay}`;
    try {
      await setDoc(doc(db, 'learnerNotes', noteId), {
        id: noteId,
        userId: user.uid,
        courseId: activeCourse.id,
        dayNumber: selectedDay,
        bookmarked: nextBookmarked,
        noteText: noteText.trim(),
        updatedAt: serverTimestamp()
      });
      setNoteBookmarked(nextBookmarked);
      setNoteSavedMsg(lang === 'en' ? 'Saved to your study notes.' : 'Byabitswe mu nyandiko zawe.');
      onNotesUpdated?.();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `learnerNotes/${noteId}`);
    } finally {
      setSavingNote(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!activeCourse) return;
    const cleanCode = couponInput.trim().toUpperCase();
    if (!cleanCode) return;
    setCouponBusy(true);
    setCouponFeedback(null);
    setAppliedCoupon(null);
    try {
      const snap = await getDoc(doc(db, 'coupons', cleanCode));
      const coupon = snap.exists() ? (snap.data() as CouponRecord) : null;
      const result = calculateCouponDiscount(activeCourse.priceRwf, coupon, activeCourse.id);
      if (!result.valid) {
        setCouponFeedback(result.reason || 'Coupon cannot be applied.');
      } else {
        setAppliedCoupon({
          code: cleanCode,
          discountRwf: result.discountRwf,
          netAmountRwf: result.netAmountRwf
        });
        setCouponFeedback(
          lang === 'en'
            ? `Applied ${cleanCode}: -${result.discountRwf.toLocaleString()} RWF`
            : `Byakoreshejwe ${cleanCode}: -${result.discountRwf.toLocaleString()} RWF`
        );
      }
    } catch {
      setCouponFeedback(
        lang === 'en'
          ? 'Coupon code not found or inactive.'
          : 'Kode ntabwo ibonetse cyangwa ntikora.'
      );
    } finally {
      setCouponBusy(false);
    }
  };

  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeCourse) return;
    setPayError(null);
    setPayLoading(true);

    const netAmount = appliedCoupon ? appliedCoupon.netAmountRwf : activeCourse.priceRwf;
    const openCohorts = cohorts.filter(
      (ch) => ch.courseId === activeCourse.id && (ch.status === 'enrolling' || ch.status === 'active')
    );
    const pickedCohort =
      openCohorts.find((c) => c.id === selectedCohortId) ?? openCohorts[0] ?? null;

    try {
      const idToken = await user.getIdToken();
      const idempotencyKey = `${user.uid}_${activeCourse.id}_${Date.now()}`;
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          userId: user.uid,
          courseId: activeCourse.id,
          provider,
          phone,
          amountRwf: netAmount,
          originalAmountRwf: activeCourse.priceRwf,
          discountRwf: appliedCoupon?.discountRwf || 0,
          couponCode: appliedCoupon?.code || '',
          idempotencyKey
        })
      });

      const payload = await res.json();
      if (!res.ok) {
        setPayError(payload.error || 'Could not verify Mobile Money transaction.');
        setPayLoading(false);
        return;
      }

      const paymentResult = payload.payment as {
        paymentId: string;
        provider: 'mtn_momo' | 'airtel_money';
        phoneMasked: string;
        amountRwf: number;
        transactionRef: string;
        status: 'pending' | 'verified';
        gatewayMessage?: string;
      };

      const enrollmentId = `${user.uid}_${activeCourse.id}`;

      try {
        await runTransaction(db, async (tx) => {
          const paymentRef = doc(db, 'payments', paymentResult.paymentId);
          const enrollmentRef = doc(db, 'enrollments', enrollmentId);

          if (appliedCoupon) {
            const couponRef = doc(db, 'coupons', appliedCoupon.code);
            const couponSnap = await tx.get(couponRef);
            if (!couponSnap.exists()) {
              throw new Error('Coupon code is no longer valid.');
            }
            const couponData = couponSnap.data() as CouponRecord;
            if (!couponData.isActive) {
              throw new Error('This coupon has been deactivated.');
            }
            if (couponData.maxUses > 0 && couponData.usedCount >= couponData.maxUses) {
              throw new Error('This coupon has reached its maximum usage limit.');
            }
            tx.update(couponRef, {
              usedCount: couponData.usedCount + 1,
              updatedAt: serverTimestamp()
            });
          }

          if (pickedCohort) {
            const cohRef = doc(db, 'cohorts', pickedCohort.id);
            const cohSnap = await tx.get(cohRef);
            if (cohSnap.exists()) {
              const cohData = cohSnap.data() as Cohort;
              const currentCount = Number(cohData.enrolledCount ?? 0);
              if (cohData.capacity > 0 && currentCount >= cohData.capacity) {
                throw new Error(
                  lang === 'en'
                    ? `Selected cohort (${cohData.name}) just reached capacity. Please choose another cohort.`
                    : `Icyiciro wahisemo (${cohData.name}) cyuzuye.`
                );
              }
              tx.update(cohRef, {
                enrolledCount: currentCount + 1,
                updatedAt: serverTimestamp()
              });
            }
          }

          tx.set(paymentRef, {
            id: paymentResult.paymentId,
            userId: user.uid,
            courseId: activeCourse.id,
            provider: paymentResult.provider,
            phoneMasked: paymentResult.phoneMasked,
            amountRwf: paymentResult.amountRwf,
            ...(appliedCoupon
              ? { couponCode: appliedCoupon.code, discountRwf: appliedCoupon.discountRwf }
              : {}),
            transactionRef: paymentResult.transactionRef,
            status: paymentResult.status,
            createdAt: serverTimestamp()
          });

          tx.set(enrollmentRef, {
            id: enrollmentId,
            userId: user.uid,
            courseId: activeCourse.id,
            userEmail: user.email || '',
            userName: user.displayName || 'Learner',
            status: paymentResult.status === 'verified' ? 'active' : 'pending',
            accessType: 'paid',
            paymentRef: paymentResult.paymentId,
            amountRwf: paymentResult.amountRwf,
            ...(appliedCoupon
              ? { couponCode: appliedCoupon.code, discountRwf: appliedCoupon.discountRwf }
              : {}),
            ...(pickedCohort ? { cohortId: pickedCohort.id, cohortName: pickedCohort.name } : {}),
            completedDays: [],
            currentDay: 1,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        });
      } catch (err) {
        if (err instanceof Error && !err.message.toLowerCase().includes('permission')) {
          setPayError(err.message);
          setPayLoading(false);
          return;
        }
        handleFirestoreError(err, OperationType.WRITE, `enrollments/${enrollmentId}`);
      }

      setPaySuccessInfo({
        transactionRef: paymentResult.transactionRef,
        status: paymentResult.status,
        gatewayMessage: paymentResult.gatewayMessage
      });
      onEnrollmentSuccess();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Payment submission failed.');
    } finally {
      setPayLoading(false);
    }
  };

  // LESSON READER VIEW
  if (activeCourse && selectedDay !== null) {
    const courseStructuredLessons = structuredLessons
      .filter((l) => l.courseId === activeCourse.id)
      .sort((a, b) => (a.dayNumber ?? 0) - (b.dayNumber ?? 0));
    const structuredRec = courseStructuredLessons.find((l) => l.dayNumber === selectedDay) ?? null;

    const baseLesson = LESSONS_28.find((l) => l.dayNumber === selectedDay) || LESSONS_28[0];
    const override = activeCourse.id === 'challenge-28' ? customLessonsMap[selectedDay] : undefined;
    const lesson: LessonContent = override
      ? {
          ...baseLesson,
          title: override.title ?? baseLesson.title,
          introduction: override.introduction ?? baseLesson.introduction
        }
      : baseLesson;

    const structuredBlocks = structuredRec
      ? parseLessonBlocks(lang === 'en' ? structuredRec.blocksEnJson : structuredRec.blocksRwJson)
      : [];
    const fallbackBlocks =
      structuredRec && structuredBlocks.length === 0 && lang === 'rw'
        ? parseLessonBlocks(structuredRec.blocksEnJson)
        : [];
    const effectiveBlocks = structuredBlocks.length > 0 ? structuredBlocks : fallbackBlocks;
    const useStructuredReader = Boolean(structuredRec && effectiveBlocks.length > 0);

    const isFreeCourse = Boolean(activeCourse.isFree || activeCourse.priceRwf === 0);
    const parentModule = structuredRec?.moduleId
      ? modules.find((m) => m.id === structuredRec.moduleId) ?? null
      : modules.find(
          (m) => m.courseId === activeCourse.id && m.orderIndex === lesson.weekNumber - 1
        ) ?? null;
    const releaseLock = resolveLessonReleaseLock({
      courseModule: parentModule,
      lesson: structuredRec,
      isStaff: isAdmin
    });

    const accessAllowed = Boolean(
      structuredRec?.isSample ||
        (activeCourse.id === 'challenge-28' && lesson.isSample) ||
        isFreeCourse ||
        hasFullAccess
    );
    const unlocked = !releaseLock.locked && accessAllowed;
    const totalCourseDays = Math.max(
      activeCourse.durationDays || 1,
      courseStructuredLessons.length,
      activeCourse.id === 'challenge-28' ? 28 : 1
    );
    const displayDay = structuredRec?.dayNumber ?? selectedDay;
    const displayTitle = structuredRec
      ? lang === 'en'
        ? structuredRec.titleEn
        : structuredRec.titleRw
      : lesson.title[lang];
    const displayIntro = structuredRec
      ? lang === 'en'
        ? structuredRec.summaryEn || ''
        : structuredRec.summaryRw || structuredRec.summaryEn || ''
      : lesson.introduction[lang];
    const displayObjectives = structuredRec
      ? (lang === 'en' ? structuredRec.objectivesEn : structuredRec.objectivesRw) ?? []
      : lesson.objectives[lang];

    const isCompleted = activeEnrollment?.completedDays.includes(displayDay) ?? false;
    const chosenOption = quizAnswer[displayDay] ?? null;

    if (activeCourse.id === 'challenge-28' && displayDay === 2 && !useStructuredReader && unlocked) {
      return (
        <Day2LessonView
          lang={lang}
          isCompleted={isCompleted}
          canMarkComplete={Boolean(activeEnrollment)}
          markingComplete={markingComplete}
          onBackToSyllabus={() => onSelectDay(null)}
          onMarkComplete={() => handleMarkDayComplete(2)}
          onPrevDay={() => onSelectDay(1)}
          onNextDay={() => onSelectDay(3)}
        />
      );
    }

    const dayIndices = Array.from({ length: totalCourseDays }, (_, i) => i + 1);
    const totalWeeks = Math.max(1, Math.ceil(totalCourseDays / 7));
    const weekNumbers = Array.from({ length: totalWeeks }, (_, i) => i + 1);
    const displayDeliverable = structuredRec
      ? lang === 'en'
        ? structuredRec.deliverableEn || lesson.deliverable?.en || ''
        : structuredRec.deliverableRw || structuredRec.deliverableEn || lesson.deliverable?.rw || ''
      : lesson.deliverable?.[lang] || '';
    const displayWorksheet = lesson.downloadableResourceTitle?.[lang] || '';
    const releaseDateFormatted = releaseLock.locked
      ? formatReleaseDateLabel(
          releaseLock.effectiveReleaseAt,
          releaseLock.effectiveReleaseAtMs,
          lang
        )
      : '';

    const railDays = dayIndices.map((dayNum) => {
      const sRec = courseStructuredLessons.find((l) => l.dayNumber === dayNum) ?? null;
      const staticRec =
        activeCourse.id === 'challenge-28'
          ? LESSONS_28.find((l) => l.dayNumber === dayNum) ?? null
          : null;
      const dWeek = sRec?.weekNumber ?? staticRec?.weekNumber ?? Math.ceil(dayNum / 7);
      const dMod = sRec?.moduleId
        ? modules.find((m) => m.id === sRec.moduleId) ?? null
        : modules.find((m) => m.courseId === activeCourse.id && m.orderIndex === dWeek - 1) ?? null;
      const dReleaseLock = resolveLessonReleaseLock({
        courseModule: dMod,
        lesson: sRec,
        isStaff: isAdmin
      });
      const daySample = Boolean(sRec?.isSample || staticRec?.isSample);
      const dayUnlocked =
        !dReleaseLock.locked && Boolean(daySample || isFreeCourse || hasFullAccess);
      const dayDone = Boolean(activeEnrollment?.completedDays.includes(dayNum));
      const dayTitle = sRec
        ? lang === 'en'
          ? sRec.titleEn
          : sRec.titleRw
        : staticRec
          ? staticRec.title[lang]
          : lang === 'en'
            ? `Lesson Day ${dayNum}`
            : `Isomo ry’Umunsi ${dayNum}`;
      const dayDeliverable = sRec
        ? lang === 'en'
          ? sRec.deliverableEn || staticRec?.deliverable?.en || ''
          : sRec.deliverableRw || staticRec?.deliverable?.rw || ''
        : staticRec?.deliverable?.[lang] || '';
      return {
        dayNum,
        dWeek,
        dayTitle,
        dayDeliverable,
        daySample,
        dayUnlocked,
        dayDone,
        timeLocked: dReleaseLock.locked
      };
    });

    const filteredRailDays = railDays.filter((item) => {
      const matchWeek = railWeekFilter === 'all' || item.dWeek === railWeekFilter;
      const q = railSearch.trim().toLowerCase();
      const matchQ =
        !q ||
        `day ${item.dayNum}`.includes(q) ||
        `d${item.dayNum}` === q ||
        item.dayTitle.toLowerCase().includes(q) ||
        item.dayDeliverable.toLowerCase().includes(q);
      return matchWeek && matchQ;
    });

    const renderNavigatorRail = () => (
      <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[15px] font-mono text-[#0D7A5F] uppercase">
              {activeCourse.code} · {lang === 'en' ? 'Navigator' : 'Amasomo'}
            </p>
            <p className="text-sm font-semibold text-[#0D0D0F] tabular-nums">
              {activeEnrollment
                ? `${activeEnrollment.completedDays.length}/${totalCourseDays} ${lang === 'en' ? 'completed' : 'byarangiye'}`
                : `${totalCourseDays} ${lang === 'en' ? 'days' : 'iminsi'}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectDay(null)}
            className="text-sm font-medium text-[#5D5D66] hover:text-[#0D0D0F]"
          >
            {lang === 'en' ? 'Syllabus' : 'Urutonde'}
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#5D5D66] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={railSearch}
            onChange={(e) => setRailSearch(e.target.value)}
            placeholder={lang === 'en' ? 'Find day or topic...' : 'Shakisha umunsi...'}
            className="w-full pl-8 pr-2.5 py-1.5 text-sm bg-white border border-black/10 rounded-lg"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setRailWeekFilter('all')}
            className={`px-2 py-1 text-[15px] font-mono rounded-md border ${
              railWeekFilter === 'all'
                ? 'bg-[#0D0D0F] text-white border-[#0D0D0F]'
                : 'bg-white text-[#5D5D66] border-black/10'
            }`}
          >
            {lang === 'en' ? 'All' : 'Yose'}
          </button>
          {weekNumbers.map((wk) => (
            <button
              key={wk}
              type="button"
              onClick={() => setRailWeekFilter(wk)}
              className={`px-2 py-1 text-[15px] font-mono rounded-md border ${
                railWeekFilter === wk
                  ? 'bg-[#0D0D0F] text-white border-[#0D0D0F]'
                  : 'bg-white text-[#5D5D66] border-black/10'
              }`}
            >
              W{wk}
            </button>
          ))}
        </div>

        <div className="space-y-1 max-h-[58vh] overflow-y-auto pr-1">
          {filteredRailDays.map((item) => {
            const isCurrent = item.dayNum === displayDay;
            return (
              <button
                key={item.dayNum}
                type="button"
                onClick={() => {
                  onSelectDay(item.dayNum);
                  setDrawerOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-xl border text-left transition-colors flex items-start justify-between gap-2 ${
                  isCurrent
                    ? 'bg-[#0D0D0F] text-white border-[#0D0D0F]'
                    : item.dayDone
                      ? 'bg-[#ECFDF5]/80 border-[#0D7A5F]/25 text-[#0D0D0F]'
                      : 'bg-white border-black/[0.08] text-[#0D0D0F] hover:border-black/25'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[15px] font-mono tabular-nums">
                    <span className={isCurrent ? 'text-[#34D399]' : 'text-[#0D7A5F]'}>
                      D{item.dayNum}
                    </span>
                    {item.daySample && !hasFullAccess && (
                      <span className={isCurrent ? 'text-white/75' : 'text-[#5D5D66]'}>
                        · {lang === 'en' ? 'Sample' : 'Ubuntu'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate">{item.dayTitle}</p>
                </div>
                <span className="shrink-0 mt-0.5">
                  {item.dayDone ? (
                    <Check className={`w-3.5 h-3.5 ${isCurrent ? 'text-[#34D399]' : 'text-[#0D7A5F]'}`} />
                  ) : item.timeLocked ? (
                    <Clock className="w-3.5 h-3.5 opacity-70" />
                  ) : !item.dayUnlocked ? (
                    <Lock className="w-3.5 h-3.5 opacity-60" />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-[15px] text-[#5D5D66] font-mono pt-1 border-t border-black/[0.06]">
          {lang === 'en' ? 'Tip: Alt + ← / → switches day' : 'Alt + ← / → guhindura umunsi'}
        </p>
      </div>
    );

    return (
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-black/[0.08] mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onSelectDay(null)}
              className="inline-flex items-center gap-2 text-[15px] font-medium text-[#5D5D66] hover:text-[#0D0D0F] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{lang === 'en' ? 'Syllabus' : 'Urutonde'}</span>
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen((prev) => !prev)}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-black/15 rounded-lg hover:border-black/30"
            >
              <List className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Course Navigator' : 'Hitamo Isomo'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-[#5D5D66] font-mono tabular-nums">
            <span>{`Day ${displayDay} / ${totalCourseDays}`}</span>
            <span aria-hidden="true">·</span>
            <span>{`${structuredRec?.estimatedMinutes ?? lesson.durationMinutes} min`}</span>
            <span aria-hidden="true">·</span>
            <span>{structuredRec?.levelTag || lesson.levelTag}</span>
            <span aria-hidden="true">·</span>
            <span>{activeCourse.code}</span>
          </div>
        </div>

        {/* Mobile Lesson Navigator Drawer */}
        {drawerOpen && <div className="lg:hidden mb-6">{renderNavigatorRail()}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Persistent Left Lesson Navigator Rail */}
          <aside className="hidden lg:block lg:col-span-4 xl:col-span-3 sticky top-20">
            {renderNavigatorRail()}
          </aside>

          {/* Main Lesson Workspace */}
          <div className="lg:col-span-8 xl:col-span-9 min-w-0">
        {releaseLock.locked ? (
          <div className="bg-[#FFFBEB] border border-[#D97706]/30 rounded-2xl p-8 sm:p-12 text-center max-w-2xl mx-auto">
            <Clock className="w-8 h-8 text-[#B45309] mx-auto mb-4" />
            <p className="text-sm font-mono uppercase text-[#B45309] mb-2">
              {lang === 'en' ? 'Scheduled Release' : 'Isomo Rifungiwe Igihe'}
            </p>
            <h2 className="text-[24px] sm:text-[28px] tracking-[-0.02em] leading-[1.2] font-display font-bold text-[#0D0D0F] mb-3">
              {lang === 'en'
                ? `Day ${displayDay}: ${displayTitle}`
                : `Umunsi wa ${displayDay}: ${displayTitle}`}
            </h2>
            <p className="text-[15px] text-[#5D5D66] leading-relaxed mb-6">
              {lang === 'en'
                ? `This ${releaseLock.scope === 'module' ? 'module' : 'lesson'} is scheduled to unlock on ${releaseDateFormatted} (Africa/Kigali). Your enrollment and existing progress remain saved.`
                : `Iri somo rizafungurwa ku itariki ya ${releaseDateFormatted}. Ibyo wamaze gukora birabitswe neza.`}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onSelectDay(null)}
                className="px-5 py-2.5 text-[15px] font-medium text-white bg-[#0D0D0F] rounded-lg hover:bg-[#232329] transition-colors"
              >
                {lang === 'en' ? 'Return to Course Syllabus' : 'Subira ku Rutonde rw’Amasomo'}
              </button>
              {displayDay !== 1 && (
                <button
                  type="button"
                  onClick={() => onSelectDay(1)}
                  className="px-4 py-2.5 text-[15px] font-medium text-[#0D0D0F] bg-white border border-black/15 rounded-lg hover:border-black/30"
                >
                  {lang === 'en' ? 'Open Day 1' : 'Soma Umunsi wa 1'}
                </button>
              )}
            </div>
          </div>
        ) : !unlocked ? (
          <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-8 sm:p-12 text-center max-w-2xl mx-auto">
            <Lock className="w-8 h-8 text-[#0D0D0F] mx-auto mb-4" />
            <h2 className="text-[24px] sm:text-[28px] tracking-[-0.02em] leading-[1.2] font-display font-bold text-[#0D0D0F] mb-3">
              {lang === 'en'
                ? `Day ${displayDay}: ${displayTitle}`
                : `Umunsi wa ${displayDay}: ${displayTitle}`}
            </h2>
            <p className="text-[15px] text-[#5D5D66] leading-relaxed mb-6">
              {lang === 'en'
                ? `Sample lessons are open for free preview. Enroll in ${activeCourse.title.en} (${activeCourse.priceRwf.toLocaleString()} RWF) to unlock all lessons and assessments.`
                : `Amasomo y’igerageza arafunguye ku buntu. Iyandikishe kugira ngo ufungure amasomo yose.`}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    onSignIn();
                  } else {
                    setCheckoutOpen(true);
                    onSelectDay(null);
                  }
                }}
                className="px-5 py-2.5 text-[15px] font-medium text-white bg-[#0D0D0F] rounded-lg hover:bg-[#232329] transition-colors"
              >
                {user
                  ? lang === 'en'
                    ? `Enroll now — ${activeCourse.priceRwf.toLocaleString()} RWF`
                    : `Iyandikishe — ${activeCourse.priceRwf.toLocaleString()} RWF`
                  : lang === 'en'
                    ? 'Sign in to enroll'
                    : 'Injira kugira ngo wiyandikishe'}
              </button>
              <button
                type="button"
                onClick={() => onSelectDay(1)}
                className="px-4 py-2.5 text-[15px] font-medium text-[#0D0D0F] border border-black/15 rounded-lg hover:border-black/30"
              >
                {lang === 'en' ? 'Read Day 1 Sample' : 'Soma Umunsi wa 1 ku buntu'}
              </button>
            </div>
          </div>
        ) : (
          <article className="space-y-8">
            <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#0D7A5F] mb-2">
                  {activeCourse.title[lang]}
                  {structuredRec?.isSample || (activeCourse.id === 'challenge-28' && lesson.isSample)
                    ? lang === 'en'
                      ? ' · Free Sample Lesson'
                      : ' · Isomo ry’igerageza'
                    : ''}
                </p>
                <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-[#0D0D0F] text-balance mb-4">
                  {lang === 'en'
                    ? `Day ${displayDay}: ${displayTitle}`
                    : `Umunsi wa ${displayDay}: ${displayTitle}`}
                </h1>
                {displayIntro && (
                  <p className="text-base text-[#5D5D66] leading-relaxed">{displayIntro}</p>
                )}
              </div>

              {user && user.emailVerified && (
                <button
                  type="button"
                  disabled={savingNote}
                  onClick={() => handleSaveStudyNote(!noteBookmarked)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border shrink-0 transition-colors ${
                    noteBookmarked
                      ? 'bg-[#ECFDF5] border-[#0D7A5F]/40 text-[#0D7A5F]'
                      : 'bg-white border-black/15 text-[#0D0D0F] hover:border-black/30'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>
                    {noteBookmarked
                      ? lang === 'en'
                        ? 'Bookmarked'
                        : 'Cyabitswe'
                      : lang === 'en'
                        ? 'Bookmark'
                        : 'Bika isomo'}
                  </span>
                </button>
              )}
            </header>

            {/* In-Lesson Quick Jump Strip & Low-Bandwidth / Deliverable Summary */}
            <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-4 space-y-3">
              {(displayDeliverable || displayWorksheet) && (
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div className="space-y-0.5">
                    {displayDeliverable && (
                      <p className="text-[#0D0D0F]">
                        <strong className="text-[#0D7A5F]">
                          {lang === 'en' ? 'Expected Deliverable: ' : 'Umwitozo Usabwa: '}
                        </strong>
                        {displayDeliverable}
                      </p>
                    )}
                    {displayWorksheet && (
                      <p className="text-[#5D5D66]">
                        {lang === 'en' ? 'Worksheet: ' : 'Urupapuro: '}
                        {displayWorksheet}
                      </p>
                    )}
                  </div>
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => onNavigate('projects')}
                      className="px-3 py-1.5 text-sm font-medium bg-white border border-black/15 rounded-lg hover:border-black/35 shrink-0"
                    >
                      {lang === 'en' ? 'Open Toolkit & Templates' : 'Ibikoresho & Impapuro'}
                    </button>
                  )}
                </div>
              )}

              {!useStructuredReader && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black/[0.06] text-sm">
                  <span className="text-[#5D5D66] font-mono">
                    {lang === 'en' ? 'Jump:' : 'Jya kuri:'}
                  </span>
                  {[
                    { href: '#sec-objectives', label: lang === 'en' ? '01 Objectives' : '01 Intego' },
                    { href: '#sec-explanations', label: lang === 'en' ? '02–03 Explanations' : '02–03 Ibisobanuro' },
                    { href: '#sec-examples', label: lang === 'en' ? '04–05 Examples' : '04–05 Ingero' },
                    { href: '#sec-exercise', label: lang === 'en' ? '06 Exercise & Template' : '06 Umwitozo' },
                    { href: '#sec-check', label: lang === 'en' ? '09 Knowledge Check' : '09 Isuzuma' }
                  ].map((anchor) => (
                    <a
                      key={anchor.href}
                      href={anchor.href}
                      className="px-2.5 py-1 rounded-md bg-white border border-black/10 text-[#0D0D0F] hover:border-[#0D7A5F]"
                    >
                      {anchor.label}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {displayObjectives.length > 0 && (
              <section id="sec-objectives" className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6">
                <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F] mb-3">
                  {lang === 'en' ? '01. Learning Objectives' : '01. Intego z’Isomo'}
                </h2>
                <ul className="space-y-2">
                  {displayObjectives.map((obj) => (
                    <li key={obj} className="text-[15px] text-[#5D5D66] flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#0D7A5F] shrink-0 mt-0.5" />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {useStructuredReader ? (
              <LessonBlocksRenderer lang={lang} blocks={effectiveBlocks} />
            ) : (
              <>
                {/* Simple vs Technical Explanation */}
                <section id="sec-explanations" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-black/[0.08] rounded-2xl p-6">
                    <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F] mb-2">
                      {lang === 'en' ? '02. Simple Explanation' : '02. Ibisobanuro Byoroshye'}
                    </h2>
                    <p className="text-[15px] text-[#5D5D66] leading-relaxed">
                      {lesson.simpleExplanation[lang]}
                    </p>
                  </div>
                  <div className="border border-black/[0.08] rounded-2xl p-6">
                    <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F] mb-2">
                      {lang === 'en' ? '03. Technical Explanation' : '03. Ibisobanuro by’Ubuhanga'}
                    </h2>
                    <p className="text-[15px] text-[#5D5D66] leading-relaxed">
                      {lesson.technicalExplanation[lang]}
                    </p>
                  </div>
                </section>

                {/* Real-World & Rwanda Examples */}
                <section id="sec-examples" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6">
                    <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F] mb-2">
                      {lang === 'en' ? '04. Global Real-World Example' : '04. Urugero Rusanzwe ku Isi'}
                    </h2>
                    <p className="text-[15px] text-[#5D5D66] leading-relaxed">
                      {lesson.realWorldExample[lang]}
                    </p>
                  </div>
                  <div className="bg-[#F2FBF8] border border-[#0D7A5F]/20 rounded-2xl p-6">
                    <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F] mb-2">
                      {lang === 'en' ? '05. Rwanda-Relevant Example' : '05. Urugero rwo mu Rwanda'}
                    </h2>
                    <p className="text-[15px] text-[#0D0D0F]/85 leading-relaxed">
                      {lesson.rwandaExample[lang]}
                    </p>
                  </div>
                </section>

                {/* Practical Demonstration & Tools */}
                <section id="sec-exercise" className="border border-black/[0.08] rounded-2xl p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
                      {lang === 'en'
                        ? '06. Practical Demonstration & Step-by-Step Exercise'
                        : '06. Umwitozo Ngiro n’Intambwe'}
                    </h2>
                    <span className="text-sm font-mono text-[#5D5D66]">
                      {lesson.tools.join(' · ')}
                    </span>
                  </div>
                  <p className="text-[15px] text-[#5D5D66] leading-relaxed">
                    {lesson.practicalDemo[lang]}
                  </p>
                  <ol className="space-y-2.5 pt-2">
                    {lesson.exerciseSteps[lang].map((step, idx) => (
                      <li key={step} className="text-[15px] text-[#0D0D0F] flex items-start gap-3">
                        <span className="font-mono text-sm text-[#0D7A5F] tabular-nums mt-0.5">
                          {`0${idx + 1}.`}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>

                  <div className="bg-[#0D0D0F] text-white rounded-xl p-5 mt-4">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <span className="text-sm font-mono text-white/70">
                        {lang === 'en'
                          ? 'Reusable Prompt / Workflow Template'
                          : 'Ibwiriza Rikoreshwa Kenshi'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyTemplate(lesson.dayNumber, lesson.reusableTemplate[lang])}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-white/10 hover:bg-white/20 rounded-md transition-colors"
                      >
                        {copiedDay === lesson.dayNumber ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#34D399]" />
                            <span>{lang === 'en' ? 'Copied' : 'Byakoporowe'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{lang === 'en' ? 'Copy template' : 'Kopora'}</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-[15px] sm:text-[15px] font-mono whitespace-pre-wrap text-white/90 leading-relaxed">
                      {lesson.reusableTemplate[lang]}
                    </pre>
                  </div>
                </section>

                {/* Common Mistakes & Risks */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-black/[0.08] rounded-2xl p-6">
                    <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F] mb-3">
                      {lang === 'en' ? '07. Common Mistakes' : '07. Amakosa Akunze Gukorwa'}
                    </h2>
                    <ul className="space-y-2 text-[15px] text-[#5D5D66]">
                      {lesson.commonMistakes[lang].map((m) => (
                        <li key={m}>— {m}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="border border-black/[0.08] rounded-2xl p-6">
                    <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F] mb-3">
                      {lang === 'en' ? '08. Limitations & Privacy Risks' : '08. Imipaka n’Umutekano'}
                    </h2>
                    <p className="text-[15px] text-[#5D5D66] leading-relaxed">
                      {lesson.limitationsAndRisks[lang]}
                    </p>
                  </div>
                </section>

                {/* Knowledge Check */}
                <section id="sec-check" className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6">
                  <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F] mb-2">
                    {lang === 'en' ? '09. Knowledge Check' : '09. Isuzuma ry’Isomo'}
                  </h2>
                  <p className="text-base font-medium text-[#0D0D0F] mb-4">
                    {lesson.knowledgeCheck.question[lang]}
                  </p>
                  <div className="space-y-2">
                    {lesson.knowledgeCheck.options[lang].map((opt, idx) => {
                      const isPicked = chosenOption === idx;
                      const isCorrect = idx === lesson.knowledgeCheck.correctIndex;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setQuizAnswer((prev) => ({ ...prev, [lesson.dayNumber]: idx }))
                          }
                          className={`w-full text-left px-4 py-3 rounded-xl border text-[15px] transition-colors ${
                            isPicked
                              ? isCorrect
                                ? 'bg-[#ECFDF5] border-[#0D7A5F] text-[#0D0D0F]'
                                : 'bg-[#FEF2F2] border-[#DC2626] text-[#0D0D0F]'
                              : 'bg-white border-black/[0.08] text-[#0D0D0F] hover:border-black/25'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {chosenOption !== null && (
                    <p className="mt-4 text-sm text-[#5D5D66] leading-relaxed">
                      <strong className="text-[#0D0D0F]">
                        {chosenOption === lesson.knowledgeCheck.correctIndex
                          ? lang === 'en'
                            ? 'Correct: '
                            : 'Nibyo: '
                          : lang === 'en'
                            ? 'Review: '
                            : 'Subiramo: '}
                      </strong>
                      {lesson.knowledgeCheck.explanation[lang]}
                    </p>
                  )}
                </section>
              </>
            )}

            {/* Personal Study Notes (Authenticated Verified Learners) */}
            {user && user.emailVerified && (
              <section className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
                    {lang === 'en' ? 'Personal Study Notes' : 'Inyandiko Zawe bwite'}
                  </h2>
                  {noteSavedMsg && <span className="text-sm text-[#0D7A5F]">{noteSavedMsg}</span>}
                </div>
                <textarea
                  rows={3}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={
                    lang === 'en'
                      ? 'Jot down key takeaways, prompt variations, or Rwanda context ideas...'
                      : 'Andika ibyo wize cyangwa ibibazo ushaka gusubiramo...'
                  }
                  className="w-full px-3.5 py-2.5 text-[15px] bg-white border border-black/15 rounded-lg"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={savingNote}
                    onClick={() => handleSaveStudyNote(noteBookmarked)}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#0D0D0F] rounded-lg"
                  >
                    {savingNote
                      ? lang === 'en'
                        ? 'Saving...'
                        : 'Birabikwa...'
                      : lang === 'en'
                        ? 'Save Study Note'
                        : 'Bika Inyandiko'}
                  </button>
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => onNavigate('dashboard')}
                      className="inline-flex items-center gap-1.5 text-sm text-[#5D5D66] hover:text-[#0D0D0F]"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>{lang === 'en' ? 'Report Lesson Issue' : 'Menyesha Ikibazo mu Isomo'}</span>
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* Post-Completion Guidance Card */}
            {isCompleted && (
              <section className="bg-[#ECFDF5] border border-[#0D7A5F]/25 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-[15px] font-semibold text-[#0D7A5F]">
                    {lang === 'en'
                      ? `Day ${displayDay} Completed`
                      : `Umunsi wa ${displayDay} Wararangiye`}
                  </p>
                  <p className="text-sm text-[#0D0D0F]/80 mt-0.5">
                    {displayDay < totalCourseDays
                      ? lang === 'en'
                        ? `Continue to Day ${displayDay + 1} or check weekly assessments & projects in your Learner Portal.`
                        : `Komeza ku Munsi wa ${displayDay + 1} cyangwa urebe amasuzuma mu bikorwa byawe.`
                      : lang === 'en'
                        ? 'You reached the final day! Complete your assessments & final project in the Learner Portal to unlock certification.'
                        : 'Usoje umunsi wa nyuma! Kora amasuzuma n’umushinga wa nyuma ubone impamyabumenyi.'}
                  </p>
                </div>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('dashboard')}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#0D7A5F] rounded-lg shrink-0"
                  >
                    {lang === 'en' ? 'Open Assessments' : 'Fungura Amasuzuma'}
                  </button>
                )}
              </section>
            )}

            {/* Reflection & Lesson Navigation */}
            <section className="border-t border-black/[0.08] pt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {!useStructuredReader ? (
                <div>
                  <p className="text-sm font-semibold text-[#0D0D0F] mb-1">
                    {lang === 'en' ? 'Reflection Question' : 'Ikibazo cyo Gutekerezaho'}
                  </p>
                  <p className="text-[15px] text-[#5D5D66] max-w-xl">
                    {lesson.reflectionQuestion[lang]}
                  </p>
                </div>
              ) : (
                <div />
              )}

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {displayDay > 1 && (
                  <button
                    type="button"
                    onClick={() => onSelectDay(displayDay - 1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[15px] font-medium text-[#0D0D0F] border border-black/15 rounded-lg hover:border-black/30 whitespace-nowrap"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{lang === 'en' ? `Day ${displayDay - 1}` : `Umunsi ${displayDay - 1}`}</span>
                  </button>
                )}

                {activeEnrollment && (
                  <button
                    type="button"
                    disabled={isCompleted || markingComplete}
                    onClick={() => handleMarkDayComplete(displayDay)}
                    className={`px-4 py-2.5 text-[15px] font-medium rounded-lg transition-colors whitespace-nowrap ${
                      isCompleted
                        ? 'bg-[#ECFDF5] text-[#0D7A5F] border border-[#0D7A5F]/30'
                        : 'bg-[#0D7A5F] text-white hover:bg-[#0B664F]'
                    }`}
                  >
                    {isCompleted
                      ? lang === 'en'
                        ? 'Completed'
                        : 'Byararangiye'
                      : markingComplete
                        ? lang === 'en'
                          ? 'Saving...'
                          : 'Birabikwa...'
                        : lang === 'en'
                          ? 'Mark Day Complete'
                          : 'Emeza ko warangije'}
                  </button>
                )}

                {displayDay < totalCourseDays && (
                  <button
                    type="button"
                    onClick={() => onSelectDay(displayDay + 1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[15px] font-medium text-white bg-[#0D0D0F] rounded-lg hover:bg-[#232329] transition-colors whitespace-nowrap"
                  >
                    <span>
                      {lang === 'en' ? `Day ${displayDay + 1}` : `Umunsi wa ${displayDay + 1}`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </section>
          </article>
        )}
          </div>
        </div>
      </div>
    );
  }

  // COURSE DETAIL VIEW
  if (activeCourse) {
    const weeks = [1, 2, 3, 4];
    const completedCount = activeEnrollment?.completedDays.length ?? 0;
    const activeCohorts = cohorts.filter(
      (ch) => ch.courseId === activeCourse.id && ch.status !== 'archived'
    );
    const waitlistsEnabled = platformSettings?.enableWaitlists !== false;
    const couponsEnabled = platformSettings?.enableCoupons !== false;
    const isFreeCourse = Boolean(activeCourse.isFree || activeCourse.priceRwf === 0);

    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10">
        <button
          type="button"
          onClick={() => onSelectCourse(null)}
          className="inline-flex items-center gap-2 text-[15px] font-medium text-[#5D5D66] hover:text-[#0D0D0F] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'en' ? 'All courses' : 'Amasomo yose'}</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-12 border-b border-black/[0.08]">
          <div className="lg:col-span-7">
            <p className="text-sm font-mono text-[#0D7A5F] mb-2">
              {activeCourse.code} · {activeCourse.levelRange} · {activeCourse.durationDays}{' '}
              {lang === 'en' ? 'Days' : 'Iminsi'}
            </p>
            <h1 className="text-3xl sm:text-5xl font-display font-bold tracking-[-0.03em] leading-[1.06] text-[#0D0D0F] text-balance mb-4">
              {activeCourse.title[lang]}
            </h1>
            <p className="text-base text-[#5D5D66] leading-relaxed mb-6">
              {activeCourse.description[lang]}
            </p>

            {activeCourse.prerequisitesText && (
              <div className="mb-6 bg-[#F9F9FB] border border-black/[0.08] rounded-xl p-4 text-sm text-[#5D5D66]">
                <strong className="text-[#0D0D0F]">
                  {lang === 'en' ? 'Prerequisites: ' : 'Ibisabwa mbere: '}
                </strong>
                {activeCourse.prerequisitesText}
              </div>
            )}

            {activeCohorts.length > 0 && (
              <div className="mb-6 space-y-2">
                <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
                  {lang === 'en' ? 'Upcoming & Active Cohorts' : 'Ibyiciro biriho'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeCohorts.map((ch) => (
                    <div
                      key={ch.id}
                      className="bg-[#F9F9FB] border border-black/[0.08] rounded-xl px-4 py-3 text-sm"
                    >
                      <p className="font-semibold text-[#0D0D0F]">{ch.name}</p>
                      <p className="text-[#5D5D66] font-mono mt-0.5">
                        {ch.startDate} → {ch.endDate} · {ch.status}
                      </p>
                      {ch.instructorName && (
                        <p className="text-[#0D7A5F] mt-0.5">{ch.instructorName}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
                {lang === 'en'
                  ? `Learning Outcomes (${activeCourse.outcomes[lang].length})`
                  : `Icyo uzageraho (${activeCourse.outcomes[lang].length})`}
              </h2>
              {activeCourse.outcomes[lang].length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllOutcomes((v) => !v)}
                  className="text-sm font-medium text-[#0D7A5F] hover:underline"
                >
                  {showAllOutcomes
                    ? lang === 'en'
                      ? 'Show summary'
                      : 'Reba bike'
                    : lang === 'en'
                      ? `Show all ${activeCourse.outcomes[lang].length} outcomes`
                      : `Reba byose (${activeCourse.outcomes[lang].length})`}
                </button>
              )}
            </div>
            <ul className="space-y-2 mb-6">
              {(showAllOutcomes
                ? activeCourse.outcomes[lang]
                : activeCourse.outcomes[lang].slice(0, 5)
              ).map((outcome) => (
                <li key={outcome} className="text-[15px] text-[#5D5D66] flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0D7A5F] shrink-0 mt-0.5" />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>

            {activeCourse.audience[lang].length > 0 && (
              <div className="mb-6 bg-[#F9F9FB] border border-black/[0.08] rounded-xl p-4">
                <p className="text-sm font-semibold text-[#0D0D0F] mb-2">
                  {lang === 'en' ? 'Target Learners' : 'Abo isomo rigenewe'}
                </p>
                <p className="text-sm text-[#5D5D66] leading-relaxed">
                  {activeCourse.audience[lang].join(' · ')}
                </p>
              </div>
            )}

            <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-xl p-4 flex items-start gap-3">
              <div className="flex items-center gap-1 text-[#0D0D0F] shrink-0 mt-0.5">
                <Smartphone className="w-4 h-4" />
                <Laptop className="w-4 h-4" />
              </div>
              <p className="text-sm text-[#5D5D66] leading-relaxed">
                <strong className="text-[#0D0D0F]">
                  {lang === 'en' ? 'Device requirements: ' : 'Ibikoresho bikenewe: '}
                </strong>
                {activeCourse.deviceNote[lang]}
              </p>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white border border-black/[0.1] rounded-2xl overflow-hidden">
              {activeCourse.coverImageUrl ? (
                <img
                  src={activeCourse.coverImageUrl}
                  alt={activeCourse.title[lang]}
                  className="w-full h-48 object-cover border-b border-black/[0.08]"
                />
              ) : (
                <CourseArtwork category={activeCourse.category} code={activeCourse.code} />
              )}
              <div className="p-6 space-y-5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-sm text-[#5D5D66]">
                      {activeCourse.status === 'active'
                        ? lang === 'en'
                          ? 'One-time pilot enrollment'
                          : 'Kwishyura rimwe gusa'
                        : lang === 'en'
                          ? 'Planned tuition'
                          : 'Ikiguzi giteganyijwe'}
                    </p>
                    <p className="text-2xl font-display font-semibold text-[#0D0D0F] tabular-nums">
                      {isFreeCourse
                        ? lang === 'en'
                          ? 'Free'
                          : 'Ku buntu'
                        : `${activeCourse.priceRwf.toLocaleString()} RWF`}
                    </p>
                  </div>
                  <span className="text-sm font-mono text-[#0D7A5F]">
                    {activeCourse.status === 'active'
                      ? lang === 'en'
                        ? 'EN + RW Bilingual'
                        : 'EN + RW Zombi'
                      : lang === 'en'
                        ? 'Upcoming Cohort'
                        : 'Icyiciro kizaza'}
                  </span>
                </div>

                {activeCourse.status === 'active' ? (
                  hasFullAccess || isFreeCourse ? (
                    <div className="space-y-3">
                      <div className="bg-[#ECFDF5] border border-[#0D7A5F]/25 rounded-xl p-3.5 text-sm text-[#0D0D0F]">
                        {activeEnrollment
                          ? lang === 'en'
                            ? `Enrolled · ${completedCount} of ${activeCourse.durationDays} days completed`
                            : `Wiyandikishije · Iminsi ${completedCount} kuri ${activeCourse.durationDays} yarangiye`
                          : isFreeCourse
                            ? lang === 'en'
                              ? 'Open Access Course (Free)'
                              : 'Amasomo afunguye ku buntu'
                            : lang === 'en'
                              ? 'Staff Full Access Active'
                              : 'Ufite ububasha bw’ubuyobozi'}
                      </div>
                      {freeEnrollError && (
                        <p className="text-sm text-[#DC2626] bg-[#FEF2F2] border border-[#DC2626]/20 rounded-lg px-3 py-2">
                          {freeEnrollError}
                        </p>
                      )}
                      {isFreeCourse && user && user.emailVerified && !activeEnrollment && (
                        <button
                          type="button"
                          disabled={freeEnrolling}
                          onClick={handleFreeEnroll}
                          className="w-full px-4 py-2.5 text-[15px] font-medium text-white bg-[#0D7A5F] rounded-lg hover:bg-[#0B664F]"
                        >
                          {freeEnrolling
                            ? 'Enrolling...'
                            : lang === 'en'
                              ? 'Enroll Free to Track Progress'
                              : 'Iyandikishe ku Buntu'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          onSelectDay(
                            lastVisitedByCourse[activeCourse.id] || activeEnrollment?.currentDay || 1
                          )
                        }
                        className="w-full px-4 py-3 text-[15px] font-medium text-white bg-[#0D0D0F] rounded-lg hover:bg-[#232329] transition-colors"
                      >
                        {lang === 'en'
                          ? `Continue Day ${lastVisitedByCourse[activeCourse.id] || activeEnrollment?.currentDay || 1}`
                          : `Komeza Umunsi wa ${lastVisitedByCourse[activeCourse.id] || activeEnrollment?.currentDay || 1}`}
                      </button>
                    </div>
                  ) : pendingEnrollment ? (
                    <div className="space-y-3">
                      <div className="bg-[#FFFBEB] border border-[#D97706]/30 rounded-xl p-3.5 text-sm text-[#0D0D0F] space-y-1">
                        <p className="font-semibold">
                          {lang === 'en'
                            ? 'Payment Request Pending Verification'
                            : 'Ubwishyu Butegereje Kwemezwa'}
                        </p>
                        <p className="text-[#5D5D66] font-mono">
                          Ref: {pendingEnrollment.paymentRef}
                        </p>
                        <p className="text-[#5D5D66]">
                          {lang === 'en'
                            ? 'Full course access unlocks once your Mobile Money transfer is verified by platform staff.'
                            : 'Amasomo yose arafunguka ubwishyu bwawe bumaze kwemezwa n’ubuyobozi.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectDay(1)}
                        className="w-full px-4 py-2.5 text-[15px] font-medium text-[#0D0D0F] border border-black/15 rounded-lg hover:border-black/30 transition-colors"
                      >
                        {lang === 'en' ? 'Read Free Sample Lesson (Day 1)' : 'Soma Isomo rya 1 ku Buntu'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!user) {
                            onSignIn();
                          } else {
                            setCheckoutOpen(true);
                          }
                        }}
                        className="w-full px-4 py-3 text-[15px] font-medium text-white bg-[#0D0D0F] rounded-lg hover:bg-[#232329] transition-colors"
                      >
                        {user
                          ? lang === 'en'
                            ? 'Enroll via MTN MoMo / Airtel Money'
                            : 'Iyandikishe ukoresheje MoMo / Airtel'
                          : lang === 'en'
                            ? 'Sign in to Enroll'
                            : 'Injira wiyandikishe'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectDay(1)}
                        className="w-full px-4 py-2.5 text-[15px] font-medium text-[#0D0D0F] border border-black/15 rounded-lg hover:border-black/30 transition-colors"
                      >
                        {lang === 'en' ? 'Read Free Sample Lesson (Day 1)' : 'Soma Isomo rya 1 ku Buntu'}
                      </button>
                    </div>
                  )
                ) : waitlistsEnabled ? (
                  <button
                    type="button"
                    onClick={() => {
                      setWaitlistCourse(activeCourse);
                      setWaitlistDone(false);
                    }}
                    className="w-full px-4 py-3 text-[15px] font-medium text-white bg-[#0D0D0F] rounded-lg hover:bg-[#232329] transition-colors"
                  >
                    {lang === 'en' ? 'Join Upcoming Cohort Waitlist' : 'Iyandikishe ku rutonde rw’abategereje'}
                  </button>
                ) : (
                  <p className="text-sm text-[#5D5D66] border border-black/10 rounded-lg p-3 text-center">
                    {lang === 'en' ? 'Cohort waitlist is currently closed.' : 'Urutonde rurafunze.'}
                  </p>
                )}

                <p className="text-sm text-[#5D5D66] leading-relaxed">
                  {lang === 'en'
                    ? 'Free-tool policy: all introductory exercises run on free tiers of ChatGPT, Gemini, NotebookLM, Google Workspace, and Make.'
                    : 'Imyitozo yose ikoresha porogaramu z’ubuntu nta bundi buryo bwishyurwa busabwa.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fast Course Action Strip & Sub-Tab Switcher */}
        {(() => {
          const courseModules = modules
            .filter((m) => m.courseId === activeCourse.id && (m.isPublished || isAdmin))
            .sort((a, b) => a.orderIndex - b.orderIndex);
          const courseStructuredLessons = structuredLessons
            .filter((l) => l.courseId === activeCourse.id)
            .sort((a, b) => (a.dayNumber ?? 0) - (b.dayNumber ?? 0));
          const hasStructured = courseModules.length > 0 && courseStructuredLessons.length > 0;
          const sampleDays = hasStructured
            ? courseStructuredLessons.filter((l) => l.isSample).map((l) => l.dayNumber)
            : activeCourse.id === 'challenge-28'
              ? [1, 2, 8, 15, 22]
              : [1];
          const resumeDay =
            lastVisitedByCourse[activeCourse.id] || activeEnrollment?.currentDay || 1;
          const qSyll = syllabusSearch.trim().toLowerCase();

          return (
            <section className="pt-8 space-y-6">
              {/* Quick Navigation Strip */}
              <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectDay(resumeDay)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-[#0D7A5F] rounded-lg hover:bg-[#0B664F]"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'en'
                        ? `Jump to Day ${resumeDay}`
                        : `Fungura Umunsi wa ${resumeDay}`}
                    </span>
                  </button>
                  <div className="flex flex-wrap items-center gap-1.5 text-sm">
                    <span className="text-[#5D5D66] ml-1">
                      {lang === 'en' ? 'Free Samples:' : 'Ubuntu:'}
                    </span>
                    {sampleDays.map((sDay) => (
                      <button
                        key={sDay}
                        type="button"
                        onClick={() => onSelectDay(sDay)}
                        className="px-2.5 py-1.5 font-mono text-sm bg-white border border-black/15 rounded-lg hover:border-[#0D7A5F]"
                      >
                        D{sDay}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailTab('syllabus')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg border ${
                      detailTab === 'syllabus'
                        ? 'bg-[#0D0D0F] text-white border-[#0D0D0F]'
                        : 'bg-white text-[#5D5D66] border-black/10'
                    }`}
                  >
                    {lang === 'en' ? 'Syllabus & Finder' : 'Amasomo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailTab('blueprint')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg border ${
                      detailTab === 'blueprint'
                        ? 'bg-[#0D0D0F] text-white border-[#0D0D0F]'
                        : 'bg-white text-[#5D5D66] border-black/10'
                    }`}
                  >
                    {lang === 'en' ? '7 Levels & Grading Rubric' : 'Ibyiciro & Amanota'}
                  </button>
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => onNavigate('projects')}
                      className="px-3 py-1.5 text-sm font-medium bg-white border border-black/15 rounded-lg hover:border-black/30"
                    >
                      {lang === 'en' ? '6 Projects & Toolkits' : 'Imishinga 6'}
                    </button>
                  )}
                </div>
              </div>

              {detailTab === 'blueprint' ? (
                <div className="space-y-8 pt-2">
                  {/* Blueprint Master Specification PDF Link & Course Scope */}
                  <div className="bg-white border border-black/[0.08] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-mono text-[#0D7A5F] mb-1">
                        ACADEMIC &amp; PRODUCT MASTER BLUEPRINT · VERSION 1.0
                      </p>
                      <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
                        {lang === 'en'
                          ? 'Grading Structure, 7-Level Alignment & Course Standards'
                          : 'Imiterere y’Amanota n’Ibyiciro 7'}
                      </h2>
                      <p className="text-sm text-[#5D5D66] mt-1 max-w-2xl">
                        {lang === 'en'
                          ? 'Every lesson includes 16 structured sections (simple & technical explanations, Rwanda example, guided exercise, downloadable resource, verification check & reflection). Passing requires >=70% overall plus Final Project demonstration.'
                          : 'Buri somo ririmo ibice 16 birimo imyitozo ngiro, urugero rwo mu Rwanda, impapuro n’isuzuma. Gutahukana impamyabumenyi bisaba nibura 70%.'}
                      </p>
                    </div>
                    <a
                      href="/assets/aistudio/first_28_day_AI_COURSE_f519e752.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#0D0D0F] text-white rounded-lg hover:bg-[#232329]"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>
                        {lang === 'en' ? 'Open Master Blueprint PDF' : 'Fungura Inyandiko ya Blueprint'}
                      </span>
                    </a>
                  </div>

                  {/* Section 6 Assessment Weights */}
                  <div>
                    <h3 className="text-[18px] sm:text-[20px] font-bold tracking-[-0.015em] leading-[1.3] font-display text-[#0D0D0F] mb-3">
                      {lang === 'en'
                        ? 'Section 6 Assessment Weighting (100%)'
                        : 'Uko Amanota Agabanywa (100%)'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {BLUEPRINT_GRADING_BREAKDOWN.map((w) => (
                        <div
                          key={w.id}
                          className="bg-white border border-black/[0.08] rounded-xl p-4 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-[#0D0D0F]">
                              {w.label[lang]}
                            </span>
                            <span className="text-[15px] font-mono font-semibold text-[#0D7A5F] tabular-nums">
                              {w.weightPct}%
                            </span>
                          </div>
                          <p className="text-sm text-[#5D5D66] leading-relaxed">
                            {w.requirement[lang]}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 7-Criterion Final Project Rubric */}
                  <div>
                    <h3 className="text-[18px] sm:text-[20px] font-bold tracking-[-0.015em] leading-[1.3] font-display text-[#0D0D0F] mb-3">
                      {lang === 'en'
                        ? 'Final Project Rubric (7 Criteria · 30% Capstone)'
                        : 'Ibipimo 7 by’Umushinga wa Nyuma (30%)'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {FINAL_PROJECT_RUBRIC_7.map((c) => (
                        <div
                          key={c.id}
                          className="bg-[#F9F9FB] border border-black/[0.08] rounded-xl p-4 flex items-start justify-between gap-4"
                        >
                          <div>
                            <p className="text-sm font-semibold text-[#0D0D0F]">{c.criterion[lang]}</p>
                            <p className="text-sm text-[#5D5D66] mt-0.5">{c.description[lang]}</p>
                          </div>
                          <span className="text-sm font-mono font-semibold text-[#0D7A5F] tabular-nums shrink-0">
                            {c.weightPct}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 7-Level Skills Matrix */}
                  <div>
                    <h3 className="text-[18px] sm:text-[20px] font-bold tracking-[-0.015em] leading-[1.3] font-display text-[#0D0D0F] mb-3">
                      {lang === 'en' ? 'Seven-Level AI Skills Progression' : 'Ibyiciro 7 by’Ubumenyi'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {LEARNING_LEVELS.map((lvl) => (
                        <div
                          key={lvl.level}
                          className="bg-white border border-black/[0.08] rounded-xl p-4 space-y-1.5"
                        >
                          <p className="text-sm font-mono text-[#0D7A5F] tabular-nums">
                            Level 0{lvl.level} {lvl.codeRange ? `· ${lvl.codeRange}` : ''}
                          </p>
                          <p className="text-[15px] font-semibold text-[#0D0D0F]">{lvl.title[lang]}</p>
                          <p className="text-sm text-[#5D5D66]">{lvl.outcome[lang]}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : hasStructured ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-[24px] sm:text-[28px] tracking-[-0.02em] leading-[1.2] font-display font-bold text-[#0D0D0F]">
                        {lang === 'en' ? 'Structured Course Curriculum' : 'Gahunda y’Amasomo'}
                      </h2>
                      <p className="text-[15px] text-[#5D5D66] mt-1">
                        {courseModules.length} {lang === 'en' ? 'modules' : 'ibyiciro'} ·{' '}
                        {courseStructuredLessons.length} {lang === 'en' ? 'lessons' : 'amasomo'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-[#5D5D66] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="search"
                          value={syllabusSearch}
                          onChange={(e) => setSyllabusSearch(e.target.value)}
                          placeholder={lang === 'en' ? 'Search syllabus...' : 'Shakisha isomo...'}
                          className="pl-8 pr-3 py-1.5 text-sm bg-white border border-black/15 rounded-lg"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandAllSyllabus((v) => !v)}
                        className="px-3 py-1.5 text-sm font-medium bg-white border border-black/15 rounded-lg hover:border-black/30"
                      >
                        {expandAllSyllabus
                          ? lang === 'en'
                            ? 'Collapse All'
                            : 'Funga Yose'
                          : lang === 'en'
                            ? 'Expand All'
                            : 'Fungura Yose'}
                      </button>
                    </div>
                  </div>

                  {/* Module / Week Quick Tabs */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSyllabusWeekFilter('all')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg border ${
                        syllabusWeekFilter === 'all'
                          ? 'bg-[#0D0D0F] text-white border-[#0D0D0F]'
                          : 'bg-white text-[#5D5D66] border-black/10'
                      }`}
                    >
                      {lang === 'en' ? 'All Modules' : 'Byose'}
                    </button>
                    {courseModules.map((m, idx) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSyllabusWeekFilter(idx + 1);
                          setOpenModuleId(m.id);
                        }}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg border ${
                          syllabusWeekFilter === idx + 1
                            ? 'bg-[#0D0D0F] text-white border-[#0D0D0F]'
                            : 'bg-white text-[#5D5D66] border-black/10'
                        }`}
                      >
                        {lang === 'en' ? `Module ${idx + 1}` : `Igice ${idx + 1}`}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    {courseModules
                      .filter((_, idx) => syllabusWeekFilter === 'all' || syllabusWeekFilter === idx + 1)
                      .map((mod, mIdx) => {
                        const modLessons = courseStructuredLessons.filter((l) => {
                          if (l.moduleId !== mod.id) return false;
                          if (!qSyll) return true;
                          return (
                            l.titleEn.toLowerCase().includes(qSyll) ||
                            l.titleRw.toLowerCase().includes(qSyll) ||
                            (l.deliverableEn || '').toLowerCase().includes(qSyll) ||
                            `day ${l.dayNumber}`.includes(qSyll)
                          );
                        });
                        if (qSyll && modLessons.length === 0) return null;
                        const isOpen =
                          expandAllSyllabus ||
                          Boolean(qSyll) ||
                          (openModuleId ?? courseModules[0].id) === mod.id;
                        const modReleaseLock = resolveLessonReleaseLock({
                          courseModule: mod,
                          isStaff: isAdmin
                        });
                        return (
                          <div
                            key={mod.id}
                            className="border border-black/[0.08] rounded-2xl overflow-hidden bg-white"
                          >
                            <button
                              type="button"
                              onClick={() => setOpenModuleId(isOpen ? '' : mod.id)}
                              className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-[#F9F9FB] transition-colors"
                            >
                              <div>
                                <p className="text-sm font-mono text-[#0D7A5F] tabular-nums">
                                  {lang === 'en' ? `Module 0${mIdx + 1}` : `Igice cya 0${mIdx + 1}`}
                                  {modReleaseLock.locked && (
                                    <span className="ml-2 text-[#B45309]">
                                      ·{' '}
                                      {lang === 'en'
                                        ? `Unlocks ${formatReleaseDateLabel(modReleaseLock.effectiveReleaseAt, modReleaseLock.effectiveReleaseAtMs, lang)}`
                                        : `Izafungurwa ${formatReleaseDateLabel(modReleaseLock.effectiveReleaseAt, modReleaseLock.effectiveReleaseAtMs, lang)}`}
                                    </span>
                                  )}
                                </p>
                                <h3 className="text-[18px] sm:text-[20px] font-bold tracking-[-0.015em] leading-[1.3] font-display text-[#0D0D0F]">
                                  {lang === 'en' ? mod.titleEn : mod.titleRw}
                                </h3>
                              </div>
                              {isOpen ? (
                                <ChevronUp className="w-5 h-5 text-[#5D5D66]" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-[#5D5D66]" />
                              )}
                            </button>

                            {isOpen && (
                              <div className="border-t border-black/[0.06] divide-y divide-black/[0.06]">
                                {modLessons.map((les) => {
                                  const lesLock = resolveLessonReleaseLock({
                                    courseModule: mod,
                                    lesson: les,
                                    isStaff: isAdmin
                                  });
                                  const unlocked =
                                    !lesLock.locked && (les.isSample || isFreeCourse || hasFullAccess);
                                  const done = activeEnrollment?.completedDays.includes(les.dayNumber);
                                  return (
                                    <button
                                      key={les.id}
                                      type="button"
                                      onClick={() => onSelectDay(les.dayNumber)}
                                      className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-[#F9F9FB] transition-colors"
                                    >
                                      <div className="flex items-center gap-4 min-w-0">
                                        <span className="text-sm font-mono tabular-nums text-[#5D5D66] w-14 shrink-0">
                                          {lang === 'en' ? `Day ${les.dayNumber}` : `Umunsi ${les.dayNumber}`}
                                        </span>
                                        <div className="min-w-0">
                                          <p className="text-[15px] font-medium text-[#0D0D0F] truncate">
                                            {lang === 'en' ? les.titleEn : les.titleRw}
                                          </p>
                                          <p className="text-sm text-[#5D5D66] truncate tabular-nums">
                                            {les.estimatedMinutes || 15} min
                                            {les.deliverableEn
                                              ? ` · ${lang === 'en' ? les.deliverableEn : les.deliverableRw || les.deliverableEn}`
                                              : ''}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3 shrink-0">
                                        {done && (
                                          <span className="text-sm font-medium text-[#0D7A5F]">
                                            {lang === 'en' ? 'Done' : 'Byarangiye'}
                                          </span>
                                        )}
                                        {lesLock.locked && (
                                          <span className="inline-flex items-center gap-1 text-sm font-medium text-[#B45309]">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>
                                              {formatReleaseDateLabel(
                                                lesLock.effectiveReleaseAt,
                                                lesLock.effectiveReleaseAtMs,
                                                lang
                                              )}
                                            </span>
                                          </span>
                                        )}
                                        {!lesLock.locked && les.isSample && !hasFullAccess && (
                                          <span className="text-sm font-medium text-[#0D7A5F]">
                                            {lang === 'en' ? 'Free sample' : 'Ubuntu'}
                                          </span>
                                        )}
                                        {!unlocked ? (
                                          <Lock className="w-4 h-4 text-[#5D5D66]" />
                                        ) : (
                                          <ArrowRight className="w-4 h-4 text-[#0D0D0F]" />
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : activeCourse.id === 'challenge-28' ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-[24px] sm:text-[28px] tracking-[-0.02em] leading-[1.2] font-display font-bold text-[#0D0D0F]">
                        {lang === 'en' ? 'Complete 28-Day Curriculum' : 'Gahunda yuzuye y’Iminsi 28'}
                      </h2>
                      <p className="text-[15px] text-[#5D5D66] mt-1">
                        {lang === 'en'
                          ? 'Days 1, 2, 8, 15, and 22 are unlocked as free sample lessons for all visitors.'
                          : 'Iminsi ya 1, 2, 8, 15 na 22 irafunguye ku buntu kuri buri wese.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-[#5D5D66] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="search"
                          value={syllabusSearch}
                          onChange={(e) => setSyllabusSearch(e.target.value)}
                          placeholder={lang === 'en' ? 'Search days or tools...' : 'Shakisha isomo...'}
                          className="pl-8 pr-3 py-1.5 text-sm bg-white border border-black/15 rounded-lg"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandAllSyllabus((v) => !v)}
                        className="px-3 py-1.5 text-sm font-medium bg-white border border-black/15 rounded-lg hover:border-black/30"
                      >
                        {expandAllSyllabus
                          ? lang === 'en'
                            ? 'Collapse All'
                            : 'Funga Yose'
                          : lang === 'en'
                            ? 'Expand All'
                            : 'Fungura Yose'}
                      </button>
                    </div>
                  </div>

                  {/* Week Filter Tabs */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSyllabusWeekFilter('all')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg border ${
                        syllabusWeekFilter === 'all'
                          ? 'bg-[#0D0D0F] text-white border-[#0D0D0F]'
                          : 'bg-white text-[#5D5D66] border-black/10'
                      }`}
                    >
                      {lang === 'en' ? 'All 4 Weeks' : 'Ibyumweru 4'}
                    </button>
                    {weeks.map((wk) => (
                      <button
                        key={wk}
                        type="button"
                        onClick={() => {
                          setSyllabusWeekFilter(wk);
                          setOpenWeek(wk);
                        }}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg border ${
                          syllabusWeekFilter === wk
                            ? 'bg-[#0D0D0F] text-white border-[#0D0D0F]'
                            : 'bg-white text-[#5D5D66] border-black/10'
                        }`}
                      >
                        {lang === 'en' ? `Week ${wk}` : `Icyumweru ${wk}`}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    {weeks
                      .filter((w) => syllabusWeekFilter === 'all' || syllabusWeekFilter === w)
                      .map((weekNum) => {
                        const weekLessons = LESSONS_28.filter((l) => {
                          if (l.weekNumber !== weekNum) return false;
                          if (!qSyll) return true;
                          return (
                            l.title.en.toLowerCase().includes(qSyll) ||
                            l.title.rw.toLowerCase().includes(qSyll) ||
                            (l.deliverable?.en || '').toLowerCase().includes(qSyll) ||
                            l.tools.join(' ').toLowerCase().includes(qSyll) ||
                            `day ${l.dayNumber}`.includes(qSyll)
                          );
                        });
                        if (qSyll && weekLessons.length === 0) return null;
                        const weekTitle =
                          LESSONS_28.find((l) => l.weekNumber === weekNum)?.weekTitle[lang] ??
                          `Week ${weekNum}`;
                        const isOpen = expandAllSyllabus || Boolean(qSyll) || openWeek === weekNum;
                        const weekMod =
                          modules.find(
                            (m) => m.courseId === activeCourse.id && m.orderIndex === weekNum - 1
                          ) ?? null;

                        return (
                          <div
                            key={weekNum}
                            className="border border-black/[0.08] rounded-2xl overflow-hidden bg-white"
                          >
                            <button
                              type="button"
                              onClick={() => setOpenWeek(isOpen ? 0 : weekNum)}
                              className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-[#F9F9FB] transition-colors"
                            >
                              <div>
                                <p className="text-sm font-mono text-[#0D7A5F] tabular-nums">
                                  {lang === 'en' ? `Week 0${weekNum}` : `Icyumweru cya 0${weekNum}`}
                                </p>
                                <h3 className="text-[18px] sm:text-[20px] font-bold tracking-[-0.015em] leading-[1.3] font-display text-[#0D0D0F]">{weekTitle}</h3>
                              </div>
                              {isOpen ? (
                                <ChevronUp className="w-5 h-5 text-[#5D5D66]" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-[#5D5D66]" />
                              )}
                            </button>

                            {isOpen && (
                              <div className="border-t border-black/[0.06] divide-y divide-black/[0.06]">
                                {weekLessons.map((lesson) => {
                                  const sRec =
                                    courseStructuredLessons.find(
                                      (l) => l.dayNumber === lesson.dayNumber
                                    ) ?? null;
                                  const lesLock = resolveLessonReleaseLock({
                                    courseModule: weekMod,
                                    lesson: sRec,
                                    isStaff: isAdmin
                                  });
                                  const unlocked =
                                    !lesLock.locked && (lesson.isSample || hasFullAccess);
                                  const done = activeEnrollment?.completedDays.includes(lesson.dayNumber);
                                  return (
                                    <button
                                      key={lesson.dayNumber}
                                      type="button"
                                      onClick={() => onSelectDay(lesson.dayNumber)}
                                      className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-[#F9F9FB] transition-colors"
                                    >
                                      <div className="flex items-center gap-4 min-w-0">
                                        <span className="text-sm font-mono tabular-nums text-[#5D5D66] w-14 shrink-0">
                                          {lang === 'en' ? `Day ${lesson.dayNumber}` : `Umunsi ${lesson.dayNumber}`}
                                        </span>
                                        <div className="min-w-0">
                                          <p className="text-[15px] font-medium text-[#0D0D0F] truncate">
                                            {lesson.title[lang]}
                                          </p>
                                          <p className="text-sm text-[#5D5D66] truncate">
                                            {lesson.deliverable
                                              ? `${lesson.deliverable[lang]} · ${lesson.tools.join(' · ')}`
                                              : lesson.tools.join(' · ')}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3 shrink-0">
                                        {done && (
                                          <span className="text-sm font-medium text-[#0D7A5F]">
                                            {lang === 'en' ? 'Done' : 'Byarangiye'}
                                          </span>
                                        )}
                                        {lesLock.locked && (
                                          <span className="inline-flex items-center gap-1 text-sm font-medium text-[#B45309]">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>
                                              {formatReleaseDateLabel(
                                                lesLock.effectiveReleaseAt,
                                                lesLock.effectiveReleaseAtMs,
                                                lang
                                              )}
                                            </span>
                                          </span>
                                        )}
                                        {!lesLock.locked && lesson.isSample && !hasFullAccess && (
                                          <span className="text-sm font-medium text-[#0D7A5F]">
                                            {lang === 'en' ? 'Free sample' : 'Ubuntu'}
                                          </span>
                                        )}
                                        {!unlocked ? (
                                          <Lock className="w-4 h-4 text-[#5D5D66]" />
                                        ) : (
                                          <ArrowRight className="w-4 h-4 text-[#0D0D0F]" />
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6 text-[15px] text-[#5D5D66]">
                  {lang === 'en'
                    ? 'Curriculum modules for this upcoming track are currently being finalized by our academic team.'
                    : 'Gahunda y’iri somo rishya iri gutegurwa n’ikipe y’uburezi.'}
                </div>
              )}
            </section>
          );
        })()}

        {/* Mobile Money Checkout Modal (Responsive Mobile / Tablet / Laptop) */}
        {checkoutOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/45 flex items-end sm:items-center justify-center p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-title"
          >
            <div className="bg-white border border-black/10 rounded-t-2xl sm:rounded-2xl max-w-lg w-full max-h-[92dvh] overflow-y-auto p-5 sm:p-8">
              <div className="flex items-center justify-between gap-4 mb-5">
                <h2 id="checkout-title" className="text-xl sm:text-[24px] sm:text-[28px] tracking-[-0.02em] leading-[1.2] font-display font-bold text-[#0D0D0F]">
                  {lang === 'en' ? 'Mobile Money Enrollment' : 'Kwishyura na Mobile Money'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutOpen(false);
                    setPayError(null);
                    setPaySuccessInfo(null);
                  }}
                  className="px-3 py-1.5 text-[15px] font-medium text-[#5D5D66] hover:text-[#0D0D0F] rounded-lg hover:bg-[#F4F5F7]"
                >
                  {lang === 'en' ? 'Close' : 'Funga'}
                </button>
              </div>

              {paySuccessInfo ? (
                <div className="space-y-4">
                  <div
                    className={`rounded-xl p-4 border ${
                      paySuccessInfo.status === 'verified'
                        ? 'bg-[#ECFDF5] border-[#0D7A5F]/25'
                        : 'bg-[#FFFBEB] border-[#D97706]/30'
                    }`}
                  >
                    <p className="text-base font-semibold text-[#0D0D0F] mb-1">
                      {paySuccessInfo.status === 'verified'
                        ? lang === 'en'
                          ? 'Enrollment Verified & Active'
                          : 'Kwishyura Kwemejwe'
                        : lang === 'en'
                          ? 'Payment Request Submitted — Pending Verification'
                          : 'Ubusabe bwo Kwishyura Bwoherejwe — Butegereje Kwemezwa'}
                    </p>
                    <p className="text-[15px] text-[#5D5D66] font-mono mb-1.5">
                      Reference: {paySuccessInfo.transactionRef}
                    </p>
                    {paySuccessInfo.gatewayMessage && (
                      <p className="text-[15px] text-[#0D7A5F] mb-1.5">{paySuccessInfo.gatewayMessage}</p>
                    )}
                    {paySuccessInfo.status === 'pending' && (
                      <p className="text-[15px] text-[#5D5D66] leading-relaxed">
                        {lang === 'en'
                          ? 'Your request is recorded for payment verification. Full course access unlocks immediately once confirmed. You can read free sample lessons right now.'
                          : 'Ubusabe bwawe bwabitswe kugira ngo bwemezwe. Ushobora gutangira usoma amasomo y’ubuntu ako kanya.'}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutOpen(false);
                      setPaySuccessInfo(null);
                      onSelectDay(1);
                    }}
                    className="w-full min-h-[44px] px-5 py-3 text-[15px] font-semibold text-white bg-[#0D7A5F] hover:bg-[#095945] rounded-lg"
                  >
                    {lang === 'en' ? 'Open Day 1 Sample Lesson' : 'Tangira Umunsi wa 1'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleVerifyPayment} className="space-y-4">
                  <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-xl p-4 space-y-1 text-[15px]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#5D5D66]">{activeCourse.title[lang]}</span>
                      <span className="font-mono font-semibold tabular-nums text-[#0D0D0F]">
                        {(appliedCoupon ? appliedCoupon.netAmountRwf : activeCourse.priceRwf).toLocaleString()} RWF
                      </span>
                    </div>
                    {appliedCoupon && (
                      <p className="text-sm font-mono text-[#0D7A5F]">
                        Coupon {appliedCoupon.code}: -{appliedCoupon.discountRwf.toLocaleString()} RWF (Original{' '}
                        {activeCourse.priceRwf.toLocaleString()} RWF)
                      </p>
                    )}
                  </div>

                  {activeCohorts.filter((c) => c.status === 'enrolling' || c.status === 'active').length > 0 && (
                    <div>
                      <label className="block text-[15px] font-medium text-[#0D0D0F] mb-1.5">
                        {lang === 'en' ? 'Cohort Group' : 'Icyiciro'}
                      </label>
                      <select
                        value={
                          selectedCohortId ||
                          activeCohorts.find((c) => c.status === 'enrolling' || c.status === 'active')?.id ||
                          ''
                        }
                        onChange={(e) => setSelectedCohortId(e.target.value)}
                        className="w-full min-h-[44px] px-3.5 py-2.5 text-[15px] border border-black/15 rounded-lg bg-white"
                      >
                        {activeCohorts
                          .filter((c) => c.status === 'enrolling' || c.status === 'active')
                          .map((c) => {
                            const used = Number(c.enrolledCount ?? 0);
                            const full = c.capacity > 0 && used >= c.capacity;
                            return (
                              <option key={c.id} value={c.id} disabled={full}>
                                {c.name} ({c.startDate}){' '}
                                {c.capacity > 0 ? `· ${used}/${c.capacity} seats` : ''}
                                {full ? ' — FULL' : ''}
                              </option>
                            );
                          })}
                      </select>
                    </div>
                  )}

                  {couponsEnabled && (
                    <div>
                      <label className="block text-[15px] font-medium text-[#0D0D0F] mb-1.5">
                        {lang === 'en' ? 'Promo / Scholarship Coupon (optional)' : 'Kode igabanya (si itegeko)'}
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          placeholder="e.g. KIGALI20"
                          className="flex-1 min-h-[44px] px-3.5 py-2.5 text-base font-mono border border-black/15 rounded-lg"
                        />
                        <button
                          type="button"
                          disabled={couponBusy}
                          onClick={handleApplyCoupon}
                          className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-[15px] font-semibold border border-black/15 rounded-lg hover:border-black/30"
                        >
                          <Tag className="w-4 h-4" />
                          <span>{couponBusy ? '...' : lang === 'en' ? 'Apply' : 'Shyiraho'}</span>
                        </button>
                      </div>
                      {couponFeedback && (
                        <p
                          className={`text-sm mt-1.5 ${
                            appliedCoupon ? 'text-[#0D7A5F]' : 'text-[#DC2626]'
                          }`}
                        >
                          {couponFeedback}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-[15px] font-medium text-[#0D0D0F] mb-2">
                      {lang === 'en' ? 'Payment provider' : 'Uburyo bwo kwishyura'}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setProvider('mtn_momo')}
                        className={`min-h-[44px] px-4 py-2.5 text-[15px] font-medium rounded-lg border transition-colors ${
                          provider === 'mtn_momo'
                            ? 'bg-[#0D7A5F] text-white border-[#0D7A5F]'
                            : 'bg-white text-[#0D0D0F] border-black/15'
                        }`}
                      >
                        MTN MoMo (078/079)
                      </button>
                      <button
                        type="button"
                        onClick={() => setProvider('airtel_money')}
                        className={`min-h-[44px] px-4 py-2.5 text-[15px] font-medium rounded-lg border transition-colors ${
                          provider === 'airtel_money'
                            ? 'bg-[#0D7A5F] text-white border-[#0D7A5F]'
                            : 'bg-white text-[#0D0D0F] border-black/15'
                        }`}
                      >
                        Airtel Money (072/073)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="momo-phone" className="block text-[15px] font-medium text-[#0D0D0F] mb-1.5">
                      {lang === 'en' ? 'Rwanda Mobile Number' : 'Nimero ya Telefoni mu Rwanda'}
                    </label>
                    <input
                      id="momo-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={provider === 'mtn_momo' ? '0788 123 456' : '0738 123 456'}
                      className="w-full min-h-[44px] px-3.5 py-2.5 text-base border border-black/15 rounded-lg focus:outline-none focus:border-[#0D7A5F]"
                    />
                    <p className="text-sm text-[#5D5D66] mt-1.5 leading-relaxed">
                      {lang === 'en'
                        ? 'We verify transactions server-side with idempotency protection and never ask for or store your Mobile Money PIN.'
                        : 'Ntutange umubare wawe w’ibanga (PIN). Genzura iyandikishwa mu buryo bwizewe.'}
                    </p>
                  </div>

                  {payError && (
                    <p className="text-[15px] text-[#DC2626] bg-[#FEF2F2] border border-[#DC2626]/20 rounded-lg px-4 py-2.5">
                      {payError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={payLoading}
                    className="w-full min-h-[44px] px-5 py-3 text-[15px] font-semibold text-white bg-[#0D7A5F] hover:bg-[#095945] rounded-lg disabled:opacity-60"
                  >
                    {payLoading
                      ? lang === 'en'
                        ? 'Verifying transaction...'
                        : 'Iri kugenzura ubwishyu...'
                      : lang === 'en'
                        ? `Verify & Enroll (${(appliedCoupon ? appliedCoupon.netAmountRwf : activeCourse.priceRwf).toLocaleString()} RWF)`
                        : `Emeza & Iyandikishe (${(appliedCoupon ? appliedCoupon.netAmountRwf : activeCourse.priceRwf).toLocaleString()} RWF)`}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // COURSES CATALOGUE GRID
  const comparedCourses = catalog.filter((c) => compareIds.includes(c.id));

  return (
    <div className="max-w-[1260px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      {/* Courses Hero Banner */}
      <LuminousCover
        variant="banner"
        className="rounded-2xl text-white p-8 sm:p-12 lg:p-14 shadow-xs"
      >
        <div className="max-w-3xl">
          <h1 className="text-[36px] sm:text-[52px] lg:text-[58px] font-display font-bold tracking-[-0.03em] leading-[1.06] mb-3 text-balance">
            {lang === 'en' ? 'AI Education Rwanda Courses' : 'Amasomo ya AI Education Rwanda'}
          </h1>
          <p className="text-xl sm:text-2xl font-display font-semibold text-[#D1FAE5] mb-3">
            {lang === 'en'
              ? 'Build the AI skills Rwanda needs'
              : 'Wubake ubumenyi bwa AI bukenewe mu Rwanda'}
          </p>
          <p className="text-[16px] sm:text-[18px] text-white/95 leading-relaxed max-w-2xl mb-7">
            {lang === 'en'
              ? 'Practical courses for individuals and organizations, from the 28-Day Practical AI Challenge (1,000 RWF) to structured prompting, workflow automation, and AI agents.'
              : 'Amasomo afatika kuva ku minsi 28 (1,000 RWF) kugeza ku miyoboro yikoresha na AI Agents mu Cyongereza no mu Kinyarwanda.'}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onSelectCourse('challenge-28')}
              className="inline-flex items-center gap-2 px-5 py-3 text-[15px] font-semibold text-[#0D7A5F] bg-white hover:bg-[#ECFDF5] rounded-lg transition-colors whitespace-nowrap"
            >
              <span>{lang === 'en' ? 'Open 28-Day Challenge' : 'Fungura Iminsi 28'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectCourse('challenge-28');
                onSelectDay(1);
              }}
              className="inline-flex items-center gap-2 px-5 py-3 text-[15px] font-semibold text-white bg-white/15 hover:bg-white/25 border border-white/30 rounded-lg transition-colors whitespace-nowrap"
            >
              <span>{lang === 'en' ? 'Read Day 1 Free' : 'Soma Umunsi wa 1'}</span>
            </button>
          </div>
        </div>
      </LuminousCover>

      {/* 2. White Courses Container Card ("ABOUT THE COURSES") */}
      <section className="bg-white border border-black/[0.08] rounded-2xl p-6 sm:p-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[13px] sm:text-sm font-semibold tracking-wider text-[#0D7A5F] uppercase mb-1.5">
              {lang === 'en' ? 'About the courses' : 'Ibyerekeye amasomo'}
            </p>
            <h2 className="text-[28px] sm:text-[38px] lg:text-[42px] font-display font-bold tracking-[-0.025em] leading-[1.15] text-[#0D0D0F] text-balance">
              {lang === 'en' ? 'Learning is part of the work' : 'Kwiga ni igice cy’akazi'}
            </h2>
          </div>
        </div>

        {/* Fast Resume Strip */}
        {resumeBanner && (
          <div className="mb-8 bg-[#ECFDF5] border border-[#0D7A5F]/25 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-mono text-[#0D7A5F]">
                {lang === 'en' ? 'CONTINUE LEARNING' : 'KOMEZA KWIGA'}
              </p>
              <p className="text-lg font-semibold text-[#0D0D0F]">
                {resumeBanner.course.title[lang]} — Day {resumeBanner.day}
                {resumeBanner.completedCount > 0 ? ` (${resumeBanner.completedCount} completed)` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onSelectCourse(resumeBanner.course.id);
                onSelectDay(resumeBanner.day);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-[15px] font-semibold text-white bg-[#0D7A5F] hover:bg-[#095945] rounded-lg"
            >
              <Play className="w-4 h-4" />
              <span>{lang === 'en' ? `Resume Day ${resumeBanner.day}` : `Komeza Umunsi wa ${resumeBanner.day}`}</span>
            </button>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="space-y-4 pb-6 border-b border-black/[0.08] mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: 'all', label: lang === 'en' ? 'All' : 'Yose' },
                { key: 'foundations', label: lang === 'en' ? '28-Day Challenge' : 'Iminsi 28' },
                { key: 'prompting', label: lang === 'en' ? 'Prompting' : 'Amabwiriza' },
                { key: 'automation', label: lang === 'en' ? 'Automation' : 'Imiyoboro' },
                { key: 'agents', label: lang === 'en' ? 'AI Agents' : 'Agents' },
                { key: 'industry', label: lang === 'en' ? 'Industries' : 'Inzego' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setCategoryFilter(tab.key)}
                  className={`px-4 py-2 text-[15px] font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    categoryFilter === tab.key
                      ? 'bg-[#0D7A5F] text-white'
                      : 'bg-[#F4F5F7] text-[#4B4B55] hover:bg-[#EAECEF]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-[#5D5D66] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'en' ? 'Search courses...' : 'Shakisha isomo...'}
                className="w-full pl-10 pr-4 py-2.5 text-[15px] bg-[#F7F8FA] border border-black/10 rounded-lg focus:outline-none focus:border-[#0D7A5F]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                aria-label="Filter by level"
                className="px-3.5 py-2 text-sm border border-black/15 rounded-lg bg-white"
              >
                <option value="all">{lang === 'en' ? 'All Levels' : 'Ibyiciro Byose'}</option>
                <option value="1">Level 1+</option>
                <option value="2">Level 2+</option>
                <option value="4">Level 4+</option>
                <option value="6">Level 6+</option>
              </select>
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value as typeof priceFilter)}
                aria-label="Filter by price"
                className="px-3.5 py-2 text-sm border border-black/15 rounded-lg bg-white"
              >
                <option value="all">{lang === 'en' ? 'All Prices' : 'Ibiciro Byose'}</option>
                <option value="free">{lang === 'en' ? 'Free Courses' : 'Ubuntu'}</option>
                <option value="paid">{lang === 'en' ? 'Paid Courses' : 'Zishyurwa'}</option>
              </select>
            </div>

            {compareIds.length > 0 && (
              <button
                type="button"
                onClick={() => setCompareOpen(true)}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#0D7A5F] rounded-lg"
              >
                {lang === 'en'
                  ? `Compare Selected (${compareIds.length})`
                  : `Gereranya (${compareIds.length})`}
              </button>
            )}
          </div>
        </div>

        {filteredCatalog.length === 0 ? (
          <div className="py-16 text-center border border-black/[0.08] rounded-2xl bg-[#FAFAFB]">
            <p className="text-[16px] text-[#5D5D66]">
              {lang === 'en' ? 'No courses match your search filter.' : 'Nta somo ribonetse.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCatalog.map((course) => {
              const isEnrolled = enrollments.some(
                (e) => e.courseId === course.id && e.status === 'active'
              );
              const isPending = enrollments.some(
                (e) => e.courseId === course.id && e.status === 'pending'
              );
              const isCompared = compareIds.includes(course.id);
              const isFreeCourse = Boolean(course.isFree || course.priceRwf === 0);
              const coverGrad =
                COURSE_CATALOG_COVERS[course.category] || COURSE_CATALOG_COVERS.foundations;
              const outlineOpen = Boolean(cardOutlineOpen[course.id]);

              return (
                <article
                  key={course.id}
                  className="bg-white border border-black/[0.08] rounded-2xl overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {course.coverImageUrl ? (
                      <img
                        src={course.coverImageUrl}
                        alt={course.title[lang]}
                        referrerPolicy="no-referrer"
                        className="w-full h-36 object-cover"
                      />
                    ) : (
                      <LuminousCover variant={coverGrad} className="h-36 w-full" />
                    )}
                    <div className="p-6">
                      <p className="text-[15px] font-semibold text-[#0D7A5F] mb-2">
                        {course.code} · {course.levelRange} · {course.durationDays}d ·{' '}
                        {isEnrolled
                          ? lang === 'en'
                            ? 'Enrolled'
                            : 'Wariyandikishije'
                          : isPending
                            ? lang === 'en'
                              ? 'Pending verification'
                              : 'Bitegereje kwemezwa'
                            : course.status === 'active'
                              ? isFreeCourse
                                ? lang === 'en'
                                  ? 'Free'
                                  : 'Ubuntu'
                                : `${course.priceRwf.toLocaleString()} RWF`
                              : lang === 'en'
                                ? 'Upcoming'
                                : 'Biri hafi'}
                      </p>
                      <h2 className="text-[22px] sm:text-[24px] font-display font-bold tracking-[-0.02em] leading-[1.25] text-[#0D0D0F] mb-3">
                        {course.title[lang]}
                      </h2>
                      <p className="text-[15px] sm:text-[16px] text-[#5D5D66] leading-relaxed">
                        {course.description[lang]}
                      </p>
                    </div>
                  </div>

                  <div className="px-6 pb-6 space-y-4">
                    <div className="border-t border-black/[0.08] pt-3.5">
                      <button
                        type="button"
                        onClick={() =>
                          setCardOutlineOpen((prev) => ({
                            ...prev,
                            [course.id]: !prev[course.id]
                          }))
                        }
                        className="w-full flex items-center justify-between text-[16px] font-semibold text-[#0D0D0F] py-1.5"
                      >
                        <span>{lang === 'en' ? 'Course outline' : 'Incamake y’amasomo'}</span>
                        {outlineOpen ? (
                          <ChevronUp className="w-4 h-4 text-[#5D5D66]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#5D5D66]" />
                        )}
                      </button>
                      {outlineOpen && (
                        <ul className="mt-2.5 space-y-2 text-[14px] text-[#5D5D66]">
                          {course.outcomes[lang].slice(0, 4).map((out) => (
                            <li key={out} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-[#0D7A5F] shrink-0 mt-0.5" />
                              <span>{out}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => onSelectCourse(course.id)}
                        className="px-5 py-2.5 text-[15px] font-semibold text-white bg-[#0D7A5F] hover:bg-[#095945] rounded-lg transition-colors whitespace-nowrap"
                      >
                        {lang === 'en' ? 'Go to course' : 'Jya ku isomo'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleToggleCompare(course.id, e)}
                        className={`text-sm font-medium underline underline-offset-2 ${
                          isCompared ? 'text-[#0D7A5F]' : 'text-[#5D5D66] hover:text-[#0D0D0F]'
                        }`}
                      >
                        {isCompared ? 'Selected' : 'Compare'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Guided Learning Paths + Blueprint Industry Applications */}
      <section className="mt-16 pt-10 border-t border-black/[0.08] space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[13px] sm:text-sm font-semibold tracking-wider text-[#0D7A5F] uppercase mb-1">
              {lang === 'en' ? 'Guided sequences & industry tracks' : 'Inzira z’amasomo n’inzego'}
            </p>
            <h2 className="text-[28px] sm:text-[36px] font-display font-bold text-[#0D0D0F]">
              {lang === 'en' ? 'Recommended & Industry Learning Paths' : 'Inzira Ziteguwe mu Nzego z’Akazi'}
            </h2>
          </div>
          <p className="text-sm text-[#5D5D66]">
            {lang === 'en'
              ? 'Jump directly to recommended focus days inside Product 01.'
              : 'Hitamo urwego rwawe uhite ubona iminsi y’ingenzi muri AER-P01.'}
          </p>
        </div>

        {learningPaths.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {learningPaths.map((path) => (
              <div
                key={path.id}
                className="bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4"
              >
                <div>
                  <h3 className="text-xl font-display font-bold text-[#0D0D0F]">
                    {lang === 'en' ? path.titleEn : path.titleRw}
                  </h3>
                  {(path.descriptionEn || path.descriptionRw) && (
                    <p className="text-[15px] text-[#5D5D66] mt-1">
                      {lang === 'en' ? path.descriptionEn : path.descriptionRw || path.descriptionEn}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  {path.courseIds.map((cid, idx) => {
                    const c = catalog.find((x) => x.id === cid);
                    if (!c) return null;
                    return (
                      <button
                        key={cid}
                        type="button"
                        onClick={() => onSelectCourse(c.id)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-[#FAFAFB] border border-black/[0.08] rounded-xl text-left text-sm hover:border-[#0D7A5F]"
                      >
                        <span className="font-semibold text-[#0D0D0F]">
                          <span className="font-mono text-[#0D7A5F] mr-2">0{idx + 1}.</span>
                          {c.title[lang]}
                        </span>
                        <ArrowRight className="w-4 h-4 text-[#5D5D66]" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {INDUSTRY_LEARNING_PATHS_PRESETS.map((ind) => (
            <div
              key={ind.id}
              className="bg-white border border-black/[0.08] rounded-2xl p-6 flex flex-col justify-between gap-4"
            >
              <div>
                <p className="text-sm font-mono text-[#0D7A5F] mb-1.5">
                  {ind.sectorCode} · {lang === 'en' ? 'Industry Path' : 'Urwego'}
                </p>
                <h3 className="text-lg font-display font-bold text-[#0D0D0F] mb-2">
                  {lang === 'en' ? ind.titleEn : ind.titleRw}
                </h3>
                <p className="text-[15px] text-[#5D5D66] leading-relaxed">
                  {lang === 'en' ? ind.descriptionEn : ind.descriptionRw}
                </p>
              </div>
              <div className="pt-3 border-t border-black/[0.06] flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-mono text-[#5D5D66]">
                  Days: {ind.recommendedDays.join(', ')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onSelectCourse('challenge-28');
                    onSelectDay(ind.recommendedDays[0] || 1);
                  }}
                  className="text-[15px] font-semibold text-[#0D7A5F] hover:underline"
                >
                  {lang === 'en' ? 'Start Track ->' : 'Tangira ->'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Course Comparison Modal (Responsive Mobile / Tablet / Laptop) */}
      {compareOpen && comparedCourses.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-black/10 rounded-t-2xl sm:rounded-2xl max-w-4xl w-full p-5 sm:p-8 max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="text-[22px] sm:text-[26px] font-display font-bold tracking-[-0.02em] text-[#0D0D0F]">
                {lang === 'en' ? 'Side-by-Side Course Comparison' : 'Kugereranya Amasomo'}
              </h2>
              <button
                type="button"
                onClick={() => setCompareOpen(false)}
                className="px-3 py-1.5 text-[15px] font-medium text-[#5D5D66] hover:text-[#0D0D0F] rounded-lg hover:bg-[#F4F5F7]"
              >
                {lang === 'en' ? 'Close' : 'Funga'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {comparedCourses.map((c) => (
                <div key={c.id} className="bg-[#F9F9FB] border border-black/[0.08] rounded-xl p-5 space-y-3">
                  <div>
                    <p className="text-sm font-mono text-[#0D7A5F]">{c.code}</p>
                    <h3 className="text-[18px] sm:text-[20px] font-display font-bold text-[#0D0D0F] mt-0.5">
                      {c.title[lang]}
                    </h3>
                  </div>
                  <div className="text-[15px] space-y-1.5 text-[#5D5D66]">
                    <p>
                      <strong>Tuition:</strong>{' '}
                      {c.isFree || c.priceRwf === 0 ? 'Free' : `${c.priceRwf.toLocaleString()} RWF`}
                    </p>
                    <p>
                      <strong>Duration:</strong> {c.durationDays} days
                    </p>
                    <p>
                      <strong>Levels:</strong> {c.levelRange}
                    </p>
                    <p>
                      <strong>Certificate:</strong> {c.certificateEligible === false ? 'No' : 'Yes (QR)'}
                    </p>
                  </div>
                  <ul className="text-sm text-[#5D5D66] space-y-1.5 border-t border-black/[0.06] pt-2.5">
                    {c.outcomes[lang].slice(0, 3).map((out) => (
                      <li key={out}>• {out}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => {
                      setCompareOpen(false);
                      onSelectCourse(c.id);
                    }}
                    className="w-full min-h-[44px] px-4 py-2.5 text-[15px] font-semibold text-white bg-[#0D7A5F] hover:bg-[#095945] rounded-lg"
                  >
                    {lang === 'en' ? 'Open Course' : 'Fungura'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Waitlist Modal (Responsive Mobile / Tablet / Laptop) */}
      {waitlistCourse && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-black/10 rounded-t-2xl sm:rounded-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-display font-bold text-[#0D0D0F]">
                {waitlistCourse.title[lang]}
              </h2>
              <button
                type="button"
                onClick={() => setWaitlistCourse(null)}
                className="px-3 py-1.5 text-sm font-medium text-[#5D5D66] hover:text-[#0D0D0F] rounded-lg hover:bg-[#F4F5F7]"
              >
                {lang === 'en' ? 'Close' : 'Funga'}
              </button>
            </div>

            {waitlistDone ? (
              <div className="space-y-4">
                <p className="text-[15px] text-[#0D7A5F]">
                  {lang === 'en'
                    ? 'You are on the notification list. We launch advanced tracks after validating outcomes from the 28-Day Challenge.'
                    : 'Wanditswe ku rutonde. Tuzakumenyesha igihe iki cyiciro kizafungura.'}
                </p>
                <button
                  type="button"
                  onClick={() => setWaitlistCourse(null)}
                  className="w-full min-h-[44px] px-5 py-3 text-[15px] font-semibold text-white bg-[#0D7A5F] rounded-lg"
                >
                  {lang === 'en' ? 'Done' : 'Byarangiye'}
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setWaitlistBusy(true);
                  await onSubmitWaitlist(waitlistCourse.slug, waitlistName, waitlistEmail);
                  setWaitlistBusy(false);
                  setWaitlistDone(true);
                }}
                className="space-y-4"
              >
                <p className="text-[15px] text-[#5D5D66] leading-relaxed">
                  {lang === 'en'
                    ? 'Leave your name and email to get early access when this cohort opens.'
                    : 'Shyiramo amazina yawe na imeri kugira ngo tukumenyeshe nibiratangira.'}
                </p>
                <input
                  type="text"
                  required
                  value={waitlistName}
                  onChange={(e) => setWaitlistName(e.target.value)}
                  placeholder={lang === 'en' ? 'Full name' : 'Amazina yose'}
                  className="w-full min-h-[44px] px-4 py-2.5 text-base border border-black/15 rounded-lg"
                />
                <input
                  type="email"
                  required
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full min-h-[44px] px-4 py-2.5 text-base border border-black/15 rounded-lg"
                />
                <button
                  type="submit"
                  disabled={waitlistBusy}
                  className="w-full min-h-[44px] px-5 py-3 text-[15px] font-semibold text-white bg-[#0D7A5F] hover:bg-[#095945] rounded-lg"
                >
                  {waitlistBusy
                    ? lang === 'en'
                      ? 'Saving...'
                      : 'Birabikwa...'
                    : lang === 'en'
                      ? 'Notify me'
                      : 'Uzabimenyeshe'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
