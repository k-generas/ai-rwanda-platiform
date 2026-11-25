import React, { useState } from 'react';
import { Calendar, CheckCircle2, ExternalLink, MapPin } from 'lucide-react';
import type { User } from 'firebase/auth';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type { EventRegistration, Language, ProgrammeRecord } from '../types';
import { WORKSHOP_EVENTS } from '../data/curriculum';

interface EventsViewProps {
  lang: Language;
  user: User | null;
  programmes?: ProgrammeRecord[];
  registrations: EventRegistration[];
  onSignIn: () => void;
  onRegistrationUpdated: () => void;
}

interface UnifiedProgrammeItem {
  id: string;
  typeLabel: string;
  titleEn: string;
  titleRw: string;
  descriptionEn: string;
  descriptionRw: string;
  dateLabel: string;
  timeLabel: string;
  timezone: string;
  format: 'online' | 'kigali_in_person' | 'hybrid';
  locationEn: string;
  locationRw: string;
  languageLabel: string;
  meetingUrl?: string;
  capacity: number;
  registeredCount?: number;
  eligibilityEn?: string;
  eligibilityRw?: string;
  priceRwf: number;
  status: 'upcoming' | 'registration_open' | 'fully_booked' | 'in_progress' | 'completed' | 'cancelled' | 'past';
  featured: boolean;
  speaker: string;
}

