'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  Upload,
  Camera,
  Send,
  X,
  Sparkles,
  Loader2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  Globe,
  Radio,
  AlertCircle,
  Check,
} from 'lucide-react';
import { CameraCapture } from './CameraCapture';
import { useSpeech, SUPPORTED_LANGUAGES } from '@/lib/useSpeech';
import { SelectedRegion, SelectedObjectContext } from '@/types';

interface ChatInputProps {
  onSendMessage: (
    text: string,
    imageFile?: File | Blob,
    imagePreview?: string,
    inputMode?: 'text' | 'voice',
    language?: string
  ) => Promise<void>;
  isLoading: boolean;
  hasActiveImage?: boolean;
  isVoiceMode?: boolean;
  onToggleVoiceMode?: () => void;
  isSpeaking?: boolean;
  onStopSpeaking?: () => void;
  selectedRegion?: SelectedRegion | null;
  selectedObject?: SelectedObjectContext | null;
  onClearRegion?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  hasActiveImage,
  isVoiceMode = false,
  onToggleVoiceMode,
  isSpeaking = false,
  onStopSpeaking,
  selectedRegion,
  selectedObject,
  onClearRegion,
}) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | Blob | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const langMenuRef = useRef<HTMLDivElement | null>(null);

  const {
    selectedLanguage,
    setSelectedLanguage,
    isListening,
    transcript,
    interimTranscript,
    isSupported: isSpeechSupported,
    errorMessage: speechError,
    setErrorMessage: setSpeechError,
    startListening,
    stopListening,
  } = useSpeech('auto');

  // Close language menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update input text when speech recognition yields transcript
  useEffect(() => {
    if (transcript) {
      setMessage(transcript);
    }
  }, [transcript]);

  // Contextual suggestion pills: adapt dynamically if an object or region is selected
  const suggestionPills = selectedRegion
    ? [
        { label: '✦ What is this?', query: 'What is this selected object and what are its key details?' },
        { label: '✦ What color is it?', query: 'What color is this selected object?' },
        { label: '✦ Describe object', query: 'Describe this selected object in detail.' },
        { label: '✦ Is there text?', query: 'Is there any readable text or numbers in this selected region?' },
        { label: '✦ Tanglish: Idhu enna?', query: 'Idhu enna object? Idha pathi explain pannu.' },
        { label: '✦ Tamil: இது என்ன பொருள்?', query: 'இந்த பொருள் என்ன? விவரமாக கூறு.' },
      ]
    : [
        { label: '✦ Identify all objects', query: 'Detect and list all objects visible in this image with confidence levels.' },
        { label: '✦ Read image text (OCR)', query: 'Read and list all clearly visible text in this image.' },
        { label: '✦ Tanglish: Enna irukku?', query: 'Indha image la enna objects and colors irukku? Konjam detail ah explain pannu.' },
        { label: '✦ Tamil: என்ன இருக்கிறது?', query: 'இந்த படத்தில் என்னென்ன பொருட்கள் உள்ளன? விவரமாக விளக்கு.' },
      ];

  const handlePillClick = async (query: string) => {
    if (isLoading) return;
    if (hasActiveImage || selectedFile) {
      const fileToSend = selectedFile;
      const previewToSend = imagePreview;
      setMessage('');
      clearImage();
      await onSendMessage(query, fileToSend || undefined, previewToSend || undefined, 'text', selectedLanguage);
    } else {
      setMessage(query);
      textareaRef.current?.focus();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const currentText = message.trim();
      setMessage('');
      clearImage();
      // Immediately start automatic image understanding pipeline
      onSendMessage(currentText, file, url, 'text', selectedLanguage);
    }
  };

  const handleCameraCapture = (blob: Blob, dataUrl: string) => {
    const currentText = message.trim();
    setMessage('');
    clearImage();
    // Immediately start automatic image understanding pipeline
    onSendMessage(currentText, blob, dataUrl, 'text', selectedLanguage);
  };

  const clearImage = () => {
    setSelectedFile(null);
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async (forcedText?: string, inputMode: 'text' | 'voice' = 'text') => {
    const textToEvaluate = forcedText !== undefined ? forcedText : message;
    if ((!textToEvaluate.trim() && !selectedFile) || isLoading) return;

    if (isListening) {
      stopListening();
    }

    const textToSend =
      textToEvaluate.trim() || (selectedFile ? 'Analyze this image and explain what is visible.' : '');
    const fileToSend = selectedFile;
    const previewToSend = imagePreview;

    setMessage('');
    clearImage();

    await onSendMessage(textToSend, fileToSend || undefined, previewToSend || undefined, inputMode, selectedLanguage);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicClick = () => {
    if (!isSpeechSupported) {
      setSpeechError("Voice input isn't supported in this browser. You can continue with text chat.");
      return;
    }

    if (isSpeaking && onStopSpeaking) {
      onStopSpeaking();
    }

    if (isListening) {
      stopListening();
      if (message.trim()) {
        handleSend(message.trim(), 'voice');
      }
    } else {
      startListening();
    }
  };

  const activeLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 pb-2 sm:pb-4 pb-safe space-y-2">
      {/* Speech Error Banner */}
      {speechError && (
        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{speechError}</span>
          </div>
          <button
            onClick={() => setSpeechError(null)}
            className="p-1 hover:bg-white/10 rounded-lg text-xs"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Top Action Bar: Language Selector & Voice Mode Toggle & Quick Pills */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        {/* Left: Language Selector & Voice Mode Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Language Selector Dropdown */}
          <div className="relative" ref={langMenuRef}>
            <button
              type="button"
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-[11px] font-medium text-[#D0BCFF] flex items-center gap-1.5 transition shadow-sm min-h-[36px]"
              title="Select Speech & Response Language"
            >
              <Globe className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span className="max-w-[85px] sm:max-w-none truncate">{activeLangObj.name}</span>
              <span className="text-[10px] text-[#64748B]">▼</span>
            </button>

            {isLangMenuOpen && (
              <div className="absolute bottom-full mb-2 left-0 w-60 max-w-[calc(100vw-32px)] rounded-2xl bg-[#080B14] border border-white/15 p-1.5 shadow-2xl shadow-black z-50 animate-in fade-in zoom-in-95 space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  Language / Dialect
                </div>
                <div className="max-h-56 overflow-y-auto space-y-0.5 no-scrollbar">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setSelectedLanguage(lang.code);
                        setIsLangMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-left transition min-h-[40px] ${
                        selectedLanguage === lang.code
                          ? 'bg-[#8B5CF6]/20 text-white font-semibold border border-[#8B5CF6]/30'
                          : 'text-[#94A3B8] hover:bg-white/[0.05] hover:text-white'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs">{lang.name}</span>
                        <span className="text-[10px] text-[#64748B]">{lang.nativeName}</span>
                      </div>
                      {selectedLanguage === lang.code && <Check className="w-3.5 h-3.5 text-[#22D3EE]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Hands-Free Voice Conversation Mode Toggle */}
          {onToggleVoiceMode && (
            <button
              type="button"
              onClick={onToggleVoiceMode}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-medium border flex items-center gap-1.5 transition shadow-sm ${
                isVoiceMode
                  ? 'bg-gradient-to-r from-[#8B5CF6]/30 to-[#EC4899]/30 border-[#EC4899]/50 text-white shadow-lg shadow-[#EC4899]/20'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-[#94A3B8]'
              }`}
              title={isVoiceMode ? 'Voice Conversation Mode: Active' : 'Enable Hands-Free Voice Conversation'}
            >
              <Radio className={`w-3.5 h-3.5 ${isVoiceMode ? 'text-[#EC4899] animate-pulse' : 'text-[#94A3B8]'}`} />
              <span>Voice Mode</span>
              {isVoiceMode && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
            </button>
          )}

          {/* Stop Speaking Button when TTS is active */}
          {isSpeaking && onStopSpeaking && (
            <button
              type="button"
              onClick={onStopSpeaking}
              className="px-2.5 py-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-xs text-red-200 flex items-center gap-1.5 transition animate-pulse"
              title="Stop speaking"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop Audio</span>
            </button>
          )}
        </div>

        {/* Suggestion Pills */}
        <div className="flex items-center gap-1.5 shrink-0">
          {suggestionPills.map((pill, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handlePillClick(pill.query)}
              className="px-2.5 py-1 rounded-full bg-white/[0.03] hover:bg-[#8B5CF6]/15 text-[11px] font-medium text-[#94A3B8] hover:text-[#D0BCFF] border border-white/10 hover:border-[#8B5CF6]/30 transition shrink-0"
            >
              <span>{pill.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Floating Input Dock */}
      <div className="glass-input rounded-2xl p-2.5 border border-white/15 shadow-2xl shadow-black/80 flex flex-col gap-2">
        {/* Live Listening State Indicator / Interim Transcription Strip */}
        {isListening && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="font-semibold text-red-300">Listening ({activeLangObj.name})...</span>
              <span className="text-white/80 italic max-w-md truncate">
                {interimTranscript || transcript || 'Speak now...'}
              </span>
            </div>
            <button
              onClick={stopListening}
              className="px-2 py-0.5 rounded-md bg-red-500/20 hover:bg-red-500/30 text-[11px] font-medium text-white border border-red-500/30"
            >
              Done
            </button>
          </div>
        )}

        {/* Attached Image Preview Thumbnail Strip */}
        {imagePreview && (
          <div className="relative inline-block self-start rounded-xl overflow-hidden border border-[#22D3EE]/50 bg-[#080B14] p-1 shadow-lg">
            <img src={imagePreview} alt="Upload preview" className="h-20 w-auto rounded-lg object-contain" />
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 p-1 rounded-full bg-black/80 text-white hover:text-red-400 transition"
              title="Remove Image"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="absolute bottom-1 left-2 text-[9px] font-mono text-[#22D3EE] bg-black/70 px-1 rounded">
              Image Attached
            </div>
          </div>
        )}

        {/* Selected Region Focus Banner */}
        {selectedRegion && (
          <div className="p-2 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/35 flex items-center justify-between text-xs text-[#D0BCFF] animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8B5CF6] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8B5CF6]"></span>
              </span>
              <span className="font-semibold text-white">
                {selectedObject?.label ? `Focus: ${selectedObject.label}` : 'Focus: Selected Region'}
              </span>
              <span className="text-[10px] text-[#94A3B8] font-mono hidden sm:inline">
                ({selectedRegion.x}%, {selectedRegion.y}%, {selectedRegion.width}x{selectedRegion.height}%)
              </span>
            </div>
            {onClearRegion && (
              <button
                type="button"
                onClick={onClearRegion}
                className="px-2 py-0.5 rounded-lg bg-white/[0.06] hover:bg-red-500/20 text-[11px] text-[#94A3B8] hover:text-red-300 border border-white/10 transition flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                <span>Clear Focus</span>
              </button>
            )}
          </div>
        )}

        <div className="flex items-end gap-1.5 sm:gap-2">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Media & Microphone Trigger Buttons */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Upload Image (JPG, PNG, WebP)"
              className="p-2 sm:p-2.5 rounded-xl text-[#94A3B8] hover:text-white hover:bg-white/[0.08] transition border border-transparent hover:border-white/10 min-w-[42px] min-h-[42px] flex items-center justify-center"
              aria-label="Upload Image"
            >
              <Upload className="w-4 h-4 text-[#8B5CF6]" />
            </button>

            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              title="Capture Frame with Camera"
              className="p-2 sm:p-2.5 rounded-xl text-[#94A3B8] hover:text-white hover:bg-white/[0.08] transition border border-transparent hover:border-white/10 min-w-[42px] min-h-[42px] flex items-center justify-center"
              aria-label="Open Camera"
            >
              <Camera className="w-4 h-4 text-[#22D3EE]" />
            </button>

            {/* Microphone Voice Button */}
            <button
              type="button"
              onClick={handleMicClick}
              title={
                isListening
                  ? 'Stop Listening'
                  : `Speak in ${activeLangObj.name} (English, Tamil, Tanglish, Hindi...)`
              }
              className={`p-2 sm:p-2.5 rounded-xl transition border relative min-w-[42px] min-h-[42px] flex items-center justify-center ${
                isListening
                  ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-lg shadow-red-500/20 animate-pulse'
                  : isSpeaking
                  ? 'bg-[#22D3EE]/20 text-[#22D3EE] border-[#22D3EE]/50 shadow-lg shadow-[#22D3EE]/20'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.08] border-transparent hover:border-white/10'
              }`}
              aria-label={isListening ? 'Stop Listening' : 'Start Voice Input'}
            >
              {isListening ? (
                <MicOff className="w-4 h-4 text-red-400" />
              ) : isSpeaking ? (
                <Volume2 className="w-4 h-4 text-[#22D3EE] animate-bounce" />
              ) : (
                <Mic className="w-4 h-4 text-[#EC4899]" />
              )}
            </button>
          </div>

          {/* Text Input Area */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? `Listening in ${activeLangObj.name}...`
                : hasActiveImage
                ? `Ask in English, Tamil, Tanglish ('Indha image la...')...`
                : `Type or speak in English, Tamil, Tanglish, Hindi...`
            }
            className="flex-1 bg-transparent border-none text-xs sm:text-sm text-white placeholder-[#64748B] focus:outline-none resize-none max-h-32 py-2 px-1 min-w-0"
          />

          {/* Send Button */}
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={(!message.trim() && !selectedFile) || isLoading}
            className="btn-primary p-2.5 sm:px-4 sm:py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold disabled:opacity-40 disabled:pointer-events-none transition shadow-lg shadow-[#8B5CF6]/30 min-w-[42px] min-h-[42px] shrink-0"
            aria-label="Send Message"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Camera Capture Modal */}
      <CameraCapture
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
};
