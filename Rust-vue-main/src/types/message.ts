export type Message = {
  id: number;
  body: string;
  type: 'text' | 'image';
  attachment?: string;
  created_at: string;
  author_id: number;
  author_name: string;
  author_username?: string;
  author_avatar?: string;
};
