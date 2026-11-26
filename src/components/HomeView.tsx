import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import type { Course, Language, PageRoute, PlatformSettings, ProgrammeRecord } from '../types';
import {
  COURSES,
  LEARNING_LEVELS,
  PRACTICAL_PROJECTS,
  UI_COPY,
  WORKSHOP_EVENTS
} from '../data/curriculum';
import heroStudioBanner from '../assets/images/banner_academy_hero_1795639441836.jpg';
import workflowsStudioBanner from '../assets/images/banner_practical_workflows_1795639442156.jpg';

interface HomeViewProps {
  lang: Language;
  courses: Course[];
  programmes?: ProgrammeRecord[];
  platformSettings?: PlatformSettings | null;
  onNavigate: (route: PageRoute) => void;
  onSelectCourse: (courseId: string) => void;
  onOpenSampleDay: (dayNumber: number) => void;
  onQuickVerifyCert: (certId: string) => void;
}

const AUDIENCE_TRACK_BANNERS = [
  {
    key: 'beginners',
    gradient: 'bg-gradient-to-br from-[#0284C7] via-[#38BDF8] to-[#EC4899]',
    title: { en: 'For learners & beginners', rw: 'Ku banyeshuri n’abatangira' },
    subtitle: {
      en: 'Start the 28-Day Challenge with free Day 1 & Day 2 samples.',
      rw: 'Tangira amasomo y’iminsi 28 n’amasomo y’ubuntu.'
    },
    action: 'sample1' as const
  },
  {
    key: 'builders',
    gradient: 'bg-gradient-to-br from-[#84CC16] via-[#22C55E] to-[#0EA5E9]',
    title: { en: 'For builders', rw: 'Ku bubaka sisitemu' },
    subtitle: {
      en: 'Automate Google Forms, Sheets, and Make workflows.',
      rw: 'Huza Google Forms, Sheets n’imiyoboro yikoresha.'
    },
    action: 'projects' as const
  },
  {
    key: 'leaders',
    gradient: 'bg-gradient-to-br from-[#FB923C] via-[#A855F7] to-[#6366F1]',
    title: { en: 'For leaders & SMEs', rw: 'Ku bayobozi n’ibigo' },
    subtitle: {
      en: 'Explore 8 Rwanda sector tracks and team AI adoption.',
      rw: 'Reba inzego 8 z’akazi zifasha ibigo mu Rwanda.'
    },
    action: 'courses' as const
  },
  {
    key: 'education',
    gradient: 'bg-gradient-to-br from-[#38BDF8] via-[#A5B4FC] to-[#FDE047]',
    title: { en: 'For education', rw: 'Mu burezi n’abarimu' },
    subtitle: {
      en: 'Bilingual lesson kits for TVET, university & teachers.',
      rw: 'Imfashanyigisho mu Cyongereza n’Ikinyarwanda.'
    },
    action: 'challenge' as const
  }
];

const COURSE_GRADIENT_COVERS: Record<string, string> = {
  foundations: 'bg-gradient-to-br from-[#0284C7] via-[#38BDF8] to-[#F472B6]',
  prompting: 'bg-gradient-to-br from-[#38BDF8] via-[#818CF8] to-[#C084FC]',
  automation: 'bg-gradient-to-br from-[#4F46E5] via-[#7C3AED] to-[#EC4899]',
  agents: 'bg-gradient-to-br from-[#0EA5E9] via-[#6366F1] to-[#14B8A6]',
  industry: 'bg-gradient-to-br from-[#0284C7] via-[#10B981] to-[#F59E0B]'
};

