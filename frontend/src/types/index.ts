export interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

export interface DetectedObject {
  name: string;
  confidence: number;
  box?: BoundingBox | null;
  color?: string | null;
}

export interface OCRResult {
  text: string;
  confidence: number;
}

export interface ImageAnalysisData {
  description: string;
  scene: string;
  objects: DetectedObject[];
  ocr_text: string;
  confidence: number;
  analysis_json?: Record<string, any> | null;
}

export interface ImageModel {
  id: string;
  conversation_id?: string | null;
  user_id: string;
  storage_path: string;
  public_url: string;
  file_name: string;
  mime_type: string;
  file_size?: number | null;
  width?: number | null;
  height?: number | null;
  created_at?: string | null;
  analysis?: ImageAnalysisData | null;
}

export interface SelectedRegion {
  x: number; // percentage (0-100) or pixel
  y: number; // percentage (0-100) or pixel
  width: number; // percentage (0-100) or pixel
  height: number; // percentage (0-100) or pixel
  unit?: 'percent' | 'pixel';
}

export interface SelectedObjectContext {
  label?: string | null;
  confidence?: number | null;
  bbox?: number[] | null;
}

export interface MessageModel {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  image_id?: string | null;
  image?: ImageModel | null;
  input_mode?: 'text' | 'voice' | 'voice_response' | string | null;
  language?: string | null;
  input_language?: string | null;
  response_language?: string | null;
  style?: string | null;
  tools_used?: {
    gemini: boolean;
    yolo: boolean;
    ocr: boolean;
    mode?: string;
    reason?: string;
    has_selection?: boolean;
    selected_region?: SelectedRegion;
    selected_object?: SelectedObjectContext;
  } | null;
  suggested_questions?: string[] | null;
  created_at?: string | null;
}

export interface ConversationModel {
  id: string;
  user_id: string;
  title: string;
  created_at?: string | null;
  updated_at?: string | null;
  image_count: number;
  message_count: number;
}

export interface ConversationDetail extends ConversationModel {
  messages: MessageModel[];
  images: ImageModel[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface ChatResponseData {
  conversation_id: string;
  message: MessageModel;
  analysis?: ImageAnalysisData | null;
  tools_used?: {
    gemini: boolean;
    yolo: boolean;
    ocr: boolean;
    mode?: string;
    reason?: string;
  } | null;
  suggested_questions?: string[] | null;
}

export interface CompareResponseData {
  comparison: string;
  image_1_summary: string;
  image_2_summary: string;
  similarities: string[];
  differences: string[];
}

export interface InsightsData {
  total_images: number;
  total_conversations: number;
  total_messages: number;
  total_objects_detected: number;
  average_confidence: number;
  detected_classes_breakdown: Record<string, number>;
  recent_activity: Array<{
    id: string;
    conversation_id: string;
    title: string;
    role: string;
    content: string;
    created_at?: string;
  }>;
}

export interface UserProfile {
  id: string;
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
}
