import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { Language, PageRoute, StaffRole } from '../types';
import { UI_COPY } from '../data/curriculum';

interface HeaderProps {
  currentRoute: PageRoute;
  lang: Language;
  user: User | null;
  staffRole: StaffRole;
  onNavigate: (route: PageRoute) => void;
  onSignIn: () => void;
}

export function Header({
  currentRoute,
  lang,
  user,
  staffRole,
  onNavigate,
  onSignIn
}: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: { route: PageRoute; label: string }[] = [
    { route: 'home', label: UI_COPY.nav.home[lang] },
    { route: 'courses', label: UI_COPY.nav.courses[lang] },
    { route: 'events', label: UI_COPY.nav.events[lang] },
    { route: 'projects', label: UI_COPY.nav.projects[lang] },
    { route: 'about', label: UI_COPY.nav.about[lang] }
  ];

  const isStaff = staffRole !== 'learner';
  const workspaceRoute: PageRoute = isStaff ? 'admin' : 'dashboard';
  const workspaceLabel = !user
    ? UI_COPY.nav.signIn[lang]
    : staffRole === 'superadmin'
      ? UI_COPY.nav.founderControl[lang]
      : isStaff
        ? UI_COPY.nav.staffConsole[lang]
        : UI_COPY.nav.dashboard[lang];

  const handleNav = (route: PageRoute) => {
    setMobileOpen(false);
    onNavigate(route);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-black/[0.08]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="text-base sm:text-lg font-display font-semibold tracking-tight text-[#0D0D0F] whitespace-nowrap shrink-0 hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0D7A5F]"
        >
          AI Education Rwanda
        </button>

        {/* Zone 2: 5 concise single-line text nav links */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Primary navigation">
          {navItems.map((item) => {
            const isActive =
              currentRoute === item.route ||
              (item.route === 'courses' && currentRoute === 'course-detail');
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => handleNav(item.route)}
                className={`text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0D7A5F] ${
                  isActive
                    ? 'text-[#0D0D0F] border-[#0D0D0F]'
                    : 'text-[#5D5D66] border-transparent hover:text-[#0D0D0F]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Role-differentiated primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => (user ? handleNav(workspaceRoute) : onSignIn())}
            className={`hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D7A5F] ${
              user && isStaff
                ? 'text-white bg-[#0D7A5F] hover:bg-[#0B664F]'
                : 'text-white bg-[#0D0D0F] hover:bg-[#232329]'
            }`}
          >
            {workspaceLabel}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-black/10 text-[#0D0D0F]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-black/[0.08] bg-white px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.route}
              type="button"
              onClick={() => handleNav(item.route)}
              className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                currentRoute === item.route
                  ? 'bg-[#F4F5F7] text-[#0D0D0F]'
                  : 'text-[#5D5D66] hover:bg-[#F9F9FB]'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              if (user) {
                handleNav(workspaceRoute);
              } else {
                onSignIn();
              }
            }}
            className={`w-full mt-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg ${
              user && isStaff ? 'bg-[#0D7A5F]' : 'bg-[#0D0D0F]'
            }`}
          >
            {workspaceLabel}
          </button>
        </div>
      )}
    </header>
  );
}
