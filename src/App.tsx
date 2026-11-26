/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  sendEmailVerification,
  signInWithPopup,
  signOut,
  type User
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType
} from './firebase';
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
  LearningPath,
  LessonContent,
  NotificationRecord,
  PageRoute,
  PlatformSettings,
  ProgrammeRecord,
  ProjectSubmission,
  QuizAttempt,
  ResourceItem,
  RubricConfig,
  StaffRoleRecord,
  StructuredLessonRecord,
  SupportTicket,
  TicketMessage,
  UserProfile
} from './types';
import { COURSES } from './data/curriculum';
import { resolveUserAccess, type ResolvedAccess } from './lib/permissions';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { SidebarNav } from './components/SidebarNav';
import { SubBar } from './components/SubBar';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { CoursesView } from './components/CoursesView';
import { EventsView } from './components/EventsView';
import { ProjectsHubView } from './components/ProjectsHubView';
import { AboutVerifyView } from './components/AboutVerifyView';
import { LearnerDashboard } from './components/LearnerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';

const DEFAULT_ACCESS: ResolvedAccess = {
  role: 'learner',
  permissions: [],
  assignedCourseIds: [],
  isStaff: false,
  isSuperadmin: false,
  isAdmin: false
};

function PlatformShell() {
  const [lang, setLang] = useState<Language>('en');
  const [route, setRoute] = useState<PageRoute>('home');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [verifyCertId, setVerifyCertId] = useState<string>('RW-AI-2026-0042');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [courseTrackFilter, setCourseTrackFilter] = useState<string>('all');

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [access, setAccess] = useState<ResolvedAccess>(DEFAULT_ACCESS);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [allowStaffLearnerPreview, setAllowStaffLearnerPreview] = useState(false);
  const syncInFlightRef = useRef<{ uid: string; promise: Promise<void> } | null>(null);
  const pendingWorkspaceRedirectRef = useRef(false);

  const [courses, setCourses] = useState<Course[]>(COURSES);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeRecord[]>([]);
  const [quizzes, setQuizzes] = useState<DynamicQuiz[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [rubrics, setRubrics] = useState<RubricConfig[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [structuredLessons, setStructuredLessons] = useState<StructuredLessonRecord[]>([]);
  const [customLessonsMap, setCustomLessonsMap] = useState<Record<number, Partial<LessonContent>>>({});
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [eventRegistrations, setEventRegistrations] = useState<EventRegistration[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [learnerNotes, setLearnerNotes] = useState<LearnerNote[]>([]);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);

  const loadPublicCatalog = useCallback(async () => {
    try {
      const [
        coursesSnap,
        modulesSnap,
        cohortsSnap,
        pathsSnap,
        sampleSnap,
        progSnap,
        quizSnap,
        resSnap,
        annSnap,
        settingsSnap
      ] = await Promise.all([
        getDocs(collection(db, 'courses')).catch(() => null),
        getDocs(collection(db, 'modules')).catch(() => null),
        getDocs(collection(db, 'cohorts')).catch(() => null),
        getDocs(query(collection(db, 'learningPaths'), where('isPublished', '==', true))).catch(() => null),
        getDocs(query(collection(db, 'lessons'), where('isSample', '==', true))).catch(async () => {
          const safeNow = Math.max(0, Date.now() - 2000);
          const snap = await getDocs(
            query(collection(db, 'lessons'), where('releaseAtMs', '<=', safeNow))
          ).catch(() => null);
          if (!snap) return null;
          return {
            empty: snap.empty,
            docs: snap.docs.filter((d) => Boolean((d.data() as StructuredLessonRecord).isSample))
          };
        }),
        getDocs(
          query(
            collection(db, 'programmes'),
            where('status', 'in', [
              'upcoming',
              'registration_open',
              'fully_booked',
              'in_progress',
              'completed',
              'cancelled'
            ])
          )
        ).catch(() => null),
        getDocs(query(collection(db, 'quizzes'), where('isPublished', '==', true))).catch(() => null),
        getDocs(query(collection(db, 'resources'), where('isPublished', '==', true))).catch(() => null),
        getDocs(query(collection(db, 'announcements'), where('isPublished', '==', true))).catch(() => null),
        getDoc(doc(db, 'platformSettings', 'public')).catch(() => null)
      ]);

      if (coursesSnap && !coursesSnap.empty) {
        const mapped = coursesSnap.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          const fallback = COURSES.find((c) => c.id === raw.id) ?? COURSES[0];
          return {
            ...fallback,
            id: String(raw.id || fallback.id),
            slug: String(raw.slug || fallback.slug),
            code: String(raw.code || fallback.code),
            status: (raw.status as Course['status']) || fallback.status,
            category: (raw.category as Course['category']) || fallback.category,
            visibility: (raw.visibility as Course['visibility']) || 'public',
            isFree: Boolean(raw.isFree),
            priceRwf: Number(raw.priceRwf ?? fallback.priceRwf),
            durationDays: Number(raw.durationDays ?? fallback.durationDays),
            capacity: raw.capacity !== undefined ? Number(raw.capacity) : 0,
            certificateEligible: raw.certificateEligible !== false,
            levelRange: String(raw.levelRange || fallback.levelRange),
            startDate: raw.startDate ? String(raw.startDate) : undefined,
            endDate: raw.endDate ? String(raw.endDate) : undefined,
            coverImageUrl: raw.coverImageUrl ? String(raw.coverImageUrl) : undefined,
            promoVideoUrl: raw.promoVideoUrl ? String(raw.promoVideoUrl) : undefined,
            prerequisitesText: raw.prerequisitesText ? String(raw.prerequisitesText) : undefined,
            seoTitle: raw.seoTitle ? String(raw.seoTitle) : undefined,
            seoDescription: raw.seoDescription ? String(raw.seoDescription) : undefined,
            title: {
              en: String(raw.titleEn || fallback.title.en),
              rw: String(raw.titleRw || fallback.title.rw)
            },
            subtitle: {
              en: String(raw.subtitleEn || fallback.subtitle.en),
              rw: String(raw.subtitleRw || fallback.subtitle.rw)
            },
            description: {
              en: String(raw.descriptionEn || fallback.description.en),
              rw: String(raw.descriptionRw || fallback.description.rw)
            },
            outcomes: {
              en: Array.isArray(raw.outcomesEn) ? (raw.outcomesEn as string[]) : fallback.outcomes.en,
              rw: Array.isArray(raw.outcomesRw) ? (raw.outcomesRw as string[]) : fallback.outcomes.rw
            },
            audience: {
              en: Array.isArray(raw.audienceEn) ? (raw.audienceEn as string[]) : fallback.audience.en,
              rw: Array.isArray(raw.audienceRw) ? (raw.audienceRw as string[]) : fallback.audience.rw
            },
            deviceNote: {
              en: typeof raw.deviceNoteEn === 'string' && raw.deviceNoteEn.trim() ? raw.deviceNoteEn : fallback.deviceNote.en,
              rw: typeof raw.deviceNoteRw === 'string' && raw.deviceNoteRw.trim() ? raw.deviceNoteRw : fallback.deviceNote.rw
            }
          };
        });
        setCourses(mapped);
      }

      if (modulesSnap) setModules(modulesSnap.docs.map((d) => d.data() as CourseModule));
      if (cohortsSnap) setCohorts(cohortsSnap.docs.map((d) => d.data() as Cohort));
      if (pathsSnap) setLearningPaths(pathsSnap.docs.map((d) => d.data() as LearningPath));
      if (progSnap) setProgrammes(progSnap.docs.map((d) => d.data() as ProgrammeRecord));
      if (quizSnap) setQuizzes(quizSnap.docs.map((d) => d.data() as DynamicQuiz));
      if (resSnap) setResources(resSnap.docs.map((d) => d.data() as ResourceItem));

      if (sampleSnap && !sampleSnap.empty) {
        const samples = sampleSnap.docs.map((docSnap) => docSnap.data() as StructuredLessonRecord);
        setStructuredLessons((prev) => {
          const byId = new Map<string, StructuredLessonRecord>();
          prev.forEach((l) => byId.set(l.id, l));
          samples.forEach((l) => byId.set(l.id, l));
          return Array.from(byId.values());
        });

        const nextMap: Record<number, Partial<LessonContent>> = {};
        samples.forEach((data) => {
          if (data.courseId === 'challenge-28' && data.dayNumber >= 1 && data.dayNumber <= 28) {
            nextMap[data.dayNumber] = {
              title: {
                en: String(data.titleEn || ''),
                rw: String(data.titleRw || '')
              },
              introduction: {
                en: String(data.summaryEn || ''),
                rw: String(data.summaryRw || '')
              }
            };
          }
        });
        setCustomLessonsMap(nextMap);
      }

      if (annSnap && !annSnap.empty) {
        setAnnouncements(annSnap.docs.map((d) => d.data() as Announcement));
      }

      if (settingsSnap && settingsSnap.exists()) {
        const ps = settingsSnap.data() as PlatformSettings;
        setPlatformSettings(ps);
        if (!auth.currentUser && (ps.defaultLanguage === 'en' || ps.defaultLanguage === 'rw')) {
          setLang(ps.defaultLanguage);
        }
      }
    } catch {
      // Keep built-in curriculum dataset if catalog hasn't been seeded yet
    }
  }, []);

  const loadLearnerData = useCallback(async (currentUser: User, isEduStaff = false) => {
    try {
      const [
        enrSnap,
        quizSnap,
        subSnap,
        certSnap,
        regSnap,
        ntfSnap,
        tktSnap,
        rubricSnap,
        notesSnap,
        tktMsgsSnap
      ] = await Promise.all([
        getDocs(query(collection(db, 'enrollments'), where('userId', '==', currentUser.uid))),
        getDocs(query(collection(db, 'quizAttempts'), where('userId', '==', currentUser.uid))),
        getDocs(query(collection(db, 'projectSubmissions'), where('userId', '==', currentUser.uid))),
        getDocs(query(collection(db, 'certificates'), where('userId', '==', currentUser.uid))),
        getDocs(query(collection(db, 'eventRegistrations'), where('userId', '==', currentUser.uid))),
        getDocs(query(collection(db, 'notifications'), where('userId', '==', currentUser.uid))),
        getDocs(query(collection(db, 'supportTickets'), where('userId', '==', currentUser.uid))),
        getDocs(collection(db, 'rubrics')).catch(() => null),
        getDocs(query(collection(db, 'learnerNotes'), where('userId', '==', currentUser.uid))).catch(() => null),
        getDocs(
          query(collection(db, 'ticketMessages'), where('ticketOwnerUid', '==', currentUser.uid))
        ).catch(() => null)
      ]);

      const loadedEnrollments = enrSnap.docs.map((d) => d.data() as Enrollment);
      setEnrollments(loadedEnrollments);
      setQuizAttempts(quizSnap.docs.map((d) => d.data() as QuizAttempt));
      setSubmissions(subSnap.docs.map((d) => d.data() as ProjectSubmission));
      setCertificates(certSnap.docs.map((d) => d.data() as Certificate));
      setEventRegistrations(regSnap.docs.map((d) => d.data() as EventRegistration));
      setNotifications(ntfSnap.docs.map((d) => d.data() as NotificationRecord));
      setSupportTickets(tktSnap.docs.map((d) => d.data() as SupportTicket));
      if (rubricSnap) setRubrics(rubricSnap.docs.map((d) => d.data() as RubricConfig));
      if (notesSnap) setLearnerNotes(notesSnap.docs.map((d) => d.data() as LearnerNote));
      if (tktMsgsSnap) setTicketMessages(tktMsgsSnap.docs.map((d) => d.data() as TicketMessage));

      // Load full structured lessons for staff or actively enrolled courses
      if (isEduStaff) {
        const allLessonsSnap = await getDocs(collection(db, 'lessons'));
        setStructuredLessons(allLessonsSnap.docs.map((d) => d.data() as StructuredLessonRecord));
      } else {
        const activeCourseIds = Array.from(
          new Set(loadedEnrollments.filter((e) => e.status === 'active').map((e) => e.courseId))
        );
        if (activeCourseIds.length > 0) {
          const snaps = await Promise.all(
            activeCourseIds.map((cid) =>
              getDocs(query(collection(db, 'lessons'), where('courseId', '==', cid))).catch(
                async () => {
                  const safeNow = Math.max(0, Date.now() - 2000);
                  const releasedSnap = await getDocs(
                    query(collection(db, 'lessons'), where('releaseAtMs', '<=', safeNow))
                  ).catch(() => null);
                  if (!releasedSnap) return null;
                  return {
                    docs: releasedSnap.docs.filter(
                      (d) => (d.data() as StructuredLessonRecord).courseId === cid
                    )
                  };
                }
              )
            )
          );
          const merged = new Map<string, StructuredLessonRecord>();
          snaps.forEach((snap) => {
            snap?.docs.forEach((d) => {
              const rec = d.data() as StructuredLessonRecord;
              merged.set(rec.id, rec);
            });
          });
          if (merged.size > 0) {
            setStructuredLessons((prev) => {
              const combined = new Map<string, StructuredLessonRecord>();
              prev.forEach((l) => combined.set(l.id, l));
              merged.forEach((l, id) => combined.set(id, l));
              return Array.from(combined.values());
            });
          }
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'learner_workspace');
    }
  }, []);

  const syncAuthenticatedUser = useCallback(
    async (nextUser: User | null, redirectToWorkspace = false) => {
      if (redirectToWorkspace) {
        pendingWorkspaceRedirectRef.current = true;
      }
      setUser(nextUser);
      setVerifyNotice(null);
      if (!nextUser) {
        syncInFlightRef.current = null;
        pendingWorkspaceRedirectRef.current = false;
        setProfile(null);
        setAccess(DEFAULT_ACCESS);
        setAllowStaffLearnerPreview(false);
        setEnrollments([]);
        setQuizAttempts([]);
        setSubmissions([]);
        setCertificates([]);
        setEventRegistrations([]);
        setNotifications([]);
        setSupportTickets([]);
        setRubrics([]);
        setLearnerNotes([]);
        setTicketMessages([]);
        setAuthReady(true);
        return;
      }

      if (syncInFlightRef.current && syncInFlightRef.current.uid === nextUser.uid) {
        await syncInFlightRef.current.promise;
        return;
      }

      const run = (async () => {
        try {
          await nextUser.getIdToken().catch(() => null);

          let staffDoc: StaffRoleRecord | null = null;
          let adminDocExists = false;

          if (nextUser.emailVerified) {
            try {
              const [staffSnap, adminSnap] = await Promise.all([
                getDoc(doc(db, 'staffRoles', nextUser.uid)),
                getDoc(doc(db, 'admins', nextUser.uid))
              ]);
              staffDoc = staffSnap.exists() ? (staffSnap.data() as StaffRoleRecord) : null;
              adminDocExists = adminSnap.exists();
            } catch {
              staffDoc = null;
              adminDocExists = false;
            }
          }

          const resolved = resolveUserAccess(
            nextUser.email,
            nextUser.emailVerified,
            staffDoc,
            adminDocExists
          );
          setAccess(resolved);

          if (nextUser.emailVerified) {
            const userPath = `users/${nextUser.uid}`;
            const userRef = doc(db, 'users', nextUser.uid);
            const fallbackName = (
              nextUser.displayName ||
              nextUser.email?.split('@')[0] ||
              (resolved.isSuperadmin ? 'Founder Superadmin' : 'Learner')
            )
              .trim()
              .slice(0, 120);
            const fallbackEmail = (nextUser.email || '').trim().slice(0, 200);

            let userSnap;
            try {
              userSnap = await getDoc(userRef);
            } catch (err) {
              handleFirestoreError(err, OperationType.GET, userPath);
              return;
            }

            if (!userSnap.exists()) {
              const newProfile: UserProfile = {
                uid: nextUser.uid,
                displayName: fallbackName || 'Learner',
                email: fallbackEmail,
                preferredLanguage: lang,
                role: resolved.role,
                accountStatus: 'active',
                privacyConsentAcceptedAt: new Date().toISOString(),
                marketingOptIn: false
              };
              try {
                await setDoc(userRef, {
                  ...newProfile,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                });
              } catch (err) {
                handleFirestoreError(err, OperationType.CREATE, userPath);
                return;
              }
              setProfile(newProfile);
            } else {
              const existingRaw = userSnap.data() as Record<string, unknown>;
              const existing = existingRaw as unknown as UserProfile;
              const targetRole = resolved.isSuperadmin
                ? 'superadmin'
                : resolved.role !== 'learner'
                  ? resolved.role
                  : existing.role || 'learner';
              const allowedKeys = new Set([
                'uid',
                'displayName',
                'email',
                'preferredLanguage',
                'role',
                'accountStatus',
                'suspensionReason',
                'privacyConsentAcceptedAt',
                'marketingOptIn',
                'createdAt',
                'updatedAt'
              ]);
              const hasExtraKeys = Object.keys(existingRaw).some((k) => !allowedKeys.has(k));
              const hasTimestampCreatedAt =
                Boolean(existingRaw.createdAt) &&
                typeof existingRaw.createdAt === 'object' &&
                existingRaw.createdAt !== null &&
                typeof (existingRaw.createdAt as { toMillis?: unknown }).toMillis === 'function';
              const missingRequired =
                !existingRaw.uid ||
                !existingRaw.displayName ||
                !existingRaw.email ||
                (existingRaw.preferredLanguage !== 'en' && existingRaw.preferredLanguage !== 'rw') ||
                (existingRaw.accountStatus !== 'active' && existingRaw.accountStatus !== 'suspended') ||
                !hasTimestampCreatedAt ||
                hasExtraKeys;
              const needsRoleSync = existing.role !== targetRole;

              if (needsRoleSync || missingRequired) {
                const safeDisplayName = String(existingRaw.displayName || fallbackName || 'Learner')
                  .trim()
                  .slice(0, 120);
                const safeEmail = String(existingRaw.email || fallbackEmail).trim().slice(0, 200);
                const safeLang: Language =
                  existingRaw.preferredLanguage === 'en' || existingRaw.preferredLanguage === 'rw'
                    ? existingRaw.preferredLanguage
                    : lang;
                const safeStatus: 'active' | 'suspended' =
                  existingRaw.accountStatus === 'suspended' ? 'suspended' : 'active';
                const cleanProfile: UserProfile = {
                  uid: nextUser.uid,
                  displayName: safeDisplayName,
                  email: safeEmail,
                  preferredLanguage: safeLang,
                  role: targetRole,
                  accountStatus: safeStatus,
                  ...(typeof existingRaw.suspensionReason === 'string' && existingRaw.suspensionReason
                    ? { suspensionReason: existingRaw.suspensionReason.slice(0, 400) }
                    : {}),
                  ...(typeof existingRaw.privacyConsentAcceptedAt === 'string' &&
                  existingRaw.privacyConsentAcceptedAt
                    ? {
                        privacyConsentAcceptedAt: existingRaw.privacyConsentAcceptedAt.slice(0, 64)
                      }
                    : { privacyConsentAcceptedAt: new Date().toISOString() }),
                  marketingOptIn: Boolean(existingRaw.marketingOptIn)
                };
                try {
                  await setDoc(userRef, {
                    ...cleanProfile,
                    createdAt: hasTimestampCreatedAt ? existingRaw.createdAt : serverTimestamp(),
                    updatedAt: serverTimestamp()
                  });
                } catch (err) {
                  handleFirestoreError(err, OperationType.UPDATE, userPath);
                  return;
                }
                setProfile(cleanProfile);
              } else {
                setProfile(existing);
              }

              if (existing.preferredLanguage === 'en' || existing.preferredLanguage === 'rw') {
                setLang(existing.preferredLanguage);
              }
            }

            const isEduStaff =
              resolved.isAdmin ||
              resolved.role === 'course_manager' ||
              resolved.role === 'instructor';
            await loadLearnerData(nextUser, isEduStaff);

            const shouldRedirect = pendingWorkspaceRedirectRef.current;
            pendingWorkspaceRedirectRef.current = false;
            setRoute((prev) => {
              if (resolved.isStaff) {
                if (shouldRedirect || prev === 'home' || prev === 'dashboard') {
                  return 'admin';
                }
                return prev;
              }
              if (prev === 'admin') {
                return 'dashboard';
              }
              if (shouldRedirect && prev === 'home') {
                return 'dashboard';
              }
              return prev;
            });
          }

          setAuthReady(true);
        } finally {
          if (syncInFlightRef.current?.uid === nextUser.uid) {
            syncInFlightRef.current = null;
          }
        }
      })();

      syncInFlightRef.current = { uid: nextUser.uid, promise: run };
      await run;
    },
    [lang, loadLearnerData]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyParam = params.get('verify');
    const courseParam = params.get('course');
    const dayParam = params.get('day');
    if (verifyParam) {
      setVerifyCertId(verifyParam);
      setRoute('verify');
    } else if (courseParam) {
      setSelectedCourseId(courseParam);
      if (dayParam && Number.isFinite(Number(dayParam)) && Number(dayParam) >= 1) {
        setSelectedDay(Math.floor(Number(dayParam)));
      }
      setRoute('course-detail');
    }
    loadPublicCatalog();
  }, [loadPublicCatalog]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      await syncAuthenticatedUser(nextUser, false);
    });
    return () => unsub();
  }, [syncAuthenticatedUser]);

  const handleOpenSignIn = () => {
    setAuthModalOpen(true);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setAllowStaffLearnerPreview(false);
    if (route === 'dashboard' || route === 'admin') {
      setRoute('home');
    }
  };

  const handleRefreshVerification = async () => {
    const current = auth.currentUser;
    if (!current) return;
    setVerifyBusy(true);
    setVerifyNotice(null);
    try {
      await current.reload();
      if (current.emailVerified) {
        await current.getIdToken(true);
        await syncAuthenticatedUser(current, true);
      } else {
        setVerifyNotice(
          lang === 'en'
            ? 'Verification not detected yet. Check your inbox or click Continue with Google for instant verification.'
            : 'Kwemeza imeli ntikuraboneka. Reba kuri imeli yawe cyangwa ukoreshe Google.'
        );
      }
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    const current = auth.currentUser;
    if (!current) return;
    setVerifyBusy(true);
    try {
      await sendEmailVerification(current);
      setVerifyNotice(
        lang === 'en'
          ? `Verification link sent to ${current.email}.`
          : `Link yo kwemeza yoherejwe kuri ${current.email}.`
      );
    } catch {
      setVerifyNotice(
        lang === 'en'
          ? 'Verification email already sent recently. Check your inbox/spam or use Google Sign-In.'
          : 'Ubutumwa bwoherejwe vuba. Reba muri imeli yawe cyangwa ukoreshe Google.'
      );
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleVerifyViaGoogle = async () => {
    setVerifyBusy(true);
    setVerifyNotice(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await syncAuthenticatedUser(cred.user, true);
    } catch (err) {
      setVerifyNotice(err instanceof Error ? err.message : 'Google verification cancelled.');
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleNavigate = (nextRoute: PageRoute) => {
    if (nextRoute === 'dashboard' && access.isStaff && !allowStaffLearnerPreview) {
      setAllowStaffLearnerPreview(false);
    }
    setRoute(nextRoute);
    if (nextRoute !== 'courses' && nextRoute !== 'course-detail') {
      setSelectedCourseId(null);
      setSelectedDay(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCourse = (courseId: string | null) => {
    setSelectedCourseId(courseId);
    setSelectedDay(null);
    setRoute(courseId ? 'course-detail' : 'courses');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenSampleDay = (dayNumber: number) => {
    setSelectedCourseId('challenge-28');
    setSelectedDay(dayNumber);
    setRoute('course-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitWaitlist = async (courseSlug: string, name: string, email: string) => {
    const id = `wl_${Date.now()}`;
    try {
      const checkRes = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          type: 'waitlist'
        })
      });
      if (!checkRes.ok) {
        const errBody = (await checkRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody.error || 'Waitlist request throttled. Please try again shortly.');
      }
      await setDoc(doc(db, 'inquiries', id), {
        id,
        type: 'waitlist',
        name: name.trim(),
        email: email.trim(),
        courseSlug,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `inquiries/${id}`);
    }
  };

  const visibleCourses = courses.filter((c) => {
    if (access.isStaff) return true;
    const isEnrolled = enrollments.some((e) => e.courseId === c.id && e.status === 'active');
    if (isEnrolled) return c.status !== 'archived';
    const isPublicVis = !c.visibility || c.visibility === 'public';
    return isPublicVis && c.status !== 'draft' && c.status !== 'archived';
  });

  const renderVerificationGate = () => (
    <div className="max-w-lg mx-auto px-6 py-20 text-center space-y-4">
      <p className="text-xs font-mono text-[#0D7A5F] uppercase">Email Verification Required</p>
      <h1 className="text-2xl font-display font-semibold text-[#0D0D0F]">
        {lang === 'en' ? 'Verify Your Email to Unlock Your Workspace' : 'Emeza Imeli Yawe'}
      </h1>
      <p className="text-sm text-[#5D5D66] leading-relaxed">
        {lang === 'en'
          ? `Signed in as ${user?.email}. Click the verification link sent to your inbox, then click Refresh below.`
          : `Winjiye nka ${user?.email}. Kanda link yoherejwe kuri imeli yawe hanyuma ukande Kugenzura.`}
      </p>
      {verifyNotice && (
        <p className="text-xs text-[#0D7A5F] bg-[#ECFDF5] border border-[#0D7A5F]/20 rounded-lg p-3">
          {verifyNotice}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          type="button"
          disabled={verifyBusy}
          onClick={handleRefreshVerification}
          className="px-4 py-2 text-xs font-medium text-white bg-[#0D7A5F] rounded-lg"
        >
          {verifyBusy ? 'Checking...' : "I've Verified — Refresh"}
        </button>
        <button
          type="button"
          disabled={verifyBusy}
          onClick={handleVerifyViaGoogle}
          className="px-4 py-2 text-xs font-medium text-white bg-[#0D0D0F] rounded-lg"
        >
          {lang === 'en' ? 'Continue with Google' : 'Komeza na Google'}
        </button>
        <button
          type="button"
          disabled={verifyBusy}
          onClick={handleResendVerificationEmail}
          className="px-4 py-2 text-xs font-medium border border-black/15 rounded-lg"
        >
          {lang === 'en' ? 'Resend Email' : 'Ongera wohereze'}
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          className="px-4 py-2 text-xs font-medium text-[#5D5D66] hover:text-[#0D0D0F]"
        >
          {lang === 'en' ? 'Sign out' : 'Sohoka'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0D0D0F]">
      <Header
        currentRoute={route}
        lang={lang}
        user={user}
        staffRole={access.role}
        mobileOpen={mobileNavOpen}
        courses={visibleCourses}
        programmes={programmes}
        notifications={notifications}
        announcements={announcements}
        onToggleMobile={() => setMobileNavOpen((prev) => !prev)}
        onChangeLang={setLang}
        onNavigate={handleNavigate}
        onSelectCourse={(id) => handleSelectCourse(id)}
        onOpenLesson={(courseId, day) => {
          setSelectedCourseId(courseId);
          setSelectedDay(day);
          setRoute('course-detail');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onRefreshNotifications={() => {
          if (user) loadLearnerData(user);
        }}
        onSignIn={handleOpenSignIn}
        onSignOut={handleSignOut}
      />

      <div className="flex-1 flex min-w-0">
        <SidebarNav
          currentRoute={route}
          lang={lang}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
          onNavigate={handleNavigate}
          onOpenChallenge={() => handleSelectCourse('challenge-28')}
          onSelectTrack={(cat) => {
            setCourseTrackFilter(cat);
            setSelectedCourseId(null);
            setSelectedDay(null);
            setRoute('courses');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <SubBar
            lang={lang}
            onChangeLang={setLang}
            currentRoute={route}
            onNavigate={handleNavigate}
            user={user}
            staffRole={access.role}
            onSignOut={handleSignOut}
          />

          {platformSettings?.maintenanceMode && (
            <div className="bg-[#FFFBEB] border-b border-[#D97706]/25 px-4 py-2 text-center text-xs text-[#92400E]">
              {lang === 'en'
                ? 'Scheduled platform maintenance is active. Existing lessons remain accessible.'
                : 'Platform iri mu ivugurura ryoroheje. Amasomo asanzwe akomeje gukora.'}
            </div>
          )}

          {user && !user.emailVerified && route !== 'dashboard' && route !== 'admin' && (
            <div className="bg-[#ECFDF5] border-b border-[#0D7A5F]/20 px-4 py-2.5">
              <div className="max-w-[1220px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-[#0D0D0F]">
                  {lang === 'en'
                    ? `Verification pending for ${user.email}. Verify your email to unlock your workspace.`
                    : `Imeli ${user.email} itegereje kwemezwa.`}
                  {verifyNotice ? ` — ${verifyNotice}` : ''}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={verifyBusy}
                    onClick={handleRefreshVerification}
                    className="px-3 py-1 bg-[#0D7A5F] text-white font-medium rounded-md hover:bg-[#095945]"
                  >
                    {lang === 'en' ? "I've Verified — Refresh" : 'Nemeje — Genzura'}
                  </button>
                  <button
                    type="button"
                    disabled={verifyBusy}
                    onClick={handleVerifyViaGoogle}
                    className="px-3 py-1 bg-[#0D0D0F] text-white font-medium rounded-md"
                  >
                    Google
                  </button>
                  <button
                    type="button"
                    disabled={verifyBusy}
                    onClick={handleResendVerificationEmail}
                    className="px-3 py-1 bg-white border border-black/15 rounded-md"
                  >
                    {lang === 'en' ? 'Resend' : 'Ongera'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <main className="flex-1">
            {!authReady ? (
              <div className="max-w-[1220px] mx-auto px-6 py-20 text-sm text-[#5D5D66]">
                Loading AI Education Rwanda...
              </div>
            ) : route === 'home' ? (
              <HomeView
                lang={lang}
                courses={visibleCourses}
                programmes={programmes}
                platformSettings={platformSettings}
                onNavigate={handleNavigate}
                onSelectCourse={(id) => handleSelectCourse(id)}
                onOpenSampleDay={handleOpenSampleDay}
                onQuickVerifyCert={(certId) => {
                  setVerifyCertId(certId);
                  setRoute('verify');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            ) : route === 'courses' || route === 'course-detail' ? (
              <CoursesView
                lang={lang}
                courses={visibleCourses}
                modules={modules}
                learningPaths={learningPaths}
                structuredLessons={structuredLessons}
                cohorts={cohorts}
                learnerNotes={learnerNotes}
                platformSettings={platformSettings}
                selectedCourseId={selectedCourseId}
                selectedDay={selectedDay}
                initialCategoryFilter={courseTrackFilter}
                user={user}
                enrollments={enrollments}
                isAdmin={access.isStaff}
                customLessonsMap={customLessonsMap}
                onSelectCourse={handleSelectCourse}
                onSelectDay={setSelectedDay}
                onSignIn={handleOpenSignIn}
                onNavigate={handleNavigate}
                onEnrollmentSuccess={() => {
                  if (user) {
                    const isEduStaff =
                      access.isAdmin ||
                      access.role === 'course_manager' ||
                      access.role === 'instructor';
                    loadLearnerData(user, isEduStaff);
                  }
                }}
                onNotesUpdated={() => user && loadLearnerData(user)}
                onSubmitWaitlist={handleSubmitWaitlist}
              />
            ) : route === 'events' ? (
              <EventsView
                lang={lang}
                user={user}
                programmes={programmes}
                registrations={eventRegistrations}
                onSignIn={handleOpenSignIn}
                onRegistrationUpdated={() => user && loadLearnerData(user)}
              />
            ) : route === 'projects' ? (
              <ProjectsHubView
                lang={lang}
                resources={resources}
                onNavigate={handleNavigate}
              />
            ) : route === 'about' || route === 'verify' ? (
              <AboutVerifyView
                lang={lang}
                mode={route === 'verify' ? 'verify' : 'about'}
                initialCertId={verifyCertId}
                enablePublicVerify={platformSettings?.enablePublicVerify ?? true}
                user={user}
                certificates={certificates}
                onSignIn={handleOpenSignIn}
                onNavigate={handleNavigate}
              />
        ) : route === 'dashboard' ? (
          !user ? (
            <div className="max-w-md mx-auto px-6 py-20 text-center space-y-4">
              <h1 className="text-2xl font-display font-semibold">
                {lang === 'en' ? 'Sign in to access your workspace' : 'Injira muri konti yawe'}
              </h1>
              <button
                type="button"
                onClick={handleOpenSignIn}
                className="px-5 py-2.5 text-sm font-medium text-white bg-[#0D0D0F] rounded-lg"
              >
                {lang === 'en' ? 'Sign in' : 'Injira'}
              </button>
            </div>
          ) : !user.emailVerified ? (
            renderVerificationGate()
          ) : access.isStaff && !allowStaffLearnerPreview ? (
            <div className="max-w-xl mx-auto px-6 py-20 text-center space-y-4">
              <p className="text-xs font-mono text-[#0D7A5F] uppercase">
                {access.isSuperadmin ? 'Founder · Superadmin Account' : `Staff Account · ${access.role}`}
              </p>
              <h1 className="text-2xl font-display font-semibold text-[#0D0D0F]">
                {access.isSuperadmin
                  ? 'You are signed in to the Superadmin Governance Account'
                  : 'You are signed in to a Staff Operations Account'}
              </h1>
              <p className="text-sm text-[#5D5D66] leading-relaxed">
                Administrative controls are separated from the Learner Portal. Use the Control Center for governance, courses, payments, and oversight.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleNavigate('admin')}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-[#0D7A5F] rounded-lg hover:bg-[#0B664F]"
                >
                  {access.isSuperadmin ? 'Open Founder Control Center' : 'Open Staff Console'}
                </button>
                <button
                  type="button"
                  onClick={() => setAllowStaffLearnerPreview(true)}
                  className="px-4 py-2.5 text-sm font-medium border border-black/15 rounded-lg hover:border-black/30"
                >
                  Preview Learner Portal View
                </button>
              </div>
            </div>
          ) : (
            <LearnerDashboard
              lang={lang}
              user={user}
              profile={profile}
              courses={visibleCourses}
              modules={modules}
              structuredLessons={structuredLessons}
              cohorts={cohorts}
              quizzes={quizzes}
              rubrics={rubrics}
              learnerNotes={learnerNotes}
              ticketMessages={ticketMessages}
              platformSettings={platformSettings}
              enrollments={enrollments}
              quizAttempts={quizAttempts}
              submissions={submissions}
              certificates={certificates}
              eventRegistrations={eventRegistrations}
              notifications={notifications}
              announcements={announcements}
              supportTickets={supportTickets}
              onChangeLang={setLang}
              onOpenLesson={(courseId, day) => {
                setSelectedCourseId(courseId);
                setSelectedDay(day);
                setRoute('course-detail');
              }}
              onNavigate={handleNavigate}
              onRefreshData={() => loadLearnerData(user)}
            />
          )
        ) : route === 'admin' ? (
          !user ? (
            <div className="max-w-md mx-auto px-6 py-20 text-center space-y-4">
              <h1 className="text-2xl font-display font-semibold">
                {lang === 'en' ? 'Sign in required' : 'Injira muri konti yawe'}
              </h1>
              <button
                type="button"
                onClick={handleOpenSignIn}
                className="px-5 py-2.5 text-sm font-medium text-white bg-[#0D0D0F] rounded-lg"
              >
                {lang === 'en' ? 'Sign in' : 'Injira'}
              </button>
            </div>
          ) : !user.emailVerified ? (
            renderVerificationGate()
          ) : access.isStaff ? (
            <AdminDashboard
              lang={lang}
              user={user}
              access={access}
              onRefreshPublic={loadPublicCatalog}
            />
          ) : (
            <div className="max-w-lg mx-auto px-6 py-20 text-center space-y-4">
              <p className="text-xs font-mono text-[#DC2626] uppercase">Access Restricted</p>
              <h1 className="text-2xl font-display font-semibold text-[#0D0D0F]">
                {lang === 'en'
                  ? 'Superadmin or Staff Authorization Required'
                  : 'Urugendo rwagenewe Ubuyobozi gusa'}
              </h1>
              <p className="text-sm text-[#5D5D66]">
                {lang === 'en'
                  ? 'Your account uses the Learner Portal. Governance controls are strictly isolated under Row-Level Security.'
                  : 'Konti yawe ikoresha Ibikorwa by’Umunyeshuri gusa.'}
              </p>
              <button
                type="button"
                onClick={() => handleNavigate('dashboard')}
                className="px-5 py-2.5 text-sm font-medium text-white bg-[#0D0D0F] rounded-lg"
              >
                {lang === 'en' ? 'Open Learner Portal' : 'Fungura Ibikorwa byanjye'}
              </button>
            </div>
          )
        ) : (
          <HomeView
            lang={lang}
            courses={visibleCourses}
            programmes={programmes}
            platformSettings={platformSettings}
            onNavigate={handleNavigate}
            onSelectCourse={(id) => handleSelectCourse(id)}
            onOpenSampleDay={handleOpenSampleDay}
            onQuickVerifyCert={(certId) => {
              setVerifyCertId(certId);
              setRoute('verify');
            }}
          />
        )}
          </main>

          <Footer lang={lang} onChangeLang={setLang} onNavigate={handleNavigate} />
        </div>
      </div>

      <AuthModal
        open={authModalOpen}
        lang={lang}
        allowSelfRegistration={platformSettings?.allowSelfRegistration ?? true}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(authedUser) => syncAuthenticatedUser(authedUser, true)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <PlatformShell />
    </ErrorBoundary>
  );
}
