export default function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading profile" className="w-full">
      <span className="sr-only">Loading profile…</span>
      <div aria-hidden="true">
        <div
          className="ak-page-banner flex items-end gap-4"
          style={{ background: 'var(--theme-surface-alt)' }}
        >
          <div className="h-16 w-16 shrink-0 rounded-full bg-[var(--theme-border)] sm:h-20 sm:w-20" />
          <div className="mb-2 h-8 w-36 rounded-lg bg-[var(--theme-border)]" />
        </div>
        <div className="mt-2 flex h-11 items-center border-b border-[var(--theme-border)]">
          <div className="h-3 w-32 rounded bg-[var(--theme-surface-alt)]" />
        </div>
      </div>
    </div>
  );
}
