import type {
  Course,
  CourseModule,
  Language,
  LessonBlock,
  LessonBlockType,
  LessonContent,
  StructuredLessonRecord
} from '../types';

export interface BlockTypeMeta {
  type: LessonBlockType;
  label: string;
  description: string;
  category: 'content' | 'media' | 'practice' | 'assessment';
}

export const BLOCK_TYPE_META: BlockTypeMeta[] = [
  { type: 'rich_text', label: 'Rich Text', description: 'Concept explanation, headings, or narrative paragraphs', category: 'content' },
  { type: 'callout', label: 'Callout Box', description: 'Key takeaway, Rwanda context note, or caution alert', category: 'content' },
  { type: 'table', label: 'Comparison Table', description: 'Structured matrix comparing tools, prompts, or workflows', category: 'content' },
  { type: 'code', label: 'Code / Prompt Block', description: 'Copyable prompt formula, JSON payload, or script snippet', category: 'content' },
  { type: 'image', label: 'Image / Diagram', description: 'Visual diagram or screenshot with alt text and caption', category: 'media' },
  { type: 'video', label: 'Video Lesson', description: 'YouTube, Vimeo, or MP4 walkthrough video embed', category: 'media' },
  { type: 'audio', label: 'Audio Walkthrough', description: 'Voice explanation or Kinyarwanda audio summary', category: 'media' },
  { type: 'download', label: 'Downloadable File', description: 'Worksheet, checklist PDF, or template download link', category: 'media' },
  { type: 'external_resource', label: 'External Resource', description: 'Curated reference link (NotebookLM, Make, official docs)', category: 'media' },
  { type: 'interactive', label: 'Interactive Sandbox', description: 'Editable prompt playground / workflow template starter', category: 'practice' },
  { type: 'checklist', label: 'Action Checklist', description: 'Interactive learner step-by-step completion checklist', category: 'practice' },
  { type: 'assignment', label: 'Practical Assignment', description: 'Hands-on mini-project task with clear deliverable criteria', category: 'assessment' },
  { type: 'quiz', label: 'Knowledge Quiz', description: 'Multiple-choice comprehension check with instant explanation', category: 'assessment' },
  { type: 'reflection', label: 'Reflection Prompt', description: 'Self-assessment or workplace application reflection question', category: 'assessment' }
];

export function makeBlockId(): string {
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function createDefaultBlock(type: LessonBlockType): LessonBlock {
  const id = makeBlockId();
  switch (type) {
    case 'rich_text':
      return { id, type, title: 'Core Concept', body: 'Explain the concept clearly with practical context.' };
    case 'callout':
      return { id, type, variant: 'rwanda_context', title: 'Rwanda Context Example', body: 'Show how this applies to SMEs, schools, or clinics in Rwanda.' };
    case 'code':
      return { id, type, title: 'Reusable Prompt Template', language: 'prompt', code: 'Role: ...\nTask: ...\nContext: ...\nConstraints: ...\nFormat: ...' };
    case 'table':
      return { id, type, title: 'Comparison Matrix', headers: ['Approach', 'Best Used For', 'Human Check'], rows: [['Zero-shot prompt', 'Quick summaries', 'Verify facts'], ['Role + Context + Format', 'Client reports', 'Check tone & figures']] };
    case 'image':
      return { id, type, title: 'Diagram', url: '', altText: 'Instructional diagram description', caption: 'Visual overview of the workflow' };
    case 'video':
      return { id, type, title: 'Walkthrough Video', url: '', caption: 'Short practical screen recording' };
    case 'audio':
      return { id, type, title: 'Audio Summary', url: '', caption: 'Listen on low-bandwidth mobile connections' };
    case 'download':
      return { id, type, title: 'Course Worksheet', label: 'Download Template Pack', url: '' };
    case 'external_resource':
      return { id, type, title: 'Further Reading', label: 'Open Official Guide', url: 'https://academy.openai.com/home' };
    case 'interactive':
      return { id, type, title: 'Interactive Practice Sandbox', body: 'Customize the bracketed placeholders below before testing in your AI tool.', promptTemplate: 'Act as an operations coordinator in Kigali. Draft a 3-step plan for [YOUR TOPIC].' };
    case 'checklist':
      return { id, type, title: 'Step-by-Step Verification Checklist', items: ['Define goal clearly', 'Remove private customer PII before prompting', 'Verify final output facts manually'] };
    case 'assignment':
      return { id, type, title: 'Applied Mini-Project Task', body: 'Build and test this workflow on a real document or process, then capture your prompt and verified output.' };
    case 'quiz':
      return {
        id,
        type,
        title: 'Knowledge Check',
        question: 'Which habit most improves reliability when using AI for workplace tasks?',
        options: ['Paste raw private client data without review', 'Provide clear context, constraints, and verify the output manually', 'Use single-word prompts without formatting rules'],
        correctIndex: 1,
        explanation: 'Clear framing combined with human verification prevents errors and protects privacy.'
      };
    case 'reflection':
      return { id, type, title: 'Reflection Question', body: 'Which repetitive weekly task in your studies or business could benefit from this workflow?' };
  }
}

export function parseLessonBlocks(json?: string): LessonBlock[] {
  if (!json || typeof json !== 'string') return [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed.filter((b): b is LessonBlock => Boolean(b && typeof b === 'object' && typeof b.type === 'string'));
    }
    return [];
  } catch {
    return [];
  }
}

