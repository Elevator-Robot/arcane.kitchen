import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { randomMerlinColor } from '../theme/merlinPalette';
import ProfileDropdown from './ProfileDropdown';

const client: any = generateClient<Schema>();

type Props = {
  isAuthenticated: boolean;
  isAdmin: boolean;
  onBack: () => void;
  onSignOut?: () => void;
  profilePath?: string;
  profileLabel?: string;
  profileAvatar?: string | null;
};

type Recipe = { id: string; name: string; description?: string | null; ownerId: string };
type Comment = { id: string; recipeId: string; author: string; content: string; userId: string };
type UserProfile = {
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

const errorText = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.message && error.message !== '[object Object]') return error.message;
    const details = Object.fromEntries(Object.getOwnPropertyNames(error).map((key) => [key, (error as any)[key]]));
    if (Object.keys(details).length) return JSON.stringify(details);
    return '';
  }
  if (error == null) return '';
  if (typeof error === 'string') return error !== '[object Object]' ? error : '';
  if (error && typeof error === 'object') {
    const record = error as { message?: unknown; errors?: unknown; cause?: unknown; details?: unknown };
    for (const nested of [record.message, record.cause, record.details, record.errors]) {
      const message: string = errorText(nested);
      if (message) return message;
    }
    try { return JSON.stringify(error); } catch { /* use fallback */ }
  }
  return 'The admin operation failed.';
};

