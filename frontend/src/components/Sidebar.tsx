'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Plus,
  MessageSquare,
  History,
  BarChart3,
  Settings,
  User,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import { ConversationModel } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  activeConversationId?: string;
  onSelectConversation?: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeConversationId,
  onSelectConversation,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<ConversationModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadConversations = async () => {
    if (!user || authLoading) return;
    try {
      setLoading(true);
      const list = await api.getConversations();
      setConversations(list || []);
    } catch (e: any) {
      if (e.message?.includes('session has expired') || e.message?.includes('401') || e.message === 'AUTH_REQUIRED') {
        console.warn('[Sidebar] User session not active, skipping conversation fetch.');
      } else {
        console.error('Failed to load conversations:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadConversations();
    }
  }, [pathname, activeConversationId, authLoading, user]);

  const handleNewChat = async () => {
    try {
      const newConv = await api.createConversation('New Visual Chat');
      if (onSelectConversation) {
        onSelectConversation(newConv.id);
      }
      router.push(`/app/chat/${newConv.id}`);
      if (onClose) onClose();
    } catch (e) {
      router.push('/app');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this visual conversation?')) return;

    try {
      setDeletingId(id);
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        router.push('/app');
      }
    } catch (err) {
      alert('Failed to delete conversation');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-72 sm:w-80 lg:w-64 bg-[#080B14] border-r border-white/[0.08] flex flex-col transition-transform duration-300 ease-in-out pb-safe ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header with Close button */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06] lg:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white">VISION<span className="text-[#8B5CF6]">AI</span></span>
            <span className="text-[9px] px-1.5 py-0.5 bg-[#8B5CF6]/20 text-[#D0BCFF] rounded font-mono">MENU</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#94A3B8] hover:text-white rounded-lg hover:bg-white/[0.06] min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Close Navigation"
          >
            <span className="text-lg leading-none">✕</span>
          </button>
        </div>

        {/* New Chat Action */}
        <div className="p-3 sm:p-4">
          <button
            onClick={handleNewChat}
            className="w-full btn-primary py-3 lg:py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold shadow-lg shadow-[#8B5CF6]/25 group min-h-[44px]"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" />
            <span>New Visual Chat</span>
          </button>
        </div>

        {/* Primary Navigation */}
        <div className="px-3 py-2 space-y-1">
          <Link
            href="/app"
            onClick={onClose}
            className={`flex items-center gap-3 px-3.5 py-2.5 lg:py-2 rounded-xl text-xs font-medium transition min-h-[44px] lg:min-h-[36px] ${
              pathname === '/app' && !activeConversationId
                ? 'bg-white/[0.08] text-white'
                : 'text-[#94A3B8] hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-[#8B5CF6]" />
            <span>Active Workspace</span>
          </Link>

          <Link
            href="/app/history"
            onClick={onClose}
            className={`flex items-center gap-3 px-3.5 py-2.5 lg:py-2 rounded-xl text-xs font-medium transition min-h-[44px] lg:min-h-[36px] ${
              pathname === '/app/history'
                ? 'bg-white/[0.08] text-white'
                : 'text-[#94A3B8] hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            <History className="w-4 h-4 text-[#22D3EE]" />
            <span>Chat History</span>
          </Link>

          <Link
            href="/app/insights"
            onClick={onClose}
            className={`flex items-center gap-3 px-3.5 py-2.5 lg:py-2 rounded-xl text-xs font-medium transition min-h-[44px] lg:min-h-[36px] ${
              pathname === '/app/insights'
                ? 'bg-white/[0.08] text-white'
                : 'text-[#94A3B8] hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-[#34D399]" />
            <span>Visual Insights</span>
          </Link>
        </div>

        <div className="px-4 py-2 flex items-center justify-between text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
          <span>Recent Sessions</span>
          {loading && <Loader2 className="w-3 h-3 animate-spin text-[#8B5CF6]" />}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {conversations.length === 0 && !loading ? (
            <div className="p-4 text-center text-xs text-[#64748B]">
              No conversations yet. Start a new visual chat.
            </div>
          ) : (
            conversations.map((c) => {
              const isActive = activeConversationId === c.id || pathname === `/app/chat/${c.id}`;
              return (
                <div
                  key={c.id}
                  className={`group relative flex items-center justify-between px-3 py-2 rounded-lg text-xs transition cursor-pointer ${
                    isActive
                      ? 'bg-[#8B5CF6]/15 text-[#D0BCFF] border border-[#8B5CF6]/30 font-medium'
                      : 'text-[#94A3B8] hover:bg-white/[0.04] hover:text-[#F8FAFC]'
                  }`}
                  onClick={() => {
                    if (onSelectConversation) onSelectConversation(c.id);
                    router.push(`/app/chat/${c.id}`);
                    if (onClose) onClose();
                  }}
                >
                  <div className="flex items-center gap-2.5 truncate pr-6">
                    <ImageIcon className="w-3.5 h-3.5 text-[#22D3EE] shrink-0" />
                    <span className="truncate">{c.title || 'Visual Chat'}</span>
                  </div>

                  <button
                    onClick={(e) => handleDelete(e, c.id)}
                    disabled={deletingId === c.id}
                    title="Delete Chat"
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#64748B] hover:text-red-400 rounded transition absolute right-2"
                  >
                    {deletingId === c.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Section */}
        <div className="p-3 border-t border-white/[0.08] space-y-1">
          <Link
            href="/app/settings"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              pathname === '/app/settings'
                ? 'bg-white/[0.08] text-white'
                : 'text-[#94A3B8] hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 text-[#94A3B8]" />
            <span>Settings</span>
          </Link>

          <Link
            href="/app/profile"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              pathname === '/app/profile'
                ? 'bg-white/[0.08] text-white'
                : 'text-[#94A3B8] hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            <User className="w-4 h-4 text-[#94A3B8]" />
            <span>Profile</span>
          </Link>
        </div>
      </aside>
    </>
  );
};
