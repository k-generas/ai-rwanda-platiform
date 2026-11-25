export type Language = 'en' | 'rw';

export type PageRoute =
  | 'home'
  | 'courses'
  | 'course-detail'
  | 'events'
  | 'projects'
  | 'about'
  | 'verify'
  | 'dashboard'
  | 'admin';

export type StaffRole =
  | 'superadmin'
  | 'admin'
  | 'course_manager'
  | 'instructor'
  | 'reviewer'
  | 'support_staff'
  | 'learner';

export type PermissionKey =
  | 'view_founder_overview'
  | 'manage_courses'
  | 'manage_lessons'
  | 'publish_courses'
  | 'manage_learners'
  | 'manage_access'
  | 'review_projects'
  | 'manage_payments'
  | 'process_refunds'
  | 'manage_certificates'
  | 'manage_communication'
  | 'manage_support'
  | 'manage_staff_roles'
  | 'view_audit_logs'
  | 'manage_platform_settings'
  | 'export_data';

export interface BilingualText {
  en: string;
  rw: string;
}

export interface LearningLevel {
  level: number;
  title: BilingualText;
  summary: BilingualText;
  topics: { en: string[]; rw: string[] };
  outcome: BilingualText;
}

export interface LessonKnowledgeCheck {
  question: BilingualText;
  options: { en: string[]; rw: string[] };
  correctIndex: number;
  explanation: BilingualText;
}

export interface LessonContent {
  dayNumber: number;
  weekNumber: number;
  weekTitle: BilingualText;
  isSample: boolean;
  durationMinutes: number;
  levelTag: string;
  title: BilingualText;
  objectives: { en: string[]; rw: string[] };
  introduction: BilingualText;
  simpleExplanation: BilingualText;
  technicalExplanation: BilingualText;
  realWorldExample: BilingualText;
  rwandaExample: BilingualText;
  practicalDemo: BilingualText;
  tools: string[];
  exerciseSteps: { en: string[]; rw: string[] };
  reusableTemplate: BilingualText;
  commonMistakes: { en: string[]; rw: string[] };
  limitationsAndRisks: BilingualText;
  knowledgeCheck: LessonKnowledgeCheck;
  reflectionQuestion: BilingualText;
  furtherResources: string[];
}

export type LessonBlockType =
  | 'rich_text'
  | 'image'
  | 'video'
  | 'audio'
  | 'code'
  | 'callout'
  | 'table'
  | 'download'
  | 'external_resource'
  | 'quiz'
  | 'assignment'
  | 'reflection'
  | 'checklist'
  | 'interactive';

export interface LessonBlock {
  id: string;
  type: LessonBlockType;
  title?: string;
  body?: string;
  url?: string;
  caption?: string;
  altText?: string;
  language?: string;
  code?: string;
  variant?: 'tip' | 'warning' | 'rwanda_context' | 'note';
  headers?: string[];
  rows?: string[][];
  label?: string;
  question?: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  items?: string[];
  promptTemplate?: string;
}

export interface CourseModule {
  id: string;
  courseId: string;
  orderIndex: number;
  titleEn: string;
  titleRw: string;
  summaryEn?: string;
  summaryRw?: string;
  releaseAt?: string;
  releaseAtMs?: number;
  isPublished: boolean;
  updatedAt?: unknown;
}

export interface StructuredLessonRecord {
  id: string;
  courseId: string;
  moduleId?: string;
  orderIndex?: number;
  dayNumber: number;
  weekNumber: number;
  isSample: boolean;
  isRequired?: boolean;
  estimatedMinutes?: number;
  enStatus?: 'draft' | 'published';
  rwStatus?: 'draft' | 'translation_needed' | 'published';
  releaseAt?: string;
  releaseAtMs?: number;
  titleEn: string;
  titleRw: string;
  summaryEn?: string;
  summaryRw?: string;
  objectivesEn?: string[];
  objectivesRw?: string[];
  blocksEnJson?: string;
  blocksRwJson?: string;
  updatedAt?: unknown;
}

export interface LessonVersion {
  id: string;
  lessonId: string;
  courseId: string;
  savedBy: string;
  note?: string;
  snapshotJson: string;
  createdAt?: unknown;
}

