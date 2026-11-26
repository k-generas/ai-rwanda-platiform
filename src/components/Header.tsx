import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Bell,
  BookOpen,
  Calendar,
  FolderKanban,
  Globe,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  User as UserIcon,
  X
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type {
  Announcement,
  Course,
  Language,
  NotificationRecord,
  PageRoute,
  ProgrammeRecord,
  StaffRole
} from '../types';
import { COURSES, PRACTICAL_PROJECTS, UI_COPY, WORKSHOP_EVENTS } from '../data/curriculum';
import { LESSONS_28 } from '../data/lessons28';

interface HeaderProps {
  currentRoute: PageRoute;
  lang: Language;
  user: User | null;
  staffRole: StaffRole;
  mobileOpen: boolean;
  courses?: Course[];
  programmes?: ProgrammeRecord[];
  notifications?: NotificationRecord[];
  announcements?: Announcement[];
  onToggleMobile: () => void;
  onChangeLang: (lang: Language) => void;
  onNavigate: (route: PageRoute) => void;
  onSelectCourse?: (courseId: string) => void;
  onOpenLesson?: (courseId: string, day: number) => void;
  onRefreshNotifications?: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
}

interface SearchHit {
  id: string;
  kind: 'course' | 'lesson' | 'event' | 'project';
  title: string;
  meta: string;
  action: () => void;
}

