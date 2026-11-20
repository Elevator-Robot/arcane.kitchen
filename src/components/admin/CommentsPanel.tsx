import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ellipsis, Eye, EyeOff } from 'lucide-react';
import VisibilityBadge from './VisibilityBadge';
import { MERLIN_PALETTE } from '../../theme/merlinPalette';
import type { AdminComment } from './types';

const authorColor = (key: string) => {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return MERLIN_PALETTE[hash % MERLIN_PALETTE.length];
};

const initials = (author: string) =>
  (author.replace(/^@/, '').trim() || '?').charAt(0).toUpperCase();

export default function CommentsPanel({
  comments,
  editingComment,
  commentForm,
  setEditingComment,
  setCommentForm,
  saveComment,
  removeComment,
  onHideComment,
  loading,
  recipeHref,
}: {
  comments: AdminComment[];
  editingComment: AdminComment | null;
  commentForm: string;
  setEditingComment: (comment: AdminComment | null) => void;
  setCommentForm: (value: string) => void;
  saveComment: () => Promise<void>;
  removeComment: (comment: AdminComment) => Promise<void>;
  onHideComment: (comment: AdminComment) => Promise<void>;
  loading: boolean;
  recipeHref: (recipeId: string) => string;
}) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  const closeMenu = () => {
    setMenuFor(null);
    menuButtonRef.current?.focus();
  };

  useEffect(() => {
    if (!menuFor) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-comment-more-menu]')) setMenuFor(null);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [menuFor]);

  return (
    <div className="mt-5 space-y-3">
      {comments.map((comment) => (
        <article
          key={comment.id}
          className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4"
        >
          {editingComment?.id === comment.id ? (
            <div className="grid gap-3">
              <textarea
                value={commentForm}
                onChange={(event) => setCommentForm(event.target.value)}
                aria-label="Comment content"
                className="min-h-24 rounded-xl border border-[var(--theme-border)] bg-transparent px-3 py-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => void saveComment()}
                  className="ak-button-primary rounded-xl px-4 py-2.5 text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingComment(null)}
                  className="ak-button-secondary rounded-xl px-4 py-2.5 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span
                  aria-hidden="true"
                  title={comment.userId}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{
                    backgroundColor: authorColor(comment.userId || comment.id),
                  }}
                >
                  {initials(comment.author)}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words text-sm font-semibold">
                      {comment.author}
                    </p>
                    <VisibilityBadge hidden={comment.isHidden} />
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-base leading-6">
                    {comment.content}
                  </p>
                  <small
                    className="mt-1.5 block break-all text-xs text-[var(--theme-text-muted)]"
                    title={`On recipe ${comment.recipeId}`}
                  >
                    On recipe {comment.recipeId.slice(0, 8)}…
                  </small>
                  <Link
                    to={recipeHref(comment.recipeId)}
                    className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-[var(--theme-accent)] underline underline-offset-4"
                  >
                    View conversation
                  </Link>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => void onHideComment(comment)}
                  aria-label={
                    comment.isHidden
                      ? `Show comment by ${comment.author}`
                      : `Hide comment by ${comment.author}`
                  }
                  className="ak-button-secondary inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm"
                >
                  {comment.isHidden ? (
                    <>
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      Show
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                      Hide
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingComment(comment);
                    setCommentForm(comment.content);
                  }}
                  className="ak-button-secondary rounded-xl px-3 py-2 text-sm"
                >
                  Edit
                </button>
                <div className="relative" data-comment-more-menu>
                  <button
                    ref={menuFor === comment.id ? menuButtonRef : null}
                    type="button"
                    aria-label={`More actions for comment by ${comment.author}`}
                    aria-haspopup="menu"
                    aria-expanded={menuFor === comment.id}
                    onClick={() =>
                      setMenuFor(menuFor === comment.id ? null : comment.id)
                    }
                    className="ak-button-secondary rounded-xl p-2"
                  >
                    <Ellipsis className="h-4 w-4" aria-hidden="true" />
                  </button>
                  {menuFor === comment.id && (
                    <div
                      role="menu"
                      className="absolute right-0 z-20 mt-1 min-w-40 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-1 shadow-lg"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuFor(null);
                          void removeComment(comment);
                        }}
                        className="ak-button-danger-soft w-full rounded-lg px-3 py-2 text-left text-sm"
                      >
                        Delete comment…
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </article>
      ))}
      {!comments.length && !loading && (
        <p className="py-8 text-center text-sm text-[var(--theme-text-muted)]">
          No comments found.
        </p>
      )}
    </div>
  );
}
