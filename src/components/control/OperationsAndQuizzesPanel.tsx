import React, { useMemo, useState } from 'react';
import { doc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { Plus, Trash2, Upload } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import type {
  Cohort,
  CouponRecord,
  DynamicQuiz,
  QuizQuestionItem,
  ResourceItem
} from '../../types';
import { COURSES, TEMPLATE_RESOURCES } from '../../data/curriculum';
import { WEEKLY_ASSESSMENTS } from '../../data/lessons28';
import { buildAnalyticsSummary, parseQuizQuestions } from '../../lib/domain';
import { downloadCsv } from '../../lib/csvExport';
import { UPLOAD_RULES, uploadPlatformFile } from '../../lib/uploads';
import type { AuditWriteParams, ControlCenterData } from './ControlCenterTypes';

interface OperationsAndQuizzesPanelProps {
  section: 'cohorts' | 'quizzes' | 'coupons' | 'resources' | 'analytics';
  user: User;
  data: ControlCenterData;
  onWriteAudit: (params: AuditWriteParams) => Promise<void>;
  onRefreshData: () => Promise<void>;
  onRefreshPublic: () => void;
}

function makeEmptyQuestion(idx: number): QuizQuestionItem {
  return {
    id: `q_${Date.now()}_${idx}`,
    type: 'multiple_choice',
    questionEn: '',
    questionRw: '',
    optionsEn: ['Option A', 'Option B', 'Option C', 'Option D'],
    optionsRw: ['Igisubizo A', 'Igisubizo B', 'Igisubizo C', 'Igisubizo D'],
    correctIndex: 0,
    correctText: '',
    marks: 1,
    explanationEn: '',
    explanationRw: ''
  };
}

export function OperationsAndQuizzesPanel({
  section,
  user,
  data,
  onWriteAudit,
  onRefreshData,
  onRefreshPublic
}: OperationsAndQuizzesPanelProps) {
  const {
    courses,
    modules,
    cohorts,
    coupons,
    quizzes,
    resources,
    enrollments,
    payments,
    quizAttempts,
    supportTickets,
    access
  } = data;

  const catalog = courses.length > 0 ? courses : COURSES;

  // COHORTS STATE
  const [editingCohortId, setEditingCohortId] = useState<string | null>(null);
  const [cohortCourseId, setCohortCourseId] = useState(catalog[0]?.id ?? 'challenge-28');
  const [cohortName, setCohortName] = useState('');
  const [cohortCode, setCohortCode] = useState('');
  const [cohortInstructor, setCohortInstructor] = useState('Kagame & Team');
  const [cohortStart, setCohortStart] = useState('2026-06-01');
  const [cohortEnd, setCohortEnd] = useState('2026-06-28');
  const [cohortCapacity, setCohortCapacity] = useState(60);
  const [cohortStatus, setCohortStatus] = useState<Cohort['status']>('enrolling');
  const [cohortBusy, setCohortBusy] = useState(false);
  const [cohortMsg, setCohortMsg] = useState<string | null>(null);
  const [selectedCohortRosterId, setSelectedCohortRosterId] = useState<string | null>(null);
  const [assignEnrollmentId, setAssignEnrollmentId] = useState('');
  const [assignCohortId, setAssignCohortId] = useState('');

  // QUIZZES STATE
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [quizCourseId, setQuizCourseId] = useState(catalog[0]?.id ?? 'challenge-28');
  const [quizModuleId, setQuizModuleId] = useState('');
  const [quizWeekNumber, setQuizWeekNumber] = useState(1);
  const [quizTitleEn, setQuizTitleEn] = useState('');
  const [quizTitleRw, setQuizTitleRw] = useState('');
  const [quizDescEn, setQuizDescEn] = useState('');
  const [quizPassThreshold, setQuizPassThreshold] = useState(70);
  const [quizTimeLimit, setQuizTimeLimit] = useState(15);
  const [quizMaxAttempts, setQuizMaxAttempts] = useState(3);
  const [quizRandomize, setQuizRandomize] = useState(false);
  const [quizPublished, setQuizPublished] = useState(true);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionItem[]>([makeEmptyQuestion(1)]);
  const [quizBusy, setQuizBusy] = useState(false);
  const [quizMsg, setQuizMsg] = useState<string | null>(null);

  // COUPONS STATE
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'percent' | 'fixed_rwf'>('percent');
  const [couponValue, setCouponValue] = useState(50);
  const [couponCourseId, setCouponCourseId] = useState('all');
  const [couponMaxUses, setCouponMaxUses] = useState(100);
  const [couponExpiresAt, setCouponExpiresAt] = useState('');
  const [couponActive, setCouponActive] = useState(true);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);

  // RESOURCES STATE
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [resCourseId, setResCourseId] = useState('challenge-28');
  const [resCategory, setResCategory] = useState<ResourceItem['category']>('prompting');
  const [resTitleEn, setResTitleEn] = useState('');
  const [resTitleRw, setResTitleRw] = useState('');
  const [resDescEn, setResDescEn] = useState('');
  const [resDescRw, setResDescRw] = useState('');
  const [resFilename, setResFilename] = useState('guide.md');
  const [resExternalUrl, setResExternalUrl] = useState('');
  const [resContentEn, setResContentEn] = useState('');
  const [resContentRw, setResContentRw] = useState('');
  const [resPublished, setResPublished] = useState(true);
  const [resBusy, setResBusy] = useState(false);
  const [resMsg, setResMsg] = useState<string | null>(null);

  const analytics = useMemo(
    () =>
      buildAnalyticsSummary({
        enrollments,
        courses: catalog,
        payments,
        quizAttempts,
        supportTickets,
        cohorts,
        quizzes
      }),
    [enrollments, catalog, payments, quizAttempts, supportTickets, cohorts, quizzes]
  );

  // =========================================================================
  // 1. COHORTS & GROUPS
  // =========================================================================
  if (section === 'cohorts') {
    const handleSaveCohort = async (e: React.FormEvent) => {
      e.preventDefault();
      setCohortBusy(true);
      setCohortMsg(null);
      const id =
        editingCohortId ||
        `coh_${cohortCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || Date.now()}`;

      try {
        await setDoc(doc(db, 'cohorts', id), {
          id,
          courseId: cohortCourseId,
          name: cohortName.trim(),
          code: cohortCode.trim().toUpperCase(),
          instructorName: cohortInstructor.trim() || 'Instructor Team',
          startDate: cohortStart,
          endDate: cohortEnd,
          capacity: Number(cohortCapacity) || 0,
          status: cohortStatus,
          updatedAt: serverTimestamp()
        });
        await onWriteAudit({
          action: editingCohortId ? 'UPDATE_COHORT' : 'CREATE_COHORT',
          targetCollection: 'cohorts',
          targetId: id,
          newState: `${cohortName.trim()} (${cohortStatus})`,
          summary: `${editingCohortId ? 'Updated' : 'Created'} cohort ${cohortCode.toUpperCase()} for ${cohortCourseId}`
        });
        setEditingCohortId(null);
        setCohortName('');
        setCohortCode('');
        setCohortMsg('Cohort saved to Firestore.');
        await onRefreshData();
        onRefreshPublic();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `cohorts/${id}`);
      } finally {
        setCohortBusy(false);
      }
    };

    const handleAssignLearnerToCohort = async (e: React.FormEvent) => {
      e.preventDefault();
      const enr = enrollments.find((x) => x.id === assignEnrollmentId);
      const coh = cohorts.find((c) => c.id === assignCohortId);
      if (!enr || !coh) return;
      try {
        await updateDoc(doc(db, 'enrollments', enr.id), {
          cohortId: coh.id,
          cohortName: coh.name,
          updatedAt: serverTimestamp()
        });
        await onWriteAudit({
          action: 'ASSIGN_COHORT',
          targetCollection: 'enrollments',
          targetId: enr.id,
          previousState: enr.cohortName || 'unassigned',
          newState: coh.name,
          summary: `Assigned ${enr.userEmail} to cohort ${coh.name}`
        });
        setCohortMsg(`Assigned ${enr.userName} to ${coh.name}.`);
        await onRefreshData();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `enrollments/${enr.id}`);
      }
    };

    const rosterCohort = cohorts.find((c) => c.id === selectedCohortRosterId) ?? null;
    const rosterMembers = rosterCohort
      ? enrollments.filter((e) => e.cohortId === rosterCohort.id)
      : [];

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-display font-semibold text-[#0D0D0F]">
              {editingCohortId ? 'Edit Cohort' : 'Create Course Cohort'}
            </h2>
            <form onSubmit={handleSaveCohort} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Course</label>
                <select
                  value={cohortCourseId}
                  onChange={(e) => setCohortCourseId(e.target.value)}
                  className="w-full px-3 py-2 border border-black/15 rounded-lg bg-white"
                >
                  {catalog.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.title.en}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Cohort Name</label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    value={cohortName}
                    onChange={(e) => setCohortName(e.target.value)}
                    placeholder="Kigali June 2026"
                    className="w-full px-3 py-2 border border-black/15 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Code</label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    value={cohortCode}
                    onChange={(e) => setCohortCode(e.target.value)}
                    placeholder="COH-2026-06"
                    className="w-full px-3 py-2 font-mono border border-black/15 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={cohortStart}
                    onChange={(e) => setCohortStart(e.target.value)}
                    className="w-full px-3 py-2 border border-black/15 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={cohortEnd}
                    onChange={(e) => setCohortEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-black/15 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-medium mb-1">Lead Instructor</label>
                  <input
                    type="text"
                    value={cohortInstructor}
                    onChange={(e) => setCohortInstructor(e.target.value)}
                    className="w-full px-3 py-2 border border-black/15 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Capacity</label>
                  <input
                    type="number"
                    min={0}
                    value={cohortCapacity}
                    onChange={(e) => setCohortCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 font-mono border border-black/15 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">Status</label>
                <select
                  value={cohortStatus}
                  onChange={(e) => setCohortStatus(e.target.value as Cohort['status'])}
                  className="w-full px-3 py-2 border border-black/15 rounded-lg bg-white"
                >
                  <option value="planned">Planned</option>
                  <option value="enrolling">Enrolling</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {cohortMsg && <p className="text-[#0D7A5F] font-medium">{cohortMsg}</p>}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={cohortBusy}
                  className="px-4 py-2 font-medium text-white bg-[#0D0D0F] rounded-lg"
                >
                  {cohortBusy ? 'Saving...' : editingCohortId ? 'Update Cohort' : 'Create Cohort'}
                </button>
                {editingCohortId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCohortId(null);
                      setCohortName('');
                      setCohortCode('');
                    }}
                    className="px-3 py-2 border border-black/15 rounded-lg"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* Assign learner to cohort */}
            <form
              onSubmit={handleAssignLearnerToCohort}
              className="pt-5 border-t border-black/[0.08] space-y-3 text-xs"
            >
              <h3 className="font-semibold text-[#0D0D0F]">Assign / Move Enrolled Learner</h3>
              <select
                required
                value={assignEnrollmentId}
                onChange={(e) => setAssignEnrollmentId(e.target.value)}
                className="w-full px-3 py-2 border border-black/15 rounded-lg bg-white"
              >
                <option value="">-- Select enrollment --</option>
                {enrollments.map((enr) => (
                  <option key={enr.id} value={enr.id}>
                    {enr.userName} ({enr.courseId}) {enr.cohortName ? `[${enr.cohortName}]` : ''}
                  </option>
                ))}
              </select>
              <select
                required
                value={assignCohortId}
                onChange={(e) => setAssignCohortId(e.target.value)}
                className="w-full px-3 py-2 border border-black/15 rounded-lg bg-white"
              >
                <option value="">-- Target cohort --</option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} · {c.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-4 py-2 font-medium text-white bg-[#0D7A5F] rounded-lg"
              >
                Assign to Cohort
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-display font-semibold text-[#0D0D0F]">
                Active & Planned Cohorts ({cohorts.length})
              </h2>
              {cohorts.length === 0 ? (
                <p className="text-xs text-[#5D5D66]">
                  No cohorts defined yet. Create your first cohort to group learners by intake schedule.
                </p>
              ) : (
                <div className="divide-y divide-black/[0.06]">
                  {cohorts.map((coh) => {
                    const count = enrollments.filter((e) => e.cohortId === coh.id).length;
                    return (
                      <div key={coh.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="font-semibold text-[#0D0D0F]">
                            {coh.name} <span className="font-mono text-[#0D7A5F]">({coh.code})</span>
                          </p>
                          <p className="text-[#5D5D66]">
                            {coh.courseId} · {coh.startDate} to {coh.endDate} · Instructor: {coh.instructorName || 'Staff'}
                          </p>
                          <p className="font-mono text-[#5D5D66] mt-0.5 tabular-nums">
                            Enrolled: {count}/{coh.capacity || '∞'} · Status: {coh.status}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCohortRosterId(coh.id)}
                            className="px-2.5 py-1 border border-black/15 rounded-lg"
                          >
                            Roster ({count})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCohortId(coh.id);
                              setCohortCourseId(coh.courseId);
                              setCohortName(coh.name);
                              setCohortCode(coh.code);
                              setCohortInstructor(coh.instructorName || '');
                              setCohortStart(coh.startDate);
                              setCohortEnd(coh.endDate);
                              setCohortCapacity(coh.capacity);
                              setCohortStatus(coh.status);
                            }}
                            className="px-2.5 py-1 border border-black/15 rounded-lg"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {rosterCohort && (
              <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#0D0D0F]">
                    Roster: {rosterCohort.name} ({rosterMembers.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedCohortRosterId(null)}
                    className="text-[#5D5D66]"
                  >
                    Close
                  </button>
                </div>
                {rosterMembers.length === 0 ? (
                  <p className="text-[#5D5D66]">No learners assigned to this cohort yet.</p>
                ) : (
                  <div className="space-y-2">
                    {rosterMembers.map((m) => (
                      <div key={m.id} className="bg-white border border-black/[0.06] rounded-lg p-3 flex justify-between">
                        <span>
                          {m.userName} ({m.userEmail})
                        </span>
                        <span className="font-mono text-[#0D7A5F]">
                          {m.completedDays.length}d · {m.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. QUIZZES & QUESTION BANK
  // =========================================================================
  if (section === 'quizzes') {
    const handleImportStarterQuizzes = async () => {
      setQuizBusy(true);
      setQuizMsg(null);
      try {
        const batch = writeBatch(db);
        WEEKLY_ASSESSMENTS.forEach((wa) => {
          const qId = `quiz_challenge28_w${wa.weekNumber}`;
          const mappedQuestions: QuizQuestionItem[] = wa.questions.map((q, idx) => ({
            id: `w${wa.weekNumber}_q${idx + 1}`,
            type: 'multiple_choice',
            questionEn: q.question.en,
            questionRw: q.question.rw,
            optionsEn: q.options.en,
            optionsRw: q.options.rw,
            correctIndex: q.correctIndex,
            marks: 1,
            explanationEn: q.explanation.en,
            explanationRw: q.explanation.rw
          }));
          batch.set(doc(db, 'quizzes', qId), {
            id: qId,
            courseId: 'challenge-28',
            weekNumber: wa.weekNumber,
            titleEn: wa.title.en,
            titleRw: wa.title.rw,
            descriptionEn: wa.weightLabel,
            descriptionRw: wa.weightLabel,
            passThreshold: 70,
            timeLimitMinutes: 15,
            maxAttempts: 3,
            randomizeQuestions: false,
            isPublished: true,
            questionsJson: JSON.stringify(mappedQuestions),
            updatedAt: serverTimestamp()
          });
        });
        await batch.commit();
        await onWriteAudit({
          action: 'IMPORT_STARTER_QUIZZES',
          targetCollection: 'quizzes',
          targetId: 'challenge-28',
          summary: 'Imported 4 weekly assessments into dynamic quizzes bank'
        });
        setQuizMsg('Imported 4 weekly starter quizzes to Firestore.');
        await onRefreshData();
        onRefreshPublic();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'quizzes/starter');
      } finally {
        setQuizBusy(false);
      }
    };

    const handleSaveQuiz = async (e: React.FormEvent) => {
      e.preventDefault();
      setQuizBusy(true);
      setQuizMsg(null);
      const id = editingQuizId || `quiz_${quizCourseId}_w${quizWeekNumber}_${Date.now()}`;
      try {
        await setDoc(doc(db, 'quizzes', id), {
          id,
          courseId: quizCourseId,
          ...(quizModuleId ? { moduleId: quizModuleId } : {}),
          weekNumber: Number(quizWeekNumber),
          titleEn: quizTitleEn.trim(),
          titleRw: quizTitleRw.trim() || quizTitleEn.trim(),
          ...(quizDescEn.trim() ? { descriptionEn: quizDescEn.trim() } : {}),
          passThreshold: Number(quizPassThreshold),
          timeLimitMinutes: Number(quizTimeLimit),
          maxAttempts: Number(quizMaxAttempts),
          randomizeQuestions: quizRandomize,
          isPublished: quizPublished,
          questionsJson: JSON.stringify(quizQuestions),
          updatedAt: serverTimestamp()
        });
        await onWriteAudit({
          action: editingQuizId ? 'UPDATE_QUIZ' : 'CREATE_QUIZ',
          targetCollection: 'quizzes',
          targetId: id,
          newState: `${quizTitleEn.trim()} (${quizQuestions.length} questions, ${quizPublished ? 'published' : 'draft'})`,
          summary: `${editingQuizId ? 'Updated' : 'Created'} dynamic quiz "${quizTitleEn.trim()}"`
        });
        setEditingQuizId(null);
        setQuizTitleEn('');
        setQuizTitleRw('');
        setQuizDescEn('');
        setQuizQuestions([makeEmptyQuestion(1)]);
        setQuizMsg('Quiz & question bank saved.');
        await onRefreshData();
        onRefreshPublic();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `quizzes/${id}`);
      } finally {
        setQuizBusy(false);
      }
    };

    const courseModules = modules.filter((m) => m.courseId === quizCourseId);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-display font-semibold text-[#0D0D0F]">
              {editingQuizId ? 'Edit Dynamic Quiz' : 'Create Dynamic Quiz'}
            </h2>
            <button
              type="button"
              disabled={quizBusy}
              onClick={handleImportStarterQuizzes}
              className="px-3 py-1.5 text-xs border border-black/15 rounded-lg hover:border-black/35"
            >
              Import 4 Weekly Starters
            </button>
          </div>

          <form onSubmit={handleSaveQuiz} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium mb-1">Course</label>
                <select
                  value={quizCourseId}
                  onChange={(e) => setQuizCourseId(e.target.value)}
                  className="w-full px-3 py-2 border border-black/15 rounded-lg bg-white"
                >
                  {catalog.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.title.en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Module (optional)</label>
                <select
                  value={quizModuleId}
                  onChange={(e) => setQuizModuleId(e.target.value)}
                  className="w-full px-3 py-2 border border-black/15 rounded-lg bg-white"
                >
                  <option value="">-- Course-wide / Weekly --</option>
                  {courseModules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.titleEn}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Week / Order #</label>
                <input
                  type="number"
                  min={0}
                  max={52}
                  value={quizWeekNumber}
                  onChange={(e) => setQuizWeekNumber(Number(e.target.value))}
                  className="w-full px-3 py-2 font-mono border border-black/15 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                minLength={2}
                value={quizTitleEn}
                onChange={(e) => setQuizTitleEn(e.target.value)}
                placeholder="Quiz title (English)"
                className="px-3 py-2 border border-black/15 rounded-lg"
              />
              <input
                type="text"
                value={quizTitleRw}
                onChange={(e) => setQuizTitleRw(e.target.value)}
                placeholder="Quiz title (Kinyarwanda)"
                className="px-3 py-2 border border-black/15 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-medium mb-1">Pass %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={quizPassThreshold}
                  onChange={(e) => setQuizPassThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 font-mono border border-black/15 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Timer (min, 0=none)</label>
                <input
                  type="number"
                  min={0}
                  max={300}
                  value={quizTimeLimit}
                  onChange={(e) => setQuizTimeLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 font-mono border border-black/15 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Max Attempts (0=∞)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={quizMaxAttempts}
                  onChange={(e) => setQuizMaxAttempts(Number(e.target.value))}
                  className="w-full px-3 py-2 font-mono border border-black/15 rounded-lg"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={quizRandomize}
                  onChange={(e) => setQuizRandomize(e.target.checked)}
                />
                <span>Randomize question order</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={quizPublished}
                  onChange={(e) => setQuizPublished(e.target.checked)}
                />
                <span>Published to learners</span>
              </label>
            </div>

            {/* Question Builder */}
            <div className="space-y-3 pt-3 border-t border-black/[0.08]">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#0D0D0F]">
                  Questions ({quizQuestions.length})
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setQuizQuestions((prev) => [...prev, makeEmptyQuestion(prev.length + 1)])
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#F4F5F7] rounded-lg hover:bg-[#E5E7EB]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Question</span>
                </button>
              </div>

              {quizQuestions.map((q, qIdx) => (
                <div key={q.id} className="bg-[#F9F9FB] border border-black/[0.08] rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-[#0D7A5F]">Q{qIdx + 1}</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={q.type}
                        onChange={(e) => {
                          const nextType = e.target.value as QuizQuestionItem['type'];
                          setQuizQuestions((prev) =>
                            prev.map((item, i) =>
                              i === qIdx
                                ? {
                                    ...item,
                                    type: nextType,
                                    optionsEn:
                                      nextType === 'true_false'
                                        ? ['True', 'False']
                                        : item.optionsEn.length >= 2
                                          ? item.optionsEn
                                          : ['Option A', 'Option B'],
                                    optionsRw:
                                      nextType === 'true_false'
                                        ? ['Nibyo', 'Sibyo']
                                        : item.optionsRw.length >= 2
                                          ? item.optionsRw
                                          : ['Igisubizo A', 'Igisubizo B']
                                  }
                                : item
                            )
                          );
                        }}
                        className="px-2 py-1 border border-black/15 rounded bg-white"
                      >
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="true_false">True / False</option>
                        <option value="short_answer">Short Answer</option>
                      </select>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={q.marks}
                        onChange={(e) =>
                          setQuizQuestions((prev) =>
                            prev.map((item, i) =>
                              i === qIdx ? { ...item, marks: Number(e.target.value) } : item
                            )
                          )
                        }
                        title="Marks"
                        className="w-14 px-2 py-1 font-mono border border-black/15 rounded bg-white"
                      />
                      {quizQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setQuizQuestions((prev) => prev.filter((_, i) => i !== qIdx))
                          }
                          className="p-1 text-[#DC2626]"
                          aria-label="Remove question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={q.questionEn}
                      onChange={(e) =>
                        setQuizQuestions((prev) =>
                          prev.map((item, i) =>
                            i === qIdx ? { ...item, questionEn: e.target.value } : item
                          )
                        )
                      }
                      placeholder="Question prompt (English)"
                      className="px-2.5 py-1.5 border border-black/15 rounded bg-white"
                    />
                    <input
                      type="text"
                      value={q.questionRw}
                      onChange={(e) =>
                        setQuizQuestions((prev) =>
                          prev.map((item, i) =>
                            i === qIdx ? { ...item, questionRw: e.target.value } : item
                          )
                        )
                      }
                      placeholder="Question prompt (Kinyarwanda)"
                      className="px-2.5 py-1.5 border border-black/15 rounded bg-white"
                    />
                  </div>

                  {q.type === 'short_answer' ? (
                    <input
                      type="text"
                      required
                      value={q.correctText ?? ''}
                      onChange={(e) =>
                        setQuizQuestions((prev) =>
                          prev.map((item, i) =>
                            i === qIdx ? { ...item, correctText: e.target.value } : item
                          )
                        )
                      }
                      placeholder="Expected keyword / short answer..."
                      className="w-full px-2.5 py-1.5 border border-black/15 rounded bg-white"
                    />
                  ) : (
                    <div className="space-y-1.5">
                      {q.optionsEn.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct_${q.id}`}
                            checked={q.correctIndex === oIdx}
                            onChange={() =>
                              setQuizQuestions((prev) =>
                                prev.map((item, i) =>
                                  i === qIdx ? { ...item, correctIndex: oIdx } : item
                                )
                              )
                            }
                          />
                          <input
                            type="text"
                            required
                            value={opt}
                            onChange={(e) =>
                              setQuizQuestions((prev) =>
                                prev.map((item, i) =>
                                  i === qIdx
                                    ? {
                                        ...item,
                                        optionsEn: item.optionsEn.map((o, j) =>
                                          j === oIdx ? e.target.value : o
                                        )
                                      }
                                    : item
                                )
                              )
                            }
                            placeholder={`Option ${oIdx + 1} (EN)`}
                            className="flex-1 px-2.5 py-1 border border-black/15 rounded bg-white"
                          />
                          <input
                            type="text"
                            value={q.optionsRw[oIdx] ?? ''}
                            onChange={(e) =>
                              setQuizQuestions((prev) =>
                                prev.map((item, i) =>
                                  i === qIdx
                                    ? {
                                        ...item,
                                        optionsRw: item.optionsRw.map((o, j) =>
                                          j === oIdx ? e.target.value : o
                                        )
                                      }
                                    : item
                                )
                              )
                            }
                            placeholder={`Option ${oIdx + 1} (RW)`}
                            className="flex-1 px-2.5 py-1 border border-black/15 rounded bg-white"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    type="text"
                    value={q.explanationEn}
                    onChange={(e) =>
                      setQuizQuestions((prev) =>
                        prev.map((item, i) =>
                          i === qIdx
                            ? { ...item, explanationEn: e.target.value, explanationRw: e.target.value }
                            : item
                        )
                      )
                    }
                    placeholder="Feedback explanation shown after submission..."
                    className="w-full px-2.5 py-1.5 border border-black/15 rounded bg-white"
                  />
                </div>
              ))}
            </div>

            {quizMsg && <p className="text-[#0D7A5F] font-medium">{quizMsg}</p>}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={quizBusy}
                className="px-5 py-2 font-medium text-white bg-[#0D0D0F] rounded-lg"
              >
                {quizBusy ? 'Saving...' : editingQuizId ? 'Update Quiz' : 'Save Dynamic Quiz'}
              </button>
              {editingQuizId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingQuizId(null);
                    setQuizTitleEn('');
                    setQuizTitleRw('');
                    setQuizQuestions([makeEmptyQuestion(1)]);
                  }}
                  className="px-4 py-2 border border-black/15 rounded-lg"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="lg:col-span-5 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-display font-semibold text-[#0D0D0F]">
            Published & Draft Quizzes ({quizzes.length})
          </h2>
          {quizzes.length === 0 ? (
            <p className="text-xs text-[#5D5D66]">
              No dynamic quizzes in Firestore yet. Import the 4 weekly starters or create a new quiz.
            </p>
          ) : (
            <div className="divide-y divide-black/[0.06]">
              {quizzes.map((qz) => {
                const qList = parseQuizQuestions(qz.questionsJson);
                const matchingAttempts = quizAttempts.filter(
                  (a) => a.quizId === qz.id || (!a.quizId && a.weekNumber === qz.weekNumber && a.courseId === qz.courseId)
                );
                const avg =
                  matchingAttempts.length > 0
                    ? Math.round(
                        matchingAttempts.reduce((acc, a) => acc + a.score, 0) /
                          matchingAttempts.length
                      )
                    : null;
                return (
                  <div key={qz.id} className="py-3.5 first:pt-0 last:pb-0 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#0D0D0F]">{qz.titleEn}</span>
                      <span className="font-mono text-[#0D7A5F]">
                        {qz.isPublished ? 'PUBLISHED' : 'DRAFT'}
                      </span>
                    </div>
                    <p className="text-[#5D5D66]">
                      {qz.courseId} · Week {qz.weekNumber} · {qList.length} Qs · Pass ≥{qz.passThreshold}% · Timer {qz.timeLimitMinutes}m
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono text-[#5D5D66]">
                        {matchingAttempts.length} attempt(s){avg !== null ? ` · Avg ${avg}%` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQuizId(qz.id);
                          setQuizCourseId(qz.courseId);
                          setQuizModuleId(qz.moduleId || '');
                          setQuizWeekNumber(qz.weekNumber);
                          setQuizTitleEn(qz.titleEn);
                          setQuizTitleRw(qz.titleRw);
                          setQuizDescEn(qz.descriptionEn || '');
                          setQuizPassThreshold(qz.passThreshold);
                          setQuizTimeLimit(qz.timeLimitMinutes);
                          setQuizMaxAttempts(qz.maxAttempts);
                          setQuizRandomize(qz.randomizeQuestions);
                          setQuizPublished(qz.isPublished);
                          const parsed = parseQuizQuestions(qz.questionsJson);
                          setQuizQuestions(parsed.length > 0 ? parsed : [makeEmptyQuestion(1)]);
                        }}
                        className="px-2.5 py-1 border border-black/15 rounded-lg"
                      >
                        Edit Quiz
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. COUPONS & PRICING
  // =========================================================================
  if (section === 'coupons') {
    const handleSaveCoupon = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!access.isAdmin) return;
      const cleanCode = couponCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      if (cleanCode.length < 2) {
        setCouponMsg('Enter a valid alphanumeric coupon code (e.g. KIGALI50).');
        return;
      }
      setCouponBusy(true);
      setCouponMsg(null);
      const existing = coupons.find((c) => c.id === cleanCode);
      try {
        await setDoc(doc(db, 'coupons', cleanCode), {
          id: cleanCode,
          code: cleanCode,
          discountType: couponType,
          discountValue: Number(couponValue),
          courseId: couponCourseId,
          maxUses: Number(couponMaxUses),
          usedCount: existing?.usedCount ?? 0,
          ...(couponExpiresAt.trim() ? { expiresAt: couponExpiresAt.trim() } : {}),
          isActive: couponActive,
          updatedAt: serverTimestamp()
        });
        await onWriteAudit({
          action: existing ? 'UPDATE_COUPON' : 'CREATE_COUPON',
          targetCollection: 'coupons',
          targetId: cleanCode,
          newState: `${couponType} ${couponValue} (${couponActive ? 'active' : 'inactive'})`,
          summary: `Saved promo coupon ${cleanCode} for ${couponCourseId}`
        });
        setCouponCode('');
        setCouponMsg(`Coupon ${cleanCode} saved.`);
        await onRefreshData();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `coupons/${cleanCode}`);
      } finally {
        setCouponBusy(false);
      }
    };

    const handleToggleCoupon = async (cpn: CouponRecord) => {
      try {
        await updateDoc(doc(db, 'coupons', cpn.id), {
          isActive: !cpn.isActive,
          updatedAt: serverTimestamp()
        });
        await onWriteAudit({
          action: 'TOGGLE_COUPON',
          targetCollection: 'coupons',
          targetId: cpn.id,
          previousState: String(cpn.isActive),
          newState: String(!cpn.isActive),
          summary: `${!cpn.isActive ? 'Activated' : 'Deactivated'} coupon ${cpn.code}`
        });
        await onRefreshData();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `coupons/${cpn.id}`);
      }
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-display font-semibold text-[#0D0D0F]">
            Create Promotional Coupon
          </h2>
          <form onSubmit={handleSaveCoupon} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium mb-1">Coupon Code (uppercase)</label>
              <input
                type="text"
                required
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="KIGALI50"
                className="w-full px-3 py-2 font-mono border border-black/15 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Discount Type</label>
                <select
                  value={couponType}
                  onChange={(e) => setCouponType(e.target.value as 'percent' | 'fixed_rwf')}
                  className="w-full px-3 py-2 border border-black/15 rounded-lg bg-white"
                >
                  <option value="percent">Percent (%)</option>
                  <option value="fixed_rwf">Fixed Amount (RWF)</option>
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Value</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={couponValue}
                  onChange={(e) => setCouponValue(Number(e.target.value))}
                  className="w-full px-3 py-2 font-mono border border-black/15 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block font-medium mb-1">Course Scope</label>
              <select
                value={couponCourseId}
                onChange={(e) => setCouponCourseId(e.target.value)}
                className="w-full px-3 py-2 border border-black/15 rounded-lg bg-white"
              >
                <option value="all">All Courses</option>
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} · {c.title.en}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Max Uses (0=unlimited)</label>
                <input
                  type="number"
                  min={0}
                  value={couponMaxUses}
                  onChange={(e) => setCouponMaxUses(Number(e.target.value))}
                  className="w-full px-3 py-2 font-mono border border-black/15 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Expires At (optional)</label>
                <input
                  type="date"
                  value={couponExpiresAt}
                  onChange={(e) => setCouponExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 border border-black/15 rounded-lg"
                />
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={couponActive}
                onChange={(e) => setCouponActive(e.target.checked)}
              />
              <span>Active immediately</span>
            </label>

            {couponMsg && <p className="text-[#0D7A5F] font-medium">{couponMsg}</p>}

            <button
              type="submit"
              disabled={couponBusy}
              className="w-full px-4 py-2.5 font-medium text-white bg-[#0D0D0F] rounded-lg"
            >
              {couponBusy ? 'Saving...' : 'Save Coupon Code'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-display font-semibold text-[#0D0D0F]">
            Active & Archived Coupons ({coupons.length})
          </h2>
          {coupons.length === 0 ? (
            <p className="text-xs text-[#5D5D66]">No promotional coupons configured yet.</p>
          ) : (
            <div className="divide-y divide-black/[0.06]">
              {coupons.map((cpn) => (
                <div key={cpn.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-mono font-semibold text-sm text-[#0D0D0F]">{cpn.code}</p>
                    <p className="text-[#5D5D66]">
                      {cpn.discountType === 'percent'
                        ? `${cpn.discountValue}% off`
                        : `${cpn.discountValue.toLocaleString()} RWF off`}{' '}
                      · Scope: {cpn.courseId} · Uses: {cpn.usedCount}/{cpn.maxUses || '∞'}
                      {cpn.expiresAt ? ` · Exp: ${cpn.expiresAt}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleCoupon(cpn)}
                    className={`px-3 py-1 rounded-lg border ${
                      cpn.isActive
                        ? 'border-[#0D7A5F]/30 text-[#0D7A5F] bg-[#ECFDF5]'
                        : 'border-black/15 text-[#5D5D66]'
                    }`}
                  >
                    {cpn.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. RESOURCE LIBRARY
  // =========================================================================
  if (section === 'resources') {
    const handleImportStarterResources = async () => {
      setResBusy(true);
      setResMsg(null);
      try {
        const batch = writeBatch(db);
        TEMPLATE_RESOURCES.forEach((tr) => {
          batch.set(doc(db, 'resources', tr.id), {
            id: tr.id,
            courseId: 'challenge-28',
            category: tr.category,
            titleEn: tr.title.en,
            titleRw: tr.title.rw,
            descriptionEn: tr.description.en,
            descriptionRw: tr.description.rw,
            filename: tr.filename,
            contentEn: tr.contentEn,
            contentRw: tr.contentRw,
            isPublished: true,
            updatedAt: serverTimestamp()
          });
        });
        await batch.commit();
        await onWriteAudit({
          action: 'IMPORT_RESOURCES',
          targetCollection: 'resources',
          targetId: 'starter',
          summary: `Imported ${TEMPLATE_RESOURCES.length} starter downloadable templates`
        });
        setResMsg(`Imported ${TEMPLATE_RESOURCES.length} templates to Firestore.`);
        await onRefreshData();
        onRefreshPublic();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'resources/starter');
      } finally {
        setResBusy(false);
      }
    };

    const handleSaveResource = async (e: React.FormEvent) => {
      e.preventDefault();
      setResBusy(true);
      setResMsg(null);
      const id = editingResourceId || `res_${Date.now()}`;
      try {
        await setDoc(doc(db, 'resources', id), {
          id,
          courseId: resCourseId,
          category: resCategory,
          titleEn: resTitleEn.trim(),
          titleRw: resTitleRw.trim() || resTitleEn.trim(),
          descriptionEn: resDescEn.trim(),
          descriptionRw: resDescRw.trim() || resDescEn.trim(),
          filename: resFilename.trim() || 'resource.md',
          ...(resExternalUrl.trim() ? { externalUrl: resExternalUrl.trim() } : {}),
          contentEn: resContentEn.trim(),
          contentRw: resContentRw.trim() || resContentEn.trim(),
          isPublished: resPublished,
          updatedAt: serverTimestamp()
        });
        await onWriteAudit({
          action: editingResourceId ? 'UPDATE_RESOURCE' : 'CREATE_RESOURCE',
          targetCollection: 'resources',
          targetId: id,
          summary: `Saved learning resource "${resTitleEn.trim()}"`
        });
        setEditingResourceId(null);
        setResTitleEn('');
        setResTitleRw('');
        setResDescEn('');
        setResDescRw('');
        setResContentEn('');
        setResContentRw('');
        setResExternalUrl('');
        setResMsg('Resource saved to library.');
        await onRefreshData();
        onRefreshPublic();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `resources/${id}`);
      } finally {
        setResBusy(false);
      }
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-display font-semibold text-[#0D0D0F]">
              {editingResourceId ? 'Edit Resource' : 'Publish Downloadable Guide / Template'}
            </h2>
            <button
              type="button"
              disabled={resBusy}
              onClick={handleImportStarterResources}
              className="px-3 py-1.5 text-xs border border-black/15 rounded-lg"
            >
              Import Starters
            </button>
          </div>
          <form onSubmit={handleSaveResource} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <select
                value={resCourseId}
                onChange={(e) => setResCourseId(e.target.value)}
                className="px-3 py-2 border border-black/15 rounded-lg bg-white"
              >
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </select>
              <select
                value={resCategory}
                onChange={(e) => setResCategory(e.target.value as ResourceItem['category'])}
                className="px-3 py-2 border border-black/15 rounded-lg bg-white"
              >
                <option value="prompting">Prompting</option>
                <option value="automation">Automation</option>
                <option value="ai_automation">AI + Automation</option>
                <option value="project">Project Rubric</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={resTitleEn}
                onChange={(e) => setResTitleEn(e.target.value)}
                placeholder="Title (English)"
                className="px-3 py-2 border border-black/15 rounded-lg"
              />
              <input
                type="text"
                value={resTitleRw}
                onChange={(e) => setResTitleRw(e.target.value)}
                placeholder="Title (Kinyarwanda)"
                className="px-3 py-2 border border-black/15 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={resFilename}
                onChange={(e) => setResFilename(e.target.value)}
                placeholder="worksheet.md"
                className="px-3 py-2 font-mono border border-black/15 rounded-lg"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={resExternalUrl}
                  onChange={(e) => setResExternalUrl(e.target.value)}
                  placeholder="https://... or /api/files/..."
                  className="flex-1 min-w-0 px-3 py-2 border border-black/15 rounded-lg"
                />
                <label className="inline-flex items-center gap-1 px-2.5 py-2 bg-[#F4F5F7] border border-black/15 rounded-lg cursor-pointer hover:bg-[#ECEEF2] shrink-0 font-medium">
                  <Upload className="w-3.5 h-3.5 text-[#0D7A5F]" />
                  <span>Upload</span>
                  <input
                    type="file"
                    className="hidden"
                    accept={UPLOAD_RULES.resource.acceptAttr}
                    disabled={resBusy}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      setResBusy(true);
                      setResMsg(null);
                      try {
                        const uploaded = await uploadPlatformFile(file, 'resource', user);
                        setResFilename(uploaded.filename);
                        setResExternalUrl(uploaded.url);
                        if (!resContentEn.trim()) {
                          setResContentEn(`Downloadable resource uploaded: ${uploaded.filename}`);
                        }
                        setResMsg(`Uploaded ${uploaded.filename}. Click Publish/Update to save.`);
                      } catch (err) {
                        setResMsg(err instanceof Error ? err.message : 'Resource upload failed.');
                      } finally {
                        setResBusy(false);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
            <input
              type="text"
              required
              value={resDescEn}
              onChange={(e) => setResDescEn(e.target.value)}
              placeholder="Short description (English)"
              className="w-full px-3 py-2 border border-black/15 rounded-lg"
            />
            <textarea
              rows={4}
              required
              value={resContentEn}
              onChange={(e) => setResContentEn(e.target.value)}
              placeholder="Markdown / worksheet content (English)..."
              className="w-full px-3 py-2 font-mono border border-black/15 rounded-lg"
            />
            <textarea
              rows={3}
              value={resContentRw}
              onChange={(e) => setResContentRw(e.target.value)}
              placeholder="Markdown / worksheet content (Kinyarwanda, optional)..."
              className="w-full px-3 py-2 font-mono border border-black/15 rounded-lg"
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={resPublished}
                onChange={(e) => setResPublished(e.target.checked)}
              />
              <span>Published in Projects & Resources Hub</span>
            </label>
            {resMsg && <p className="text-[#0D7A5F] font-medium">{resMsg}</p>}
            <button
              type="submit"
              disabled={resBusy}
              className="px-5 py-2 font-medium text-white bg-[#0D0D0F] rounded-lg"
            >
              {resBusy ? 'Saving...' : editingResourceId ? 'Update Resource' : 'Publish Resource'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-6 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-display font-semibold text-[#0D0D0F]">
            Library Items ({resources.length})
          </h2>
          {resources.length === 0 ? (
            <p className="text-xs text-[#5D5D66]">
              No Firestore resources yet (public Projects Hub renders starter markdown templates until imported or created here).
            </p>
          ) : (
            <div className="divide-y divide-black/[0.06]">
              {resources.map((r) => (
                <div key={r.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-[#0D0D0F]">{r.titleEn}</p>
                    <p className="font-mono text-[#5D5D66]">
                      {r.filename} · {r.category} · {r.isPublished ? 'Published' : 'Draft'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingResourceId(r.id);
                      setResCourseId(r.courseId);
                      setResCategory(r.category);
                      setResTitleEn(r.titleEn);
                      setResTitleRw(r.titleRw);
                      setResDescEn(r.descriptionEn);
                      setResDescRw(r.descriptionRw);
                      setResFilename(r.filename);
                      setResExternalUrl(r.externalUrl || '');
                      setResContentEn(r.contentEn);
                      setResContentRw(r.contentRw);
                      setResPublished(r.isPublished);
                    }}
                    className="px-2.5 py-1 border border-black/15 rounded-lg"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 5. LIVE ANALYTICS & REPORTS
  // =========================================================================
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-5">
          <p className="text-xs text-[#5D5D66]">Completion Rate</p>
          <p className="text-2xl font-display font-semibold tabular-nums text-[#0D0D0F] mt-1">
            {analytics.completionRatePct}%
          </p>
          <p className="text-[11px] font-mono text-[#5D5D66] mt-1">
            {analytics.completedLearners} of {analytics.activeEnrollments} active
          </p>
        </div>
        <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-5">
          <p className="text-xs text-[#5D5D66]">Net Verified Revenue</p>
          <p className="text-2xl font-display font-semibold tabular-nums text-[#0D7A5F] mt-1">
            {analytics.netRevenueRwf.toLocaleString()} RWF
          </p>
          <p className="text-[11px] font-mono text-[#5D5D66] mt-1">
            Discounts: {analytics.totalDiscountsRwf.toLocaleString()} RWF
          </p>
        </div>
        <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-5">
          <p className="text-xs text-[#5D5D66]">Assessment Average</p>
          <p className="text-2xl font-display font-semibold tabular-nums text-[#0D0D0F] mt-1">
            {analytics.quizAvgScore}%
          </p>
          <p className="text-[11px] font-mono text-[#5D5D66] mt-1">
            Pass rate: {analytics.quizPassRatePct}% ({analytics.quizAttemptsCount} runs)
          </p>
        </div>
        <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-5">
          <p className="text-xs text-[#5D5D66]">Support Resolution</p>
          <p className="text-2xl font-display font-semibold tabular-nums text-[#0D0D0F] mt-1">
            {analytics.resolvedTicketsCount} / {analytics.openTicketsCount + analytics.resolvedTicketsCount}
          </p>
          <p className="text-[11px] font-mono text-[#5D5D66] mt-1">
            Open / In Progress: {analytics.openTicketsCount}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-semibold text-[#0D0D0F]">
              Learner Progress & Drop-Off Distribution
            </h2>
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  `analytics-progress-${Date.now()}.csv`,
                  ['Bucket', 'Learner Count'],
                  analytics.progressBuckets.map((b) => [b.label, b.count])
                )
              }
              className="px-3 py-1.5 text-xs border border-black/15 rounded-lg"
            >
              Export CSV
            </button>
          </div>
          <div className="space-y-3">
            {analytics.progressBuckets.map((bucket) => {
              const pct =
                analytics.activeEnrollments > 0
                  ? Math.round((bucket.count / analytics.activeEnrollments) * 100)
                  : 0;
              return (
                <div key={bucket.label} className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#0D0D0F] font-medium">{bucket.label}</span>
                    <span className="font-mono tabular-nums text-[#5D5D66]">
                      {bucket.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#ECEEF2] rounded-full overflow-hidden">
                    <div className="h-full bg-[#0D7A5F]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-6 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-semibold text-[#0D0D0F]">
              Course Performance Breakdown
            </h2>
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  `analytics-courses-${Date.now()}.csv`,
                  ['Course ID', 'Title', 'Active Enrollments', 'Pending', 'Verified Revenue RWF'],
                  catalog.map((c) => [
                    c.id,
                    c.title.en,
                    enrollments.filter((e) => e.courseId === c.id && e.status === 'active').length,
                    enrollments.filter((e) => e.courseId === c.id && e.status === 'pending').length,
                    payments
                      .filter((p) => p.courseId === c.id && p.status === 'verified')
                      .reduce((acc, p) => acc + p.amountRwf, 0)
                  ])
                )
              }
              className="px-3 py-1.5 text-xs border border-black/15 rounded-lg"
            >
              Export CSV
            </button>
          </div>
          <div className="divide-y divide-black/[0.06] text-xs">
            {catalog.map((c) => {
              const active = enrollments.filter(
                (e) => e.courseId === c.id && e.status === 'active'
              ).length;
              const pending = enrollments.filter(
                (e) => e.courseId === c.id && e.status === 'pending'
              ).length;
              const rev = payments
                .filter((p) => p.courseId === c.id && p.status === 'verified')
                .reduce((acc, p) => acc + p.amountRwf, 0);
              return (
                <div key={c.id} className="py-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#0D0D0F]">{c.title.en}</p>
                    <p className="font-mono text-[#5D5D66]">
                      {c.code} · {active} active · {pending} pending
                    </p>
                  </div>
                  <span className="font-mono font-semibold text-[#0D7A5F] tabular-nums">
                    {rev.toLocaleString()} RWF
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
