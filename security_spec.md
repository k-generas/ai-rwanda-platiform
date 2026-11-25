# Firestore Security Specification — AI Education Rwanda

## 1. Data Invariants
1. **Identity Isolation**: Users may only create/read/update their own `/users/{userId}` document and may never self-assign `role: 'admin'`.
2. **Payment-Gated Enrollment**: An enrollment `/enrollments/{userId}_{courseId}` cannot be created without an atomic matching verified `/payments/{paymentRef}` document (`existsAfter`) unless created by an admin.
3. **Sample vs Paid Lessons**: Public `list` on `/lessons` only exposes `isSample == true`; full lessons require active enrollment verified by `exists()` on `/enrollments/{uid}_{courseId}` or admin status.
4. **Certificate Integrity**: Only admins may create, update, or revoke `/certificates/{certificateId}`. Public visitors may `get` a specific certificate ID for verification without listing all learners' certificates.
5. **Immutable Audit Logs**: `/auditLogs/{logId}` can only be created and read by admins, never updated or deleted.
6. **Temporal Integrity**: All `createdAt` and `updatedAt` timestamps must equal `request.time`.

## 2. Dirty Dozen Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Self-Admin Escalation**: `POST /users/{uid}` with `role: "admin"` by non-admin user.
2. **Role Tampering on Update**: `PATCH /users/{uid}` changing `role` from `"learner"` to `"admin"`.
3. **Ghost Shadow Field**: `POST /users/{uid}` adding unexpected key `isVerified: true`.
4. **Unverified Email Spoofing**: Request claiming admin email while `request.auth.token.email_verified == false`.
5. **PII Blanket Read**: Non-owner authenticated user attempting `get /users/{otherUid}` or `list /users`.
6. **ID Poisoning**: Document ID > 128 chars or containing invalid characters (`../admin`).
7. **Orphaned Enrollment**: `POST /enrollments/{uid}_challenge-28` without an atomic verified `/payments/{paymentRef}` document.
8. **Duplicate / Spoofed Owner Enrollment**: `POST /enrollments/{otherUid}_challenge-28` where `userId != request.auth.uid`.
9. **Unauthorized Certificate Forgery**: Learner attempting `POST /certificates/RW-AI-FAKE-1`.
10. **Score Tampering After Approval**: Learner updating `/projectSubmissions/{id}` to overwrite `score: 100` or `status: "approved"`.
11. **Paid Lesson Scraping**: Unenrolled user running `list /lessons` expecting paid lessons or `get /lessons/day-2` without enrollment.
12. **Timestamp Backdating**: Client sending `createdAt` older than `request.time` on `payments` or `projectSubmissions`.
