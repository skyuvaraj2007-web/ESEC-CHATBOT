'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Eye,
  Mail,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const { sendPasswordResetEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const { error: resetErr } = await sendPasswordResetEmail(trimmed);
      if (resetErr) {
        setError(resetErr.message || 'Failed to send recovery email. Please try again.');
      } else {
        setSubmitted(true);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080B14] flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-[#8B5CF6]/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-[#22D3EE]/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#22D3EE] p-0.5 shadow-xl shadow-[#8B5CF6]/30 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#080B14] rounded-[10px] flex items-center justify-center">
                <Eye className="w-5 h-5 text-[#22D3EE]" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-2xl tracking-wider text-white">
                VISION<span className="text-[#8B5CF6]">AI</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-[#8B5CF6]/20 text-[#D0BCFF] border border-[#8B5CF6]/30 rounded-full font-mono font-semibold">
                PRO
              </span>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-5">
          {submitted ? (
            /* Success State */
            <div className="text-center space-y-5 py-3 animate-in fade-in duration-500">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#8B5CF6]/20 to-[#22D3EE]/20 border border-[#8B5CF6]/30 flex items-center justify-center mx-auto text-[#22D3EE] shadow-xl shadow-[#8B5CF6]/20">
                <CheckCircle2 className="w-8 h-8 text-[#22D3EE]" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">Check your email</h2>
                <p className="text-xs text-[#94A3B8] leading-relaxed max-w-xs mx-auto">
                  We&apos;ve sent a password recovery link to{' '}
                  <span className="text-white font-medium">{email}</span>. Click the link to set a new password.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/login"
                  className="w-full btn-secondary py-3 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Form State */
            <div className="space-y-5">
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center mx-auto text-[#8B5CF6] mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h1 className="text-xl font-bold text-white">Reset your password</h1>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Enter your registered email address and we&apos;ll send you a password recovery link.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-400 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#94A3B8]">Registered Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex.rivera@visionai.io"
                      className="w-full bg-[#080B14] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#8B5CF6] transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#8B5CF6]/30 mt-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send Recovery Link</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center pt-2 border-t border-white/[0.08]">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-white transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
