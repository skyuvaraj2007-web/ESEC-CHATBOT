'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { ConversationModel } from '@/types';
import { History, MessageSquare, Image as ImageIcon, Trash2, Search, ArrowRight, Loader2, Calendar, AlertCircle } from 'lucide-react';

export default function HistoryPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<ConversationModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    let cancelled = false;

    async function loadHistory() {
      try {
        setLoading(true);
        setError(null);
        const list = await api.getConversations();
        if (!cancelled) {
          setConversations(list || []);
        }
      } catch (err: any) {
        if (!cancelled) {
          if (err instanceof Error && err.message === 'AUTH_REQUIRED') {
            router.replace('/login');
            return;
          }
          setError(err instanceof Error ? err.message : 'Failed to load conversation history.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, router]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation session?')) return;

    try {
      setDeletingId(id);
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) {
      if (e.message === 'AUTH_REQUIRED') {
        router.replace('/login');
      } else {
        alert('Failed to delete conversation');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = conversations.filter((c) =>
    (c.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="flex-1 bg-[#080B14] flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="flex flex-col items-center gap-3 text-[#22D3EE]">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Verifying workspace session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#080B14] p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#22D3EE]">
            <History className="w-4 h-4" />
            <span>SESSION ARCHIVE</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Conversation History</h1>
          <p className="text-xs text-[#94A3B8]">Browse and revisit previous visual intelligence dialogues</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-[#101522] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#22D3EE] min-h-[44px]"
          />
        </div>
      </div>

      {/* Grid of Conversations */}
      <div className="max-w-5xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#8B5CF6]">
            <Loader2 className="w-8 h-8 animate-spin" />
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
        ) : filtered.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 sm:p-12 text-center border border-white/10 space-y-4">
            <MessageSquare className="w-10 h-10 text-[#64748B] mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">No Conversations Found</h3>
              <p className="text-xs text-[#94A3B8]">
                {searchQuery ? 'No visual chats match your search query.' : 'Start your first visual chat to see history.'}
              </p>
            </div>
            <Link
              href="/app"
              className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold min-h-[44px]"
            >
              <span>Start New Visual Chat</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((conv) => (
              <div
                key={conv.id}
                onClick={() => router.push(`/app/chat/${conv.id}`)}
                className="glass-card rounded-2xl p-4 sm:p-5 border border-white/10 hover:border-[#8B5CF6]/50 transition cursor-pointer group flex flex-col justify-between space-y-4 shadow-lg hover:shadow-[#8B5CF6]/10"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[#8B5CF6] flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {conv.created_at ? new Date(conv.created_at).toLocaleDateString() : 'Recent'}
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, conv.id)}
                      disabled={deletingId === conv.id}
                      title="Delete Session"
                      className="text-[#64748B] hover:text-red-400 p-2 rounded-lg transition opacity-100 sm:opacity-0 sm:group-hover:opacity-100 min-w-[36px] min-h-[36px] flex items-center justify-center"
                    >
                      {deletingId === conv.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <h3 className="text-sm font-semibold text-white group-hover:text-[#D0BCFF] transition line-clamp-2">
                    {conv.title || 'Visual Chat'}
                  </h3>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-[#94A3B8]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-[#22D3EE]" />
                      <span>{conv.image_count || 0} images</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-[#8B5CF6]" />
                      <span>{conv.message_count || 0} messages</span>
                    </span>
                  </div>

                  <span className="text-xs text-[#22D3EE] font-medium flex items-center gap-1 group-hover:translate-x-1 transition">
                    Open <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
