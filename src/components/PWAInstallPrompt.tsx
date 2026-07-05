import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'arcaneKitchen.installPromptDismissed';

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
}

export default function PWAInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOSBrowser, setIsIOSBrowser] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const ios = isIOS();
    if (ios) {
      setIsIOSBrowser(true);
      setTimeout(() => setShowPrompt(true), 2000);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem(STORAGE_KEY, 'installed');
    }
    setShowPrompt(false);
    setPromptEvent(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'dismissed');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[var(--theme-overlay)] backdrop-blur-md sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-2xl border-t border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 shadow-lg sm:rounded-2xl sm:border">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-accent)]">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-heading text-base font-semibold text-[var(--theme-text)]">
                {isIOSBrowser ? 'Add to Home Screen' : 'Add to Home Screen'}
              </h3>
              <p className="text-sm text-[var(--theme-text-muted)]">
                {isIOSBrowser
                  ? 'Tap the share icon below, then "Add to Home Screen".'
                  : 'Install Arcane Kitchen for quick access and a better mobile experience.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] transition"
            aria-label="Dismiss"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-4 flex gap-3">
          {isIOSBrowser ? (
            <div className="w-full text-center text-xs text-[var(--theme-text-muted)]">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 103.316 6.632m0-6.632a3 3 0 10-3.316-6.632m0 0a3 3 0 01-3.316 6.632m0-6.632a3 3 0 00-3.316-6.632" />
                </svg>
                <span>Share</span>
                <span className="text-[var(--theme-accent)]">→</span>
                <span>Add to Home Screen</span>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={handleInstall}
                className="flex-1 rounded-lg bg-[var(--theme-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--theme-accent-strong)]"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-lg border border-[var(--theme-border)] px-4 py-2 text-sm font-medium text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)]"
              >
                Not now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
