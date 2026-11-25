import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
const blueprintRaw = fs.readFileSync(path.resolve(process.cwd(), 'firebase-blueprint.json'), 'utf8');
const blueprint = JSON.parse(blueprintRaw) as {
  entities: Record<string, { properties: Record<string, { type: string }> }>;
};

test('firestore.rules enforces timed releaseAtMs rules on both lesson get and list', () => {
  assert.ok(rules.includes('function isLessonTimeReleasedOnGet()'));
  assert.ok(rules.includes('existing().releaseAtMs'));
  assert.ok(rules.includes('modules/$(existing().moduleId)'));
  assert.ok(rules.includes('allow get: if isValidId(lessonId) && ('));
  assert.ok(rules.includes('(isLessonTimeReleasedOnGet() && ('));
  assert.ok(rules.includes('allow list: if isEducationStaff() || ('));
  assert.ok(rules.includes('request.time.toMillis() >= resource.data.releaseAtMs'));
});

test('firestore.rules validates releaseAtMs in CourseModule and Lesson schemas and blueprint stays synchronized', () => {
  assert.ok(rules.includes("!('releaseAtMs' in data) || (data.releaseAtMs is number && data.releaseAtMs >= 0)"));
  assert.equal(blueprint.entities.CourseModule?.properties?.releaseAtMs?.type, 'number');
  assert.equal(blueprint.entities.Lesson?.properties?.releaseAtMs?.type, 'number');
});

test('firestore.rules enforces RBAC separation between learners, staff, and superadmins', () => {
  assert.ok(rules.includes('function isSuperadmin()'));
  assert.ok(rules.includes('generaskagiraneza@gmail.com'));
  assert.ok(rules.includes('generaskagiraneza9@gmail.com'));
  assert.ok(rules.includes('match /enrollments/{enrollmentId}'));
  assert.ok(rules.includes("incoming().status == 'pending'"));
  assert.ok(rules.includes('getAfter(/databases/$(database)/documents/payments/$(incoming().paymentRef))'));
  assert.ok(rules.includes('match /payments/{paymentId}'));
  assert.ok(rules.includes('match /refunds/{refundId}'));
  assert.ok(rules.includes('match /supportTickets/{ticketId}'));
  assert.ok(rules.includes('match /announcements/{announcementId}'));
  assert.ok(rules.includes('match /notifications/{notificationId}'));
});

test('firestore.rules supports verified learner, staffRoles, admins, and superadmin profile creation/sync', () => {
  assert.ok(rules.includes('match /users/{userId}'));
  assert.ok(rules.includes('get(/databases/$(database)/documents/staffRoles/$(request.auth.uid)).data.role'));
  assert.ok(rules.includes('exists(/databases/$(database)/documents/admins/$(request.auth.uid))'));
  assert.ok(rules.includes("incoming().diff(existing()).affectedKeys().hasOnly(['uid', 'displayName', 'email', 'preferredLanguage', 'role', 'accountStatus', 'marketingOptIn', 'privacyConsentAcceptedAt', 'createdAt', 'updatedAt'])"));
});