export function serializeLessonBlocks(blocks: LessonBlock[]): string {
  return JSON.stringify(blocks);
}

export function convertStaticLessonToBlocks(lesson: LessonContent, lang: Language): LessonBlock[] {
  const blocks: LessonBlock[] = [
    {
      id: makeBlockId(),
      type: 'rich_text',
      title: lang === 'en' ? 'Simple Explanation' : 'Ibisobanuro Byoroshye',
      body: lesson.simpleExplanation[lang]
    },
    {
      id: makeBlockId(),
      type: 'rich_text',
      title: lang === 'en' ? 'Technical Depth' : 'Ibisobanuro by’Ubuhanga',
      body: lesson.technicalExplanation[lang]
    },
    {
      id: makeBlockId(),
      type: 'callout',
      variant: 'note',
      title: lang === 'en' ? 'Global Real-World Example' : 'Urugero Rusanzwe ku Isi',
      body: lesson.realWorldExample[lang]
    },
    {
      id: makeBlockId(),
      type: 'callout',
      variant: 'rwanda_context',
      title: lang === 'en' ? 'Rwanda-Relevant Application' : 'Urugero rwo mu Rwanda',
      body: lesson.rwandaExample[lang]
    },
    {
      id: makeBlockId(),
      type: 'checklist',
      title: lang === 'en' ? 'Step-by-Step Practical Exercise' : 'Intambwe z’Umwitozo Ngiro',
      body: lesson.practicalDemo[lang],
      items: lesson.exerciseSteps[lang]
    },
    {
      id: makeBlockId(),
      type: 'code',
      title: lang === 'en' ? 'Reusable Prompt / Workflow Template' : 'Ibwiriza Rikoreshwa Kenshi',
      language: 'prompt',
      code: lesson.reusableTemplate[lang]
    },
    {
      id: makeBlockId(),
      type: 'callout',
      variant: 'warning',
      title: lang === 'en' ? 'Common Mistakes & Limitations' : 'Amakosa Akunze Gukorwa n’Imipaka',
      body: `${lesson.commonMistakes[lang].map((m) => `• ${m}`).join('\n')}\n\n${lesson.limitationsAndRisks[lang]}`
    },
    {
      id: makeBlockId(),
      type: 'assignment',
      title: lang === 'en' ? 'Expected Lesson Deliverable' : 'Umwitozo Ugomba Gutangwa',
      body:
        lesson.deliverable?.[lang] ||
        (lang === 'en'
          ? `Submit or archive your Day ${lesson.dayNumber} practical evidence.`
          : `Bika cyangwa wohereze ibimenyetso by’umwitozo w’Umunsi wa ${lesson.dayNumber}.`)
    },
    ...(lesson.downloadableResourceTitle
      ? [
          {
            id: makeBlockId(),
            type: 'download' as const,
            title: lang === 'en' ? 'Downloadable Worksheet' : 'Urupapuro rw’Umwitozo',
            label: lesson.downloadableResourceTitle[lang],
            url: '/?course=challenge-28#resources'
          }
        ]
      : []),
    {
      id: makeBlockId(),
      type: 'quiz',
      title: lang === 'en' ? 'Knowledge Check' : 'Isuzuma ry’Isomo',
      question: lesson.knowledgeCheck.question[lang],
      options: lesson.knowledgeCheck.options[lang],
      correctIndex: lesson.knowledgeCheck.correctIndex,
      explanation: lesson.knowledgeCheck.explanation[lang]
    },
    {
      id: makeBlockId(),
      type: 'reflection',
      title: lang === 'en' ? 'Reflection Question' : 'Ikibazo cyo Gutekerezaho',
      body: lesson.reflectionQuestion[lang]
    }
  ];
  return blocks;
}

