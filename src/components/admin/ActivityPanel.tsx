import type { AdminAuditEntry, AdminUserProfile } from './types';

const ACTION_LABELS: Record<string, string> = {
  transferOwnership: 'Transferred ownership',
  ban: 'Banned account',
  unban: 'Unbanned account',
  delete: 'Deleted account',
  hideContent: 'Hid content',
  restoreContent: 'Restored content',
  restore: 'Restored account',
};

export default function ActivityPanel({
  entries,
  loading,
  unavailable,
  actorById,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  entries: AdminAuditEntry[];
  loading: boolean;
  unavailable: boolean;
  actorById: Map<string, AdminUserProfile>;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  if (unavailable) {
    return (
      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        The deployed backend does not include the admin activity log yet. Deploy
        the latest Amplify backend and reload this page.
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {entries.map((entry) => {
        const actor = actorById.get(entry.actorUserId);
        const actorName =
          actor?.displayName || actor?.username || entry.actorUserId;
        return (
          <article
            key={entry.id}
            className="rounded-2xl border border-[var(--theme-border)] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                {ACTION_LABELS[entry.action] ?? entry.action}
              </p>
              <time
                className="text-xs text-[var(--theme-text-muted)]"
                dateTime={entry.createdAt}
              >
                {new Date(entry.createdAt).toLocaleString()}
              </time>
            </div>
            <p className="mt-2 break-words text-sm text-[var(--theme-text-muted)]">
              By {actorName} · {entry.targetType}{' '}
              <span className="font-mono text-xs" title={entry.targetId}>
                {entry.targetId}
              </span>
            </p>
          </article>
        );
      })}
      {!entries.length && !loading && (
        <p className="py-8 text-center text-sm text-[var(--theme-text-muted)]">
          No admin actions recorded yet.
        </p>
      )}
      {hasMore && entries.length > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="ak-button-secondary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
