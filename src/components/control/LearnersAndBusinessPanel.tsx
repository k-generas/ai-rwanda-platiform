import React, { useState } from 'react';
import { doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { X } from 'lucide-react';
import {
  db,
  handleFirestoreError,
  isBootstrappedSuperadminEmail,
  OperationType
} from '../../firebase';
import type { Enrollment, PaymentRecord, UserProfile } from '../../types';
import { COURSES } from '../../data/curriculum';
import { downloadCsv } from '../../lib/csvExport';
import type { AuditWriteParams, ControlCenterData } from './ControlCenterTypes';

interface LearnersAndBusinessPanelProps {
  section: 'learners' | 'access' | 'payments' | 'refunds';
  user: User;
  data: ControlCenterData;
  onWriteAudit: (params: AuditWriteParams) => Promise<void>;
  onRefreshData: () => Promise<void>;
}

export function LearnersAndBusinessPanel({
  section,
  user,
  data,
  onWriteAudit,
  onRefreshData
}: LearnersAndBusinessPanelProps) {
  const { users, courses, enrollments, payments, refunds, quizAttempts, submissions, certificates, supportTickets } = data;
  const courseCatalog = courses.length > 0 ? courses : COURSES;

  // Learners search & detail drawer
  const [learnerSearch, setLearnerSearch] = useState('');
  const [selectedLearner, setSelectedLearner] = useState<UserProfile | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [learnerBusy, setLearnerBusy] = useState(false);

  // Manual Access Grant form
  const [grantUserId, setGrantUserId] = useState('');
  const [grantCourseId, setGrantCourseId] = useState('challenge-28');
  const [grantAccessType, setGrantAccessType] = useState<
    'manual_grant' | 'complimentary' | 'sponsored'
  >('manual_grant');
  const [grantExpiresAt, setGrantExpiresAt] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [grantBusy, setGrantBusy] = useState(false);
  const [grantMsg, setGrantMsg] = useState<string | null>(null);

  // Payments filter
  const [payFilter, setPayFilter] = useState<'all' | 'pending' | 'verified' | 'failed' | 'refunded'>('all');
  const [payNoteMap, setPayNoteMap] = useState<Record<string, string>>({});
  const [payBusyId, setPayBusyId] = useState<string | null>(null);

  // Refund form
  const [refundPaymentId, setRefundPaymentId] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [revokeOnRefund, setRevokeOnRefund] = useState(true);
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundMsg, setRefundMsg] = useState<string | null>(null);

  const [enrollmentNoteMap, setEnrollmentNoteMap] = useState<Record<string, string>>({});

  const handleToggleSuspendUser = async (target: UserProfile) => {
    if (target.role === 'superadmin' || isBootstrappedSuperadminEmail(target.email)) {
      return;
    }
    const nextStatus = target.accountStatus === 'suspended' ? 'active' : 'suspended';
    const reason =
      suspendReason.trim() ||
      (nextStatus === 'suspended'
        ? 'Suspended by administrator'
        : 'Reactivated by administrator');
    setLearnerBusy(true);
    try {
      await updateDoc(doc(db, 'users', target.uid), {
        accountStatus: nextStatus,
        suspensionReason: nextStatus === 'suspended' ? reason : '',
        updatedAt: serverTimestamp()
      });

      await onWriteAudit({
        action: nextStatus === 'suspended' ? 'SUSPEND_USER' : 'REACTIVATE_USER',
        targetCollection: 'users',
        targetId: target.uid,
        previousState: target.accountStatus ?? 'active',
        newState: nextStatus,
        reason,
        summary: `${nextStatus === 'suspended' ? 'Suspended' : 'Reactivated'} account ${target.email}`
      });

      setSuspendReason('');
      setSelectedLearner({ ...target, accountStatus: nextStatus, suspensionReason: reason });
      await onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${target.uid}`);
    } finally {
      setLearnerBusy(false);
    }
  };

  const handleManualGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = users.find((u) => u.uid === grantUserId);
    if (!targetUser) {
      setGrantMsg('Select a valid learner account first.');
      return;
    }
    if (grantReason.trim().length < 3) {
      setGrantMsg('Provide a clear reason for manual access assignment.');
      return;
    }

    setGrantBusy(true);
    setGrantMsg(null);
    const enrollmentId = `${targetUser.uid}_${grantCourseId}`;
    const existingEnr = enrollments.find((x) => x.id === enrollmentId);
    const refId = `grant_${Date.now()}`;
    const course = courseCatalog.find((c) => c.id === grantCourseId);

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'enrollments', enrollmentId), {
        id: enrollmentId,
        userId: targetUser.uid,
        courseId: grantCourseId,
        userEmail: targetUser.email,
        userName: targetUser.displayName,
        status: 'active',
        accessType: grantAccessType,
        paymentRef: existingEnr?.paymentRef || refId,
        amountRwf: existingEnr?.amountRwf ?? 0,
        completedDays: existingEnr?.completedDays ?? [],
        currentDay: existingEnr?.currentDay ?? 1,
        grantedBy: user.email || user.uid,
        grantReason: grantReason.trim(),
        ...(grantExpiresAt.trim() ? { expiresAt: grantExpiresAt.trim() } : {}),
        createdAt: existingEnr?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const notifId = `ntf_${Date.now()}`;
      batch.set(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: targetUser.uid,
        title: `Course Access Activated: ${course?.title.en || grantCourseId}`,
        message: `You have been granted ${grantAccessType.replace('_', ' ')} access. Open My Courses to start learning.`,
        category: 'enrollment',
        isRead: false,
        createdAt: serverTimestamp()
      });

      await batch.commit();

      await onWriteAudit({
        action: 'MANUAL_ACCESS_GRANT',
        targetCollection: 'enrollments',
        targetId: enrollmentId,
        previousState: existingEnr?.status ?? 'none',
        newState: `active (${grantAccessType})`,
        reason: grantReason.trim(),
        summary: `Granted ${grantAccessType} access for ${targetUser.email} to ${grantCourseId}`
      });

      setGrantReason('');
      setGrantExpiresAt('');
      setGrantMsg(`Activated ${grantAccessType.replace('_', ' ')} access for ${targetUser.email}.`);
      await onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `enrollments/${enrollmentId}`);
    } finally {
      setGrantBusy(false);
    }
  };

  const handleToggleEnrollmentStatus = async (enr: Enrollment, nextStatus: 'active' | 'revoked') => {
    const reason =
      enrollmentNoteMap[enr.id]?.trim() ||
      (nextStatus === 'active'
        ? 'Reactivated by administrator'
        : 'Revoked by administrator');
    try {
      await updateDoc(doc(db, 'enrollments', enr.id), {
        status: nextStatus,
        grantReason: reason,
        updatedAt: serverTimestamp()
      });
      await onWriteAudit({
        action: nextStatus === 'active' ? 'ACTIVATE_ENROLLMENT' : 'REVOKE_ENROLLMENT',
        targetCollection: 'enrollments',
        targetId: enr.id,
        previousState: enr.status,
        newState: nextStatus,
        reason,
        summary: `Changed enrollment ${enr.userEmail} (${enr.courseId}) to ${nextStatus}`
      });
      await onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `enrollments/${enr.id}`);
    }
  };

  const handleVerifyOrFailPayment = async (
    pay: PaymentRecord,
    nextStatus: 'verified' | 'failed'
  ) => {
    setPayBusyId(pay.id);
    const note =
      payNoteMap[pay.id]?.trim() ||
      (nextStatus === 'verified'
        ? 'Verified against Mobile Money statement'
        : 'Verification failed or transaction not found');
    const enrollmentId = `${pay.userId}_${pay.courseId}`;
    const existingEnr = enrollments.find((e) => e.id === enrollmentId);

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'payments', pay.id), {
        status: nextStatus,
        verifiedBy: user.email || user.uid,
        verificationNote: note
      });

      if (nextStatus === 'verified' && existingEnr) {
        batch.update(doc(db, 'enrollments', enrollmentId), {
          status: 'active',
          grantedBy: user.email || user.uid,
          grantReason: note,
          updatedAt: serverTimestamp()
        });
      } else if (nextStatus === 'failed' && existingEnr && existingEnr.status === 'pending') {
        batch.update(doc(db, 'enrollments', enrollmentId), {
          status: 'revoked',
          grantReason: note,
          updatedAt: serverTimestamp()
        });
      }

      const notifId = `ntf_${Date.now()}`;
      batch.set(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: pay.userId,
        title:
          nextStatus === 'verified'
            ? 'Payment Verified — Full Course Unlocked'
            : 'Payment Verification Issue',
        message:
          nextStatus === 'verified'
            ? `Your payment ${pay.transactionRef} (${pay.amountRwf.toLocaleString()} RWF) is verified. All 28 lessons are now unlocked.`
            : `Payment ${pay.transactionRef} could not be verified: ${note}. Open Support if you need assistance.`,
        category: 'payment',
        isRead: false,
        createdAt: serverTimestamp()
      });

      await batch.commit();

      await onWriteAudit({
        action: nextStatus === 'verified' ? 'VERIFY_PAYMENT' : 'MARK_PAYMENT_FAILED',
        targetCollection: 'payments',
        targetId: pay.id,
        previousState: pay.status,
        newState: nextStatus,
        reason: note,
        summary: `${nextStatus === 'verified' ? 'Verified' : 'Marked failed'} payment ${pay.transactionRef} (${pay.amountRwf} RWF)`
      });

      await onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `payments/${pay.id}`);
    } finally {
      setPayBusyId(null);
    }
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetPay = payments.find((p) => p.id === refundPaymentId);
    if (!targetPay) {
      setRefundMsg('Select a verified payment to refund.');
      return;
    }
    if (refundReason.trim().length < 3) {
      setRefundMsg('Provide a reason for processing this refund.');
      return;
    }

    setRefundBusy(true);
    setRefundMsg(null);
    const refundId = `ref_${Date.now()}`;
    const enrollmentId = `${targetPay.userId}_${targetPay.courseId}`;
    const existingEnr = enrollments.find((e) => e.id === enrollmentId);

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'refunds', refundId), {
        id: refundId,
        paymentId: targetPay.id,
        userId: targetPay.userId,
        courseId: targetPay.courseId,
        amountRwf: targetPay.amountRwf,
        reason: refundReason.trim(),
        status: 'processed',
        processedBy: user.email || user.uid,
        createdAt: serverTimestamp()
      });

      batch.update(doc(db, 'payments', targetPay.id), {
        status: 'refunded',
        verifiedBy: user.email || user.uid,
        verificationNote: `Refunded: ${refundReason.trim()}`
      });

      if (revokeOnRefund && existingEnr) {
        batch.update(doc(db, 'enrollments', enrollmentId), {
          status: 'revoked',
          grantReason: `Refunded: ${refundReason.trim()}`,
          updatedAt: serverTimestamp()
        });
      }

      await batch.commit();

      await onWriteAudit({
        action: 'PROCESS_REFUND',
        targetCollection: 'refunds',
        targetId: refundId,
        previousState: targetPay.status,
        newState: 'refunded',
        reason: refundReason.trim(),
        summary: `Processed ${targetPay.amountRwf.toLocaleString()} RWF refund for ${targetPay.transactionRef}`
      });

      setRefundPaymentId('');
      setRefundReason('');
      setRefundMsg(`Refund ${refundId} recorded and payment marked refunded.`);
      await onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `refunds/${refundId}`);
    } finally {
      setRefundBusy(false);
    }
  };

  // SECTION: ALL LEARNERS + DETAIL DRAWER
  if (section === 'learners') {
    const q = learnerSearch.trim().toLowerCase();
    const filteredUsers = users.filter(
      (u) =>
        !q ||
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );

    return (
      <div className="space-y-6">
        <div className="bg-white border border-black/[0.08] rounded-2xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
                Learners & Accounts Directory
              </h2>
              <p className="text-sm text-[#5D5D66]">
                Click any learner to inspect enrollments, payments, quiz attempts, submissions, and suspension controls.
              </p>
            </div>
            <input
              type="search"
              value={learnerSearch}
              onChange={(e) => setLearnerSearch(e.target.value)}
              placeholder="Search name, email, or role..."
              className="w-full sm:w-72 px-3.5 py-2 text-[15px] border border-black/15 rounded-lg"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-black/[0.08] text-[#5D5D66]">
                  <th className="py-2.5 pr-4 font-medium">Name</th>
                  <th className="py-2.5 pr-4 font-medium">Email</th>
                  <th className="py-2.5 pr-4 font-medium">Role</th>
                  <th className="py-2.5 pr-4 font-medium">Lang</th>
                  <th className="py-2.5 pr-4 font-medium">Enrollments</th>
                  <th className="py-2.5 pr-4 font-medium">Account Status</th>
                  <th className="py-2.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#5D5D66]">
                      No matching accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const userEnrs = enrollments.filter((e) => e.userId === u.uid);
                    return (
                      <tr key={u.uid} className="hover:bg-[#F9F9FB]">
                        <td className="py-3 pr-4 font-medium text-[#0D0D0F]">{u.displayName}</td>
                        <td className="py-3 pr-4 font-mono text-[#5D5D66]">{u.email}</td>
                        <td className="py-3 pr-4 font-mono">{u.role}</td>
                        <td className="py-3 pr-4 uppercase">{u.preferredLanguage}</td>
                        <td className="py-3 pr-4 font-mono tabular-nums">{userEnrs.length}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={`font-mono uppercase ${
                              u.accountStatus === 'suspended' ? 'text-[#DC2626]' : 'text-[#0D7A5F]'
                            }`}
                          >
                            {u.accountStatus || 'active'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedLearner(u)}
                            className="px-3 py-1 border border-black/15 rounded-lg hover:border-black/35"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {data.pagination?.users.hasMore && data.onLoadMore && (
            <div className="pt-4 border-t border-black/[0.06] flex items-center justify-between text-sm">
              <span className="text-[#5D5D66] font-mono">
                Showing {users.length} accounts (more available)
              </span>
              <button
                type="button"
                disabled={data.pagination.users.loadingMore}
                onClick={() => data.onLoadMore?.('users')}
                className="px-4 py-2 font-medium border border-black/15 rounded-lg hover:border-black/35 disabled:opacity-50"
              >
                {data.pagination.users.loadingMore ? 'Loading next 100...' : 'Load More Learners'}
              </button>
            </div>
          )}
        </div>

        {/* Learner Detail Drawer / Modal */}
        {selectedLearner && (
          <div
            className="fixed inset-0 z-50 bg-black/40 flex justify-end"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white w-full max-w-xl h-full overflow-y-auto p-6 sm:p-8 space-y-6 border-l border-black/10">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-black/[0.08]">
                <div>
                  <p className="text-sm font-mono text-[#0D7A5F]">LEARNER PROFILE</p>
                  <h3 className="text-xl font-display font-bold text-[#0D0D0F]">
                    {selectedLearner.displayName}
                  </h3>
                  <p className="text-sm font-mono text-[#5D5D66]">{selectedLearner.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLearner(null)}
                  className="p-1.5 rounded-lg hover:bg-[#F4F5F7]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-[#F9F9FB] rounded-xl p-3">
                  <p className="text-[#5D5D66]">Enrollments</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {enrollments.filter((e) => e.userId === selectedLearner.uid).length}
                  </p>
                </div>
                <div className="bg-[#F9F9FB] rounded-xl p-3">
                  <p className="text-[#5D5D66]">Quizzes</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {quizAttempts.filter((q) => q.userId === selectedLearner.uid).length}
                  </p>
                </div>
                <div className="bg-[#F9F9FB] rounded-xl p-3">
                  <p className="text-[#5D5D66]">Certificates</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {certificates.filter((c) => c.userId === selectedLearner.uid).length}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <h4 className="font-semibold text-[#0D0D0F]">Course Enrollments</h4>
                {enrollments.filter((e) => e.userId === selectedLearner.uid).length === 0 ? (
                  <p className="text-[#5D5D66]">No enrollments yet.</p>
                ) : (
                  enrollments
                    .filter((e) => e.userId === selectedLearner.uid)
                    .map((enr) => {
                      const courseDays =
                        courseCatalog.find((c) => c.id === enr.courseId)?.durationDays ?? 28;
                      return (
                        <div key={enr.id} className="bg-[#F9F9FB] rounded-lg p-3 flex justify-between">
                          <span>
                            {enr.courseId} · {enr.completedDays.length}/{courseDays} days (
                            {enr.accessType ?? 'paid'})
                            {enr.cohortName ? ` · ${enr.cohortName}` : ''}
                          </span>
                          <span className="font-mono uppercase">{enr.status}</span>
                        </div>
                      );
                    })
                )}
              </div>

              <div className="space-y-2 text-sm">
                <h4 className="font-semibold text-[#0D0D0F]">Payments & Support Tickets</h4>
                {payments
                  .filter((p) => p.userId === selectedLearner.uid)
                  .map((p) => (
                    <div key={p.id} className="bg-[#F9F9FB] rounded-lg p-3 flex justify-between">
                      <span className="font-mono">{p.transactionRef}</span>
                      <span className="font-mono">
                        {p.amountRwf.toLocaleString()} RWF · {p.status}
                      </span>
                    </div>
                  ))}
                {supportTickets
                  .filter((t) => t.userId === selectedLearner.uid)
                  .map((t) => (
                    <div key={t.id} className="bg-[#F9F9FB] rounded-lg p-3 flex justify-between">
                      <span>{t.subject}</span>
                      <span className="font-mono uppercase">{t.status}</span>
                    </div>
                  ))}
                {submissions
                  .filter((s) => s.userId === selectedLearner.uid)
                  .map((s) => (
                    <div key={s.id} className="bg-[#F9F9FB] rounded-lg p-3 flex justify-between">
                      <span>Project: {s.title}</span>
                      <span className="font-mono">{s.status}</span>
                    </div>
                  ))}
              </div>

              <div className="pt-4 border-t border-black/[0.08] space-y-3">
                <h4 className="text-sm font-semibold text-[#0D0D0F]">
                  Account Suspension / Reactivation Control
                </h4>
                {selectedLearner.role === 'superadmin' ||
                isBootstrappedSuperadminEmail(selectedLearner.email) ? (
                  <p className="text-sm text-[#0D7A5F]">
                    Protected Superadmin account cannot be suspended.
                  </p>
                ) : (
                  <>
                    <input
                      type="text"
                      value={suspendReason}
                      onChange={(e) => setSuspendReason(e.target.value)}
                      placeholder="Reason (recorded in Audit Log)..."
                      className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg"
                    />
                    <button
                      type="button"
                      disabled={learnerBusy}
                      onClick={() => handleToggleSuspendUser(selectedLearner)}
                      className={`w-full px-4 py-2 text-sm font-medium rounded-lg ${
                        selectedLearner.accountStatus === 'suspended'
                          ? 'bg-[#0D7A5F] text-white'
                          : 'bg-[#DC2626] text-white'
                      }`}
                    >
                      {selectedLearner.accountStatus === 'suspended'
                        ? 'Reactivate Learner Account'
                        : 'Suspend Learner Account'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // SECTION: ENROLLMENTS & MANUAL ACCESS CONTROL
  if (section === 'access') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
          <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
            Manual Course Access Grant
          </h2>
          <p className="text-sm text-[#5D5D66]">
            Grant manual, complimentary, or sponsored course access with an auditable reason and optional expiration date.
          </p>

          <form onSubmit={handleManualGrantAccess} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Learner Account</label>
              <select
                required
                value={grantUserId}
                onChange={(e) => setGrantUserId(e.target.value)}
                className="w-full px-3.5 py-2 text-[15px] border border-black/15 rounded-lg bg-white"
              >
                <option value="">-- Select learner --</option>
                {users.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Course</label>
              <select
                value={grantCourseId}
                onChange={(e) => setGrantCourseId(e.target.value)}
                className="w-full px-3.5 py-2 text-[15px] border border-black/15 rounded-lg bg-white"
              >
                {courseCatalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} · {c.title.en}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Access Type</label>
                <select
                  value={grantAccessType}
                  onChange={(e) =>
                    setGrantAccessType(
                      e.target.value as 'manual_grant' | 'complimentary' | 'sponsored'
                    )
                  }
                  className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-white"
                >
                  <option value="manual_grant">Manual Grant</option>
                  <option value="complimentary">Complimentary</option>
                  <option value="sponsored">Sponsored / Scholarship</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Expires At (optional)</label>
                <input
                  type="date"
                  value={grantExpiresAt}
                  onChange={(e) => setGrantExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Mandatory Audit Reason</label>
              <input
                type="text"
                required
                minLength={3}
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
                placeholder="e.g. Kigali youth scholarship cohort"
                className="w-full px-3.5 py-2 text-[15px] border border-black/15 rounded-lg"
              />
            </div>

            {grantMsg && <p className="text-sm text-[#0D7A5F] font-medium">{grantMsg}</p>}

            <button
              type="submit"
              disabled={grantBusy}
              className="w-full px-4 py-2.5 text-[15px] font-medium text-white bg-[#0D0D0F] rounded-lg"
            >
              {grantBusy ? 'Granting...' : 'Grant Active Course Access'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
              Enrollments ({enrollments.length})
            </h2>
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  `enrollments-${Date.now()}.csv`,
                  ['Learner', 'Email', 'Course', 'Status', 'Access Type', 'Days Completed', 'Reason'],
                  enrollments.map((e) => [
                    e.userName,
                    e.userEmail,
                    e.courseId,
                    e.status,
                    e.accessType ?? 'paid',
                    e.completedDays.length,
                    e.grantReason ?? ''
                  ])
                )
              }
              className="px-3 py-1.5 text-sm border border-black/15 rounded-lg"
            >
              Export CSV
            </button>
          </div>

          {enrollments.length === 0 ? (
            <p className="text-sm text-[#5D5D66]">No enrollments recorded yet.</p>
          ) : (
            <div className="divide-y divide-black/[0.06]">
              {enrollments.map((enr) => {
                const courseDays =
                  courseCatalog.find((c) => c.id === enr.courseId)?.durationDays ?? 28;
                return (
                <div key={enr.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-[#0D0D0F] truncate">
                      {enr.userName} ({enr.userEmail})
                    </p>
                    <p className="font-mono text-[#5D5D66] tabular-nums">
                      {enr.courseId} · {enr.accessType ?? 'paid'} · {enr.completedDays.length}/{courseDays}d ·{' '}
                      {enr.cohortName ? `${enr.cohortName} · ` : ''}
                      <span
                        className={
                          enr.status === 'active'
                            ? 'text-[#0D7A5F]'
                            : enr.status === 'pending'
                              ? 'text-[#D97706]'
                              : 'text-[#DC2626]'
                        }
                      >
                        {enr.status}
                      </span>
                    </p>
                    {enr.grantReason && (
                      <p className="text-[15px] text-[#5D5D66]">Note: {enr.grantReason}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <input
                      type="text"
                      value={enrollmentNoteMap[enr.id] ?? ''}
                      onChange={(e) =>
                        setEnrollmentNoteMap((prev) => ({ ...prev, [enr.id]: e.target.value }))
                      }
                      placeholder="Audit note..."
                      className="w-32 px-2.5 py-1.5 text-sm border border-black/15 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleEnrollmentStatus(enr, enr.status === 'active' ? 'revoked' : 'active')
                      }
                      className="px-3 py-1.5 border border-black/15 rounded-lg shrink-0"
                    >
                      {enr.status === 'active' ? 'Revoke' : 'Activate'}
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          {data.pagination?.enrollments.hasMore && data.onLoadMore && (
            <div className="pt-4 border-t border-black/[0.06] flex items-center justify-between text-sm">
              <span className="text-[#5D5D66] font-mono">
                Loaded {enrollments.length} enrollments
              </span>
              <button
                type="button"
                disabled={data.pagination.enrollments.loadingMore}
                onClick={() => data.onLoadMore?.('enrollments')}
                className="px-4 py-2 font-medium border border-black/15 rounded-lg hover:border-black/35 disabled:opacity-50"
              >
                {data.pagination.enrollments.loadingMore ? 'Loading...' : 'Load More Enrollments'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // SECTION: PAYMENTS & VERIFICATION
  if (section === 'payments') {
    const filteredPayments = payments.filter((p) => payFilter === 'all' || p.status === payFilter);
    const totalVerified = payments
      .filter((p) => p.status === 'verified')
      .reduce((acc, p) => acc + p.amountRwf, 0);
    const totalPending = payments
      .filter((p) => p.status === 'pending')
      .reduce((acc, p) => acc + p.amountRwf, 0);
    const totalRefunded = payments
      .filter((p) => p.status === 'refunded')
      .reduce((acc, p) => acc + p.amountRwf, 0);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-xl p-5">
            <p className="text-sm text-[#5D5D66]">Verified Gross Revenue</p>
            <p className="text-2xl font-display font-semibold tabular-nums text-[#0D7A5F]">
              {totalVerified.toLocaleString()} RWF
            </p>
          </div>
          <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-xl p-5">
            <p className="text-sm text-[#5D5D66]">Pending Verification</p>
            <p className="text-2xl font-display font-semibold tabular-nums text-[#D97706]">
              {totalPending.toLocaleString()} RWF
            </p>
          </div>
          <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-xl p-5">
            <p className="text-sm text-[#5D5D66]">Refunded Total</p>
            <p className="text-2xl font-display font-semibold tabular-nums text-[#DC2626]">
              {totalRefunded.toLocaleString()} RWF
            </p>
          </div>
        </div>

        <div className="bg-white border border-black/[0.08] rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F4F5F7] rounded-xl">
              {(['all', 'pending', 'verified', 'failed', 'refunded'] as const).map((statusKey) => (
                <button
                  key={statusKey}
                  type="button"
                  onClick={() => setPayFilter(statusKey)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg capitalize ${
                    payFilter === statusKey
                      ? 'bg-white text-[#0D0D0F] shadow-xs'
                      : 'text-[#5D5D66]'
                  }`}
                >
                  {statusKey}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  `payments-${Date.now()}.csv`,
                  ['Ref', 'Provider', 'Phone', 'Course', 'Amount RWF', 'Status', 'Verified By'],
                  filteredPayments.map((p) => [
                    p.transactionRef,
                    p.provider,
                    p.phoneMasked,
                    p.courseId,
                    p.amountRwf,
                    p.status,
                    p.verifiedBy ?? ''
                  ])
                )
              }
              className="px-3.5 py-2 text-sm font-medium border border-black/15 rounded-lg"
            >
              Export Payments CSV
            </button>
          </div>

          {filteredPayments.length === 0 ? (
            <p className="text-sm text-[#5D5D66] py-6">No transactions in this filter.</p>
          ) : (
            <div className="divide-y divide-black/[0.06]">
              {filteredPayments.map((pay) => (
                <div
                  key={pay.id}
                  className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-[#0D0D0F]">
                        {pay.transactionRef}
                      </span>
                      <span
                        className={`font-mono uppercase ${
                          pay.status === 'verified'
                            ? 'text-[#0D7A5F]'
                            : pay.status === 'pending'
                              ? 'text-[#D97706]'
                              : 'text-[#DC2626]'
                        }`}
                      >
                        {pay.status}
                      </span>
                    </div>
                    <p className="text-[#5D5D66]">
                      {pay.provider} · {pay.phoneMasked} · {pay.courseId} ·{' '}
                      <strong className="font-mono tabular-nums text-[#0D0D0F]">
                        {pay.amountRwf.toLocaleString()} RWF
                      </strong>
                    </p>
                    {pay.verificationNote && (
                      <p className="text-[15px] text-[#5D5D66]">
                        Note: {pay.verificationNote} {pay.verifiedBy ? `(${pay.verifiedBy})` : ''}
                      </p>
                    )}
                  </div>

                  {pay.status === 'pending' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={payNoteMap[pay.id] ?? ''}
                        onChange={(e) =>
                          setPayNoteMap((prev) => ({ ...prev, [pay.id]: e.target.value }))
                        }
                        placeholder="Verification note / MoMo ID..."
                        className="px-3 py-1.5 border border-black/15 rounded-lg text-sm"
                      />
                      <button
                        type="button"
                        disabled={payBusyId === pay.id}
                        onClick={() => handleVerifyOrFailPayment(pay, 'verified')}
                        className="px-3 py-1.5 font-medium text-white bg-[#0D7A5F] rounded-lg whitespace-nowrap"
                      >
                        Verify & Unlock Access
                      </button>
                      <button
                        type="button"
                        disabled={payBusyId === pay.id}
                        onClick={() => handleVerifyOrFailPayment(pay, 'failed')}
                        className="px-3 py-1.5 font-medium text-[#DC2626] border border-[#DC2626]/30 rounded-lg whitespace-nowrap"
                      >
                        Mark Failed
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {data.pagination?.payments.hasMore && data.onLoadMore && (
            <div className="pt-4 border-t border-black/[0.06] flex items-center justify-between text-sm">
              <span className="text-[#5D5D66] font-mono">
                Loaded {payments.length} transactions
              </span>
              <button
                type="button"
                disabled={data.pagination.payments.loadingMore}
                onClick={() => data.onLoadMore?.('payments')}
                className="px-4 py-2 font-medium border border-black/15 rounded-lg hover:border-black/35 disabled:opacity-50"
              >
                {data.pagination.payments.loadingMore ? 'Loading...' : 'Load More Payments'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // SECTION: REFUNDS
  const refundablePayments = payments.filter((p) => p.status === 'verified');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-5 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
        <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">Process Refund Record</h2>
        <p className="text-sm text-[#5D5D66]">
          Records a refund entry, updates the transaction status to refunded, optionally revokes course access, and writes an audit trail.
        </p>

        <form onSubmit={handleProcessRefund} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Verified Payment</label>
            <select
              required
              value={refundPaymentId}
              onChange={(e) => setRefundPaymentId(e.target.value)}
              className="w-full px-3.5 py-2 text-[15px] border border-black/15 rounded-lg bg-white"
            >
              <option value="">-- Select payment --</option>
              {refundablePayments.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.transactionRef} · {p.amountRwf.toLocaleString()} RWF · {p.phoneMasked}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Refund Reason</label>
            <textarea
              rows={3}
              required
              minLength={3}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="e.g. Duplicate Mobile Money payment"
              className="w-full px-3.5 py-2 text-[15px] border border-black/15 rounded-lg"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-[#0D0D0F]">
            <input
              type="checkbox"
              checked={revokeOnRefund}
              onChange={(e) => setRevokeOnRefund(e.target.checked)}
            />
            <span>Automatically revoke learner course enrollment on refund</span>
          </label>

          {refundMsg && <p className="text-sm text-[#0D7A5F] font-medium">{refundMsg}</p>}

          <button
            type="submit"
            disabled={refundBusy}
            className="w-full px-4 py-2.5 text-[15px] font-medium text-white bg-[#0D0D0F] rounded-lg"
          >
            {refundBusy ? 'Recording...' : 'Record Refund'}
          </button>
        </form>
      </div>

      <div className="lg:col-span-7 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
        <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
          Refund Ledger ({refunds.length})
        </h2>
        {refunds.length === 0 ? (
          <p className="text-sm text-[#5D5D66]">No refunds have been processed.</p>
        ) : (
          <div className="divide-y divide-black/[0.06]">
            {refunds.map((ref) => (
              <div key={ref.id} className="py-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-[#0D0D0F]">{ref.id}</span>
                  <span className="font-mono font-semibold tabular-nums">
                    {ref.amountRwf.toLocaleString()} RWF
                  </span>
                </div>
                <p className="text-[#5D5D66]">
                  Payment: {ref.paymentId} · Processed by: {ref.processedBy}
                </p>
                <p className="text-[#0D0D0F]">Reason: {ref.reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
