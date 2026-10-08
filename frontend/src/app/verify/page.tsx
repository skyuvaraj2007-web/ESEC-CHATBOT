'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, isDemoOtpMode } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import {
  Eye,
  ShieldCheck,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  ArrowLeft,
  Copy,
  Check,
  Sparkles,
  KeyRound,
  Lock,
  EyeOff,
} from 'lucide-react';

function maskTarget(target: string, type: 'email' | 'phone'): string {
  if (!target) return 'your address';
  if (type === 'email') {
    const parts = target.split('@');
    if (parts.length === 2) {
      const name = parts[0];
      const domain = parts[1];
      const maskedName = name.length > 2 ? `${name.slice(0, 2)}***` : `${name}***`;
      return `${maskedName}@${domain}`;
    }
    return target;
  } else {
    const clean = target.replace(/\s+/g, '');
    if (clean.length > 6) {
      const start = clean.slice(0, 3);
      const end = clean.slice(-4);
      return `${start} ******${end}`;
    }
    return target;
  }
}

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyOtp, resendOtp } = useAuth();

  const typeParam = searchParams.get('type') === 'phone' ? 'phone' : 'email';
  const targetParam = searchParams.get('target') || '';
  const isDemo = isDemoOtpMode && typeParam === 'email';

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes for demo mode
  const [canResend, setCanResend] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [needsPasswordPrompt, setNeedsPasswordPrompt] = useState(false);
  const [manualPassword, setManualPassword] = useState('');
  const [showManualPassword, setShowManualPassword] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Fetch or generate Demo OTP on mount
  useEffect(() => {
    let active = true;
    if (isDemo && targetParam && !demoOtp) {
      const storedPass = typeof window !== 'undefined'
        ? sessionStorage.getItem('visionai_pending_signup_pass') || undefined
        : undefined;
      const storedName = typeof window !== 'undefined'
        ? sessionStorage.getItem('visionai_pending_signup_name') || undefined
        : undefined;

      api.generateDemoOtp({
        email: targetParam,
        password: storedPass,
        fullName: storedName,
      })
        .then((res) => {
          if (active && res.otp) {
            setDemoOtp(res.otp);
            setCountdown(res.expires_in_seconds || 300);
          }
        })
        .catch((err) => {
          console.error('Demo OTP fetch error:', err);
        });
    }
    return () => {
      active = false;
    };
  }, [isDemo, targetParam, demoOtp]);

  // Auto focus first input
  useEffect(() => {
    if (inputRefs.current[0] && !success && !needsPasswordPrompt) {
      inputRefs.current[0].focus();
    }
  }, [success, needsPasswordPrompt]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleCopyOtp = () => {
    if (!demoOtp) return;
    navigator.clipboard.writeText(demoOtp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    // Auto-populate the 6 boxes
    const otpArray = demoOtp.split('').slice(0, 6);
    setDigits(otpArray);
    inputRefs.current[5]?.focus();
    setError(null);
  };

  const handleDigitChange = (index: number, value: string) => {
    setError(null);
    setInfoMessage(null);

    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    const singleDigit = cleanVal.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = singleDigit;
    setDigits(newDigits);

    if (index < 5 && singleDigit) {
      inputRefs.current[index + 1]?.focus();
    }

    const updatedOtp = newDigits.join('');
    if (updatedOtp.length === 6 && newDigits.every((d) => d !== '')) {
      performVerification(updatedOtp);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    setError(null);
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setDigits(newDigits);

    const focusIdx = Math.min(pastedData.length, 5);
    inputRefs.current[focusIdx]?.focus();

    if (pastedData.length === 6) {
      performVerification(pastedData);
    }
  };

  const performVerification = async (tokenStr: string, manualPass?: string) => {
    if (!targetParam) {
      setError('Missing verification target address. Please sign up again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { session: verifiedSession, error: verifyErr, needsPassword } = await verifyOtp({
        target: targetParam,
        token: tokenStr,
        type: typeParam,
        password: manualPass,
        isDemo,
      });

      if (verifyErr) {
        setError(verifyErr.message || 'Invalid verification code');
        return;
      }

      if (needsPassword) {
        setNeedsPasswordPrompt(true);
        return;
      }

      if (!verifiedSession) {
        setNeedsPasswordPrompt(true);
        return;
      }

      setNeedsPasswordPrompt(false);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Unable to verify code. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPassword.trim()) {
      setError('Please enter your password.');
      return;
    }
    const tokenStr = digits.join('') || (demoOtp ? demoOtp : '');
    await performVerification(tokenStr, manualPassword.trim());
  };

  const handleContinueToApp = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.user) {
        router.replace('/app');
        return;
      }
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData?.session?.user) {
        router.replace('/app');
        return;
      }
      setError('Verification succeeded, but we could not establish your login session. Please try entering your password.');
      setNeedsPasswordPrompt(true);
    } catch {
      setError('Verification succeeded, but we could not establish your login session. Please try entering your password.');
      setNeedsPasswordPrompt(true);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tokenStr = digits.join('');
    if (tokenStr.length < 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }
    performVerification(tokenStr);
  };

  const handleResend = async () => {
    if (resending) return;
    if (!targetParam) {
      setError('No destination address found to resend OTP.');
      return;
    }

    setResending(true);
    setError(null);
    setInfoMessage(null);

    try {
      if (isDemo) {
        const storedPass = typeof window !== 'undefined'
          ? sessionStorage.getItem('visionai_pending_signup_pass') || undefined
          : undefined;
        const storedName = typeof window !== 'undefined'
          ? sessionStorage.getItem('visionai_pending_signup_name') || undefined
          : undefined;

        const res = await api.resendDemoOtp({
          email: targetParam,
          password: storedPass,
          fullName: storedName,
        });
        setDemoOtp(res.otp);
        setCountdown(res.expires_in_seconds || 300);
        setCanResend(false);
        setDigits(['', '', '', '', '', '']);
        setInfoMessage('New Demo OTP generated.');
        inputRefs.current[0]?.focus();
      } else {
        const { error: resendErr } = await resendOtp({
          target: targetParam,
          type: typeParam,
        });

        if (resendErr) {
          setError(resendErr.message || 'Failed to resend verification code.');
        } else {
          setInfoMessage('A new verification code has been sent.');
          setCountdown(60);
          setCanResend(false);
          setDigits(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate new code.');
    } finally {
      setResending(false);
    }
  };

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const formattedCountdown = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-[#080B14] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#8B5CF6]/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-[#22D3EE]/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md space-y-5 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#22D3EE] p-0.5 shadow-xl shadow-[#8B5CF6]/30">
              <div className="w-full h-full bg-[#080B14] rounded-[10px] flex items-center justify-center">
                <Eye className="w-5 h-5 text-[#22D3EE]" />
              </div>
            </div>
            <span className="font-bold text-xl tracking-wider text-white">
              VISION<span className="text-[#8B5CF6]">AI</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-[#8B5CF6]/20 text-[#D0BCFF] border border-[#8B5CF6]/30 rounded-full font-mono font-semibold">
              PRO
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-5">
          {/* Demo Mode Badge */}
          {isDemo && (
            <div className="flex items-center justify-center gap-1.5 py-1 px-3 bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 rounded-full text-[11px] font-medium text-[#D0BCFF] mx-auto w-fit">
              <Sparkles className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>DEMO MODE • Email OTP Simulation</span>
            </div>
          )}

          {success ? (
            /* Success State */
            <div className="text-center space-y-5 py-3 animate-in fade-in duration-500">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">
                  {isDemo ? 'Account Verified for Demo ✓' : 'Account Verified ✓'}
                </h2>
                <p className="text-xs text-[#94A3B8] leading-relaxed max-w-xs mx-auto">
                  {isDemo
                    ? 'Demo verification completed successfully. Welcome to your VISIONAI workspace.'
                    : 'Your VISIONAI account has been successfully created and authenticated.'}
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleContinueToApp}
                  disabled={loading}
                  className="w-full btn-primary py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#8B5CF6]/30 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Continue to VISIONAI</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : needsPasswordPrompt ? (
            /* Graceful Password Prompt Fallback */
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 mb-2">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Email Verified Successfully ✓
                </h2>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Enter your password once to complete sign-in and open your workspace.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-400 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleManualPasswordSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#94A3B8]">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showManualPassword ? 'text' : 'password'}
                      required
                      autoFocus
                      value={manualPassword}
                      onChange={(e) => setManualPassword(e.target.value)}
                      placeholder="Enter your account password"
                      className="w-full bg-[#080B14] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white focus:border-[#8B5CF6] focus:outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowManualPassword(!showManualPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white transition"
                    >
                      {showManualPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !manualPassword.trim()}
                  className="w-full btn-primary py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#8B5CF6]/30 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Continue to VISIONAI</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* OTP Form */
            <div className="space-y-5">
              <div className="text-center space-y-1.5">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Verify Your {typeParam === 'phone' ? 'Mobile Number' : 'Email'}
                </h2>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  {isDemo
                    ? 'Email delivery is simulated for this hackathon demo.'
                    : `We've sent a 6-digit verification code to`}
                </p>
                {!isDemo && (
                  <div className="inline-block px-3 py-1 bg-white/[0.04] border border-white/10 rounded-full font-mono text-xs text-[#22D3EE]">
                    {maskTarget(targetParam, typeParam)}
                  </div>
                )}
              </div>

              {/* Polished Demo OTP Display Box */}
              {isDemo && demoOtp && (
                <div className="p-4 rounded-xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/15 text-center space-y-2 shadow-inner">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#94A3B8]">
                    Your Demo OTP
                  </span>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl sm:text-3xl font-mono font-extrabold tracking-wider bg-gradient-to-r from-white via-[#22D3EE] to-[#8B5CF6] bg-clip-text text-transparent">
                      {demoOtp}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyOtp}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-xs text-white inline-flex items-center gap-1.5 transition active:scale-95"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#22D3EE]" />}
                      <span className="text-[11px] font-medium">{copied ? 'Copied!' : 'Copy OTP'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-[#64748B]">
                    This code is displayed because live email delivery is disabled for the demo.
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-400 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {infoMessage && (
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-start gap-2.5 text-xs text-[#22D3EE] animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{infoMessage}</span>
                </div>
              )}

              <form onSubmit={handleManualSubmit} className="space-y-5">
                {/* 6 Digit Input Group */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] px-1 text-[#94A3B8]">
                    <span>Enter 6-digit code</span>
                    <span className="font-mono text-[#22D3EE]">
                      Expires in {formattedCountdown}
                    </span>
                  </div>
                  <div className="flex justify-center items-center gap-1.5 sm:gap-2.5">
                    {digits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        disabled={loading}
                        className={`w-9 sm:w-11 md:w-12 h-12 sm:h-14 text-center text-base sm:text-xl font-bold font-mono rounded-xl bg-[#080B14] border transition-all duration-200 focus:outline-none ${
                          digit
                            ? 'border-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/20 bg-[#8B5CF6]/5'
                            : 'border-white/10 text-white focus:border-[#22D3EE] focus:ring-1 focus:ring-[#22D3EE]/50'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || digits.some((d) => !d)}
                  className="w-full btn-primary py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#8B5CF6]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Resend Footer */}
              <div className="pt-2 border-t border-white/[0.08] flex flex-col items-center gap-2 text-xs text-[#94A3B8]">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-[#8B5CF6] hover:text-[#D0BCFF] font-medium hover:underline inline-flex items-center gap-1.5 transition"
                >
                  {resending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>{isDemo ? 'Resend Demo OTP' : 'Resend Code'}</span>
                </button>

                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1 text-[#64748B] hover:text-[#94A3B8] transition pt-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Change {typeParam === 'phone' ? 'mobile number' : 'email address'}</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080B14] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