export interface LessonTemplatePreset {
  id: string;
  name: string;
  description: string;
  buildBlocks: () => LessonBlock[];
}

export const LESSON_STARTER_TEMPLATES: LessonTemplatePreset[] = [
  {
    id: 'concept_rwanda_quiz',
    name: 'Concept + Rwanda Example + Quiz',
    description: 'Standard micro-lesson with concept explanation, Rwanda SME context, copyable prompt, and check quiz.',
    buildBlocks: () => [
      createDefaultBlock('rich_text'),
      createDefaultBlock('callout'),
      createDefaultBlock('code'),
      createDefaultBlock('quiz'),
      createDefaultBlock('reflection')
    ]
  },
  {
    id: 'hands_on_lab',
    name: 'Hands-On Automation Lab',
    description: 'Practical lab combining comparison table, interactive prompt sandbox, verification checklist, and assignment.',
    buildBlocks: () => [
      createDefaultBlock('rich_text'),
      createDefaultBlock('table'),
      createDefaultBlock('interactive'),
      createDefaultBlock('checklist'),
      createDefaultBlock('assignment')
    ]
  },
  {
    id: 'multimedia_session',
    name: 'Video / Audio Workshop Summary',
    description: 'Video walkthrough, low-bandwidth audio option, downloadable worksheet, and external docs.',
    buildBlocks: () => [
      createDefaultBlock('video'),
      createDefaultBlock('audio'),
      createDefaultBlock('download'),
      createDefaultBlock('external_resource'),
      createDefaultBlock('quiz')
    ]
  },
  {
    id: 'blueprint_16_part',
    name: 'Blueprint 16-Section Lesson Standard',
    description: 'Full AI Education Rwanda academic standard: Simple & Technical depth, Global & Rwanda examples, Demo, Exercise, Downloadable worksheet, Mistakes, Quiz, Reflection & Further Resources.',
    buildBlocks: () => [
      { ...createDefaultBlock('rich_text'), title: 'Simple Explanation' },
      { ...createDefaultBlock('rich_text'), title: 'Technical Explanation' },
      { ...createDefaultBlock('callout'), variant: 'note', title: 'Real-World Example' },
      { ...createDefaultBlock('callout'), variant: 'rwanda_context', title: 'Rwanda-Relevant Example' },
      { ...createDefaultBlock('checklist'), title: 'Practical Demonstration & Step-by-Step Exercise' },
      { ...createDefaultBlock('code'), title: 'Reusable Prompt / Workflow Template' },
      { ...createDefaultBlock('download'), title: 'Downloadable Resource Worksheet' },
      { ...createDefaultBlock('assignment'), title: 'Lesson Deliverable & Evidence' },
      { ...createDefaultBlock('callout'), variant: 'warning', title: 'Common Mistakes, Limitations & Privacy Risks' },
      { ...createDefaultBlock('quiz'), title: 'Knowledge Check' },
      { ...createDefaultBlock('reflection'), title: 'Reflection Question' },
      { ...createDefaultBlock('external_resource'), title: 'Further Learning Resources' }
    ]
  }
];

export interface CourseScaffoldModuleItem {
  id: string;
  courseId: string;
  orderIndex: number;
  titleEn: string;
  titleRw: string;
  summaryEn: string;
  summaryRw: string;
  isPublished: boolean;
}

export interface CourseScaffoldLessonItem {
  id: string;
  courseId: string;
  moduleId: string;
  orderIndex: number;
  dayNumber: number;
  weekNumber: number;
  isSample: boolean;
  isRequired: boolean;
  estimatedMinutes: number;
  enStatus: 'published';
  rwStatus: 'published';
  titleEn: string;
  titleRw: string;
  summaryEn: string;
  summaryRw: string;
  objectivesEn: string[];
  objectivesRw: string[];
  deliverableEn: string;
  deliverableRw: string;
  levelTag: string;
  tools: string[];
  blocksEnJson: string;
  blocksRwJson: string;
}

