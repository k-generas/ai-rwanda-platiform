import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Menu, RefreshCw, Search, X } from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  type QueryDocumentSnapshot,
  serverTimestamp,
  setDoc,
  startAfter,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  Announcement,
  AuditLog,
  Certificate,
  Cohort,
  CouponRecord,
  Course,
  CourseModule,
  DynamicQuiz,
  EmailTemplateRecord,
  Enrollment,
  EventRegistration,
  InquiryRecord,
  IntegrationStatusResponse,
  Language,
  LearningPath,
  PaymentRecord,
  PlatformSettings,
  ProgrammeRecord,
  ProjectSubmission,
  QuizAttempt,
  RefundRecord,
  ResourceItem,
  RubricConfig,
  StaffRoleRecord,
  StructuredLessonRecord,
  SupportTicket,
  TicketMessage,
  UserProfile
} from '../types';
import { COURSES } from '../data/curriculum';
import { hasPermission, ROLE_DISPLAY, type ResolvedAccess } from '../lib/permissions';
import type {
  AuditWriteParams,
  ControlCenterData,
  ControlNavItem,
  ControlSectionId,
  PaginatedCollectionKey,
  PaginationMetaMap
} from './control/ControlCenterTypes';
import { FounderOverviewPanel } from './control/FounderOverviewPanel';
import { LearnersAndBusinessPanel } from './control/LearnersAndBusinessPanel';
import { EducationAndCommsPanel } from './control/EducationAndCommsPanel';
import { StaffAndSecurityPanel } from './control/StaffAndSecurityPanel';
import { CourseBuilderPanel } from './control/CourseBuilderPanel';
import { StructuredLessonEditor } from './control/StructuredLessonEditor';
import { OperationsAndQuizzesPanel } from './control/OperationsAndQuizzesPanel';

interface AdminDashboardProps {
  lang: Language;
  user: User;
  access: ResolvedAccess;
  onRefreshPublic: () => void;
}

const NAV_ITEMS: ControlNavItem[] = [
  { id: 'overview', group: 'OVERVIEW', label: 'Dashboard', requiresPermission: 'view_founder_overview' },
  { id: 'alerts', group: 'OVERVIEW', label: 'Activity & Alerts', requiresPermission: 'view_founder_overview' },
  { id: 'analytics', group: 'OVERVIEW', label: 'Analytics & Reports', requiresPermission: 'view_founder_overview' },
  { id: 'courses', group: 'EDUCATION', label: 'Course Builder', requiresPermission: 'manage_courses' },
  { id: 'lessons', group: 'EDUCATION', label: '14-Block Lesson Editor', requiresPermission: 'manage_lessons' },
  { id: 'paths', group: 'EDUCATION', label: 'Guided Learning Paths', requiresPermission: 'manage_courses' },
  { id: 'programmes', group: 'EDUCATION', label: 'Programmes & Events', requiresPermission: 'manage_courses' },
  { id: 'resources', group: 'EDUCATION', label: 'Resource Library', requiresPermission: 'manage_lessons' },
  { id: 'learners', group: 'LEARNERS', label: 'All Learners', requiresPermission: 'manage_learners' },
  { id: 'cohorts', group: 'LEARNERS', label: 'Cohorts & Groups', requiresPermission: 'manage_courses' },
  { id: 'access', group: 'LEARNERS', label: 'Enrollments & Access', requiresPermission: 'manage_access' },
  { id: 'quizzes', group: 'ASSESSMENT', label: 'Quizzes & Question Bank', requiresPermission: 'manage_lessons' },
  { id: 'reviews', group: 'ASSESSMENT', label: 'Project Reviews & Rubric', requiresPermission: 'review_projects' },
  { id: 'certificates', group: 'ASSESSMENT', label: 'Certificates & Eligibility', requiresPermission: 'manage_certificates' },
  { id: 'payments', group: 'BUSINESS', label: 'Payments & Verification', requiresPermission: 'manage_payments' },
  { id: 'coupons', group: 'BUSINESS', label: 'Coupons & Discounts', requiresPermission: 'manage_payments' },
  { id: 'refunds', group: 'BUSINESS', label: 'Refunds', requiresPermission: 'process_refunds' },
  { id: 'communication', group: 'COMMUNICATION', label: 'Notices & Email Templates', requiresPermission: 'manage_communication' },
  { id: 'support', group: 'COMMUNICATION', label: 'Support Threads & Inquiries', requiresPermission: 'manage_support' },
  { id: 'staff', group: 'CONTROL', label: 'Staff & Roles', requiresPermission: 'manage_staff_roles', superadminOnly: true },
  { id: 'audit', group: 'CONTROL', label: 'Audit Logs', requiresPermission: 'view_audit_logs' },
  { id: 'settings', group: 'CONTROL', label: 'Settings & Integrations', requiresPermission: 'manage_platform_settings', superadminOnly: true },
  { id: 'security', group: 'CONTROL', label: 'Data Export & Backup', requiresPermission: 'export_data' }
];

