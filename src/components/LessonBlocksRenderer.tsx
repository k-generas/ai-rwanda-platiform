import React, { useState } from 'react';
import {
  Check,
  CheckSquare,
  Copy,
  Download,
  ExternalLink,
  Square
} from 'lucide-react';
import type { Language, LessonBlock } from '../types';

interface LessonBlocksRendererProps {
  lang: Language;
  blocks: LessonBlock[];
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace('/', '');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function LessonBlocksRenderer({ lang, blocks }: LessonBlocksRendererProps) {
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [sandboxValues, setSandboxValues] = useState<Record<string, string>>({});

  const handleCopy = (blockId: string, text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedBlockId(blockId);
      setTimeout(() => setCopiedBlockId(null), 1800);
    });
  };

  if (blocks.length === 0) {
    return (
      <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6 text-sm text-[#5D5D66]">
        {lang === 'en'
          ? 'No structured content blocks have been published in this language yet.'
          : 'Nta bice by’isomo biratangazwa muri uru rurimi.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {blocks.map((block) => {
        if (block.type === 'rich_text') {
          return (
            <section
              key={block.id}
              className="border border-black/[0.08] rounded-2xl p-6 bg-white space-y-2.5"
            >
              {block.title && (
                <h2 className="text-base font-display font-semibold text-[#0D0D0F]">
                  {block.title}
                </h2>
              )}
              <div className="text-sm text-[#3F3F46] leading-relaxed whitespace-pre-line">
                {block.body}
              </div>
            </section>
          );
        }

        if (block.type === 'callout') {
          const variantStyles =
            block.variant === 'rwanda_context'
              ? 'bg-[#F2FBF8] border-[#0D7A5F]/25 text-[#0D0D0F]'
              : block.variant === 'warning'
                ? 'bg-[#FFFBEB] border-[#D97706]/30 text-[#0D0D0F]'
                : block.variant === 'tip'
                  ? 'bg-[#F0F9FF] border-[#0369A1]/20 text-[#0D0D0F]'
                  : 'bg-[#F9F9FB] border-black/[0.08] text-[#0D0D0F]';

          return (
            <section key={block.id} className={`border rounded-2xl p-6 space-y-2 ${variantStyles}`}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">{block.title || 'Callout'}</h2>
                <span className="text-[11px] font-mono uppercase text-[#5D5D66]">
                  {(block.variant || 'note').replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-[#3F3F46] leading-relaxed whitespace-pre-line">
                {block.body}
              </p>
            </section>
          );
        }

        if (block.type === 'code') {
          const codeText = block.code || '';
          return (
            <section key={block.id} className="bg-[#0D0D0F] text-white rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-mono text-white/75">
                  {block.title || 'Prompt / Code'} {block.language ? `· ${block.language}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(block.id, codeText)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-md transition-colors"
                >
                  {copiedBlockId === block.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#34D399]" />
                      <span>{lang === 'en' ? 'Copied' : 'Byakoporowe'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{lang === 'en' ? 'Copy' : 'Kopora'}</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="text-xs sm:text-sm font-mono whitespace-pre-wrap text-white/90 leading-relaxed overflow-x-auto">
                {codeText}
              </pre>
            </section>
          );
        }

        if (block.type === 'table') {
          const headers = block.headers || [];
          const rows = block.rows || [];
          return (
            <section
              key={block.id}
              className="border border-black/[0.08] rounded-2xl p-6 bg-white space-y-3 overflow-x-auto"
            >
              {block.title && (
                <h2 className="text-sm font-semibold text-[#0D0D0F]">{block.title}</h2>
              )}
              <table className="w-full text-left text-xs border-collapse">
                {headers.length > 0 && (
                  <thead>
                    <tr className="border-b border-black/[0.08] text-[#5D5D66]">
                      {headers.map((h, i) => (
                        <th key={i} className="py-2 pr-4 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-black/[0.06]">
                  {rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="py-2.5 pr-4 text-[#0D0D0F] tabular-nums">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        }

        if (block.type === 'image') {
          return (
            <figure
              key={block.id}
              className="border border-black/[0.08] rounded-2xl p-5 bg-[#F9F9FB] space-y-3"
            >
              {block.title && (
                <h2 className="text-sm font-semibold text-[#0D0D0F]">{block.title}</h2>
              )}
              {block.url ? (
                <img
                  src={block.url}
                  alt={block.altText || block.title || 'Lesson visual'}
                  className="w-full max-h-[420px] object-contain rounded-xl bg-white border border-black/[0.06]"
                />
              ) : (
                <div className="py-10 text-center text-xs text-[#5D5D66] border border-dashed border-black/15 rounded-xl bg-white">
                  {lang === 'en' ? 'Image URL not attached yet' : 'Ishusho ntabwo irongerwaho'}
                </div>
              )}
              {block.caption && (
                <figcaption className="text-xs text-[#5D5D66]">{block.caption}</figcaption>
              )}
            </figure>
          );
        }

        if (block.type === 'video') {
          const embedUrl = block.url ? getYouTubeEmbedUrl(block.url) : null;
          return (
            <section
              key={block.id}
              className="border border-black/[0.08] rounded-2xl p-5 bg-white space-y-3"
            >
              {block.title && (
                <h2 className="text-sm font-semibold text-[#0D0D0F]">{block.title}</h2>
              )}
              {embedUrl ? (
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                  <iframe
                    src={embedUrl}
                    title={block.title || 'Lesson video'}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              ) : block.url ? (
                <video src={block.url} controls className="w-full rounded-xl bg-black max-h-[420px]" />
              ) : (
                <div className="py-10 text-center text-xs text-[#5D5D66] border border-dashed border-black/15 rounded-xl bg-[#F9F9FB]">
                  {lang === 'en' ? 'Video URL not attached yet' : 'Amashusho ntabwo arashyirwaho'}
                </div>
              )}
              {block.caption && <p className="text-xs text-[#5D5D66]">{block.caption}</p>}
            </section>
          );
        }

        if (block.type === 'audio') {
          return (
            <section
              key={block.id}
              className="border border-black/[0.08] rounded-2xl p-5 bg-[#F9F9FB] space-y-2.5"
            >
              <h2 className="text-sm font-semibold text-[#0D0D0F]">
                {block.title || (lang === 'en' ? 'Audio Walkthrough' : 'Isomo mu Majwi')}
              </h2>
              {block.url ? (
                <audio controls src={block.url} className="w-full" />
              ) : (
                <p className="text-xs text-[#5D5D66]">
                  {lang === 'en' ? 'Audio URL pending attachment.' : 'Amajwi ntarashyirwaho.'}
                </p>
              )}
              {block.caption && <p className="text-xs text-[#5D5D66]">{block.caption}</p>}
            </section>
          );
        }

        if (block.type === 'download' || block.type === 'external_resource') {
          const isDownload = block.type === 'download';
          return (
            <section
              key={block.id}
              className="border border-black/[0.08] rounded-2xl p-5 bg-white flex flex-wrap items-center justify-between gap-4"
            >
              <div>
                <h2 className="text-sm font-semibold text-[#0D0D0F]">
                  {block.title || (isDownload ? 'Downloadable Worksheet' : 'External Resource')}
                </h2>
                {block.caption && <p className="text-xs text-[#5D5D66] mt-0.5">{block.caption}</p>}
              </div>
              {block.url ? (
                <a
                  href={block.url}
                  target="_blank"
                  rel="noreferrer"
                  download={isDownload ? true : undefined}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0D0D0F] rounded-lg hover:bg-[#232329]"
                >
                  {isDownload ? (
                    <Download className="w-3.5 h-3.5" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5" />
                  )}
                  <span>{block.label || (isDownload ? 'Download' : 'Open Resource')}</span>
                </a>
              ) : (
                <span className="text-xs text-[#5D5D66] font-mono">Link pending</span>
              )}
            </section>
          );
        }

        if (block.type === 'interactive') {
          const currentVal = sandboxValues[block.id] ?? block.promptTemplate ?? '';
          return (
            <section
              key={block.id}
              className="border border-[#0D7A5F]/25 rounded-2xl p-6 bg-[#F2FBF8] space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-[#0D0D0F]">
                  {block.title || 'Interactive Prompt Sandbox'}
                </h2>
                <button
                  type="button"
                  onClick={() => handleCopy(block.id, currentVal)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-[#0D0D0F] text-white rounded-md"
                >
                  {copiedBlockId === block.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#34D399]" />
                      <span>{lang === 'en' ? 'Copied' : 'Byakoporowe'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{lang === 'en' ? 'Copy Prompt' : 'Kopora'}</span>
                    </>
                  )}
                </button>
              </div>
              {block.body && <p className="text-xs text-[#3F3F46]">{block.body}</p>}
              <textarea
                rows={4}
                value={currentVal}
                onChange={(e) =>
                  setSandboxValues((prev) => ({ ...prev, [block.id]: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-white border border-black/15 rounded-xl focus:outline-none focus:border-[#0D7A5F]"
              />
            </section>
          );
        }

        if (block.type === 'checklist') {
          const items = block.items || [];
          return (
            <section
              key={block.id}
              className="border border-black/[0.08] rounded-2xl p-6 bg-white space-y-3"
            >
              <h2 className="text-sm font-semibold text-[#0D0D0F]">
                {block.title || 'Action Checklist'}
              </h2>
              {block.body && <p className="text-xs text-[#5D5D66]">{block.body}</p>}
              <div className="space-y-2 pt-1">
                {items.map((item, idx) => {
                  const key = `${block.id}_${idx}`;
                  const checked = Boolean(checkedItems[key]);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }))
                      }
                      className="w-full flex items-start gap-2.5 text-left text-sm py-1.5 px-2 rounded-lg hover:bg-[#F9F9FB]"
                    >
                      {checked ? (
                        <CheckSquare className="w-4 h-4 text-[#0D7A5F] shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-[#5D5D66] shrink-0 mt-0.5" />
                      )}
                      <span className={checked ? 'line-through text-[#5D5D66]' : 'text-[#0D0D0F]'}>
                        {item}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        }

        if (block.type === 'quiz') {
          const picked = quizAnswers[block.id] ?? null;
          const correctIndex = block.correctIndex ?? 0;
          return (
            <section
              key={block.id}
              className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6 space-y-3"
            >
              <h2 className="text-xs font-mono uppercase text-[#0D7A5F]">
                {block.title || (lang === 'en' ? 'Knowledge Check' : 'Isuzuma')}
              </h2>
              <p className="text-base font-medium text-[#0D0D0F]">{block.question}</p>
              <div className="space-y-2">
                {(block.options || []).map((opt, idx) => {
                  const isPicked = picked === idx;
                  const isCorrect = idx === correctIndex;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setQuizAnswers((prev) => ({ ...prev, [block.id]: idx }))}
                      className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                        isPicked
                          ? isCorrect
                            ? 'bg-[#ECFDF5] border-[#0D7A5F] text-[#0D0D0F]'
                            : 'bg-[#FEF2F2] border-[#DC2626] text-[#0D0D0F]'
                          : 'bg-white border-black/[0.08] text-[#0D0D0F] hover:border-black/25'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {picked !== null && block.explanation && (
                <p className="text-xs text-[#5D5D66] pt-1">
                  <strong className="text-[#0D0D0F]">
                    {picked === correctIndex
                      ? lang === 'en'
                        ? 'Correct: '
                        : 'Nibyo: '
                      : lang === 'en'
                        ? 'Review: '
                        : 'Subiramo: '}
                  </strong>
                  {block.explanation}
                </p>
              )}
            </section>
          );
        }

        // assignment or reflection
        return (
          <section
            key={block.id}
            className="border border-black/[0.08] rounded-2xl p-6 bg-[#F9F9FB] space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#0D0D0F]">
                {block.title || (block.type === 'assignment' ? 'Practical Assignment' : 'Reflection')}
              </h2>
              <span className="text-[11px] font-mono uppercase text-[#0D7A5F]">
                {block.type}
              </span>
            </div>
            <p className="text-sm text-[#3F3F46] leading-relaxed whitespace-pre-line">
              {block.body}
            </p>
          </section>
        );
      })}
    </div>
  );
}