export function buildCourseScaffoldPayload(params: {
  courseId: string;
  courseTitleEn: string;
  courseTitleRw: string;
  weekCount: number;
  daysCount: number;
  levelTag?: string;
  tools?: string[];
  markFirstDayAsSample?: boolean;
}): {
  modules: CourseScaffoldModuleItem[];
  lessons: CourseScaffoldLessonItem[];
} {
  const safeWeeks = Math.max(1, Math.min(24, Math.round(params.weekCount)));
  const safeDays = Math.max(safeWeeks, Math.min(180, Math.round(params.daysCount)));
  const levelTag = params.levelTag?.trim() || 'Practical AI';
  const tools = params.tools && params.tools.length > 0 ? params.tools : ['ChatGPT', 'Google Gemini', 'Google Workspace'];
  const blueprintPreset = LESSON_STARTER_TEMPLATES.find((p) => p.id === 'blueprint_16_part') ?? LESSON_STARTER_TEMPLATES[0];

  const modules: CourseScaffoldModuleItem[] = Array.from({ length: safeWeeks }, (_, i) => {
    const wk = i + 1;
    return {
      id: `${params.courseId}_mod_w${wk}`,
      courseId: params.courseId,
      orderIndex: wk,
      titleEn: `Module ${wk} — ${params.courseTitleEn} (Phase ${wk})`,
      titleRw: `Igice cya ${wk} — ${params.courseTitleRw} (Icyiciro ${wk})`,
      summaryEn: `Structured weekly learning module ${wk} following the AI Education Rwanda 16-part delivery standard.`,
      summaryRw: `Igice cya ${wk} cy’amasomo gikurikiza imiterere y’ubuziranenge ya AI Education Rwanda.`,
      isPublished: true
    };
  });

  const daysPerWeek = Math.max(1, Math.ceil(safeDays / safeWeeks));
  const lessons: CourseScaffoldLessonItem[] = Array.from({ length: safeDays }, (_, idx) => {
    const day = idx + 1;
    const wk = Math.min(safeWeeks, Math.floor(idx / daysPerWeek) + 1);
    const isSample = params.markFirstDayAsSample !== false && (day === 1 || (safeDays >= 8 && day % 7 === 1));
    const blocksEn = blueprintPreset.buildBlocks();
    const blocksRw = blueprintPreset.buildBlocks();
    return {
      id: `${params.courseId}_day_${day}`,
      courseId: params.courseId,
      moduleId: `${params.courseId}_mod_w${wk}`,
      orderIndex: day,
      dayNumber: day,
      weekNumber: wk,
      isSample,
      isRequired: true,
      estimatedMinutes: 15,
      enStatus: 'published',
      rwStatus: 'published',
      titleEn: `Day ${day} — Practical AI Lesson`,
      titleRw: `Umunsi wa ${day} — Isomo Ngiro rya AI`,
      summaryEn: `Day ${day} of ${params.courseTitleEn}: practical concepts, Rwanda-relevant example, step-by-step exercise, and verification check.`,
      summaryRw: `Umunsi wa ${day} muri ${params.courseTitleRw}: ubumenyi ngiro, urugero rwo mu Rwanda, umwitozo n’isuzuma.`,
      objectivesEn: [
        `Understand the core objective of Day ${day}.`,
        'Apply the concept in a guided workflow or prompt test.',
        'Verify output quality, safety, and accuracy.'
      ],
      objectivesRw: [
        `Gusobanukirwa intego nyamukuru y’Umunsi wa ${day}.`,
        'Gushyira mu bikorwa ibyo wize mu myitozo ngiro.',
        'Kugenzura ukuri n’umutekano w’igisubizo.'
      ],
      deliverableEn: `Completed Day ${day} practical worksheet`,
      deliverableRw: `Urupapuro rw’umwitozo w’Umunsi wa ${day} rwuzuye`,
      levelTag,
      tools,
      blocksEnJson: serializeLessonBlocks(blocksEn),
      blocksRwJson: serializeLessonBlocks(blocksRw)
    };
  });

  return { modules, lessons };
}

export interface TranslationCompleteness {
  enBlockCount: number;
  rwBlockCount: number;
  percentComplete: number;
  missingItems: string[];
}

