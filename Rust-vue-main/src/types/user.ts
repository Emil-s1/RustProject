export type User = {
  id: number;
  display_name: string;
  username: string;
  status: string;
  avatar: string;
  last_seen?: string | null;
};
