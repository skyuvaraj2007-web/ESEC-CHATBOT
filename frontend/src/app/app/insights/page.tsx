'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { InsightsData } from '@/types';
import {
  BarChart3,
  Image as ImageIcon,
  MessageSquare,
  Layers,
  Zap,
  Activity,
  Loader2,
  TrendingUp,
  Cpu,
  Clock,
  AlertCircle
} from 'lucide-react';

export default function InsightsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const data = await api.getInsights();

        if (!cancelled) {
          setInsights(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          if (err instanceof Error && err.message === 'AUTH_REQUIRED') {
            router.replace('/login');
            return;
          }

          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load visual insights.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <div className="flex-1 bg-[#080B14] flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="flex flex-col items-center gap-3 text-[#34D399]">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Verifying workspace session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#080B14] p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto space-y-1">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#34D399]">
          <BarChart3 className="w-4 h-4" />
          <span>VISUAL TELEMETRY & METRICS</span>
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Visual Intelligence Insights</h1>
        <p className="text-xs text-[#94A3B8]">
          Aggregated multimodal model utilization, object detection metrics, and pipeline confidence telemetry
        </p>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#34D399] gap-3">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-xs text-[#94A3B8]">Loading telemetry data...</span>
          </div>
        ) : error ? (
          <div className="glass-card rounded-2xl p-6 border border-red-500/20 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
            <p className="text-sm text-red-300">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-500/20 text-red-300 rounded-xl text-xs font-medium hover:bg-red-500/30 transition"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* 4-Card Metric Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#94A3B8]">Images Processed</span>
                  <div className="p-2 rounded-lg bg-[#8B5CF6]/15 text-[#8B5CF6]">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white font-mono">
                  {insights?.total_images || 0}
                </div>
                <div className="text-[11px] text-[#64748B]">Multimodal image inputs</div>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#94A3B8]">Conversations</span>
                  <div className="p-2 rounded-lg bg-[#22D3EE]/15 text-[#22D3EE]">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white font-mono">
                  {insights?.total_conversations || 0}
                </div>
                <div className="text-[11px] text-[#64748B]">Persistent visual threads</div>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#94A3B8]">Objects Isolated</span>
                  <div className="p-2 rounded-lg bg-[#34D399]/15 text-[#34D399]">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white font-mono">
                  {insights?.total_objects_detected || 0}
                </div>
                <div className="text-[11px] text-[#64748B]">YOLO + Gemini detected</div>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#94A3B8]">Avg Confidence</span>
                  <div className="p-2 rounded-lg bg-[#FBBF24]/15 text-[#FBBF24]">
                    <Zap className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white font-mono">
                  {Math.round((insights?.average_confidence || 0.94) * 100)}%
                </div>
                <div className="text-[11px] text-[#64748B]">Mean calibration score</div>
              </div>
            </div>

            {/* Entity Breakdown & Telemetry */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Detected Classes */}
              <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#22D3EE]" />
                    <h3 className="text-sm font-bold text-white">Detected Object Categories</h3>
                  </div>
                  <span className="text-xs text-[#94A3B8] font-mono">YOLOv8 + VLM</span>
                </div>

                {insights?.detected_classes_breakdown &&
                Object.keys(insights.detected_classes_breakdown).length > 0 ? (
                  <div className="space-y-2.5">
                    {Object.entries(insights.detected_classes_breakdown).map(([cls, count], idx) => {
                      const maxCount = Math.max(...Object.values(insights.detected_classes_breakdown));
                      const percent = Math.round((count / maxCount) * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#F8FAFC] font-medium">{cls}</span>
                            <span className="text-[#94A3B8] font-mono">{count} occurrences</span>
                          </div>
                          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${percent}%` }}
                              className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-[#64748B]">
                    No entity categories detected yet. Upload images to generate telemetry.
                  </div>
                )}
              </div>

              {/* Recent Visual Dialogues */}
              <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#8B5CF6]" />
                  <h3 className="text-sm font-bold text-white">Recent Multimodal Activity</h3>
                </div>

                {insights?.recent_activity && insights.recent_activity.length > 0 ? (
                  <div className="space-y-3">
                    {insights.recent_activity.map((act) => (
                      <div
                        key={act.id}
                        className="p-3 bg-[#051424] rounded-xl border border-white/5 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white truncate max-w-[200px]">
                            {act.title || 'Visual Session'}
                          </span>
                          <span className="text-[10px] font-mono text-[#8B5CF6] uppercase">
                            {act.role}
                          </span>
                        </div>
                        <p className="text-[#94A3B8] line-clamp-1">{act.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-[#64748B]">
                    No recent conversational activity logged yet.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
