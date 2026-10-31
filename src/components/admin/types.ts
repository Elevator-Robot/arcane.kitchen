export type AdminRecipe = {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  createdBy?: string | null;
  isHidden?: boolean | null;
};

export type AdminComment = {
  id: string;
  recipeId: string;
  author: string;
  content: string;
  userId: string;
  isHidden?: boolean | null;
};

export type AdminUserProfile = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  email?: string | null;
  status?: string | null;
  enabled?: boolean | null;
  isBanned?: boolean | null;
  isDeleted?: boolean | null;
  contentHidden?: boolean | null;
};

export type AdminTab = 'recipes' | 'comments' | 'users' | 'activity';

export type ModerationAction =
  | 'delete'
  | 'ban'
  | 'unban'
  | 'hideContent'
  | 'restoreContent'
  | 'restore';

export type AdminAuditEntry = {
  id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
};
