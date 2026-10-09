'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Square,
  Loader2,
  Globe,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { api } from '@/lib/api';

interface AudioResponsePlayerProps {
  text: string;
  messageId?: string;
  defaultLanguage?: string;
  activePlayingId?: string | null;
  onPlayStart?: (id: string) => void;
  onPlayEnd?: () => void;
}

const SUPPORTED_VOICES = [
  { code: 'auto', name: 'Auto Detect', label: 'Auto' },
  { code: 'en', name: 'English (India)', label: 'English' },
  { code: 'ta', name: 'Tamil (தமிழ்)', label: 'Tamil' },
  { code: 'ml', name: 'Malayalam (മലയാളം)', label: 'Malayalam' },
  { code: 'hi', name: 'Hindi (हिन्दी)', label: 'Hindi' },
];

export const AudioResponsePlayer: React.FC<AudioResponsePlayerProps> = ({
  text,
  messageId = 'msg-default',
  defaultLanguage = 'auto',
  activePlayingId,
  onPlayStart,
  onPlayEnd,
}) => {
  const [selectedLang, setSelectedLang] = useState<string>(() => {
    const lang = (defaultLanguage || 'auto').toLowerCase();
    if (lang === 'tamil' || lang === 'ta') return 'ta';
    if (lang === 'malayalam' || lang === 'ml') return 'ml';
    if (lang === 'hindi' || lang === 'hi') return 'hi';
    if (lang === 'en' || lang === 'english') return 'en';
    if (lang === 'tanglish') return 'ta';
    return 'auto';
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectedVoice, setDetectedVoice] = useState<string | null>(null);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrlRef = useRef<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Sync selected voice language when defaultLanguage prop changes (e.g. upon translation)
  useEffect(() => {
    if (defaultLanguage && defaultLanguage !== 'auto') {
      const lang = defaultLanguage.toLowerCase();
      if (lang === 'tamil' || lang === 'ta') setSelectedLang('ta');
      else if (lang === 'malayalam' || lang === 'ml') setSelectedLang('ml');
      else if (lang === 'hindi' || lang === 'hi') setSelectedLang('hi');
      else if (lang === 'en' || lang === 'english') setSelectedLang('en');
      else if (lang === 'tanglish' || lang === 'ta-latn') setSelectedLang('ta');
    }
  }, [defaultLanguage]);

  // Reset loaded audio if the message text changes (e.g. translated)
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current);
      audioBlobUrlRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentTime(0);
    setDuration(0);
  }, [text]);

  // Stop playback if another message becomes active
  useEffect(() => {
    if (activePlayingId && activePlayingId !== messageId && (isPlaying || isPaused)) {
      handleStop();
    }
  }, [activePlayingId, messageId]);

  // Close language menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (audioBlobUrlRef.current) {
        URL.revokeObjectURL(audioBlobUrlRef.current);
      }
    };
  }, []);

  const handleFetchAndPlay = async () => {
    if (isLoading) return;
    setErrorMessage(null);

    // If audio is already loaded and paused, resume
    if (audioRef.current && isPaused) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
        setIsPaused(false);
        if (onPlayStart) onPlayStart(messageId);
        return;
      } catch (err) {
        console.warn('Resume error, refetching:', err);
      }
    }

    setIsLoading(true);
    if (onPlayStart) onPlayStart(messageId);

    try {
      const { audioBlob, detectedLanguage, voiceId } = await api.synthesizeSpeech({
        text,
        language: selectedLang,
        gender: 'female',
      });

      setDetectedVoice(voiceId);

      if (audioBlobUrlRef.current) {
        URL.revokeObjectURL(audioBlobUrlRef.current);
      }

      const blobUrl = URL.createObjectURL(audioBlob);
      audioBlobUrlRef.current = blobUrl;

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      const audio = audioRef.current;
      audio.src = blobUrl;

      audio.onloadedmetadata = () => {
        setDuration(audio.duration || 0);
      };

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime || 0);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentTime(0);
        if (onPlayEnd) onPlayEnd();
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setIsPlaying(false);
        setIsPaused(false);
        setIsLoading(false);
        setErrorMessage('Unable to play audio. Please retry.');
      };

      await audio.play();
      setIsPlaying(true);
      setIsPaused(false);
      setIsLoading(false);
    } catch (err: any) {
      console.error('TTS Synthesis error:', err);
      setIsLoading(false);
      setIsPlaying(false);
      setIsPaused(false);
      setErrorMessage(err.message || 'Voice generation failed. Please retry.');
    }
  };

  const handlePause = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentTime(0);
    if (onPlayEnd) onPlayEnd();
  };

  const handleReplay = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setIsPaused(false);
        if (onPlayStart) onPlayStart(messageId);
      });
    } else {
      handleFetchAndPlay();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const activeLangObj = SUPPORTED_VOICES.find((v) => v.code === selectedLang) || SUPPORTED_VOICES[0];

  return (
    <div className="flex flex-col gap-1.5 pt-1">
      {/* Playback Controls & Language Bar */}
      <div className="flex items-center flex-wrap gap-2 text-xs">
        {/* Main Listen / Play / Pause Button */}
        {!isPlaying && !isPaused && (
          <button
            type="button"
            onClick={handleFetchAndPlay}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-[#8B5CF6]/20 border border-white/10 hover:border-[#8B5CF6]/30 text-[#D0BCFF] hover:text-white transition shadow-sm disabled:opacity-50 min-h-[30px]"
            title="Listen to Response with Natural Neural Voice"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-[#22D3EE] animate-spin" />
                <span className="text-[11px] font-medium text-[#22D3EE]">Generating Voice...</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span className="text-[11px] font-medium">Listen</span>
              </>
            )}
          </button>
        )}

        {/* Active Playback State */}
        {(isPlaying || isPaused) && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 shadow-inner">
            {isPlaying ? (
              <button
                type="button"
                onClick={handlePause}
                className="p-1 rounded-lg hover:bg-white/10 text-[#22D3EE] transition"
                title="Pause Audio"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFetchAndPlay}
                className="p-1 rounded-lg hover:bg-white/10 text-[#22D3EE] transition"
                title="Resume Audio"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            )}

            <button
              type="button"
              onClick={handleReplay}
              className="p-1 rounded-lg hover:bg-white/10 text-[#94A3B8] hover:text-white transition"
              title="Replay from Beginning"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleStop}
              className="p-1 rounded-lg hover:bg-white/10 text-red-400 hover:text-red-300 transition"
              title="Stop Playback"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>

            {/* Time Indicator */}
            <span className="text-[10px] font-mono text-[#CBD5E1] pl-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Animated Audio Equalizer Indicator */}
            {isPlaying && (
              <div className="flex items-center gap-0.5 px-1">
                <span className="w-0.5 h-3 bg-[#22D3EE] rounded-full animate-[pulse_0.6s_ease-in-out_infinite]" />
                <span className="w-0.5 h-4 bg-[#8B5CF6] rounded-full animate-[pulse_0.4s_ease-in-out_infinite]" />
                <span className="w-0.5 h-2 bg-[#EC4899] rounded-full animate-[pulse_0.7s_ease-in-out_infinite]" />
              </div>
            )}
          </div>
        )}

        {/* Voice Language Dropdown Selector */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/15 text-[10px] text-[#94A3B8] hover:text-[#D0BCFF] transition min-h-[30px]"
            title="Change Speech Voice Language"
          >
            <Globe className="w-3 h-3 text-[#8B5CF6]" />
            <span>{activeLangObj.label}</span>
            <span className="text-[8px] text-[#64748B]">▼</span>
          </button>

          {isLangMenuOpen && (
            <div className="absolute bottom-full mb-1.5 left-0 w-44 rounded-xl bg-[#080B14] border border-white/15 p-1 shadow-2xl shadow-black z-50 animate-in fade-in zoom-in-95 space-y-0.5">
              <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[#64748B]">
                Voice Language
              </div>
              {SUPPORTED_VOICES.map((v) => (
                <button
                  key={v.code}
                  type="button"
                  onClick={() => {
                    setSelectedLang(v.code);
                    setIsLangMenuOpen(false);
                    // If playing, restart with new language voice
                    if (isPlaying || isPaused) {
                      handleStop();
                      setTimeout(handleFetchAndPlay, 100);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] text-left transition ${
                    selectedLang === v.code
                      ? 'bg-[#8B5CF6]/20 text-white font-semibold'
                      : 'text-[#94A3B8] hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <span>{v.name}</span>
                  {selectedLang === v.code && <Sparkles className="w-3 h-3 text-[#22D3EE]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar (Visible while playing or paused) */}
      {(isPlaying || isPaused) && duration > 0 && (
        <div className="flex items-center gap-2 max-w-xs animate-in fade-in">
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#22D3EE]"
          />
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg animate-in fade-in">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={handleFetchAndPlay}
            className="underline ml-1 text-white hover:text-red-200"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};