export function HomeView({
  lang,
  courses,
  programmes = [],
  platformSettings,
  onNavigate,
  onSelectCourse,
  onOpenSampleDay,
  onQuickVerifyCert
}: HomeViewProps) {
  const [activeLevel, setActiveLevel] = useState<number>(1);
  const [certInput, setCertInput] = useState<string>('RW-AI-2026-0042');
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [workflowImgFailed, setWorkflowImgFailed] = useState(false);
  const [openOutlines, setOpenOutlines] = useState<Record<string, boolean>>({});

  const selectedLevel =
    LEARNING_LEVELS.find((lvl) => lvl.level === activeLevel) || LEARNING_LEVELS[0];
  const featuredCourses = (courses.length > 0 ? courses : COURSES).slice(0, 3);

  const liveUpcoming = programmes
    .filter((p) => ['upcoming', 'registration_open', 'in_progress'].includes(p.status))
    .slice(0, 3)
    .map((p) => ({
      id: p.id,
      dateLabel: p.dateLabel,
      locationLabel: lang === 'en' ? p.locationEn : p.locationRw,
      languageLabel: p.languageLabel,
      titleLabel: lang === 'en' ? p.titleEn : p.titleRw
    }));

  const upcomingEvents =
    liveUpcoming.length > 0
      ? liveUpcoming
      : WORKSHOP_EVENTS.filter((e) => e.status === 'upcoming')
          .slice(0, 3)
          .map((e) => ({
            id: e.id,
            dateLabel: e.dateLabel,
            locationLabel: e.location[lang],
            languageLabel: e.languageLabel,
            titleLabel: e.title[lang]
          }));

  const showVerifyBox = platformSettings?.enablePublicVerify !== false;

  const handleTrackCardClick = (action: 'sample1' | 'projects' | 'courses' | 'challenge') => {
    if (action === 'sample1') onOpenSampleDay(1);
    else if (action === 'projects') onNavigate('projects');
    else if (action === 'courses') onNavigate('courses');
    else onSelectCourse('challenge-28');
  };

  return (
    <div className="max-w-[1220px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      {/* 1. Wide Photographic Hero Banner (OpenAI Academy Home Banner Style) */}
      <section className="relative rounded-2xl overflow-hidden bg-[#0D0D0F] min-h-[340px] sm:min-h-[400px] flex items-end border border-black/[0.08]">
        {!heroImgFailed && (
          <img
            src={heroStudioBanner}
            alt={
              lang === 'en'
                ? 'Rwandan learners working together on laptops in a Kigali AI learning studio'
                : 'Abanyeshuri biga AI hamwe i Kigali'
            }
            referrerPolicy="no-referrer"
            onError={() => setHeroImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#0D0D0F]/95 via-[#0D0D0F]/60 to-[#0D0D0F]/20"
        />
        <div className="relative z-10 w-full p-6 sm:p-10 lg:p-12 flex flex-col lg:flex-row lg:items-end justify-between gap-6 text-white">
          <div className="max-w-2xl">
            <p className="text-xs sm:text-sm font-medium text-[#7DD3FC] mb-2">
              {UI_COPY.hero.kicker[lang]}
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-[60px] font-display font-bold tracking-[-0.03em] leading-[1.04] text-balance mb-4">
              {UI_COPY.hero.headline[lang]}
            </h1>
            <p className="text-sm sm:text-base text-white/85 leading-relaxed max-w-xl">
              {UI_COPY.hero.subheadline[lang]}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onSelectCourse('challenge-28')}
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors whitespace-nowrap"
            >
              <span>{UI_COPY.hero.primaryCta[lang]}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onOpenSampleDay(1)}
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-[#0D0D0F] bg-white hover:bg-[#F4F5F7] rounded-lg transition-colors whitespace-nowrap"
            >
              <span>{UI_COPY.hero.secondaryCta[lang]}</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenSampleDay(2)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-white/90 hover:text-white underline underline-offset-4 whitespace-nowrap"
            >
              <span>{lang === 'en' ? 'Day 2: AI vs ML vs DL' : 'Umunsi wa 2: AI vs ML vs DL'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. "Build the AI skills Rwanda needs" 4-Track Section (Exact OpenAI Academy Layout) */}
      <section className="bg-white border border-black/[0.08] rounded-2xl p-6 sm:p-10">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl sm:text-4xl font-display font-bold tracking-[-0.025em] text-[#0D0D0F] text-balance">
            {lang === 'en'
              ? 'Build the AI skills Rwanda needs'
              : 'Wubake ubumenyi bwa AI bukenewe mu Rwanda'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {AUDIENCE_TRACK_BANNERS.map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={() => handleTrackCardClick(card.action)}
              className="group text-left flex flex-col focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0284C7]"
            >
              <div
                className={`w-full h-32 rounded-xl ${card.gradient} mb-3 transition-transform duration-200 group-hover:scale-[1.01]`}
              />
              <span className="text-sm sm:text-base font-semibold text-[#0284C7] group-hover:underline underline-offset-4">
                {card.title[lang]}
              </span>
              <span className="text-xs sm:text-sm text-[#5D5D66] mt-1 leading-relaxed">
                {card.subtitle[lang]}
              </span>
            </button>
          ))}
        </div>

        {/* Clean 4-column Proof Figures Bar */}
        <div className="mt-8 pt-6 border-t border-black/[0.07] grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-2xl font-display font-bold text-[#0D0D0F] tabular-nums">28 Days</p>
            <p className="text-xs text-[#5D5D66] mt-0.5">
              {lang === 'en' ? '5–12 min bilingual daily lessons' : 'Amasomo y’iminota 5–12 buri munsi'}
            </p>
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-[#0D0D0F] tabular-nums">7 Levels</p>
            <p className="text-xs text-[#5D5D66] mt-0.5">
              {lang === 'en' ? 'From AI basics to real systems' : 'Kuva ku ntangiriro kugeza kuri sisitemu'}
            </p>
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-[#0D0D0F] tabular-nums">6 Projects</p>
            <p className="text-xs text-[#5D5D66] mt-0.5">
              {lang === 'en' ? 'Free-tier Workspace & Make builds' : 'Imishinga ikoresha porogaramu z’ubuntu'}
            </p>
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-[#0284C7] tabular-nums">1,000 RWF</p>
            <p className="text-xs text-[#5D5D66] mt-0.5">
              {lang === 'en' ? 'Pilot fee via MTN MoMo / Airtel' : 'Kwishyura na MTN MoMo / Airtel'}
            </p>
          </div>
        </div>
      </section>

      {/* 3. OpenAI Academy Course Cards Section ("ABOUT THE COURSES") */}
      <section className="bg-white border border-black/[0.08] rounded-2xl p-6 sm:p-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold tracking-wider text-[#0284C7] uppercase mb-1.5">
              {lang === 'en' ? 'About the courses' : 'Ibyerekeye amasomo'}
            </p>
            <h2 className="text-2xl sm:text-4xl font-display font-bold tracking-[-0.025em] text-[#0D0D0F] text-balance">
              {lang === 'en' ? 'Learning is part of the work' : 'Kwiga ni igice cy’akazi ka buri munsi'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('courses')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0284C7] hover:underline whitespace-nowrap"
          >
            <span>{lang === 'en' ? 'View all courses' : 'Reba amasomo yose'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredCourses.map((course) => {
            const coverGrad =
              COURSE_GRADIENT_COVERS[course.category] || COURSE_GRADIENT_COVERS.foundations;
            const outlineExpanded = Boolean(openOutlines[course.id]);
            return (
              <article
                key={course.id}
                className="bg-white border border-black/[0.08] rounded-2xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className={`h-32 w-full ${coverGrad}`} />
                  <div className="p-6">
                    <p className="text-xs font-medium text-[#0284C7] mb-1.5">
                      {course.code} · {course.durationDays} {lang === 'en' ? 'Days' : 'Iminsi'} ·{' '}
                      {course.status === 'active'
                        ? course.isFree || course.priceRwf === 0
                          ? lang === 'en'
                            ? 'Free'
                            : 'Ubuntu'
                          : `${course.priceRwf.toLocaleString()} RWF`
                        : lang === 'en'
                          ? 'Upcoming'
                          : 'Biri hafi'}
                    </p>
                    <h3 className="text-xl sm:text-2xl font-display font-bold tracking-[-0.02em] text-[#0D0D0F] mb-2.5">
                      {course.title[lang]}
                    </h3>
                    <p className="text-sm text-[#5D5D66] leading-relaxed">
                      {course.description[lang]}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 space-y-4">
                  <div className="border-t border-black/[0.08] pt-3">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenOutlines((prev) => ({ ...prev, [course.id]: !prev[course.id] }))
                      }
                      className="w-full flex items-center justify-between text-sm font-semibold text-[#0D0D0F] py-1"
                    >
                      <span>{lang === 'en' ? 'Course outline' : 'Incamake y’amasomo'}</span>
                      {outlineExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#5D5D66]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#5D5D66]" />
                      )}
                    </button>
                    {outlineExpanded && (
                      <ul className="mt-2 space-y-1.5 text-xs text-[#5D5D66]">
                        {course.outcomes[lang].slice(0, 4).map((out) => (
                          <li key={out} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#0284C7] shrink-0 mt-0.5" />
                            <span>{out}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectCourse(course.id)}
                    className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors"
                  >
                    {lang === 'en' ? 'Go to course' : 'Jya ku isomo'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 4. 7 Learning Levels Interactive Framework */}
      <section className="bg-white border border-black/[0.08] rounded-2xl p-6 sm:p-10">
        <div className="max-w-3xl mb-8">
          <p className="text-xs font-semibold tracking-wider text-[#0284C7] uppercase mb-1.5">
            {lang === 'en' ? 'Educational Framework' : 'Imiterere y’Imyigire'}
          </p>
          <h2 className="text-2xl sm:text-4xl font-display font-bold tracking-[-0.025em] text-[#0D0D0F] mb-3 text-balance">
            {lang === 'en'
              ? 'Seven levels from basic usage to AI systems'
              : 'Ibyiciro birindwi kuva ku ntangiriro kugeza kuri sisitemu za AI'}
          </h2>
          <p className="text-sm sm:text-base text-[#5D5D66] leading-relaxed">
            {lang === 'en'
              ? 'Every cohort builds step by step—prioritizing practical workflows and human verification rather than empty hype.'
              : 'Buri cyiciro cyubaka intambwe ku yindi gishingiye ku bikorwa bifatika.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-2">
            {LEARNING_LEVELS.map((item) => {
              const active = item.level === activeLevel;
              return (
                <button
                  key={item.level}
                  type="button"
                  onClick={() => setActiveLevel(item.level)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                    active
                      ? 'bg-[#0284C7] text-white border-[#0284C7]'
                      : 'bg-[#FAFAFB] text-[#0D0D0F] border-black/[0.08] hover:border-black/25'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`text-xs font-mono tabular-nums shrink-0 ${
                        active ? 'text-white/90' : 'text-[#0284C7]'
                      }`}
                    >
                      0{item.level}
                    </span>
                    <span className="text-sm font-semibold truncate">{item.title[lang]}</span>
                  </div>
                  <ArrowRight className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-[#5D5D66]'}`} />
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7 bg-[#F7F8FA] border border-black/[0.08] rounded-2xl p-6 sm:p-8">
            <p className="text-xs font-mono text-[#0284C7] mb-2 tabular-nums">
              {lang === 'en' ? `Level 0${selectedLevel.level}` : `Icyiciro cya 0${selectedLevel.level}`}
            </p>
            <h3 className="text-xl sm:text-2xl font-display font-bold text-[#0D0D0F] mb-2">
              {selectedLevel.title[lang]}
            </h3>
            <p className="text-sm sm:text-base text-[#5D5D66] leading-relaxed mb-6">
              {selectedLevel.summary[lang]}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {selectedLevel.topics[lang].map((topic) => (
                <div
                  key={topic}
                  className="bg-white border border-black/[0.06] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#0D0D0F] flex items-start gap-2.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#0284C7] shrink-0 mt-0.5" />
                  <span>{topic}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-black/[0.08]">
              <p className="text-xs font-semibold text-[#0D0D0F] mb-1">
                {lang === 'en' ? 'Expected learner outcome' : 'Icyo umunyeshuri ageraho'}
              </p>
              <p className="text-sm text-[#5D5D66] leading-relaxed">
                {selectedLevel.outcome[lang]}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Practical Projects, Upcoming Events & Quick Certificate Verifier */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-black/[0.08] rounded-2xl p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#0284C7] uppercase mb-1">
                {lang === 'en' ? 'Hands-On Portfolio' : 'Imishinga Ngiro'}
              </p>
              <h2 className="text-2xl font-display font-bold text-[#0D0D0F]">
                {lang === 'en' ? 'Six projects learners build' : 'Imishinga 6 abanyeshuri bubaka'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="text-xs sm:text-sm font-semibold text-[#0284C7] hover:underline whitespace-nowrap"
            >
              {lang === 'en' ? 'Open tools & templates ->' : 'Fungura ibikoresho ->'}
            </button>
          </div>

          <div className="space-y-3">
            {PRACTICAL_PROJECTS.map((proj) => (
              <div
                key={proj.key}
                className="bg-[#FAFAFB] border border-black/[0.07] rounded-xl p-4"
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-sm font-semibold text-[#0D0D0F]">
                    {proj.number}. {proj.title[lang]}
                  </span>
                  <span className="text-xs text-[#5D5D66] font-mono shrink-0">
                    {proj.tools.slice(0, 2).join(' · ')}
                  </span>
                </div>
                <p className="text-xs text-[#5D5D66] leading-relaxed">{proj.summary[lang]}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 flex flex-col gap-6">
          <div className="relative h-48 rounded-2xl overflow-hidden bg-[#0D0D0F] border border-black/[0.08] flex items-end">
            {!workflowImgFailed && (
              <img
                src={workflowsStudioBanner}
                alt={
                  lang === 'en'
                    ? 'Study desk with laptop, notebook, and smartphone'
                    : 'Ibikoresho byo kwiga AI'
                }
                referrerPolicy="no-referrer"
                onError={() => setWorkflowImgFailed(true)}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#0D0D0F]/90 via-[#0D0D0F]/35 to-transparent"
            />
            <div className="relative z-10 p-5 text-white flex flex-wrap items-end justify-between gap-3 w-full">
              <div>
                <p className="text-xs font-mono text-[#7DD3FC] mb-0.5">
                  {lang === 'en' ? 'Phone & Laptop Ready' : 'Kuri Telefoni & Mudasobwa'}
                </p>
                <p className="text-base sm:text-lg font-display font-bold">
                  {lang === 'en'
                    ? 'Copy prompt templates cleanly into daily tools.'
                    : 'Koporora inyandiko z’imyitozo ako kanya.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('projects')}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg whitespace-nowrap"
              >
                {lang === 'en' ? 'Browse templates' : 'Reba imishinga'}
              </button>
            </div>
          </div>

          <div className="bg-white border border-black/[0.08] rounded-2xl p-6">
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#0284C7] uppercase mb-1">
                  {lang === 'en' ? 'Live Workshops' : 'Amahugurwa Imbonankubone'}
                </p>
                <h2 className="text-xl font-display font-bold text-[#0D0D0F]">
                  {lang === 'en' ? 'Upcoming sessions' : 'Ibiganiro biri imbere'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('events')}
                className="text-xs font-semibold text-[#0284C7] hover:underline whitespace-nowrap"
              >
                {lang === 'en' ? 'All events ->' : 'Byose ->'}
              </button>
            </div>

            <div className="space-y-2.5">
              {upcomingEvents.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => onNavigate('events')}
                  className="bg-[#FAFAFB] border border-black/[0.07] rounded-xl p-4 cursor-pointer hover:border-[#0284C7]/40 transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs text-[#5D5D66] mb-1">
                    <span className="tabular-nums font-medium text-[#0D0D0F]">{evt.dateLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{evt.locationLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{evt.languageLabel}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#0D0D0F]">{evt.titleLabel}</h3>
                </div>
              ))}
            </div>
          </div>

          {showVerifyBox && (
            <div className="bg-white border border-black/[0.08] rounded-2xl p-6">
              <p className="text-xs font-semibold tracking-wider text-[#0284C7] uppercase mb-1">
                {lang === 'en' ? 'Credential Verification' : 'Igenzura ry’Impamyabumenyi'}
              </p>
              <h3 className="text-lg font-display font-bold text-[#0D0D0F] mb-1.5">
                {lang === 'en'
                  ? 'Verify a Certificate of Completion'
                  : 'Genzura ukuri kw’Impamyabumenyi'}
              </h3>
              <p className="text-xs text-[#5D5D66] mb-4">
                {lang === 'en'
                  ? 'Verify issued credentials by Certificate ID (sample: RW-AI-2026-0042).'
                  : 'Genzura impamyabumenyi ukoresheje nimero yayo (urugero: RW-AI-2026-0042).'}
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (certInput.trim()) onQuickVerifyCert(certInput.trim());
                }}
                className="flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="text"
                  value={certInput}
                  onChange={(e) => setCertInput(e.target.value)}
                  placeholder="RW-AI-2026-0042"
                  aria-label="Certificate ID"
                  className="flex-1 px-3.5 py-2 text-sm font-mono bg-[#F7F8FA] border border-black/15 rounded-lg focus:outline-none focus:border-[#0284C7]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  {lang === 'en' ? 'Verify ID' : 'Genzura'}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
