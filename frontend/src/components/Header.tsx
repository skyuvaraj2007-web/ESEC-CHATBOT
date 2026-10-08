'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, Eye, ShieldCheck, User as UserIcon, LogOut, Layers } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar?: () => void;
  onToggleTelemetry?: () => void;
  showTelemetryToggle?: boolean;
  activeConversationTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onToggleTelemetry,
  showTelemetryToggle = true,
  activeConversationTitle,
}) => {
  const { user, signOut } = useAuth();

  return (
    <header className="h-16 border-b border-white/[0.08] bg-[#080B14]/90 backdrop-blur-xl px-3 sm:px-4 lg:px-6 flex items-center justify-between sticky top-0 z-40 shrink-0">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 text-[#94A3B8] hover:text-white rounded-xl hover:bg-white/[0.06] transition min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
            aria-label="Toggle Navigation Menu"
          >
            <Layers className="w-5 h-5" />
          </button>
        )}

        <Link href="/app" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#22D3EE] flex items-center justify-center p-0.5 shadow-lg shadow-[#8B5CF6]/20 group-hover:shadow-[#8B5CF6]/40 transition">
            <div className="w-full h-full bg-[#080B14] rounded-[10px] flex items-center justify-center">
              <Eye className="w-4 h-4 text-[#22D3EE]" />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-wider text-white">
              VISION<span className="text-[#8B5CF6]">AI</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.2 bg-[#8B5CF6]/20 text-[#D0BCFF] border border-[#8B5CF6]/30 rounded-full font-mono hidden xs:inline-block">
              PRO
            </span>
          </div>
        </Link>

        {activeConversationTitle && (
          <div className="hidden md:flex items-center gap-2 text-xs text-[#94A3B8] border-l border-white/10 pl-4 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse shrink-0"></span>
            <span className="max-w-[160px] lg:max-w-[240px] truncate font-medium text-white/90">
              {activeConversationTitle}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {showTelemetryToggle && onToggleTelemetry && (
          <button
            onClick={onToggleTelemetry}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-xl bg-white/[0.05] border border-white/10 hover:border-[#22D3EE]/40 hover:bg-[#22D3EE]/10 text-[#94A3B8] hover:text-[#22D3EE] transition min-h-[38px]"
            title="Toggle Visual Intelligence Telemetry"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span className="hidden sm:inline">Visual Telemetry</span>
            <span className="sm:hidden text-[11px]">Analysis</span>
          </button>
        )}

        {user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/app/profile"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] transition"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] flex items-center justify-center text-xs font-semibold text-white">
                {user.user_metadata?.full_name ? user.user_metadata.full_name[0].toUpperCase() : 'U'}
              </div>
              <span className="text-xs text-[#F8FAFC] hidden sm:inline max-w-[100px] truncate">
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </span>
            </Link>

            <button
              onClick={() => signOut()}
              title="Sign Out"
              className="p-2 text-[#94A3B8] hover:text-red-400 rounded-lg hover:bg-white/[0.06] transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-3.5 py-1.5 text-xs font-medium text-white/80 hover:text-white rounded-lg hover:bg-white/[0.06] transition"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="btn-primary px-3.5 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
