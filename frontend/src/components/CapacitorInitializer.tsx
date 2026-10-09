'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { WifiOff, RefreshCw } from 'lucide-react';
import { initCapacitorBridge, subscribeToNetworkStatus } from '@/lib/capacitor';

export const CapacitorInitializer: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Initialize native bridge & hardware back button handling
    initCapacitorBridge(() => {
      // Return true if custom back handled, false to allow default
      if (pathname === '/app' || pathname === '/') {
        return false;
      }
      return false;
    });

    // Network status listener
    const unsubscribe = subscribeToNetworkStatus((status) => {
      setIsOffline(!status.connected);
    });

    return () => {
      unsubscribe();
    };
  }, [router, pathname]);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 pointer-events-auto">
      <div className="mx-auto max-w-md bg-[#101522]/95 border border-red-500/30 text-white rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
            <WifiOff className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-red-200">No Internet Connection</h4>
            <p className="text-[11px] text-[#94A3B8]">VISIONAI requires internet to reach visual intelligence models.</p>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          aria-label="Retry connection"
          className="px-3 py-2 min-h-[38px] rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-white border border-white/10 flex items-center gap-1.5 transition active:scale-95 shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    </div>
  );
};
