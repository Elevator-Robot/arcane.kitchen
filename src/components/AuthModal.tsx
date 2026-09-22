import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { BookOpen, X } from 'lucide-react';
import { useAuthenticator } from '@aws-amplify/ui-react-core';
import AccessibleDialog from './AccessibleDialog';

export function AuthIntro() {
  const { route } = useAuthenticator((context) => [context.route]);
  if (route !== 'signIn' && route !== 'confirmSignUp') {
    return (
      <p className="ak-eyebrow mb-5 pr-12 text-[var(--theme-accent)]">
        Member kitchen
      </p>
    );
  }
  return (
    <header className="ak-auth-intro">
      <p className="ak-eyebrow text-[var(--theme-accent)]">Member kitchen</p>
      <h2 className="mt-3 text-3xl leading-tight">
        {route === 'confirmSignUp'
          ? 'Check your inbox.'
          : 'Make yourself at home.'}
      </h2>
      {route === 'signIn' && (
        <p className="mt-3 text-sm leading-6 text-[var(--theme-text-muted)]">
          Sign in to save recipes and share your own.
        </p>
      )}
    </header>
  );
}

/** Image and dismiss control stay in place while longer auth steps can scroll. */
export default function AuthModal({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  const [viewport, setViewport] = useState(() => ({
    height:
      typeof window === 'undefined'
        ? undefined
        : (window.visualViewport?.height ?? window.innerHeight),
    top:
      typeof window === 'undefined'
        ? 0
        : (window.visualViewport?.offsetTop ?? 0),
  }));
  useEffect(() => {
    const visualViewport = window.visualViewport;
    const update = () =>
      setViewport({
        height: visualViewport?.height ?? window.innerHeight,
        top: visualViewport?.offsetTop ?? 0,
      });
    window.addEventListener('resize', update);
    visualViewport?.addEventListener('resize', update);
    visualViewport?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      visualViewport?.removeEventListener('resize', update);
      visualViewport?.removeEventListener('scroll', update);
    };
  }, []);
  return (
    <AccessibleDialog
      label="Sign in to Arcane Kitchen"
      onClose={onClose}
      className="ak-auth-overlay"
      style={
        {
          '--auth-viewport-height': viewport.height
            ? `${viewport.height}px`
            : '100dvh',
          '--auth-viewport-top': `${viewport.top}px`,
        } as CSSProperties
      }
    >
      <div className="ak-auth-card">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign-in"
          className="ak-auth-close"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <aside className="ak-auth-art" aria-label="Arcane Kitchen">
          <img
            src="/images/member-kitchen-hero.webp"
            alt=""
            className="ak-auth-image"
          />
          <div className="ak-auth-art-shade" aria-hidden="true" />
          <div className="ak-auth-brand">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span>Arcane Kitchen</span>
          </div>
          <div className="ak-auth-caption">
            <p className="ak-eyebrow text-white/75">
              From your kitchen, with love
            </p>
            <p className="mt-3 font-heading text-3xl leading-tight">
              Recipes worth keeping.
              <br />A kitchen of your own.
            </p>
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/80">
              Save your favorites, share what you make, and find your people
              around the table.
            </p>
          </div>
        </aside>
        <section className="ak-auth-content" aria-label="Account access">
          <div className="ak-auth-form-rail">
            <div className="auth-panel">{children}</div>
          </div>
        </section>
      </div>
    </AccessibleDialog>
  );
}
