import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { Language } from '../types';

export function CourseArtwork({
  category,
  code
}: {
  category: 'foundations' | 'prompting' | 'automation' | 'agents' | 'industry';
  code: string;
}) {
  if (category === 'foundations') {
    return (
      <div className="relative w-full aspect-[16/10] bg-[#F4F5F7] border-b border-black/[0.06] overflow-hidden flex items-center justify-center">
        <svg viewBox="0 0 400 240" className="w-full h-full" aria-hidden="true">
          <defs>
            <pattern id="grid-f" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#0D0D0F" strokeOpacity="0.06" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="400" height="240" fill="url(#grid-f)" />
          <circle cx="110" cy="120" r="46" fill="#FFFFFF" stroke="#0D0D0F" strokeOpacity="0.2" strokeWidth="1.25" />
          <circle cx="200" cy="120" r="46" fill="#FFFFFF" stroke="#0D7A5F" strokeWidth="1.5" />
          <circle cx="290" cy="120" r="46" fill="#0D0D0F" />
          <path d="M 156 120 L 154 120" stroke="#0D0D0F" strokeWidth="1.5" />
          <line x1="156" y1="120" x2="154" y2="120" stroke="#0D0D0F" />
          <text x="110" y="124" textAnchor="middle" className="fill-[#0D0D0F] text-[11px] font-mono">L1–L2</text>
          <text x="200" y="124" textAnchor="middle" className="fill-[#0D7A5F] text-[11px] font-mono">L3–L5</text>
          <text x="290" y="124" textAnchor="middle" className="fill-white text-[11px] font-mono">L6–L7</text>
        </svg>
        <span className="sr-only">{code} visual</span>
      </div>
    );
  }

  if (category === 'prompting') {
    return (
      <div className="relative w-full aspect-[16/10] bg-[#F4F5F7] border-b border-black/[0.06] overflow-hidden flex items-center justify-center">
        <svg viewBox="0 0 400 240" className="w-full h-full" aria-hidden="true">
          <rect x="44" y="42" width="140" height="156" rx="10" fill="#FFFFFF" stroke="#0D0D0F" strokeOpacity="0.14" />
          <line x1="64" y1="74" x2="154" y2="74" stroke="#0D0D0F" strokeOpacity="0.25" strokeWidth="2" />
          <line x1="64" y1="98" x2="164" y2="98" stroke="#0D0D0F" strokeOpacity="0.15" strokeWidth="2" />
          <line x1="64" y1="122" x2="140" y2="122" stroke="#0D7A5F" strokeWidth="2.5" />
          <line x1="64" y1="146" x2="158" y2="146" stroke="#0D0D0F" strokeOpacity="0.15" strokeWidth="2" />
          <path d="M 196 120 L 228 120" stroke="#0D7A5F" strokeWidth="1.75" strokeDasharray="3 3" />
          <rect x="238" y="64" width="118" height="112" rx="10" fill="#0D0D0F" />
          <line x1="258" y1="96" x2="334" y2="96" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="2" />
          <line x1="258" y1="118" x2="320" y2="118" stroke="#10A37F" strokeWidth="2.5" />
          <line x1="258" y1="140" x2="336" y2="140" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="2" />
        </svg>
      </div>
    );
  }

  if (category === 'automation') {
    return (
      <div className="relative w-full aspect-[16/10] bg-[#F4F5F7] border-b border-black/[0.06] overflow-hidden flex items-center justify-center">
        <svg viewBox="0 0 400 240" className="w-full h-full" aria-hidden="true">
          <rect x="44" y="88" width="84" height="64" rx="8" fill="#FFFFFF" stroke="#0D0D0F" strokeOpacity="0.2" />
          <rect x="158" y="88" width="84" height="64" rx="8" fill="#FFFFFF" stroke="#0D7A5F" strokeWidth="1.5" />
          <rect x="272" y="88" width="84" height="64" rx="8" fill="#0D0D0F" />
          <path d="M 128 120 L 158 120" stroke="#0D0D0F" strokeWidth="1.5" />
          <path d="M 242 120 L 272 120" stroke="#0D7A5F" strokeWidth="1.5" />
          <text x="86" y="124" textAnchor="middle" className="fill-[#0D0D0F] text-[10px] font-mono">Form</text>
          <text x="200" y="124" textAnchor="middle" className="fill-[#0D7A5F] text-[10px] font-mono">Sheets</text>
          <text x="314" y="124" textAnchor="middle" className="fill-white text-[10px] font-mono">Email</text>
        </svg>
      </div>
    );
  }

  if (category === 'agents') {
    return (
      <div className="relative w-full aspect-[16/10] bg-[#F4F5F7] border-b border-black/[0.06] overflow-hidden flex items-center justify-center">
        <svg viewBox="0 0 400 240" className="w-full h-full" aria-hidden="true">
          <circle cx="200" cy="120" r="38" fill="#0D0D0F" />
          <circle cx="200" cy="120" r="72" fill="none" stroke="#0D7A5F" strokeOpacity="0.45" strokeDasharray="4 4" />
          <circle cx="98" cy="74" r="20" fill="#FFFFFF" stroke="#0D0D0F" strokeOpacity="0.2" />
          <circle cx="302" cy="74" r="20" fill="#FFFFFF" stroke="#0D0D0F" strokeOpacity="0.2" />
          <circle cx="98" cy="166" r="20" fill="#FFFFFF" stroke="#0D0D0F" strokeOpacity="0.2" />
          <circle cx="302" cy="166" r="20" fill="#FFFFFF" stroke="#0D7A5F" strokeWidth="1.5" />
          <line x1="116" y1="84" x2="168" y2="106" stroke="#0D0D0F" strokeOpacity="0.25" />
          <line x1="284" y1="84" x2="232" y2="106" stroke="#0D0D0F" strokeOpacity="0.25" />
          <line x1="116" y1="156" x2="168" y2="134" stroke="#0D0D0F" strokeOpacity="0.25" />
          <line x1="284" y1="156" x2="232" y2="134" stroke="#0D7A5F" />
          <text x="200" y="124" textAnchor="middle" className="fill-white text-[10px] font-mono">AGENT</text>
        </svg>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[16/10] bg-[#F4F5F7] border-b border-black/[0.06] overflow-hidden flex items-center justify-center">
      <svg viewBox="0 0 400 240" className="w-full h-full" aria-hidden="true">
        <rect x="52" y="52" width="90" height="60" rx="8" fill="#FFFFFF" stroke="#0D0D0F" strokeOpacity="0.16" />
        <rect x="155" y="52" width="90" height="60" rx="8" fill="#FFFFFF" stroke="#0D0D0F" strokeOpacity="0.16" />
        <rect x="258" y="52" width="90" height="60" rx="8" fill="#FFFFFF" stroke="#0D7A5F" strokeWidth="1.5" />
        <rect x="52" y="128" width="90" height="60" rx="8" fill="#FFFFFF" stroke="#0D0D0F" strokeOpacity="0.16" />
        <rect x="155" y="128" width="90" height="60" rx="8" fill="#0D0D0F" />
        <rect x="258" y="128" width="90" height="60" rx="8" fill="#FFFFFF" stroke="#0D0D0F" strokeOpacity="0.16" />
        <text x="97" y="86" textAnchor="middle" className="fill-[#0D0D0F] text-[10px] font-mono">Education</text>
        <text x="200" y="86" textAnchor="middle" className="fill-[#0D0D0F] text-[10px] font-mono">Agri</text>
        <text x="303" y="86" textAnchor="middle" className="fill-[#0D7A5F] text-[10px] font-mono">Retail</text>
        <text x="97" y="162" textAnchor="middle" className="fill-[#0D0D0F] text-[10px] font-mono">NGOs</text>
        <text x="200" y="162" textAnchor="middle" className="fill-white text-[10px] font-mono">Service</text>
        <text x="303" y="162" textAnchor="middle" className="fill-[#0D0D0F] text-[10px] font-mono">Admin</text>
      </svg>
    </div>
  );
}

export function HeroSystemCanvas({ lang }: { lang: Language }) {
  const steps =
    lang === 'en'
      ? [
          { code: '01', label: 'AI Foundations', detail: 'LLMs, hallucinations & verification' },
          { code: '02', label: 'Prompt Systems', detail: 'Structured roles, constraints & chains' },
          { code: '03', label: 'No-Code Workflows', detail: 'Google Forms -> Sheets -> Email' },
          { code: '04', label: 'AI Automation & Agents', detail: 'Classification + human approval gate' }
        ]
      : [
          { code: '01', label: 'Ibanze kuri AI', detail: 'Imikorere ya AI n’igenzura ry’ukuri' },
          { code: '02', label: 'Amabwiriza ya AI', detail: 'Imiterere isobanutse ikoreshwa kenshi' },
          { code: '03', label: 'Imiyoboro Yikoresha', detail: 'Google Forms -> Sheets -> Email' },
          { code: '04', label: 'AI Agents & Ubugenzuzi', detail: 'Gusesengura no kwemezwa n’umuntu' }
        ];

  return (
    <div className="w-full h-full min-h-[340px] bg-[#F7F8FA] border border-black/[0.08] rounded-2xl p-6 lg:p-8 flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-black/[0.07] pb-4 mb-6">
        <span className="text-xs font-mono text-[#5D5D66]">
          {lang === 'en' ? '28-Day Practical Progression' : 'Urwego rw’imyigire y’iminsi 28'}
        </span>
        <span className="text-xs font-mono text-[#0D7A5F] tabular-nums">
          {lang === 'en' ? 'Levels 1 -> 7' : 'Ibyiciro 1 -> 7'}
        </span>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.code}
            className={`flex items-center justify-between gap-4 p-4 rounded-xl border transition-colors ${
              index === 3
                ? 'bg-[#0D0D0F] text-white border-[#0D0D0F]'
                : 'bg-white text-[#0D0D0F] border-black/[0.07]'
            }`}
          >
            <div className="flex items-center gap-4 min-w-0">
              <span
                className={`text-xs font-mono tabular-nums shrink-0 ${
                  index === 3 ? 'text-[#34D399]' : 'text-[#0D7A5F]'
                }`}
              >
                {step.code}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{step.label}</p>
                <p
                  className={`text-xs truncate ${
                    index === 3 ? 'text-white/70' : 'text-[#5D5D66]'
                  }`}
                >
                  {step.detail}
                </p>
              </div>
            </div>
            <span
              className={`text-xs font-mono tabular-nums shrink-0 ${
                index === 3 ? 'text-white/75' : 'text-[#5D5D66]'
              }`}
            >
              {`W${index + 1}`}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-black/[0.07] flex items-center justify-between text-xs text-[#5D5D66]">
        <span>{lang === 'en' ? '5 Practical Capstone Projects' : 'Imishinga ngiro 5'}</span>
        <span className="font-mono tabular-nums text-[#0D0D0F]">1,000 RWF</span>
      </div>
    </div>
  );
}

export function CertificateQrCode({ value }: { value: string }) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: 140,
      margin: 1,
      color: { dark: '#0D0D0F', light: '#FFFFFF' }
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        // Ignore QR generation errors
      });
    return () => {
      active = false;
    };
  }, [value]);

  if (!dataUrl) {
    return (
      <div className="w-24 h-24 rounded-lg border border-black/10 bg-[#F4F5F7] flex items-center justify-center text-[10px] font-mono text-[#5D5D66]">
        QR
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`Verification QR code for ${value}`}
      referrerPolicy="no-referrer"
      className="w-24 h-24 rounded-lg border border-black/10 bg-white p-1"
    />
  );
}
