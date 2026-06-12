export interface SessionMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  name?: string;
}

export interface Session {
  id: string;
  type: 'private' | 'group';
  user_id: number;
  group_id: number | null;
  messages: SessionMessage[];
  mood: number;
  created_at: number;
  updated_at: number;
}

export { SessionStore } from './store';
