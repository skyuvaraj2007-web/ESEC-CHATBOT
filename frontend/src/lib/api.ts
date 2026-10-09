import {
  ApiResponse,
  ConversationModel,
  ConversationDetail,
  ImageModel,
  ImageAnalysisData,
  ChatResponseData,
  CompareResponseData,
  InsightsData,
  UserProfile,
} from '@/types';
import { supabase } from './supabase';

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
// Strip any trailing slashes to avoid double-slash URL construction
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/+$/, '');

/**
 * Retrieves a valid Supabase access token, attempting a silent refresh if needed.
 * Returns null if no active or refreshable session exists.
 */
export async function getValidAccessToken(): Promise<string | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.access_token) {
      return sessionData.session.access_token;
    }

    const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
    if (refreshErr) {
      console.warn('[API] Supabase session refresh notice:', refreshErr.message);
      return null;
    }

    return refreshData.session?.access_token ?? null;
  } catch (err) {
    console.warn('[API] getValidAccessToken error:', err);
    return null;
  }
}

/**
 * Constructs standard headers including Authorization Bearer token when available.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getValidAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Formats user-friendly network or HTTP error messages.
 */
function formatNetworkError(err: any): string {
  if (!err) return 'An unexpected error occurred.';
  const message = String(err.message || err);
  if (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('Network request failed') ||
    err.name === 'TypeError'
  ) {
    return 'Unable to reach the VisionAI backend. If using Render free tier, the server may be waking from sleep (takes ~30-45s). Please wait a moment and click Retry.';
  }
  return message;
}

/**
 * Production resilient API request handler with automatic token resolution,
 * single-retry 401 refresh lifecycle, and clean AUTH_REQUIRED propagation.
 */
