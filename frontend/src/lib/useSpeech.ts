'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  bcp47: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'auto', name: 'Auto Detect', nativeName: 'தானியங்கி', bcp47: 'en-IN' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', bcp47: 'ta-IN' },
  { code: 'ta-Latn', name: 'Tanglish', nativeName: 'Tanglish (Romanized Tamil)', bcp47: 'ta-IN' },
  { code: 'en', name: 'English', nativeName: 'English (India)', bcp47: 'en-IN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', bcp47: 'hi-IN' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', bcp47: 'ml-IN' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', bcp47: 'te-IN' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', bcp47: 'kn-IN' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', bcp47: 'bn-IN' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', bcp47: 'mr-IN' },
];

export function useSpeech(defaultLang = 'auto') {
  const [selectedLanguage, setSelectedLanguage] = useState<string>(defaultLang);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef<boolean>(false);

  // Initialize SpeechSynthesis Voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Initialize SpeechRecognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // Set BCP-47 locale based on selected language
    const currentLangConfig =
      SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];
    recognition.lang = currentLangConfig.bcp47;

    recognition.onstart = () => {
      setIsListening(true);
      setErrorMessage(null);
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (final) {
        setTranscript((prev) => (prev ? `${prev} ${final.trim()}` : final.trim()));
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      console.warn('[useSpeech] Recognition event error:', event.error);
      if (event.error === 'not-allowed') {
        setErrorMessage('Microphone access is blocked. Please allow microphone permission in your browser.');
      } else if (event.error === 'no-speech') {
        // user didn't speak in time, benign
      } else if (event.error === 'network') {
        setErrorMessage('Network error during speech recognition. Please check your internet connection.');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch {}
    };
  }, [selectedLanguage]);

  // Start listening (ensuring TTS is stopped so mic does not hear itself)
  const startListening = useCallback(() => {
    if (isSpeakingRef.current && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    }

    setErrorMessage(null);
    setTranscript('');
    setInterimTranscript('');

    if (!recognitionRef.current) {
      setErrorMessage('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      const currentLangConfig =
        SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];
      recognitionRef.current.lang = currentLangConfig.bcp47;
      recognitionRef.current.start();
    } catch (e: any) {
      console.warn('[useSpeech] Start error:', e);
    }
  }, [selectedLanguage]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  }, []);

  // Text-to-Speech (TTS)
  const speakText = useCallback(
    (text: string, languageHint?: string, onEndCallback?: () => void) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      // Stop any ongoing speech
      window.speechSynthesis.cancel();

      // Clean markdown symbols from spoken audio
      const cleanText = text
        .replace(/[*_~`#>-]/g, ' ')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) return;

      // Determine target language BCP-47
      const effectiveLang = languageHint || selectedLanguage;
      const langConfig =
        SUPPORTED_LANGUAGES.find((l) => l.code === effectiveLang) ||
        SUPPORTED_LANGUAGES.find((l) => l.code === 'en') ||
        SUPPORTED_LANGUAGES[0];

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Find suitable voice matching language tag
      const voices = window.speechSynthesis.getVoices();
      const targetPrefix = langConfig.bcp47.split('-')[0].toLowerCase();
      const matchingVoice =
        voices.find((v) => v.lang.toLowerCase().startsWith(targetPrefix)) ||
        voices.find((v) => v.lang.toLowerCase().includes('in')) ||
        voices[0];

      if (matchingVoice) {
        utterance.voice = matchingVoice;
        utterance.lang = matchingVoice.lang;
      } else {
        utterance.lang = langConfig.bcp47;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        isSpeakingRef.current = true;
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        if (onEndCallback) {
          onEndCallback();
        }
      };

      utterance.onerror = (err) => {
        console.warn('[useSpeech] TTS error:', err);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      };

      window.speechSynthesis.speak(utterance);
    },
    [selectedLanguage]
  );

  // Stop TTS immediately
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    }
  }, []);

  return {
    selectedLanguage,
    setSelectedLanguage,
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    isSupported,
    errorMessage,
    setErrorMessage,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}
