import React from 'react';
import type { User } from 'firebase/auth';
import type { Language, PageRoute, StaffRole } from '../types';
import { UI_COPY } from '../data/curriculum';
import { ROLE_DISPLAY } from '../lib/permissions';

interface SubBarProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  user: User | null;
  staffRole: StaffRole;
  onSignOut: () => void;
}

export function SubBar({
  lang,
  onChangeLang,
  currentRoute,
  onNavigate,
  user,
  staffRole,
  onSignOut
}: SubBarProps) {
  const isStaff = staffRole !== 'learner';
  const roleTag =
    staffRole === 'superadmin'
      ? 'FOUNDER · SUPERADMIN'
      : isStaff
        ? `STAFF · ${ROLE_DISPLAY[staffRole][lang].toUpperCase()}`
        : lang === 'en'
          ? 'LEARNER'
          : 'UMUNYESHURI';

  return (
    <div className="bg-[#FAFAFB] border-b border-black/[0.06]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="inline-flex items-center p-0.5 bg-[#ECEEF2] rounded-lg"
            role="group"
            aria-label="Course language selector"
          >
            <button
              type="button"
              onClick={() => onChangeLang('en')}
              className={`px-3 py-1.5 text-[13px] sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                lang === 'en'
                  ? 'bg-white text-[#0D0D0F] shadow-xs'
                  : 'text-[#5D5D66] hover:text-[#0D0D0F]'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => onChangeLang('rw')}
              className={`px-3 py-1.5 text-[13px] sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                lang === 'rw'
                  ? 'bg-white text-[#0D0D0F] shadow-xs'
                  : 'text-[#5D5D66] hover:text-[#0D0D0F]'
              }`}
            >
              Kinyarwanda
            </button>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('verify')}
            className={`text-[13px] sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              currentRoute === 'verify'
                ? 'text-[#0D7A5F] underline underline-offset-4'
                : 'text-[#5D5D66] hover:text-[#0D0D0F]'
            }`}
          >
            {UI_COPY.nav.verify[lang]}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <>
              <span
                className={`text-xs font-mono tracking-wide whitespace-nowrap shrink-0 ${
                  staffRole === 'superadmin'
                    ? 'text-[#0D7A5F] font-semibold'
                    : isStaff
                      ? 'text-[#0D0D0F] font-medium'
                      : 'text-[#5D5D66]'
                }`}
              >
                {roleTag}
              </span>
              <span className="text-[13px] text-[#5D5D66] truncate max-w-[180px]" aria-label="Signed in email">
                {user.email || user.displayName}
              </span>
              <button
                type="button"
                onClick={onSignOut}
                className="text-[13px] font-medium text-[#5D5D66] hover:text-[#0D0D0F] transition-colors whitespace-nowrap shrink-0"
              >
                {UI_COPY.nav.signOut[lang]}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
