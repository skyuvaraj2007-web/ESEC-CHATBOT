'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { api } from '@/lib/api';
import { useRouter, usePathname } from 'next/navigation';

export const isDemoOtpMode = process.env.NEXT_PUBLIC_DEMO_OTP_MODE === 'true';

export interface UserProfileData {
  id: string;
  email?: string;
  phone?: string;
  full_name?: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfileData | null;
  isLoading: boolean;
  isDemoOtpMode: boolean;
  signInWithCredentials: (identifier: string, password: string) => Promise<{ session?: Session | null; error: Error | null }>;
  signUpWithEmail: (email: string, password: string, fullName: string, phone?: string) => Promise<{ data?: any; error: Error | null }>;
  signUpWithPhone: (phone: string, password: string, fullName: string, email?: string) => Promise<{ data?: any; error: Error | null }>;
  verifyOtp: (params: {
    target: string;
    token: string;
    type: 'email' | 'phone';
    password?: string;
    isDemo?: boolean;
  }) => Promise<{ session?: Session | null; error: Error | null; needsPassword?: boolean }>;
  resendOtp: (params: { target: string; type: 'email' | 'phone'; isDemo?: boolean }) => Promise<{ error: Error | null }>;
  sendPasswordResetEmail: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isDemoOtpMode: true,
  signInWithCredentials: async () => ({ session: null, error: null }),
  signUpWithEmail: async () => ({ error: null }),
  signUpWithPhone: async () => ({ error: null }),
  verifyOtp: async () => ({ session: null, error: null }),
  resendOtp: async () => ({ error: null }),
  sendPasswordResetEmail: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const syncProfile = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (data && !error) {
        setProfile({
          id: data.id,
          email: currentUser.email,
          phone: currentUser.phone,
          full_name: data.full_name || currentUser.user_metadata?.full_name,
          avatar_url: data.avatar_url || currentUser.user_metadata?.avatar_url,
        });
      } else {
        const fullName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User';
        const avatarUrl = currentUser.user_metadata?.avatar_url || null;

        await supabase.from('profiles').upsert({
          id: currentUser.id,
          full_name: fullName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        });

        setProfile({
          id: currentUser.id,
          email: currentUser.email,
          phone: currentUser.phone,
          full_name: fullName,
          avatar_url: avatarUrl || undefined,
        });
      }
    } catch (err) {
      setProfile({
        id: currentUser.id,
        email: currentUser.email,
        phone: currentUser.phone,
        full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
      });
    }
  };

  useEffect(() => {
    let mounted = true;

    // Supabase initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        syncProfile(session.user);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        await syncProfile(session.user);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Protected route guard: only redirects unauthenticated users when accessing protected /app routes
  useEffect(() => {
    if (isLoading) return;

    const isProtectedRoute = pathname.startsWith('/app');

    if (!user && isProtectedRoute) {
      router.replace('/login');
    }
  }, [user, isLoading, pathname, router]);

  const refreshProfile = async () => {
    if (user) {
      await syncProfile(user);
    }
  };

  const signInWithCredentials = async (identifier: string, password: string) => {
    const trimmed = identifier.trim();
    const isPhone = trimmed.startsWith('+') || (/^\d+$/.test(trimmed) && trimmed.length >= 10);

    let res;
    if (isPhone) {
      const normalizedPhone = trimmed.startsWith('+') ? trimmed : `+91${trimmed}`;
      res = await supabase.auth.signInWithPassword({
        phone: normalizedPhone,
        password,
      });
    } else {
      res = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
    }

    if (res.error) {
      return { session: null, error: res.error };
    }

    if (res.data.user && res.data.session) {
      setUser(res.data.user);
      setSession(res.data.session);
      await syncProfile(res.data.user);
      return { session: res.data.session, error: null };
    }

    return { session: null, error: new Error('Login session could not be established.') };
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string, phone?: string) => {
    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();

    // 1. In Demo OTP Mode, generate Demo OTP and pre-register confirmed user in Supabase via Backend Admin
    if (isDemoOtpMode) {
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('visionai_pending_signup_pass', password);
          sessionStorage.setItem('visionai_pending_signup_name', trimmedName);
        }
        await api.generateDemoOtp({
          email: trimmedEmail,
          password,
          fullName: trimmedName,
          phone: phone ? phone.trim() : undefined,
        });
        return { data: { user: null }, error: null };
      } catch (e: any) {
        console.error('Demo OTP generation notice:', e);
      }
    }

    // 2. Standard Real Supabase SignUp Flow
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: trimmedName,
          phone: phone ? phone.trim() : undefined,
        },
      },
    });

    return { data, error };
  };

  const signUpWithPhone = async (phone: string, password: string, fullName: string, email?: string) => {
    let normalizedPhone = phone.trim();
    if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = `+91${normalizedPhone}`;
    }

    const { data, error } = await supabase.auth.signUp({
      phone: normalizedPhone,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          email: email ? email.trim() : undefined,
        },
      },
    });

    return { data, error };
  };

  const verifyOtp = async ({
    target,
    token,
    type,
    password: manualPass,
    isDemo = isDemoOtpMode,
  }: {
    target: string;
    token: string;
    type: 'email' | 'phone';
    password?: string;
    isDemo?: boolean;
  }) => {
    const cleanToken = token.trim();
    const cleanTarget = target.trim();

    // Handle Demo OTP Mode -> Authenticate real Supabase session on success
    if (isDemo && type === 'email') {
      try {
        const res = await api.verifyDemoOtp(cleanTarget, cleanToken);
        if (res.verified) {
          const storedPass = manualPass || (typeof window !== 'undefined'
            ? sessionStorage.getItem('visionai_pending_signup_pass')
            : null) || res.password;

          if (!storedPass) {
            return {
              session: null,
              error: null,
              needsPassword: true,
            };
          }

          // Authenticate via Supabase Auth
          const signInRes = await supabase.auth.signInWithPassword({
            email: cleanTarget,
            password: storedPass,
          });

          if (signInRes.error) {
            return {
              session: null,
              error: new Error(`Sign in failed: ${signInRes.error.message}`),
            };
          }

          if (signInRes.data?.session?.user) {
            setSession(signInRes.data.session);
            setUser(signInRes.data.session.user);
            await syncProfile(signInRes.data.session.user);
            setIsLoading(false);
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('visionai_pending_signup_pass');
              sessionStorage.removeItem('visionai_pending_signup_name');
            }
            return { session: signInRes.data.session, error: null };
          }

          // Double-check session from client
          const { data: { session: activeSession } } = await supabase.auth.getSession();
          if (activeSession?.user) {
            setSession(activeSession);
            setUser(activeSession.user);
            await syncProfile(activeSession.user);
            setIsLoading(false);
            return { session: activeSession, error: null };
          }

          return {
            session: null,
            error: new Error('Verification succeeded, but active login session could not be established.'),
          };
        }
      } catch (err: any) {
        return { session: null, error: new Error(err.message || 'Invalid verification code') };
      }
    }

    // Real Supabase verification flow
    let res;
    if (type === 'phone') {
      let normalizedPhone = cleanTarget;
      if (!normalizedPhone.startsWith('+')) {
        normalizedPhone = `+91${normalizedPhone}`;
      }
      res = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token: cleanToken,
        type: 'sms',
      });
    } else {
      res = await supabase.auth.verifyOtp({
        email: cleanTarget,
        token: cleanToken,
        type: 'signup',
      });

      if (res.error && res.error.message.toLowerCase().includes('type')) {
        res = await supabase.auth.verifyOtp({
          email: cleanTarget,
          token: cleanToken,
          type: 'email',
        });
      }
    }

    if (res.error) {
      return { session: null, error: res.error };
    }

    if (res.data?.session?.user) {
      setUser(res.data.session.user);
      setSession(res.data.session);
      await syncProfile(res.data.session.user);
    }

    return { session: res.data?.session || null, error: null };
  };

  const resendOtp = async ({
    target,
    type,
    isDemo = isDemoOtpMode,
  }: {
    target: string;
    type: 'email' | 'phone';
    isDemo?: boolean;
  }) => {
    if (isDemo && type === 'email') {
      try {
        const storedPass = typeof window !== 'undefined'
          ? sessionStorage.getItem('visionai_pending_signup_pass') || undefined
          : undefined;
        const storedName = typeof window !== 'undefined'
          ? sessionStorage.getItem('visionai_pending_signup_name') || undefined
          : undefined;

        await api.resendDemoOtp({
          email: target.trim(),
          password: storedPass,
          fullName: storedName,
        });
        return { error: null };
      } catch (err: any) {
        return { error: new Error(err.message || 'Failed to resend demo code') };
      }
    }

    if (type === 'phone') {
      let normalizedPhone = target.trim();
      if (!normalizedPhone.startsWith('+')) {
        normalizedPhone = `+91${normalizedPhone}`;
      }
      const { error } = await supabase.auth.resend({
        type: 'sms',
        phone: normalizedPhone,
      });
      return { error };
    } else {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: target.trim(),
      });
      return { error };
    }
  };

  const sendPasswordResetEmail = async (email: string) => {
    const redirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/reset-password`
      : 'http://localhost:3000/reset-password';

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  };

  const signOut = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('visionai_pending_signup_pass');
      sessionStorage.removeItem('visionai_pending_signup_name');
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isDemoOtpMode,
        signInWithCredentials,
        signUpWithEmail,
        signUpWithPhone,
        verifyOtp,
        resendOtp,
        sendPasswordResetEmail,
        updatePassword,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