export default function AdminDashboard({
  isAuthenticated,
  isAdmin,
  onBack,
  onSignOut,
  profilePath = '/discover',
  profileLabel = 'Admin',
  profileAvatar = null,
}: Props) {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tab, setTab] = useState<'recipes' | 'comments' | 'users'>('recipes');
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [recipeForm, setRecipeForm] = useState({ name: '', description: '' });
  const [commentForm, setCommentForm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userListUnavailable, setUserListUnavailable] = useState(false);
  const [pendingUserAction, setPendingUserAction] = useState<string | null>(null);
  const [transferRecipeId, setTransferRecipeId] = useState('');
  const [transferOwnerId, setTransferOwnerId] = useState('');

  const loadContent = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    const hasAdminUserQuery = typeof client.queries?.listAdminUsers === 'function';
    setUserListUnavailable(!hasAdminUserQuery);
    try {
      const [recipeResult, commentResult, userResult] = await Promise.all([
        client.models.Recipe.list({ authMode: 'userPool' }),
        client.models.Comment.list({ authMode: 'userPool' }),
        hasAdminUserQuery
          ? client.queries.listAdminUsers({ authMode: 'userPool' })
          : Promise.resolve({ data: [] }),
      ]);
      const queryErrors = [recipeResult, commentResult, userResult]
        .flatMap((result: any) => result.errors ?? [])
        .map((queryError: any) => errorText(queryError))
        .filter(Boolean);
      if (queryErrors.length) {
        throw new Error(queryErrors.join(', '));
      }
      setRecipes((recipeResult.data ?? []) as Recipe[]);
      setComments((commentResult.data ?? []) as Comment[]);
      setUsers(((userResult.data ?? []) as UserProfile[]).map((user) => ({ ...user, id: user.id || user.userId })));
    } catch (loadError) {
      setError(errorText(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadContent(); }, [isAdmin]);

  const removeRecipe = async (recipe: Recipe) => {
    if (!window.confirm(`ADMIN ACTION: permanently delete “${recipe.name}” for everyone?`)) return;
    try {
      await client.models.Recipe.delete({ id: recipe.id }, { authMode: 'userPool' });
      setRecipes((current) => current.filter((entry) => entry.id !== recipe.id));
    } catch (operationError) { setError(errorText(operationError)); }
  };

  const saveRecipe = async () => {
    if (!editingRecipe || !recipeForm.name.trim()) return;
    try {
      const result = await client.models.Recipe.update({
        id: editingRecipe.id,
        name: recipeForm.name.trim(),
        description: recipeForm.description.trim() || null,
      }, { authMode: 'userPool' });
      const updated = result.data as Recipe;
      setRecipes((current) => current.map((entry) => entry.id === updated.id ? { ...entry, ...updated } : entry));
      setEditingRecipe(null);
    } catch (operationError) { setError(errorText(operationError)); }
  };

  const removeComment = async (comment: Comment) => {
    if (!window.confirm('ADMIN ACTION: permanently delete this comment for everyone?')) return;
    try {
      await client.models.Comment.delete({ id: comment.id }, { authMode: 'userPool' });
      setComments((current) => current.filter((entry) => entry.id !== comment.id));
    } catch (operationError) { setError(errorText(operationError)); }
  };

  const saveComment = async () => {
    if (!editingComment || !commentForm.trim()) return;
    try {
      const result = await client.models.Comment.update({ id: editingComment.id, content: commentForm.trim() }, { authMode: 'userPool' });
      const updated = result.data as Comment;
      setComments((current) => current.map((entry) => entry.id === updated.id ? { ...entry, ...updated } : entry));
      setEditingComment(null);
    } catch (operationError) { setError(errorText(operationError)); }
  };

  const moderateUser = async (user: UserProfile, action: 'delete' | 'ban' | 'unban' | 'hideContent' | 'restoreContent' | 'restore') => {
    const descriptions = {
      delete: 'disable this user and hide their content',
      ban: 'disable this user and hide their content',
      unban: 're-enable this user without deleting their records',
      hideContent: 'hide this user\'s recipes and comments without disabling access',
      restoreContent: 'restore this user\'s recipe and comment visibility without changing account access',
      restore: 're-enable this user and restore their content visibility',
    };
    if (!window.confirm(`ADMIN ACTION: ${descriptions[action]}?\n\nUser: ${user.displayName} (${user.userId})`)) return;
    setPendingUserAction(`${action}:${user.userId}`);
    setError(null);
    try {
      const result = await client.mutations.adminActions({ action, userId: user.userId }, { authMode: 'userPool' });
      if (result.errors?.length) throw new Error(result.errors.map((operationError: any) => errorText(operationError)).join(', '));
      if (result.data?.success === false) throw new Error(result.data.message);
      setUsers((current) => current.map((entry) => entry.userId === user.userId ? {
        ...entry,
        isBanned: action === 'ban' ? true : action === 'unban' || action === 'restore' ? false : entry.isBanned,
        isDeleted: action === 'delete' ? true : action === 'restore' ? false : entry.isDeleted,
        contentHidden: ['ban', 'delete', 'hideContent'].includes(action)
          ? true
          : action === 'restoreContent' || action === 'restore' ? false : entry.contentHidden,
      } : entry));
    } catch (operationError) { setError(errorText(operationError)); }
    finally { setPendingUserAction(null); }
  };

  const transferOwnership = async () => {
    if (!transferRecipeId || !transferOwnerId) return;
    const recipe = recipes.find((entry) => entry.id === transferRecipeId);
    const destination = users.find((entry) => entry.userId === transferOwnerId);
    if (!recipe || !destination) return;
    if (!window.confirm(`ADMIN ACTION: transfer “${recipe.name}” from ${recipe.ownerId} to ${destination.displayName} (${destination.userId})?`)) return;
    setPendingUserAction('transferOwnership');
    setError(null);
    try {
      const result = await client.models.Recipe.update({
        id: recipe.id,
        ownerId: destination.userId,
      }, { authMode: 'userPool' });
      if (result.errors?.length) throw new Error(result.errors.map((operationError: any) => errorText(operationError)).join(', '));
      setRecipes((current) => current.map((entry) => entry.id === recipe.id ? { ...entry, ownerId: destination.userId } : entry));
      setTransferRecipeId('');
      setTransferOwnerId('');
    } catch (operationError) { setError(errorText(operationError)); }
    finally { setPendingUserAction(null); }
  };

  if (!isAuthenticated || !isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--theme-bg)] p-6 text-[var(--theme-text)]">
        <section className="max-w-lg rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-8 text-center shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">Restricted area</p>
          <h1 className="mt-3 text-3xl font-semibold">Administrator access required</h1>
          <p className="mt-3 text-sm text-[var(--theme-text-muted)]">{!isAuthenticated ? 'Sign in with an administrator account to continue.' : 'This account is not a member of the Admins group.'}</p>
          <button onClick={onBack} className="mt-6 rounded-full bg-[var(--theme-accent)] px-5 py-3 text-sm font-semibold text-white">Return home</button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <header className="sticky top-0 z-20 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/92 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between px-4 py-1 lg:px-6">
          <button onClick={onBack} aria-label="Go to Discover" className="mt-2 flex items-center gap-2 rounded-md p-0.5 transition active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)]">
            <img src="/logo-no-background.svg" alt="" draggable={false} className="h-14 w-14 object-contain brightness-[0.3]" />
            <span className="font-heading text-base font-semibold">Arcane Kitchen</span>
          </button>
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 md:flex">
            <button onClick={onBack} className="rounded-md border-b-2 border-transparent px-4 py-1.5 text-sm font-medium text-[var(--theme-text-muted)] transition hover:text-[var(--theme-text)]">Discover</button>
            <button onClick={() => navigate('/build')} className="rounded-md border-b-2 border-transparent px-4 py-1.5 text-sm font-medium text-[var(--theme-text-muted)] transition hover:text-[var(--theme-text)]">Build</button>
          </nav>
          <ProfileDropdown profilePath={profilePath} profileLabel={profileLabel} profileAvatar={profileAvatar} isAdmin={isAdmin} onSignOut={onSignOut || (() => undefined)} />
        </div>
      </header>

      <div className="px-4 py-6 sm:px-8"><div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-semibold">Moderation desk</h1><p className="mt-2 text-sm text-[var(--theme-text-muted)]">Every action here uses administrator privileges.</p></div></header>
        <div className="mt-6 grid gap-4 md:grid-cols-3"><Stat label="Recipes" value={recipes.length} active={tab === 'recipes'} onClick={() => setTab('recipes')} /><Stat label="Comments" value={comments.length} active={tab === 'comments'} onClick={() => setTab('comments')} /><Stat label="Users" value={users.length} active={tab === 'users'} onClick={() => setTab('users')} /></div>
        {error && <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        <section className="mt-6 rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 sm:p-6">
          <div className="flex justify-end"><button onClick={() => void loadContent()} disabled={loading} className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-sm">{loading ? 'Refreshing...' : 'Refresh'}</button></div>
          {tab === 'recipes' && <RecipeList recipes={recipes} editingRecipe={editingRecipe} recipeForm={recipeForm} setEditingRecipe={setEditingRecipe} setRecipeForm={setRecipeForm} saveRecipe={saveRecipe} removeRecipe={removeRecipe} loading={loading} />}
          {tab === 'comments' && <CommentList comments={comments} editingComment={editingComment} commentForm={commentForm} setEditingComment={setEditingComment} setCommentForm={setCommentForm} saveComment={saveComment} removeComment={removeComment} loading={loading} />}
          {tab === 'users' && <UserTable users={users} loading={loading} unavailable={userListUnavailable} onModerateUser={moderateUser} pendingUserAction={pendingUserAction} />}
        </section>
        {tab === 'recipes' && <section className="mt-6 rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6"><h2 className="font-semibold">Ownership transfer</h2><p className="mt-2 text-sm text-[var(--theme-text-muted)]">Transfer recipe ownership through the administrator-only backend operation. The original creator metadata is retained.</p><div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]"><select value={transferRecipeId} onChange={(event) => setTransferRecipeId(event.target.value)} className="rounded-xl border border-[var(--theme-border)] bg-transparent px-3 py-2 text-sm"><option value="">Select a recipe</option>{recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name} · {recipe.ownerId}</option>)}</select><select value={transferOwnerId} onChange={(event) => setTransferOwnerId(event.target.value)} className="rounded-xl border border-[var(--theme-border)] bg-transparent px-3 py-2 text-sm"><option value="">Select a destination user</option>{users.map((user) => <option key={user.userId} value={user.userId}>{user.displayName} · {user.userId}</option>)}</select><button onClick={() => void transferOwnership()} disabled={!transferRecipeId || !transferOwnerId || pendingUserAction !== null} className="rounded-full bg-[var(--theme-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pendingUserAction === 'transferOwnership' ? 'Transferring...' : 'Transfer ownership'}</button></div></section>}
      </div></div>
    </main>
  );
}

