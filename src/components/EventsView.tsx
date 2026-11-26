import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  LayoutGrid,
  List as ListIcon,
  MapPin,
  Radio,
  RotateCcw,
  Video
} from 'lucide-react';
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

const EVENT_BANNER_GRADIENTS = [
  'bg-gradient-to-br from-[#0284C7] via-[#06B6D4] to-[#EC4899]',
  'bg-gradient-to-br from-[#3B82F6] via-[#6366F1] to-[#A855F7]',
  'bg-gradient-to-br from-[#2563EB] via-[#38BDF8] to-[#FACC15]',
  'bg-gradient-to-br from-[#F59E0B] via-[#FB7185] to-[#8B5CF6]',
  'bg-gradient-to-br from-[#0EA5E9] via-[#6366F1] to-[#10B981]'
];

export function EventsView({
  lang,
  user,
  programmes = [],
  registrations,
  onSignIn,
  onRegistrationUpdated
}: EventsViewProps) {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'now' | 'past'>('all');
  const [formatFilter, setFormatFilter] = useState<'all' | 'kigali' | 'online'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [rsvpEvent, setRsvpEvent] = useState<UnifiedProgrammeItem | null>(null);
  const [replayEvent, setReplayEvent] = useState<UnifiedProgrammeItem | null>(null);
  const [attendanceMode, setAttendanceMode] = useState<'online' | 'kigali_in_person'>('online');
  const [saving, setSaving] = useState(false);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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

  const isPastStatus = (s: UnifiedProgrammeItem['status']) =>
    s === 'past' || s === 'completed' || s === 'cancelled';

  const filteredEvents = unifiedList.filter((evt) => {
    const matchesTime =
      filter === 'all'
        ? true
        : filter === 'upcoming'
          ? !isPastStatus(evt.status)
          : filter === 'now'
            ? evt.status === 'in_progress'
            : evt.status === 'past' || evt.status === 'completed';
    const matchesFormat =
      formatFilter === 'all'
        ? true
        : formatFilter === 'kigali'
          ? evt.format === 'kigali_in_person' || evt.format === 'hybrid'
          : evt.format === 'online' || evt.format === 'hybrid';
    return matchesTime && matchesFormat;
  });

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
    <div className="max-w-[1260px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      {/* 1. OpenAI Academy Indigo-Purple Gradient Events Banner */}
      <section className="rounded-2xl bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] text-white p-8 sm:p-12 lg:p-14 shadow-xs">
        <Radio className="w-8 h-8 text-white mb-4" aria-hidden="true" />
        <h1 className="text-[36px] sm:text-[48px] lg:text-[54px] font-display font-bold tracking-[-0.03em] leading-[1.08] mb-3">
          {lang === 'en' ? 'Events' : 'Ibiganiro n’Amahugurwa'}
        </h1>
        <p className="text-[16px] sm:text-[19px] text-white/95 max-w-2xl leading-relaxed">
          {lang === 'en'
            ? 'Hands-on learning brought to you by AI Education Rwanda and our community partners.'
            : 'Kwitabira amahugurwa imbonankubone i Kigali cyangwa kuri interineti mu Kinyarwanda n’Icyongereza.'}
        </p>
      </section>

      {/* 2. Filter & View Controls (Exact OpenAI Academy Bar) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'all', label: lang === 'en' ? 'All' : 'Byose' },
            { key: 'upcoming', label: lang === 'en' ? 'Upcoming' : 'Biri imbere' },
            { key: 'now', label: lang === 'en' ? 'Now' : 'Ubu' },
            { key: 'past', label: lang === 'en' ? 'Past' : 'Ibyabaye' }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key as typeof filter)}
              className={`px-4 py-2.5 text-[15px] font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                filter === tab.key
                  ? 'bg-[#0284C7] text-white'
                  : 'bg-[#F4F5F7] text-[#4B4B55] hover:bg-[#EAECEF]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value as typeof formatFilter)}
            aria-label={lang === 'en' ? 'Filter by event format' : 'Hitamo uburyo'}
            className="px-4 py-2.5 text-[15px] bg-white border border-black/15 rounded-lg text-[#0D0D0F]"
          >
            <option value="all">{lang === 'en' ? 'All formats' : 'Uburyo bwose'}</option>
            <option value="kigali">{lang === 'en' ? 'In-Person (Kigali)' : 'I Kigali'}</option>
            <option value="online">{lang === 'en' ? 'Livestream' : 'Kuri Interineti'}</option>
          </select>

          <div className="inline-flex items-center border border-black/15 rounded-lg p-1 bg-white">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={`p-2 rounded-md ${
                viewMode === 'list' ? 'bg-[#F0F9FF] text-[#0284C7]' : 'text-[#5D5D66]'
              }`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`p-2 rounded-md ${
                viewMode === 'grid' ? 'bg-[#F0F9FF] text-[#0284C7]' : 'text-[#5D5D66]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Events Cards Grid / List */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white border border-black/[0.08] rounded-2xl p-12 text-center text-[16px] text-[#5D5D66]">
          {lang === 'en'
            ? 'No sessions match the selected filter right now.'
            : 'Nta kiganiro kibonetse muri iki cyiciro.'}
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
              : 'space-y-5'
          }
        >
          {filteredEvents.map((evt, index) => {
            const registered = isRegistered(evt.id);
            const isPast = evt.status === 'past' || evt.status === 'completed';
            const grad = EVENT_BANNER_GRADIENTS[index % EVENT_BANNER_GRADIENTS.length];
            const formatLabel =
              evt.format === 'kigali_in_person'
                ? lang === 'en'
                  ? 'In-Person'
                  : 'I Kigali'
                : evt.format === 'hybrid'
                  ? lang === 'en'
                    ? 'Hybrid'
                    : 'Imbonankubone & Online'
                  : lang === 'en'
                    ? 'Livestream'
                    : 'Kuri Interineti';

            return (
              <article
                key={evt.id}
                className={`bg-white border border-black/[0.08] rounded-2xl overflow-hidden flex ${
                  viewMode === 'list' ? 'flex-col md:flex-row' : 'flex-col justify-between'
                }`}
              >
                {/* Colorful Gradient Visual Banner */}
                <div
                  className={`relative ${grad} p-5 sm:p-6 flex flex-col justify-between text-white ${
                    viewMode === 'list' ? 'md:w-80 shrink-0 min-h-[180px]' : 'aspect-[16/9]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-medium text-white/90">
                    <span>AI Education Rwanda</span>
                    <span className="tabular-nums">{evt.dateLabel}</span>
                  </div>
                  <div>
                    <p className="text-[20px] sm:text-[22px] font-display font-bold leading-snug text-balance">
                      {lang === 'en' ? evt.titleEn : evt.titleRw}
                    </p>
                    <p className="text-sm text-white/90 mt-1">{evt.speaker}</p>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 flex-1 flex flex-col justify-between gap-5">
                  <div>
                    <p className="text-[15px] font-semibold text-[#0284C7] mb-1.5">
                      {formatLabel} · {evt.typeLabel} · {evt.languageLabel}
                    </p>
                    <h2 className="text-[22px] sm:text-[24px] font-display font-bold text-[#0D0D0F] leading-[1.25] tracking-[-0.015em] mb-2.5">
                      {lang === 'en' ? evt.titleEn : evt.titleRw}
                    </h2>
                    <p className="text-[15px] text-[#5D5D66] leading-relaxed line-clamp-2">
                      {lang === 'en' ? evt.descriptionEn : evt.descriptionRw}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-black/[0.06] flex flex-wrap items-end justify-between gap-4">
                    <div className="space-y-1.5 text-[15px] text-[#5D5D66] min-w-0 flex-1">
                      <p className="inline-flex items-center gap-2 tabular-nums truncate w-full">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span className="truncate">{evt.timeLabel} ({evt.timezone})</span>
                      </p>
                      <p className="inline-flex items-center gap-2 tabular-nums truncate w-full">
                        <Calendar className="w-4 h-4 shrink-0" />
                        <span className="truncate">{evt.dateLabel}</span>
                      </p>
                      <p className="inline-flex items-center gap-2 truncate w-full">
                        {evt.format === 'online' ? (
                          <Video className="w-4 h-4 shrink-0" />
                        ) : (
                          <MapPin className="w-4 h-4 shrink-0" />
                        )}
                        <span className="truncate">
                          {lang === 'en' ? evt.locationEn : evt.locationRw}
                        </span>
                      </p>
                    </div>

                    <div className="shrink-0">
                      {isPast ? (
                        <button
                          type="button"
                          onClick={() => setReplayEvent(evt)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 text-[15px] font-semibold text-[#0284C7] border border-[#0284C7]/40 hover:bg-[#F0F9FF] rounded-lg transition-colors whitespace-nowrap"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>{lang === 'en' ? 'Replay' : 'Subiramo'}</span>
                        </button>
                      ) : evt.status === 'cancelled' ? (
                        <span className="text-sm font-mono text-[#DC2626]">
                          {lang === 'en' ? 'Cancelled' : 'Byahagaritswe'}
                        </span>
                      ) : evt.status === 'fully_booked' ||
                        (evt.capacity > 0 && (evt.registeredCount ?? 0) >= evt.capacity) ? (
                        <span className="text-sm font-mono text-[#D97706]">
                          {lang === 'en' ? 'Fully Booked' : 'Byuzuye'}
                        </span>
                      ) : registered ? (
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0D7A5F]">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{lang === 'en' ? 'Registered' : 'Byemejwe'}</span>
                          </span>
                          <div className="flex items-center gap-3">
                            {evt.meetingUrl && (
                              <a
                                href={evt.meetingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm font-medium text-[#0284C7] underline"
                              >
                                {lang === 'en' ? 'Join' : 'Injira'}
                              </a>
                            )}
                            <button
                              type="button"
                              disabled={cancellingId === evt.id}
                              onClick={() => handleCancelRsvp(evt)}
                              className="text-sm text-[#5D5D66] hover:text-[#DC2626] underline"
                            >
                              {cancellingId === evt.id ? '...' : lang === 'en' ? 'Cancel' : 'Hagarika'}
                            </button>
                          </div>
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
                          className="px-5 py-2.5 text-[15px] font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors whitespace-nowrap"
                        >
                          {lang === 'en' ? 'Register' : 'Iyandikishe'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Replay / Summary Modal (Responsive across Mobile, Tablet, Laptop) */}
      {replayEvent && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-black/10 rounded-t-2xl sm:rounded-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-display font-bold text-[#0D0D0F]">
                {lang === 'en' ? 'Session Recording & Notes' : 'Inyandiko n’Amashusho y’Ikiganiro'}
              </h2>
              <button
                type="button"
                onClick={() => setReplayEvent(null)}
                className="px-3 py-1.5 text-sm font-medium text-[#5D5D66] hover:text-[#0D0D0F] rounded-lg hover:bg-[#F4F5F7]"
              >
                {lang === 'en' ? 'Close' : 'Funga'}
              </button>
            </div>
            <p className="text-lg font-semibold text-[#0D0D0F]">
              {lang === 'en' ? replayEvent.titleEn : replayEvent.titleRw}
            </p>
            <p className="text-[15px] text-[#5D5D66] leading-relaxed">
              {lang === 'en' ? replayEvent.descriptionEn : replayEvent.descriptionRw}
            </p>
            {replayEvent.meetingUrl ? (
              <a
                href={replayEvent.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-3 text-[15px] font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg"
              >
                <span>{lang === 'en' ? 'Watch Replay' : 'Reba Ikiganiro'}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <p className="text-[15px] text-[#5D5D66] bg-[#F7F8FA] border border-black/[0.08] rounded-xl p-4 leading-relaxed">
                {lang === 'en'
                  ? 'Slide deck and prompt templates from this clinic are archived inside the Projects & Free Tools library.'
                  : 'Imfashanyigisho z’iki kiganiro ziboneka mu gice cy’Imishinga n’Ibikoresho.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* RSVP Modal (Responsive across Mobile, Tablet, Laptop) */}
      {rsvpEvent && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-black/10 rounded-t-2xl sm:rounded-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-display font-bold text-[#0D0D0F]">
                {lang === 'en' ? 'Confirm Event Registration' : 'Emeza Kwiyandikisha'}
              </h2>
              <button
                type="button"
                onClick={() => setRsvpEvent(null)}
                className="px-3 py-1.5 text-sm font-medium text-[#5D5D66] hover:text-[#0D0D0F] rounded-lg hover:bg-[#F4F5F7]"
              >
                {lang === 'en' ? 'Close' : 'Funga'}
              </button>
            </div>

            {doneMessage ? (
              <div className="space-y-4">
                <p className="text-[15px] text-[#0D7A5F] font-medium">{doneMessage}</p>
                {rsvpEvent.meetingUrl && (
                  <a
                    href={rsvpEvent.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0284C7] underline"
                  >
                    <span>{lang === 'en' ? 'Save Session Link' : 'Bika Link y’Ikiganiro'}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setRsvpEvent(null)}
                  className="w-full min-h-[44px] px-5 py-3 text-[15px] font-semibold text-white bg-[#0284C7] rounded-lg"
                >
                  {lang === 'en' ? 'Done' : 'Byarangiye'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmRsvp} className="space-y-5">
                <div>
                  <p className="text-lg font-semibold text-[#0D0D0F]">
                    {lang === 'en' ? rsvpEvent.titleEn : rsvpEvent.titleRw}
                  </p>
                  <p className="text-[15px] text-[#5D5D66] mt-1">
                    {rsvpEvent.dateLabel} · {rsvpEvent.timeLabel} ({rsvpEvent.timezone})
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#0D0D0F] mb-2">
                    {lang === 'en' ? 'Attendance preference' : 'Uko uzitabira'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setAttendanceMode('online')}
                      className={`min-h-[44px] px-4 py-2.5 text-[15px] font-medium rounded-lg border ${
                        attendanceMode === 'online'
                          ? 'bg-[#0284C7] text-white border-[#0284C7]'
                          : 'bg-white text-[#0D0D0F] border-black/15'
                      }`}
                    >
                      {lang === 'en' ? 'Online Stream' : 'Kuri Interineti'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendanceMode('kigali_in_person')}
                      className={`min-h-[44px] px-4 py-2.5 text-[15px] font-medium rounded-lg border ${
                        attendanceMode === 'kigali_in_person'
                          ? 'bg-[#0284C7] text-white border-[#0284C7]'
                          : 'bg-white text-[#0D0D0F] border-black/15'
                      }`}
                    >
                      {lang === 'en' ? 'Kigali In-Person' : 'I Kigali Imbonankubone'}
                    </button>
                  </div>
                </div>

                {rsvpError && (
                  <p className="text-sm text-[#DC2626] bg-[#FEF2F2] border border-[#DC2626]/20 rounded-lg px-4 py-3">
                    {rsvpError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full min-h-[44px] px-5 py-3 text-[15px] font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg"
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
