'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { User as UserIcon, Mail, Shield, Save, Check, LogOut, Loader2, AlertCircle } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    setFullName(user.user_metadata?.full_name || user.email?.split('@')[0] || '');
    setEmail(user.email || '');
  }, [user, authLoading, router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.updateProfile({ full_name: fullName });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      if (err.message === 'AUTH_REQUIRED') {
        router.replace('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Profile update failed.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex-1 bg-[#080B14] flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="flex flex-col items-center gap-3 text-[#22D3EE]">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Loading user profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#080B14] p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="max-w-3xl mx-auto space-y-1">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#22D3EE]">
          <UserIcon className="w-4 h-4" />
          <span>ACCOUNT & IDENTITY</span>
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">User Profile</h1>
        <p className="text-xs text-[#94A3B8]">Manage your visual intelligence workspace profile and identity</p>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="glass-panel rounded-2xl p-5 sm:p-8 border border-white/10 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-6 border-b border-white/10">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#8B5CF6] to-[#22D3EE] flex items-center justify-center text-xl font-bold text-white shadow-xl shadow-[#8B5CF6]/20 shrink-0">
              {fullName ? fullName[0].toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">{fullName || 'VisionAI User'}</h2>
              <p className="text-xs text-[#94A3B8] font-mono break-all">{email}</p>
              <div className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30 text-[10px] font-medium">
                <Shield className="w-3 h-3" />
                <span>Supabase Authenticated</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Edit Form */}
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#94A3B8]">Display Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#051424] border border-white/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#8B5CF6] min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#94A3B8]">Email (Primary Identifier)</label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full bg-[#051424]/50 border border-white/5 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#64748B] cursor-not-allowed min-h-[44px]"
              />
            </div>

            <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => signOut()}
                className="px-4 py-2.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>

              <div className="flex items-center justify-end gap-3">
                {saved && (
                  <span className="text-xs text-[#34D399] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Profile Updated</span>
                  </span>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto btn-primary px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 min-h-[44px]"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Profile</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