async function request<T>(path: string, options: RequestInit = {}, retryCount = 0): Promise<T> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${BACKEND_URL}${cleanPath}`;
  const isPublicAuthEndpoint =
    cleanPath.startsWith('/api/auth/') ||
    cleanPath.startsWith('/api/tts') ||
    cleanPath === '/api/chat/translate' ||
    cleanPath === '/health';

  const token = await getValidAccessToken();
  if (!token && !isPublicAuthEndpoint) {
    throw new Error('AUTH_REQUIRED');
  }

  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = isFormData
    ? { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    : {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string> || {}),
      };

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    throw new Error(formatNetworkError(netErr));
  }

  if (!response.ok) {
    // On 401 for protected endpoints, attempt refresh & retry once
    if (response.status === 401 && !isPublicAuthEndpoint && retryCount === 0) {
      try {
        const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr && refreshData.session?.access_token) {
          return request<T>(cleanPath, options, retryCount + 1);
        }
      } catch {
        // Fall through to AUTH_REQUIRED
      }
      throw new Error('AUTH_REQUIRED');
    }

    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson.error?.message) {
        errorMsg = errorJson.error.message;
      } else if (errorJson.detail) {
        errorMsg = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
      }
    } catch {
      // Fallback descriptions for common HTTP status codes
      if (response.status === 413) {
        errorMsg = 'Uploaded file is too large. Please select an image under 10MB.';
      } else if (response.status === 429) {
        errorMsg = 'Rate limit reached. Please slow down and retry shortly.';
      } else if (response.status >= 500) {
        errorMsg = 'VisionAI backend service encountered an issue. Please try again.';
      }
    }

    if (response.status === 401) {
      throw new Error('AUTH_REQUIRED');
    }

    throw new Error(errorMsg);
  }

  const resJson: ApiResponse<T> = await response.json();
  if (resJson.success === false) {
    throw new Error(resJson.error?.message || 'API request failed');
  }

  return resJson.data as T;
}

export const api = {
  // Health
  checkHealth: async () => {
    const res = await fetch(`${BACKEND_URL}/health`);
    return res.json();
  },

  // Conversations
  createConversation: async (title: string = 'New Visual Chat'): Promise<ConversationModel> => {
    return request<ConversationModel>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

  getConversations: async (): Promise<ConversationModel[]> => {
    return request<ConversationModel[]>('/api/conversations', {
      method: 'GET',
    });
  },

  getConversation: async (conversationId: string): Promise<ConversationDetail> => {
    return request<ConversationDetail>(`/api/conversations/${conversationId}`, {
      method: 'GET',
    });
  },

  deleteConversation: async (conversationId: string): Promise<boolean> => {
    return request<boolean>(`/api/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  },

  // Images
  uploadImage: async (file: File | Blob, conversationId?: string): Promise<ImageModel> => {
    const formData = new FormData();
    formData.append('file', file);
    if (conversationId) {
      formData.append('conversation_id', conversationId);
    }

    return request<ImageModel>('/api/images/upload', {
      method: 'POST',
      body: formData,
    });
  },

  getImageAnalysis: async (imageId: string): Promise<ImageAnalysisData> => {
    return request<ImageAnalysisData>(`/api/images/${imageId}/analysis`, {
      method: 'GET',
    });
  },

  analyzeImage: async (imageId: string, prompt?: string): Promise<ImageAnalysisData> => {
    return request<ImageAnalysisData>(`/api/images/${imageId}/analyze`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  },

  // Chat
  sendChatMessage: async (params: {
    conversation_id?: string;
    message: string;
    image_id?: string;
    image_base64?: string;
    input_mode?: 'text' | 'voice' | string;
    language?: string;
    selected_region?: { x: number; y: number; width: number; height: number; unit?: 'percent' | 'pixel' };
    selected_object?: { label?: string | null; confidence?: number | null; bbox?: number[] | null };
  }): Promise<ChatResponseData> => {
    return request<ChatResponseData>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  streamChatMessage: async (
    params: {
      conversation_id?: string;
      message: string;
      image_id?: string;
      image_base64?: string;
      input_mode?: 'text' | 'voice' | string;
      language?: string;
      selected_region?: { x: number; y: number; width: number; height: number; unit?: 'percent' | 'pixel' };
      selected_object?: { label?: string | null; confidence?: number | null; bbox?: number[] | null };
    },
    onChunk: (chunk: string) => void,
    onComplete: (data: { conversation_id: string; message: any; analysis?: ImageAnalysisData | null; tools_used?: any; suggested_questions?: string[] }) => void,
    onError: (err: Error) => void,
    retryCount = 0
  ): Promise<void> => {
    try {
      const url = `${BACKEND_URL}/api/chat/stream`;
      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('AUTH_REQUIRED');
      }

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(params),
        });
      } catch (fetchErr: any) {
        throw new Error(formatNetworkError(fetchErr));
      }

      if (response.status === 401 && retryCount === 0) {
        const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr && refreshData.session?.access_token) {
          return api.streamChatMessage(params, onChunk, onComplete, onError, retryCount + 1);
        }
        throw new Error('AUTH_REQUIRED');
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('AUTH_REQUIRED');
        }
        throw new Error(`Chat stream request failed (HTTP ${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Streaming response body is unavailable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(trimmed.slice(6));
              if (eventData.type === 'chunk' && eventData.text) {
                onChunk(eventData.text);
              } else if (eventData.type === 'done') {
                onComplete(eventData);
              } else if (eventData.type === 'error') {
                onError(new Error(eventData.error || 'Streaming error'));
              }
            } catch (e) {
              // ignore partial lines
            }
          }
        }
      }
    } catch (err: any) {
      onError(err);
    }
  },

  // Compare
  compareImages: async (params: {
    image_id_1: string;
    image_id_2: string;
    prompt?: string;
  }): Promise<CompareResponseData> => {
    return request<CompareResponseData>('/api/compare', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // Insights
  getInsights: async (): Promise<InsightsData> => {
    return request<InsightsData>('/api/insights', {
      method: 'GET',
    });
  },

  // Profile
  getProfile: async (): Promise<UserProfile> => {
    return request<UserProfile>('/api/auth/me', {
      method: 'GET',
    });
  },

  updateProfile: async (params: { full_name?: string; avatar_url?: string }): Promise<UserProfile> => {
    return request<UserProfile>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(params),
    });
  },

  // Demo OTP Mode
  generateDemoOtp: async (params: {
    email: string;
    password?: string;
    fullName?: string;
    phone?: string;
  }): Promise<{ otp: string; expires_in_seconds: number; demo_mode: boolean; message: string }> => {
    return request<{ otp: string; expires_in_seconds: number; demo_mode: boolean; message: string }>('/api/auth/demo-otp/generate', {
      method: 'POST',
      body: JSON.stringify({
        email: params.email,
        password: params.password,
        full_name: params.fullName,
        phone: params.phone,
      }),
    });
  },

  verifyDemoOtp: async (email: string, otp: string): Promise<{ verified: boolean; email: string; password?: string; message: string }> => {
    return request<{ verified: boolean; email: string; password?: string; message: string }>('/api/auth/demo-otp/verify', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  },

  resendDemoOtp: async (params: {
    email: string;
    password?: string;
    fullName?: string;
  }): Promise<{ otp: string; expires_in_seconds: number; demo_mode: boolean; message: string }> => {
    return request<{ otp: string; expires_in_seconds: number; demo_mode: boolean; message: string }>('/api/auth/demo-otp/resend', {
      method: 'POST',
      body: JSON.stringify({
        email: params.email,
        password: params.password,
        full_name: params.fullName,
      }),
    });
  },

  // Text-to-Speech (Neural Voice Synthesis)
  synthesizeSpeech: async (params: {
    text: string;
    language?: string;
    gender?: 'female' | 'male';
    rate?: string;
  }): Promise<{ audioBlob: Blob; detectedLanguage: string; voiceId: string }> => {
    const token = await getValidAccessToken();
    const url = `${BACKEND_URL}/api/tts/synthesize`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text: params.text,
        language: params.language || 'auto',
        gender: params.gender || 'female',
        rate: params.rate || '+0%',
      }),
    });

    if (!response.ok) {
      let errorMsg = `Voice synthesis failed (${response.status})`;
      try {
        const errJson = await response.json();
        errorMsg = errJson.detail || errJson.error?.message || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    const detectedLanguage = response.headers.get('X-Detected-Language') || 'en';
    const voiceId = response.headers.get('X-Voice-Id') || 'neural';
    const audioBlob = await response.blob();

    return { audioBlob, detectedLanguage, voiceId };
  },

  // Multilingual Response Translation
  translateResponse: async (params: {
    text: string;
    targetLanguage: string;
    sourceLanguage?: string;
    conversationId?: string;
  }): Promise<{ translated_text: string; target_language: string; voice_id: string; original_text: string }> => {
    return request<{ translated_text: string; target_language: string; voice_id: string; original_text: string }>(
      '/api/chat/translate',
      {
        method: 'POST',
        body: JSON.stringify({
          text: params.text,
          target_language: params.targetLanguage,
          source_language: params.sourceLanguage || 'auto',
          conversation_id: params.conversationId,
        }),
      }
    );
  },
};