export function evaluateTranslationCompleteness(
  lesson: Pick<StructuredLessonRecord, 'titleEn' | 'titleRw' | 'summaryEn' | 'summaryRw' | 'blocksEnJson' | 'blocksRwJson'>
): TranslationCompleteness {
  const enBlocks = parseLessonBlocks(lesson.blocksEnJson);
  const rwBlocks = parseLessonBlocks(lesson.blocksRwJson);
  const missingItems: string[] = [];

  let checks = 0;
  let passed = 0;

  checks += 1;
  if (lesson.titleRw.trim() && lesson.titleRw.trim() !== lesson.titleEn.trim()) passed += 1;
  else if (!lesson.titleRw.trim()) missingItems.push('Missing Kinyarwanda title');
  else passed += 0.5;

  checks += 1;
  if ((lesson.summaryRw || '').trim().length > 5) passed += 1;
  else missingItems.push('Missing Kinyarwanda summary');

  checks += 1;
  if (enBlocks.length > 0 && rwBlocks.length >= enBlocks.length) passed += 1;
  else if (enBlocks.length === 0 && rwBlocks.length === 0) missingItems.push('No structured content blocks added yet');
  else missingItems.push(`RW has ${rwBlocks.length}/${enBlocks.length} blocks translated`);

  return {
    enBlockCount: enBlocks.length,
    rwBlockCount: rwBlocks.length,
    percentComplete: checks === 0 ? 0 : Math.round((passed / checks) * 100),
    missingItems
  };
}

export interface CourseChecklistItem {
  id: string;
  label: string;
  passed: boolean;
  required: boolean;
  detail: string;
}

export interface CourseChecklistResult {
  items: CourseChecklistItem[];
  readyToPublish: boolean;
  passedCount: number;
  totalCount: number;
}

export function evaluateCoursePublishChecklist(
  course: Course,
  modules: CourseModule[],
  lessons: StructuredLessonRecord[]
): CourseChecklistResult {
  const courseModules = modules.filter((m) => m.courseId === course.id);
  const courseLessons = lessons.filter((l) => l.courseId === course.id);
  const requiredLessons = courseLessons.filter((l) => l.isRequired !== false);
  const lessonsWithEnBlocks = requiredLessons.filter((l) => parseLessonBlocks(l.blocksEnJson).length > 0);
  const lessonsWithRw = courseLessons.filter(
    (l) => l.rwStatus === 'published' || parseLessonBlocks(l.blocksRwJson).length > 0
  );
  const sampleCount = courseLessons.filter((l) => l.isSample).length;

  const items: CourseChecklistItem[] = [
    {
      id: 'bilingual_titles',
      label: 'Bilingual Course Title & Subtitle (EN & RW)',
      required: true,
      passed: Boolean(course.title.en.trim() && course.title.rw.trim() && course.subtitle.en.trim()),
      detail: course.title.en && course.title.rw ? 'Both EN and RW titles set' : 'Add both EN and RW course titles'
    },
    {
      id: 'outcomes',
      label: 'Course Description & Learning Outcomes',
      required: true,
      passed: Boolean(course.description.en.trim().length > 20 && course.outcomes.en.length > 0),
      detail: `${course.outcomes.en.length} learning outcomes defined`
    },
    {
      id: 'pricing',
      label: 'Tuition Pricing & Duration Configured',
      required: true,
      passed: (course.isFree || course.priceRwf >= 0) && course.durationDays >= 1,
      detail: course.isFree ? 'Free course' : `${course.priceRwf.toLocaleString()} RWF · ${course.durationDays} days`
    },
    {
      id: 'modules',
      label: 'At Least 1 Published Curriculum Module',
      required: true,
      passed: courseModules.some((m) => m.isPublished),
      detail: `${courseModules.filter((m) => m.isPublished).length}/${courseModules.length} published modules`
    },
    {
      id: 'lesson_blocks',
      label: 'Required Lessons Contain Structured Blocks',
      required: true,
      passed: courseLessons.length > 0 && lessonsWithEnBlocks.length === requiredLessons.length,
      detail:
        courseLessons.length === 0
          ? 'No Firestore lessons synced yet (use "Import 28-Day Blueprint" or add lessons)'
          : `${lessonsWithEnBlocks.length}/${requiredLessons.length} required lessons have structured blocks`
    },
    {
      id: 'rw_coverage',
      label: 'Kinyarwanda Lesson Content Coverage',
      required: false,
      passed: courseLessons.length > 0 && lessonsWithRw.length === courseLessons.length,
      detail: `${lessonsWithRw.length}/${courseLessons.length} lessons have Kinyarwanda blocks`
    },
    {
      id: 'sample_preview',
      label: 'Free Sample Preview Lesson Enabled',
      required: false,
      passed: sampleCount > 0,
      detail: `${sampleCount} free sample preview lesson(s)`
    }
  ];

  const readyToPublish = items.filter((i) => i.required).every((i) => i.passed);
  return {
    items,
    readyToPublish,
    passedCount: items.filter((i) => i.passed).length,
    totalCount: items.length
  };
}