const GROUPS: Array<ControlNavItem['group']> = [
  'OVERVIEW',
  'EDUCATION',
  'LEARNERS',
  'ASSESSMENT',
  'BUSINESS',
  'COMMUNICATION',
  'CONTROL'
];

export function AdminDashboard({ lang, user, access, onRefreshPublic }: AdminDashboardProps) {
  const permittedNav = useMemo(
    () =>
      NAV_ITEMS.filter((item) => {
        if (item.superadminOnly && !access.isSuperadmin) return false;
        if (!item.requiresPermission) return true;
        return hasPermission(access, item.requiresPermission);
      }),
    [access]
  );

  const [activeSection, setActiveSection] = useState<ControlSectionId>(
    permittedNav[0]?.id ?? 'reviews'
  );
  const [editorTarget, setEditorTarget] = useState<{ courseId: string; lessonId: string } | null>(null);
  const [navSearch, setNavSearch] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const PAGE_SIZE = 100;
  const cursorsRef = useRef<Partial<Record<PaginatedCollectionKey, QueryDocumentSnapshot | null>>>({});

  const defaultPagination: PaginationMetaMap = {
    users: { hasMore: false, loadingMore: false, pageSize: PAGE_SIZE },
    enrollments: { hasMore: false, loadingMore: false, pageSize: PAGE_SIZE },
    payments: { hasMore: false, loadingMore: false, pageSize: PAGE_SIZE },
    submissions: { hasMore: false, loadingMore: false, pageSize: PAGE_SIZE },
    quizAttempts: { hasMore: false, loadingMore: false, pageSize: PAGE_SIZE },
    certificates: { hasMore: false, loadingMore: false, pageSize: PAGE_SIZE },
    supportTickets: { hasMore: false, loadingMore: false, pageSize: PAGE_SIZE },
    auditLogs: { hasMore: false, loadingMore: false, pageSize: PAGE_SIZE }
  };

  const [pagination, setPagination] = useState<PaginationMetaMap>(defaultPagination);

  const [data, setData] = useState<ControlCenterData>({
    users: [],
    staffRoles: [],
    courses: COURSES,
    modules: [],
    lessons: [],
    learningPaths: [],
    cohorts: [],
    coupons: [],
    programmes: [],
    quizzes: [],
    rubrics: [],
    resources: [],
    enrollments: [],
    payments: [],
    refunds: [],
    quizAttempts: [],
    submissions: [],
    certificates: [],
    eventRegistrations: [],
    inquiries: [],
    announcements: [],
    emailTemplates: [],
    supportTickets: [],
    ticketMessages: [],
    auditLogs: [],
    settings: null,
    integrations: { momoActive: false, airtelActive: false, emailActive: false, smsActive: false },
    access,
    pagination: defaultPagination
  });

  useEffect(() => {
    if (!permittedNav.some((n) => n.id === activeSection) && permittedNav.length > 0) {
      setActiveSection(permittedNav[0].id);
    }
  }, [permittedNav, activeSection]);

  const writeAudit = useCallback(
    async (params: AuditWriteParams) => {
      const id = `log_${Date.now()}`;
      try {
        await setDoc(doc(db, 'auditLogs', id), {
          id,
          actorUid: user.uid,
          actorEmail: user.email || '',
          actorRole: access.role,
          action: params.action,
          targetCollection: params.targetCollection,
          targetId: params.targetId,
          ...(params.previousState ? { previousState: params.previousState.slice(0, 290) } : {}),
          ...(params.newState ? { newState: params.newState.slice(0, 290) } : {}),
          ...(params.reason ? { reason: params.reason.slice(0, 490) } : {}),
          summary: params.summary.slice(0, 490),
          createdAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `auditLogs/${id}`);
      }
    },
    [user, access.role]
  );

  const loadControlData = useCallback(async () => {
    setLoading(true);
    try {
      const canReview =
        access.isAdmin ||
        access.role === 'course_manager' ||
        access.role === 'instructor' ||
        access.role === 'reviewer';
      const canEditEducation =
        access.isAdmin ||
        access.role === 'course_manager' ||
        access.role === 'instructor';
      const canSupport = access.isAdmin || access.role === 'support_staff';
      const canViewLearners = access.isAdmin || access.role === 'support_staff';
      const canViewOwnAudit = hasPermission(access, 'view_audit_logs');

      const [
        usersSnap,
        enrSnap,
        coursesSnap,
        modulesSnap,
        lessonsSnap,
        pathsSnap,
        cohortsSnap,
        couponsSnap,
        programmesSnap,
        quizzesSnap,
        rubricsSnap,
        resourcesSnap,
        regSnap,
        annSnap,
        tplSnap,
        settingsSnap,
        staffSnap,
        paySnap,
        refSnap,
        certSnap,
        logSnap,
        subSnap,
        quizSnap,
        ticketSnap,
        ticketMsgSnap,
        inqSnap,
        integrationsRes
      ] = await Promise.all([
        canViewLearners ? getDocs(query(collection(db, 'users'), limit(PAGE_SIZE))) : Promise.resolve(null),
        canViewLearners ? getDocs(query(collection(db, 'enrollments'), limit(PAGE_SIZE))) : Promise.resolve(null),
        getDocs(collection(db, 'courses')),
        getDocs(query(collection(db, 'modules'), limit(200))),
        canEditEducation ? getDocs(query(collection(db, 'lessons'), limit(300))) : Promise.resolve(null),
        canEditEducation ? getDocs(query(collection(db, 'learningPaths'), limit(100))) : Promise.resolve(null),
        getDocs(query(collection(db, 'cohorts'), limit(100))),
        access.isAdmin ? getDocs(query(collection(db, 'coupons'), limit(100))) : Promise.resolve(null),
        canEditEducation ? getDocs(query(collection(db, 'programmes'), limit(100))) : Promise.resolve(null),
        canEditEducation ? getDocs(query(collection(db, 'quizzes'), limit(150))) : Promise.resolve(null),
        canReview ? getDocs(query(collection(db, 'rubrics'), limit(50))) : Promise.resolve(null),
        canEditEducation ? getDocs(query(collection(db, 'resources'), limit(100))) : Promise.resolve(null),
        canEditEducation ? getDocs(query(collection(db, 'eventRegistrations'), limit(200))) : Promise.resolve(null),
        getDocs(query(collection(db, 'announcements'), limit(50))),
        access.isStaff ? getDocs(query(collection(db, 'emailTemplates'), limit(50))) : Promise.resolve(null),
        getDoc(doc(db, 'platformSettings', 'public')),
        access.isSuperadmin ? getDocs(query(collection(db, 'staffRoles'), limit(100))) : Promise.resolve(null),
        access.isAdmin ? getDocs(query(collection(db, 'payments'), limit(PAGE_SIZE))) : Promise.resolve(null),
        access.isAdmin ? getDocs(query(collection(db, 'refunds'), limit(100))) : Promise.resolve(null),
        access.isAdmin ? getDocs(query(collection(db, 'certificates'), limit(PAGE_SIZE))) : Promise.resolve(null),
        access.isSuperadmin
          ? getDocs(query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE)))
          : canViewOwnAudit
            ? getDocs(query(collection(db, 'auditLogs'), where('actorUid', '==', user.uid), limit(PAGE_SIZE)))
            : Promise.resolve(null),
        canReview ? getDocs(query(collection(db, 'projectSubmissions'), limit(PAGE_SIZE))) : Promise.resolve(null),
        canReview ? getDocs(query(collection(db, 'quizAttempts'), limit(PAGE_SIZE))) : Promise.resolve(null),
        canSupport ? getDocs(query(collection(db, 'supportTickets'), limit(PAGE_SIZE))) : Promise.resolve(null),
        canSupport ? getDocs(query(collection(db, 'ticketMessages'), limit(300))) : Promise.resolve(null),
        canSupport ? getDocs(query(collection(db, 'inquiries'), limit(150))) : Promise.resolve(null),
        fetch('/api/integrations/status')
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      ]);

      cursorsRef.current = {
        users: usersSnap && usersSnap.docs.length > 0 ? usersSnap.docs[usersSnap.docs.length - 1] : null,
        enrollments: enrSnap && enrSnap.docs.length > 0 ? enrSnap.docs[enrSnap.docs.length - 1] : null,
        payments: paySnap && paySnap.docs.length > 0 ? paySnap.docs[paySnap.docs.length - 1] : null,
        submissions: subSnap && subSnap.docs.length > 0 ? subSnap.docs[subSnap.docs.length - 1] : null,
        quizAttempts: quizSnap && quizSnap.docs.length > 0 ? quizSnap.docs[quizSnap.docs.length - 1] : null,
        certificates: certSnap && certSnap.docs.length > 0 ? certSnap.docs[certSnap.docs.length - 1] : null,
        supportTickets: ticketSnap && ticketSnap.docs.length > 0 ? ticketSnap.docs[ticketSnap.docs.length - 1] : null,
        auditLogs: logSnap && logSnap.docs.length > 0 ? logSnap.docs[logSnap.docs.length - 1] : null
      };

      const nextPagination: PaginationMetaMap = {
        users: { hasMore: (usersSnap?.docs.length ?? 0) >= PAGE_SIZE, loadingMore: false, pageSize: PAGE_SIZE },
        enrollments: { hasMore: (enrSnap?.docs.length ?? 0) >= PAGE_SIZE, loadingMore: false, pageSize: PAGE_SIZE },
        payments: { hasMore: (paySnap?.docs.length ?? 0) >= PAGE_SIZE, loadingMore: false, pageSize: PAGE_SIZE },
        submissions: { hasMore: (subSnap?.docs.length ?? 0) >= PAGE_SIZE, loadingMore: false, pageSize: PAGE_SIZE },
        quizAttempts: { hasMore: (quizSnap?.docs.length ?? 0) >= PAGE_SIZE, loadingMore: false, pageSize: PAGE_SIZE },
        certificates: { hasMore: (certSnap?.docs.length ?? 0) >= PAGE_SIZE, loadingMore: false, pageSize: PAGE_SIZE },
        supportTickets: { hasMore: (ticketSnap?.docs.length ?? 0) >= PAGE_SIZE, loadingMore: false, pageSize: PAGE_SIZE },
        auditLogs: { hasMore: (logSnap?.docs.length ?? 0) >= PAGE_SIZE, loadingMore: false, pageSize: PAGE_SIZE }
      };
      setPagination(nextPagination);

      const mappedCourses: Course[] = coursesSnap.empty
        ? COURSES
        : coursesSnap.docs.map((d) => {
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
              ownerUid: raw.ownerUid ? String(raw.ownerUid) : undefined,
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
              }
            };
          });

      setData({
        users: usersSnap ? usersSnap.docs.map((d) => d.data() as UserProfile) : [],
        staffRoles: staffSnap ? staffSnap.docs.map((d) => d.data() as StaffRoleRecord) : [],
        courses: mappedCourses,
        modules: modulesSnap.docs.map((d) => d.data() as CourseModule),
        lessons: lessonsSnap ? lessonsSnap.docs.map((d) => d.data() as StructuredLessonRecord) : [],
        learningPaths: pathsSnap ? pathsSnap.docs.map((d) => d.data() as LearningPath) : [],
        cohorts: cohortsSnap.docs.map((d) => d.data() as Cohort),
        coupons: couponsSnap ? couponsSnap.docs.map((d) => d.data() as CouponRecord) : [],
        programmes: programmesSnap ? programmesSnap.docs.map((d) => d.data() as ProgrammeRecord) : [],
        quizzes: quizzesSnap ? quizzesSnap.docs.map((d) => d.data() as DynamicQuiz) : [],
        rubrics: rubricsSnap ? rubricsSnap.docs.map((d) => d.data() as RubricConfig) : [],
        resources: resourcesSnap ? resourcesSnap.docs.map((d) => d.data() as ResourceItem) : [],
        enrollments: enrSnap ? enrSnap.docs.map((d) => d.data() as Enrollment) : [],
        payments: paySnap ? paySnap.docs.map((d) => d.data() as PaymentRecord) : [],
        refunds: refSnap ? refSnap.docs.map((d) => d.data() as RefundRecord) : [],
        quizAttempts: quizSnap ? quizSnap.docs.map((d) => d.data() as QuizAttempt) : [],
        submissions: subSnap ? subSnap.docs.map((d) => d.data() as ProjectSubmission) : [],
        certificates: certSnap ? certSnap.docs.map((d) => d.data() as Certificate) : [],
        eventRegistrations: regSnap ? regSnap.docs.map((d) => d.data() as EventRegistration) : [],
        inquiries: inqSnap ? inqSnap.docs.map((d) => d.data() as InquiryRecord) : [],
        announcements: annSnap.docs.map((d) => d.data() as Announcement),
        emailTemplates: tplSnap ? tplSnap.docs.map((d) => d.data() as EmailTemplateRecord) : [],
        supportTickets: ticketSnap ? ticketSnap.docs.map((d) => d.data() as SupportTicket) : [],
        ticketMessages: ticketMsgSnap ? ticketMsgSnap.docs.map((d) => d.data() as TicketMessage) : [],
        auditLogs: logSnap ? logSnap.docs.map((d) => d.data() as AuditLog) : [],
        settings: settingsSnap.exists() ? (settingsSnap.data() as PlatformSettings) : null,
        integrations: (integrationsRes as IntegrationStatusResponse) ?? {
          momoActive: false,
          airtelActive: false,
          emailActive: false,
          smsActive: false
        },
        access,
        pagination: nextPagination
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'control_center');
    } finally {
      setLoading(false);
    }
  }, [access, user.uid]);

  const handleLoadMore = useCallback(
    async (key: PaginatedCollectionKey) => {
      const lastDoc = cursorsRef.current[key];
      if (!lastDoc) return;
      setPagination((prev) => ({
        ...prev,
        [key]: { ...prev[key], loadingMore: true }
      }));

      try {
        const colName =
          key === 'submissions' ? 'projectSubmissions' : key;
        const q =
          key === 'auditLogs' && access.isSuperadmin
            ? query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE))
            : key === 'auditLogs'
              ? query(collection(db, 'auditLogs'), where('actorUid', '==', user.uid), startAfter(lastDoc), limit(PAGE_SIZE))
              : query(collection(db, colName), startAfter(lastDoc), limit(PAGE_SIZE));

        const snap = await getDocs(q);
        cursorsRef.current[key] = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
        const hasMore = snap.docs.length >= PAGE_SIZE;

        setData((prev) => {
          const existing = prev[key] as Array<{ id?: string; uid?: string }>;
          const seen = new Set(existing.map((item) => item.id || item.uid));
          const incoming = snap.docs
            .map((d) => d.data() as { id?: string; uid?: string })
            .filter((item) => !seen.has(item.id || item.uid));
          return {
            ...prev,
            [key]: [...existing, ...incoming]
          };
        });

        setPagination((prev) => {
          const next = {
            ...prev,
            [key]: { hasMore, loadingMore: false, pageSize: PAGE_SIZE }
          };
          setData((dPrev) => ({ ...dPrev, pagination: next }));
          return next;
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, `${key}_paginate`);
      } finally {
        setPagination((prev) => ({
          ...prev,
          [key]: { ...prev[key], loadingMore: false }
        }));
      }
    },
    [access.isSuperadmin, user.uid]
  );

  const enrichedData = useMemo<ControlCenterData>(
    () => ({
      ...data,
      pagination,
      onLoadMore: handleLoadMore
    }),
    [data, pagination, handleLoadMore]
  );

  useEffect(() => {
    loadControlData();
  }, [loadControlData]);

  const activeNav = permittedNav.find((i) => i.id === activeSection) ?? permittedNav[0];

  const renderSidebarContent = () => {
    const q = navSearch.trim().toLowerCase();
    return (
      <div className="space-y-5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#5D5D66] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            placeholder="Find control section..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-black/10 rounded-lg focus:outline-none focus:border-[#0D7A5F]"
          />
        </div>

        <nav className="space-y-5" aria-label="Control Center sections">
          {GROUPS.map((group) => {
            const items = permittedNav.filter(
              (item) =>
                item.group === group &&
                (!q || item.label.toLowerCase().includes(q) || group.toLowerCase().includes(q))
            );
            if (items.length === 0) return null;

            return (
              <div key={group} className="space-y-1">
                <p className="px-2.5 text-[11px] font-mono text-[#5D5D66] tracking-wider">
                  {group}
                </p>
                {items.map((item) => {
                  const selected = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveSection(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap truncate ${
                        selected
                          ? 'bg-[#0D0D0F] text-white'
                          : 'text-[#5D5D66] hover:bg-white hover:text-[#0D0D0F]'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </div>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
      {/* Top Contextual Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-black/[0.08] mb-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-black/15"
            aria-label="Toggle Control Center menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          <div>
            <p className="text-xs font-mono text-[#0D7A5F]">
              {access.isSuperadmin
                ? 'FOUNDER CONTROL CENTER · SUPERADMIN'
                : `EDUCATION CONSOLE · ${ROLE_DISPLAY[access.role][lang].toUpperCase()}`}
              {activeNav ? ` / ${activeNav.group} / ${activeNav.label}` : ''}
            </p>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight text-[#0D0D0F]">
              {activeNav?.label ?? 'Control Center'}
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={loadControlData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-black/15 rounded-lg hover:border-black/35 bg-white whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Refreshing...' : 'Refresh Records'}</span>
        </button>
      </div>

      {/* Workspace Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <aside className="hidden lg:block lg:col-span-3 bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-4 sticky top-20">
          {renderSidebarContent()}
        </aside>

        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-4 mb-4">
            {renderSidebarContent()}
          </div>
        )}

        <section className="lg:col-span-9 min-w-0">
          {loading ? (
            <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-10 text-sm text-[#5D5D66]">
              Loading live Firestore workspace records...
            </div>
          ) : activeSection === 'overview' || activeSection === 'alerts' ? (
            <FounderOverviewPanel
              data={enrichedData}
              onNavigateSection={(sec) => setActiveSection(sec)}
            />
          ) : activeSection === 'cohorts' ||
            activeSection === 'quizzes' ||
            activeSection === 'coupons' ||
            activeSection === 'resources' ||
            activeSection === 'analytics' ? (
            <OperationsAndQuizzesPanel
              section={activeSection}
              user={user}
              data={enrichedData}
              onWriteAudit={writeAudit}
              onRefreshData={loadControlData}
              onRefreshPublic={onRefreshPublic}
            />
          ) : activeSection === 'learners' ||
            activeSection === 'access' ||
            activeSection === 'payments' ||
            activeSection === 'refunds' ? (
            <LearnersAndBusinessPanel
              section={activeSection}
              user={user}
              data={enrichedData}
              onWriteAudit={writeAudit}
              onRefreshData={loadControlData}
            />
          ) : activeSection === 'courses' || activeSection === 'paths' ? (
            <CourseBuilderPanel
              initialTab={activeSection === 'paths' ? 'paths' : 'overview'}
              user={user}
              data={enrichedData}
              onWriteAudit={writeAudit}
              onRefreshData={loadControlData}
              onRefreshPublic={onRefreshPublic}
              onOpenLessonEditor={(courseId, lessonId) => {
                setEditorTarget({ courseId, lessonId });
                setActiveSection('lessons');
              }}
            />
          ) : activeSection === 'lessons' ? (
            <StructuredLessonEditor
              user={user}
              courses={enrichedData.courses}
              modules={enrichedData.modules}
              lessons={enrichedData.lessons}
              initialCourseId={editorTarget?.courseId}
              initialLessonId={editorTarget?.lessonId}
              onWriteAudit={writeAudit}
              onRefreshData={loadControlData}
              onRefreshPublic={onRefreshPublic}
            />
          ) : activeSection === 'programmes' ||
            activeSection === 'reviews' ||
            activeSection === 'certificates' ||
            activeSection === 'communication' ||
            activeSection === 'support' ? (
            <EducationAndCommsPanel
              section={activeSection}
              user={user}
              data={enrichedData}
              onWriteAudit={writeAudit}
              onRefreshData={loadControlData}
              onRefreshPublic={onRefreshPublic}
            />
          ) : (
            <StaffAndSecurityPanel
              section={activeSection as 'staff' | 'audit' | 'settings' | 'security'}
              user={user}
              data={enrichedData}
              onWriteAudit={writeAudit}
              onRefreshData={loadControlData}
            />
          )}
        </section>
      </div>
    </div>
  );
}
