import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  type User
} from 'firebase/auth';
import { X } from 'lucide-react';
import { auth, googleProvider, isBootstrappedSuperadminEmail } from '../firebase';
import type { Language } from '../types';

interface AuthModalProps {
  open: boolean;
  lang: Language;
  allowSelfRegistration: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => Promise<void> | void;
}

export function AuthModal({
  open,
  lang,
  allowSelfRegistration,
  onClose,
  onAuthSuccess
}: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset' | 'verify'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  if (!open) return null;

  const formatAuthError = (err: unknown): string => {
    const code = (err as { code?: string })?.code ?? '';
    if (code === 'auth/operation-not-allowed') {
      return lang === 'en'
        ? 'Email/Password sign-in is not yet enabled in Firebase Console (Authentication -> Sign-in method -> Email/Password). Enable it in Firebase Console or click Continue with Google above.'
        : 'Kwinjira na Email/Ijambo banga ntibirafungurwa muri Firebase Console. Bifungure muri Firebase Console cyangwa ukoreshe Google haruguru.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return lang === 'en' ? 'Sign-in window was closed.' : 'Idirishya ryo kwinjira ryafunzwe.';
    }
    if (code === 'auth/email-already-in-use') {
      return lang === 'en'
        ? 'An account with this email already exists. Switch to Sign In.'
        : 'Iyi imeli isanzwe ifite konti. Kanda Injira.';
    }
    if (code === 'auth/weak-password') {
      return lang === 'en'
        ? 'Password must be at least 6 characters long.'
        : 'Ijambo banga rigomba kugira nibura inyuguti 6.';
    }
    if (
      code === 'auth/invalid-credential' ||
      code === 'auth/wrong-password' ||
      code === 'auth/user-not-found'
    ) {
      return lang === 'en'
        ? 'Invalid email or password. If you have not created this account yet, switch to Register.'
        : 'Imeli cyangwa ijambo banga si byo. Niba utariyandikisha, kanda Iyandikishe.';
    }
    if (code === 'auth/too-many-requests') {
      return lang === 'en'
        ? 'Too many attempts. Please wait a moment and try again.'
        : 'Wagerageje kenshi cyane. Tegereza akanya gato wongere.';
    }
    return err instanceof Error ? err.message : 'Authentication failed.';
  };

  const handleGoogleSignIn = async () => {
    setBusy(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await onAuthSuccess(cred.user);
      onClose();
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleCheckVerified = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      const current = auth.currentUser;
      if (!current) {
        setMode('signin');
        setBusy(false);
        return;
      }
      await current.reload();
      if (current.emailVerified) {
        await current.getIdToken(true);
        await onAuthSuccess(current);
        onClose();
      } else {
        setErrorMsg(
          lang === 'en'
            ? 'Email verification not detected yet. Click the link sent to your inbox (or use Continue with Google for Gmail accounts), then click this button again.'
            : 'Imeli ntitari yemezwa. Kanda link yoherejwe kuri imeli yawe cyangwa ukoreshe Google.'
        );
      }
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleResendVerification = async () => {
    setBusy(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const current = auth.currentUser;
      if (!current) {
        setMode('signin');
        setBusy(false);
        return;
      }
      await sendEmailVerification(current);
      setInfoMsg(
        lang === 'en'
          ? `Verification email re-sent to ${current.email}. Check your inbox and spam folder.`
          : `Link yo kwemeza yongeye koherezwa kuri ${current.email}.`
      );
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    setInfoMsg(null);

    const normalizedEmail = email.trim();

    try {
      if (mode === 'reset') {
        await sendPasswordResetEmail(auth, normalizedEmail);
        setInfoMsg(
          lang === 'en'
            ? 'Password reset email sent. Check your inbox.'
            : 'Ubutumwa bwo guhindura ijambo banga bwoherejwe kuri imeli yawe.'
        );
      } else if (mode === 'signup') {
        if (!allowSelfRegistration && !isBootstrappedSuperadminEmail(normalizedEmail)) {
          setErrorMsg(
            lang === 'en'
              ? 'New self-registrations are currently paused by the platform administrator.'
              : 'Kwiyandikisha bishya byahagaritswe by’agateganyo n’ubuyobozi.'
          );
          setBusy(false);
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        if (fullName.trim()) {
          await updateProfile(cred.user, { displayName: fullName.trim() });
        }
        try {
          await sendEmailVerification(cred.user);
        } catch {
          // Account created; user can resend or verify via Google
        }
        setMode('verify');
        setInfoMsg(
          lang === 'en'
            ? `Account created for ${normalizedEmail}. Open the verification link sent to your inbox, then click "I've Verified — Continue".`
            : `Konti ya ${normalizedEmail} yafunguwe. Kanda link yoherejwe kuri imeli yawe hanyuma ukande "Emeza — Komeza".`
        );
      } else {
        const cred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        if (!cred.user.emailVerified) {
          try {
            await sendEmailVerification(cred.user);
          } catch {
            // Avoid blocking login screen if Firebase rate-limits verification email
          }
          setMode('verify');
          setInfoMsg(
            lang === 'en'
              ? `Signed in as ${cred.user.email}. Please verify your email address via the link sent to your inbox (or use Continue with Google) to unlock your workspace.`
              : `Winjiye nka ${cred.user.email}. Emeza imeli yawe ukoresheje link yoherejwe kuri imeli cyangwa ukoreshe Google.`
          );
        } else {
          await onAuthSuccess(cred.user);
          onClose();
        }
      }
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white border border-black/10 rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#0D7A5F] mb-1">
              AI Education Rwanda
            </p>
            <h2 id="auth-modal-title" className="text-xl font-display font-semibold text-[#0D0D0F]">
              {mode === 'verify'
                ? lang === 'en'
                  ? 'Confirm Your Email Address'
                  : 'Emeza Imeli Yawe'
                : mode === 'signup'
                  ? lang === 'en'
                    ? 'Create Your Account'
                    : 'Fungura Konti'
                  : mode === 'reset'
                    ? lang === 'en'
                      ? 'Reset Password'
                      : 'Hindura Ijambo Banga'
                    : lang === 'en'
                      ? 'Sign in to Your Workspace'
                      : 'Injira muri Konti Yawe'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign-in dialog"
            className="p-1.5 rounded-lg text-[#5D5D66] hover:text-[#0D0D0F] hover:bg-[#F4F5F7]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={handleGoogleSignIn}
          className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#0D0D0F] rounded-lg hover:bg-[#232329] transition-colors disabled:opacity-60"
        >
          {lang === 'en' ? 'Continue with Google' : 'Komeza ukoresheje Google'}
        </button>

        {mode === 'verify' ? (
          <div className="space-y-3 pt-1">
            {infoMsg && (
              <p className="text-xs text-[#0D7A5F] bg-[#ECFDF5] border border-[#0D7A5F]/20 rounded-lg p-3 leading-relaxed">
                {infoMsg}
              </p>
            )}
            {errorMsg && (
              <p className="text-xs text-[#DC2626] bg-[#FEF2F2] border border-[#DC2626]/20 rounded-lg p-3 leading-relaxed">
                {errorMsg}
              </p>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={handleCheckVerified}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#0D7A5F] rounded-lg hover:bg-[#0B664F] transition-colors disabled:opacity-60"
            >
              {busy
                ? lang === 'en'
                  ? 'Checking...'
                  : 'Biragenzurwa...'
                : lang === 'en'
                  ? "I've Verified — Continue"
                  : 'Nemeje Imeli — Komeza'}
            </button>
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={handleResendVerification}
                className="text-xs font-medium text-[#0D0D0F] underline underline-offset-4"
              >
                {lang === 'en' ? 'Resend verification email' : 'Ongera wohereze link'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setMode('signin');
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className="text-xs text-[#5D5D66] hover:text-[#0D0D0F]"
              >
                {lang === 'en' ? 'Back to Sign In' : 'Subira Kwinjira'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 text-xs text-[#5D5D66]">
              <div className="flex-1 h-px bg-black/[0.08]" />
              <span>{lang === 'en' ? 'or with email' : 'cyangwa na imeli'}</span>
              <div className="flex-1 h-px bg-black/[0.08]" />
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#F4F5F7] rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  mode === 'signin' ? 'bg-white text-[#0D0D0F] shadow-xs' : 'text-[#5D5D66]'
                }`}
              >
                {lang === 'en' ? 'Sign In' : 'Injira'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  mode === 'signup' ? 'bg-white text-[#0D0D0F] shadow-xs' : 'text-[#5D5D66]'
                }`}
              >
                {lang === 'en' ? 'Create Account' : 'Iyandikishe'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('reset');
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  mode === 'reset' ? 'bg-white text-[#0D0D0F] shadow-xs' : 'text-[#5D5D66]'
                }`}
              >
                {lang === 'en' ? 'Recover' : 'Bikuza'}
              </button>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-3">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-[#0D0D0F] mb-1">
                    {lang === 'en' ? 'Full Name' : 'Amazina Yose'}
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Aline Uwase"
                    className="w-full px-3.5 py-2 text-sm border border-black/15 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#0D0D0F] mb-1">
                  {lang === 'en' ? 'Email Address' : 'Imeli'}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2 text-sm border border-black/15 rounded-lg"
                />
              </div>

              {mode !== 'reset' && (
                <div>
                  <label className="block text-xs font-medium text-[#0D0D0F] mb-1">
                    {lang === 'en' ? 'Password' : 'Ijambo Banga'}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-black/15 rounded-lg"
                  />
                </div>
              )}

              {errorMsg && (
                <p className="text-xs text-[#DC2626] bg-[#FEF2F2] border border-[#DC2626]/20 rounded-lg p-3 leading-relaxed">
                  {errorMsg}
                </p>
              )}
              {infoMsg && (
                <p className="text-xs text-[#0D7A5F] bg-[#ECFDF5] border border-[#0D7A5F]/20 rounded-lg p-3 leading-relaxed">
                  {infoMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full px-4 py-2.5 text-sm font-medium text-[#0D0D0F] bg-[#F4F5F7] hover:bg-[#E7E9EE] border border-black/10 rounded-lg transition-colors disabled:opacity-60"
              >
                {busy
                  ? lang === 'en'
                    ? 'Please wait...'
                    : 'Tegereza...'
                  : mode === 'signup'
                    ? lang === 'en'
                      ? 'Create Account with Email'
                      : 'Fungura Konti'
                    : mode === 'reset'
                      ? lang === 'en'
                        ? 'Send Password Reset Link'
                        : 'Ohereza Link yo Guhindura'
                      : lang === 'en'
                        ? 'Sign In with Email'
                        : 'Injira na Imeli'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
