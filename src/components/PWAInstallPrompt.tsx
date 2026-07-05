import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'arcaneKitchen.installPromptDismissed';

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
}

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (!isIOS()) return;

    const timer = setTimeout(() => setShowPrompt(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showPrompt) return;
    autoHideTimer.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, 'dismissed');
      setShowPrompt(false);
    }, 8000);
    return () => { if (autoHideTimer.current) clearTimeout(autoHideTimer.current); };
  }, [showPrompt]);

  const handleDismiss = () => {
    if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    localStorage.setItem(STORAGE_KEY, 'dismissed');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[70] border-t border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 shadow-lg sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-sm sm:rounded-t-xl sm:border sm:border-b-0 sm:shadow-xl">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--theme-accent)]">
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--theme-text)]">Add to Home Screen</p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--theme-text-muted)]">
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 103.316 6.632m0-6.632a3 3 0 10-3.316-6.632m0 0a3 3 0 01-3.316 6.632m0-6.632a3 3 0 00-3.316-6.632" />
            </svg>
            <span>Share</span>
            <span className="text-[var(--theme-accent)]">→</span>
            <span>Add to Home Screen</span>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] transition"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
