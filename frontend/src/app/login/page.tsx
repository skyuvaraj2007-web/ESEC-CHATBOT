'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { signInWithCredentials } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUnconfirmedEmail(null);

    const trimmed = identifier.trim();
    if (!trimmed) {
      setError('Please enter your email address or mobile number.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const { session, error: authErr } = await signInWithCredentials(trimmed, password);
      if (authErr) {
        const msg = authErr.message.toLowerCase();
        if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
          setError('Incorrect email/phone or password. Please check and try again.');
        } else if (msg.includes('email not confirmed') || msg.includes('unconfirmed')) {
          setError('Your email is not verified yet.');
          setUnconfirmedEmail(trimmed);
        } else if (msg.includes('rate limit') || msg.includes('too many requests')) {
          setError('Too many failed attempts. Please wait a moment before trying again.');
        } else if (msg.includes('user not found')) {
          setError('No account found with these credentials. Please check or sign up.');
        } else {
          setError(authErr.message || 'Failed to sign in. Please verify your credentials.');
        }
        return;
      }

      if (session?.user) {
        router.replace('/app');
      } else {
        const { data: { session: activeSession } } = await supabase.auth.getSession();
        if (activeSession?.user) {
          router.replace('/app');
        } else {
          setError('Invalid email or password.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect. Please check your network and try again.');
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
          <h1 className="text-2xl font-bold text-white tracking-tight pt-2">Welcome Back</h1>
          <p className="text-xs sm:text-sm text-[#94A3B8]">
            Sign in to access your conversational visual workspace
          </p>
        </div>

        {/* Login Form Card */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col gap-2 text-xs text-red-400 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {unconfirmedEmail && (
                <div className="pl-6 pt-1">
                  <Link
                    href={`/verify?type=email&target=${encodeURIComponent(unconfirmedEmail)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#D0BCFF] hover:bg-[#8B5CF6]/30 transition font-medium"
                  >
                    <span>Enter verification code now</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email / Mobile Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#94A3B8]">Email Address or Mobile</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="alex.rivera@visionai.io or +91..."
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#8B5CF6] transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#94A3B8]">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#8B5CF6] hover:text-[#D0BCFF] hover:underline transition"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#8B5CF6] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#8B5CF6]/30 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Sign Up Footer */}
          <div className="text-center pt-2 border-t border-white/[0.08]">
            <p className="text-xs text-[#94A3B8]">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-[#22D3EE] hover:text-[#67E8F9] font-semibold hover:underline transition">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
