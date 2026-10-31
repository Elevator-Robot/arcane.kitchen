import { userModerationStatus } from '../../utils/adminConsole';
import type { AdminUserProfile, ModerationAction } from './types';

export default function UsersPanel({
  users,
  loading,
  unavailable,
  onModerateUser,
  pendingUserAction,
}: {
  users: AdminUserProfile[];
  loading: boolean;
  unavailable: boolean;
  onModerateUser: (user: AdminUserProfile, action: ModerationAction) => void;
  pendingUserAction: string | null;
}) {
  if (unavailable) {
    return (
      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        The deployed backend does not include the admin Cognito user-list
        operation yet. Deploy the latest Amplify backend and reload this page.
      </div>
    );
  }

  return (
    <div className="mt-5">
      <p className="mb-2 text-xs text-[var(--theme-text-muted)] md:hidden">
        Scroll the table sideways for account status and actions.
      </p>
      <div
        tabIndex={0}
        role="region"
        aria-label="User management table"
        className="max-h-[32rem] overflow-auto rounded-2xl border border-[var(--theme-border)]"
      >
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-[var(--theme-surface-alt)] text-xs uppercase text-[var(--theme-text-muted)]">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">User ID</th>
              <th className="px-4 py-3">Cognito status</th>
              <th className="px-4 py-3">Moderation</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-t border-[var(--theme-border)]"
              >
                <td className="px-4 py-3">
                  <div className="font-semibold">
                    {user.displayName || user.username}
                  </div>
                  <div className="text-xs text-[var(--theme-accent)]">
                    {user.username}
                  </div>
                  <div className="text-[var(--theme-text-muted)]">
                    {user.email || user.username}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--theme-text-muted)]">
                  {user.userId}
                </td>
                <td className="px-4 py-3">
                  {user.status || 'UNKNOWN'}
                  {user.enabled === false ? ' · Disabled' : ''}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${userModerationStatus(user) === 'Active' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}
                  >
                    {userModerationStatus(user)}
                  </span>
                  {user.contentHidden &&
                    userModerationStatus(user) !== 'Content hidden' && (
                      <p className="mt-1 text-xs text-[var(--theme-text-muted)]">
                        Content hidden
                      </p>
                    )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex min-w-52 flex-wrap gap-2">
                    <button
                      disabled={pendingUserAction !== null}
                      onClick={() =>
                        onModerateUser(user, user.isBanned ? 'unban' : 'ban')
                      }
                      className="ak-button-secondary rounded-xl px-3 py-2 text-xs disabled:opacity-50"
                    >
                      {user.isBanned ? 'Unban' : 'Ban'}
                    </button>
                    <button
                      disabled={pendingUserAction !== null}
                      onClick={() =>
                        onModerateUser(
                          user,
                          user.contentHidden ? 'restoreContent' : 'hideContent'
                        )
                      }
                      className="ak-button-secondary rounded-xl px-3 py-2 text-xs disabled:opacity-50"
                    >
                      {user.contentHidden ? 'Restore content' : 'Hide content'}
                    </button>
                    <button
                      disabled={pendingUserAction !== null}
                      onClick={() =>
                        onModerateUser(
                          user,
                          user.isDeleted ? 'restore' : 'delete'
                        )
                      }
                      className="ak-button-danger-soft rounded-xl px-3 py-2 text-xs disabled:opacity-50"
                    >
                      {user.isDeleted ? 'Restore user' : 'Delete user'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length && !loading && (
          <p className="p-8 text-center text-sm text-[var(--theme-text-muted)]">
            No Cognito users found.
          </p>
        )}
      </div>
    </div>
  );
}
