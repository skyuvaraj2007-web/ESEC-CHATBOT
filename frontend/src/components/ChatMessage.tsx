'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageModel, SelectedRegion, SelectedObjectContext } from '@/types';
import { ObjectOverlay } from './ObjectOverlay';
import { AudioResponsePlayer } from './AudioResponsePlayer';
import { api } from '@/lib/api';
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
  Globe,
  Loader2,
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
  activePlayingId?: string | null;
  onPlayStart?: (id: string) => void;
  onPlayEnd?: () => void;
  onSelectSuggestedQuestion?: (question: string) => void;
  selectedRegion?: SelectedRegion | null;
  selectedObject?: SelectedObjectContext | null;
  onSelectRegion?: (region: SelectedRegion, object?: SelectedObjectContext) => void;
  onClearRegion?: () => void;
  onActionClick?: (actionType: string, defaultQuery: string) => void;
}

const TRANSLATION_LANGUAGES = [
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'ml', name: 'Malayalam (മലയാളം)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'en', name: 'English' },
  { code: 'tanglish', name: 'Tanglish' },
];

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onSelectImage,
  onRetry,
  onSpeak,
  isSpeakingThis = false,
  onStopSpeaking,
  activePlayingId,
  onPlayStart,
  onPlayEnd,
  onSelectSuggestedQuestion,
  selectedRegion,
  selectedObject,
  onSelectRegion,
  onClearRegion,
  onActionClick,
}) => {
  const [copied, setCopied] = useState(false);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translatedLang, setTranslatedLang] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslateMenuOpen, setIsTranslateMenuOpen] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  const translateMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (translateMenuRef.current && !translateMenuRef.current.contains(e.target as Node)) {
        setIsTranslateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isUser = message.role === 'user';
  const isError =
    message.user_id === 'system' ||
    message.content.startsWith("Sorry, I couldn't generate a response");

  const isVoiceMessage = message.input_mode === 'voice' || message.input_mode === 'voice_response';

  const handleTranslate = async (targetLang: string) => {
    setIsTranslating(true);
    setTranslationError(null);
    setIsTranslateMenuOpen(false);
    try {
      const res = await api.translateResponse({
        text: message.content,
        targetLanguage: targetLang,
        conversationId: message.conversation_id,
      });
      setTranslatedText(res.translated_text);
      setTranslatedLang(res.target_language);
      setShowOriginal(false);
    } catch (err: any) {
      setTranslationError(err.message || 'Translation failed. Please retry.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = (translatedText && !showOriginal) ? translatedText : message.content;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentDisplayContent = (translatedText && !showOriginal) ? translatedText : message.content;
  const currentDisplayLanguage = (translatedText && !showOriginal)
    ? (translatedLang || 'auto')
    : (message.response_language || message.language || 'auto');

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

          {/* Translation Status Badge if Translated */}
          {translatedText && (
            <div className="mb-2 px-2 py-1 rounded-lg bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-between text-[11px] text-[#D0BCFF]">
              <div className="flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span className="font-semibold text-white">
                  {showOriginal ? 'Showing Original' : `Translated to ${translatedLang === 'ta' ? 'Tamil' : translatedLang === 'ml' ? 'Malayalam' : translatedLang === 'hi' ? 'Hindi' : translatedLang?.toUpperCase()}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowOriginal(!showOriginal)}
                className="text-[10px] underline text-[#22D3EE] hover:text-white transition"
              >
                {showOriginal ? 'View Translation' : 'View Original'}
              </button>
            </div>
          )}

          {/* Message Content */}
          <div className="whitespace-pre-wrap break-words">{currentDisplayContent}</div>

          {/* Action Footer */}
          {!isUser && !isError && (
            <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-col gap-2">
              {/* Realistic Neural Voice Player Bar */}
              <AudioResponsePlayer
                text={currentDisplayContent}
                messageId={message.id || `msg-${message.created_at || Date.now()}`}
                defaultLanguage={currentDisplayLanguage}
                activePlayingId={activePlayingId}
                onPlayStart={onPlayStart}
                onPlayEnd={onPlayEnd}
              />

              <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-[#64748B] pt-0.5">
                <span className="font-mono text-[10px] text-[#64748B]">
                  {tools?.mode === 'gemini_auto_description'
                    ? 'Automatic Visual Description'
                    : 'Adaptive Multimodal Pipeline'}
                </span>

                <div className="flex items-center gap-2 sm:gap-2.5 opacity-90 group-hover:opacity-100 transition shrink-0">
                  {/* Translate Response Dropdown */}
                  <div className="relative" ref={translateMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsTranslateMenuOpen(!isTranslateMenuOpen)}
                      disabled={isTranslating}
                      className="hover:text-white flex items-center gap-1 transition min-h-[28px] px-2 py-0.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-[11px] text-[#94A3B8] disabled:opacity-50"
                      title="Translate Response to another language"
                    >
                      {isTranslating ? (
                        <>
                          <Loader2 className="w-3 h-3 text-[#22D3EE] animate-spin" />
                          <span>Translating...</span>
                        </>
                      ) : (
                        <>
                          <Languages className="w-3 h-3 text-[#8B5CF6]" />
                          <span>Translate</span>
                          <span className="text-[8px] text-[#64748B]">▼</span>
                        </>
                      )}
                    </button>

                    {isTranslateMenuOpen && (
                      <div className="absolute bottom-full mb-1.5 right-0 w-44 rounded-xl bg-[#080B14] border border-white/15 p-1 shadow-2xl shadow-black z-50 animate-in fade-in zoom-in-95 space-y-0.5">
                        <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[#64748B]">
                          Translate Response
                        </div>
                        {TRANSLATION_LANGUAGES.map((lang) => (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => handleTranslate(lang.code)}
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] text-left text-[#94A3B8] hover:bg-white/[0.05] hover:text-white transition"
                          >
                            <span>{lang.name}</span>
                            {translatedLang === lang.code && !showOriginal && (
                              <Check className="w-3 h-3 text-[#22D3EE]" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Copy Text Button */}
                  <button
                    onClick={handleCopy}
                    className="hover:text-white flex items-center gap-1 transition min-h-[28px] px-2 py-0.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-[11px]"
                    title="Copy text"
                  >
                    {copied ? <Check className="w-3 h-3 text-[#34D399]" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Translation Error Banner */}
              {translationError && (
                <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg">
                  {translationError}
                </div>
              )}
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
