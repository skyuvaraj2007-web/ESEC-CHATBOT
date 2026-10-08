'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { MessageModel, ImageModel, ImageAnalysisData, ConversationDetail, SelectedRegion, SelectedObjectContext } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { ChatWindow } from '@/components/ChatWindow';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { ImageComparisonModal } from '@/components/ImageComparisonModal';
import { useSpeech } from '@/lib/useSpeech';

interface ConversationWorkspaceProps {
  conversationId?: string;
}

export const ConversationWorkspace: React.FC<ConversationWorkspaceProps> = ({
  conversationId,
}) => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [currentConvId, setCurrentConvId] = useState<string | undefined>(conversationId);
  const [messages, setMessages] = useState<MessageModel[]>([]);
  const [images, setImages] = useState<ImageModel[]>([]);
  const [activeImage, setActiveImage] = useState<ImageModel | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<SelectedRegion | null>(null);
  const [selectedObject, setSelectedObject] = useState<SelectedObjectContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('VisionAI is thinking...');
  const [showTelemetry, setShowTelemetry] = useState(true);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isMobileAnalysisOpen, setIsMobileAnalysisOpen] = useState(false);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);

  // Voice Conversation Mode & TTS State
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const {
    speakText,
    stopSpeaking,
    isSpeaking,
  } = useSpeech();

  // Dynamic thinking timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setTimeout(() => {
        setLoadingStatus('Analyzing visual context with Gemini...');
      }, 2500);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Load conversation details when conversationId changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setImages([]);
      setActiveImage(null);
      return;
    }

    if (authLoading || !user) return;

    const loadData = async () => {
      try {
        const detail = await api.getConversation(conversationId);
        if (detail) {
          setMessages(detail.messages || []);
          setImages(detail.images || []);
          if (detail.images && detail.images.length > 0) {
            setActiveImage(detail.images[detail.images.length - 1]);
          }
        }
      } catch (err: any) {
        if (!err.message?.includes('session has expired') && !err.message?.includes('401') && err.message !== 'AUTH_REQUIRED') {
          console.error('Failed to load conversation:', err);
        }
      }
    };

    loadData();
    setCurrentConvId(conversationId);
  }, [conversationId, authLoading, user]);

  const handleSelectRegion = useCallback((region: SelectedRegion, objectContext?: SelectedObjectContext) => {
    setSelectedRegion(region);
    setSelectedObject(objectContext || null);
  }, []);

  const handleClearRegion = useCallback(() => {
    setSelectedRegion(null);
    setSelectedObject(null);
  }, []);

  const handleActionClick = useCallback(async (actionType: string, defaultQuery: string) => {
    await handleSendMessage(defaultQuery, undefined, undefined, 'text', undefined);
  }, []);

  // Handle TTS play for any specific message
  const handleSpeakMessage = useCallback(
    (text: string, language?: string, msgId?: string) => {
      if (isSpeaking) {
        stopSpeaking();
        setSpeakingMessageId(null);
        return;
      }
      if (msgId) {
        setSpeakingMessageId(msgId);
      }
      speakText(text, language, () => {
        setSpeakingMessageId(null);
      });
    },
    [isSpeaking, speakText, stopSpeaking]
  );

  const handleStopSpeaking = useCallback(() => {
    stopSpeaking();
    setSpeakingMessageId(null);
  }, [stopSpeaking]);

  // Handle sending message / uploading image
  const handleSendMessage = async (
    text: string,
    imageFile?: File | Blob,
    imagePreview?: string,
    inputMode: 'text' | 'voice' = 'text',
    language?: string
  ) => {
    handleStopSpeaking();
    setIsLoading(true);
    let activeConvId = currentConvId;

    try {
      // 1. Ensure conversation exists
      if (!activeConvId) {
        setLoadingStatus('Initializing visual session...');
        const conv = await api.createConversation(text ? text.slice(0, 32) : 'Visual Chat');
        activeConvId = conv.id;
        setCurrentConvId(conv.id);
        window.history.replaceState(null, '', `/app/chat/${conv.id}`);
      }

      let uploadedImageModel: ImageModel | undefined;

      // 2. If image is provided, upload first
      if (imageFile) {
        setLoadingStatus('Uploading image...');
        uploadedImageModel = await api.uploadImage(imageFile, activeConvId);
        setImages((prev) => [...prev, uploadedImageModel!]);
        setActiveImage(uploadedImageModel);
        setSelectedRegion(null);
        setSelectedObject(null);
        setLoadingStatus('Generating automatic visual description...');
      } else {
        setLoadingStatus(selectedRegion ? 'Analyzing selected object region...' : 'VisionAI is thinking...');
      }

      const isAutoDescribe = imageFile && !text.trim();
      const userDisplayContent = text.trim() || (imageFile ? 'Uploaded an image for automatic visual understanding.' : '');
      const backendQuery = isAutoDescribe ? '__AUTO_DESCRIBE__' : text.trim();

      // 3. Add optimistic user message to chat
      const optimisticUserMsg: MessageModel = {
        id: 'opt-' + Date.now(),
        conversation_id: activeConvId,
        user_id: 'current-user',
        role: 'user',
        content: userDisplayContent,
        input_mode: inputMode,
        language: language,
        image_id: uploadedImageModel?.id || activeImage?.id || null,
        image: uploadedImageModel || (imagePreview ? ({
          id: 'temp-preview',
          user_id: 'current-user',
          storage_path: '',
          public_url: imagePreview,
          file_name: 'Uploaded Image',
          mime_type: 'image/jpeg',
        } as ImageModel) : activeImage),
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticUserMsg]);

      // 4. Create streaming placeholder for Assistant message
      const streamId = 'stream-' + Date.now();
      let streamedText = '';

      const streamingAssistantMsg: MessageModel = {
        id: streamId,
        conversation_id: activeConvId,
        user_id: 'assistant-stream',
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, streamingAssistantMsg]);

      // 5. Stream Chat message from Gemini SSE endpoint
      await new Promise<void>((resolve, reject) => {
        api.streamChatMessage(
          {
            conversation_id: activeConvId,
            message: backendQuery,
            image_id: uploadedImageModel?.id || activeImage?.id,
            input_mode: inputMode,
            language: language,
            selected_region: selectedRegion || undefined,
            selected_object: selectedObject || undefined,
          },
          (chunk: string) => {
            streamedText += chunk;
            setMessages((prev) =>
              prev.map((m) => (m.id === streamId ? { ...m, content: streamedText } : m))
            );
          },
          (doneData) => {
            // Replace streaming placeholder with final persisted assistant message
            const finalMsg = doneData.message || {
              ...streamingAssistantMsg,
              content: streamedText,
              tools_used: doneData.tools_used,
              suggested_questions: doneData.suggested_questions,
            };

            setMessages((prev) =>
              prev.map((m) => (m.id === streamId ? finalMsg : m))
            );

            if (doneData.analysis && (uploadedImageModel || activeImage)) {
              const targetImage = uploadedImageModel || activeImage;
              if (targetImage) {
                targetImage.analysis = doneData.analysis;
                setActiveImage({ ...targetImage });
              }
            }
            setLastFailedQuery(null);

            // Voice Mode Auto-Playback
            if (isVoiceMode || inputMode === 'voice') {
              setSpeakingMessageId(finalMsg.id);
              speakText(finalMsg.content, language, () => {
                setSpeakingMessageId(null);
              });
            }

            resolve();
          },
          async (err) => {
            console.warn('[ConversationWorkspace] Stream fallback to standard post:', err);
            try {
              const chatResponse = await api.sendChatMessage({
                conversation_id: activeConvId,
                message: backendQuery,
                image_id: uploadedImageModel?.id || activeImage?.id,
                input_mode: inputMode,
                language: language,
                selected_region: selectedRegion || undefined,
                selected_object: selectedObject || undefined,
              });

              setMessages((prev) =>
                prev.map((m) => (m.id === streamId ? chatResponse.message : m))
              );

              if (chatResponse.analysis && (uploadedImageModel || activeImage)) {
                const targetImage = uploadedImageModel || activeImage;
                if (targetImage) {
                  targetImage.analysis = chatResponse.analysis;
                  setActiveImage({ ...targetImage });
                }
              }

              if (isVoiceMode || inputMode === 'voice') {
                setSpeakingMessageId(chatResponse.message.id);
                speakText(chatResponse.message.content, language, () => {
                  setSpeakingMessageId(null);
                });
              }
              resolve();
            } catch (fallbackErr) {
              reject(fallbackErr);
            }
          }
        );
      });
    } catch (err: any) {
      console.error('Chat error:', err);
      setLastFailedQuery(text);
      const isAuthErr = err.message?.includes('session has expired') || err.message?.includes('401') || err.message === 'AUTH_REQUIRED';
      const errorContent = isAuthErr
        ? 'Your session has expired. Please sign in again.'
        : (err.message || "Sorry, I couldn't generate a response. Please try again.");

      setMessages((prev) =>
        prev.filter((m) => !m.id.startsWith('stream-')).concat({
          id: 'err-' + Date.now(),
          conversation_id: activeConvId || 'temp',
          user_id: 'system',
          role: 'assistant',
          content: errorContent,
          created_at: new Date().toISOString(),
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSuggestedQuestion = async (question: string) => {
    await handleSendMessage(question, undefined, undefined, 'text', undefined);
  };

  const handleRetry = async () => {
    if (lastFailedQuery) {
      setMessages((prev) => prev.filter((m) => m.user_id !== 'system'));
      await handleSendMessage(lastFailedQuery);
    }
  };

  return (
    <div className="flex-1 flex h-full min-w-0 bg-[#080B14] overflow-hidden relative">
      {/* Main Chat Workspace */}
      <ChatWindow
        messages={messages}
        activeImage={activeImage}
        isLoading={isLoading}
        loadingStatus={loadingStatus}
        onSendMessage={handleSendMessage}
        onSelectImage={(img) => {
          setActiveImage(img);
          setSelectedRegion(null);
          setSelectedObject(null);
        }}
        onRetry={handleRetry}
        onSpeak={(text, lang) => handleSpeakMessage(text, lang)}
        speakingMessageId={speakingMessageId}
        isSpeaking={isSpeaking}
        onStopSpeaking={handleStopSpeaking}
        isVoiceMode={isVoiceMode}
        onToggleVoiceMode={() => setIsVoiceMode(!isVoiceMode)}
        onSelectSuggestedQuestion={handleSelectSuggestedQuestion}
        selectedRegion={selectedRegion}
        selectedObject={selectedObject}
        onSelectRegion={handleSelectRegion}
        onClearRegion={handleClearRegion}
        onActionClick={handleActionClick}
      />

      {/* Floating Analysis Action for Mobile/Tablet (< lg) when an image is active */}
      {activeImage && (
        <button
          onClick={() => setIsMobileAnalysisOpen(true)}
          className="lg:hidden fixed bottom-24 right-4 z-30 px-3.5 py-2 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] text-white text-xs font-semibold shadow-xl shadow-[#8B5CF6]/30 flex items-center gap-1.5 border border-white/20 animate-in fade-in slide-in-from-bottom-2"
          aria-label="View Visual Analysis"
        >
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>View Telemetry</span>
        </button>
      )}

      {/* Desktop Visual Telemetry Panel (Permanent for >= lg) */}
      <div className="hidden lg:flex h-full shrink-0">
        <AnalysisPanel
          activeImage={activeImage}
          onOpenCompare={() => setIsCompareOpen(true)}
          selectedRegion={selectedRegion}
          selectedObject={selectedObject}
          onClearRegion={handleClearRegion}
          onReanalyze={async () => {
            if (activeImage) {
              const fresh = await api.getImageAnalysis(activeImage.id);
              activeImage.analysis = fresh;
              setActiveImage({ ...activeImage });
            }
          }}
        />
      </div>

      {/* Mobile & Tablet Drawer / Modal for Visual Telemetry (< lg) */}
      {isMobileAnalysisOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileAnalysisOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          />

          {/* Slide-in Content Container */}
          <div className="relative w-full max-w-md sm:max-w-lg h-full bg-[#080B14] shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
            <AnalysisPanel
              activeImage={activeImage}
              onClose={() => setIsMobileAnalysisOpen(false)}
              onOpenCompare={() => {
                setIsMobileAnalysisOpen(false);
                setIsCompareOpen(true);
              }}
              selectedRegion={selectedRegion}
              selectedObject={selectedObject}
              onClearRegion={handleClearRegion}
              onReanalyze={async () => {
                if (activeImage) {
                  const fresh = await api.getImageAnalysis(activeImage.id);
                  activeImage.analysis = fresh;
                  setActiveImage({ ...activeImage });
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      <ImageComparisonModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        availableImages={images}
        defaultImage1={activeImage}
      />
    </div>
  );
};
