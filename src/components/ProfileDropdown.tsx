import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { randomMerlinColor } from '../theme/merlinPalette';

type Props = {
  profilePath: string;
  profileLabel: string;
  profileAvatar?: string | null;
  isAdmin?: boolean;
  onSignOut: () => void;
};

export default function ProfileDropdown({
  profilePath,
  profileLabel,
  profileAvatar,
  isAdmin = false,
  onSignOut,
}: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeColor] = useState(randomMerlinColor);
  const containerRef = useRef<HTMLDivElement>(null);
  const displayLabel = profileLabel.replace(/^@+/, '');
  const avatarUrl = useMemo(() => {
    if (!profileAvatar) return undefined;
    const entries = import.meta.glob<{ default: string }>('/src/assets/avatars/*.webp', { eager: true });
    const match = Object.entries(entries).find(([path]) => path.endsWith(`/${profileAvatar}`));
    return match?.[1].default;
  }, [profileAvatar]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="group flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-[var(--theme-surface-alt)]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--theme-accent)] text-sm font-semibold text-white shadow-md">
          {avatarUrl ? <img src={avatarUrl} alt="" loading="lazy" className="h-full w-full rounded-full object-cover" /> : displayLabel.charAt(0).toUpperCase()}
        </span>
        <span className={`hidden max-w-[120px] truncate text-sm font-medium text-[var(--theme-text)] transition-all duration-300 sm:inline ${open ? 'translate-x-1' : ''} group-hover:translate-x-1`} style={open ? { color: activeColor } : undefined}>
          {displayLabel}
        </span>
        <svg className={`h-4 w-4 text-[var(--theme-text-muted)] transition ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] py-1 shadow-lg">
          <button type="button" onClick={() => { navigate(profilePath); setOpen(false); }} className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[var(--theme-text)] transition hover:bg-[var(--theme-surface-alt)]">
            <svg className="h-4 w-4 text-[var(--theme-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
            Profile
          </button>
          {isAdmin && (
            <button type="button" onClick={() => { navigate('/admin'); setOpen(false); }} className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[var(--theme-text)] transition hover:bg-[var(--theme-surface-alt)]">
              <svg className="h-4 w-4 text-[var(--theme-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12l1.7 1.7 3.3-3.4" /></svg>
              Admin dashboard
            </button>
          )}
          <div className="my-1 border-t border-[var(--theme-border)]" />
          <a href="https://x.com/ElevatorRobot" target="_blank" rel="noopener noreferrer" className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[var(--theme-text)] transition hover:bg-[var(--theme-surface-alt)]">
            <svg className="h-4 w-4 text-[var(--theme-text-muted)]" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            Feedback &amp; Support
          </a>
          <button type="button" onClick={onSignOut} className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[var(--theme-text)] transition hover:bg-[var(--theme-surface-alt)]">
            <svg className="h-4 w-4 text-[var(--theme-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
