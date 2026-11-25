import React, { useState } from 'react';
import { Check, Copy, Download, ExternalLink } from 'lucide-react';
import type { Language, PageRoute, ResourceItem } from '../types';
import {
  LEARNING_TOOLS,
  PRACTICAL_PROJECTS,
  TEMPLATE_RESOURCES
} from '../data/curriculum';

interface ProjectsHubViewProps {
  lang: Language;
  resources?: ResourceItem[];
  onNavigate: (route: PageRoute) => void;
}

export function ProjectsHubView({ lang, resources = [], onNavigate }: ProjectsHubViewProps) {
  const [selectedProjectKey, setSelectedProjectKey] = useState<string>(
    PRACTICAL_PROJECTS[0].key
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeProject =
    PRACTICAL_PROJECTS.find((p) => p.key === selectedProjectKey) ?? PRACTICAL_PROJECTS[0];

  const displayResources =
    resources.length > 0
      ? resources.map((r) => ({
          id: r.id,
          category: r.category,
          title: { en: r.titleEn, rw: r.titleRw },
          description: { en: r.descriptionEn, rw: r.descriptionRw },
          filename: r.filename,
          externalUrl: r.externalUrl,
          contentEn: r.contentEn,
          contentRw: r.contentRw
        }))
      : TEMPLATE_RESOURCES.map((r) => ({
          ...r,
          externalUrl: undefined as string | undefined
        }));

  const handleDownloadMarkdown = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 space-y-16">
      {/* Header */}
      <header className="max-w-2xl">
        <p className="text-xs font-medium text-[#0D7A5F] mb-2">
          {lang === 'en' ? 'Practical Builds, Tools & Templates' : 'Imishinga, Ibikoresho n’Impapuro'}
        </p>
        <h1 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight text-[#0D0D0F] mb-3">
          {lang === 'en'
            ? 'Projects & Downloadable Resources'
            : 'Imishinga Ngiro n’Ibikoresho byo Gukuramo'}
        </h1>
        <p className="text-base text-[#5D5D66] leading-relaxed">
          {lang === 'en'
            ? 'Every learner completes practical builds using free-tier tools—or proposes a custom workflow solving a real local problem.'
            : 'Buri munyeshuri akora umushinga ufatika akoresheje porogaramu z’ubuntu cyangwa agahimba uwe ukemura ikibazo cyo hafi.'}
        </p>
      </header>

      {/* 5 Practical Projects Interactive Explorer */}
      <section>
        <h2 className="text-xl font-display font-semibold text-[#0D0D0F] mb-6">
          {lang === 'en' ? '01. Five Core Course Projects' : '01. Imishinga Itanu y’Icyiciro'}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-2">
            {PRACTICAL_PROJECTS.map((proj) => {
              const active = proj.key === activeProject.key;
              return (
                <button
                  key={proj.key}
                  type="button"
                  onClick={() => setSelectedProjectKey(proj.key)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border transition-colors ${
                    active
                      ? 'bg-[#0D0D0F] text-white border-[#0D0D0F]'
                      : 'bg-white text-[#0D0D0F] border-black/[0.08] hover:border-black/25'
                  }`}
                >
                  <p
                    className={`text-xs font-mono tabular-nums mb-0.5 ${
                      active ? 'text-[#34D399]' : 'text-[#5D5D66]'
                    }`}
                  >
                    Project {proj.number}
                  </p>
                  <p className="text-sm font-semibold">{proj.title[lang]}</p>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7 bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6 sm:p-8">
            <p className="text-xs font-mono text-[#0D7A5F] mb-2">
              Project {activeProject.number} · {activeProject.tools.join(' · ')}
            </p>
            <h3 className="text-2xl font-display font-semibold text-[#0D0D0F] mb-3">
              {activeProject.title[lang]}
            </h3>
            <p className="text-sm sm:text-base text-[#5D5D66] leading-relaxed mb-6">
              {activeProject.summary[lang]}
            </p>

            <h4 className="text-xs font-semibold text-[#0D0D0F] mb-3">
              {lang === 'en' ? 'Architecture & Execution Steps' : 'Imiterere n’Intambwe z’Umushinga'}
            </h4>
            <ol className="space-y-2.5 mb-6">
              {activeProject.workflowSteps[lang].map((step, i) => (
                <li
                  key={step}
                  className="bg-white border border-black/[0.06] rounded-xl px-4 py-3 text-sm text-[#0D0D0F] flex items-start gap-3"
                >
                  <span className="font-mono text-xs text-[#0D7A5F] tabular-nums mt-0.5">
                    {`0${i + 1}`}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <div className="pt-4 border-t border-black/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#0D0D0F]">
                  {lang === 'en' ? 'Expected Deliverable' : 'Ibisabwa Gutangwa'}
                </p>
                <p className="text-xs text-[#5D5D66] mt-0.5">{activeProject.deliverable[lang]}</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="px-4 py-2 text-xs font-medium text-white bg-[#0D0D0F] rounded-lg hover:bg-[#232329] whitespace-nowrap shrink-0"
              >
                {lang === 'en' ? 'Submit in Dashboard' : 'Tanga Umushinga'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Downloadable Worksheets & Templates */}
      <section>
        <h2 className="text-xl font-display font-semibold text-[#0D0D0F] mb-2">
          {lang === 'en' ? '02. Downloadable Learning Templates' : '02. Impapuro z’Imyitozo zo Gukuramo'}
        </h2>
        <p className="text-sm text-[#5D5D66] mb-6">
          {lang === 'en'
            ? 'Lightweight markdown worksheets for prompt design, workflow mapping, human approval, and capstone rubrics.'
            : 'Impapuro nto zorohera telefoni zigufasha gutegura amabwiriza, imiyoboro n’umushinga wa nyuma.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayResources.map((res) => {
            const content = lang === 'en' ? res.contentEn : res.contentRw;
            return (
              <div
                key={res.id}
                className="bg-white border border-black/[0.08] rounded-2xl p-6 flex flex-col justify-between"
              >
                <div>
                  <p className="text-xs font-mono text-[#0D7A5F] mb-1">{res.filename}</p>
                  <h3 className="text-base font-semibold text-[#0D0D0F] mb-2">
                    {res.title[lang]}
                  </h3>
                  <p className="text-sm text-[#5D5D66] leading-relaxed mb-5">
                    {res.description[lang]}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-black/[0.06]">
                  <button
                    type="button"
                    onClick={() => handleDownloadMarkdown(res.filename, content)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0D0D0F] rounded-lg hover:bg-[#232329] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'Download .md' : 'Kuramo (.md)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(res.id, content)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#0D0D0F] border border-black/15 rounded-lg hover:border-black/30 transition-colors"
                  >
                    {copiedId === res.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#0D7A5F]" />
                        <span>{lang === 'en' ? 'Copied' : 'Byakoporowe'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{lang === 'en' ? 'Copy text' : 'Kopora'}</span>
                      </>
                    )}
                  </button>
                  {res.externalUrl && (
                    <a
                      href={res.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#0D7A5F] border border-[#0D7A5F]/25 rounded-lg hover:bg-[#F2FBF8]"
                    >
                      <span>{lang === 'en' ? 'Open Link' : 'Fungura Link'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 9 Tools Directory */}
      <section>
        <h2 className="text-xl font-display font-semibold text-[#0D0D0F] mb-2">
          {lang === 'en' ? '03. Free-Tier Tools You Will Explore' : '03. Porogaramu Wiga Gukoresha'}
        </h2>
        <p className="text-sm text-[#5D5D66] mb-6">
          {lang === 'en'
            ? 'No paid software subscription is required for the 28-Day Practical AI Challenge.'
            : 'Nta porogaramu igomba kwishyurwa isabwa mu cyiciro cy’iminsi 28.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {LEARNING_TOOLS.map((tool) => (
            <div
              key={tool.name}
              className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-base font-semibold text-[#0D0D0F]">{tool.name}</h3>
                  <a
                    href={tool.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Visit ${tool.name}`}
                    className="text-[#5D5D66] hover:text-[#0D0D0F]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <p className="text-xs font-medium text-[#0D7A5F] mb-2">{tool.category[lang]}</p>
                <p className="text-xs text-[#5D5D66] leading-relaxed mb-3">{tool.purpose[lang]}</p>
              </div>
              <p className="text-[11px] font-mono text-[#0D0D0F]/75 pt-3 border-t border-black/[0.06]">
                {tool.freeTierNote[lang]}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
