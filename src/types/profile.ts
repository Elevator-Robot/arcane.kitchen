export interface User {
  id?: string;
  name: string;
  handle: string;
  bio?: string;
  location?: string;
  joinDate?: string;
  avatarUrl?: string;
  usernameAvailableDate?: string;
  stats?: {
    recipes: number;
    drafts: number;
    likes: number;
    saved: number;
  };
}

export interface Recipe {
  id: string | number;
  title: string;
  time?: string;
  image?: string;
  likes?: number;
  comments?: number;
  saves?: number;
}

export interface Draft {
  id: string | number;
  title: string;
  lastEdited?: string;
  image?: string;
}
