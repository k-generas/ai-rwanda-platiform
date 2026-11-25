import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Copy,
  Edit3,
  Eye,
  FolderPlus,
  Layers,
  Plus,
  Save,
  Trash2,
  Upload,
  XCircle
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  deleteDoc,
  deleteField,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import type {
  Course,
  CourseModule,
  Language,
  LearningPath,
  StructuredLessonRecord
} from '../../types';
import { COURSES } from '../../data/curriculum';
import { LESSONS_28 } from '../../data/lessons28';
import {
  convertStaticLessonToBlocks,
  evaluateCoursePublishChecklist,
  LESSON_STARTER_TEMPLATES,
  parseLessonBlocks,
  serializeLessonBlocks
} from '../../lib/lessonBlocks';
import { formatReleaseDateLabel, parseReleaseAtMs } from '../../lib/domain';
import { hasPermission } from '../../lib/permissions';
import { UPLOAD_RULES, uploadPlatformFile } from '../../lib/uploads';
import { LessonBlocksRenderer } from '../LessonBlocksRenderer';
import type { AuditWriteParams, ControlCenterData } from './ControlCenterTypes';

interface CourseBuilderPanelProps {
  initialTab?: 'overview' | 'curriculum' | 'checklist' | 'paths' | 'preview';
  user: User;
  data: ControlCenterData;
  onWriteAudit: (params: AuditWriteParams) => Promise<void>;
  onRefreshData: () => Promise<void>;
  onRefreshPublic: () => void;
  onOpenLessonEditor: (courseId: string, lessonId: string) => void;
}

const WEEK_TITLES: Array<{ week: number; titleEn: string; titleRw: string; summaryEn: string; summaryRw: string }> = [
  {
    week: 1,
    titleEn: 'Week 1: AI Foundations & Prompt Craft',
    titleRw: 'Icyumweru cya 1: Ibanze rya AI no Kwandika Amabwiriza',
    summaryEn: 'Days 1–7: Understand how AI models work and write structured prompts for daily productivity.',
    summaryRw: 'Iminsi 1–7: Sobanukirwa imikorere ya AI no kwandika amabwiriza anoze.'
  },
  {
    week: 2,
    titleEn: 'Week 2: Practical Workflows & Study / Office Tools',
    titleRw: 'Icyumweru cya 2: Imikorere Ngiro mu Masomo n’Akazi',
    summaryEn: 'Days 8–14: Apply AI across documents, spreadsheets, emails, and research in Rwanda contexts.',
    summaryRw: 'Iminsi 8–14: Koresha AI mu nyandiko, imbonerahamwe, n’ubushakashatsi.'
  },
  {
    week: 3,
    titleEn: 'Week 3: Automation, Data & No-Code Connectors',
    titleRw: 'Icyumweru cya 3: Imiyoboro Yikoresha n’Amakuru',
    summaryEn: 'Days 15–21: Connect forms, Google Sheets, and AI tools without writing code.',
    summaryRw: 'Iminsi 15–21: Huza amafishi, Google Sheets na AI utanditse kode.'
  },
  {
    week: 4,
    titleEn: 'Week 4: Applied Projects, Verification & Ethics',
    titleRw: 'Icyumweru cya 4: Imishinga Ngiro n’Ubuziranenge',
    summaryEn: 'Days 22–28: Build, test, document, and verify your Rwanda-focused capstone workflow.',
    summaryRw: 'Iminsi 22–28: Kubaka, kugerageza, no kwemeza umushinga wawe.'
  }
];