export interface LearningPath {
  id: string;
  titleEn: string;
  titleRw: string;
  descriptionEn?: string;
  descriptionRw?: string;
  courseIds: string[];
  isPublished: boolean;
  updatedAt?: unknown;
}

export interface Course {
  id: string;
  slug: string;
  code: string;
  status: 'draft' | 'in_review' | 'active' | 'upcoming' | 'scheduled' | 'archived';
  category: 'foundations' | 'prompting' | 'automation' | 'agents' | 'industry';
  visibility?: 'public' | 'unlisted' | 'private';
  isFree?: boolean;
  priceRwf: number;
  durationDays: number;
  capacity?: number;
  enrolledCount?: number;
  certificateEligible?: boolean;
  levelRange: string;
  ownerUid?: string;
  startDate?: string;
  endDate?: string;
  coverImageUrl?: string;
  promoVideoUrl?: string;
  prerequisitesText?: string;
  seoTitle?: string;
  seoDescription?: string;
  title: BilingualText;
  subtitle: BilingualText;
  description: BilingualText;
  outcomes: { en: string[]; rw: string[] };
  audience: { en: string[]; rw: string[] };
  deviceNote: BilingualText;
}

export interface WeeklyAssessment {
  weekNumber: number;
  title: BilingualText;
  weightLabel: string;
  questions: LessonKnowledgeCheck[];
}

export interface PracticalProject {
  key: 'study_assistant' | 'auto_registration' | 'customer_inquiry' | 'content_planning' | 'research_assistant';
  number: string;
  title: BilingualText;
  summary: BilingualText;
  workflowSteps: { en: string[]; rw: string[] };
  tools: string[];
  deliverable: BilingualText;
}

export interface LearningTool {
  name: string;
  category: BilingualText;
  purpose: BilingualText;
  freeTierNote: BilingualText;
  url: string;
}

export interface TemplateResource {
  id: string;
  category: 'prompting' | 'automation' | 'ai_automation' | 'project';
  title: BilingualText;
  description: BilingualText;
  filename: string;
  contentEn: string;
  contentRw: string;
}

