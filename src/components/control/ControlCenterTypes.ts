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
} from '../../types';
import type { ResolvedAccess } from '../../lib/permissions';

export type ControlSectionId =
  | 'overview'
  | 'alerts'
  | 'analytics'
  | 'courses'
  | 'lessons'
  | 'paths'
  | 'programmes'
  | 'resources'
  | 'learners'
  | 'cohorts'
  | 'access'
  | 'quizzes'
  | 'reviews'
  | 'certificates'
  | 'payments'
  | 'coupons'
  | 'refunds'
  | 'communication'
  | 'support'
  | 'staff'
  | 'audit'
  | 'settings'
  | 'security';

export interface ControlNavItem {
  id: ControlSectionId;
  group: 'OVERVIEW' | 'EDUCATION' | 'LEARNERS' | 'ASSESSMENT' | 'BUSINESS' | 'COMMUNICATION' | 'CONTROL';
  label: string;
  requiresPermission?: import('../../types').PermissionKey;
  superadminOnly?: boolean;
}

export type PaginatedCollectionKey =
  | 'users'
  | 'enrollments'
  | 'payments'
  | 'submissions'
  | 'quizAttempts'
  | 'certificates'
  | 'supportTickets'
  | 'auditLogs';

export interface CollectionPaginationMeta {
  hasMore: boolean;
  loadingMore: boolean;
  pageSize: number;
}

export type PaginationMetaMap = Record<PaginatedCollectionKey, CollectionPaginationMeta>;

export interface ControlCenterData {
  users: UserProfile[];
  staffRoles: StaffRoleRecord[];
  courses: Course[];
  modules: CourseModule[];
  lessons: StructuredLessonRecord[];
  learningPaths: LearningPath[];
  cohorts: Cohort[];
  coupons: CouponRecord[];
  programmes: ProgrammeRecord[];
  quizzes: DynamicQuiz[];
  rubrics: RubricConfig[];
  resources: ResourceItem[];
  enrollments: Enrollment[];
  payments: PaymentRecord[];
  refunds: RefundRecord[];
  quizAttempts: QuizAttempt[];
  submissions: ProjectSubmission[];
  certificates: Certificate[];
  eventRegistrations: EventRegistration[];
  inquiries: InquiryRecord[];
  announcements: Announcement[];
  emailTemplates: EmailTemplateRecord[];
  supportTickets: SupportTicket[];
  ticketMessages: TicketMessage[];
  auditLogs: AuditLog[];
  settings: PlatformSettings | null;
  integrations: IntegrationStatusResponse;
  access: ResolvedAccess;
  pagination?: PaginationMetaMap;
  onLoadMore?: (key: PaginatedCollectionKey) => Promise<void>;
}

export interface AuditWriteParams {
  action: string;
  targetCollection: string;
  targetId: string;
  previousState?: string;
  newState?: string;
  reason?: string;
  summary: string;
}

