import React, { useEffect, useState } from 'react';
import { doc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import type {
  ProgrammeRecord,
  ProjectSubmission,
  SupportTicket
} from '../../types';
import { COURSES, WORKSHOP_EVENTS } from '../../data/curriculum';
import { evaluateCertificateEligibility } from '../../lib/domain';
import { isProtectedUploadUrl, openProtectedFile } from '../../lib/uploads';
import type { AuditWriteParams, ControlCenterData } from './ControlCenterTypes';

interface EducationAndCommsPanelProps {
  section: 'programmes' | 'reviews' | 'certificates' | 'communication' | 'support';
  user: User;
  data: ControlCenterData;
  onWriteAudit: (params: AuditWriteParams) => Promise<void>;
  onRefreshData: () => Promise<void>;
  onRefreshPublic: () => void;
}

export function EducationAndCommsPanel({
  section,
  user,
  data,
  onWriteAudit,
  onRefreshData,
  onRefreshPublic
}: EducationAndCommsPanelProps) {
  const {
    users,
    courses,
    programmes,
    rubrics,
    enrollments,
    quizAttempts,
    submissions,
    certificates,
    eventRegistrations,
    inquiries,
    announcements,
    emailTemplates,
    supportTickets,
    ticketMessages,
    settings,
    integrations,
    pagination,
    onLoadMore
  } = data;

  const catalog = courses.length > 0 ? courses : COURSES;

  // Programmes CRUD state
  const [editingProgId, setEditingProgId] = useState<string | null>(null);
  const [progType, setProgType] = useState<ProgrammeRecord['type']>('workshop');
  const [progTitleEn, setProgTitleEn] = useState('');
  const [progTitleRw, setProgTitleRw] = useState('');
  const [progDescEn, setProgDescEn] = useState('');
  const [progDescRw, setProgDescRw] = useState('');
  const [progDateLabel, setProgDateLabel] = useState('June 2026');
  const [progTimeLabel, setProgTimeLabel] = useState('18:00 – 19:30 CAT');
  const [progTimezone, setProgTimezone] = useState('Africa/Kigali (CAT)');
  const [progFormat, setProgFormat] = useState<ProgrammeRecord['format']>('hybrid');
  const [progLocEn, setProgLocEn] = useState('Kigali Innovation Hub & Online');
  const [progLocRw, setProgLocRw] = useState('Kigali & Kuri Interineti');
  const [progLangLabel, setProgLangLabel] = useState('English & Kinyarwanda');
  const [progMeetingUrl, setProgMeetingUrl] = useState('');
  const [progCapacity, setProgCapacity] = useState(100);
  const [progPriceRwf, setProgPriceRwf] = useState(0);
  const [progEligibilityEn, setProgEligibilityEn] = useState('');
  const [progSpeaker, setProgSpeaker] = useState('AI Education Rwanda Instructors');
  const [progStatus, setProgStatus] = useState<ProgrammeRecord['status']>('registration_open');
  const [progFeatured, setProgFeatured] = useState(false);
  const [progBusy, setProgBusy] = useState(false);
  const [progMsg, setProgMsg] = useState<string | null>(null);

  // Project review & persisted rubric weights
  const [rubricCourseId, setRubricCourseId] = useState(catalog[0]?.id ?? 'challenge-28');
  const [reviewScores, setReviewScores] = useState<Record<string, number>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [rubricWeights, setRubricWeights] = useState({
    problem: 20,
    approach: 20,
    implementation: 25,
    testing: 20,
    docs: 15
  });
  const [rubricPassThreshold, setRubricPassThreshold] = useState(70);
  const [rubricBusy, setRubricBusy] = useState(false);
  const [rubricMsg, setRubricMsg] = useState<string | null>(null);

  useEffect(() => {
    const found = rubrics.find((r) => r.courseId === rubricCourseId);
    if (found) {
      setRubricWeights({
        problem: found.problemWeight,
        approach: found.approachWeight,
        implementation: found.implementationWeight,
        testing: found.testingWeight,
        docs: found.docsWeight
      });
      setRubricPassThreshold(found.passThreshold);
    }
  }, [rubrics, rubricCourseId]);

  // Certificate issuer state
  const [certLearnerName, setCertLearnerName] = useState('');
  const [certUserId, setCertUserId] = useState('');
  const [certCourseId, setCertCourseId] = useState(catalog[0]?.id ?? 'challenge-28');
  const [certScore, setCertScore] = useState(85);
  const [certSaving, setCertSaving] = useState(false);
  const [certMsg, setCertMsg] = useState<string | null>(null);

  // Announcement, direct notification & email template state
  const [annTitleEn, setAnnTitleEn] = useState('');
  const [annTitleRw, setAnnTitleRw] = useState('');
  const [annBodyEn, setAnnBodyEn] = useState('');
  const [annBodyRw, setAnnBodyRw] = useState('');
  const [annAudience, setAnnAudience] = useState<'all' | 'learners' | 'staff'>('all');
  const [annBusy, setAnnBusy] = useState(false);
  const [annMsg, setAnnMsg] = useState<string | null>(null);

  const [notifUserId, setNotifUserId] = useState('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifCat, setNotifCat] = useState<
    'enrollment' | 'payment' | 'assessment' | 'certificate' | 'system'
  >('system');
  const [notifBusy, setNotifBusy] = useState(false);

  const [tplKey, setTplKey] = useState('enrollment_confirmed');
  const [tplName, setTplName] = useState('Enrollment Confirmed');
  const [tplSubjectEn, setTplSubjectEn] = useState('Welcome to AI Education Rwanda');
  const [tplSubjectRw, setTplSubjectRw] = useState('Murakaza neza muri AI Education Rwanda');
  const [tplBodyEn, setTplBodyEn] = useState(
    'Hello {{name}}, your course access for {{course}} is now active. Visit your Learner Portal to begin Day 1.'
  );
  const [tplBodyRw, setTplBodyRw] = useState(
    'Muraho {{name}}, amasomo yawe ya {{course}} arafunguye. Injira mu rubuga utangire Umunsi wa 1.'
  );
  const [tplBusy, setTplBusy] = useState(false);
  const [tplMsg, setTplMsg] = useState<string | null>(null);

  // Support ticket resolution & conversation thread state
  const [ticketFilter, setTicketFilter] = useState<
    'all' | 'open' | 'in_progress' | 'resolved' | 'closed'
  >('all');
  const [ticketNotes, setTicketNotes] = useState<Record<string, string>>({});
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({});
  const [replyBusyId, setReplyBusyId] = useState<string | null>(null);

  const handleGradeSubmission = async (
    sub: ProjectSubmission,
    nextStatus: 'approved' | 'needs_revision'
  ) => {
    const score = reviewScores[sub.id] ?? sub.score ?? 85;
    const feedback =
      reviewNotes[sub.id] ??
      sub.reviewerFeedback ??
      (nextStatus === 'approved'
        ? 'Clear problem framing, practical workflow, and proper human oversight.'
        : 'Please add explicit verification steps and resubmit.');
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'projectSubmissions', sub.id), {
        status: nextStatus,
        score,
        reviewerFeedback: feedback,
        assignedReviewerUid: user.uid,
        updatedAt: serverTimestamp()
      });
      const notifId = `ntf_${Date.now()}`;
      batch.set(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: sub.userId,
        title: `Project Reviewed: ${sub.title}`,
        message: `Status: ${nextStatus.replace('_', ' ')} (${score}/100). Feedback: ${feedback}`,
        category: 'assessment',
        isRead: false,
        createdAt: serverTimestamp()
      });
      await batch.commit();

      await onWriteAudit({
        action: 'GRADE_PROJECT',
        targetCollection: 'projectSubmissions',
        targetId: sub.id,
        previousState: sub.status,
        newState: `${nextStatus} (${score}/100)`,
        summary: `Marked ${sub.title} as ${nextStatus} (${score}/100)`
      });
      await onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `projectSubmissions/${sub.id}`);
    }
  };

  const handleSaveRubric = async () => {
    const totalWeight =
      rubricWeights.problem +
      rubricWeights.approach +
      rubricWeights.implementation +
      rubricWeights.testing +
      rubricWeights.docs;
    if (totalWeight !== 100) {
      setRubricMsg('Criteria weights must sum to exactly 100% before saving.');
      return;
    }
    setRubricBusy(true);
    setRubricMsg(null);
    try {
      await setDoc(doc(db, 'rubrics', rubricCourseId), {
        id: rubricCourseId,
        courseId: rubricCourseId,
        problemWeight: rubricWeights.problem,
        approachWeight: rubricWeights.approach,
        implementationWeight: rubricWeights.implementation,
        testingWeight: rubricWeights.testing,
        docsWeight: rubricWeights.docs,
        passThreshold: rubricPassThreshold,
        updatedBy: user.email || user.uid,
        updatedAt: serverTimestamp()
      });
      await onWriteAudit({
        action: 'SAVE_RUBRIC',
        targetCollection: 'rubrics',
        targetId: rubricCourseId,
        newState: `Pass >= ${rubricPassThreshold}%`,
        summary: `Saved project rubric weights for ${rubricCourseId}`
      });
      setRubricMsg(`Saved rubric weights for ${rubricCourseId}.`);
      await onRefreshData();
      onRefreshPublic();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `rubrics/${rubricCourseId}`);
    } finally {
      setRubricBusy(false);
    }
  };

  const issueCertificateForLearner = async (params: {
    targetUid: string;
    learnerName: string;
    courseId: string;
    score: number;
  }) => {
    setCertSaving(true);
    setCertMsg(null);
    const certId = `RW-AI-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const courseObj = catalog.find((c) => c.id === params.courseId);
    const courseTitle = `Certificate of Completion — ${courseObj?.title.en || params.courseId}`;
    const issuerLabel =
      settings?.certificateOrgName || settings?.certificateSignatoryName || user.email || 'Admin';

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'certificates', certId), {
        id: certId,
        userId: params.targetUid,
        learnerName: params.learnerName.trim(),
        courseId: params.courseId,
        courseTitle,
        finalScore: Number(params.score),
        status: 'valid',
        issuedAt: serverTimestamp(),
        issuedBy: issuerLabel
      });

      const notifId = `ntf_${Date.now()}`;
      batch.set(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: params.targetUid,
        title: 'Certificate of Completion Issued',
        message: `Congratulations! Certificate ${certId} (Score ${params.score}%) is ready in your Learner Portal.`,
        category: 'certificate',
        isRead: false,
        createdAt: serverTimestamp()
      });

      await batch.commit();

      await onWriteAudit({
        action: 'ISSUE_CERTIFICATE',
        targetCollection: 'certificates',
        targetId: certId,
        newState: 'valid',
        summary: `Issued certificate ${certId} to ${params.learnerName}`
      });
      setCertMsg(`Issued certificate ${certId} to ${params.learnerName}.`);
      setCertLearnerName('');
      setCertUserId('');
      await onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `certificates/${certId}`);
    } finally {
      setCertSaving(false);
    }
  };

  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    await issueCertificateForLearner({
      targetUid: certUserId.trim() || user.uid,
      learnerName: certLearnerName,
      courseId: certCourseId,
      score: certScore
    });
  };

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnnBusy(true);
    setAnnMsg(null);
    const id = `ann_${Date.now()}`;
    try {
      await setDoc(doc(db, 'announcements', id), {
        id,
        titleEn: annTitleEn.trim(),
        titleRw: annTitleRw.trim() || annTitleEn.trim(),
        bodyEn: annBodyEn.trim(),
        bodyRw: annBodyRw.trim() || annBodyEn.trim(),
        audience: annAudience,
        isPublished: true,
        createdBy: user.email || user.uid,
        createdAt: serverTimestamp()
      });
      await onWriteAudit({
        action: 'PUBLISH_ANNOUNCEMENT',
        targetCollection: 'announcements',
        targetId: id,
        newState: `published (${annAudience})`,
        summary: `Published announcement: ${annTitleEn.trim()}`
      });
      setAnnTitleEn('');
      setAnnTitleRw('');
      setAnnBodyEn('');
      setAnnBodyRw('');
      setAnnMsg('Announcement published to platform.');
      await onRefreshData();
      onRefreshPublic();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `announcements/${id}`);
    } finally {
      setAnnBusy(false);
    }
  };

  const handleSendDirectNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifUserId) return;
    setNotifBusy(true);
    const id = `ntf_${Date.now()}`;
    try {
      await setDoc(doc(db, 'notifications', id), {
        id,
        userId: notifUserId,
        title: notifTitle.trim(),
        message: notifBody.trim(),
        category: notifCat,
        isRead: false,
        createdAt: serverTimestamp()
      });
      setNotifTitle('');
      setNotifBody('');
      setAnnMsg('Direct learner notification sent.');
      await onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `notifications/${id}`);
    } finally {
      setNotifBusy(false);
    }
  };

  const handleSaveEmailTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setTplBusy(true);
    setTplMsg(null);
    const id = tplKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    try {
      await setDoc(doc(db, 'emailTemplates', id), {
        id,
        templateKey: id,
        name: tplName.trim(),
        subjectEn: tplSubjectEn.trim(),
        subjectRw: tplSubjectRw.trim() || tplSubjectEn.trim(),
        bodyEn: tplBodyEn.trim(),
        bodyRw: tplBodyRw.trim() || tplBodyEn.trim(),
        updatedBy: user.email || user.uid,
        updatedAt: serverTimestamp()
      });
      await onWriteAudit({
        action: 'SAVE_EMAIL_TEMPLATE',
        targetCollection: 'emailTemplates',
        targetId: id,
        summary: `Updated transactional email template ${id}`
      });
      setTplMsg(`Saved email template "${id}".`);
      await onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `emailTemplates/${id}`);
    } finally {
      setTplBusy(false);
    }
  };

  const handleUpdateTicket = async (
    ticket: SupportTicket,
    nextStatus: SupportTicket['status'],
    nextPriority?: SupportTicket['priority']
  ) => {
    const note = ticketNotes[ticket.id] ?? ticket.resolutionNote ?? '';
    try {
      await updateDoc(doc(db, 'supportTickets', ticket.id), {
        status: nextStatus,
        ...(nextPriority ? { priority: nextPriority } : {}),
        assignedToUid: user.uid,
        ...(note ? { resolutionNote: note } : {}),
        updatedAt: serverTimestamp()
      });
      await onWriteAudit({
        action: 'UPDATE_SUPPORT_TICKET',
        targetCollection: 'supportTickets',
        targetId: ticket.id,
        previousState: ticket.status,
        newState: nextStatus,
        summary: `Updated support ticket "${ticket.subject}" to ${nextStatus}`
      });
      await onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `supportTickets/${ticket.id}`);
    }
  };

  const handleSendTicketReply = async (ticket: SupportTicket) => {
    const text = (ticketReplies[ticket.id] || '').trim();
    if (!text) return;
    setReplyBusyId(ticket.id);
    const msgId = `msg_${Date.now()}`;
    const notifId = `ntf_${Date.now()}`;
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'ticketMessages', msgId), {
        id: msgId,
        ticketId: ticket.id,
        ticketOwnerUid: ticket.userId,
        senderUid: user.uid,
        senderName: user.displayName || user.email || 'Support Team',
        senderRole: 'staff',
        message: text,
        createdAt: serverTimestamp()
      });
      if (ticket.status === 'open') {
        batch.update(doc(db, 'supportTickets', ticket.id), {
          status: 'in_progress',
          assignedToUid: user.uid,
          updatedAt: serverTimestamp()
        });
      }
      batch.set(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: ticket.userId,
        title: `Reply on Support Ticket: ${ticket.subject}`,
        message: text.slice(0, 240),
        category: 'system',
        isRead: false,
        createdAt: serverTimestamp()
      });
      await batch.commit();
      setTicketReplies((prev) => ({ ...prev, [ticket.id]: '' }));
      await onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `ticketMessages/${msgId}`);
    } finally {
      setReplyBusyId(null);
    }
  };

  // =========================================================================
  // SECTION: UPCOMING PROGRAMMES & EVENTS (FULL CRUD)
  // =========================================================================
  if (section === 'programmes') {
    const handleImportDefaultWorkshops = async () => {
      setProgBusy(true);
      setProgMsg(null);
      try {
        const batch = writeBatch(db);
        WORKSHOP_EVENTS.forEach((ev) => {
          batch.set(doc(db, 'programmes', ev.id), {
            id: ev.id,
            slug: ev.id,
            type: 'workshop',
            titleEn: ev.title.en,
            titleRw: ev.title.rw,
            descriptionEn: ev.description.en,
            descriptionRw: ev.description.rw,
            dateLabel: ev.dateLabel,
            timeLabel: ev.timeLabel,
            timezone: 'Africa/Kigali (CAT)',
            format: ev.format,
            locationEn: ev.location.en,
            locationRw: ev.location.rw,
            languageLabel: ev.languageLabel,
            capacity: 150,
            priceRwf: 0,
            status: ev.status === 'past' ? 'completed' : 'registration_open',
            featured: Boolean(ev.featured),
            speaker: ev.speaker,
            updatedAt: serverTimestamp()
          });
        });
        await batch.commit();
        await onWriteAudit({
          action: 'IMPORT_PROGRAMMES',
          targetCollection: 'programmes',
          targetId: 'defaults',
          summary: `Imported ${WORKSHOP_EVENTS.length} default workshops to Firestore programmes`
        });
        setProgMsg(`Imported ${WORKSHOP_EVENTS.length} starter programmes & workshops.`);
        await onRefreshData();
        onRefreshPublic();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'programmes/defaults');
      } finally {
        setProgBusy(false);
      }
    };

    const handleSaveProgramme = async (e: React.FormEvent) => {
      e.preventDefault();
      setProgBusy(true);
      setProgMsg(null);
      const id = editingProgId || `prog_${Date.now()}`;
      const slug = progTitleEn
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || id;

      try {
        await setDoc(doc(db, 'programmes', id), {
          id,
          slug: slug.slice(0, 120),
          type: progType,
          titleEn: progTitleEn.trim(),
          titleRw: progTitleRw.trim() || progTitleEn.trim(),
          descriptionEn: progDescEn.trim(),
          descriptionRw: progDescRw.trim() || progDescEn.trim(),
          dateLabel: progDateLabel.trim(),
          timeLabel: progTimeLabel.trim(),
          timezone: progTimezone.trim() || 'Africa/Kigali (CAT)',
          format: progFormat,
          locationEn: progLocEn.trim(),
          locationRw: progLocRw.trim() || progLocEn.trim(),
          languageLabel: progLangLabel.trim(),
          ...(progMeetingUrl.trim() ? { meetingUrl: progMeetingUrl.trim() } : {}),
          capacity: Number(progCapacity) || 0,
          ...(progEligibilityEn.trim()
            ? {
                eligibilityEn: progEligibilityEn.trim(),
                eligibilityRw: progEligibilityEn.trim()
              }
            : {}),
          priceRwf: Number(progPriceRwf) || 0,
          status: progStatus,
          featured: progFeatured,
          speaker: progSpeaker.trim() || 'AI Education Rwanda',
          updatedAt: serverTimestamp()
        });
        await onWriteAudit({
          action: editingProgId ? 'UPDATE_PROGRAMME' : 'CREATE_PROGRAMME',
          targetCollection: 'programmes',
          targetId: id,
          newState: `${progTitleEn.trim()} (${progStatus})`,
          summary: `${editingProgId ? 'Updated' : 'Created'} programme "${progTitleEn.trim()}"`
        });
        setEditingProgId(null);
        setProgTitleEn('');
        setProgTitleRw('');
        setProgDescEn('');
        setProgDescRw('');
        setProgMeetingUrl('');
        setProgEligibilityEn('');
        setProgMsg('Programme / event saved and published.');
        await onRefreshData();
        onRefreshPublic();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `programmes/${id}`);
      } finally {
        setProgBusy(false);
      }
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
              {editingProgId ? 'Edit Programme / Event' : 'Create Programme or Live Event'}
            </h2>
            <button
              type="button"
              disabled={progBusy}
              onClick={handleImportDefaultWorkshops}
              className="px-3 py-1.5 text-sm border border-black/15 rounded-lg"
            >
              Import Default Workshops
            </button>
          </div>

          <form onSubmit={handleSaveProgramme} className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Type</label>
                <select
                  value={progType}
                  onChange={(e) => setProgType(e.target.value as ProgrammeRecord['type'])}
                  className="w-full px-3 py-2 border border-black/15 rounded-lg bg-white"
                >
                  <option value="workshop">Workshop</option>
                  <option value="webinar">Webinar</option>
                  <option value="bootcamp">Bootcamp</option>
                  <option value="cohort">Cohort Intake</option>
                  <option value="upcoming_course">Upcoming Course</option>
                  <option value="special_programme">Special Programme</option>
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Status</label>
                <select
                  value={progStatus}
                  onChange={(e) => setProgStatus(e.target.value as ProgrammeRecord['status'])}
                  className="w-full px-3 py-2 border border-black/15 rounded-lg bg-white"
                >
                  <option value="draft">Draft</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="registration_open">Registration Open</option>
                  <option value="fully_booked">Fully Booked</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={progTitleEn}
                onChange={(e) => setProgTitleEn(e.target.value)}
                placeholder="Title (English)"
                className="px-3 py-2 border border-black/15 rounded-lg"
              />
              <input
                type="text"
                value={progTitleRw}
                onChange={(e) => setProgTitleRw(e.target.value)}
                placeholder="Title (Kinyarwanda)"
                className="px-3 py-2 border border-black/15 rounded-lg"
              />
            </div>

            <textarea
              rows={2}
              required
              value={progDescEn}
              onChange={(e) => setProgDescEn(e.target.value)}
              placeholder="Description (English)..."
              className="w-full px-3 py-2 border border-black/15 rounded-lg"
            />
            <textarea
              rows={2}
              value={progDescRw}
              onChange={(e) => setProgDescRw(e.target.value)}
              placeholder="Description (Kinyarwanda, optional)..."
              className="w-full px-3 py-2 border border-black/15 rounded-lg"
            />

            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={progDateLabel}
                onChange={(e) => setProgDateLabel(e.target.value)}
                placeholder="Date label"
                className="px-3 py-2 border border-black/15 rounded-lg"
              />
              <input
                type="text"
                required
                value={progTimeLabel}
                onChange={(e) => setProgTimeLabel(e.target.value)}
                placeholder="Time"
                className="px-3 py-2 border border-black/15 rounded-lg"
              />
              <input
                type="text"
                required
                value={progTimezone}
                onChange={(e) => setProgTimezone(e.target.value)}
                placeholder="Timezone"
                className="px-3 py-2 border border-black/15 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <select
                value={progFormat}
                onChange={(e) => setProgFormat(e.target.value as ProgrammeRecord['format'])}
                className="px-3 py-2 border border-black/15 rounded-lg bg-white"
              >
                <option value="online">Online</option>
                <option value="kigali_in_person">Kigali In-Person</option>
                <option value="hybrid">Hybrid</option>
              </select>
              <input
                type="number"
                min={0}
                value={progCapacity}
                onChange={(e) => setProgCapacity(Number(e.target.value))}
                placeholder="Capacity"
                className="px-3 py-2 font-mono border border-black/15 rounded-lg"
              />
              <input
                type="number"
                min={0}
                value={progPriceRwf}
                onChange={(e) => setProgPriceRwf(Number(e.target.value))}
                placeholder="Fee RWF (0=free)"
                className="px-3 py-2 font-mono border border-black/15 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={progLocEn}
                onChange={(e) => setProgLocEn(e.target.value)}
                placeholder="Location (EN)"
                className="px-3 py-2 border border-black/15 rounded-lg"
              />
              <input
                type="text"
                required
                value={progSpeaker}
                onChange={(e) => setProgSpeaker(e.target.value)}
                placeholder="Speaker / Facilitator"
                className="px-3 py-2 border border-black/15 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="url"
                value={progMeetingUrl}
                onChange={(e) => setProgMeetingUrl(e.target.value)}
                placeholder="Meeting URL (optional)"
                className="px-3 py-2 border border-black/15 rounded-lg"
              />
              <input
                type="text"
                value={progEligibilityEn}
                onChange={(e) => setProgEligibilityEn(e.target.value)}
                placeholder="Eligibility note (optional)"
                className="px-3 py-2 border border-black/15 rounded-lg"
              />
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={progFeatured}
                onChange={(e) => setProgFeatured(e.target.checked)}
              />
              <span>Feature this programme in Events spotlight</span>
            </label>

            {progMsg && <p className="text-[#0D7A5F] font-medium">{progMsg}</p>}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={progBusy}
                className="px-5 py-2 font-medium text-white bg-[#0D0D0F] rounded-lg"
              >
                {progBusy ? 'Saving...' : editingProgId ? 'Update Programme' : 'Publish Programme'}
              </button>
              {editingProgId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingProgId(null);
                    setProgTitleEn('');
                    setProgDescEn('');
                  }}
                  className="px-3 py-2 border border-black/15 rounded-lg"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
            <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
              Live Programmes & Events ({programmes.length})
            </h2>
            {programmes.length === 0 ? (
              <p className="text-sm text-[#5D5D66]">
                No custom Firestore programmes saved yet (Events page displays built-in starter workshops until imported or created).
              </p>
            ) : (
              <div className="divide-y divide-black/[0.06]">
                {programmes.map((pr) => {
                  const rsvpCount = eventRegistrations.filter(
                    (r) => r.eventId === pr.id && r.status === 'registered'
                  ).length;
                  return (
                    <div key={pr.id} className="py-3 first:pt-0 last:pb-0 text-sm space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#0D0D0F]">{pr.titleEn}</span>
                        <span className="font-mono uppercase text-[#0D7A5F]">{pr.status}</span>
                      </div>
                      <p className="text-[#5D5D66]">
                        {pr.type} · {pr.dateLabel} · {pr.timeLabel} ({pr.timezone}) · RSVPs: {rsvpCount}/{pr.capacity || '∞'}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProgId(pr.id);
                            setProgType(pr.type);
                            setProgTitleEn(pr.titleEn);
                            setProgTitleRw(pr.titleRw);
                            setProgDescEn(pr.descriptionEn);
                            setProgDescRw(pr.descriptionRw);
                            setProgDateLabel(pr.dateLabel);
                            setProgTimeLabel(pr.timeLabel);
                            setProgTimezone(pr.timezone);
                            setProgFormat(pr.format);
                            setProgLocEn(pr.locationEn);
                            setProgLocRw(pr.locationRw);
                            setProgLangLabel(pr.languageLabel);
                            setProgMeetingUrl(pr.meetingUrl || '');
                            setProgCapacity(pr.capacity);
                            setProgPriceRwf(pr.priceRwf);
                            setProgEligibilityEn(pr.eligibilityEn || '');
                            setProgSpeaker(pr.speaker);
                            setProgStatus(pr.status);
                            setProgFeatured(pr.featured);
                          }}
                          className="px-2.5 py-1 border border-black/15 rounded-lg"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const dupId = `prog_${Date.now()}`;
                            await setDoc(doc(db, 'programmes', dupId), {
                              ...pr,
                              id: dupId,
                              titleEn: `${pr.titleEn} (Copy)`,
                              titleRw: `${pr.titleRw} (Copy)`,
                              status: 'draft',
                              updatedAt: serverTimestamp()
                            });
                            await onRefreshData();
                          }}
                          className="px-2.5 py-1 border border-black/15 rounded-lg"
                        >
                          Duplicate
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
            <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
              Event Registrations ({eventRegistrations.length})
            </h2>
            {eventRegistrations.length === 0 ? (
              <p className="text-sm text-[#5D5D66]">No workshop RSVPs recorded yet.</p>
            ) : (
              <div className="divide-y divide-black/[0.06]">
                {eventRegistrations.map((reg) => (
                  <div key={reg.id} className="py-3 text-sm flex justify-between gap-2">
                    <div>
                      <p className="font-medium text-[#0D0D0F]">
                        {reg.attendeeName} ({reg.attendeeEmail})
                      </p>
                      <p className="text-[#5D5D66]">{reg.eventTitle}</p>
                    </div>
                    <span className="font-mono text-[#0D7A5F]">
                      {reg.attendanceMode} · {reg.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SECTION: PROJECT REVIEWS & PERSISTED RUBRIC
  // =========================================================================
  if (section === 'reviews') {
    const totalWeight =
      rubricWeights.problem +
      rubricWeights.approach +
      rubricWeights.implementation +
      rubricWeights.testing +
      rubricWeights.docs;

    return (
      <div className="space-y-6">
        <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
                Evaluation Rubric Criteria Weights
              </h2>
              <select
                value={rubricCourseId}
                onChange={(e) => setRubricCourseId(e.target.value)}
                className="px-2.5 py-1 text-sm border border-black/15 rounded-lg bg-white"
              >
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} · {c.title.en}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-mono tabular-nums ${
                  totalWeight === 100 ? 'text-[#0D7A5F]' : 'text-[#DC2626]'
                }`}
              >
                Total: {totalWeight}%
              </span>
              <button
                type="button"
                disabled={rubricBusy}
                onClick={handleSaveRubric}
                className="px-3.5 py-1.5 text-sm font-medium text-white bg-[#0D0D0F] rounded-lg"
              >
                {rubricBusy ? 'Saving...' : 'Save Rubric to Firestore'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-sm">
            {(
              [
                ['problem', 'Problem Framing'],
                ['approach', 'AI Approach'],
                ['implementation', 'Implementation'],
                ['testing', 'Testing & Eval'],
                ['docs', 'Documentation']
              ] as const
            ).map(([k, label]) => (
              <div key={k} className="bg-white border border-black/[0.08] rounded-xl p-3">
                <label className="block text-[#5D5D66] mb-1">{label}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={rubricWeights[k]}
                  onChange={(e) =>
                    setRubricWeights((prev) => ({ ...prev, [k]: Number(e.target.value) }))
                  }
                  className="w-full px-2 py-1 text-sm font-mono border border-black/15 rounded"
                />
              </div>
            ))}
            <div className="bg-white border border-black/[0.08] rounded-xl p-3">
              <label className="block text-[#5D5D66] mb-1">Pass Score %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={rubricPassThreshold}
                onChange={(e) => setRubricPassThreshold(Number(e.target.value))}
                className="w-full px-2 py-1 text-sm font-mono border border-black/15 rounded"
              />
            </div>
          </div>
          {rubricMsg && <p className="text-sm text-[#0D7A5F] font-medium">{rubricMsg}</p>}
        </div>

        {submissions.length === 0 ? (
          <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6 text-[15px] text-[#5D5D66]">
            No learner project submissions yet.
          </div>
        ) : (
          submissions.map((sub) => (
            <div
              key={sub.id}
              className="bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-[18px] sm:text-[20px] font-bold tracking-[-0.015em] leading-[1.3] font-display text-[#0D0D0F]">{sub.title}</h3>
                  <p className="text-sm text-[#5D5D66]">
                    {sub.userName} ({sub.userEmail}) · {sub.courseId} · {sub.toolsUsed.join(', ')}
                  </p>
                </div>
                <span className="text-sm font-mono uppercase text-[#0D7A5F]">{sub.status}</span>
              </div>
              <p className="text-[15px] text-[#5D5D66]">{sub.problemStatement}</p>
              <p className="text-sm text-[#0D0D0F] bg-[#F9F9FB] p-3 rounded-lg">
                {sub.documentationSummary}
              </p>
              {sub.artifactUrl && (
                isProtectedUploadUrl(sub.artifactUrl) ? (
                  <button
                    type="button"
                    onClick={() => openProtectedFile(sub.artifactUrl!, user)}
                    className="inline-flex items-center gap-1.5 text-sm font-mono text-[#0D7A5F] underline hover:text-[#0B664F]"
                  >
                    Download Attached Submission File ({sub.artifactUrl})
                  </button>
                ) : (
                  <a
                    href={sub.artifactUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-mono text-[#0D7A5F] underline"
                  >
                    {sub.artifactUrl}
                  </a>
                )
              )}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={reviewScores[sub.id] ?? sub.score ?? 85}
                  onChange={(e) =>
                    setReviewScores((prev) => ({ ...prev, [sub.id]: Number(e.target.value) }))
                  }
                  className="sm:col-span-2 px-3 py-2 text-[15px] font-mono border border-black/15 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Instructor rubric feedback..."
                  value={reviewNotes[sub.id] ?? sub.reviewerFeedback ?? ''}
                  onChange={(e) =>
                    setReviewNotes((prev) => ({ ...prev, [sub.id]: e.target.value }))
                  }
                  className="sm:col-span-6 px-3 py-2 text-[15px] border border-black/15 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => handleGradeSubmission(sub, 'approved')}
                  className="sm:col-span-2 px-3 py-2 text-sm font-medium text-white bg-[#0D7A5F] rounded-lg"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => handleGradeSubmission(sub, 'needs_revision')}
                  className="sm:col-span-2 px-3 py-2 text-sm font-medium text-[#0D0D0F] border border-black/15 rounded-lg"
                >
                  Needs Revision
                </button>
              </div>
            </div>
          ))
        )}

        {pagination?.submissions?.hasMore && onLoadMore && (
          <div className="pt-2 flex items-center justify-between text-sm">
            <span className="text-[#5D5D66]">Showing {submissions.length} submissions</span>
            <button
              type="button"
              disabled={pagination.submissions.loadingMore}
              onClick={() => onLoadMore('submissions')}
              className="px-3 py-1.5 border border-black/15 rounded-lg bg-white hover:border-black/35 disabled:opacity-50"
            >
              {pagination.submissions.loadingMore ? 'Loading...' : 'Load More Submissions'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // SECTION: CERTIFICATES + ELIGIBILITY QUEUE
  // =========================================================================
  if (section === 'certificates') {
    const minQuizAvg = settings?.certificateMinQuizAvg ?? 70;
    const minProjScore = settings?.certificateMinProjectScore ?? 70;

    const eligibilityList = enrollments
      .filter((e) => e.status === 'active')
      .map((enr) => {
        const course = catalog.find((c) => c.id === enr.courseId);
        const evalRes = evaluateCertificateEligibility({
          enrollment: enr,
          course,
          quizAttempts,
          submissions,
          existingCerts: certificates,
          minQuizAvg,
          minProjectScore: minProjScore
        });
        return { enr, course, evalRes };
      })
      .filter((item) => !item.evalRes.alreadyIssued)
      .sort((a, b) => Number(b.evalRes.eligible) - Number(a.evalRes.eligible));

    return (
      <div className="space-y-8">
        {/* Live Eligibility Queue */}
        <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
                Live Certificate Eligibility Queue
              </h2>
              <p className="text-sm text-[#5D5D66]">
                Rules: 100% lessons completed · Quiz Avg ≥ {minQuizAvg}% · Approved Project ≥ {minProjScore}% (editable in Settings)
              </p>
            </div>
          </div>

          {eligibilityList.length === 0 ? (
            <p className="text-sm text-[#5D5D66]">
              All active learners either already hold certificates or none are enrolled yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {eligibilityList.slice(0, 8).map(({ enr, course, evalRes }) => (
                <div
                  key={enr.id}
                  className="bg-white border border-black/[0.08] rounded-xl p-4 flex items-center justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[#0D0D0F] truncate">{enr.userName}</p>
                    <p className="text-[#5D5D66] truncate">
                      {course?.code || enr.courseId} · Lessons {evalRes.completionPct}% · Quiz{' '}
                      {evalRes.quizAvg}% · Project {evalRes.projectScore}%
                    </p>
                    {!evalRes.eligible && (
                      <p className="text-[15px] font-mono text-[#D97706] mt-0.5">
                        Pending: {evalRes.reasons.join(' · ')}
                      </p>
                    )}
                  </div>
                  {evalRes.eligible ? (
                    <button
                      type="button"
                      disabled={certSaving}
                      onClick={() =>
                        issueCertificateForLearner({
                          targetUid: enr.userId,
                          learnerName: enr.userName,
                          courseId: enr.courseId,
                          score: evalRes.weightedFinalScore
                        })
                      }
                      className="px-3 py-1.5 text-sm font-medium text-white bg-[#0D7A5F] rounded-lg shrink-0"
                    >
                      Issue ({evalRes.weightedFinalScore}%)
                    </button>
                  ) : (
                    <span className="font-mono text-[#5D5D66] shrink-0">In Progress</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 bg-white border border-black/[0.08] rounded-2xl p-6">
            <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F] mb-4">
              Issue Verified Certificate (Manual)
            </h2>
            <form onSubmit={handleIssueCertificate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Learner Full Name</label>
                <input
                  type="text"
                  required
                  value={certLearnerName}
                  onChange={(e) => setCertLearnerName(e.target.value)}
                  placeholder="e.g. Patrick Nshimiyimana"
                  className="w-full px-3.5 py-2 text-[15px] border border-black/15 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Learner Account</label>
                <select
                  value={certUserId}
                  onChange={(e) => {
                    const uid = e.target.value;
                    setCertUserId(uid);
                    const found = users.find((u) => u.uid === uid);
                    if (found && !certLearnerName) setCertLearnerName(found.displayName);
                  }}
                  className="w-full px-3.5 py-2 text-[15px] border border-black/15 rounded-lg bg-white"
                >
                  <option value="">-- Current staff UID fallback --</option>
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
                  value={certCourseId}
                  onChange={(e) => setCertCourseId(e.target.value)}
                  className="w-full px-3.5 py-2 text-[15px] border border-black/15 rounded-lg bg-white"
                >
                  {catalog.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.title.en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Final Weighted Score (%)</label>
                <input
                  type="number"
                  min={70}
                  max={100}
                  required
                  value={certScore}
                  onChange={(e) => setCertScore(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-[15px] font-mono border border-black/15 rounded-lg"
                />
              </div>
              {certMsg && <p className="text-sm text-[#0D7A5F] font-mono">{certMsg}</p>}
              <button
                type="submit"
                disabled={certSaving}
                className="w-full px-4 py-2.5 text-[15px] font-medium text-white bg-[#0D0D0F] rounded-lg"
              >
                {certSaving ? 'Issuing...' : 'Issue Certificate'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-3">
            <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">Issued Registry ({certificates.length})</h2>
            {certificates.length === 0 ? (
              <p className="text-sm text-[#5D5D66]">No certificates issued in Firestore yet.</p>
            ) : (
              certificates.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 py-3 border-b border-black/[0.06] last:border-none text-sm"
                >
                  <div>
                    <p className="font-semibold text-[#0D0D0F]">{c.learnerName}</p>
                    <p className="font-mono text-[#5D5D66]">
                      {c.id} · {c.courseId} · Score {c.finalScore}% · {c.status}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const next = c.status === 'valid' ? 'revoked' : 'valid';
                      await updateDoc(doc(db, 'certificates', c.id), { status: next });
                      await onWriteAudit({
                        action: 'CERTIFICATE_STATUS',
                        targetCollection: 'certificates',
                        targetId: c.id,
                        previousState: c.status,
                        newState: next,
                        summary: `Set certificate ${c.id} to ${next}`
                      });
                      await onRefreshData();
                    }}
                    className="px-3 py-1 border border-black/15 rounded-lg"
                  >
                    {c.status === 'valid' ? 'Revoke' : 'Restore'}
                  </button>
                </div>
              ))
            )}
            {pagination?.certificates?.hasMore && onLoadMore && (
              <div className="pt-3 border-t border-black/[0.06] flex items-center justify-between text-sm">
                <span className="text-[#5D5D66]">Showing {certificates.length} certificates</span>
                <button
                  type="button"
                  disabled={pagination.certificates.loadingMore}
                  onClick={() => onLoadMore('certificates')}
                  className="px-3 py-1.5 border border-black/15 rounded-lg hover:border-black/35 disabled:opacity-50"
                >
                  {pagination.certificates.loadingMore ? 'Loading...' : 'Load More Certificates'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SECTION: COMMUNICATION (ANNOUNCEMENTS, NOTIFICATIONS & EMAIL TEMPLATES)
  // =========================================================================
  if (section === 'communication') {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
            <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
              Publish Platform Announcement (EN / RW)
            </h2>
            <form onSubmit={handlePublishAnnouncement} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={annTitleEn}
                  onChange={(e) => setAnnTitleEn(e.target.value)}
                  placeholder="Title (English)"
                  className="px-3 py-2 text-sm border border-black/15 rounded-lg"
                />
                <input
                  type="text"
                  value={annTitleRw}
                  onChange={(e) => setAnnTitleRw(e.target.value)}
                  placeholder="Title (Kinyarwanda)"
                  className="px-3 py-2 text-sm border border-black/15 rounded-lg"
                />
              </div>
              <textarea
                rows={2}
                required
                value={annBodyEn}
                onChange={(e) => setAnnBodyEn(e.target.value)}
                placeholder="Announcement body (English)..."
                className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg"
              />
              <textarea
                rows={2}
                value={annBodyRw}
                onChange={(e) => setAnnBodyRw(e.target.value)}
                placeholder="Announcement body (Kinyarwanda)..."
                className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg"
              />
              <div className="flex items-center justify-between gap-3">
                <select
                  value={annAudience}
                  onChange={(e) => setAnnAudience(e.target.value as 'all' | 'learners' | 'staff')}
                  className="px-3 py-2 text-sm border border-black/15 rounded-lg bg-white"
                >
                  <option value="all">Audience: Everyone</option>
                  <option value="learners">Audience: Learners Only</option>
                  <option value="staff">Audience: Staff Only</option>
                </select>
                <button
                  type="submit"
                  disabled={annBusy}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0D0D0F] rounded-lg"
                >
                  {annBusy ? 'Publishing...' : 'Publish Announcement'}
                </button>
              </div>
            </form>

            {annMsg && <p className="text-sm text-[#0D7A5F] font-medium">{annMsg}</p>}

            <div className="pt-4 border-t border-black/[0.08] space-y-2">
              <h3 className="text-[18px] sm:text-[20px] font-bold tracking-[-0.015em] leading-[1.3] font-display text-[#0D0D0F]">
                Published Announcements ({announcements.length})
              </h3>
              {announcements.map((a) => (
                <div key={a.id} className="bg-[#F9F9FB] rounded-xl p-3 text-sm">
                  <p className="font-semibold text-[#0D0D0F]">
                    {a.titleEn} ({a.audience})
                  </p>
                  <p className="text-[#5D5D66] mt-0.5">{a.bodyEn}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
            <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
              Send Direct In-Platform Notification
            </h2>
            <form onSubmit={handleSendDirectNotification} className="space-y-3">
              <select
                required
                value={notifUserId}
                onChange={(e) => setNotifUserId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-white"
              >
                <option value="">-- Select recipient --</option>
                {users.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName} ({u.email})
                  </option>
                ))}
              </select>
              <select
                value={notifCat}
                onChange={(e) =>
                  setNotifCat(
                    e.target.value as
                      | 'enrollment'
                      | 'payment'
                      | 'assessment'
                      | 'certificate'
                      | 'system'
                  )
                }
                className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-white"
              >
                <option value="system">System Alert</option>
                <option value="enrollment">Enrollment Confirmation</option>
                <option value="payment">Payment Update</option>
                <option value="assessment">Assessment Feedback</option>
                <option value="certificate">Certificate Notice</option>
              </select>
              <input
                type="text"
                required
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder="Notification title"
                className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg"
              />
              <textarea
                rows={3}
                required
                value={notifBody}
                onChange={(e) => setNotifBody(e.target.value)}
                placeholder="Notification message..."
                className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg"
              />
              <button
                type="submit"
                disabled={notifBusy}
                className="px-4 py-2 text-sm font-medium text-white bg-[#0D0D0F] rounded-lg"
              >
                {notifBusy ? 'Sending...' : 'Send Notification'}
              </button>
            </form>
          </div>
        </div>

        {/* Editable Email Templates */}
        <div className="bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
                Transactional Email Templates (EN / RW)
              </h2>
              <p className="text-sm text-[#5D5D66]">
                SMTP / Resend Gateway Status:{' '}
                <strong className={integrations.emailActive ? 'text-[#0D7A5F]' : 'text-[#D97706]'}>
                  {integrations.emailActive ? 'Active' : 'Inactive (templates stored for launch readiness)'}
                </strong>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form onSubmit={handleSaveEmailTemplate} className="lg:col-span-7 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={tplKey}
                  onChange={(e) => {
                    const k = e.target.value;
                    setTplKey(k);
                    const found = emailTemplates.find((t) => t.templateKey === k);
                    if (found) {
                      setTplName(found.name);
                      setTplSubjectEn(found.subjectEn);
                      setTplSubjectRw(found.subjectRw);
                      setTplBodyEn(found.bodyEn);
                      setTplBodyRw(found.bodyRw);
                    }
                  }}
                  className="px-3 py-2 border border-black/15 rounded-lg bg-white"
                >
                  <option value="enrollment_confirmed">enrollment_confirmed</option>
                  <option value="payment_pending">payment_pending</option>
                  <option value="payment_verified">payment_verified</option>
                  <option value="certificate_issued">certificate_issued</option>
                  <option value="support_reply">support_reply</option>
                </select>
                <input
                  type="text"
                  required
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  placeholder="Template label"
                  className="px-3 py-2 border border-black/15 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={tplSubjectEn}
                  onChange={(e) => setTplSubjectEn(e.target.value)}
                  placeholder="Subject (English)"
                  className="px-3 py-2 border border-black/15 rounded-lg"
                />
                <input
                  type="text"
                  value={tplSubjectRw}
                  onChange={(e) => setTplSubjectRw(e.target.value)}
                  placeholder="Subject (Kinyarwanda)"
                  className="px-3 py-2 border border-black/15 rounded-lg"
                />
              </div>
              <textarea
                rows={3}
                required
                value={tplBodyEn}
                onChange={(e) => setTplBodyEn(e.target.value)}
                placeholder="Body (English)..."
                className="w-full px-3 py-2 border border-black/15 rounded-lg"
              />
              <textarea
                rows={3}
                value={tplBodyRw}
                onChange={(e) => setTplBodyRw(e.target.value)}
                placeholder="Body (Kinyarwanda)..."
                className="w-full px-3 py-2 border border-black/15 rounded-lg"
              />
              {tplMsg && <p className="text-[#0D7A5F] font-medium">{tplMsg}</p>}
              <button
                type="submit"
                disabled={tplBusy}
                className="px-4 py-2 font-medium text-white bg-[#0D0D0F] rounded-lg"
              >
                {tplBusy ? 'Saving...' : 'Save Email Template'}
              </button>
            </form>

            <div className="lg:col-span-5 space-y-2 text-sm">
              <h3 className="text-[18px] sm:text-[20px] font-bold tracking-[-0.015em] leading-[1.3] font-display text-[#0D0D0F]">
                Saved Templates ({emailTemplates.length})
              </h3>
              {emailTemplates.length === 0 ? (
                <p className="text-[#5D5D66]">No custom templates saved yet.</p>
              ) : (
                emailTemplates.map((t) => (
                  <div key={t.id} className="bg-[#F9F9FB] border border-black/[0.06] rounded-xl p-3">
                    <p className="font-mono font-semibold text-[#0D7A5F]">{t.templateKey}</p>
                    <p className="font-medium text-[#0D0D0F]">{t.subjectEn}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SECTION: SUPPORT TICKETS (WITH TWO-WAY THREAD) & INQUIRIES
  // =========================================================================
  const filteredTickets = supportTickets.filter(
    (t) => ticketFilter === 'all' || t.status === ticketFilter
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
            Learner Support Tickets ({filteredTickets.length})
          </h2>
          <div className="flex items-center gap-1 p-1 bg-[#F4F5F7] rounded-lg">
            {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTicketFilter(s)}
                className={`px-2.5 py-1 text-sm rounded-md capitalize ${
                  ticketFilter === s ? 'bg-white text-[#0D0D0F] shadow-xs' : 'text-[#5D5D66]'
                }`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {filteredTickets.length === 0 ? (
          <p className="text-sm text-[#5D5D66]">No support tickets in this view.</p>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((t) => {
              const msgs = ticketMessages.filter((m) => m.ticketId === t.id);
              return (
                <div
                  key={t.id}
                  className="border border-black/[0.08] rounded-xl p-4 space-y-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-[15px] text-[#0D0D0F]">{t.subject}</span>
                      <p className="text-[#5D5D66]">
                        {t.userName} ({t.userEmail}) · {t.category} · Priority: {t.priority}
                      </p>
                    </div>
                    <span className="font-mono uppercase text-[#0D7A5F]">
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[#0D0D0F] leading-relaxed">{t.description}</p>

                  {/* Conversation thread */}
                  {msgs.length > 0 && (
                    <div className="bg-[#F9F9FB] border border-black/[0.06] rounded-lg p-3 space-y-2">
                      {msgs.map((m) => (
                        <div key={m.id} className="text-sm">
                          <span
                            className={`font-mono font-semibold ${
                              m.senderRole === 'staff' ? 'text-[#0D7A5F]' : 'text-[#0D0D0F]'
                            }`}
                          >
                            {m.senderName} ({m.senderRole}):
                          </span>{' '}
                          <span className="text-[#0D0D0F]">{m.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Send message reply */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={ticketReplies[t.id] ?? ''}
                      onChange={(e) =>
                        setTicketReplies((prev) => ({ ...prev, [t.id]: e.target.value }))
                      }
                      placeholder="Write a message reply to learner..."
                      className="flex-1 min-w-[200px] px-3 py-1.5 border border-black/15 rounded-lg"
                    />
                    <button
                      type="button"
                      disabled={replyBusyId === t.id}
                      onClick={() => handleSendTicketReply(t)}
                      className="px-3 py-1.5 bg-[#0D0D0F] text-white rounded-lg"
                    >
                      {replyBusyId === t.id ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>

                  {/* Resolution status bar */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-black/[0.06]">
                    <input
                      type="text"
                      value={ticketNotes[t.id] ?? t.resolutionNote ?? ''}
                      onChange={(e) =>
                        setTicketNotes((prev) => ({ ...prev, [t.id]: e.target.value }))
                      }
                      placeholder="Final resolution summary..."
                      className="flex-1 min-w-[180px] px-3 py-1.5 border border-black/15 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateTicket(t, 'in_progress')}
                      className="px-3 py-1.5 border border-black/15 rounded-lg"
                    >
                      In Progress
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateTicket(t, 'resolved')}
                      className="px-3 py-1.5 bg-[#0D7A5F] text-white rounded-lg"
                    >
                      Resolve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateTicket(t, 'closed')}
                      className="px-3 py-1.5 border border-black/15 rounded-lg"
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pagination?.supportTickets?.hasMore && onLoadMore && (
          <div className="pt-3 border-t border-black/[0.06] flex items-center justify-between text-sm">
            <span className="text-[#5D5D66]">Showing {supportTickets.length} tickets</span>
            <button
              type="button"
              disabled={pagination.supportTickets.loadingMore}
              onClick={() => onLoadMore('supportTickets')}
              className="px-3 py-1.5 border border-black/15 rounded-lg hover:border-black/35 disabled:opacity-50"
            >
              {pagination.supportTickets.loadingMore ? 'Loading...' : 'Load More Tickets'}
            </button>
          </div>
        )}
      </div>

      <div className="lg:col-span-4 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-3">
        <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
          Public Inquiries & Waitlists ({inquiries.length})
        </h2>
        {inquiries.length === 0 ? (
          <p className="text-sm text-[#5D5D66]">No public inquiries submitted yet.</p>
        ) : (
          <div className="divide-y divide-black/[0.06]">
            {inquiries.map((inq) => (
              <div key={inq.id} className="py-3 text-sm">
                <p className="font-semibold text-[#0D0D0F]">
                  {inq.name} · {inq.email}
                </p>
                <p className="text-[#0D7A5F] font-mono">
                  {inq.type} · {inq.topic || inq.courseSlug}
                </p>
                {inq.message && <p className="text-[#5D5D66] mt-1">{inq.message}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