export function Header({
  lang,
  user,
  staffRole,
  mobileOpen,
  courses = [],
  programmes = [],
  notifications = [],
  announcements = [],
  onToggleMobile,
  onChangeLang,
  onNavigate,
  onSelectCourse,
  onOpenLesson,
  onRefreshNotifications,
  onSignIn,
  onSignOut
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [markingId, setMarkingId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isStaff = staffRole !== 'learner';
  const workspaceRoute: PageRoute = isStaff ? 'admin' : 'dashboard';
  const workspaceLabel =
    staffRole === 'superadmin'
      ? UI_COPY.nav.founderControl[lang]
      : isStaff
        ? UI_COPY.nav.staffConsole[lang]
        : UI_COPY.nav.dashboard[lang];

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (desktopSearchRef.current && !desktopSearchRef.current.contains(e.target as Node)) {
        if (window.innerWidth >= 1024) {
          setSearchOpen(false);
        }
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setNotifOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 40);
    }
  }, [searchOpen]);

  const handleMarkNotificationRead = async (notifId: string) => {
    if (!user) return;
    setMarkingId(notifId);
    try {
      await updateDoc(doc(db, 'notifications', notifId), { isRead: true });
      onRefreshNotifications?.();
    } catch {
      // Non-fatal
    } finally {
      setMarkingId(null);
    }
  };

  const searchHits = useMemo<SearchHit[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    const courseList = courses.length > 0 ? courses : COURSES;
    const hits: SearchHit[] = [];

    courseList.forEach((c) => {
      const title = c.title[lang];
      const sub = c.subtitle[lang];
      if (!q || title.toLowerCase().includes(q) || sub.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)) {
        hits.push({
          id: `course-${c.id}`,
          kind: 'course',
          title,
          meta: `${c.code} · ${c.durationDays} ${lang === 'en' ? 'Days' : 'Iminsi'}`,
          action: () => {
            if (onSelectCourse) onSelectCourse(c.id);
            else onNavigate('courses');
          }
        });
      }
    });

    if (q) {
      LESSONS_28.forEach((l) => {
        const title = l.title[lang];
        if (
          title.toLowerCase().includes(q) ||
          `day ${l.dayNumber}`.includes(q) ||
          l.introduction[lang].toLowerCase().includes(q)
        ) {
          hits.push({
            id: `lesson-${l.dayNumber}`,
            kind: 'lesson',
            title: `Day ${l.dayNumber}: ${title}`,
            meta: l.isSample
              ? lang === 'en'
                ? 'Free Sample · 28-Day Challenge'
                : 'Isomo ry’ubuntu'
              : lang === 'en'
                ? `Week ${l.weekNumber} · 28-Day Challenge`
                : `Icyumweru ${l.weekNumber}`,
            action: () => {
              if (onOpenLesson) onOpenLesson('challenge-28', l.dayNumber);
              else onNavigate('courses');
            }
          });
        }
      });
    }

    const evtItems =
      programmes.length > 0
        ? programmes
            .filter((p) => p.status !== 'draft')
            .map((p) => ({
              id: p.id,
              title: lang === 'en' ? p.titleEn : p.titleRw,
              meta: `${p.dateLabel} · ${lang === 'en' ? p.locationEn : p.locationRw}`
            }))
        : WORKSHOP_EVENTS.map((w) => ({
            id: w.id,
            title: w.title[lang],
            meta: `${w.dateLabel} · ${w.location[lang]}`
          }));

    evtItems.forEach((evt) => {
      if (!q || evt.title.toLowerCase().includes(q) || evt.meta.toLowerCase().includes(q)) {
        hits.push({
          id: `evt-${evt.id}`,
          kind: 'event',
          title: evt.title,
          meta: evt.meta,
          action: () => onNavigate('events')
        });
      }
    });

    PRACTICAL_PROJECTS.forEach((p) => {
      const title = p.title[lang];
      if (!q || title.toLowerCase().includes(q) || p.summary[lang].toLowerCase().includes(q)) {
        hits.push({
          id: `proj-${p.key}`,
          kind: 'project',
          title: `${p.number}. ${title}`,
          meta: p.tools.join(' · '),
          action: () => onNavigate('projects')
        });
      }
    });

    return hits.slice(0, 8);
  }, [searchQuery, courses, programmes, lang, onSelectCourse, onOpenLesson, onNavigate]);

  const initials = (user?.displayName || user?.email || 'U')
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('');

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-black/[0.08]">
        <div className="w-full px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-1.5 sm:gap-4">
          {/* Left: Brand Logo + Wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="min-w-0 inline-flex items-center gap-2 sm:gap-2.5 text-[15px] min-[400px]:text-[17px] sm:text-[21px] font-display font-bold tracking-[-0.02em] text-[#0D0D0F] hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0D7A5F]"
          >
            <svg
              viewBox="0 0 28 28"
              className="w-6 h-6 sm:w-8 sm:h-8 shrink-0 text-[#0D0D0F]"
              aria-hidden="true"
            >
              <circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" strokeWidth="2.1" />
              <circle cx="14" cy="14" r="5" fill="none" stroke="#0D7A5F" strokeWidth="2.1" />
              <line x1="14" y1="2" x2="14" y2="9" stroke="#D97706" strokeWidth="2" />
              <line x1="14" y1="19" x2="14" y2="26" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="truncate">AI Education Rwanda</span>
          </button>

          {/* Right: Search + Notification Bell + Circular Profile / Sign In + Mobile/Tablet Menu */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            {/* Desktop Inline Search Bar */}
            <div className="hidden lg:block relative" ref={desktopSearchRef}>
              <div className="relative w-64 xl:w-72">
                <Search className="w-4 h-4 text-[#5D5D66] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  placeholder={lang === 'en' ? 'Search courses, events...' : 'Shakisha amasomo...'}
                  aria-label={lang === 'en' ? 'Search platform' : 'Shakisha'}
                  className="w-full pl-10 pr-4 py-2 text-[15px] bg-[#F4F5F7] hover:bg-[#ECEEF2] focus:bg-white border border-transparent focus:border-[#0D7A5F] rounded-lg text-[#0D0D0F] placeholder:text-[#5D5D66] focus:outline-none transition-colors"
                />
              </div>

              {searchOpen && (
                <div className="absolute right-0 top-12 w-96 bg-white border border-black/10 rounded-2xl shadow-xl p-3 z-50">
                  <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-black/[0.06]">
                    <span className="text-xs font-semibold text-[#5D5D66] uppercase tracking-wide">
                      {searchQuery.trim()
                        ? lang === 'en'
                          ? 'Matching Results'
                          : 'Ibisubizo bibonetse'
                        : lang === 'en'
                          ? 'Quick Jump'
                          : 'Aho wanyura vuba'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSearchOpen(false)}
                      className="text-xs text-[#5D5D66] hover:text-[#0D0D0F]"
                    >
                      {lang === 'en' ? 'Close' : 'Funga'}
                    </button>
                  </div>
                  {searchHits.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-[#5D5D66]">
                      {lang === 'en'
                        ? 'No matching courses, lessons, or events.'
                        : 'Nta bisubizo bibonetse.'}
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-80 overflow-y-auto">
                      {searchHits.map((hit) => (
                        <button
                          key={hit.id}
                          type="button"
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery('');
                            hit.action();
                          }}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#F7F8F6] transition-colors flex items-start gap-3"
                        >
                          <span className="mt-0.5 text-[#0D7A5F] shrink-0">
                            {hit.kind === 'event' ? (
                              <Calendar className="w-4 h-4" />
                            ) : hit.kind === 'project' ? (
                              <FolderKanban className="w-4 h-4" />
                            ) : (
                              <BookOpen className="w-4 h-4" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[15px] font-semibold text-[#0D0D0F] truncate">
                              {hit.title}
                            </span>
                            <span className="block text-xs text-[#5D5D66] truncate">{hit.meta}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile & Tablet Search Icon Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label={lang === 'en' ? 'Open search' : 'Shakisha'}
              className="lg:hidden inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-[#4B4B55] hover:bg-[#F4F5F7] transition-colors shrink-0"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notification Bell (Right beside Search & Profile across all screen sizes) */}
            <div className="relative shrink-0" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((prev) => !prev);
                  setMenuOpen(false);
                }}
                aria-expanded={notifOpen}
                aria-label={lang === 'en' ? 'Notifications' : 'Imenyesha'}
                className="relative inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-[#4B4B55] hover:bg-[#F4F5F7] transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#0D7A5F] text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="fixed sm:absolute right-3 sm:right-0 top-[70px] sm:top-12 w-[calc(100vw-1.5rem)] max-w-[340px] sm:w-96 bg-white border border-black/10 rounded-2xl shadow-xl p-4 z-50 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-black/[0.08]">
                    <p className="text-[15px] font-bold text-[#0D0D0F]">
                      {lang === 'en' ? 'Notifications & Updates' : 'Imenyesha & Amakuru'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-[#5D5D66] hover:text-[#0D0D0F]"
                    >
                      {lang === 'en' ? 'Close' : 'Funga'}
                    </button>
                  </div>

                  {!user ? (
                    <div className="space-y-3">
                      {announcements.slice(0, 2).map((ann) => (
                        <div
                          key={ann.id}
                          className="p-3 rounded-xl bg-[#FAFAFB] border border-black/[0.06]"
                        >
                          <p className="text-sm font-semibold text-[#0D0D0F]">
                            {lang === 'en' ? ann.titleEn : ann.titleRw}
                          </p>
                          <p className="text-xs text-[#5D5D66] mt-1 leading-relaxed">
                            {lang === 'en' ? ann.bodyEn : ann.bodyRw}
                          </p>
                        </div>
                      ))}
                      <div className="p-3.5 rounded-xl bg-[#F4F9F7] border border-[#0D7A5F]/15 space-y-2.5">
                        <p className="text-xs text-[#5D5D66]">
                          {lang === 'en'
                            ? 'Sign in to view your enrollment confirmations, lesson unlocks, and mentor replies.'
                            : 'Injira urebe imenyesha z’amasomo yawe n’ibisubizo by’abarimu.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            onSignIn();
                          }}
                          className="w-full py-2 px-3 text-sm font-semibold text-white bg-[#0D7A5F] hover:bg-[#095945] rounded-lg"
                        >
                          {UI_COPY.nav.signIn[lang]}
                        </button>
                      </div>
                    </div>
                  ) : notifications.length === 0 && announcements.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[#5D5D66]">
                      {lang === 'en'
                        ? 'You are all caught up — no new notifications.'
                        : 'Nta menyesha nshya uhari.'}
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {notifications.slice(0, 5).map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 rounded-xl border ${
                            n.isRead
                              ? 'bg-[#FAFAFB] border-black/[0.06]'
                              : 'bg-[#ECFDF5]/60 border-[#0D7A5F]/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-[#0D0D0F]">{n.title}</p>
                            {!n.isRead && (
                              <button
                                type="button"
                                disabled={markingId === n.id}
                                onClick={() => handleMarkNotificationRead(n.id)}
                                className="text-xs font-medium text-[#0D7A5F] hover:underline shrink-0"
                              >
                                {markingId === n.id ? '...' : lang === 'en' ? 'Mark read' : 'Yasomwe'}
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-[#5D5D66] mt-1 leading-relaxed">{n.message}</p>
                        </div>
                      ))}

                      {announcements.slice(0, 2).map((ann) => (
                        <div
                          key={ann.id}
                          className="p-3 rounded-xl bg-[#FAFAFB] border border-black/[0.06]"
                        >
                          <p className="text-xs font-mono text-[#0D7A5F] mb-0.5">
                            {lang === 'en' ? 'Announcement' : 'Itangazo'}
                          </p>
                          <p className="text-sm font-semibold text-[#0D0D0F]">
                            {lang === 'en' ? ann.titleEn : ann.titleRw}
                          </p>
                          <p className="text-xs text-[#5D5D66] mt-1 leading-relaxed">
                            {lang === 'en' ? ann.bodyEn : ann.bodyRw}
                          </p>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          setNotifOpen(false);
                          onNavigate(workspaceRoute);
                        }}
                        className="w-full py-2 text-xs font-semibold text-[#0D7A5F] hover:underline text-center"
                      >
                        {lang === 'en' ? `Open ${workspaceLabel}` : `Fungura ${workspaceLabel}`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Circle / Sign In Zone */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0" ref={menuRef}>
              {!user ? (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="inline-flex items-center justify-center gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 text-[13px] sm:text-[15px] font-medium lg:font-semibold text-[#0D0D0F] lg:text-white bg-transparent lg:bg-[#0D7A5F] hover:text-[#0D7A5F] lg:hover:text-white lg:hover:bg-[#095945] rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D7A5F]"
                >
                  <span>{UI_COPY.nav.signIn[lang]}</span>
                </button>
              ) : (
                <div className="relative flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen((prev) => !prev);
                      setNotifOpen(false);
                    }}
                    aria-expanded={menuOpen}
                    aria-label="Account menu"
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-black/15 hover:border-[#0D7A5F] bg-[#F4F5F7] text-[#0D0D0F] flex items-center justify-center transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D7A5F]"
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Profile avatar'}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm font-semibold">
                        {initials || <UserIcon className="w-4 h-4" />}
                      </span>
                    )}
                  </button>

                  {menuOpen && (
                    <div className="fixed sm:absolute right-3 sm:right-0 top-[70px] sm:top-12 w-[calc(100vw-1.5rem)] max-w-[320px] sm:w-80 bg-white border border-black/10 rounded-2xl shadow-xl p-3.5 z-50 max-h-[82vh] overflow-y-auto">
                      <div className="flex items-center gap-3 px-2 py-2.5 border-b border-black/[0.08] mb-2">
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-[#F4F5F7] border border-black/10 flex items-center justify-center text-sm font-bold text-[#0D0D0F] shrink-0">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt={user.displayName || 'Profile avatar'}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            initials || <UserIcon className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[15px] font-bold text-[#0D0D0F] truncate">
                            {user.displayName || 'Learner'}
                          </p>
                          <p className="text-xs text-[#5D5D66] truncate">
                            {staffRole === 'superadmin'
                              ? 'Founder · Superadmin'
                              : isStaff
                                ? `Staff · ${staffRole}`
                                : 'Learner'}
                          </p>
                          <p className="text-xs text-[#5D5D66] truncate">{user.email}</p>
                        </div>
                      </div>

                      <div className="space-y-1 text-[15px]">
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onNavigate(workspaceRoute);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[#0D0D0F] hover:bg-[#F7F8F6] font-medium"
                        >
                          <ShieldCheck className="w-4 h-4 text-[#0D7A5F]" />
                          <span>{workspaceLabel}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onNavigate('events');
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[#0D0D0F] hover:bg-[#F7F8F6]"
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
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[#0D0D0F] hover:bg-[#F7F8F6]"
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
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[#0D0D0F] hover:bg-[#F7F8F6]"
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
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-[#0D0D0F] hover:bg-[#F7F8F6]"
                        >
                          <span className="inline-flex items-center gap-3">
                            <Globe className="w-4 h-4 text-[#5D5D66]" />
                            <span>{lang === 'en' ? 'Language' : 'Ururimi'}</span>
                          </span>
                          <span className="text-xs font-mono text-[#0D7A5F]">
                            {lang === 'en' ? 'EN → RW' : 'RW → EN'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onSignOut();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[#DC2626] hover:bg-[#FEF2F2]"
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

            {/* Mobile & Tablet Far-Right Menu Toggle */}
            <button
              type="button"
              onClick={onToggleMobile}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
              className={`lg:hidden inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg transition-colors shrink-0 ${
                mobileOpen
                  ? 'bg-[#F4F5F7] text-[#0D0D0F] hover:bg-[#E5E7EB]'
                  : 'bg-[#0D7A5F] text-white hover:bg-[#095945]'
              }`}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile & Tablet Responsive Search Modal */}
      {searchOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/45 flex items-start justify-center p-3 sm:p-6 pt-16 sm:pt-20"
          role="dialog"
          aria-modal="true"
          aria-label="Search platform"
        >
          <div className="bg-white border border-black/10 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[80dvh] flex flex-col">
            <div className="p-4 border-b border-black/[0.08] flex items-center gap-3">
              <Search className="w-5 h-5 text-[#5D5D66] shrink-0" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lang === 'en' ? 'Search courses, 28 days, events...' : 'Shakisha amasomo n’ibiganiro...'
                }
                className="flex-1 text-base text-[#0D0D0F] placeholder:text-[#5D5D66] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className="p-2 rounded-lg text-[#5D5D66] hover:bg-[#F4F5F7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 overflow-y-auto space-y-1">
              {searchHits.length === 0 ? (
                <p className="py-8 text-center text-[15px] text-[#5D5D66]">
                  {lang === 'en'
                    ? 'No matching courses, lessons, or events.'
                    : 'Nta bisubizo bibonetse.'}
                </p>
              ) : (
                searchHits.map((hit) => (
                  <button
                    key={hit.id}
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery('');
                      hit.action();
                    }}
                    className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-[#F7F8F6] transition-colors flex items-start gap-3"
                  >
                    <span className="mt-0.5 text-[#0D7A5F] shrink-0">
                      {hit.kind === 'event' ? (
                        <Calendar className="w-5 h-5" />
                      ) : hit.kind === 'project' ? (
                        <FolderKanban className="w-5 h-5" />
                      ) : (
                        <BookOpen className="w-5 h-5" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[16px] font-semibold text-[#0D0D0F]">
                        {hit.title}
                      </span>
                      <span className="block text-sm text-[#5D5D66] mt-0.5">{hit.meta}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
