import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useAuthenticator } from '@aws-amplify/ui-react-core';
import AccessibleDialog from './AccessibleDialog';

export function AuthIntro() {
  const { route } = useAuthenticator((context) => [context.route]);
  if (route !== 'signIn' && route !== 'confirmSignUp') {
    return null;
  }
  return (
    <header className="ak-auth-intro">
      {route === 'signIn' ? (
        <h2 className="ak-auth-wordmark">
          <span>Arcane</span> Kitchen
        </h2>
      ) : (
        <h2 className="text-3xl leading-tight">Check your inbox.</h2>
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
      <div
        className="ak-auth-card"
        data-compact={
          (typeof window !== 'undefined' &&
            (window.innerWidth <= 1024 ||
              (viewport.height ?? window.innerHeight) <= 560)) ||
          undefined
        }
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign-in"
          className="ak-auth-close"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <aside className="ak-auth-art" aria-label="Arcane Kitchen">
          <div className="ak-auth-scene">
            <img
              src="/images/member-kitchen-hero.webp"
              alt="A wooden tabletop framed by herbs, crystals, potion bottles, candles, and an open recipe book."
              width={1536}
              height={1024}
              className="ak-auth-image"
            />
          </div>
        </aside>
        <section className="ak-auth-sheet" aria-label="Account access">
          <div className="ak-auth-content">
            <div className="ak-auth-form-rail">
              <div className="auth-panel">{children}</div>
            </div>
          </div>
        </section>
      </div>
    </AccessibleDialog>
  );
}
