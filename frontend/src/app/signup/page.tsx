'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Smartphone,
} from 'lucide-react';
import {
  PasswordStrengthIndicator,
  checkPasswordRules,
} from '@/components/auth/PasswordStrengthIndicator';

export default function SignupPage() {
  const router = useRouter();
  const { signUpWithEmail, signUpWithPhone } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'mobile'>('email');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordRules = checkPasswordRules(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (verificationMethod === 'mobile') {
      const cleanPhone = phone.trim().replace(/[\s-]/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        setError('Enter a valid mobile number with country code (e.g. +91 9876543210).');
        return;
      }
    }

    if (!passwordRules.isValid) {
      setError('Password must meet all security requirements listed below.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setLoading(true);

    try {
      if (verificationMethod === 'email') {
        const { data, error: signUpErr } = await signUpWithEmail(email, password, fullName, phone || undefined);
        if (signUpErr) {
          const msg = signUpErr.message.toLowerCase();
          if (msg.includes('already registered') || msg.includes('user already exists')) {
            setError('An account already exists with this email. Try signing in instead.');
          } else {
            setError(signUpErr.message || 'Signup failed. Please try again.');
          }
          return;
        }

        // Navigate to OTP verification for email
        router.replace(`/verify?type=email&target=${encodeURIComponent(email.trim())}`);
      } else {
        // Mobile signup
        let normalizedPhone = phone.trim().replace(/[\s-]/g, '');
        if (!normalizedPhone.startsWith('+')) {
          normalizedPhone = `+91${normalizedPhone}`;
        }

        const { data, error: signUpErr } = await signUpWithPhone(normalizedPhone, password, fullName, email.trim() || undefined);
        if (signUpErr) {
          const msg = signUpErr.message.toLowerCase();
          if (
            msg.includes('sms provider') ||
            msg.includes('phone provider') ||
            msg.includes('unsupported') ||
            msg.includes('disabled') ||
            msg.includes('not configured') ||
            msg.includes('phone')
          ) {
            setError('Phone OTP requires an SMS provider to be configured in Supabase Auth.');
          } else if (msg.includes('already registered') || msg.includes('user already exists')) {
            setError('An account already exists with this phone number. Try signing in.');
          } else {
            setError(signUpErr.message || 'Phone verification signup failed.');
          }
          return;
        }

        // Navigate to OTP verification for phone
        router.replace(`/verify?type=phone&target=${encodeURIComponent(normalizedPhone)}`);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080B14] flex flex-col justify-center items-center px-4 py-10 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-[#8B5CF6]/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-[#22D3EE]/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="w-full max-w-lg space-y-6 relative z-10">
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
          <h1 className="text-2xl font-bold text-white tracking-tight pt-2">Create your account</h1>
          <p className="text-xs sm:text-sm text-[#94A3B8]">
            Start seeing, asking and understanding with VisionAI.
          </p>
        </div>

        {/* Signup Card */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-400 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#94A3B8]">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#8B5CF6] transition"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#94A3B8]">Email Address</label>
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

            {/* Mobile Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#94A3B8]">Mobile Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#8B5CF6] transition"
                />
              </div>
            </div>

            {/* Verification Preference Selection */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-medium text-[#94A3B8]">Preferred Verification Method</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setVerificationMethod('email')}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                    verificationMethod === 'email'
                      ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/20'
                      : 'bg-[#080B14] border-white/10 text-[#94A3B8] hover:border-white/20'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      verificationMethod === 'email'
                        ? 'border-[#8B5CF6] bg-[#8B5CF6]'
                        : 'border-[#64748B]'
                    }`}
                  >
                    {verificationMethod === 'email' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#8B5CF6]" />
                      Verify Email
                    </span>
                    <span className="text-[10px] text-[#94A3B8]">Email OTP code</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setVerificationMethod('mobile')}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                    verificationMethod === 'mobile'
                      ? 'bg-[#22D3EE]/15 border-[#22D3EE] text-white shadow-lg shadow-[#22D3EE]/20'
                      : 'bg-[#080B14] border-white/10 text-[#94A3B8] hover:border-white/20'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      verificationMethod === 'mobile'
                        ? 'border-[#22D3EE] bg-[#22D3EE]'
                        : 'border-[#64748B]'
                    }`}
                  >
                    {verificationMethod === 'mobile' && <div className="w-1.5 h-1.5 bg-[#080B14] rounded-full" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-[#22D3EE]" />
                      Verify Mobile
                    </span>
                    <span className="text-[10px] text-[#94A3B8]">SMS OTP code</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-medium text-[#94A3B8]">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create secure password"
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
              {password.length > 0 && <PasswordStrengthIndicator rules={passwordRules} />}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#94A3B8]">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#8B5CF6] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white transition"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] pt-0.5">
                  {passwordsMatch ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-amber-400">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#8B5CF6]/30 mt-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Sign In Footer */}
          <div className="text-center pt-2 border-t border-white/[0.08]">
            <p className="text-xs text-[#94A3B8]">
              Already have an account?{' '}
              <Link href="/login" className="text-[#8B5CF6] hover:text-[#D0BCFF] font-semibold hover:underline transition">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
