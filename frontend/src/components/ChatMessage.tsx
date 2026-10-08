'use client';

import React, { useState } from 'react';
import { MessageModel, SelectedRegion, SelectedObjectContext } from '@/types';
import { ObjectOverlay } from './ObjectOverlay';
import {
  User,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  RotateCcw,
  Volume2,
  VolumeX,
  Mic,
  Languages,
  Cpu,
  Layers,
  FileText,
  CheckCircle2,
  CircleDot,
  HelpCircle
} from 'lucide-react';

interface ChatMessageProps {
  message: MessageModel;
  onSelectImage?: (image: any) => void;
  onRetry?: (messageText: string) => void;
  onSpeak?: (text: string, language?: string) => void;
  isSpeakingThis?: boolean;
  onStopSpeaking?: () => void;
  onSelectSuggestedQuestion?: (question: string) => void;
  selectedRegion?: SelectedRegion | null;
  selectedObject?: SelectedObjectContext | null;
  onSelectRegion?: (region: SelectedRegion, object?: SelectedObjectContext) => void;
  onClearRegion?: () => void;
  onActionClick?: (actionType: string, defaultQuery: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onSelectImage,
  onRetry,
  onSpeak,
  isSpeakingThis = false,
  onStopSpeaking,
  onSelectSuggestedQuestion,
  selectedRegion,
  selectedObject,
  onSelectRegion,
  onClearRegion,
  onActionClick,
}) => {
  const [copied, setCopied] = useState(false);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const isUser = message.role === 'user';
  const isError =
    message.user_id === 'system' ||
    message.content.startsWith("Sorry, I couldn't generate a response");

  const isVoiceMessage = message.input_mode === 'voice' || message.input_mode === 'voice_response';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSpeak = () => {
    if (isSpeakingThis && onStopSpeaking) {
      onStopSpeaking();
    } else if (onSpeak) {
      onSpeak(message.content, message.language || undefined);
    }
  };

  const tools = message.tools_used;

  return (
    <div className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'} group`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#22D3EE] p-0.5 shrink-0 shadow-lg shadow-[#8B5CF6]/20 mt-1">
          <div className="w-full h-full bg-[#080B14] rounded-[10px] flex items-center justify-center">
            {isError ? (
              <AlertCircle className="w-4 h-4 text-[#EC4899]" />
            ) : (
              <Sparkles className="w-4 h-4 text-[#22D3EE]" />
            )}
          </div>
        </div>
      )}

      <div className={`max-w-[88%] sm:max-w-xl md:max-w-2xl space-y-2 min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Attached Image */}
        {message.image && (
          <div className="w-full max-w-sm rounded-xl overflow-hidden transition-transform hover:scale-[1.01]">
            <ObjectOverlay
              imageUrl={message.image.public_url}
              objects={message.image.analysis?.objects || []}
              alt={message.image.file_name}
              selectedRegion={selectedRegion || message.tools_used?.selected_region}
              selectedObject={selectedObject || message.tools_used?.selected_object}
              onSelectRegion={onSelectRegion}
              onClearRegion={onClearRegion}
              onActionClick={onActionClick}
            />
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`relative px-3.5 sm:px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed break-words overflow-hidden ${
            isUser
              ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-lg shadow-[#8B5CF6]/20 rounded-tr-sm'
              : isError
              ? 'bg-[#101522]/90 border border-red-500/30 text-red-200 shadow-lg rounded-tl-sm'
              : 'glass-card border border-white/10 text-[#F8FAFC] shadow-lg rounded-tl-sm'
          }`}
        >
          {/* Voice Input Indicator Badge */}
          {isVoiceMessage && (
            <div className="flex items-center gap-1.5 pb-1 text-[10px] font-medium opacity-80">
              <Mic className="w-3 h-3 text-[#22D3EE]" />
              <span>Voice Transcript</span>
            </div>
          )}

          {/* AI Processing Engine Indicator */}
          {!isUser && !isError && (
            <div className="mb-2 pb-1.5 border-b border-white/5 space-y-1.5 text-[10px] text-[#94A3B8]">
              <div className="flex items-center justify-between flex-wrap gap-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Primary Gemini Multimodal */}
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#8B5CF6]/20 text-[#D0BCFF] font-medium border border-[#8B5CF6]/30">
                    <CheckCircle2 className="w-2.5 h-2.5 text-[#34D399]" />
                    <span>{tools?.yolo || tools?.ocr ? 'Gemini Reasoning' : 'Gemini Vision'}</span>
                  </span>

                  {/* Optional Specialized YOLO Module */}
                  {tools?.yolo ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#22D3EE]/20 text-[#22D3EE] font-medium border border-[#22D3EE]/30">
                      <CheckCircle2 className="w-2.5 h-2.5 text-[#34D399]" />
                      <span>YOLO Object Detection</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.03] text-[#64748B] border border-white/5 hidden sm:inline-flex">
                      <CircleDot className="w-2.5 h-2.5 text-[#64748B]/60" />
                      <span>YOLO — Not required</span>
                    </span>
                  )}

                  {/* Optional Specialized OCR Module */}
                  {tools?.ocr ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#34D399]/20 text-[#34D399] font-medium border border-[#34D399]/30">
                      <CheckCircle2 className="w-2.5 h-2.5 text-[#34D399]" />
                      <span>OCR Text Extraction</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.03] text-[#64748B] border border-white/5 hidden sm:inline-flex">
                      <CircleDot className="w-2.5 h-2.5 text-[#64748B]/60" />
                      <span>OCR — Not required</span>
                    </span>
                  )}
                  {/* Selected Region Focus Badge */}
                  {tools?.has_selection && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#8B5CF6]/25 text-[#D0BCFF] font-medium border border-[#8B5CF6]/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] animate-pulse" />
                      <span>
                        {tools.selected_object?.label
                          ? `Object: ${tools.selected_object.label}`
                          : 'Selected Region'}
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {(message.response_language || message.language) && (
                    <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-[#D0BCFF]">
                      <Languages className="w-2.5 h-2.5" />
                      <span>
                        {(message.response_language || message.language) === 'tanglish' || (message.response_language || message.language) === 'ta-Latn'
                          ? 'Tanglish'
                          : (message.response_language || message.language) === 'ta'
                          ? 'Tamil'
                          : (message.response_language || message.language) === 'en'
                          ? 'English'
                          : (message.response_language || message.language) === 'hi'
                          ? 'Hindi'
                          : (message.response_language || message.language) === 'ml'
                          ? 'Malayalam'
                          : message.response_language || message.language}
                      </span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowTechDetails(!showTechDetails)}
                    className="text-[9px] text-[#64748B] hover:text-[#94A3B8] underline transition decoration-dotted"
                  >
                    {showTechDetails ? 'Hide details' : 'AI details'}
                  </button>
                </div>
              </div>

              {/* Collapsible Technical Details for Judges */}
              {showTechDetails && (
                <div className="p-2 rounded-lg bg-[#051424] border border-white/5 text-[10px] space-y-1 text-[#94A3B8] font-mono animate-in fade-in">
                  <div className="text-[#D0BCFF] font-semibold">AI Processing Telemetry:</div>
                  <div>• Primary Multimodal: <span className="text-white">Active (Gemini 1.5 Flash)</span></div>
                  {tools?.selected_region && (
                    <div>• Selected Focus: <span className="text-[#22D3EE]">X={tools.selected_region.x}%, Y={tools.selected_region.y}%, {tools.selected_region.width}x{tools.selected_region.height}%</span></div>
                  )}
                  <div>• Specialized YOLO: <span className={tools?.yolo ? 'text-[#22D3EE]' : 'text-[#64748B]'}>{tools?.yolo ? 'Executed (Spatial/Counting)' : 'Skipped (Zero compute overhead)'}</span></div>
                  <div>• Specialized OCR: <span className={tools?.ocr ? 'text-[#34D399]' : 'text-[#64748B]'}>{tools?.ocr ? 'Executed (Exact Document extraction)' : 'Skipped (Zero compute overhead)'}</span></div>
                  {tools?.reason && <div>• Routing Decision: <span className="text-[#34D399]">{tools.reason}</span></div>}
                </div>
              )}
            </div>
          )}

          <div className="whitespace-pre-wrap break-words">{message.content}</div>

          {/* Action Footer */}
          {!isUser && !isError && (
            <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-[#64748B]">
              <span className="font-mono text-[10px] text-[#64748B]">
                {tools?.mode === 'gemini_auto_description'
                  ? 'Automatic Visual Description'
                  : 'Adaptive Multimodal Pipeline'}
              </span>

              <div className="flex items-center gap-2 sm:gap-2.5 opacity-90 group-hover:opacity-100 transition shrink-0">
                {/* Audio Speak / Stop Button */}
                {onSpeak && (
                  <button
                    onClick={handleToggleSpeak}
                    className={`flex items-center gap-1 text-xs transition min-h-[30px] px-1.5 rounded hover:bg-white/[0.06] ${
                      isSpeakingThis
                        ? 'text-[#22D3EE] font-semibold animate-pulse'
                        : 'text-[#94A3B8] hover:text-white'
                    }`}
                    title={isSpeakingThis ? 'Stop Audio Playback' : 'Listen to Response (TTS)'}
                  >
                    {isSpeakingThis ? <VolumeX className="w-3.5 h-3.5 text-[#22D3EE]" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>{isSpeakingThis ? 'Stop' : 'Listen'}</span>
                  </button>
                )}

                {/* Copy Text Button */}
                <button
                  onClick={handleCopy}
                  className="hover:text-white flex items-center gap-1 transition min-h-[30px] px-1.5 rounded hover:bg-white/[0.06]"
                  title="Copy text"
                >
                  {copied ? <Check className="w-3 h-3 text-[#34D399]" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          {isError && onRetry && (
            <div className="mt-2 pt-2 border-t border-red-500/20 flex items-center justify-between text-xs">
              <span className="text-[11px] text-[#94A3B8]">Request incomplete</span>
              <button
                onClick={() => onRetry(message.content)}
                className="px-2.5 py-1 rounded bg-[#8B5CF6]/20 hover:bg-[#8B5CF6]/40 text-[#D0BCFF] text-xs font-semibold flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}
        </div>

        {/* Suggested Questions Quick-Pills */}
        {!isUser && !isError && message.suggested_questions && message.suggested_questions.length > 0 && (
          <div className="space-y-1.5 pt-1 pl-1">
            <div className="flex items-center gap-1 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
              <HelpCircle className="w-3 h-3 text-[#22D3EE]" />
              <span>Suggested Explorations</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {message.suggested_questions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectSuggestedQuestion && onSelectSuggestedQuestion(q)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 hover:border-[#8B5CF6]/50 hover:bg-[#8B5CF6]/10 text-[#D0BCFF] hover:text-white transition text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 shrink-0 flex items-center justify-center text-white mt-1">
          <User className="w-4 h-4 text-[#94A3B8]" />
        </div>
      )}
    </div>
  );
};
