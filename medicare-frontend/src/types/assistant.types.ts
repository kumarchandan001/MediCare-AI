/**
 * AI Assistant Types — Chat & conversational AI models
 */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  metadata?: {
    confidence?: number;
    sources?: string[];
    follow_ups?: string[];
  };
}

export interface ChatContext {
  session_id: string;
  messages_count: number;
  health_context_loaded: boolean;
  last_activity: string;
}

export interface SuggestedQuestion {
  id: string;
  text: string;
  category: string;
  icon: string;
}
