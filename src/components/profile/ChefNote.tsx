import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export default function ChefNote({
  profileId,
  children,
}: {
  profileId: string;
  children: ReactNode;
}) {
  const key = `arcaneKitchen.profileNotes.${profileId}`;
  const [open, setOpen] = useState(() => {
    try {
      return sessionStorage.getItem(key) === 'open';
    } catch {
      return false;
    }
  });
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (panel.current) panel.current.inert = !open;
    try {
      sessionStorage.setItem(key, open ? 'open' : 'closed');
    } catch {
      /* The disclosure still works without storage. */
    }
  }, [key, open]);
  return (
    <section className="ak-chef-note">
      <h2>
        <button
          type="button"
          id={`${id}-toggle`}
          className="ak-chef-note-toggle"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={() => setOpen((value) => !value)}
        >
          <span>A note from the chef</span>
          <ChevronDown size={17} aria-hidden="true" />
        </button>
      </h2>
      <div
        ref={panel}
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-toggle`}
        aria-hidden={!open}
        className={`ak-chef-note-reveal ${open ? 'is-open' : ''}`}
      >
        <div className="ak-chef-note-inner">
          <div className="ak-chef-note-grid">{children}</div>
        </div>
      </div>
    </section>
  );
}
