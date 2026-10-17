export type AiMode = 'general' | 'thinking' | 'fast' | 'search' | 'maps' | 'science' | 'image';

export interface GroundingLink {
  title?: string;
  uri: string;
}

export interface MediaAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  type: 'image' | 'video' | 'file';
  previewUrl: string;
  base64Data: string;
  duration?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'model' | 'system';
  content: string;
  model?: string;
  mode?: AiMode;
  imageUri?: string;
  videoUri?: string;
  attachments?: MediaAttachment[];
  groundingLinks?: GroundingLink[];
  thinkingProcess?: string;
  audioUri?: string;
  editedAt?: any;
  createdAt: any;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  model: string;
  mode: AiMode;
  createdAt: any;
  updatedAt: any;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string;
  theme?: 'light' | 'dark' | 'system';
  customInstructions?: string;
  defaultMode?: AiMode;
  createdAt?: any;
  updatedAt?: any;
}

export * from '../types.ts';
