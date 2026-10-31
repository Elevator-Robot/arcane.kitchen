import { Link } from 'react-router-dom';
import VisibilityBadge from './VisibilityBadge';
import type { AdminComment } from './types';

export default function CommentsPanel({
  comments,
  editingComment,
  commentForm,
  setEditingComment,
  setCommentForm,
  saveComment,
  removeComment,
  loading,
}: any) {
  return (
    <div className="mt-5 space-y-3">
      {comments.map((comment: AdminComment) => (
        <article
          key={comment.id}
          className="rounded-2xl border border-[var(--theme-border)] p-4"
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
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{comment.author}</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
                  {comment.content}
                </p>
                <div className="mt-3">
                  <VisibilityBadge hidden={comment.isHidden} />
                </div>
                <p className="mt-2 break-all text-xs text-[var(--theme-text-muted)]">
                  Recipe: {comment.recipeId} | User: {comment.userId}
                </p>
                <Link
                  to={`/discover?recipe=${encodeURIComponent(comment.recipeId)}`}
                  className="mt-3 inline-flex text-xs font-semibold text-[var(--theme-accent)] underline underline-offset-4"
                >
                  View conversation
                </Link>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingComment(comment);
                    setCommentForm(comment.content);
                  }}
                  className="ak-button-secondary rounded-xl px-3 py-2 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => void removeComment(comment)}
                  className="ak-button-danger-soft rounded-xl px-3 py-2 text-sm"
                >
                  Delete
                </button>
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
