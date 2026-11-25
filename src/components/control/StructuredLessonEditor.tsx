import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  History,
  Languages,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import type {
  Course,
  CourseModule,
  Language,
  LessonBlock,
  LessonBlockType,
  LessonVersion,
  StructuredLessonRecord
} from '../../types';
import { COURSES } from '../../data/curriculum';
import { LESSONS_28 } from '../../data/lessons28';
import {
  BLOCK_TYPE_META,
  convertStaticLessonToBlocks,
  createDefaultBlock,
  evaluateTranslationCompleteness,
  LESSON_STARTER_TEMPLATES,
  makeBlockId,
  parseLessonBlocks,
  serializeLessonBlocks
} from '../../lib/lessonBlocks';
import { parseReleaseAtMs } from '../../lib/domain';
import { UPLOAD_RULES, uploadPlatformFile } from '../../lib/uploads';
import { LessonBlocksRenderer } from '../LessonBlocksRenderer';
import type { AuditWriteParams } from './ControlCenterTypes';

interface StructuredLessonEditorProps {
  user: User;
  courses: Course[];
  modules: CourseModule[];
  lessons: StructuredLessonRecord[];
  initialCourseId?: string | null;
  initialLessonId?: string | null;
  onWriteAudit: (params: AuditWriteParams) => Promise<void>;
  onRefreshData: () => Promise<void>;
  onRefreshPublic: () => void;
}

