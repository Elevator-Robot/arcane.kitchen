import { useEffect, useRef, type ReactNode } from 'react';

/** Keyboard containment and focus restoration for the account overlay. */
export default function AccessibleDialog({
  children,
  onClose,
  label,
  className,
  dismissOnBackdrop = false,
}: {
  children: ReactNode;
  onClose: () => void;
  label: string;
  className?: string;
  dismissOnBackdrop?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    if (!dialog) return;
    const controls = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]'
        )
      ).filter((element) => element.getClientRects().length > 0);
    (controls()[0] || dialog).focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const items = controls();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first) {
        event.preventDefault();
        dialog.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === dialog)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('keydown', handleKey);
    return () => {
      dialog.removeEventListener('keydown', handleKey);
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      onClick={(event) => {
        if (dismissOnBackdrop && event.target === event.currentTarget)
          onClose();
      }}
      className={
        className ||
        'fixed inset-0 z-50 overflow-y-auto bg-[var(--theme-overlay)] px-4 py-6 backdrop-blur-md sm:py-10'
      }
    >
      {children}
    </div>
  );
}
