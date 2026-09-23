export default function ProfileSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading profile"
      className="mx-auto w-full max-w-6xl"
    >
      <span className="sr-only">Loading profile…</span>
      <div aria-hidden="true" className="ak-panel overflow-hidden">
        <div className="h-48 bg-[var(--theme-surface-alt)]" />
        <div className="flex flex-col gap-6 p-8 sm:flex-row">
          <div className="h-32 w-32 shrink-0 rounded-full bg-[var(--theme-surface-alt)]" />
          <div className="flex-1 space-y-4 py-3">
            <div className="h-7 w-44 rounded-lg bg-[var(--theme-surface-alt)]" />
            <div className="h-5 w-28 rounded-full bg-[var(--theme-surface-alt)]" />
            <div className="h-4 max-w-sm rounded bg-[var(--theme-surface-alt)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