function Stat({ label, value, active, onClick }: { label: string; value: number; active: boolean; onClick: () => void }) {
  const [activeColor, setActiveColor] = useState(randomMerlinColor);

  return <button type="button" onClick={() => { setActiveColor(randomMerlinColor()); onClick(); }} aria-pressed={active} style={active ? { backgroundColor: activeColor, borderColor: activeColor } : undefined} className={`rounded-2xl border p-4 text-left transition ${active ? 'text-white shadow-lg' : 'border-[var(--theme-border)] bg-[var(--theme-surface)] hover:border-[var(--theme-accent)]'}`}><p className={`text-xs uppercase ${active ? 'text-white/80' : 'text-[var(--theme-text-muted)]'}`}>{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p><p className={`mt-1 text-xs ${active ? 'text-white/80' : 'text-[var(--theme-text-muted)]'}`}>View {label.toLowerCase()}</p></button>;
}

function RecipeList({ recipes, editingRecipe, recipeForm, setEditingRecipe, setRecipeForm, saveRecipe, removeRecipe, loading }: any) {
  return <div className="mt-5 space-y-3">{recipes.map((recipe: Recipe) => <article key={recipe.id} className="rounded-2xl border border-[var(--theme-border)] p-4">{editingRecipe?.id === recipe.id ? <div className="grid gap-3"><input value={recipeForm.name} onChange={(event) => setRecipeForm({ ...recipeForm, name: event.target.value })} aria-label="Recipe name" className="rounded-xl border border-[var(--theme-border)] bg-transparent px-3 py-2" /><textarea value={recipeForm.description} onChange={(event) => setRecipeForm({ ...recipeForm, description: event.target.value })} aria-label="Recipe description" className="min-h-24 rounded-xl border border-[var(--theme-border)] bg-transparent px-3 py-2" /><div className="flex gap-2"><button onClick={() => void saveRecipe()} className="rounded-full bg-[var(--theme-accent)] px-4 py-2 text-sm font-semibold text-white">Save</button><button onClick={() => setEditingRecipe(null)} className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-sm">Cancel</button></div></div> : <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold">{recipe.name}</h2><p className="mt-1 text-sm text-[var(--theme-text-muted)]">Owner: {recipe.ownerId}</p><p className="mt-2 text-sm text-[var(--theme-text-muted)]">{recipe.description || 'No description'}</p></div><div className="flex gap-2"><button onClick={() => { setEditingRecipe(recipe); setRecipeForm({ name: recipe.name, description: recipe.description || '' }); }} className="rounded-full border border-[var(--theme-border)] px-3 py-2 text-sm text-[var(--theme-text-muted)]">Edit</button><button onClick={() => void removeRecipe(recipe)} className="rounded-full border border-red-400/40 px-3 py-2 text-sm text-red-200">Delete</button></div></div>}</article>)}{!recipes.length && !loading && <p className="py-8 text-center text-sm text-[var(--theme-text-muted)]">No recipes found.</p>}</div>;
}

function CommentList({ comments, editingComment, commentForm, setEditingComment, setCommentForm, saveComment, removeComment, loading }: any) {
  return <div className="mt-5 space-y-3">{comments.map((comment: Comment) => <article key={comment.id} className="rounded-2xl border border-[var(--theme-border)] p-4">{editingComment?.id === comment.id ? <div className="grid gap-3"><textarea value={commentForm} onChange={(event) => setCommentForm(event.target.value)} aria-label="Comment content" className="min-h-24 rounded-xl border border-[var(--theme-border)] bg-transparent px-3 py-2" /><div className="flex gap-2"><button onClick={() => void saveComment()} className="rounded-full bg-[var(--theme-accent)] px-4 py-2 text-sm font-semibold text-white">Save</button><button onClick={() => setEditingComment(null)} className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-sm">Cancel</button></div></div> : <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-semibold">{comment.author}</p><p className="mt-2 text-sm">{comment.content}</p><p className="mt-2 text-xs text-[var(--theme-text-muted)]">Recipe: {comment.recipeId} | User: {comment.userId}</p></div><div className="flex gap-2"><button onClick={() => { setEditingComment(comment); setCommentForm(comment.content); }} className="rounded-full border border-[var(--theme-border)] px-3 py-2 text-sm text-[var(--theme-text-muted)]">Edit</button><button onClick={() => void removeComment(comment)} className="rounded-full border border-red-400/40 px-3 py-2 text-sm text-red-200">Delete</button></div></div>}</article>)}{!comments.length && !loading && <p className="py-8 text-center text-sm text-[var(--theme-text-muted)]">No comments found.</p>}</div>;
}

function UserTable({ users, loading, unavailable, onModerateUser, pendingUserAction }: { users: UserProfile[]; loading: boolean; unavailable: boolean; onModerateUser: (user: UserProfile, action: 'delete' | 'ban' | 'unban' | 'hideContent' | 'restoreContent' | 'restore') => void; pendingUserAction: string | null }) {
  if (unavailable) {
    return <div className="mt-5 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-5 text-sm text-amber-100">The deployed backend does not include the admin Cognito user-list operation yet. Deploy the latest Amplify backend and reload this page.</div>;
  }

  return <div className="mt-5 max-h-[32rem] overflow-auto rounded-2xl border border-[var(--theme-border)]"><table className="min-w-full text-left text-sm"><thead className="sticky top-0 bg-[var(--theme-surface-alt)] text-xs uppercase text-[var(--theme-text-muted)]"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">User ID</th><th className="px-4 py-3">Cognito status</th><th className="px-4 py-3">Moderation</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-t border-[var(--theme-border)]"><td className="px-4 py-3"><div className="font-semibold">{user.displayName}</div><div className="text-[var(--theme-text-muted)]">{user.email || user.username}</div></td><td className="px-4 py-3 font-mono text-xs text-[var(--theme-text-muted)]">{user.userId}</td><td className="px-4 py-3">{user.status || 'UNKNOWN'}{user.enabled === false ? ' · Disabled' : ''}</td><td className="px-4 py-3">{user.isDeleted ? 'Deleted' : user.isBanned ? 'Banned' : user.contentHidden ? 'Content hidden' : 'Visible'}</td><td className="px-4 py-3"><div className="flex min-w-52 flex-wrap gap-2"><button disabled={pendingUserAction !== null} onClick={() => onModerateUser(user, user.isBanned ? 'unban' : 'ban')} className="rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-xs text-[var(--theme-text-muted)] disabled:opacity-50">{user.isBanned ? 'Unban' : 'Ban'}</button><button disabled={pendingUserAction !== null} onClick={() => onModerateUser(user, user.contentHidden ? 'restoreContent' : 'hideContent')} className="rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-xs text-[var(--theme-text-muted)] disabled:opacity-50">{user.contentHidden ? 'Restore content' : 'Hide content'}</button><button disabled={pendingUserAction !== null} onClick={() => onModerateUser(user, user.isDeleted ? 'restore' : 'delete')} className="rounded-full border border-red-400/40 px-3 py-1.5 text-xs text-red-200 disabled:opacity-50">{user.isDeleted ? 'Restore user' : 'Delete user'}</button></div></td></tr>)}</tbody></table>{!users.length && !loading && <p className="p-8 text-center text-sm text-[var(--theme-text-muted)]">No Cognito users found.</p>}</div>;
}
