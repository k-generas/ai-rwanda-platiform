import React from 'react';
import {
  Award,
  BookOpen,
  Building2,
  Calendar,
  Compass,
  FolderKanban,
  GraduationCap,
  HeartHandshake,
  Home,
  Info,
  Landmark,
  Store,
  X
} from 'lucide-react';
import type { Language, PageRoute } from '../types';
import { UI_COPY } from '../data/curriculum';

interface SidebarNavProps {
  currentRoute: PageRoute;
  lang: Language;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onNavigate: (route: PageRoute) => void;
  onOpenChallenge: () => void;
  onSelectTrack: (category: string) => void;
}

export function SidebarNav({
  currentRoute,
  lang,
  mobileOpen,
  onCloseMobile,
  onNavigate,
  onOpenChallenge,
  onSelectTrack
}: SidebarNavProps) {
  const primaryItems: {
    route: PageRoute;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { route: 'home', label: UI_COPY.nav.home[lang], icon: Home },
    { route: 'events', label: UI_COPY.nav.events[lang], icon: Calendar },
    { route: 'courses', label: UI_COPY.nav.courses[lang], icon: GraduationCap },
    { route: 'projects', label: UI_COPY.nav.projects[lang], icon: FolderKanban },
    { route: 'about', label: UI_COPY.nav.about[lang], icon: Info }
  ];

  const academyTracks: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    action: () => void;
  }[] = [
    {
      id: 'challenge',
      label: lang === 'en' ? '28-Day Challenge' : 'Iminsi 28',
      icon: Compass,
      action: onOpenChallenge
    },
    {
      id: 'certificates',
      label: lang === 'en' ? 'My Certificates' : 'Impamyabumenyi',
      icon: Award,
      action: () => onNavigate('verify')
    },
    {
      id: 'education',
      label: lang === 'en' ? 'Education' : 'Uburezi',
      icon: BookOpen,
      action: () => onSelectTrack('foundations')
    },
    {
      id: 'business',
      label: lang === 'en' ? 'Small Business' : 'Ubucuruzi',
      icon: Store,
      action: () => onSelectTrack('automation')
    },
    {
      id: 'nonprofits',
      label: lang === 'en' ? 'Nonprofits & NGOs' : 'Imiryango',
      icon: HeartHandshake,
      action: () => onSelectTrack('industry')
    },
    {
      id: 'government',
      label: lang === 'en' ? 'Organizations' : 'Ibigo bya Leta',
      icon: Landmark,
      action: () => onSelectTrack('prompting')
    }
  ];

  const renderLinks = (isMobileDrawer: boolean) => (
    <>
      <nav aria-label="Primary navigation" className="space-y-1">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentRoute === item.route ||
            (item.route === 'courses' && currentRoute === 'course-detail');
          return (
            <button
              key={item.route}
              type="button"
              onClick={() => {
                if (isMobileDrawer) onCloseMobile();
                onNavigate(item.route);
              }}
              className={`w-full flex items-center gap-3.5 px-4 ${
                isMobileDrawer ? 'py-3.5 text-[17px]' : 'py-3 text-[16px]'
              } rounded-xl transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#ECFDF5] text-[#0D7A5F] font-semibold'
                  : 'text-[#3F3F46] hover:bg-[#F7F8FA] hover:text-[#0D0D0F] font-medium'
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? 'text-[#0D7A5F]' : 'text-[#52525B]'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="my-4 border-t border-black/[0.08]" />

      <div className="space-y-1">
        {academyTracks.map((track) => {
          const Icon = track.icon;
          const isActive = track.id === 'certificates' && currentRoute === 'verify';
          return (
            <button
              key={track.id}
              type="button"
              onClick={() => {
                if (isMobileDrawer) onCloseMobile();
                track.action();
              }}
              className={`w-full flex items-center gap-3.5 px-4 ${
                isMobileDrawer ? 'py-3 text-[16px]' : 'py-2.5 text-[15px]'
              } rounded-xl transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#ECFDF5] text-[#0D7A5F] font-semibold'
                  : 'text-[#52525B] hover:bg-[#F7F8FA] hover:text-[#0D0D0F] font-medium'
              }`}
            >
              <Icon
                className={`w-[19px] h-[19px] shrink-0 ${
                  isActive ? 'text-[#0D7A5F]' : 'text-[#71717A]'
                }`}
              />
              <span className="truncate">{track.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-6">
        <div className="px-4 py-3 rounded-xl border border-black/[0.08] bg-[#FAFAFB] text-[13px] text-[#5D5D66] flex items-center gap-2.5">
          <Building2 className="w-4 h-4 text-[#0D7A5F] shrink-0" />
          <span className="truncate">Kigali · EN &amp; Kinyarwanda</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:flex lg:w-[256px] shrink-0 flex-col border-r border-black/[0.08] bg-white sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto px-3.5 py-5">
        {renderLinks(false)}
      </div>

      {/* Mobile & Tablet Right Slide-Over Drawer (Matches OpenAI Academy drawer position & large font size) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/35"
            aria-hidden="true"
            onClick={onCloseMobile}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="relative z-10 w-[300px] sm:w-[340px] max-w-[88vw] h-full bg-white border-l border-black/10 px-4 py-5 flex flex-col overflow-y-auto shadow-2xl"
          >
            <div className="flex items-center justify-between pb-4 mb-3 border-b border-black/[0.08]">
              <span className="text-[17px] font-display font-bold text-[#0D0D0F]">
                AI Education Rwanda
              </span>
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close navigation menu"
                className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-[#F4F5F7] text-[#0D0D0F] hover:bg-[#E5E7EB]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderLinks(true)}
          </div>
        </div>
      )}
    </>
  );
}
