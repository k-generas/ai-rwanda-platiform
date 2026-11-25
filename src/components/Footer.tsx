import React, { useState } from 'react';
import type { Language, PageRoute } from '../types';

interface FooterProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  onNavigate: (route: PageRoute) => void;
}

export function Footer({ lang, onChangeLang, onNavigate }: FooterProps) {
  const [legalDoc, setLegalDoc] = useState<'terms' | 'privacy' | null>(null);

  return (
    <footer className="border-t border-black/[0.08] bg-white mt-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-black/[0.06]">
          <div className="md:col-span-5">
            <p className="text-base font-display font-semibold text-[#0D0D0F] mb-2">
              AI Education Rwanda
            </p>
            <p className="text-sm text-[#5D5D66] leading-relaxed max-w-sm mb-4">
              {lang === 'en'
                ? 'Learn AI. Apply AI. Build with AI. Practical bilingual AI education for students, professionals, and businesses.'
                : 'Iga AI. Koresha AI. Wubake na AI. Uburezi bwa AI bufatika mu Cyongereza no mu Kinyarwanda.'}
            </p>
            <div className="inline-flex items-center gap-2 text-xs text-[#5D5D66]">
              <span>{lang === 'en' ? 'Language:' : 'Ururimi:'}</span>
              <button
                type="button"
                onClick={() => onChangeLang('en')}
                className={`font-medium ${lang === 'en' ? 'text-[#0D0D0F] underline' : ''}`}
              >
                English
              </button>
              <span aria-hidden="true">/</span>
              <button
                type="button"
                onClick={() => onChangeLang('rw')}
                className={`font-medium ${lang === 'rw' ? 'text-[#0D0D0F] underline' : ''}`}
              >
                Kinyarwanda
              </button>
            </div>
          </div>

          <div className="md:col-span-3 space-y-2 text-sm">
            <p className="text-xs font-semibold text-[#0D0D0F] mb-3">
              {lang === 'en' ? 'Platform' : 'Isomero'}
            </p>
            <button type="button" onClick={() => onNavigate('courses')} className="block text-[#5D5D66] hover:text-[#0D0D0F]">
              {lang === 'en' ? 'Courses & 28-Day Challenge' : 'Amasomo y’Iminsi 28'}
            </button>
            <button type="button" onClick={() => onNavigate('events')} className="block text-[#5D5D66] hover:text-[#0D0D0F]">
              {lang === 'en' ? 'Live Workshops & Events' : 'Ibiganiro n’Amahugurwa'}
            </button>
            <button type="button" onClick={() => onNavigate('projects')} className="block text-[#5D5D66] hover:text-[#0D0D0F]">
              {lang === 'en' ? 'Projects & Free Tools' : 'Imishinga & Ibikoresho'}
            </button>
          </div>

          <div className="md:col-span-4 space-y-2 text-sm">
            <p className="text-xs font-semibold text-[#0D0D0F] mb-3">
              {lang === 'en' ? 'Trust & Verification' : 'Icyizere & Igenzura'}
            </p>
            <button type="button" onClick={() => onNavigate('verify')} className="block text-[#5D5D66] hover:text-[#0D0D0F]">
              {lang === 'en' ? 'Verify a Certificate' : 'Genzura Impamyabumenyi'}
            </button>
            <button type="button" onClick={() => onNavigate('about')} className="block text-[#5D5D66] hover:text-[#0D0D0F]">
              {lang === 'en' ? 'About, FAQ & Contact' : 'Ibyacu & Twandikire'}
            </button>
            <div className="flex items-center gap-4 pt-1">
              <button type="button" onClick={() => setLegalDoc('terms')} className="text-xs text-[#5D5D66] hover:text-[#0D0D0F]">
                {lang === 'en' ? 'Terms & Conditions' : 'Amategeko n’Amabwiriza'}
              </button>
              <button type="button" onClick={() => setLegalDoc('privacy')} className="text-xs text-[#5D5D66] hover:text-[#0D0D0F]">
                {lang === 'en' ? 'Privacy Policy' : 'Uburenganzira ku Makuru'}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#5D5D66]">
          <p>© 2026 AI Education Rwanda. Kigali, Rwanda.</p>
          <p>
            {lang === 'en'
              ? 'Aligned with Rwanda Law No. 058/2021 on personal data protection.'
              : 'Byubahiriza Itegeko N° 058/2021 rirengera amakuru bwite mu Rwanda.'}
          </p>
        </div>
      </div>

      {legalDoc && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-black/10 rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-[#0D0D0F]">
                {legalDoc === 'terms'
                  ? lang === 'en'
                    ? 'Terms & Conditions'
                    : 'Amategeko n’Amabwiriza'
                  : lang === 'en'
                    ? 'Privacy Policy (Law No. 058/2021)'
                    : 'Politiki y’Ibanga ry’Amakuru'}
              </h2>
              <button
                type="button"
                onClick={() => setLegalDoc(null)}
                className="text-xs font-medium text-[#5D5D66]"
              >
                {lang === 'en' ? 'Close' : 'Funga'}
              </button>
            </div>
            <p className="text-sm text-[#5D5D66] leading-relaxed">
              {legalDoc === 'terms'
                ? 'Enrollment in the 28-Day Practical AI Challenge grants access to all 28 bilingual lessons, weekly quizzes, and project reviews. Certificates verify genuine completion of the challenge requirements (>= 70% overall and demonstrated final project) and do not claim external university or government accreditation unless explicitly stated.'
                : 'AI Education Rwanda collects only the profile, enrollment, assessment, and project information needed to deliver courses and verify certificates, in accordance with Rwanda Law No. 058/2021 relating to the protection of personal data and privacy. Mobile Money PINs are never requested or stored. Learners may request account review or deletion via the Contact page.'}
            </p>
          </div>
        </div>
      )}
    </footer>
  );
}
