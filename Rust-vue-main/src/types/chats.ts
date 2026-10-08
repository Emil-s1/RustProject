import type { User } from './user';

export type Chat = {
  id: number;          // id собеседника — нужен текущему ChatSidebar для online
  chat_id: number;     // настоящий id чата на сервере
  title: string;
  username?: string;
  subtitle?: string;
  avatar?: string;
  user: User;
  last_message?: {
    id: number;
    text: string;
    created_at: string;
  } | null;
};
