import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

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

const errorText = (error: unknown) => error instanceof Error ? error.message : 'The admin operation failed.';

function Notice({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">{children}</div>;
}

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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
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

  const avatarEntries = useMemo(
    () => Object.entries(import.meta.glob<{ default: string }>('/src/assets/avatars/*.webp', { eager: true })).map(([path, module]) => ({
      file: path.split('/').pop()!,
      url: module.default,
    })),
    [],
  );
  const avatarUrl = profileAvatar ? avatarEntries.find((entry) => entry.file === profileAvatar)?.url : undefined;

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
        .map((queryError: any) => queryError.message)
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
          <div className="relative">
            <button onClick={() => setShowProfileMenu((current) => !current)} aria-expanded={showProfileMenu} className="group flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-[var(--theme-surface-alt)]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--theme-accent)] text-sm font-semibold text-white shadow-md">{avatarUrl ? <img src={avatarUrl} alt="" loading="lazy" className="h-full w-full rounded-full object-cover" /> : profileLabel.charAt(0).toUpperCase()}</span>
              <span className="hidden max-w-[120px] truncate text-sm font-medium sm:inline">{profileLabel}</span>
              <svg className={`h-4 w-4 text-[var(--theme-text-muted)] transition ${showProfileMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showProfileMenu && <div className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] py-1 shadow-lg">
              <button onClick={() => { navigate(profilePath); setShowProfileMenu(false); }} className="flex w-full px-4 py-2 text-left text-sm transition hover:bg-[var(--theme-surface-alt)]">Profile</button>
              <button onClick={() => setShowProfileMenu(false)} className="flex w-full px-4 py-2 text-left text-sm font-medium text-[var(--theme-accent)] transition hover:bg-[var(--theme-surface-alt)]">Admin dashboard</button>
              <div className="my-1 border-t border-[var(--theme-border)]" />
              <a href="https://x.com/ElevatorRobot" target="_blank" rel="noopener noreferrer" className="flex w-full px-4 py-2 text-left text-sm transition hover:bg-[var(--theme-surface-alt)]">Feedback &amp; Support</a>
              {onSignOut && <button onClick={onSignOut} className="flex w-full px-4 py-2 text-left text-sm transition hover:bg-[var(--theme-surface-alt)]">Logout</button>}
            </div>}
          </div>
        </div>
      </header>

      <div className="px-4 py-6 sm:px-8"><div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Admin console</p><h1 className="mt-2 text-3xl font-semibold">Moderation desk</h1><p className="mt-2 text-sm text-[var(--theme-text-muted)]">Every action here uses administrator privileges.</p></div></header>
        <div className="mt-6 grid gap-4 md:grid-cols-4"><Notice><strong>Admin privileges active.</strong><br />Changes can affect other users and may not be reversible.</Notice><Stat label="Recipes" value={recipes.length} /><Stat label="Comments" value={comments.length} /><Stat label="Users" value={users.length} /></div>
        {error && <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}
        <section className="mt-6 rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 sm:p-6">
          <div className="flex flex-wrap justify-between gap-3"><div className="flex gap-2"><TabButton active={tab === 'recipes'} onClick={() => setTab('recipes')}>Recipes</TabButton><TabButton active={tab === 'comments'} onClick={() => setTab('comments')}>Comments</TabButton><TabButton active={tab === 'users'} onClick={() => setTab('users')}>Users</TabButton></div><button onClick={() => void loadContent()} disabled={loading} className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-sm">{loading ? 'Refreshing...' : 'Refresh'}</button></div>
          {tab === 'recipes' && <RecipeList recipes={recipes} editingRecipe={editingRecipe} recipeForm={recipeForm} setEditingRecipe={setEditingRecipe} setRecipeForm={setRecipeForm} saveRecipe={saveRecipe} removeRecipe={removeRecipe} loading={loading} />}
          {tab === 'comments' && <CommentList comments={comments} editingComment={editingComment} commentForm={commentForm} setEditingComment={setEditingComment} setCommentForm={setCommentForm} saveComment={saveComment} removeComment={removeComment} loading={loading} />}
          {tab === 'users' && <UserTable users={users} loading={loading} unavailable={userListUnavailable} />}
        </section>
        <section className="mt-6 rounded-3xl border border-dashed border-[var(--theme-border)] p-6"><h2 className="font-semibold">User actions and ownership transfers</h2><p className="mt-2 text-sm text-[var(--theme-text-muted)]">These mutations remain disabled until the backend-enforced Cognito operations, audit logging, content filtering, and safe ownership-transfer transaction are connected.</p></section>
      </div></div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4"><p className="text-xs uppercase text-[var(--theme-text-muted)]">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button onClick={onClick} className={`rounded-full px-4 py-2 text-sm font-semibold ${active ? 'bg-[var(--theme-accent)] text-white' : 'border border-[var(--theme-border)]'}`}>{children}</button>;
}

function RecipeList({ recipes, editingRecipe, recipeForm, setEditingRecipe, setRecipeForm, saveRecipe, removeRecipe, loading }: any) {
  return <div className="mt-5 space-y-3">{recipes.map((recipe: Recipe) => <article key={recipe.id} className="rounded-2xl border border-[var(--theme-border)] p-4">{editingRecipe?.id === recipe.id ? <div className="grid gap-3"><input value={recipeForm.name} onChange={(event) => setRecipeForm({ ...recipeForm, name: event.target.value })} aria-label="Recipe name" className="rounded-xl border border-[var(--theme-border)] bg-transparent px-3 py-2" /><textarea value={recipeForm.description} onChange={(event) => setRecipeForm({ ...recipeForm, description: event.target.value })} aria-label="Recipe description" className="min-h-24 rounded-xl border border-[var(--theme-border)] bg-transparent px-3 py-2" /><div className="flex gap-2"><button onClick={() => void saveRecipe()} className="rounded-full bg-[var(--theme-accent)] px-4 py-2 text-sm font-semibold text-white">Save admin edit</button><button onClick={() => setEditingRecipe(null)} className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-sm">Cancel</button></div></div> : <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold">{recipe.name}</h2><p className="mt-1 text-sm text-[var(--theme-text-muted)]">Owner: {recipe.ownerId}</p><p className="mt-2 text-sm text-[var(--theme-text-muted)]">{recipe.description || 'No description'}</p></div><div className="flex gap-2"><button onClick={() => { setEditingRecipe(recipe); setRecipeForm({ name: recipe.name, description: recipe.description || '' }); }} className="rounded-full border border-amber-400/40 px-3 py-2 text-sm text-amber-100">Edit as admin</button><button onClick={() => void removeRecipe(recipe)} className="rounded-full border border-red-400/40 px-3 py-2 text-sm text-red-200">Delete as admin</button></div></div>}</article>)}{!recipes.length && !loading && <p className="py-8 text-center text-sm text-[var(--theme-text-muted)]">No recipes found.</p>}</div>;
}

function CommentList({ comments, editingComment, commentForm, setEditingComment, setCommentForm, saveComment, removeComment, loading }: any) {
  return <div className="mt-5 space-y-3">{comments.map((comment: Comment) => <article key={comment.id} className="rounded-2xl border border-[var(--theme-border)] p-4">{editingComment?.id === comment.id ? <div className="grid gap-3"><textarea value={commentForm} onChange={(event) => setCommentForm(event.target.value)} aria-label="Comment content" className="min-h-24 rounded-xl border border-[var(--theme-border)] bg-transparent px-3 py-2" /><div className="flex gap-2"><button onClick={() => void saveComment()} className="rounded-full bg-[var(--theme-accent)] px-4 py-2 text-sm font-semibold text-white">Save admin edit</button><button onClick={() => setEditingComment(null)} className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-sm">Cancel</button></div></div> : <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-semibold">{comment.author}</p><p className="mt-2 text-sm">{comment.content}</p><p className="mt-2 text-xs text-[var(--theme-text-muted)]">Recipe: {comment.recipeId} | User: {comment.userId}</p></div><div className="flex gap-2"><button onClick={() => { setEditingComment(comment); setCommentForm(comment.content); }} className="rounded-full border border-amber-400/40 px-3 py-2 text-sm text-amber-100">Edit as admin</button><button onClick={() => void removeComment(comment)} className="rounded-full border border-red-400/40 px-3 py-2 text-sm text-red-200">Delete as admin</button></div></div>}</article>)}{!comments.length && !loading && <p className="py-8 text-center text-sm text-[var(--theme-text-muted)]">No comments found.</p>}</div>;
}

function UserTable({ users, loading, unavailable }: { users: UserProfile[]; loading: boolean; unavailable: boolean }) {
  if (unavailable) {
    return <div className="mt-5 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-5 text-sm text-amber-100">The deployed backend does not include the admin Cognito user-list operation yet. Deploy the latest Amplify backend and reload this page.</div>;
  }

  return <div className="mt-5 max-h-[32rem] overflow-auto rounded-2xl border border-[var(--theme-border)]"><table className="min-w-full text-left text-sm"><thead className="sticky top-0 bg-[var(--theme-surface-alt)] text-xs uppercase text-[var(--theme-text-muted)]"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">User ID</th><th className="px-4 py-3">Cognito status</th><th className="px-4 py-3">Moderation</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-t border-[var(--theme-border)]"><td className="px-4 py-3"><div className="font-semibold">{user.displayName}</div><div className="text-[var(--theme-text-muted)]">{user.email || user.username}</div></td><td className="px-4 py-3 font-mono text-xs text-[var(--theme-text-muted)]">{user.userId}</td><td className="px-4 py-3">{user.status || 'UNKNOWN'}{user.enabled === false ? ' · Disabled' : ''}</td><td className="px-4 py-3">{user.isDeleted ? 'Deleted' : user.isBanned ? 'Banned' : user.contentHidden ? 'Content hidden' : 'Visible'}</td></tr>)}</tbody></table>{!users.length && !loading && <p className="p-8 text-center text-sm text-[var(--theme-text-muted)]">No Cognito users found.</p>}</div>;
}