export interface WorkshopEvent {
  id: string;
  title: BilingualText;
  description: BilingualText;
  dateLabel: string;
  timeLabel: string;
  format: 'online' | 'kigali_in_person' | 'hybrid';
  location: BilingualText;
  languageLabel: string;
  status: 'upcoming' | 'past';
  featured?: boolean;
  speaker: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  preferredLanguage: Language;
  role: StaffRole;
  accountStatus: 'active' | 'suspended';
  suspensionReason?: string;
  privacyConsentAcceptedAt?: string;
  marketingOptIn?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StaffRoleRecord {
  uid: string;
  email: string;
  displayName: string;
  role: Exclude<StaffRole, 'learner'>;
  permissions: PermissionKey[];
  assignedCourseIds: string[];
  status: 'active' | 'suspended';
  updatedBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Cohort {
  id: string;
  courseId: string;
  name: string;
  code: string;
  instructorUid?: string;
  instructorName?: string;
  startDate: string;
  endDate: string;
  capacity: number;
  enrolledCount?: number;
  status: 'planned' | 'enrolling' | 'active' | 'completed' | 'archived';
  updatedAt?: unknown;
}

export interface CouponRecord {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed_rwf';
  discountValue: number;
  courseId: string;
  maxUses: number;
  usedCount: number;
  expiresAt?: string;
  isActive: boolean;
  updatedAt?: unknown;
}

export interface ProgrammeRecord {
  id: string;
  slug: string;
  type: 'workshop' | 'webinar' | 'bootcamp' | 'cohort' | 'upcoming_course' | 'special_programme';
  titleEn: string;
  titleRw: string;
  descriptionEn: string;
  descriptionRw: string;
  dateLabel: string;
  timeLabel: string;
  timezone: string;
  format: 'online' | 'kigali_in_person' | 'hybrid';
  locationEn: string;
  locationRw: string;
  languageLabel: string;
  meetingUrl?: string;
  capacity: number;
  registeredCount?: number;
  eligibilityEn?: string;
  eligibilityRw?: string;
  priceRwf: number;
  status: 'draft' | 'upcoming' | 'registration_open' | 'fully_booked' | 'in_progress' | 'completed' | 'cancelled';
  featured: boolean;
  speaker: string;
  updatedAt?: unknown;
}

export interface QuizQuestionItem {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  questionEn: string;
  questionRw: string;
  optionsEn: string[];
  optionsRw: string[];
  correctIndex: number;
  correctText?: string;
  marks: number;
  explanationEn: string;
  explanationRw: string;
}

export interface DynamicQuiz {
  id: string;
  courseId: string;
  moduleId?: string;
  weekNumber: number;
  titleEn: string;
  titleRw: string;
  descriptionEn?: string;
  descriptionRw?: string;
  passThreshold: number;
  timeLimitMinutes: number;
  maxAttempts: number;
  randomizeQuestions: boolean;
  isPublished: boolean;
  questionsJson: string;
  updatedAt?: unknown;
}

export interface RubricConfig {
  id: string;
  courseId: string;
  problemWeight: number;
  approachWeight: number;
  implementationWeight: number;
  testingWeight: number;
  docsWeight: number;
  passThreshold: number;
  updatedBy: string;
  updatedAt?: unknown;
}

export interface LearnerNote {
  id: string;
  userId: string;
  courseId: string;
  dayNumber: number;
  bookmarked: boolean;
  noteText: string;
  updatedAt?: unknown;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  ticketOwnerUid: string;
  senderUid: string;
  senderName: string;
  senderRole: 'learner' | 'staff';
  message: string;
  createdAt?: unknown;
}

export interface EmailTemplateRecord {
  id: string;
  templateKey: string;
  name: string;
  subjectEn: string;
  subjectRw: string;
  bodyEn: string;
  bodyRw: string;
  updatedBy: string;
  updatedAt?: unknown;
}

export interface ResourceItem {
  id: string;
  courseId: string;
  category: 'prompting' | 'automation' | 'ai_automation' | 'project';
  titleEn: string;
  titleRw: string;
  descriptionEn: string;
  descriptionRw: string;
  filename: string;
  externalUrl?: string;
  contentEn: string;
  contentRw: string;
  isPublished: boolean;
  updatedAt?: unknown;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  userEmail: string;
  userName: string;
  status: 'pending' | 'active' | 'revoked' | 'expired';
  accessType?: 'paid' | 'free' | 'manual_grant' | 'complimentary' | 'sponsored';
  paymentRef: string;
  amountRwf: number;
  couponCode?: string;
  discountRwf?: number;
  cohortId?: string;
  cohortName?: string;
  completedDays: number[];
  currentDay: number;
  grantedBy?: string;
  grantReason?: string;
  expiresAt?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  courseId: string;
  provider: 'mtn_momo' | 'airtel_money' | 'manual';
  phoneMasked: string;
  amountRwf: number;
  couponCode?: string;
  discountRwf?: number;
  transactionRef: string;
  status: 'pending' | 'verified' | 'failed' | 'refunded';
  verifiedBy?: string;
  verificationNote?: string;
  createdAt?: unknown;
}

export interface RefundRecord {
  id: string;
  paymentId: string;
  userId: string;
  courseId: string;
  amountRwf: number;
  reason: string;
  status: 'processed' | 'pending';
  processedBy: string;
  createdAt?: unknown;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  courseId: string;
  quizId?: string;
  quizTitle?: string;
  weekNumber: number;
  score: number;
  passed?: boolean;
  totalQuestions: number;
  correctCount: number;
  createdAt?: unknown;
}

export interface ProjectSubmission {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  courseId: string;
  projectKey: 'study_assistant' | 'auto_registration' | 'customer_inquiry' | 'content_planning' | 'research_assistant' | 'custom';
  title: string;
  problemStatement: string;
  toolsUsed: string[];
  artifactUrl?: string;
  documentationSummary: string;
  status: 'submitted' | 'under_review' | 'approved' | 'needs_revision';
  score?: number;
  reviewerFeedback?: string;
  assignedReviewerUid?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Certificate {
  id: string;
  userId: string;
  learnerName: string;
  courseId: string;
  courseTitle: string;
  finalScore: number;
  status: 'valid' | 'revoked';
  issuedAt?: unknown;
  issuedBy: string;
}

export interface EventRegistration {
  id: string;
  userId: string;
  eventId: string;
  eventTitle: string;
  attendeeName: string;
  attendeeEmail: string;
  attendanceMode: 'online' | 'kigali_in_person';
  status: 'registered' | 'cancelled';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface InquiryRecord {
  id: string;
  type: 'contact' | 'waitlist';
  name: string;
  email: string;
  topic?: string;
  message?: string;
  courseSlug?: string;
  createdAt?: unknown;
}

export interface Announcement {
  id: string;
  titleEn: string;
  titleRw: string;
  bodyEn: string;
  bodyRw: string;
  audience: 'all' | 'learners' | 'staff';
  isPublished: boolean;
  createdBy: string;
  createdAt?: unknown;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: 'enrollment' | 'payment' | 'assessment' | 'certificate' | 'system';
  isRead: boolean;
  createdAt?: unknown;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  category: 'access' | 'payment' | 'technical' | 'curriculum' | 'certificate' | 'other';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  subject: string;
  description: string;
  assignedToUid?: string;
  resolutionNote?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PlatformSettings {
  id: string;
  platformName: string;
  defaultLanguage: Language;
  allowSelfRegistration: boolean;
  maintenanceMode: boolean;
  momoIntegrationActive: boolean;
  airtelIntegrationActive: boolean;
  emailProviderActive: boolean;
  smsProviderActive: boolean;
  enablePublicVerify?: boolean;
  enableWaitlists?: boolean;
  enableSupportTickets?: boolean;
  enableCoupons?: boolean;
  certificateOrgName?: string;
  certificateSignatoryName?: string;
  certificateSignatoryTitle?: string;
  certificateMinQuizAvg?: number;
  certificateMinProjectScore?: number;
  updatedBy: string;
  updatedAt?: unknown;
}

export interface AuditLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  actorRole?: string;
  action: string;
  targetCollection: string;
  targetId: string;
  previousState?: string;
  newState?: string;
  reason?: string;
  summary: string;
  createdAt?: unknown;
}

export interface IntegrationStatusResponse {
  momoActive: boolean;
  airtelActive: boolean;
  emailActive: boolean;
  smsActive: boolean;
  momoEnvironment?: 'sandbox' | 'production';
  airtelEnvironment?: 'sandbox' | 'production';
}

export interface MaskedGatewayConfig {
  momo: {
    enabled: boolean;
    environment: 'sandbox' | 'production';
    apiUserMasked: string;
    apiKeyMasked: string;
    subscriptionKeyMasked: string;
    callbackSecretMasked: string;
    merchantMsisdn: string;
    targetCurrency: 'RWF' | 'EUR';
    configured: boolean;
    source: 'vault' | 'env' | 'none';
  };
  airtel: {
    enabled: boolean;
    environment: 'sandbox' | 'production';
    clientIdMasked: string;
    clientSecretMasked: string;
    callbackSecretMasked: string;
    configured: boolean;
    source: 'vault' | 'env' | 'none';
  };
  email: {
    enabled: boolean;
    provider: 'resend' | 'smtp';
    fromEmail: string;
    apiKeyMasked: string;
    smtpHost: string;
    smtpPort: number;
    smtpUserMasked: string;
    smtpPassMasked: string;
    configured: boolean;
    source: 'vault' | 'env' | 'none';
  };
  sms: {
    enabled: boolean;
    provider: 'africastalking' | 'twilio' | 'custom';
    senderId: string;
    username: string;
    apiKeyMasked: string;
    configured: boolean;
    source: 'vault' | 'env' | 'none';
  };
  updatedAt?: string;
  updatedBy?: string;
}

export interface ServerPerformanceMetrics {
  timestamp: string;
  uptimeSeconds: number;
  concurrency: {
    inFlight: number;
    peakConcurrent: number;
    targetCapacityLabel: string;
  };
  traffic: {
    totalRequests: number;
    apiRequests: number;
    totalErrors5xx: number;
    rateLimited429: number;
    activeRateLimitBuckets: number;
  };
  latencyMs: {
    avg: number;
    p50: number;
    p95: number;
    samples: number;
  };
  memoryMb: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  ledger: {
    paymentCount: number;
    pendingCount: number;
    verifiedCount: number;
  };
  firebaseTierAdvisory: {
    currentTier: 'spark_free_or_managed';
    status: 'healthy' | 'watch' | 'upgrade_recommended';
    recommendation: string;
    upgradeDecisionNote: string;
  };
}

