import React, { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type { Course, Language, PageRoute, PlatformSettings, ProgrammeRecord } from '../types';
import {
  COURSES,
  LEARNING_LEVELS,
  PRACTICAL_PROJECTS,
  UI_COPY,
  WORKSHOP_EVENTS
} from '../data/curriculum';
import { CourseArtwork, HeroSystemCanvas } from './BrandVisuals';

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

  return (
    <div>
      {/* Hero Section */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-10 pb-14 lg:pt-16 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-xs font-medium text-[#5D5D66] mb-4">
              {UI_COPY.hero.kicker[lang]}
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-display font-semibold tracking-tight text-[#0D0D0F] leading-[1.08] text-balance mb-6">
              {UI_COPY.hero.headline[lang]}
            </h1>
            <p className="text-base sm:text-lg text-[#5D5D66] leading-relaxed max-w-xl mb-8">
              {UI_COPY.hero.subheadline[lang]}
            </p>

            {/* Three fast answers from the blueprint */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 pt-6 border-t border-black/[0.08]">
              <div>
                <p className="text-xs font-semibold text-[#0D0D0F] mb-1">
                  {lang === 'en' ? 'What you learn' : 'Icyo wiga'}
                </p>
                <p className="text-xs text-[#5D5D66] leading-relaxed">
                  {lang === 'en'
                    ? 'AI foundations, prompting, no-code workflows, and AI agents.'
                    : 'Ibanze kuri AI, kwandika amabwiriza, imiyoboro na AI agents.'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#0D0D0F] mb-1">
                  {lang === 'en' ? 'Who it serves' : 'Abo igenewe'}
                </p>
                <p className="text-xs text-[#5D5D66] leading-relaxed">
                  {lang === 'en'
                    ? 'Students, TVET & university graduates, educators, and SMEs.'
                    : 'Abanyeshuri, abarangije TVET na kaminuza, abarimu n’ibigo.'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#0D0D0F] mb-1">
                  {lang === 'en' ? 'What you achieve' : 'Icyo ugeraho'}
                </p>
                <p className="text-xs text-[#5D5D66] leading-relaxed">
                  {lang === 'en'
                    ? '5 real projects and a QR-verified completion certificate.'
                    : 'Imishinga 5 n’impamyabumenyi igenzurwa na QR.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onSelectCourse('challenge-28')}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-white bg-[#0D0D0F] rounded-lg hover:bg-[#232329] transition-colors whitespace-nowrap shrink-0"
              >
                <span>{UI_COPY.hero.primaryCta[lang]}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onOpenSampleDay(1)}
                className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-[#0D0D0F] hover:text-[#0D7A5F] transition-colors whitespace-nowrap shrink-0"
              >
                <span>{UI_COPY.hero.secondaryCta[lang]}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onOpenSampleDay(2)}
                className="inline-flex items-center gap-1.5 px-3 py-3 text-sm font-medium text-[#5D5D66] hover:text-[#0D0D0F] transition-colors whitespace-nowrap shrink-0"
              >
                <span>{lang === 'en' ? 'Day 2: AI vs ML vs DL' : 'Umunsi wa 2: AI vs ML vs DL'}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 flex">
            <HeroSystemCanvas lang={lang} />
          </div>
        </div>

        {/* Full-Width 4-Column Proof Strip */}
        <div className="mt-12 pt-8 border-t border-black/[0.08] grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-2xl sm:text-3xl font-display font-semibold text-[#0D0D0F] tabular-nums">
              28 Days
            </p>
            <p className="text-xs text-[#5D5D66] mt-1">
              {lang === 'en'
                ? 'Guided 5–12 min daily lessons across 4 structured weeks'
                : 'Amasomo ya buri munsi y’iminota 5–12 mu byumweru 4'}
            </p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-display font-semibold text-[#0D0D0F] tabular-nums">
              7 Levels
            </p>
            <p className="text-xs text-[#5D5D66] mt-1">
              {lang === 'en'
                ? 'Progression from AI awareness to practical AI systems'
                : 'Urwego ruva ku kumenya AI rukagera ku kubaka sisitemu'}
            </p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-display font-semibold text-[#0D0D0F] tabular-nums">
              5 Projects
            </p>
            <p className="text-xs text-[#5D5D66] mt-1">
              {lang === 'en'
                ? 'Hands-on automations using free-tier Workspace, Make & Gemini'
                : 'Imishinga ngiro ikoresha porogaramu z’ubuntu'}
            </p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-display font-semibold text-[#0D0D0F] tabular-nums">
              1,000 RWF
            </p>
            <p className="text-xs text-[#5D5D66] mt-1">
              {lang === 'en'
                ? 'Introductory pilot cohort fee via MTN MoMo or Airtel Money'
                : 'Ikiguzi cy’igerageza cyishyurwa na MTN MoMo cyangwa Airtel Money'}
            </p>
          </div>
        </div>
      </section>

      {/* Featured Courses Section */}
      <section className="bg-[#F9F9FB] border-y border-black/[0.06] py-16">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-medium text-[#0D7A5F] mb-2">
                {lang === 'en' ? 'Curriculum & Product Ladder' : 'Gahunda y’Amasomo'}
              </p>
              <h2 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight text-[#0D0D0F]">
                {lang === 'en' ? 'Structured courses built for real work' : 'Amasomo yateguwe ku mirimo ya buri munsi'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('courses')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0D0D0F] hover:text-[#0D7A5F] transition-colors whitespace-nowrap shrink-0"
            >
              <span>{lang === 'en' ? 'View all courses' : 'Reba amasomo yose'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredCourses.map((course) => (
              <article
                key={course.id}
                onClick={() => onSelectCourse(course.id)}
                className="group bg-white border border-black/[0.08] rounded-2xl overflow-hidden cursor-pointer hover:border-black/25 transition-colors flex flex-col"
              >
                <CourseArtwork category={course.category} code={course.code} />
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[#5D5D66] mb-2">
                      <span className="font-mono">{course.code}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{course.durationDays} {lang === 'en' ? 'Days' : 'Iminsi'}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {course.status === 'active'
                          ? lang === 'en'
                            ? 'Open now'
                            : 'Rirafunguye'
                          : lang === 'en'
                            ? 'Upcoming'
                            : 'Riri hafi'}
                      </span>
                    </div>
                    <h3 className="text-lg font-display font-semibold text-[#0D0D0F] group-hover:text-[#0D7A5F] transition-colors mb-2">
                      {course.title[lang]}
                    </h3>
                    <p className="text-sm text-[#5D5D66] leading-relaxed">
                      {course.subtitle[lang]}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-black/[0.06] flex items-center justify-between text-xs">
                    <span className="font-mono tabular-nums font-medium text-[#0D0D0F]">
                      {course.status === 'active'
                        ? course.isFree || course.priceRwf === 0
                          ? lang === 'en'
                            ? 'Free'
                            : 'Ubuntu'
                          : `${course.priceRwf.toLocaleString()} RWF`
                        : lang === 'en'
                          ? 'Join waitlist'
                          : 'Iyandikishe mbere'}
                    </span>
                    <span className="text-[#5D5D66] group-hover:text-[#0D0D0F] inline-flex items-center gap-1">
                      <span>{lang === 'en' ? 'Explore' : 'Fungura'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 7 Learning Levels Interactive Framework */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16">
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-medium text-[#0D7A5F] mb-2">
            {lang === 'en' ? 'Educational Framework' : 'Imiterere y’Imyigire'}
          </p>
          <h2 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight text-[#0D0D0F] mb-3">
            {lang === 'en'
              ? 'Seven levels from basic usage to AI systems'
              : 'Ibyiciro birindwi kuva ku ntangiriro kugeza kuri sisitemu za AI'}
          </h2>
          <p className="text-sm sm:text-base text-[#5D5D66] leading-relaxed">
            {lang === 'en'
              ? 'The 28-Day Challenge introduces all seven levels honestly—prioritizing foundational understanding and practical workflows rather than empty hype.'
              : 'Icyiciro cy’iminsi 28 gitanga umusingi w’ibi byiciro birindwi bishingiye ku bumenyi bufatika.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-1.5">
            {LEARNING_LEVELS.map((item) => {
              const active = item.level === activeLevel;
              return (
                <button
                  key={item.level}
                  type="button"
                  onClick={() => setActiveLevel(item.level)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors flex items-center justify-between gap-4 ${
                    active
                      ? 'bg-[#0D0D0F] text-white border-[#0D0D0F]'
                      : 'bg-white text-[#0D0D0F] border-black/[0.08] hover:border-black/25'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`text-xs font-mono tabular-nums shrink-0 ${
                        active ? 'text-[#34D399]' : 'text-[#5D5D66]'
                      }`}
                    >
                      0{item.level}
                    </span>
                    <span className="text-sm font-medium truncate">{item.title[lang]}</span>
                  </div>
                  <ArrowRight
                    className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-[#5D5D66]'}`}
                  />
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7 bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6 sm:p-8">
            <p className="text-xs font-mono text-[#0D7A5F] mb-2 tabular-nums">
              {lang === 'en' ? `Level 0${selectedLevel.level}` : `Icyiciro cya 0${selectedLevel.level}`}
            </p>
            <h3 className="text-xl sm:text-2xl font-display font-semibold text-[#0D0D0F] mb-3">
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
                  <CheckCircle2 className="w-4 h-4 text-[#0D7A5F] shrink-0 mt-0.5" />
                  <span>{topic}</span>
                </div>
              ))}
            </div>

            <div className="pt-5 border-t border-black/[0.08]">
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

      {/* Practical Projects & Events Split */}
      <section className="bg-[#F9F9FB] border-t border-black/[0.06] py-16">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Projects */}
          <div className="lg:col-span-6">
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-medium text-[#0D7A5F] mb-1">
                  {lang === 'en' ? 'Hands-On Portfolio' : 'Imishinga Ngiro'}
                </p>
                <h2 className="text-2xl font-display font-semibold text-[#0D0D0F]">
                  {lang === 'en' ? 'Five projects learners build' : 'Imishinga itanu abanyeshuri bubaka'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('projects')}
                className="text-xs font-medium text-[#0D0D0F] hover:text-[#0D7A5F] whitespace-nowrap shrink-0"
              >
                {lang === 'en' ? 'Open tools & templates ->' : 'Fungura ibikoresho ->'}
              </button>
            </div>

            <div className="space-y-3">
              {PRACTICAL_PROJECTS.map((proj) => (
                <div
                  key={proj.key}
                  className="bg-white border border-black/[0.08] rounded-xl p-4"
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

          {/* Upcoming Events + Quick Certificate Verifier */}
          <div className="lg:col-span-6 flex flex-col justify-between gap-8">
            <div>
              <div className="flex items-end justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs font-medium text-[#0D7A5F] mb-1">
                    {lang === 'en' ? 'Live Workshops' : 'Amahugurwa Imbonankubone'}
                  </p>
                  <h2 className="text-2xl font-display font-semibold text-[#0D0D0F]">
                    {lang === 'en' ? 'Upcoming sessions' : 'Ibiganiro biri imbere'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('events')}
                  className="text-xs font-medium text-[#0D0D0F] hover:text-[#0D7A5F] whitespace-nowrap shrink-0"
                >
                  {lang === 'en' ? 'All events ->' : 'Ibiganiro byose ->'}
                </button>
              </div>

              <div className="space-y-3">
                {upcomingEvents.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => onNavigate('events')}
                    className="bg-white border border-black/[0.08] rounded-xl p-4 cursor-pointer hover:border-black/25 transition-colors"
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
                <p className="text-xs font-medium text-[#0D7A5F] mb-1">
                  {lang === 'en' ? 'Credential Verification' : 'Igenzura ry’Impamyabumenyi'}
                </p>
                <h3 className="text-lg font-display font-semibold text-[#0D0D0F] mb-2">
                  {lang === 'en'
                    ? 'Verify a Certificate of Completion'
                    : 'Genzura ukuri kw’Impamyabumenyi'}
                </h3>
                <p className="text-xs text-[#5D5D66] mb-4">
                  {lang === 'en'
                    ? 'Employers and institutions can verify issued credentials by Certificate ID (sample: RW-AI-2026-0042).'
                    : 'Abakoresha n’ibigo bashobora kugenzura impamyabumenyi bakoresheje nimero yayo (urugero: RW-AI-2026-0042).'}
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
                    className="flex-1 px-3.5 py-2 text-sm font-mono bg-[#F9F9FB] border border-black/15 rounded-lg focus:outline-none focus:border-[#0D7A5F]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-[#0D0D0F] rounded-lg hover:bg-[#232329] transition-colors whitespace-nowrap shrink-0"
                  >
                    {lang === 'en' ? 'Verify ID' : 'Genzura'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
