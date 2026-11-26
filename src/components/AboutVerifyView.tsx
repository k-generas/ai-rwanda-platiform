import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';
import type { User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type { Certificate, Language, PageRoute } from '../types';
import { OPERATING_PRINCIPLES, SAMPLE_VERIFIED_CERTIFICATE } from '../data/curriculum';
import { CertificateQrCode, LuminousCover } from './BrandVisuals';

interface AboutVerifyViewProps {
  lang: Language;
  mode: 'about' | 'verify';
  initialCertId?: string;
  enablePublicVerify?: boolean;
  user?: User | null;
  certificates?: Certificate[];
  onSignIn?: () => void;
  onNavigate?: (route: PageRoute) => void;
}

export function AboutVerifyView({
  lang,
  mode,
  initialCertId,
  enablePublicVerify = true,
  user = null,
  certificates = [],
  onSignIn,
  onNavigate
}: AboutVerifyViewProps) {
  const [certQuery, setCertQuery] = useState(initialCertId || 'RW-AI-2026-0042');
  const [certResult, setCertResult] = useState<Certificate | null>(null);
  const [certNotFound, setCertNotFound] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactTopic, setContactTopic] = useState('Student / Enrollment Question');
  const [contactMsg, setContactMsg] = useState('');
  const [contactSent, setContactSent] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  const runVerification = async (rawId: string) => {
    if (!enablePublicVerify) return;
    const cleanId = rawId.trim().toUpperCase();
    if (!cleanId) return;
    setVerifying(true);
    setCertNotFound(false);
    setCertResult(null);

    const path = `certificates/${cleanId}`;
    try {
      const snap = await getDoc(doc(db, 'certificates', cleanId));
      if (snap.exists()) {
        setCertResult(snap.data() as Certificate);
      } else if (cleanId === SAMPLE_VERIFIED_CERTIFICATE.id) {
        setCertResult(SAMPLE_VERIFIED_CERTIFICATE);
      } else {
        setCertNotFound(true);
      }
    } catch (err) {
      if (cleanId === SAMPLE_VERIFIED_CERTIFICATE.id) {
        setCertResult(SAMPLE_VERIFIED_CERTIFICATE);
      } else {
        handleFirestoreError(err, OperationType.GET, path);
      }
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (mode === 'verify' && enablePublicVerify) {
      runVerification(initialCertId || 'RW-AI-2026-0042');
    }
  }, [mode, initialCertId, enablePublicVerify]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactBusy(true);
    setContactError(null);
    const id = `inq_${Date.now()}`;
    const path = `inquiries/${id}`;
    try {
      const checkRes = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName.trim(),
          email: contactEmail.trim(),
          type: 'contact'
        })
      });
      if (!checkRes.ok) {
        const errBody = (await checkRes.json().catch(() => ({}))) as { error?: string };
        setContactError(
          errBody.error ||
            (lang === 'en'
              ? 'Too many submissions right now. Please wait a minute and try again.'
              : 'Wohereje ubutumwa bwinshi. Tegereza umunota umwe wongere ugerageze.')
        );
        return;
      }

      await setDoc(doc(db, 'inquiries', id), {
        id,
        type: 'contact',
        name: contactName.trim(),
        email: contactEmail.trim(),
        topic: contactTopic,
        message: contactMsg.trim(),
        createdAt: serverTimestamp()
      });
      setContactSent(true);
      setContactName('');
      setContactEmail('');
      setContactMsg('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setContactBusy(false);
    }
  };

  if (mode === 'verify') {
    if (!enablePublicVerify) {
      return (
        <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-16 text-center space-y-3">
          <p className="text-xs font-mono text-[#0D7A5F] uppercase">Public Registry Paused</p>
          <h1 className="text-2xl font-display font-semibold text-[#0D0D0F]">
            {lang === 'en'
              ? 'Public Certificate Verification is Currently Unavailable'
              : 'Igenzura Rusange ry’Impamyabumenyi Rirafunze By’Agateganyo'}
          </h1>
          <p className="text-sm text-[#5D5D66]">
            {lang === 'en'
              ? 'Platform administrators have temporarily disabled public certificate lookups.'
              : 'Ubuyobozi bwabaye buhagaritse igenzura rusange by’agateganyo.'}
          </p>
        </div>
      );
    }
    return (
      <div className="max-w-[1260px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Banner Header */}
        <LuminousCover
          variant="banner"
          className="rounded-2xl text-white p-8 sm:p-12 lg:p-14 shadow-xs"
        >
          <Award className="w-8 h-8 text-white mb-4" aria-hidden="true" />
          <h1 className="text-[36px] sm:text-[48px] lg:text-[54px] font-display font-bold tracking-[-0.03em] leading-[1.08] mb-3">
            {lang === 'en' ? 'My Certificates & Verification' : 'Impamyabumenyi n’Igenzura'}
          </h1>
          <p className="text-[16px] sm:text-[19px] text-white/95 max-w-2xl leading-relaxed">
            {lang === 'en'
              ? 'View your earned completion certificates or verify any Certificate ID issued by AI Education Rwanda.'
              : 'Reba impamyabumenyi zawe cyangwa ugenzure ukuri kw’impamyabumenyi zatanzwe na AI Education Rwanda.'}
          </p>
        </LuminousCover>

        {/* My Earned Certificates Card */}
        <section className="bg-white border border-black/[0.08] rounded-2xl p-6 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#0D0D0F]">
                {lang === 'en' ? 'My Certificates' : 'Impamyabumenyi Zanjye'}
              </h2>
              <p className="text-[15px] text-[#5D5D66] mt-1">
                {lang === 'en'
                  ? 'Verified completion credentials automatically appear here once course requirements and final project grading (>=70%) are approved.'
                  : 'Impamyabumenyi ziboneka hano umaze kurangiza isomo no gutsinda umushinga wa nyuma (>=70%).'}
              </p>
            </div>
            {!user && onSignIn && (
              <button
                type="button"
                onClick={onSignIn}
                className="px-5 py-2.5 text-[15px] font-semibold text-white bg-[#0D7A5F] hover:bg-[#095945] rounded-lg"
              >
                {lang === 'en' ? 'Sign in to view yours' : 'Injira urebe izawe'}
              </button>
            )}
          </div>

          {user && certificates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="bg-[#FAFAFB] border border-black/[0.08] rounded-xl p-5 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-mono text-[#0D7A5F] mb-1">{cert.id}</p>
                    <h3 className="text-lg font-bold text-[#0D0D0F]">{cert.courseTitle}</h3>
                    <p className="text-sm text-[#5D5D66] mt-1">
                      {cert.learnerName} · {cert.finalScore}% · {cert.status.toUpperCase()}
                    </p>
                  </div>
                  <CertificateQrCode value={`${window.location.origin}/?verify=${cert.id}`} />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#FAFAFB] border border-black/[0.07] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-[15px] text-[#5D5D66]">
                {user
                  ? lang === 'en'
                    ? 'You have not earned a certificate yet. Complete the 28-Day Practical AI Challenge to unlock your verified credential.'
                    : 'Nta mpamyabumenyi urabona. Soza amasomo y’iminsi 28 ubone impamyabumenyi.'
                  : lang === 'en'
                    ? 'Sign in with your learner account to see your personal earned certificates.'
                    : 'Injira muri konti yawe urebe impamyabumenyi zawe.'}
              </p>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('courses')}
                  className="px-5 py-2.5 text-[15px] font-semibold text-[#0D7A5F] border border-[#0D7A5F]/40 hover:bg-[#ECFDF5] rounded-lg shrink-0"
                >
                  {lang === 'en' ? 'Browse courses' : 'Reba amasomo'}
                </button>
              )}
            </div>
          )}
        </section>

        {/* Public Verifier Card */}
        <section className="bg-white border border-black/[0.08] rounded-2xl p-6 sm:p-10">
          <header className="mb-6">
            <p className="text-[13px] sm:text-sm font-semibold text-[#0D7A5F] uppercase mb-1.5">
              {lang === 'en' ? 'Public Credential Registry' : 'Igenzura ry’Impamyabumenyi'}
            </p>
            <h2 className="text-[28px] sm:text-[36px] font-display font-bold tracking-tight text-[#0D0D0F] mb-2">
              {lang === 'en'
                ? 'Verify a Certificate of Completion'
                : 'Genzura Ukuri kw’Impamyabumenyi'}
            </h2>
            <p className="text-[15px] sm:text-[16px] text-[#5D5D66]">
              {lang === 'en'
                ? 'Enter the Certificate ID printed on a learner certificate (try sample ID RW-AI-2026-0042).'
                : 'Andika nimero y’impamyabumenyi kugira ngo urebe niba yemewe (urugero: RW-AI-2026-0042).'}
            </p>
          </header>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              runVerification(certQuery);
            }}
            className="flex flex-col sm:flex-row gap-3 mb-8"
          >
            <input
              type="text"
              value={certQuery}
              onChange={(e) => setCertQuery(e.target.value)}
              placeholder="RW-AI-2026-0042"
              aria-label="Certificate ID"
              className="flex-1 min-h-[48px] px-4 py-3 text-base font-mono bg-[#F7F8F6] border border-black/15 rounded-lg focus:outline-none focus:border-[#0D7A5F]"
            />
            <button
              type="submit"
              disabled={verifying}
              className="min-h-[48px] px-6 py-3 text-[15px] font-semibold text-white bg-[#0D7A5F] hover:bg-[#095945] rounded-lg whitespace-nowrap"
            >
              {verifying
                ? lang === 'en'
                  ? 'Checking...'
                  : 'Biragenzurwa...'
                : lang === 'en'
                  ? 'Verify Certificate'
                  : 'Genzura'}
            </button>
          </form>

          {certResult && (
            <div className="bg-[#FAFAFB] border border-black/10 rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-black/[0.08]">
                <div>
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-[#0D7A5F] mb-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {certResult.status === 'valid'
                        ? lang === 'en'
                          ? 'Verified Valid Credential'
                          : 'Impamyabumenyi Yemewe'
                        : lang === 'en'
                          ? 'Revoked Credential'
                          : 'Impamyabumenyi Yahagaritswe'}
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-display font-bold text-[#0D0D0F]">
                    {certResult.learnerName}
                  </h3>
                  <p className="text-[15px] text-[#5D5D66] mt-1">{certResult.courseTitle}</p>
                </div>
                <CertificateQrCode
                  value={`${window.location.origin}/?verify=${certResult.id}`}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 text-sm">
                <div>
                  <p className="text-[#5D5D66] mb-1">Certificate ID</p>
                  <p className="font-mono font-medium text-[#0D0D0F]">{certResult.id}</p>
                </div>
                <div>
                  <p className="text-[#5D5D66] mb-1">{lang === 'en' ? 'Final Score' : 'Amanota'}</p>
                  <p className="font-mono font-medium text-[#0D0D0F] tabular-nums">
                    {certResult.finalScore}%
                  </p>
                </div>
                <div>
                  <p className="text-[#5D5D66] mb-1">{lang === 'en' ? 'Status' : 'Imiterere'}</p>
                  <p className="font-medium text-[#0D7A5F] uppercase">{certResult.status}</p>
                </div>
                <div>
                  <p className="text-[#5D5D66] mb-1">{lang === 'en' ? 'Issued By' : 'Uwabitanze'}</p>
                  <p className="font-medium text-[#0D0D0F]">{certResult.issuedBy}</p>
                </div>
              </div>
            </div>
          )}

          {certNotFound && (
            <div className="bg-[#FEF2F2] border border-[#DC2626]/20 rounded-2xl p-6 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-semibold text-[#0D0D0F]">
                  {lang === 'en' ? 'No matching certificate found' : 'Nta mpamyabumenyi ibonetse'}
                </h3>
                <p className="text-sm text-[#5D5D66] mt-1">
                  {lang === 'en'
                    ? 'Double-check the Certificate ID format (e.g. RW-AI-2026-0042).'
                    : 'Reba ko wanditse nimero neza (urugero: RW-AI-2026-0042).'}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-[1260px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-14">
      {/* Mission & Vision */}
      <header className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-12 border-b border-black/[0.08]">
        <div className="lg:col-span-7">
          <p className="text-sm font-semibold text-[#0D7A5F] mb-2">
            {lang === 'en' ? 'About AI Education Rwanda' : 'Ibyerekeye AI Education Rwanda'}
          </p>
          <h1 className="text-[36px] sm:text-[48px] font-display font-bold tracking-[-0.03em] leading-[1.08] text-[#0D0D0F] text-balance mb-4">
            {lang === 'en'
              ? 'Moving learners from basic AI chat to practical systems.'
              : 'Kujyana abanyeshuri kuva ku kuganira na AI gusa bakagera ku kubaka sisitemu zikora.'}
          </h1>
          <p className="text-[16px] sm:text-[18px] text-[#5D5D66] leading-relaxed">
            {lang === 'en'
              ? 'Our mission is to make practical AI education accessible in both English and Kinyarwanda—starting in Rwanda and expanding across East Africa—so individuals and small organizations can solve real problems responsibly.'
              : 'Intego yacu ni ugutanga uburezi bwa AI bufatika mu Cyongereza no mu Kinyarwanda—duhereye mu Rwanda—kugira ngo abantu n’ibigo bikemure ibibazo by’ukuri.'}
          </p>
        </div>

        <div className="lg:col-span-5 bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[#0D0D0F]">
            {lang === 'en' ? 'Geographic Expansion Roadmap' : 'Icyerekezo cy’Imikoranire'}
          </h2>
          <div className="space-y-2.5 text-sm">
            {[
              ['Stage 1', 'Rwanda (Pilot & Core Cohorts)'],
              ['Stage 2', 'East Africa Regional Expansion'],
              ['Stage 3', 'Pan-African Bilingual Tracks'],
              ['Stage 4', 'Global Practical AI Community']
            ].map(([stage, market]) => (
              <div
                key={stage}
                className="flex items-center justify-between py-2 border-b border-black/[0.06] last:border-none"
              >
                <span className="font-mono text-xs text-[#0D7A5F]">{stage}</span>
                <span className="text-[#0D0D0F] font-medium text-xs sm:text-sm">{market}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Operating Principles */}
      <section>
        <h2 className="text-2xl font-display font-semibold text-[#0D0D0F] mb-6">
          {lang === 'en' ? 'Core Operating Principles' : 'Amahame Tugenderaho'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {OPERATING_PRINCIPLES.map((p, idx) => (
            <div
              key={p.en}
              className="bg-white border border-black/[0.08] rounded-xl p-4 flex items-start gap-3"
            >
              <span className="font-mono text-xs text-[#0D7A5F] tabular-nums mt-0.5">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <p className="text-sm text-[#0D0D0F] leading-snug">{p[lang]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ + Contact Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-6 border-t border-black/[0.08]">
        <div className="lg:col-span-6 space-y-5">
          <h2 className="text-2xl font-display font-semibold text-[#0D0D0F]">
            {lang === 'en' ? 'Frequently Asked Questions' : 'Ibibazo Bikunze Kubazwa'}
          </h2>
          {[
            {
              q: {
                en: 'Do I need coding experience or paid AI subscriptions?',
                rw: 'Ese bisaba kumenya kwandika kode cyangwa kugura porogaramu zishyurwa?'
              },
              a: {
                en: 'No. All Week 1–4 exercises use free tiers of ChatGPT, Google Gemini, NotebookLM, Google Workspace, and Make.',
                rw: 'Oya. Imyitozo yose ikoresha porogaramu z’ubuntu nta kiguzi cy’inyongera.'
              }
            },
            {
              q: {
                en: 'Can I complete the 28-Day Challenge on a smartphone?',
                rw: 'Ese nakora icyiciro cy’iminsi 28 nkoresheje telefoni gusa?'
              },
              a: {
                en: 'You can read all lessons and run prompt exercises on a phone. Week 3–4 automation builds require access to a laptop.',
                rw: 'Ushobora gusoma amasomo yose kuri telefoni, ariko kubaka imiyoboro mu byumweru bya 3–4 bisaba mudasobwa.'
              }
            },
            {
              q: {
                en: 'How is learner data protected?',
                rw: 'Amakuru y’abanyeshuri arindwa ate?'
              },
              a: {
                en: 'Learner profiles and records follow strict access rules aligned with Rwanda Law No. 058/2021 on personal data protection and privacy. Mobile Money PINs are never requested or stored.',
                rw: 'Amakuru arindwa ukurikije Itegeko N° 058/2021 ryerekeye kurinda amakuru bwite mu Rwanda.'
              }
            }
          ].map((faq) => (
            <div key={faq.q.en} className="bg-[#F9F9FB] border border-black/[0.08] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#0D0D0F] mb-1.5">{faq.q[lang]}</h3>
              <p className="text-xs sm:text-sm text-[#5D5D66] leading-relaxed">{faq.a[lang]}</p>
            </div>
          ))}
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-6 bg-white border border-black/[0.08] rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl font-display font-semibold text-[#0D0D0F] mb-2">
            {lang === 'en' ? 'Contact & Institutional Inquiries' : 'Twandikire'}
          </h2>
          <p className="text-xs text-[#5D5D66] mb-6">
            {lang === 'en'
              ? 'Questions about student cohorts, school partnerships, or corporate workshops? Send a message.'
              : 'Ufite ikibazo ku masomo, ubufatanye n’amashuri cyangwa amahugurwa y’ibigo? Twandikire.'}
          </p>

          {contactSent ? (
            <div className="bg-[#ECFDF5] border border-[#0D7A5F]/25 rounded-xl p-5 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#0D7A5F] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#0D0D0F]">
                  {lang === 'en' ? 'Inquiry received' : 'Ubutumwa bwakiriwe'}
                </p>
                <p className="text-xs text-[#5D5D66] mt-1">
                  {lang === 'en'
                    ? 'Thank you. Our team will respond to your email shortly.'
                    : 'Murakoze. Ikipe yacu izagusubiza vuba kuri imeri yawe.'}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label htmlFor="c-name" className="block text-xs font-medium text-[#0D0D0F] mb-1">
                  {lang === 'en' ? 'Full name' : 'Amazina yose'}
                </label>
                <input
                  id="c-name"
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-black/15 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="c-email" className="block text-xs font-medium text-[#0D0D0F] mb-1">
                  {lang === 'en' ? 'Email address' : 'Imeri'}
                </label>
                <input
                  id="c-email"
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-black/15 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="c-topic" className="block text-xs font-medium text-[#0D0D0F] mb-1">
                  {lang === 'en' ? 'Topic' : 'Ingingo'}
                </label>
                <select
                  id="c-topic"
                  value={contactTopic}
                  onChange={(e) => setContactTopic(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-black/15 rounded-lg bg-white"
                >
                  <option>Student / Enrollment Question</option>
                  <option>TVET / University Partnership</option>
                  <option>Corporate / NGO Workshop</option>
                  <option>Certificate Verification Support</option>
                </select>
              </div>
              <div>
                <label htmlFor="c-msg" className="block text-xs font-medium text-[#0D0D0F] mb-1">
                  {lang === 'en' ? 'Message' : 'Ubutumwa'}
                </label>
                <textarea
                  id="c-msg"
                  rows={4}
                  required
                  value={contactMsg}
                  onChange={(e) => setContactMsg(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-black/15 rounded-lg"
                />
              </div>
              {contactError && (
                <p className="text-xs text-[#DC2626] bg-[#FEF2F2] border border-[#DC2626]/20 rounded-lg px-3 py-2">
                  {contactError}
                </p>
              )}
              <button
                type="submit"
                disabled={contactBusy}
                className="px-5 py-2.5 text-sm font-medium text-white bg-[#0D0D0F] rounded-lg hover:bg-[#232329]"
              >
                {contactBusy
                  ? lang === 'en'
                    ? 'Sending...'
                    : 'Birimo koherezwa...'
                  : lang === 'en'
                    ? 'Send message'
                    : 'Ohereza ubutumwa'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
