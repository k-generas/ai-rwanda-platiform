import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  ChevronDown,
  Globe,
  LogOut,
  Menu,
  ShieldCheck,
  User as UserIcon,
  X
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { Language, PageRoute, StaffRole } from '../types';
import { UI_COPY } from '../data/curriculum';

interface HeaderProps {
  currentRoute: PageRoute;
  lang: Language;
  user: User | null;
  staffRole: StaffRole;
  mobileOpen: boolean;
  onToggleMobile: () => void;
  onChangeLang: (lang: Language) => void;
  onNavigate: (route: PageRoute) => void;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function Header({
  lang,
  user,
  staffRole,
  mobileOpen,
  onToggleMobile,
  onChangeLang,
  onNavigate,
  onSignIn,
  onSignOut
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isStaff = staffRole !== 'learner';
  const workspaceRoute: PageRoute = isStaff ? 'admin' : 'dashboard';
  const workspaceLabel =
    staffRole === 'superadmin'
      ? UI_COPY.nav.founderControl[lang]
      : isStaff
        ? UI_COPY.nav.staffConsole[lang]
        : UI_COPY.nav.dashboard[lang];

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const initials = (user?.displayName || user?.email || 'U')
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('');

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-black/[0.08]">
      <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Left: Mobile drawer trigger + Single-line Brand Wordmark */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleMobile}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-black/10 text-[#0D0D0F] shrink-0"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2.5 text-base sm:text-lg font-display font-bold tracking-[-0.02em] text-[#0D0D0F] whitespace-nowrap shrink-0 hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0284C7]"
          >
            <svg
              viewBox="0 0 28 28"
              className="w-7 h-7 shrink-0 text-[#0D0D0F]"
              aria-hidden="true"
            >
              <circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" strokeWidth="2.1" />
              <circle cx="14" cy="14" r="5" fill="none" stroke="#0284C7" strokeWidth="2.1" />
              <line x1="14" y1="2" x2="14" y2="9" stroke="currentColor" strokeWidth="2" />
              <line x1="14" y1="19" x2="14" y2="26" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span>AI Education Rwanda</span>
          </button>
        </div>

        {/* Right: Primary Sign In CTA or Profile Menu matching OpenAI Academy */}
        <div className="flex items-center gap-3 shrink-0" ref={menuRef}>
          {!user ? (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center justify-center px-5 py-2 text-sm font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0284C7]"
            >
              {UI_COPY.nav.signIn[lang]}
            </button>
          ) : (
            <div className="relative flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => onNavigate(workspaceRoute)}
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {workspaceLabel}
              </button>

              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-expanded={menuOpen}
                aria-label="Account menu"
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-black/15 hover:border-black/30 bg-white transition-colors"
              >
                <span className="w-7 h-7 rounded-full bg-[#F4F5F7] text-[#0D0D0F] text-xs font-semibold flex items-center justify-center">
                  {initials || <UserIcon className="w-4 h-4" />}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#5D5D66]" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 w-72 bg-white border border-black/10 rounded-2xl shadow-lg p-3 z-50">
                  <div className="flex items-center gap-3 px-2 py-2.5 border-b border-black/[0.08] mb-2">
                    <div className="w-10 h-10 rounded-full bg-[#F4F5F7] border border-black/10 flex items-center justify-center text-sm font-bold text-[#0D0D0F] shrink-0">
                      {initials || <UserIcon className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0D0D0F] truncate">
                        {user.displayName || 'Learner'}
                      </p>
                      <p className="text-xs text-[#5D5D66] truncate">
                        {staffRole === 'superadmin'
                          ? 'Founder · Superadmin'
                          : isStaff
                            ? `Staff · ${staffRole}`
                            : 'Learner'}
                      </p>
                      <p className="text-[11px] text-[#5D5D66] truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="space-y-0.5 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onNavigate(workspaceRoute);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[#0D0D0F] hover:bg-[#F7F8FA] font-medium"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#0284C7]" />
                      <span>{workspaceLabel}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onNavigate('events');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[#0D0D0F] hover:bg-[#F7F8FA]"
                    >
                      <Calendar className="w-4 h-4 text-[#5D5D66]" />
                      <span>{lang === 'en' ? 'My schedule & events' : 'Gahunda y’ibiganiro'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onNavigate('courses');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[#0D0D0F] hover:bg-[#F7F8FA]"
                    >
                      <BookOpen className="w-4 h-4 text-[#5D5D66]" />
                      <span>{lang === 'en' ? 'My courses' : 'Amasomo yanjye'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onNavigate('verify');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[#0D0D0F] hover:bg-[#F7F8FA]"
                    >
                      <Award className="w-4 h-4 text-[#5D5D66]" />
                      <span>{lang === 'en' ? 'My certificates' : 'Impamyabumenyi zanjye'}</span>
                    </button>

                    <div className="my-1.5 border-t border-black/[0.06]" />

                    <button
                      type="button"
                      onClick={() => {
                        onChangeLang(lang === 'en' ? 'rw' : 'en');
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-[#0D0D0F] hover:bg-[#F7F8FA]"
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <Globe className="w-4 h-4 text-[#5D5D66]" />
                        <span>{lang === 'en' ? 'Language' : 'Ururimi'}</span>
                      </span>
                      <span className="text-xs font-mono text-[#0284C7]">
                        {lang === 'en' ? 'EN → RW' : 'RW → EN'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onSignOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[#DC2626] hover:bg-[#FEF2F2]"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{UI_COPY.nav.signOut[lang]}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