export function StructuredLessonEditor({
  user,
  courses,
  modules,
  lessons,
  initialCourseId,
  initialLessonId,
  onWriteAudit,
  onRefreshData,
  onRefreshPublic
}: StructuredLessonEditorProps) {
  const catalog = courses.length > 0 ? courses : COURSES;

  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialCourseId || catalog[0]?.id || 'challenge-28'
  );
  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    initialLessonId || ''
  );
  const [activeLang, setActiveLang] = useState<Language>('en');
  const [previewMode, setPreviewMode] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<LessonVersion[]>([]);
  const [versionNote, setVersionNote] = useState('');
  const [loadingVersions, setLoadingVersions] = useState(false);

  const [saveState, setSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const [newBlockType, setNewBlockType] = useState<LessonBlockType>('rich_text');

  // Editable Draft State
  const [draft, setDraft] = useState<StructuredLessonRecord | null>(null);
  const [blocksEn, setBlocksEn] = useState<LessonBlock[]>([]);
  const [blocksRw, setBlocksRw] = useState<LessonBlock[]>([]);
  const skipNextAutosave = useRef(true);

  useEffect(() => {
    if (initialLessonId) {
      const found = lessons.find((l) => l.id === initialLessonId);
      if (found) {
        setSelectedCourseId(found.courseId);
        setSelectedLessonId(found.id);
      }
    }
  }, [initialLessonId, lessons]);

  const courseModules = useMemo(
    () =>
      modules
        .filter((m) => m.courseId === selectedCourseId)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [modules, selectedCourseId]
  );

  const courseLessons = useMemo(
    () =>
      lessons
        .filter((l) => l.courseId === selectedCourseId)
        .sort((a, b) => (a.dayNumber ?? 0) - (b.dayNumber ?? 0) || (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
    [lessons, selectedCourseId]
  );

  const loadDraftFromLesson = useCallback((rec: StructuredLessonRecord) => {
    skipNextAutosave.current = true;
    setDraft(rec);
    setBlocksEn(parseLessonBlocks(rec.blocksEnJson));
    setBlocksRw(parseLessonBlocks(rec.blocksRwJson));
    setSaveState('idle');
    setStatusMessage(null);
  }, []);

  // Initialize selected lesson when course changes or lessons arrive
  useEffect(() => {
    if (courseLessons.length > 0) {
      const stillValid = courseLessons.find((l) => l.id === selectedLessonId);
      const target = stillValid || courseLessons[0];
      if (target && (!draft || draft.id !== target.id)) {
        loadDraftFromLesson(target);
        setSelectedLessonId(target.id);
      }
    } else if (selectedCourseId === 'challenge-28') {
      // Virtual starter for Day 1 from static syllabus if Firestore hasn't been synced yet
      const base = LESSONS_28[0];
      const virtualId = 'challenge-28_day_1';
      if (!draft || draft.id !== virtualId) {
        const enBlocks = convertStaticLessonToBlocks(base, 'en');
        const rwBlocks = convertStaticLessonToBlocks(base, 'rw');
        loadDraftFromLesson({
          id: virtualId,
          courseId: 'challenge-28',
          moduleId: courseModules[0]?.id || '',
          orderIndex: 0,
          dayNumber: 1,
          weekNumber: 1,
          isSample: true,
          isRequired: true,
          estimatedMinutes: base.durationMinutes,
          enStatus: 'published',
          rwStatus: 'published',
          titleEn: base.title.en,
          titleRw: base.title.rw,
          summaryEn: base.introduction.en,
          summaryRw: base.introduction.rw,
          objectivesEn: base.objectives.en,
          objectivesRw: base.objectives.rw,
          blocksEnJson: serializeLessonBlocks(enBlocks),
          blocksRwJson: serializeLessonBlocks(rwBlocks)
        });
        setSelectedLessonId(virtualId);
      }
    } else if (draft && draft.courseId !== selectedCourseId) {
      setDraft(null);
      setBlocksEn([]);
      setBlocksRw([]);
    }
  }, [courseLessons, courseModules, selectedCourseId, selectedLessonId, draft, loadDraftFromLesson]);

  const persistLesson = useCallback(
    async (
      rec: StructuredLessonRecord,
      nextEn: LessonBlock[],
      nextRw: LessonBlock[],
      writeAuditLog: boolean
    ) => {
      setSaveState('saving');
      const payload: Record<string, unknown> = {
        id: rec.id,
        courseId: rec.courseId,
        moduleId: rec.moduleId || '',
        orderIndex: Number(rec.orderIndex ?? 0),
        dayNumber: Math.max(1, Number(rec.dayNumber || 1)),
        weekNumber: Math.max(1, Number(rec.weekNumber || 1)),
        isSample: Boolean(rec.isSample),
        isRequired: rec.isRequired !== false,
        estimatedMinutes: Math.max(1, Number(rec.estimatedMinutes || 15)),
        enStatus: rec.enStatus || 'draft',
        rwStatus: rec.rwStatus || 'draft',
        ...(rec.releaseAt ? { releaseAt: rec.releaseAt } : {}),
        releaseAtMs: parseReleaseAtMs(rec.releaseAt) ?? 0,
        titleEn: rec.titleEn.trim() || 'Untitled Lesson',
        titleRw: rec.titleRw.trim() || rec.titleEn.trim() || 'Isomo ritarahabwa izina',
        summaryEn: (rec.summaryEn || '').slice(0, 3950),
        summaryRw: (rec.summaryRw || '').slice(0, 3950),
        objectivesEn: (rec.objectivesEn || []).slice(0, 20),
        objectivesRw: (rec.objectivesRw || []).slice(0, 20),
        blocksEnJson: serializeLessonBlocks(nextEn).slice(0, 199000),
        blocksRwJson: serializeLessonBlocks(nextRw).slice(0, 199000),
        updatedAt: serverTimestamp()
      };

      try {
        await setDoc(doc(db, 'lessons', rec.id), payload);
        if (writeAuditLog) {
          await onWriteAudit({
            action: 'SAVE_STRUCTURED_LESSON',
            targetCollection: 'lessons',
            targetId: rec.id,
            newState: `EN:${rec.enStatus || 'draft'} / RW:${rec.rwStatus || 'draft'} (${nextEn.length} blocks)`,
            summary: `Saved structured bilingual lesson ${rec.titleEn} (${rec.id})`
          });
          await onRefreshData();
          onRefreshPublic();
        }
        setSaveState('saved');
        setStatusMessage(`Saved at ${new Date().toLocaleTimeString()}`);
      } catch (err) {
        setSaveState('dirty');
        handleFirestoreError(err, OperationType.WRITE, `lessons/${rec.id}`);
      }
    },
    [onWriteAudit, onRefreshData, onRefreshPublic]
  );

  // Debounced autosave when editing an existing Firestore lesson
  useEffect(() => {
    if (!draft) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    const existsInFirestore = lessons.some((l) => l.id === draft.id);
    if (!existsInFirestore) return;

    setSaveState('dirty');
    const timer = setTimeout(() => {
      persistLesson(draft, blocksEn, blocksRw, false);
    }, 1800);

    return () => clearTimeout(timer);
  }, [draft, blocksEn, blocksRw, lessons, persistLesson]);

  const handleCreateLesson = async () => {
    const nextDay =
      courseLessons.length > 0
        ? Math.max(...courseLessons.map((l) => l.dayNumber || 1)) + 1
        : 1;
    const newId = `${selectedCourseId}_lesson_${Date.now().toString(36)}`;
    const starterBlocks = LESSON_STARTER_TEMPLATES[0].buildBlocks();
    const newRec: StructuredLessonRecord = {
      id: newId,
      courseId: selectedCourseId,
      moduleId: courseModules[0]?.id || '',
      orderIndex: courseLessons.length,
      dayNumber: nextDay,
      weekNumber: Math.max(1, Math.ceil(nextDay / 7)),
      isSample: nextDay === 1,
      isRequired: true,
      estimatedMinutes: 15,
      enStatus: 'draft',
      rwStatus: 'translation_needed',
      releaseAtMs: 0,
      titleEn: `Lesson ${nextDay}: New Practical Topic`,
      titleRw: `Isomo rya ${nextDay}: Inyigisho Nshya`,
      summaryEn: 'Describe what the learner will achieve in this lesson.',
      summaryRw: 'Sobanura icyo umunyeshuri azungukira muri iri somo.',
      objectivesEn: ['Understand core principle', 'Practice with a Rwanda example'],
      objectivesRw: ['Gusobanukirwa ihame shingiro', 'Kwimenyereza ukoresheje urugero rwo mu Rwanda'],
      blocksEnJson: serializeLessonBlocks(starterBlocks),
      blocksRwJson: serializeLessonBlocks([])
    };

    await persistLesson(newRec, starterBlocks, [], true);
    setSelectedLessonId(newId);
    loadDraftFromLesson(newRec);
  };

  const handleDeleteLesson = async () => {
    if (!draft) return;
    const existsInFirestore = lessons.some((l) => l.id === draft.id);
    if (!existsInFirestore) return;
    try {
      await deleteDoc(doc(db, 'lessons', draft.id));
      await onWriteAudit({
        action: 'DELETE_LESSON',
        targetCollection: 'lessons',
        targetId: draft.id,
        summary: `Deleted lesson ${draft.titleEn} (${draft.id})`
      });
      setDraft(null);
      await onRefreshData();
      onRefreshPublic();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `lessons/${draft.id}`);
    }
  };

  const loadVersions = async (lessonId: string) => {
    setLoadingVersions(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, 'lessonVersions'),
          where('lessonId', '==', lessonId),
          orderBy('createdAt', 'desc'),
          limit(20)
        )
      );
      setVersions(snap.docs.map((d) => d.data() as LessonVersion));
    } catch {
      // Fallback query without composite index requirement if index isn't created yet
      try {
        const snap = await getDocs(
          query(collection(db, 'lessonVersions'), where('lessonId', '==', lessonId), limit(20))
        );
        setVersions(snap.docs.map((d) => d.data() as LessonVersion));
      } catch {
        setVersions([]);
      }
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleSaveSnapshot = async () => {
    if (!draft) return;
    const versionId = `ver_${Date.now()}`;
    const snapshotPayload = {
      ...draft,
      blocksEnJson: serializeLessonBlocks(blocksEn),
      blocksRwJson: serializeLessonBlocks(blocksRw)
    };
    try {
      await setDoc(doc(db, 'lessonVersions', versionId), {
        id: versionId,
        lessonId: draft.id,
        courseId: draft.courseId,
        savedBy: user.email || user.uid,
        note: versionNote.trim() || `Manual snapshot (${blocksEn.length} EN / ${blocksRw.length} RW blocks)`,
        snapshotJson: JSON.stringify(snapshotPayload).slice(0, 249000),
        createdAt: serverTimestamp()
      });
      setVersionNote('');
      setStatusMessage('Version snapshot saved to history.');
      await loadVersions(draft.id);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `lessonVersions/${versionId}`);
    }
  };

  const handleRestoreVersion = async (ver: LessonVersion) => {
    try {
      const restored = JSON.parse(ver.snapshotJson) as StructuredLessonRecord;
      const nextEn = parseLessonBlocks(restored.blocksEnJson);
      const nextRw = parseLessonBlocks(restored.blocksRwJson);
      loadDraftFromLesson(restored);
      await persistLesson(restored, nextEn, nextRw, true);
      setStatusMessage(`Restored snapshot saved by ${ver.savedBy}`);
      setHistoryOpen(false);
    } catch {
      setStatusMessage('Could not parse version snapshot.');
    }
  };

  const handleCopyEnToRwDraft = () => {
    if (!draft) return;
    const copiedBlocks = blocksEn.map((b) => ({
      ...b,
      id: makeBlockId()
    }));
    setBlocksRw(copiedBlocks);
    setDraft({
      ...draft,
      titleRw: draft.titleRw.trim() || draft.titleEn,
      summaryRw: draft.summaryRw?.trim() || draft.summaryEn || '',
      objectivesRw:
        draft.objectivesRw && draft.objectivesRw.length > 0
          ? draft.objectivesRw
          : [...(draft.objectivesEn || [])],
      rwStatus: 'translation_needed'
    });
    setActiveLang('rw');
    setStatusMessage('Copied English structure into Kinyarwanda draft (marked Translation Needed).');
  };

  const handleLoadStaticBlueprintDay = (dayNum: number) => {
    if (!draft) return;
    const base = LESSONS_28.find((l) => l.dayNumber === dayNum);
    if (!base) return;
    const enB = convertStaticLessonToBlocks(base, 'en');
    const rwB = convertStaticLessonToBlocks(base, 'rw');
    setBlocksEn(enB);
    setBlocksRw(rwB);
    setDraft({
      ...draft,
      titleEn: base.title.en,
      titleRw: base.title.rw,
      summaryEn: base.introduction.en,
      summaryRw: base.introduction.rw,
      objectivesEn: base.objectives.en,
      objectivesRw: base.objectives.rw,
      estimatedMinutes: base.durationMinutes
    });
    setStatusMessage(`Loaded Day ${dayNum} bilingual curriculum blocks.`);
  };

  const activeBlocks = activeLang === 'en' ? blocksEn : blocksRw;
  const setActiveBlocks = (updater: (prev: LessonBlock[]) => LessonBlock[]) => {
    if (activeLang === 'en') {
      setBlocksEn(updater);
    } else {
      setBlocksRw(updater);
    }
  };

  const updateBlock = (index: number, patch: Partial<LessonBlock>) => {
    setActiveBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    setActiveBlocks((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  };

  const completeness = draft
    ? evaluateTranslationCompleteness({
        titleEn: draft.titleEn,
        titleRw: draft.titleRw,
        summaryEn: draft.summaryEn,
        summaryRw: draft.summaryRw,
        blocksEnJson: serializeLessonBlocks(blocksEn),
        blocksRwJson: serializeLessonBlocks(blocksRw)
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Top Toolbar: Course + Lesson Picker + Actions */}
      <div className="bg-white border border-black/[0.08] rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-mono text-[#5D5D66] mb-1">COURSE</label>
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  setSelectedLessonId('');
                  setDraft(null);
                }}
                className="px-3 py-2 text-xs border border-black/15 rounded-lg bg-white min-w-[200px]"
              >
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}: {c.title.en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#5D5D66] mb-1">
                LESSON ({courseLessons.length} in Firestore)
              </label>
              <select
                value={draft?.id || selectedLessonId}
                onChange={(e) => {
                  const found = courseLessons.find((l) => l.id === e.target.value);
                  if (found) {
                    setSelectedLessonId(found.id);
                    loadDraftFromLesson(found);
                  }
                }}
                className="px-3 py-2 text-xs border border-black/15 rounded-lg bg-white min-w-[240px]"
              >
                {courseLessons.length === 0 ? (
                  <option value="">No Firestore lessons yet (click + New Lesson)</option>
                ) : (
                  courseLessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      Day {l.dayNumber}: {l.titleEn}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCreateLesson}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#0D0D0F] border border-black/15 rounded-lg hover:border-black/35 bg-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Lesson</span>
            </button>

            {draft && (
              <>
                <button
                  type="button"
                  onClick={() => setPreviewMode((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border ${
                    previewMode
                      ? 'bg-[#0D7A5F] text-white border-[#0D7A5F]'
                      : 'bg-white text-[#0D0D0F] border-black/15 hover:border-black/35'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{previewMode ? 'Exit Preview' : 'Learner Preview'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = !historyOpen;
                    setHistoryOpen(next);
                    if (next) loadVersions(draft.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#0D0D0F] border border-black/15 rounded-lg hover:border-black/35 bg-white"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Versions</span>
                </button>

                <button
                  type="button"
                  onClick={() => persistLesson(draft, blocksEn, blocksRw, true)}
                  disabled={saveState === 'saving'}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0D0D0F] rounded-lg hover:bg-[#232329]"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saveState === 'saving' ? 'Saving...' : 'Save Lesson'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-black/[0.06] text-xs">
          <div className="flex items-center gap-3 text-[#5D5D66]">
            {draft && <span className="font-mono">ID: {draft.id}</span>}
            {saveState === 'dirty' && <span className="text-[#D97706]">Unsaved changes (autosaving...)</span>}
            {saveState === 'saving' && <span className="text-[#0D7A5F]">Saving to Firestore...</span>}
            {statusMessage && <span className="text-[#0D7A5F]">{statusMessage}</span>}
          </div>

          {completeness && (
            <div className="flex items-center gap-2 font-mono tabular-nums">
              <span className="text-[#5D5D66]">
                EN {completeness.enBlockCount} blocks · RW {completeness.rwBlockCount} blocks
              </span>
              <span
                className={
                  completeness.percentComplete === 100 ? 'text-[#0D7A5F]' : 'text-[#D97706]'
                }
              >
                {completeness.percentComplete}% Bilingual
              </span>
            </div>
          )}
        </div>
      </div>

      {!draft ? (
        <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-10 text-center space-y-3">
          <p className="text-sm font-medium text-[#0D0D0F]">
            This course does not have any structured lessons yet.
          </p>
          <button
            type="button"
            onClick={handleCreateLesson}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0D0D0F] rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Structured Lesson</span>
          </button>
        </div>
      ) : historyOpen ? (
        /* VERSION HISTORY PANEL */
        <div className="bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[#0D0D0F]">
                Version History & Snapshot Restore
              </h3>
              <p className="text-xs text-[#5D5D66]">
                Save immutable checkpoints before major edits or curriculum updates.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHistoryOpen(false)}
              className="px-3 py-1.5 text-xs border border-black/15 rounded-lg"
            >
              Close History
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={versionNote}
              onChange={(e) => setVersionNote(e.target.value)}
              placeholder="Snapshot note (e.g. Updated Rwanda MoMo example)..."
              className="flex-1 min-w-[220px] px-3 py-2 text-xs border border-black/15 rounded-lg"
            />
            <button
              type="button"
              onClick={handleSaveSnapshot}
              className="px-4 py-2 text-xs font-medium text-white bg-[#0D7A5F] rounded-lg"
            >
              Save Version Snapshot
            </button>
          </div>

          {loadingVersions ? (
            <p className="text-xs text-[#5D5D66]">Loading snapshots...</p>
          ) : versions.length === 0 ? (
            <p className="text-xs text-[#5D5D66]">No snapshots saved for this lesson yet.</p>
          ) : (
            <div className="divide-y divide-black/[0.06]">
              {versions.map((ver) => (
                <div key={ver.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <p className="font-medium text-[#0D0D0F]">{ver.note || 'Saved Snapshot'}</p>
                    <p className="font-mono text-[#5D5D66]">
                      {ver.id} · By {ver.savedBy}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestoreVersion(ver)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-black/15 rounded-lg hover:border-[#0D7A5F] text-[#0D0D0F]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : previewMode ? (
        /* LIVE LEARNER PREVIEW MODE */
        <div className="bg-white border border-black/[0.08] rounded-2xl p-6 sm:p-10 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-black/[0.08]">
            <div className="flex items-center gap-2 p-1 bg-[#F4F5F7] rounded-lg">
              <button
                type="button"
                onClick={() => setActiveLang('en')}
                className={`px-3 py-1 text-xs rounded-md font-medium ${
                  activeLang === 'en' ? 'bg-white text-[#0D0D0F]' : 'text-[#5D5D66]'
                }`}
              >
                Preview English
              </button>
              <button
                type="button"
                onClick={() => setActiveLang('rw')}
                className={`px-3 py-1 text-xs rounded-md font-medium ${
                  activeLang === 'rw' ? 'bg-white text-[#0D0D0F]' : 'text-[#5D5D66]'
                }`}
              >
                Preview Kinyarwanda
              </button>
            </div>
            <span className="text-xs font-mono text-[#0D7A5F]">
              LIVE LEARNER PREVIEW · Day {draft.dayNumber} · {draft.estimatedMinutes || 15} min
            </span>
          </div>

          <header className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-display font-semibold text-[#0D0D0F]">
              {activeLang === 'en' ? draft.titleEn : draft.titleRw}
            </h2>
            <p className="text-base text-[#5D5D66] leading-relaxed">
              {activeLang === 'en' ? draft.summaryEn : draft.summaryRw}
            </p>
          </header>

          <LessonBlocksRenderer
            lang={activeLang}
            blocks={activeLang === 'en' ? blocksEn : blocksRw}
          />
        </div>
      ) : (
        /* STRUCTURED 14-BLOCK EDITOR */
        <div className="space-y-6">
          {/* Lesson Identity & Settings */}
          <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
            <div>
              <label className="block text-[#5D5D66] mb-1">Module</label>
              <select
                value={draft.moduleId || ''}
                onChange={(e) => setDraft({ ...draft, moduleId: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white border border-black/15 rounded-lg"
              >
                <option value="">Unassigned</option>
                {courseModules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.orderIndex + 1}. {m.titleEn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#5D5D66] mb-1">Day #</label>
              <input
                type="number"
                min={1}
                max={365}
                value={draft.dayNumber}
                onChange={(e) => setDraft({ ...draft, dayNumber: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-white border border-black/15 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-[#5D5D66] mb-1">Est. Minutes</label>
              <input
                type="number"
                min={1}
                max={600}
                value={draft.estimatedMinutes || 15}
                onChange={(e) => setDraft({ ...draft, estimatedMinutes: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-white border border-black/15 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-[#5D5D66] mb-1">EN Publish State</label>
              <select
                value={draft.enStatus || 'draft'}
                onChange={(e) =>
                  setDraft({ ...draft, enStatus: e.target.value as 'draft' | 'published' })
                }
                className="w-full px-2.5 py-1.5 bg-white border border-black/15 rounded-lg"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div>
              <label className="block text-[#5D5D66] mb-1">RW Publish State</label>
              <select
                value={draft.rwStatus || 'draft'}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    rwStatus: e.target.value as 'draft' | 'translation_needed' | 'published'
                  })
                }
                className="w-full px-2.5 py-1.5 bg-white border border-black/15 rounded-lg"
              >
                <option value="draft">Draft</option>
                <option value="translation_needed">Translation Needed</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div className="flex flex-col justify-end gap-1.5">
              <label className="inline-flex items-center gap-1.5 text-[#0D0D0F]">
                <input
                  type="checkbox"
                  checked={draft.isSample}
                  onChange={(e) => setDraft({ ...draft, isSample: e.target.checked })}
                />
                <span>Free Sample</span>
              </label>
              <label className="inline-flex items-center gap-1.5 text-[#0D0D0F]">
                <input
                  type="checkbox"
                  checked={draft.isRequired !== false}
                  onChange={(e) => setDraft({ ...draft, isRequired: e.target.checked })}
                />
                <span>Required</span>
              </label>
            </div>
          </div>

          {/* Language Switcher + Helpers */}
          <div className="bg-white border border-black/[0.08] rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-black/[0.06]">
              <div className="flex items-center gap-1 p-1 bg-[#F4F5F7] rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveLang('en')}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-lg ${
                    activeLang === 'en' ? 'bg-white text-[#0D0D0F] shadow-xs' : 'text-[#5D5D66]'
                  }`}
                >
                  English (EN) · {blocksEn.length} blocks
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLang('rw')}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-lg ${
                    activeLang === 'rw' ? 'bg-white text-[#0D0D0F] shadow-xs' : 'text-[#5D5D66]'
                  }`}
                >
                  Kinyarwanda (RW) · {blocksRw.length} blocks
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyEnToRwDraft}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-black/15 rounded-lg hover:border-[#0D7A5F]"
                >
                  <Languages className="w-3.5 h-3.5 text-[#0D7A5F]" />
                  <span>Copy EN Structure → RW Draft</span>
                </button>

                {selectedCourseId === 'challenge-28' && draft.dayNumber <= 28 && (
                  <button
                    type="button"
                    onClick={() => handleLoadStaticBlueprintDay(draft.dayNumber)}
                    className="px-3 py-1.5 text-xs font-medium border border-black/15 rounded-lg hover:border-black/35"
                  >
                    Load Day {draft.dayNumber} Static Content
                  </button>
                )}

                {lessons.some((l) => l.id === draft.id) && (
                  <button
                    type="button"
                    onClick={handleDeleteLesson}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#DC2626] border border-[#DC2626]/25 rounded-lg hover:bg-[#FEF2F2]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>

            {/* Title, Summary & Objectives for active language */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Lesson Title ({activeLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={activeLang === 'en' ? draft.titleEn : draft.titleRw}
                  onChange={(e) =>
                    setDraft(
                      activeLang === 'en'
                        ? { ...draft, titleEn: e.target.value }
                        : { ...draft, titleRw: e.target.value }
                    )
                  }
                  className="w-full px-3.5 py-2 text-sm border border-black/15 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Scheduled Release Date (Optional)
                </label>
                <input
                  type="date"
                  value={draft.releaseAt || ''}
                  onChange={(e) => setDraft({ ...draft, releaseAt: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-black/15 rounded-lg"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1">
                  Lesson Introduction / Summary ({activeLang.toUpperCase()})
                </label>
                <textarea
                  rows={2}
                  value={activeLang === 'en' ? draft.summaryEn || '' : draft.summaryRw || ''}
                  onChange={(e) =>
                    setDraft(
                      activeLang === 'en'
                        ? { ...draft, summaryEn: e.target.value }
                        : { ...draft, summaryRw: e.target.value }
                    )
                  }
                  className="w-full px-3.5 py-2 text-sm border border-black/15 rounded-lg"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1">
                  Learning Objectives ({activeLang.toUpperCase()}, one per line)
                </label>
                <textarea
                  rows={2}
                  value={
                    (activeLang === 'en' ? draft.objectivesEn : draft.objectivesRw)?.join('\n') || ''
                  }
                  onChange={(e) => {
                    const lines = e.target.value.split('\n');
                    setDraft(
                      activeLang === 'en'
                        ? { ...draft, objectivesEn: lines }
                        : { ...draft, objectivesRw: lines }
                    );
                  }}
                  className="w-full px-3.5 py-2 text-xs font-mono border border-black/15 rounded-lg"
                />
              </div>
            </div>

            {/* Templates & Add Block Toolbar */}
            <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={newBlockType}
                  onChange={(e) => setNewBlockType(e.target.value as LessonBlockType)}
                  className="px-3 py-2 text-xs border border-black/15 rounded-lg bg-white"
                >
                  {BLOCK_TYPE_META.map((meta) => (
                    <option key={meta.type} value={meta.type}>
                      {meta.label} — {meta.description}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setActiveBlocks((prev) => [...prev, createDefaultBlock(newBlockType)])
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0D0D0F] rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Block</span>
                </button>
              </div>

              <select
                defaultValue=""
                onChange={(e) => {
                  const preset = LESSON_STARTER_TEMPLATES.find((p) => p.id === e.target.value);
                  if (preset) {
                    setActiveBlocks((prev) => [...prev, ...preset.buildBlocks()]);
                    e.target.value = '';
                  }
                }}
                className="px-3 py-2 text-xs border border-black/15 rounded-lg bg-white"
              >
                <option value="" disabled>
                  + Insert Reusable Lesson Template...
                </option>
                {LESSON_STARTER_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Blocks Stack */}
            <div className="space-y-4">
              {activeBlocks.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-black/15 rounded-xl text-xs text-[#5D5D66]">
                  No blocks in {activeLang.toUpperCase()} yet. Use &ldquo;Add Block&rdquo; or insert a starter template above.
                </div>
              ) : (
                activeBlocks.map((block, idx) => {
                  const meta = BLOCK_TYPE_META.find((m) => m.type === block.type);
                  return (
                    <div
                      key={block.id}
                      className="border border-black/[0.1] rounded-xl p-4 bg-white space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-black/[0.06]">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-[#0D7A5F] tabular-nums">
                            #{idx + 1}
                          </span>
                          <span className="font-semibold text-[#0D0D0F]">
                            {meta?.label || block.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveBlock(idx, -1)}
                            disabled={idx === 0}
                            className="p-1.5 border border-black/10 rounded hover:bg-[#F9F9FB] disabled:opacity-40"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveBlock(idx, 1)}
                            disabled={idx === activeBlocks.length - 1}
                            className="p-1.5 border border-black/10 rounded hover:bg-[#F9F9FB] disabled:opacity-40"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveBlocks((prev) => {
                                const clone = { ...block, id: makeBlockId() };
                                const copy = [...prev];
                                copy.splice(idx + 1, 0, clone);
                                return copy;
                              })
                            }
                            className="p-1.5 border border-black/10 rounded hover:bg-[#F9F9FB]"
                            title="Duplicate Block"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveBlocks((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="p-1.5 border border-black/10 rounded hover:bg-[#FEF2F2] text-[#DC2626]"
                            title="Delete Block"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Common Title Field */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[#5D5D66] mb-1">Block Heading / Title</label>
                          <input
                            type="text"
                            value={block.title || ''}
                            onChange={(e) => updateBlock(idx, { title: e.target.value })}
                            className="w-full px-3 py-1.5 border border-black/15 rounded-lg"
                          />
                        </div>

                        {block.type === 'callout' && (
                          <div>
                            <label className="block text-[#5D5D66] mb-1">Callout Style</label>
                            <select
                              value={block.variant || 'note'}
                              onChange={(e) =>
                                updateBlock(idx, {
                                  variant: e.target.value as LessonBlock['variant']
                                })
                              }
                              className="w-full px-3 py-1.5 border border-black/15 rounded-lg bg-white"
                            >
                              <option value="rwanda_context">Rwanda Context</option>
                              <option value="tip">Practical Tip</option>
                              <option value="warning">Mistake / Warning</option>
                              <option value="note">Reference Note</option>
                            </select>
                          </div>
                        )}

                        {block.type === 'code' && (
                          <div>
                            <label className="block text-[#5D5D66] mb-1">Language / Format</label>
                            <input
                              type="text"
                              value={block.language || 'prompt'}
                              onChange={(e) => updateBlock(idx, { language: e.target.value })}
                              className="w-full px-3 py-1.5 border border-black/15 rounded-lg font-mono"
                            />
                          </div>
                        )}
                      </div>

                      {/* Type-Specific Editors */}
                      {(block.type === 'rich_text' ||
                        block.type === 'callout' ||
                        block.type === 'assignment' ||
                        block.type === 'reflection') && (
                        <textarea
                          rows={4}
                          value={block.body || ''}
                          onChange={(e) => updateBlock(idx, { body: e.target.value })}
                          placeholder="Write instructional content..."
                          className="w-full px-3 py-2 text-xs border border-black/15 rounded-lg"
                        />
                      )}

                      {block.type === 'code' && (
                        <textarea
                          rows={5}
                          value={block.code || ''}
                          onChange={(e) => updateBlock(idx, { code: e.target.value })}
                          placeholder="Prompt formula or code snippet..."
                          className="w-full px-3 py-2 text-xs font-mono border border-black/15 rounded-lg bg-[#F9F9FB]"
                        />
                      )}

                      {(block.type === 'image' ||
                        block.type === 'video' ||
                        block.type === 'audio' ||
                        block.type === 'download' ||
                        block.type === 'external_resource') && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-[#5D5D66] mb-1">
                              Resource URL (or upload file)
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={block.url || ''}
                                onChange={(e) => updateBlock(idx, { url: e.target.value })}
                                placeholder="https://... or /api/files/..."
                                className="flex-1 min-w-0 px-3 py-1.5 border border-black/15 rounded-lg"
                              />
                              {block.type !== 'external_resource' && (
                                <label className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#F4F5F7] border border-black/15 rounded-lg cursor-pointer hover:bg-[#ECEEF2] shrink-0 font-medium text-[#0D0D0F]">
                                  <Upload className="w-3.5 h-3.5 text-[#0D7A5F]" />
                                  <span>
                                    {uploadingBlockId === block.id ? 'Uploading...' : 'Upload'}
                                  </span>
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept={
                                      block.type === 'download'
                                        ? UPLOAD_RULES.resource.acceptAttr
                                        : UPLOAD_RULES.course_media.acceptAttr
                                    }
                                    disabled={uploadingBlockId === block.id}
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      e.target.value = '';
                                      if (!file) return;
                                      setUploadingBlockId(block.id);
                                      setStatusMessage(null);
                                      try {
                                        const scope =
                                          block.type === 'download' ? 'resource' : 'course_media';
                                        const uploaded = await uploadPlatformFile(
                                          file,
                                          scope,
                                          user
                                        );
                                        updateBlock(idx, {
                                          url: uploaded.url,
                                          ...(block.type === 'download' && !block.label
                                            ? { label: `Download ${uploaded.filename}` }
                                            : {})
                                        });
                                        setStatusMessage(`Uploaded ${uploaded.filename}`);
                                      } catch (err) {
                                        setStatusMessage(
                                          err instanceof Error ? err.message : 'File upload failed.'
                                        );
                                      } finally {
                                        setUploadingBlockId(null);
                                      }
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[#5D5D66] mb-1">
                              {block.type === 'download' || block.type === 'external_resource'
                                ? 'Button Label'
                                : 'Caption'}
                            </label>
                            <input
                              type="text"
                              value={
                                block.type === 'download' || block.type === 'external_resource'
                                  ? block.label || ''
                                  : block.caption || ''
                              }
                              onChange={(e) =>
                                updateBlock(
                                  idx,
                                  block.type === 'download' || block.type === 'external_resource'
                                    ? { label: e.target.value }
                                    : { caption: e.target.value }
                                )
                              }
                              className="w-full px-3 py-1.5 border border-black/15 rounded-lg"
                            />
                          </div>
                          {block.type === 'image' && (
                            <div className="md:col-span-2">
                              <label className="block text-[#5D5D66] mb-1">Alt Text</label>
                              <input
                                type="text"
                                value={block.altText || ''}
                                onChange={(e) => updateBlock(idx, { altText: e.target.value })}
                                className="w-full px-3 py-1.5 border border-black/15 rounded-lg"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {block.type === 'interactive' && (
                        <div className="space-y-2 text-xs">
                          <input
                            type="text"
                            value={block.body || ''}
                            onChange={(e) => updateBlock(idx, { body: e.target.value })}
                            placeholder="Sandbox instruction for learner..."
                            className="w-full px-3 py-1.5 border border-black/15 rounded-lg"
                          />
                          <textarea
                            rows={3}
                            value={block.promptTemplate || ''}
                            onChange={(e) => updateBlock(idx, { promptTemplate: e.target.value })}
                            placeholder="Editable starter prompt template..."
                            className="w-full px-3 py-2 font-mono border border-black/15 rounded-lg bg-[#F9F9FB]"
                          />
                        </div>
                      )}

                      {block.type === 'checklist' && (
                        <div className="space-y-2 text-xs">
                          <input
                            type="text"
                            value={block.body || ''}
                            onChange={(e) => updateBlock(idx, { body: e.target.value })}
                            placeholder="Optional context sentence..."
                            className="w-full px-3 py-1.5 border border-black/15 rounded-lg"
                          />
                          <label className="block text-[#5D5D66]">Checklist items (one per line)</label>
                          <textarea
                            rows={3}
                            value={(block.items || []).join('\n')}
                            onChange={(e) =>
                              updateBlock(idx, { items: e.target.value.split('\n') })
                            }
                            className="w-full px-3 py-2 border border-black/15 rounded-lg"
                          />
                        </div>
                      )}

                      {block.type === 'table' && (
                        <div className="space-y-2 text-xs">
                          <label className="block text-[#5D5D66]">
                            Columns (comma-separated headers)
                          </label>
                          <input
                            type="text"
                            value={(block.headers || []).join(', ')}
                            onChange={(e) =>
                              updateBlock(idx, {
                                headers: e.target.value.split(',').map((s) => s.trim())
                              })
                            }
                            className="w-full px-3 py-1.5 border border-black/15 rounded-lg"
                          />
                          <label className="block text-[#5D5D66]">
                            Rows (one row per line, columns separated by | )
                          </label>
                          <textarea
                            rows={3}
                            value={(block.rows || []).map((r) => r.join(' | ')).join('\n')}
                            onChange={(e) =>
                              updateBlock(idx, {
                                rows: e.target.value
                                  .split('\n')
                                  .filter((l) => l.trim().length > 0)
                                  .map((line) => line.split('|').map((c) => c.trim()))
                              })
                            }
                            className="w-full px-3 py-2 font-mono border border-black/15 rounded-lg"
                          />
                        </div>
                      )}

                      {block.type === 'quiz' && (
                        <div className="space-y-2.5 text-xs">
                          <input
                            type="text"
                            value={block.question || ''}
                            onChange={(e) => updateBlock(idx, { question: e.target.value })}
                            placeholder="Quiz question..."
                            className="w-full px-3 py-1.5 border border-black/15 rounded-lg font-medium"
                          />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <textarea
                              rows={3}
                              value={(block.options || []).join('\n')}
                              onChange={(e) =>
                                updateBlock(idx, { options: e.target.value.split('\n') })
                              }
                              placeholder="Options (one per line)..."
                              className="w-full px-3 py-1.5 border border-black/15 rounded-lg"
                            />
                            <div className="space-y-2">
                              <div>
                                <label className="block text-[#5D5D66] mb-1">
                                  Correct Option Index (0-based)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={Math.max(0, (block.options?.length || 1) - 1)}
                                  value={block.correctIndex ?? 0}
                                  onChange={(e) =>
                                    updateBlock(idx, { correctIndex: Number(e.target.value) })
                                  }
                                  className="w-full px-3 py-1.5 border border-black/15 rounded-lg font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[#5D5D66] mb-1">
                                  Feedback Explanation
                                </label>
                                <input
                                  type="text"
                                  value={block.explanation || ''}
                                  onChange={(e) =>
                                    updateBlock(idx, { explanation: e.target.value })
                                  }
                                  className="w-full px-3 py-1.5 border border-black/15 rounded-lg"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
