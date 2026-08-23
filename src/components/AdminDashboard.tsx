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

const errorText = (error: unknown) => error instanceof Error ? error.message : 'The admin operation failed.';

const Notice = ({ children }: { children: ReactNode }) => (
  <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
    {children}
  </div>
);

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
  const avatarEntries = useMemo(
    () => Object.entries(import.meta.glob<{ default: string }>('/src/assets/avatars/*.webp', { eager: true })).map(([path, module]) => ({
      file: path.split('/').pop()!,
      url: module.default,
    })),
    [],
  );
  const avatarUrl = profileAvatar
    ? avatarEntries.find((entry) => entry.file === profileAvatar)?.url
    : undefined;
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [tab, setTab] = useState<'recipes' | 'comments'>('recipes');
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [recipeForm, setRecipeForm] = useState({ name: '', description: '' });
  const [commentForm, setCommentForm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContent = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const [recipeResult, commentResult] = await Promise.all([
        client.models.Recipe.list({ authMode: 'userPool' }),
        client.models.Comment.list({ authMode: 'userPool' }),
      ]);
      setRecipes((recipeResult.data ?? []) as Recipe[]);
      setComments((commentResult.data ?? []) as Comment[]);
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
          <p className="mt-3 text-sm text-[var(--theme-text-muted)]">
            {!isAuthenticated ? 'Sign in with an administrator account to continue.' : 'This account is not a member of the Admins group.'}
          </p>
          <button onClick={onBack} className="mt-6 rounded-full bg-[var(--theme-accent)] px-5 py-3 text-sm font-semibold text-white">Return home</button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <header className="sticky top-0 z-20 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/92 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between px-4 py-1 lg:px-6">
          <button
            onClick={onBack}
            className="mt-2 flex items-center gap-2 rounded-md p-0.5 transition active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)]"
            aria-label="Go to Discover"
          >
            <img src="/logo-no-background.svg" alt="" draggable={false} className="h-14 w-14 object-contain brightness-[0.3]" />
            <span className="font-heading text-base font-semibold">Arcane Kitchen</span>
          </button>
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 md:flex">
            <button onClick={onBack} className="rounded-md border-b-2 border-transparent px-4 py-1.5 text-sm font-medium text-[var(--theme-text-muted)] transition hover:text-[var(--theme-text)]">Discover</button>
            <button onClick={() => navigate('/build')} className="rounded-md border-b-2 border-transparent px-4 py-1.5 text-sm font-medium text-[var(--theme-text-muted)] transition hover:text-[var(--theme-text)]">Build</button>
          </nav>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu((current) => !current)}
                className="group flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-[var(--theme-surface-alt)]"
                aria-expanded={showProfileMenu}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--theme-accent)] text-sm font-semibold text-white shadow-md">
                  {avatarUrl ? <img src={avatarUrl} alt="" loading="lazy" className="h-full w-full rounded-full object-cover" /> : profileLabel.charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-[120px] truncate text-sm font-medium sm:inline">{profileLabel}</span>
                <svg className={`h-4 w-4 text-[var(--theme-text-muted)] transition ${showProfileMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] py-1 shadow-lg">
                  <button onClick={() => { navigate(profilePath); setShowProfileMenu(false); }} className="flex w-full items-center gap-3 px-4 py-2 text-sm transition hover:bg-[var(--theme-surface-alt)]">Profile</button>
                  <button onClick={() => setShowProfileMenu(false)} className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-[var(--theme-accent)] transition hover:bg-[var(--theme-surface-alt)]">Admin dashboard</button>
                  <div className="my-1 border-t border-[var(--theme-border)]" />
                  <a href="https://x.com/ElevatorRobot" target="_blank" rel="noopener noreferrer" className="flex w-full items-center gap-3 px-4 py-2 text-sm transition hover:bg-[var(--theme-surface-alt)]">Feedback &amp; Support</a>
                  {onSignOut && <button onClick={onSignOut} className="flex w-full items-center gap-3 px-4 py-2 text-sm transition hover:bg-[var(--theme-surface-alt)]">Logout</button>}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Admin console</p><h1 className="mt-2 text-3xl font-semibold">Moderation desk</h1><p className="mt-2 text-sm text-[var(--theme-text-muted)]">Every action here uses administrator privileges.</p></div>
        </header>

        <div className="mt-6 grid gap-4 md:grid-cols-3"><Notice><strong>Admin privileges active.</strong><br />Changes can affect other users and may not be reversible.</Notice><div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4"><p className="text-xs uppercase text-[var(--theme-text-muted)]">Recipes</p><p className="mt-2 text-2xl font-semibold">{recipes.length}</p></div><div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4"><p className="text-xs uppercase text-[var(--theme-text-muted)]">Comments</p><p className="mt-2 text-2xl font-semibold">{comments.length}</p></div></div>
        {error && <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}

        <section className="mt-6 rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 sm:p-6">
          <div className="flex flex-wrap justify-between gap-3"><div className="flex gap-2"><button onClick={() => setTab('recipes')} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === 'recipes' ? 'bg-[var(--theme-accent)] text-white' : 'border border-[var(--theme-border)]'}`}>Recipes</button><button onClick={() => setTab('comments')} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === 'comments' ? 'bg-[var(--theme-accent)] text-white' : 'border border-[var(--theme-border)]'}`}>Comments</button></div><button onClick={() => void loadContent()} disabled={loading} className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-sm">{loading ? 'Refreshing...' : 'Refresh'}</button></div>

          {tab === 'recipes' ? <div className="mt-5 space-y-3">{recipes.map((recipe) => <article key={recipe.id} className="rounded-2xl border border-[var(--theme-border)] p-4">{editingRecipe?.id === recipe.id ? <div className="grid gap-3"><input value={recipeForm.name} onChange={(event) => setRecipeForm({ ...recipeForm, name: event.target.value })} aria-label="Recipe name" className="rounded-xl border border-[var(--theme-border)] bg-transparent px-3 py-2" /><textarea value={recipeForm.description} onChange={(event) => setRecipeForm({ ...recipeForm, description: event.target.value })} aria-label="Recipe description" className="min-h-24 rounded-xl border border-[var(--theme-border)] bg-transparent px-3 py-2" /><div className="flex gap-2"><button onClick={() => void saveRecipe()} className="rounded-full bg-[var(--theme-accent)] px-4 py-2 text-sm font-semibold text-white">Save admin edit</button><button onClick={() => setEditingRecipe(null)} className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-sm">Cancel</button></div></div> : <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold">{recipe.name}</h2><p className="mt-1 text-sm text-[var(--theme-text-muted)]">Owner: {recipe.ownerId}</p><p className="mt-2 text-sm text-[var(--theme-text-muted)]">{recipe.description || 'No description'}</p></div><div className="flex gap-2"><button onClick={() => { setEditingRecipe(recipe); setRecipeForm({ name: recipe.name, description: recipe.description || '' }); }} className="rounded-full border border-amber-400/40 px-3 py-2 text-sm text-amber-100">Edit as admin</button><button onClick={() => void removeRecipe(recipe)} className="rounded-full border border-red-400/40 px-3 py-2 text-sm text-red-200">Delete as admin</button></div></div>}</article>)}{!recipes.length && !loading && <p className="py-8 text-center text-sm text-[var(--theme-text-muted)]">No recipes found.</p>}</div> : <div className="mt-5 space-y-3">{comments.map((comment) => <article key={comment.id} className="rounded-2xl border border-[var(--theme-border)] p-4">{editingComment?.id === comment.id ? <div className="grid gap-3"><textarea value={commentForm} onChange={(event) => setCommentForm(event.target.value)} aria-label="Comment content" className="min-h-24 rounded-xl border border-[var(--theme-border)] bg-transparent px-3 py-2" /><div className="flex gap-2"><button onClick={() => void saveComment()} className="rounded-full bg-[var(--theme-accent)] px-4 py-2 text-sm font-semibold text-white">Save admin edit</button><button onClick={() => setEditingComment(null)} className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-sm">Cancel</button></div></div> : <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-semibold">{comment.author}</p><p className="mt-2 text-sm">{comment.content}</p><p className="mt-2 text-xs text-[var(--theme-text-muted)]">Recipe: {comment.recipeId} | User: {comment.userId}</p></div><div className="flex gap-2"><button onClick={() => { setEditingComment(comment); setCommentForm(comment.content); }} className="rounded-full border border-amber-400/40 px-3 py-2 text-sm text-amber-100">Edit as admin</button><button onClick={() => void removeComment(comment)} className="rounded-full border border-red-400/40 px-3 py-2 text-sm text-red-200">Delete as admin</button></div></div>}</article>)}{!comments.length && !loading && <p className="py-8 text-center text-sm text-[var(--theme-text-muted)]">No comments found.</p>}</div>}
        </section>
        <section className="mt-6 rounded-3xl border border-dashed border-[var(--theme-border)] p-6"><h2 className="font-semibold">User management and ownership transfers</h2><p className="mt-2 text-sm text-[var(--theme-text-muted)]">These controls are not enabled yet. They require backend-enforced Cognito administration, moderation state, audit logging, and safe ownership-transfer operations.</p></section>
       </div>
       </div>
     </main>
  );
}