export function EventsView({
  lang,
  user,
  programmes = [],
  registrations,
  onSignIn,
  onRegistrationUpdated
}: EventsViewProps) {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'kigali' | 'online' | 'past'>('all');
  const [rsvpEvent, setRsvpEvent] = useState<UnifiedProgrammeItem | null>(null);
  const [attendanceMode, setAttendanceMode] = useState<'online' | 'kigali_in_person'>('online');
  const [saving, setSaving] = useState(false);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const unifiedList: UnifiedProgrammeItem[] =
    programmes.length > 0
      ? programmes
          .filter((p) => p.status !== 'draft')
          .map((p) => ({
            id: p.id,
            typeLabel: p.type.replace('_', ' '),
            titleEn: p.titleEn,
            titleRw: p.titleRw,
            descriptionEn: p.descriptionEn,
            descriptionRw: p.descriptionRw,
            dateLabel: p.dateLabel,
            timeLabel: p.timeLabel,
            timezone: p.timezone || 'CAT (UTC+2)',
            format: p.format,
            locationEn: p.locationEn,
            locationRw: p.locationRw,
            languageLabel: p.languageLabel,
            meetingUrl: p.meetingUrl,
            capacity: p.capacity,
            registeredCount: p.registeredCount ?? 0,
            eligibilityEn: p.eligibilityEn,
            eligibilityRw: p.eligibilityRw,
            priceRwf: p.priceRwf,
            status: p.status === 'draft' ? 'upcoming' : p.status,
            featured: p.featured,
            speaker: p.speaker
          }))
      : WORKSHOP_EVENTS.map((w) => ({
          id: w.id,
          typeLabel: 'workshop',
          titleEn: w.title.en,
          titleRw: w.title.rw,
          descriptionEn: w.description.en,
          descriptionRw: w.description.rw,
          dateLabel: w.dateLabel,
          timeLabel: w.timeLabel,
          timezone: 'CAT (UTC+2)',
          format: w.format,
          locationEn: w.location.en,
          locationRw: w.location.rw,
          languageLabel: w.languageLabel,
          capacity: 120,
          priceRwf: 0,
          status: w.status === 'past' ? 'completed' : 'registration_open',
          featured: Boolean(w.featured),
          speaker: w.speaker
        }));

  const featured = unifiedList.find((e) => e.featured) ?? unifiedList[0];

  const isPastStatus = (s: UnifiedProgrammeItem['status']) =>
    s === 'past' || s === 'completed' || s === 'cancelled';

  const filteredEvents = unifiedList.filter((evt) => {
    if (filter === 'upcoming') return !isPastStatus(evt.status);
    if (filter === 'past') return evt.status === 'past' || evt.status === 'completed';
    if (filter === 'kigali') return evt.format === 'kigali_in_person' || evt.format === 'hybrid';
    if (filter === 'online') return evt.format === 'online' || evt.format === 'hybrid';
    return true;
  });

  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const isRegistered = (eventId: string) =>
    registrations.some((r) => r.eventId === eventId && r.status === 'registered');

  const canRsvp = (evt: UnifiedProgrammeItem) => {
    const isFull = evt.capacity > 0 && (evt.registeredCount ?? 0) >= evt.capacity;
    return (
      !isFull &&
      (evt.status === 'upcoming' ||
        evt.status === 'registration_open' ||
        evt.status === 'in_progress')
    );
  };

  const handleConfirmRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rsvpEvent) return;
    setSaving(true);
    setRsvpError(null);
    const regId = `${user.uid}_${rsvpEvent.id}`;
    const path = `eventRegistrations/${regId}`;

    try {
      await runTransaction(db, async (tx) => {
        const regRef = doc(db, 'eventRegistrations', regId);
        const existingReg = await tx.get(regRef);
        const alreadyRegistered =
          existingReg.exists() && (existingReg.data() as EventRegistration).status === 'registered';

        const progRef = doc(db, 'programmes', rsvpEvent.id);
        const progSnap = await tx.get(progRef);
        if (progSnap.exists() && !alreadyRegistered) {
          const prog = progSnap.data() as ProgrammeRecord;
          const currentCount = Number(prog.registeredCount ?? 0);
          if (prog.capacity > 0 && currentCount >= prog.capacity) {
            throw new Error(
              lang === 'en'
                ? 'This session just reached maximum capacity.'
                : 'Imyanya kuri iki kiganiro yaruzuye.'
            );
          }
          tx.update(progRef, {
            registeredCount: currentCount + 1,
            updatedAt: serverTimestamp()
          });
        }

        if (existingReg.exists()) {
          tx.update(regRef, {
            status: 'registered',
            attendanceMode,
            updatedAt: serverTimestamp()
          });
        } else {
          tx.set(regRef, {
            id: regId,
            userId: user.uid,
            eventId: rsvpEvent.id,
            eventTitle: rsvpEvent.titleEn,
            attendeeName: user.displayName || 'Learner',
            attendeeEmail: user.email || '',
            attendanceMode,
            status: 'registered',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      });

      setDoneMessage(
        lang === 'en'
          ? `Confirmed for ${rsvpEvent.titleEn}`
          : `Kwiyandikisha byemejwe kuri ${rsvpEvent.titleRw}`
      );
      onRegistrationUpdated();
    } catch (err) {
      if (err instanceof Error && !err.message.toLowerCase().includes('permission')) {
        setRsvpError(err.message);
      } else {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancelRsvp = async (evt: UnifiedProgrammeItem) => {
    if (!user) return;
    setCancellingId(evt.id);
    const regId = `${user.uid}_${evt.id}`;
    try {
      await runTransaction(db, async (tx) => {
        const regRef = doc(db, 'eventRegistrations', regId);
        const existingReg = await tx.get(regRef);
        if (!existingReg.exists() || (existingReg.data() as EventRegistration).status !== 'registered') {
          return;
        }
        const progRef = doc(db, 'programmes', evt.id);
        const progSnap = await tx.get(progRef);
        if (progSnap.exists()) {
          const prog = progSnap.data() as ProgrammeRecord;
          const currentCount = Number(prog.registeredCount ?? 0);
          if (currentCount > 0) {
            tx.update(progRef, {
              registeredCount: currentCount - 1,
              updatedAt: serverTimestamp()
            });
          }
        }
        tx.update(regRef, {
          status: 'cancelled',
          updatedAt: serverTimestamp()
        });
      });
      onRegistrationUpdated();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `eventRegistrations/${regId}`);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
      <header className="max-w-2xl mb-10">
        <p className="text-xs font-medium text-[#0D7A5F] mb-2">
          {lang === 'en' ? 'Live Workshops, Bootcamps & Programmes' : 'Amahugurwa, Bootcamps n’Ihuriro'}
        </p>
        <h1 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight text-[#0D0D0F] mb-3">
          {lang === 'en' ? 'Events & Practical Clinics' : 'Ibiganiro n’Amahugurwa Ngiro'}
        </h1>
        <p className="text-base text-[#5D5D66] leading-relaxed">
          {lang === 'en'
            ? 'Join live bilingual prompt clinics, hands-on automation labs in Kigali, and cohort project demonstrations.'
            : 'Kwitabira amahugurwa mu Kinyarwanda n’Icyongereza i Kigali cyangwa kuri interineti.'}
        </p>
      </header>

      {/* Featured Event Spotlight */}
      {featured && (
        <section className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6 sm:p-10 mb-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <p className="text-xs font-mono text-[#0D7A5F] mb-2 uppercase">
              {featured.typeLabel} · {featured.dateLabel} · {featured.timeLabel} ({featured.timezone})
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-semibold text-[#0D0D0F] text-balance mb-3">
              {lang === 'en' ? featured.titleEn : featured.titleRw}
            </h2>
            <p className="text-sm sm:text-base text-[#5D5D66] leading-relaxed mb-5 max-w-2xl">
              {lang === 'en' ? featured.descriptionEn : featured.descriptionRw}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#5D5D66]">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#0D0D0F]" />
                {lang === 'en' ? featured.locationEn : featured.locationRw}
              </span>
              <span aria-hidden="true">·</span>
              <span>{featured.languageLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{featured.speaker}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[#0D0D0F]">
                {featured.priceRwf === 0
                  ? lang === 'en'
                    ? 'Free Admission'
                    : 'Kwinjira ku buntu'
                  : `${featured.priceRwf.toLocaleString()} RWF`}
              </span>
            </div>
            {(featured.eligibilityEn || featured.eligibilityRw) && (
              <p className="text-xs text-[#0D7A5F] mt-3">
                {lang === 'en' ? featured.eligibilityEn : featured.eligibilityRw || featured.eligibilityEn}
              </p>
            )}
          </div>

          <div className="lg:col-span-4 flex flex-col items-start lg:items-end justify-center gap-3">
            {isRegistered(featured.id) ? (
              <div className="space-y-2 lg:text-right">
                <span className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#0D7A5F] bg-[#ECFDF5] border border-[#0D7A5F]/25 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lang === 'en' ? 'Registered' : 'Wariyandikishije'}</span>
                </span>
                {featured.meetingUrl && (
                  <a
                    href={featured.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0D0D0F] underline"
                  >
                    <span>{lang === 'en' ? 'Join Stream Link' : 'Fungura Link y’Ikiganiro'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ) : featured.status === 'fully_booked' ? (
              <span className="px-4 py-2 text-xs font-mono uppercase border border-black/15 rounded-lg text-[#5D5D66]">
                {lang === 'en' ? 'Fully Booked' : 'Imyanya Yaruzuye'}
              </span>
            ) : featured.status === 'cancelled' ? (
              <span className="px-4 py-2 text-xs font-mono uppercase border border-[#DC2626]/25 rounded-lg text-[#DC2626]">
                {lang === 'en' ? 'Cancelled' : 'Byahagaritswe'}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    onSignIn();
                  } else {
                    setRsvpEvent(featured);
                    setDoneMessage(null);
                  }
                }}
                className="px-5 py-3 text-sm font-medium text-white bg-[#0D0D0F] rounded-lg hover:bg-[#232329] transition-colors whitespace-nowrap"
              >
                {user
                  ? lang === 'en'
                    ? 'Register for event'
                    : 'Iyandikishe kuri iki kiganiro'
                  : lang === 'en'
                    ? 'Sign in to RSVP'
                    : 'Injira kugira ngo wiyandikishe'}
              </button>
            )}
          </div>
        </section>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-black/[0.08] mb-8">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F4F5F7] rounded-xl">
          {[
            { key: 'all', label: lang === 'en' ? 'All Events' : 'Byose' },
            { key: 'upcoming', label: lang === 'en' ? 'Upcoming' : 'Biri imbere' },
            { key: 'kigali', label: lang === 'en' ? 'Kigali In-Person' : 'I Kigali' },
            { key: 'online', label: lang === 'en' ? 'Online Live' : 'Kuri Interineti' },
            { key: 'past', label: lang === 'en' ? 'Past Recordings' : 'Ibyabaye' }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key as typeof filter)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                filter === tab.key
                  ? 'bg-white text-[#0D0D0F] shadow-xs'
                  : 'text-[#5D5D66] hover:text-[#0D0D0F]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs font-mono text-[#5D5D66] tabular-nums">
          {filteredEvents.length} {lang === 'en' ? 'sessions' : 'ibiganiro'}
        </span>
      </div>

      {/* Events List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredEvents.map((evt) => {
          const registered = isRegistered(evt.id);
          return (
            <article
              key={evt.id}
              className="bg-white border border-black/[0.08] rounded-2xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#5D5D66] mb-3">
                  <span className="font-mono uppercase text-[#0D7A5F]">{evt.typeLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-medium text-[#0D0D0F] tabular-nums">
                    <Calendar className="w-3.5 h-3.5 text-[#0D7A5F]" />
                    {evt.dateLabel}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{evt.timeLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{evt.languageLabel}</span>
                </div>
                <h3 className="text-lg font-display font-semibold text-[#0D0D0F] mb-2">
                  {lang === 'en' ? evt.titleEn : evt.titleRw}
                </h3>
                <p className="text-sm text-[#5D5D66] leading-relaxed mb-3">
                  {lang === 'en' ? evt.descriptionEn : evt.descriptionRw}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#5D5D66] mb-4">
                  <span>
                    {evt.capacity > 0
                      ? `${evt.registeredCount ?? 0}/${evt.capacity} seats`
                      : 'Open capacity'}
                  </span>
                  <span>·</span>
                  <span>{evt.priceRwf === 0 ? 'Free' : `${evt.priceRwf.toLocaleString()} RWF`}</span>
                  <span>·</span>
                  <span>{evt.speaker}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-black/[0.06] flex items-center justify-between gap-4">
                <span className="text-xs text-[#5D5D66] truncate">
                  {lang === 'en' ? evt.locationEn : evt.locationRw}
                </span>
                {evt.status === 'past' || evt.status === 'completed' ? (
                  <span className="text-xs font-mono text-[#5D5D66] shrink-0">
                    {lang === 'en' ? 'Completed' : 'Byararangiye'}
                  </span>
                ) : evt.status === 'cancelled' ? (
                  <span className="text-xs font-mono text-[#DC2626] shrink-0">
                    {lang === 'en' ? 'Cancelled' : 'Byahagaritswe'}
                  </span>
                ) : evt.status === 'fully_booked' ||
                  (evt.capacity > 0 && (evt.registeredCount ?? 0) >= evt.capacity) ? (
                  <span className="text-xs font-mono text-[#D97706] shrink-0">
                    {lang === 'en' ? 'Fully Booked' : 'Byuzuye'}
                  </span>
                ) : registered ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-[#0D7A5F]">
                      {lang === 'en' ? 'Confirmed' : 'Byemejwe'}
                    </span>
                    {evt.meetingUrl && (
                      <a
                        href={evt.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline text-[#0D0D0F]"
                      >
                        {lang === 'en' ? 'Join' : 'Injira'}
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={cancellingId === evt.id}
                      onClick={() => handleCancelRsvp(evt)}
                      className="text-[11px] text-[#5D5D66] hover:text-[#DC2626] underline"
                    >
                      {cancellingId === evt.id ? '...' : lang === 'en' ? 'Cancel' : 'Hagarika'}
                    </button>
                  </div>
                ) : canRsvp(evt) ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        onSignIn();
                      } else {
                        setRsvpEvent(evt);
                        setRsvpError(null);
                        setDoneMessage(null);
                      }
                    }}
                    className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#0D0D0F] rounded-lg hover:bg-[#232329] transition-colors whitespace-nowrap shrink-0"
                  >
                    {lang === 'en' ? 'Reserve seat' : 'Fata umwanya'}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {/* RSVP Modal */}
      {rsvpEvent && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-black/10 rounded-2xl max-w-md w-full p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold text-[#0D0D0F]">
                {lang === 'en' ? 'Confirm Event Registration' : 'Emeza Kwiyandikisha'}
              </h2>
              <button
                type="button"
                onClick={() => setRsvpEvent(null)}
                className="text-xs font-medium text-[#5D5D66]"
              >
                {lang === 'en' ? 'Close' : 'Funga'}
              </button>
            </div>

            {doneMessage ? (
              <div className="space-y-4">
                <p className="text-sm text-[#0D7A5F]">{doneMessage}</p>
                {rsvpEvent.meetingUrl && (
                  <a
                    href={rsvpEvent.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0D0D0F] underline"
                  >
                    <span>{lang === 'en' ? 'Save Session Link' : 'Bika Link y’Ikiganiro'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setRsvpEvent(null)}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-[#0D0D0F] rounded-lg"
                >
                  {lang === 'en' ? 'Done' : 'Byarangiye'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmRsvp} className="space-y-4">
                <p className="text-sm font-medium text-[#0D0D0F]">
                  {lang === 'en' ? rsvpEvent.titleEn : rsvpEvent.titleRw}
                </p>
                <p className="text-xs text-[#5D5D66]">
                  {rsvpEvent.dateLabel} · {rsvpEvent.timeLabel} ({rsvpEvent.timezone})
                </p>

                <div>
                  <label className="block text-xs font-medium text-[#0D0D0F] mb-2">
                    {lang === 'en' ? 'Attendance preference' : 'Uko uzitabira'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAttendanceMode('online')}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border ${
                        attendanceMode === 'online'
                          ? 'bg-[#0D0D0F] text-white border-[#0D0D0F]'
                          : 'bg-white text-[#0D0D0F] border-black/15'
                      }`}
                    >
                      {lang === 'en' ? 'Online Stream' : 'Kuri Interineti'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendanceMode('kigali_in_person')}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border ${
                        attendanceMode === 'kigali_in_person'
                          ? 'bg-[#0D0D0F] text-white border-[#0D0D0F]'
                          : 'bg-white text-[#0D0D0F] border-black/15'
                      }`}
                    >
                      {lang === 'en' ? 'Kigali In-Person' : 'I Kigali Imbonankubone'}
                    </button>
                  </div>
                </div>

                {rsvpError && (
                  <p className="text-xs text-[#DC2626] bg-[#FEF2F2] border border-[#DC2626]/20 rounded-lg px-3 py-2">
                    {rsvpError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#0D0D0F] rounded-lg"
                >
                  {saving
                    ? lang === 'en'
                      ? 'Confirming...'
                      : 'Birabikwa...'
                    : lang === 'en'
                      ? 'Confirm Registration'
                      : 'Emeza'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