export function CourseBuilderPanel({
  initialTab = 'overview',
  user,
  data,
  onWriteAudit,
  onRefreshData,
  onRefreshPublic,
  onOpenLessonEditor
}: CourseBuilderPanelProps) {
  const { courses, modules, lessons, learningPaths, access } = data;
  const catalog = courses.length > 0 ? courses : COURSES;
  const canPublish = hasPermission(access, 'publish_courses');

  const [tab, setTab] = useState<'overview' | 'curriculum' | 'checklist' | 'paths' | 'preview'>(initialTab);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(catalog[0]?.id || 'challenge-28');
  const [busyMsg, setBusyMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Sync tab when parent jumps directly to paths
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const activeCourse = useMemo(
    () => catalog.find((c) => c.id === selectedCourseId) ?? catalog[0],
    [catalog, selectedCourseId]
  );

  // Course metadata draft
  const [courseDraft, setCourseDraft] = useState<Course>(activeCourse);
  useEffect(() => {
    if (activeCourse) {
      setCourseDraft(activeCourse);
    }
  }, [activeCourse]);

  // New Course Modal state
  const [newCourseOpen, setNewCourseOpen] = useState(false);
  const [newCode, setNewCode] = useState('AI-202');
  const [newTitleEn, setNewTitleEn] = useState('');
  const [newTitleRw, setNewTitleRw] = useState('');
  const [newCategory, setNewCategory] = useState<Course['category']>('prompting');
  const [newPrice, setNewPrice] = useState(1000);
  const [newDays, setNewDays] = useState(14);

  // New Module state
  const [newModTitleEn, setNewModTitleEn] = useState('');
  const [newModTitleRw, setNewModTitleRw] = useState('');
  const [newModReleaseAt, setNewModReleaseAt] = useState('');
  const [uploadingField, setUploadingField] = useState<'cover' | 'video' | null>(null);

  // Learning Path Form state
  const [editingPathId, setEditingPathId] = useState<string>('');
  const [pathTitleEn, setPathTitleEn] = useState('');
  const [pathTitleRw, setPathTitleRw] = useState('');
  const [pathDescEn, setPathDescEn] = useState('');
  const [pathDescRw, setPathDescRw] = useState('');
  const [pathCourseIds, setPathCourseIds] = useState<string[]>([]);
  const [pathPublished, setPathPublished] = useState(true);

  // Preview state
  const [previewLang, setPreviewLang] = useState<Language>('en');
  const [previewLessonId, setPreviewLessonId] = useState<string>('');

  const courseModules = useMemo(
    () =>
      modules
        .filter((m) => m.courseId === activeCourse.id)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [modules, activeCourse.id]
  );

  const courseLessons = useMemo(
    () =>
      lessons
        .filter((l) => l.courseId === activeCourse.id)
        .sort((a, b) => (a.dayNumber ?? 0) - (b.dayNumber ?? 0) || (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
    [lessons, activeCourse.id]
  );

  const checklist = useMemo(
    () => evaluateCoursePublishChecklist(courseDraft, modules, lessons),
    [courseDraft, modules, lessons]
  );

  const buildFirestoreCoursePayload = (c: Course, overrideStatus?: Course['status']) => ({
    id: c.id,
    slug: c.slug,
    code: c.code,
    status: overrideStatus ?? c.status,
    category: c.category,
    visibility: c.visibility || 'public',
    isFree: Boolean(c.isFree),
    priceRwf: c.isFree ? 0 : Math.max(0, Number(c.priceRwf || 0)),
    durationDays: Math.max(1, Number(c.durationDays || 1)),
    capacity: Math.max(0, Number(c.capacity ?? 0)),
    certificateEligible: c.certificateEligible !== false,
    levelRange: c.levelRange || 'Levels 1–2',
    ownerUid: c.ownerUid || user.uid,
    ...(c.startDate ? { startDate: c.startDate } : {}),
    ...(c.endDate ? { endDate: c.endDate } : {}),
    ...(c.coverImageUrl ? { coverImageUrl: c.coverImageUrl } : {}),
    ...(c.promoVideoUrl ? { promoVideoUrl: c.promoVideoUrl } : {}),
    ...(c.prerequisitesText ? { prerequisitesText: c.prerequisitesText } : {}),
    ...(c.seoTitle ? { seoTitle: c.seoTitle } : {}),
    ...(c.seoDescription ? { seoDescription: c.seoDescription } : {}),
    titleEn: c.title.en.trim(),
    titleRw: c.title.rw.trim() || c.title.en.trim(),
    subtitleEn: c.subtitle.en.trim(),
    subtitleRw: c.subtitle.rw.trim() || c.subtitle.en.trim(),
    descriptionEn: c.description.en.trim(),
    descriptionRw: c.description.rw.trim() || c.description.en.trim(),
    outcomesEn: c.outcomes.en.filter((s) => s.trim().length > 0).slice(0, 15),
    outcomesRw: c.outcomes.rw.filter((s) => s.trim().length > 0).slice(0, 15),
    updatedAt: serverTimestamp()
  });

  const handleSaveCourseMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setBusyMsg(null);
    try {
      await setDoc(doc(db, 'courses', courseDraft.id), buildFirestoreCoursePayload(courseDraft));
      await onWriteAudit({
        action: 'UPDATE_COURSE_METADATA',
        targetCollection: 'courses',
        targetId: courseDraft.id,
        newState: `${courseDraft.code} (${courseDraft.status})`,
        summary: `Saved course metadata & settings for ${courseDraft.title.en}`
      });
      onRefreshPublic();
      await onRefreshData();
      setBusyMsg('Course metadata saved to Firestore.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `courses/${courseDraft.id}`);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateNewCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const slug = newTitleEn
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60) || `course-${Date.now()}`;
    const id = `course_${Date.now().toString(36)}`;
    const newCourse: Course = {
      id,
      slug,
      code: newCode.trim() || 'AI-NEW',
      status: 'draft',
      category: newCategory,
      visibility: 'public',
      isFree: newPrice === 0,
      priceRwf: newPrice,
      durationDays: newDays,
      capacity: 100,
      certificateEligible: true,
      levelRange: 'Levels 1–2',
      ownerUid: user.uid,
      title: { en: newTitleEn.trim(), rw: newTitleRw.trim() || newTitleEn.trim() },
      subtitle: {
        en: 'Practical bilingual AI training tailored for Rwanda.',
        rw: 'Amasomo ngiro ya AI mu Rwanda.'
      },
      description: {
        en: 'Structured hands-on programme built in the Course Builder.',
        rw: 'Gahunda y’inyigisho ngiro yateguwe ku rubuga.'
      },
      outcomes: {
        en: ['Apply practical workflows on real tasks'],
        rw: ['Gukoresha AI mu mirimo ya buri munsi']
      },
      audience: { en: ['Students', 'Professionals'], rw: ['Abanyeshuri', 'Abakozi'] },
      deviceNote: {
        en: 'Works on smartphone and computer with free AI tiers.',
        rw: 'Bikora kuri telefoni na mudasobwa.'
      }
    };

    try {
      await setDoc(doc(db, 'courses', id), buildFirestoreCoursePayload(newCourse));
      await onWriteAudit({
        action: 'CREATE_COURSE',
        targetCollection: 'courses',
        targetId: id,
        newState: 'draft',
        summary: `Created new course ${newCourse.code}: ${newCourse.title.en}`
      });
      setSelectedCourseId(id);
      setNewCourseOpen(false);
      setNewTitleEn('');
      setNewTitleRw('');
      onRefreshPublic();
      await onRefreshData();
      setTab('curriculum');
      setBusyMsg(`Created draft course ${newCourse.code}. Now add modules and lessons.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `courses/${id}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDuplicateCourse = async () => {
    setBusy(true);
    setBusyMsg(null);
    const newCourseId = `${activeCourse.id}_copy_${Date.now().toString(36)}`;
    const clonedCourse: Course = {
      ...courseDraft,
      id: newCourseId,
      slug: `${courseDraft.slug}-copy-${Date.now().toString(36).slice(-4)}`,
      code: `${courseDraft.code}-COPY`,
      status: 'draft',
      title: {
        en: `${courseDraft.title.en} (Copy)`,
        rw: `${courseDraft.title.rw} (Kopiyi)`
      }
    };

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'courses', newCourseId), buildFirestoreCoursePayload(clonedCourse));

      const modIdMap = new Map<string, string>();
      courseModules.forEach((mod, idx) => {
        const nextModId = `${newCourseId}_mod_${idx + 1}`;
        modIdMap.set(mod.id, nextModId);
        batch.set(doc(db, 'modules', nextModId), {
          id: nextModId,
          courseId: newCourseId,
          orderIndex: mod.orderIndex,
          titleEn: mod.titleEn,
          titleRw: mod.titleRw,
          summaryEn: mod.summaryEn || '',
          summaryRw: mod.summaryRw || '',
          ...(mod.releaseAt ? { releaseAt: mod.releaseAt } : {}),
          releaseAtMs: mod.releaseAtMs ?? parseReleaseAtMs(mod.releaseAt) ?? 0,
          isPublished: false,
          updatedAt: serverTimestamp()
        });
      });

      courseLessons.slice(0, 35).forEach((les, idx) => {
        const nextLessonId = `${newCourseId}_les_${idx + 1}`;
        batch.set(doc(db, 'lessons', nextLessonId), {
          ...les,
          id: nextLessonId,
          courseId: newCourseId,
          moduleId: les.moduleId ? modIdMap.get(les.moduleId) || '' : '',
          releaseAtMs: les.releaseAtMs ?? parseReleaseAtMs(les.releaseAt) ?? 0,
          enStatus: 'draft',
          rwStatus: 'draft',
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      await onWriteAudit({
        action: 'DUPLICATE_COURSE',
        targetCollection: 'courses',
        targetId: newCourseId,
        newState: 'draft',
        summary: `Duplicated ${courseDraft.code} (${courseModules.length} modules, ${courseLessons.length} lessons) as ${clonedCourse.code}`
      });
      setSelectedCourseId(newCourseId);
      onRefreshPublic();
      await onRefreshData();
      setBusyMsg(`Duplicated into draft course ${clonedCourse.code}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `courses/${newCourseId}`);
    } finally {
      setBusy(false);
    }
  };

  const handleImport28DayBlueprint = async () => {
    setBusy(true);
    setBusyMsg('Importing 4 modules and 28 bilingual structured lessons...');
    try {
      // 1. Ensure course itself is synced + 4 weekly modules
      const modBatch = writeBatch(db);
      modBatch.set(doc(db, 'courses', courseDraft.id), buildFirestoreCoursePayload(courseDraft));

      const modIdByWeek = new Map<number, string>();
      WEEK_TITLES.forEach((w, idx) => {
        const modId = `mod_${courseDraft.id}_w${w.week}`;
        modIdByWeek.set(w.week, modId);
        modBatch.set(doc(db, 'modules', modId), {
          id: modId,
          courseId: courseDraft.id,
          orderIndex: idx,
          titleEn: w.titleEn,
          titleRw: w.titleRw,
          summaryEn: w.summaryEn,
          summaryRw: w.summaryRw,
          releaseAtMs: 0,
          isPublished: true,
          updatedAt: serverTimestamp()
        });
      });
      await modBatch.commit();

      // 2. Import 28 lessons in two batches of 14
      for (const slice of [LESSONS_28.slice(0, 14), LESSONS_28.slice(14, 28)]) {
        const batch = writeBatch(db);
        slice.forEach((l) => {
          const lessonId = `${courseDraft.id}_day_${l.dayNumber}`;
          const enBlocks = convertStaticLessonToBlocks(l, 'en');
          const rwBlocks = convertStaticLessonToBlocks(l, 'rw');
          batch.set(doc(db, 'lessons', lessonId), {
            id: lessonId,
            courseId: courseDraft.id,
            moduleId: modIdByWeek.get(l.weekNumber) || '',
            orderIndex: l.dayNumber - 1,
            dayNumber: l.dayNumber,
            weekNumber: l.weekNumber,
            isSample: l.isSample,
            isRequired: true,
            estimatedMinutes: l.durationMinutes,
            enStatus: 'published',
            rwStatus: 'published',
            releaseAtMs: 0,
            titleEn: l.title.en,
            titleRw: l.title.rw,
            summaryEn: l.introduction.en.slice(0, 3900),
            summaryRw: l.introduction.rw.slice(0, 3900),
            objectivesEn: l.objectives.en.slice(0, 20),
            objectivesRw: l.objectives.rw.slice(0, 20),
            blocksEnJson: serializeLessonBlocks(enBlocks).slice(0, 199000),
            blocksRwJson: serializeLessonBlocks(rwBlocks).slice(0, 199000),
            updatedAt: serverTimestamp()
          });
        });
        await batch.commit();
      }

      await onWriteAudit({
        action: 'IMPORT_28DAY_STRUCTURE',
        targetCollection: 'courses',
        targetId: courseDraft.id,
        newState: '4 modules, 28 structured lessons imported',
        summary: `Imported 28-Day Blueprint modules & structured blocks into ${courseDraft.code}`
      });
      onRefreshPublic();
      await onRefreshData();
      setBusyMsg('Imported 4 weekly modules and all 28 structured EN/RW lessons.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `courses/${courseDraft.id}`);
    } finally {
      setBusy(false);
    }
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModTitleEn.trim()) return;
    const modId = `mod_${Date.now().toString(36)}`;
    const trimmedRelease = newModReleaseAt.trim();
    const releaseAtMs = parseReleaseAtMs(trimmedRelease) ?? 0;
    try {
      await setDoc(doc(db, 'modules', modId), {
        id: modId,
        courseId: activeCourse.id,
        orderIndex: courseModules.length,
        titleEn: newModTitleEn.trim(),
        titleRw: newModTitleRw.trim() || newModTitleEn.trim(),
        ...(trimmedRelease ? { releaseAt: trimmedRelease } : {}),
        releaseAtMs,
        isPublished: true,
        updatedAt: serverTimestamp()
      });
      setNewModTitleEn('');
      setNewModTitleRw('');
      setNewModReleaseAt('');
      onRefreshPublic();
      await onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `modules/${modId}`);
    }
  };

  const handleReorderModule = async (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= courseModules.length) return;
    const a = courseModules[idx];
    const b = courseModules[targetIdx];
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'modules', a.id), { orderIndex: b.orderIndex, updatedAt: serverTimestamp() });
      batch.update(doc(db, 'modules', b.id), { orderIndex: a.orderIndex, updatedAt: serverTimestamp() });
      await batch.commit();
      onRefreshPublic();
      await onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `modules/${a.id}`);
    }
  };

  const handleAddLessonToModule = async (moduleId: string, weekIndex: number) => {
    const nextDay =
      courseLessons.length > 0
        ? Math.max(...courseLessons.map((l) => l.dayNumber || 1)) + 1
        : 1;
    const lessonId = `${activeCourse.id}_les_${Date.now().toString(36)}`;
    const starterBlocks = LESSON_STARTER_TEMPLATES[0].buildBlocks();
    try {
      await setDoc(doc(db, 'lessons', lessonId), {
        id: lessonId,
        courseId: activeCourse.id,
        moduleId,
        orderIndex: courseLessons.filter((l) => l.moduleId === moduleId).length,
        dayNumber: nextDay,
        weekNumber: Math.max(1, weekIndex),
        isSample: nextDay === 1,
        isRequired: true,
        estimatedMinutes: 15,
        enStatus: 'draft',
        rwStatus: 'translation_needed',
        releaseAtMs: 0,
        titleEn: `Lesson ${nextDay}: Untitled Lesson`,
        titleRw: `Isomo rya ${nextDay}: Inyigisho Nshya`,
        summaryEn: 'Add introduction summary in the block editor.',
        summaryRw: 'Ongeraho incamake y’isomo.',
        blocksEnJson: serializeLessonBlocks(starterBlocks),
        blocksRwJson: serializeLessonBlocks([]),
        updatedAt: serverTimestamp()
      });
      await onRefreshData();
      onRefreshPublic();
      onOpenLessonEditor(activeCourse.id, lessonId);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `lessons/${lessonId}`);
    }
  };

  const handleUpdateCourseStatus = async (nextStatus: Course['status']) => {
    if (!canPublish) return;
    try {
      await setDoc(
        doc(db, 'courses', courseDraft.id),
        buildFirestoreCoursePayload(courseDraft, nextStatus)
      );
      await onWriteAudit({
        action: 'COURSE_STATUS_CHANGE',
        targetCollection: 'courses',
        targetId: courseDraft.id,
        previousState: courseDraft.status,
        newState: nextStatus,
        summary: `Changed ${courseDraft.code} publication status to ${nextStatus}`
      });
      onRefreshPublic();
      await onRefreshData();
      setBusyMsg(`Course status updated to "${nextStatus}".`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `courses/${courseDraft.id}`);
    }
  };

  const handleSaveLearningPath = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingPathId || `path_${Date.now().toString(36)}`;
    try {
      await setDoc(doc(db, 'learningPaths', id), {
        id,
        titleEn: pathTitleEn.trim(),
        titleRw: pathTitleRw.trim() || pathTitleEn.trim(),
        descriptionEn: pathDescEn.trim(),
        descriptionRw: pathDescRw.trim() || pathDescEn.trim(),
        courseIds: pathCourseIds,
        isPublished: pathPublished,
        updatedAt: serverTimestamp()
      });
      await onWriteAudit({
        action: 'SAVE_LEARNING_PATH',
        targetCollection: 'learningPaths',
        targetId: id,
        newState: `${pathCourseIds.length} courses (${pathPublished ? 'published' : 'draft'})`,
        summary: `Saved guided learning path: ${pathTitleEn.trim()}`
      });
      setEditingPathId('');
      setPathTitleEn('');
      setPathTitleRw('');
      setPathDescEn('');
      setPathDescRw('');
      setPathCourseIds([]);
      onRefreshPublic();
      await onRefreshData();
      setBusyMsg('Guided learning path saved.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `learningPaths/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Course Switcher + Builder Actions */}
      <div className="bg-white border border-black/[0.08] rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-mono text-[#5D5D66] mb-1">
                ACTIVE COURSE WORKSPACE
              </label>
              <select
                value={activeCourse.id}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  setPreviewLessonId('');
                  setBusyMsg(null);
                }}
                className="px-3.5 py-2 text-xs font-medium border border-black/15 rounded-lg bg-white min-w-[260px]"
              >
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.status.toUpperCase()}] {c.code} — {c.title.en}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-[#5D5D66] pt-4 font-mono tabular-nums">
              {courseModules.length} modules · {courseLessons.length} structured lessons
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setNewCourseOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0D0D0F] rounded-lg hover:bg-[#232329]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Course</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleDuplicateCourse}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#0D0D0F] border border-black/15 rounded-lg hover:border-black/35 bg-white"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate Course</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F4F5F7] rounded-xl">
          {(
            [
              ['overview', '1. Overview & Settings'],
              ['curriculum', '2. Curriculum & Modules'],
              ['checklist', `3. Publishing Checklist (${checklist.passedCount}/${checklist.totalCount})`],
              ['paths', `4. Learning Paths (${learningPaths.length})`],
              ['preview', '5. Learner Preview']
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                tab === id ? 'bg-white text-[#0D0D0F] shadow-xs' : 'text-[#5D5D66] hover:text-[#0D0D0F]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {busyMsg && <p className="text-xs text-[#0D7A5F] font-medium">{busyMsg}</p>}
      </div>

      {/* TAB 1: OVERVIEW & SETTINGS */}
      {tab === 'overview' && (
        <form
          onSubmit={handleSaveCourseMetadata}
          className="bg-white border border-black/[0.08] rounded-2xl p-6 space-y-6 text-xs"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium mb-1">Course Code</label>
              <input
                type="text"
                required
                value={courseDraft.code}
                onChange={(e) => setCourseDraft({ ...courseDraft, code: e.target.value })}
                className="w-full px-3 py-2 border border-black/15 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">URL Slug</label>
              <input
                type="text"
                required
                value={courseDraft.slug}
                onChange={(e) => setCourseDraft({ ...courseDraft, slug: e.target.value })}
                className="w-full px-3 py-2 border border-black/15 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Category</label>
              <select
                value={courseDraft.category}
                onChange={(e) =>
                  setCourseDraft({
                    ...courseDraft,
                    category: e.target.value as Course['category']
                  })
                }
                className="w-full px-3 py-2 border border-black/15 rounded-lg bg-white"
              >
                <option value="foundations">Foundations (28-Day)</option>
                <option value="prompting">Prompting</option>
                <option value="automation">Automation</option>
                <option value="agents">AI Agents</option>
                <option value="industry">Industry</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-3">
              <p className="font-mono text-[#0D7A5F]">ENGLISH CATALOG METADATA</p>
              <input
                type="text"
                required
                value={courseDraft.title.en}
                onChange={(e) =>
                  setCourseDraft({
                    ...courseDraft,
                    title: { ...courseDraft.title, en: e.target.value }
                  })
                }
                placeholder="Course Title (EN)"
                className="w-full px-3 py-2 border border-black/15 rounded-lg"
              />
              <input
                type="text"
                value={courseDraft.subtitle.en}
                onChange={(e) =>
                  setCourseDraft({
                    ...courseDraft,
                    subtitle: { ...courseDraft.subtitle, en: e.target.value }
                  })
                }
                placeholder="Subtitle (EN)"
                className="w-full px-3 py-2 border border-black/15 rounded-lg"
              />
              <textarea
                rows={3}
                value={courseDraft.description.en}
                onChange={(e) =>
                  setCourseDraft({
                    ...courseDraft,
                    description: { ...courseDraft.description, en: e.target.value }
                  })
                }
                placeholder="Full Description (EN)"
                className="w-full px-3 py-2 border border-black/15 rounded-lg"
              />
              <div>
                <label className="block text-[#5D5D66] mb-1">Learning Outcomes (EN, one per line)</label>
                <textarea
                  rows={3}
                  value={courseDraft.outcomes.en.join('\n')}
                  onChange={(e) =>
                    setCourseDraft({
                      ...courseDraft,
                      outcomes: { ...courseDraft.outcomes, en: e.target.value.split('\n') }
                    })
                  }
                  className="w-full px-3 py-2 border border-black/15 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="font-mono text-[#0D7A5F]">KINYARWANDA CATALOG METADATA</p>
              <input
                type="text"
                required
                value={courseDraft.title.rw}
                onChange={(e) =>
                  setCourseDraft({
                    ...courseDraft,
                    title: { ...courseDraft.title, rw: e.target.value }
                  })
                }
                placeholder="Course Title (RW)"
                className="w-full px-3 py-2 border border-black/15 rounded-lg"
              />
              <input
                type="text"
                value={courseDraft.subtitle.rw}
                onChange={(e) =>
                  setCourseDraft({
                    ...courseDraft,
                    subtitle: { ...courseDraft.subtitle, rw: e.target.value }
                  })
                }
                placeholder="Subtitle (RW)"
                className="w-full px-3 py-2 border border-black/15 rounded-lg"
              />
              <textarea
                rows={3}
                value={courseDraft.description.rw}
                onChange={(e) =>
                  setCourseDraft({
                    ...courseDraft,
                    description: { ...courseDraft.description, rw: e.target.value }
                  })
                }
                placeholder="Full Description (RW)"
                className="w-full px-3 py-2 border border-black/15 rounded-lg"
              />
              <div>
                <label className="block text-[#5D5D66] mb-1">Learning Outcomes (RW, one per line)</label>
                <textarea
                  rows={3}
                  value={courseDraft.outcomes.rw.join('\n')}
                  onChange={(e) =>
                    setCourseDraft({
                      ...courseDraft,
                      outcomes: { ...courseDraft.outcomes, rw: e.target.value.split('\n') }
                    })
                  }
                  className="w-full px-3 py-2 border border-black/15 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Pricing, Schedule, Visibility, SEO */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-black/[0.06]">
            <div>
              <label className="block font-medium mb-1">Price (RWF)</label>
              <input
                type="number"
                min={0}
                disabled={Boolean(courseDraft.isFree)}
                value={courseDraft.isFree ? 0 : courseDraft.priceRwf}
                onChange={(e) =>
                  setCourseDraft({ ...courseDraft, priceRwf: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-black/15 rounded-lg font-mono disabled:bg-[#F4F5F7]"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Duration (Days)</label>
              <input
                type="number"
                min={1}
                max={365}
                value={courseDraft.durationDays}
                onChange={(e) =>
                  setCourseDraft({ ...courseDraft, durationDays: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-black/15 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Capacity Limit</label>
              <input
                type="number"
                min={0}
                value={courseDraft.capacity ?? 0}
                onChange={(e) =>
                  setCourseDraft({ ...courseDraft, capacity: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-black/15 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Visibility</label>
              <select
                value={courseDraft.visibility || 'public'}
                onChange={(e) =>
                  setCourseDraft({
                    ...courseDraft,
                    visibility: e.target.value as Course['visibility']
                  })
                }
                className="w-full px-3 py-2 border border-black/15 rounded-lg bg-white"
              >
                <option value="public">Public Catalog</option>
                <option value="unlisted">Unlisted Link</option>
                <option value="private">Private Cohort</option>
              </select>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={Boolean(courseDraft.isFree)}
                  onChange={(e) => setCourseDraft({ ...courseDraft, isFree: e.target.checked })}
                />
                <span>Free Course</span>
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={courseDraft.certificateEligible !== false}
                  onChange={(e) =>
                    setCourseDraft({ ...courseDraft, certificateEligible: e.target.checked })
                  }
                />
                <span>Certificate Eligible</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium mb-1">Cohort Start Date</label>
              <input
                type="date"
                value={courseDraft.startDate || ''}
                onChange={(e) => setCourseDraft({ ...courseDraft, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-black/15 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Cohort End Date</label>
              <input
                type="date"
                value={courseDraft.endDate || ''}
                onChange={(e) => setCourseDraft({ ...courseDraft, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-black/15 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Prerequisites Note</label>
              <input
                type="text"
                value={courseDraft.prerequisitesText || ''}
                onChange={(e) =>
                  setCourseDraft({ ...courseDraft, prerequisitesText: e.target.value })
                }
                placeholder="No coding required; smartphone or laptop"
                className="w-full px-3 py-2 border border-black/15 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Cover Image (URL or Upload)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={courseDraft.coverImageUrl || ''}
                  onChange={(e) =>
                    setCourseDraft({ ...courseDraft, coverImageUrl: e.target.value })
                  }
                  placeholder="https://... or /api/files/..."
                  className="flex-1 min-w-0 px-3 py-2 border border-black/15 rounded-lg"
                />
                <label className="inline-flex items-center gap-1 px-2.5 py-2 bg-[#F4F5F7] border border-black/15 rounded-lg cursor-pointer hover:bg-[#ECEEF2] shrink-0 font-medium">
                  <Upload className="w-3.5 h-3.5 text-[#0D7A5F]" />
                  <span>{uploadingField === 'cover' ? '...' : 'Upload'}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    disabled={uploadingField !== null}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      setUploadingField('cover');
                      setBusyMsg(null);
                      try {
                        const uploaded = await uploadPlatformFile(file, 'course_media', user);
                        setCourseDraft((prev) => ({ ...prev, coverImageUrl: uploaded.url }));
                        setBusyMsg(`Uploaded cover image ${uploaded.filename}. Save Course Metadata to persist.`);
                      } catch (err) {
                        setBusyMsg(err instanceof Error ? err.message : 'Cover upload failed.');
                      } finally {
                        setUploadingField(null);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
            <div>
              <label className="block font-medium mb-1">Promo Video (URL or Upload)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={courseDraft.promoVideoUrl || ''}
                  onChange={(e) =>
                    setCourseDraft({ ...courseDraft, promoVideoUrl: e.target.value })
                  }
                  placeholder="https://youtube.com/... or /api/files/..."
                  className="flex-1 min-w-0 px-3 py-2 border border-black/15 rounded-lg"
                />
                <label className="inline-flex items-center gap-1 px-2.5 py-2 bg-[#F4F5F7] border border-black/15 rounded-lg cursor-pointer hover:bg-[#ECEEF2] shrink-0 font-medium">
                  <Upload className="w-3.5 h-3.5 text-[#0D7A5F]" />
                  <span>{uploadingField === 'video' ? '...' : 'Upload'}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept={UPLOAD_RULES.course_media.acceptAttr}
                    disabled={uploadingField !== null}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      setUploadingField('video');
                      setBusyMsg(null);
                      try {
                        const uploaded = await uploadPlatformFile(file, 'course_media', user);
                        setCourseDraft((prev) => ({ ...prev, promoVideoUrl: uploaded.url }));
                        setBusyMsg(`Uploaded media ${uploaded.filename}. Save Course Metadata to persist.`);
                      } catch (err) {
                        setBusyMsg(err instanceof Error ? err.message : 'Video upload failed.');
                      } finally {
                        setUploadingField(null);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
            <div>
              <label className="block font-medium mb-1">SEO Meta Title</label>
              <input
                type="text"
                value={courseDraft.seoTitle || ''}
                onChange={(e) => setCourseDraft({ ...courseDraft, seoTitle: e.target.value })}
                className="w-full px-3 py-2 border border-black/15 rounded-lg"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium text-white bg-[#0D0D0F] rounded-lg"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{busy ? 'Saving...' : 'Save Course Metadata & Settings'}</span>
          </button>
        </form>
      )}

      {/* TAB 2: HIERARCHICAL CURRICULUM & MODULES */}
      {tab === 'curriculum' && (
        <div className="space-y-6">
          <div className="bg-white border border-black/[0.08] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-[#0D0D0F]">
                Course Modules & Lessons Hierarchy
              </h3>
              <p className="text-xs text-[#5D5D66]">
                Organize modules, toggle Free Sample previews, set completion requirements, and edit 14-type lesson blocks.
              </p>
            </div>
            {activeCourse.id === 'challenge-28' && (
              <button
                type="button"
                disabled={busy}
                onClick={handleImport28DayBlueprint}
                className="px-4 py-2 text-xs font-medium text-white bg-[#0D7A5F] rounded-lg hover:bg-[#0B664F]"
              >
                {busy ? 'Importing...' : 'Import 28-Day Blueprint Structure'}
              </button>
            )}
          </div>

          {/* Add Module Form */}
          <form
            onSubmit={handleAddModule}
            className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-4 flex flex-wrap items-center gap-3 text-xs"
          >
            <FolderPlus className="w-4 h-4 text-[#0D7A5F]" />
            <input
              type="text"
              required
              value={newModTitleEn}
              onChange={(e) => setNewModTitleEn(e.target.value)}
              placeholder="New Module Title (English)..."
              className="flex-1 min-w-[180px] px-3 py-2 bg-white border border-black/15 rounded-lg"
            />
            <input
              type="text"
              value={newModTitleRw}
              onChange={(e) => setNewModTitleRw(e.target.value)}
              placeholder="Module Title (Kinyarwanda)..."
              className="flex-1 min-w-[180px] px-3 py-2 bg-white border border-black/15 rounded-lg"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-[#5D5D66]">Release:</span>
              <input
                type="date"
                value={newModReleaseAt}
                onChange={(e) => setNewModReleaseAt(e.target.value)}
                title="Optional scheduled release date"
                className="px-2.5 py-2 bg-white border border-black/15 rounded-lg"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 font-medium text-white bg-[#0D0D0F] rounded-lg"
            >
              Add Module
            </button>
          </form>

          {/* Modules & Lessons Tree */}
          {courseModules.length === 0 ? (
            <div className="bg-white border border-black/[0.08] rounded-2xl p-8 text-center text-xs text-[#5D5D66]">
              No Firestore modules created for this course yet. Add a module above or import the 28-day structure.
            </div>
          ) : (
            <div className="space-y-4">
              {courseModules.map((mod, mIdx) => {
                const modLessons = courseLessons.filter((l) => l.moduleId === mod.id);
                return (
                  <div
                    key={mod.id}
                    className="bg-white border border-black/[0.08] rounded-2xl overflow-hidden"
                  >
                    <div className="bg-[#F9F9FB] px-5 py-4 border-b border-black/[0.06] flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-mono text-[#0D7A5F]">
                          MODULE {mIdx + 1} · {mod.isPublished ? 'PUBLISHED' : 'DRAFT'}
                          {mod.releaseAt ? ` · UNLOCKS ${formatReleaseDateLabel(mod.releaseAt, mod.releaseAtMs)}` : ''}
                        </p>
                        <h4 className="text-sm font-semibold text-[#0D0D0F]">{mod.titleEn}</h4>
                        <p className="text-xs text-[#5D5D66]">{mod.titleRw}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <input
                          type="date"
                          value={mod.releaseAt || ''}
                          aria-label={`Release date for ${mod.titleEn}`}
                          onChange={async (e) => {
                            const nextVal = e.target.value.trim();
                            const nextMs = parseReleaseAtMs(nextVal) ?? 0;
                            await updateDoc(doc(db, 'modules', mod.id), {
                              releaseAt: nextVal ? nextVal : deleteField(),
                              releaseAtMs: nextMs,
                              updatedAt: serverTimestamp()
                            });
                            onRefreshPublic();
                            await onRefreshData();
                          }}
                          className="px-2 py-1 bg-white border border-black/15 rounded-lg"
                          title="Module Scheduled Release Date"
                        />
                        <button
                          type="button"
                          onClick={() => handleReorderModule(mIdx, -1)}
                          disabled={mIdx === 0}
                          className="p-1.5 bg-white border border-black/15 rounded-lg disabled:opacity-40"
                          title="Move Module Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReorderModule(mIdx, 1)}
                          disabled={mIdx === courseModules.length - 1}
                          className="p-1.5 bg-white border border-black/15 rounded-lg disabled:opacity-40"
                          title="Move Module Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await updateDoc(doc(db, 'modules', mod.id), {
                              isPublished: !mod.isPublished,
                              updatedAt: serverTimestamp()
                            });
                            onRefreshPublic();
                            await onRefreshData();
                          }}
                          className="px-2.5 py-1.5 bg-white border border-black/15 rounded-lg"
                        >
                          {mod.isPublished ? 'Set Draft' : 'Publish Module'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddLessonToModule(mod.id, mIdx + 1)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0D0D0F] text-white rounded-lg"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Lesson</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteDoc(doc(db, 'modules', mod.id));
                            onRefreshPublic();
                            await onRefreshData();
                          }}
                          className="p-1.5 bg-white border border-[#DC2626]/25 text-[#DC2626] rounded-lg"
                          title="Delete Module"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {modLessons.length === 0 ? (
                      <p className="p-4 text-xs text-[#5D5D66]">No lessons assigned to this module yet.</p>
                    ) : (
                      <div className="divide-y divide-black/[0.06]">
                        {modLessons.map((les) => {
                          const enCount = parseLessonBlocks(les.blocksEnJson).length;
                          const rwCount = parseLessonBlocks(les.blocksRwJson).length;
                          return (
                            <div
                              key={les.id}
                              className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-[#0D0D0F]">
                                  <span className="font-mono text-[#0D7A5F] mr-2">
                                    Day {les.dayNumber}
                                  </span>
                                  {les.titleEn}
                                </p>
                                <p className="text-[#5D5D66] font-mono tabular-nums mt-0.5">
                                  {les.estimatedMinutes || 15} min · EN:{les.enStatus || 'draft'} ({enCount} blocks) · RW:{les.rwStatus || 'draft'} ({rwCount} blocks) ·{' '}
                                  {les.isSample ? 'Free Sample' : 'Enrolled Only'}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await updateDoc(doc(db, 'lessons', les.id), {
                                      isSample: !les.isSample,
                                      updatedAt: serverTimestamp()
                                    });
                                    await onRefreshData();
                                    onRefreshPublic();
                                  }}
                                  className="px-2.5 py-1 border border-black/15 rounded-lg"
                                >
                                  {les.isSample ? 'Lock Sample' : 'Make Sample'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onOpenLessonEditor(activeCourse.id, les.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-[#0D7A5F] text-white rounded-lg"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit Blocks</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PUBLISHING CHECKLIST & LIFECYCLE */}
      {tab === 'checklist' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-[#0D0D0F]">
                  Course Publishing Readiness Checklist
                </h3>
                <p className="text-xs text-[#5D5D66]">
                  All required quality & structural checks should pass before publishing to learners.
                </p>
              </div>
              <span
                className={`text-xs font-mono font-semibold ${
                  checklist.readyToPublish ? 'text-[#0D7A5F]' : 'text-[#D97706]'
                }`}
              >
                {checklist.readyToPublish ? 'READY TO PUBLISH' : 'ITEMS PENDING'}
              </span>
            </div>

            <div className="divide-y divide-black/[0.06]">
              {checklist.items.map((item) => (
                <div key={item.id} className="py-3 flex items-start gap-3 text-xs">
                  {item.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-[#0D7A5F] shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium text-[#0D0D0F]">
                      {item.label}{' '}
                      <span className="font-mono text-[10px] text-[#5D5D66]">
                        ({item.required ? 'REQUIRED' : 'RECOMMENDED'})
                      </span>
                    </p>
                    <p className="text-[#5D5D66] mt-0.5">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-[#0D0D0F]">Publication Lifecycle</h3>
            <p className="text-xs text-[#5D5D66]">
              Current status: <strong className="font-mono uppercase">{courseDraft.status}</strong>
            </p>
            <div className="grid grid-cols-1 gap-2 text-xs">
              {(
                [
                  ['draft', 'Draft (Internal Only)'],
                  ['in_review', 'In Review (Education Team)'],
                  ['active', 'Active (Published & Enrollable)'],
                  ['upcoming', 'Upcoming (Waitlist Open)'],
                  ['scheduled', 'Scheduled Release'],
                  ['archived', 'Archived (Hidden from Public)']
                ] as const
              ).map(([statusKey, label]) => (
                <button
                  key={statusKey}
                  type="button"
                  disabled={!canPublish || (statusKey === 'active' && !checklist.readyToPublish)}
                  onClick={() => handleUpdateCourseStatus(statusKey)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg border transition-colors disabled:opacity-45 ${
                    courseDraft.status === statusKey
                      ? 'bg-[#0D0D0F] text-white border-[#0D0D0F]'
                      : 'bg-white text-[#0D0D0F] border-black/15 hover:border-black/35'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {!checklist.readyToPublish && (
              <p className="text-[11px] text-[#D97706]">
                Complete all REQUIRED checklist items before setting status to Active (Published).
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: GUIDED LEARNING PATHS */}
      {tab === 'paths' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4 text-xs">
            <h3 className="text-base font-semibold text-[#0D0D0F]">
              {editingPathId ? 'Edit Learning Path' : 'Create Guided Learning Path'}
            </h3>
            <form onSubmit={handleSaveLearningPath} className="space-y-3">
              <input
                type="text"
                required
                value={pathTitleEn}
                onChange={(e) => setPathTitleEn(e.target.value)}
                placeholder="Path Title (English) e.g. Practical AI to Automation Track"
                className="w-full px-3 py-2 border border-black/15 rounded-lg"
              />
              <input
                type="text"
                value={pathTitleRw}
                onChange={(e) => setPathTitleRw(e.target.value)}
                placeholder="Path Title (Kinyarwanda)"
                className="w-full px-3 py-2 border border-black/15 rounded-lg"
              />
              <textarea
                rows={2}
                value={pathDescEn}
                onChange={(e) => setPathDescEn(e.target.value)}
                placeholder="Path Description (English)"
                className="w-full px-3 py-2 border border-black/15 rounded-lg"
              />
              <textarea
                rows={2}
                value={pathDescRw}
                onChange={(e) => setPathDescRw(e.target.value)}
                placeholder="Path Description (Kinyarwanda)"
                className="w-full px-3 py-2 border border-black/15 rounded-lg"
              />

              <div className="space-y-2 pt-2 border-t border-black/[0.06]">
                <label className="block font-medium">Ordered Courses in Path ({pathCourseIds.length})</label>
                <div className="space-y-1.5">
                  {pathCourseIds.map((cid, idx) => {
                    const c = catalog.find((x) => x.id === cid);
                    return (
                      <div
                        key={`${cid}_${idx}`}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-[#F9F9FB] rounded-lg"
                      >
                        <span className="truncate">
                          {idx + 1}. {c ? `${c.code} — ${c.title.en}` : cid}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setPathCourseIds((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-[#DC2626]"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value && !pathCourseIds.includes(e.target.value)) {
                      setPathCourseIds((prev) => [...prev, e.target.value]);
                    }
                    e.target.value = '';
                  }}
                  className="w-full px-3 py-2 border border-black/15 rounded-lg bg-white"
                >
                  <option value="" disabled>
                    + Add Course to Sequence...
                  </option>
                  {catalog.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}: {c.title.en}
                    </option>
                  ))}
                </select>
              </div>

              <label className="inline-flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  checked={pathPublished}
                  onChange={(e) => setPathPublished(e.target.checked)}
                />
                <span>Publish Path to Public Catalog</span>
              </label>

              <button
                type="submit"
                className="w-full px-4 py-2.5 font-medium text-white bg-[#0D0D0F] rounded-lg"
              >
                Save Learning Path
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-[#0D0D0F]">Configured Learning Paths</h3>
            {learningPaths.length === 0 ? (
              <p className="text-xs text-[#5D5D66]">No learning paths created yet.</p>
            ) : (
              <div className="space-y-3">
                {learningPaths.map((p) => (
                  <div
                    key={p.id}
                    className="border border-black/[0.08] rounded-xl p-4 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-[#0D0D0F]">{p.titleEn}</p>
                        <p className="text-[#5D5D66]">{p.titleRw}</p>
                      </div>
                      <span className="font-mono text-[#0D7A5F]">
                        {p.isPublished ? 'PUBLISHED' : 'DRAFT'}
                      </span>
                    </div>
                    <p className="text-[#5D5D66]">{p.descriptionEn}</p>
                    <p className="font-mono text-[#0D0D0F]">
                      Sequence: {p.courseIds.join(' → ')}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPathId(p.id);
                          setPathTitleEn(p.titleEn);
                          setPathTitleRw(p.titleRw);
                          setPathDescEn(p.descriptionEn || '');
                          setPathDescRw(p.descriptionRw || '');
                          setPathCourseIds(p.courseIds || []);
                          setPathPublished(p.isPublished);
                        }}
                        className="px-3 py-1 border border-black/15 rounded-lg"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: FULL COURSE LEARNER PREVIEW */}
      {tab === 'preview' && (
        <div className="bg-white border border-black/[0.08] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-black/[0.08]">
            <div className="flex items-center gap-2 text-xs text-[#0D7A5F] font-mono">
              <Eye className="w-4 h-4" />
              <span>FULL COURSE LEARNER PREVIEW</span>
            </div>
            <div className="flex items-center gap-1 p-1 bg-[#F4F5F7] rounded-lg">
              <button
                type="button"
                onClick={() => setPreviewLang('en')}
                className={`px-3 py-1 text-xs rounded-md ${
                  previewLang === 'en' ? 'bg-white text-[#0D0D0F]' : 'text-[#5D5D66]'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setPreviewLang('rw')}
                className={`px-3 py-1 text-xs rounded-md ${
                  previewLang === 'rw' ? 'bg-white text-[#0D0D0F]' : 'text-[#5D5D66]'
                }`}
              >
                Kinyarwanda
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 space-y-3 border border-black/[0.08] rounded-xl p-4 bg-[#F9F9FB]">
              <h4 className="text-xs font-semibold text-[#0D0D0F] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#0D7A5F]" />
                <span>Curriculum Outline</span>
              </h4>
              {courseLessons.length === 0 ? (
                <p className="text-xs text-[#5D5D66]">
                  No structured Firestore lessons yet. Use Tab 2 to add lessons or import the 28-Day Blueprint.
                </p>
              ) : (
                <div className="space-y-1 max-h-[420px] overflow-y-auto">
                  {courseLessons.map((les) => (
                    <button
                      key={les.id}
                      type="button"
                      onClick={() => setPreviewLessonId(les.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                        (previewLessonId || courseLessons[0].id) === les.id
                          ? 'bg-[#0D0D0F] text-white'
                          : 'bg-white text-[#0D0D0F] hover:bg-black/5'
                      }`}
                    >
                      <span className="font-mono mr-1.5">D{les.dayNumber}</span>
                      <span>{previewLang === 'en' ? les.titleEn : les.titleRw}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-8">
              {courseLessons.length > 0 &&
                (() => {
                  const activePreviewLesson =
                    courseLessons.find((l) => l.id === previewLessonId) || courseLessons[0];
                  const blocks = parseLessonBlocks(
                    previewLang === 'en'
                      ? activePreviewLesson.blocksEnJson
                      : activePreviewLesson.blocksRwJson
                  );
                  return (
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-2xl font-display font-semibold text-[#0D0D0F]">
                          {previewLang === 'en'
                            ? activePreviewLesson.titleEn
                            : activePreviewLesson.titleRw}
                        </h3>
                        <p className="text-sm text-[#5D5D66] mt-1">
                          {previewLang === 'en'
                            ? activePreviewLesson.summaryEn
                            : activePreviewLesson.summaryRw}
                        </p>
                      </div>
                      <LessonBlocksRenderer lang={previewLang} blocks={blocks} />
                    </div>
                  );
                })()}
            </div>
          </div>
        </div>
      )}

      {/* NEW COURSE MODAL */}
      {newCourseOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white border border-black/10 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-display font-semibold text-[#0D0D0F]">
                Create New Course (Draft)
              </h3>
              <button
                type="button"
                onClick={() => setNewCourseOpen(false)}
                className="text-xs text-[#5D5D66]"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleCreateNewCourse} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-3 py-2 border border-black/15 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as Course['category'])}
                    className="w-full px-3 py-2 border border-black/15 rounded-lg bg-white"
                  >
                    <option value="foundations">Foundations</option>
                    <option value="prompting">Prompting</option>
                    <option value="automation">Automation</option>
                    <option value="agents">AI Agents</option>
                    <option value="industry">Industry</option>
                  </select>
                </div>
              </div>
              <input
                type="text"
                required
                value={newTitleEn}
                onChange={(e) => setNewTitleEn(e.target.value)}
                placeholder="Course Title (English)"
                className="w-full px-3 py-2 border border-black/15 rounded-lg"
              />
              <input
                type="text"
                value={newTitleRw}
                onChange={(e) => setNewTitleRw(e.target.value)}
                placeholder="Course Title (Kinyarwanda)"
                className="w-full px-3 py-2 border border-black/15 rounded-lg"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Tuition (RWF, 0 = Free)</label>
                  <input
                    type="number"
                    min={0}
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-black/15 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={newDays}
                    onChange={(e) => setNewDays(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-black/15 rounded-lg font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full px-4 py-2.5 font-medium text-white bg-[#0D0D0F] rounded-lg"
              >
                {busy ? 'Creating...' : 'Create Draft Course'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
