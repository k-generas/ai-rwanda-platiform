import type { PermissionKey, StaffRole, StaffRoleRecord } from '../types';
import { isBootstrappedSuperadminEmail } from '../firebase';

export const ALL_PERMISSIONS: PermissionKey[] = [
  'view_founder_overview',
  'manage_courses',
  'manage_lessons',
  'publish_courses',
  'manage_learners',
  'manage_access',
  'review_projects',
  'manage_payments',
  'process_refunds',
  'manage_certificates',
  'manage_communication',
  'manage_support',
  'manage_staff_roles',
  'view_audit_logs',
  'manage_platform_settings',
  'export_data'
];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  view_founder_overview: 'Founder Dashboard & Alerts',
  manage_courses: 'Courses & Programmes',
  manage_lessons: 'Lesson Content Editor (EN/RW)',
  publish_courses: 'Publish / Archive Courses',
  manage_learners: 'Learner Directory & Suspension',
  manage_access: 'Manual Access & Enrollment Control',
  review_projects: 'Project & Quiz Evaluation',
  manage_payments: 'Payment Verification',
  process_refunds: 'Refund Processing',
  manage_certificates: 'Certificate Issuance & Revocation',
  manage_communication: 'Announcements & Notifications',
  manage_support: 'Support Tickets & Inquiries',
  manage_staff_roles: 'Staff Roles & Permissions',
  view_audit_logs: 'Immutable Audit Logs',
  manage_platform_settings: 'Platform Settings & Integrations',
  export_data: 'CSV Reports & Data Backups'
};

export const DEFAULT_ROLE_PERMISSIONS: Record<StaffRole, PermissionKey[]> = {
  superadmin: ALL_PERMISSIONS,
  admin: [
    'view_founder_overview',
    'manage_courses',
    'manage_lessons',
    'publish_courses',
    'manage_learners',
    'manage_access',
    'review_projects',
    'manage_payments',
    'process_refunds',
    'manage_certificates',
    'manage_communication',
    'manage_support',
    'view_audit_logs',
    'export_data'
  ],
  course_manager: [
    'manage_courses',
    'manage_lessons',
    'publish_courses',
    'review_projects',
    'manage_communication'
  ],
  instructor: ['manage_lessons', 'review_projects', 'manage_communication'],
  reviewer: ['review_projects'],
  support_staff: ['manage_learners', 'manage_support'],
  learner: []
};

export const ROLE_DISPLAY: Record<
  StaffRole,
  { en: string; rw: string; description: string }
> = {
  superadmin: {
    en: 'Superadmin (Founder)',
    rw: 'Umuyobozi Mukuru',
    description: 'Full platform, staff role, financial, security, and configuration control.'
  },
  admin: {
    en: 'Admin',
    rw: 'Umuyobozi w’Ibikorwa',
    description: 'Manages education operations, learners, payments, refunds, and certificates.'
  },
  course_manager: {
    en: 'Course Manager',
    rw: 'Ushinzwe Amasomo',
    description: 'Creates, organizes, translates, and publishes assigned courses and programmes.'
  },
  instructor: {
    en: 'Instructor',
    rw: 'Umwarimu',
    description: 'Edits assigned lessons, posts announcements, and grades learner projects.'
  },
  reviewer: {
    en: 'Reviewer',
    rw: 'Umusuzumi',
    description: 'Evaluates and grades practical project submissions against rubrics.'
  },
  support_staff: {
    en: 'Support Staff',
    rw: 'Ubufasha bw’Abanyeshuri',
    description: 'Resolves learner support tickets and inquiries without altering prices or roles.'
  },
  learner: {
    en: 'Learner',
    rw: 'Umunyeshuri',
    description: 'Discovers courses, completes lessons, takes assessments, and earns certificates.'
  }
};

export interface ResolvedAccess {
  role: StaffRole;
  permissions: PermissionKey[];
  assignedCourseIds: string[];
  isStaff: boolean;
  isSuperadmin: boolean;
  isAdmin: boolean;
}

export function resolveUserAccess(
  email: string | null | undefined,
  emailVerified: boolean,
  staffRoleRecord: StaffRoleRecord | null,
  hasLegacyAdminDoc: boolean
): ResolvedAccess {
  const isBootstrappedSuperadmin =
    emailVerified && isBootstrappedSuperadminEmail(email);

  if (isBootstrappedSuperadmin) {
    return {
      role: 'superadmin',
      permissions: ALL_PERMISSIONS,
      assignedCourseIds: [],
      isStaff: true,
      isSuperadmin: true,
      isAdmin: true
    };
  }

  if (staffRoleRecord && staffRoleRecord.status === 'active') {
    const role = staffRoleRecord.role;
    const perms =
      staffRoleRecord.permissions && staffRoleRecord.permissions.length > 0
        ? staffRoleRecord.permissions
        : DEFAULT_ROLE_PERMISSIONS[role];
    return {
      role,
      permissions: role === 'superadmin' ? ALL_PERMISSIONS : perms,
      assignedCourseIds: staffRoleRecord.assignedCourseIds ?? [],
      isStaff: true,
      isSuperadmin: role === 'superadmin',
      isAdmin: role === 'superadmin' || role === 'admin'
    };
  }

  if (emailVerified && hasLegacyAdminDoc) {
    return {
      role: 'admin',
      permissions: DEFAULT_ROLE_PERMISSIONS.admin,
      assignedCourseIds: [],
      isStaff: true,
      isSuperadmin: false,
      isAdmin: true
    };
  }

  return {
    role: 'learner',
    permissions: [],
    assignedCourseIds: [],
    isStaff: false,
    isSuperadmin: false,
    isAdmin: false
  };
}

export function hasPermission(access: ResolvedAccess, key: PermissionKey): boolean {
  if (access.isSuperadmin || access.role === 'superadmin') return true;
  return access.permissions.includes(key);
}
