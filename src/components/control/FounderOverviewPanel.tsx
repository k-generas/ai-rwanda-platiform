import React from 'react';
import { ArrowRight } from 'lucide-react';
import { WORKSHOP_EVENTS } from '../../data/curriculum';
import type { ControlCenterData, ControlSectionId } from './ControlCenterTypes';

interface FounderOverviewPanelProps {
  data: ControlCenterData;
  onNavigateSection: (section: ControlSectionId) => void;
}

export function FounderOverviewPanel({
  data,
  onNavigateSection
}: FounderOverviewPanelProps) {
  const {
    users,
    courses,
    enrollments,
    payments,
    refunds,
    submissions,
    certificates,
    supportTickets,
    auditLogs,
    integrations
  } = data;

  const learnerUsers = users.filter((u) => u.role === 'learner' || !u.role);
  const totalLearners = learnerUsers.length;
  const activeLearnerIds = new Set(
    enrollments
      .filter((e) => e.status === 'active' && (e.completedDays.length > 0 || e.currentDay > 1))
      .map((e) => e.userId)
  );
  const activeEnrollments = enrollments.filter((e) => e.status === 'active');
  const publishedCourses = courses.filter((c) => c.status === 'active').length;

  const verifiedGross = payments
    .filter((p) => p.status === 'verified')
    .reduce((sum, p) => sum + p.amountRwf, 0);
  const refundedTotal = refunds
    .filter((r) => r.status === 'processed')
    .reduce((sum, r) => sum + r.amountRwf, 0);
  const netVerifiedRevenue = Math.max(0, verifiedGross - refundedTotal);
  const pendingRevenue = payments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amountRwf, 0);

  const completedEnrollments = activeEnrollments.filter(
    (e) =>
      e.completedDays.length >= 28 ||
      certificates.some((c) => c.userId === e.userId && c.courseId === e.courseId && c.status === 'valid')
  ).length;
  const completionRate =
    activeEnrollments.length > 0
      ? Math.round((completedEnrollments / activeEnrollments.length) * 100)
      : 0;

  const pendingReviews = submissions.filter(
    (s) => s.status === 'submitted' || s.status === 'under_review'
  );
  const pendingPayments = payments.filter((p) => p.status === 'pending');
  const failedPayments = payments.filter((p) => p.status === 'failed');
  const openTickets = supportTickets.filter(
    (t) => t.status === 'open' || t.status === 'in_progress'
  );
  const suspendedUsers = users.filter((u) => u.accountStatus === 'suspended');
  const upcomingProgrammesCount =
    WORKSHOP_EVENTS.filter((e) => e.status === 'upcoming').length +
    courses.filter((c) => c.status === 'upcoming' || c.status === 'scheduled').length;

  const kpis: Array<{
    label: string;
    value: string;
    context: string;
    target: ControlSectionId;
  }> = [
    {
      label: 'Total Learners',
      value: String(totalLearners),
      context: `${users.length} total accounts`,
      target: 'learners'
    },
    {
      label: 'Active Learners',
      value: String(activeLearnerIds.size),
      context: `${activeEnrollments.length} active enrollments`,
      target: 'learners'
    },
    {
      label: 'Published Courses',
      value: String(publishedCourses),
      context: `${courses.length} catalog records`,
      target: 'courses'
    },
    {
      label: 'Total Enrollments',
      value: String(enrollments.length),
      context: `${enrollments.filter((e) => e.status === 'pending').length} pending`,
      target: 'access'
    },
    {
      label: 'Verified Revenue',
      value: `${netVerifiedRevenue.toLocaleString()} RWF`,
      context: `${pendingRevenue.toLocaleString()} RWF pending`,
      target: 'payments'
    },
    {
      label: 'Completion Rate',
      value: `${completionRate}%`,
      context: `${completedEnrollments} / ${activeEnrollments.length} active`,
      target: 'certificates'
    },
    {
      label: 'Pending Reviews',
      value: String(pendingReviews.length),
      context: `${submissions.length} total submissions`,
      target: 'reviews'
    },
    {
      label: 'Upcoming Programmes',
      value: String(upcomingProgrammesCount),
      context: 'Scheduled cohorts & events',
      target: 'programmes'
    }
  ];

  const alerts: Array<{
    severity: 'warning' | 'critical' | 'info';
    title: string;
    reason: string;
    actionLabel: string;
    target: ControlSectionId;
  }> = [];

  if (pendingPayments.length > 0) {
    alerts.push({
      severity: 'warning',
      title: `${pendingPayments.length} Mobile Money payment(s) awaiting verification`,
      reason: `${pendingRevenue.toLocaleString()} RWF requested by learners awaiting manual staff confirmation.`,
      actionLabel: 'Verify Payments',
      target: 'payments'
    });
  }

  if (failedPayments.length > 0) {
    alerts.push({
      severity: 'critical',
      title: `${failedPayments.length} failed payment record(s)`,
      reason: 'Check failed transaction references and follow up with affected learners.',
      actionLabel: 'Inspect Payments',
      target: 'payments'
    });
  }

  if (pendingReviews.length > 0) {
    alerts.push({
      severity: 'info',
      title: `${pendingReviews.length} practical project(s) awaiting rubric evaluation`,
      reason: 'Learners are waiting on rubric feedback to unlock final completion eligibility.',
      actionLabel: 'Grade Projects',
      target: 'reviews'
    });
  }

  if (openTickets.length > 0) {
    alerts.push({
      severity: 'warning',
      title: `${openTickets.length} open learner support request(s)`,
      reason: 'Respond to learner inquiries in Support Center.',
      actionLabel: 'Open Tickets',
      target: 'support'
    });
  }

  if (!integrations.momoActive || !integrations.airtelActive) {
    alerts.push({
      severity: 'info',
      title: 'Live Mobile Money API credentials not configured',
      reason:
        'MTN MoMo and Airtel Money operate in safe manual-verification mode until provider credentials are supplied.',
      actionLabel: 'View Integrations',
      target: 'settings'
    });
  }

  if (suspendedUsers.length > 0) {
    alerts.push({
      severity: 'info',
      title: `${suspendedUsers.length} suspended user account(s)`,
      reason: 'Accounts currently paused by administrative action.',
      actionLabel: 'Review Users',
      target: 'learners'
    });
  }

  return (
    <div className="space-y-8">
      {/* 8 Real Founder KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <button
            key={kpi.label}
            type="button"
            onClick={() => onNavigateSection(kpi.target)}
            className="text-left bg-[#F9F9FB] hover:bg-[#F3F4F6] border border-black/[0.08] rounded-xl p-5 transition-colors"
          >
            <p className="text-sm text-[#5D5D66] mb-1">{kpi.label}</p>
            <p className="text-2xl font-display font-semibold tabular-nums text-[#0D0D0F]">
              {kpi.value}
            </p>
            <p className="text-sm text-[#5D5D66] font-mono tabular-nums mt-1.5">{kpi.context}</p>
          </button>
        ))}
      </div>

      {/* Operational Alerts + Recent Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">Operational Alerts</h2>
              <p className="text-sm text-[#5D5D66]">
                Conditions derived directly from live Firestore records and integration status.
              </p>
            </div>
            <span className="text-sm font-mono tabular-nums text-[#5D5D66]">
              {alerts.length} active
            </span>
          </div>

          {alerts.length === 0 ? (
            <div className="bg-[#F9F9FB] border border-black/[0.06] rounded-xl p-5 text-sm text-[#5D5D66]">
              All monitored queues are clear. No pending payments, open urgent tickets, or failed records.
            </div>
          ) : (
            <div className="divide-y divide-black/[0.06]">
              {alerts.map((alert) => (
                <div
                  key={alert.title}
                  className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-mono font-semibold uppercase ${
                          alert.severity === 'critical'
                            ? 'text-[#DC2626]'
                            : alert.severity === 'warning'
                              ? 'text-[#D97706]'
                              : 'text-[#0D7A5F]'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-[15px] font-medium text-[#0D0D0F]">{alert.title}</span>
                    </div>
                    <p className="text-sm text-[#5D5D66]">{alert.reason}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateSection(alert.target)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#0D0D0F] border border-black/15 rounded-lg hover:border-black/30 whitespace-nowrap shrink-0"
                  >
                    <span>{alert.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">Recent Founder & Staff Activity</h2>
            <button
              type="button"
              onClick={() => onNavigateSection('audit')}
              className="text-sm font-medium text-[#0D7A5F] hover:underline whitespace-nowrap shrink-0"
            >
              All logs
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-sm text-[#5D5D66]">No administrative actions recorded yet.</p>
          ) : (
            <div className="divide-y divide-black/[0.06]">
              {auditLogs.slice(0, 6).map((log) => (
                <div key={log.id} className="py-2.5 first:pt-0 last:pb-0 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-medium text-[#0D0D0F]">{log.action}</span>
                    <span className="font-mono text-[#5D5D66]">{log.targetCollection}</span>
                  </div>
                  <p className="text-[#5D5D66] mt-0.5 line-clamp-2">{log.summary}</p>
                  <p className="text-sm text-[#5D5D66]/80 mt-0.5">{log.actorEmail}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
