'use client';

import React, { useRef, useEffect } from 'react';
import { MessageModel, ImageModel, SelectedRegion, SelectedObjectContext } from '@/types';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Sparkles, Eye, Zap, Layers, Cpu, HelpCircle } from 'lucide-react';

interface ChatWindowProps {
  messages: MessageModel[];
  activeImage?: ImageModel | null;
  isLoading: boolean;
  loadingStatus?: string;
  onSendMessage: (
    text: string,
    imageFile?: File | Blob,
    imagePreview?: string,
    inputMode?: 'text' | 'voice',
    language?: string
  ) => Promise<void>;
  onSelectImage?: (image: ImageModel) => void;
  onUploadClick?: () => void;
  onRetry?: (text: string) => void;
  onSpeak?: (text: string, language?: string) => void;
  speakingMessageId?: string | null;
  isSpeaking?: boolean;
  onStopSpeaking?: () => void;
  isVoiceMode?: boolean;
  onToggleVoiceMode?: () => void;
  onSelectSuggestedQuestion?: (question: string) => void;
  selectedRegion?: SelectedRegion | null;
  selectedObject?: SelectedObjectContext | null;
  onSelectRegion?: (region: SelectedRegion, object?: SelectedObjectContext) => void;
  onClearRegion?: () => void;
  onActionClick?: (actionType: string, defaultQuery: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  activeImage,
  isLoading,
  loadingStatus = 'VisionAI is thinking...',
  onSendMessage,
  onSelectImage,
  onRetry,
  onSpeak,
  speakingMessageId,
  isSpeaking = false,
  onStopSpeaking,
  isVoiceMode = false,
  onToggleVoiceMode,
  onSelectSuggestedQuestion,
  selectedRegion,
  selectedObject,
  onSelectRegion,
  onClearRegion,
  onActionClick,
}) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [activeAudioMessageId, setActiveAudioMessageId] = React.useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080B14] relative overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 space-y-6">
        {messages.length === 0 ? (
          /* Empty State / Welcome Screen */
          <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-8 py-12">
            <div className="relative">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#8B5CF6] via-[#22D3EE] to-[#34D399] p-0.5 shadow-2xl shadow-[#8B5CF6]/30 animate-pulse-subtle">
                <div className="w-full h-full bg-[#080B14] rounded-[22px] flex items-center justify-center">
                  <Eye className="w-8 h-8 text-[#22D3EE]" />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#8B5CF6] border-2 border-[#080B14]">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                See. Ask. Understand.
              </h1>
              <p className="text-xs sm:text-sm text-[#94A3B8] max-w-md mx-auto leading-relaxed">
                Upload an image. VISIONAI automatically understands and describes it without requiring a question. Then explore anything you see through text, voice, or Tanglish.
              </p>
            </div>

            {/* Quick Architecture Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left">
              <div className="glass-card rounded-xl p-4 border border-white/10 hover:border-[#8B5CF6]/50 transition space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/15 flex items-center justify-center text-[#8B5CF6]">
                  <Cpu className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-white">Primary Gemini Multimodal</h3>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Automatic visual overview, scene reasoning, and conversational Q&A.
                </p>
              </div>

              <div className="glass-card rounded-xl p-4 border border-white/10 hover:border-[#22D3EE]/50 transition space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#22D3EE]/15 flex items-center justify-center text-[#22D3EE]">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-white">On-Demand YOLO</h3>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Specialized spatial localization, bounding boxes, and object counting.
                </p>
              </div>

              <div className="glass-card rounded-xl p-4 border border-white/10 hover:border-[#34D399]/50 transition space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#34D399]/15 flex items-center justify-center text-[#34D399]">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-white">On-Demand OCR</h3>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Verbatim optical character extraction for dense documents & forms.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Active Chat Stream */
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onSelectImage={onSelectImage}
                onRetry={onRetry}
                onSpeak={(text, lang) => onSpeak && onSpeak(text, lang)}
                isSpeakingThis={speakingMessageId === msg.id}
                onStopSpeaking={onStopSpeaking}
                activePlayingId={activeAudioMessageId}
                onPlayStart={(id) => setActiveAudioMessageId(id)}
                onPlayEnd={() => setActiveAudioMessageId(null)}
                onSelectSuggestedQuestion={onSelectSuggestedQuestion}
                selectedRegion={selectedRegion}
                selectedObject={selectedObject}
                onSelectRegion={onSelectRegion}
                onClearRegion={onClearRegion}
                onActionClick={onActionClick}
              />
            ))}

            {/* AI Thinking / Processing State */}
            {isLoading && (
              <div className="flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#22D3EE] p-0.5 shrink-0 shadow-lg shadow-[#8B5CF6]/20 mt-1">
                  <div className="w-full h-full bg-[#080B14] rounded-[10px] flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-[#22D3EE] animate-spin" />
                  </div>
                </div>

                <div className="glass-card border border-[#8B5CF6]/30 px-4 py-3 rounded-2xl rounded-tl-sm text-xs text-[#D0BCFF] flex items-center gap-3 shadow-lg shadow-[#8B5CF6]/10">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
                    <span className="w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse delay-150" />
                    <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse delay-300" />
                  </div>
                  <span className="font-medium text-white/90">{loadingStatus}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Dock */}
      <ChatInput
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        hasActiveImage={Boolean(activeImage)}
        isVoiceMode={isVoiceMode}
        onToggleVoiceMode={onToggleVoiceMode}
        isSpeaking={isSpeaking}
        onStopSpeaking={onStopSpeaking}
        selectedRegion={selectedRegion}
        selectedObject={selectedObject}
        onClearRegion={onClearRegion}
      />
    </div>
  );
};
