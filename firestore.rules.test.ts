/**
 * Security Rules Verification Suite (Dirty Dozen Adversarial Payloads)
 * Maps each attack vector in security_spec.md to its rule enforcement check.
 */
export const dirtyDozenCases = [
  { id: 1, name: 'Self-Admin Escalation', collection: 'users', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 2, name: 'Role Tampering on Update', collection: 'users', operation: 'update', expected: 'PERMISSION_DENIED' },
  { id: 3, name: 'Ghost Shadow Field', collection: 'users', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 4, name: 'Unverified Email Spoofing', collection: 'admins', operation: 'read', expected: 'PERMISSION_DENIED' },
  { id: 5, name: 'PII Blanket Read', collection: 'users', operation: 'list', expected: 'PERMISSION_DENIED' },
  { id: 6, name: 'ID Poisoning', collection: 'courses', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 7, name: 'Orphaned Enrollment', collection: 'enrollments', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 8, name: 'Duplicate / Spoofed Owner Enrollment', collection: 'enrollments', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 9, name: 'Unauthorized Certificate Forgery', collection: 'certificates', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 10, name: 'Score Tampering After Approval', collection: 'projectSubmissions', operation: 'update', expected: 'PERMISSION_DENIED' },
  { id: 11, name: 'Paid Lesson Scraping', collection: 'lessons', operation: 'list', expected: 'PERMISSION_DENIED' },
  { id: 12, name: 'Timestamp Backdating', collection: 'payments', operation: 'create', expected: 'PERMISSION_DENIED' },
] as const;
