import { Component, type ErrorInfo, type ReactNode } from 'react';
import ErrorArtwork from './ErrorArtwork';

export function AppErrorFallback() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--theme-bg)] p-6 text-center text-[var(--theme-text)]">
      <section role="alert" className="ak-panel w-full max-w-lg p-6 sm:p-8">
        <ErrorArtwork />
        <h1 className="text-2xl">Our kitchen magic went a little sideways.</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--theme-text-muted)]">
          We couldn't open the kitchen. Please try reloading, or head back to
          recipes.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="ak-button-primary rounded-xl px-5 py-3 font-semibold"
          >
            Reload kitchen
          </button>
          <a
            href="/discover"
            className="ak-button-secondary rounded-xl px-5 py-3 font-semibold"
          >
            Back to recipes
          </a>
        </div>
      </section>
    </main>
  );
}

export default class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application rendering failed:', error, info);
  }

  render() {
    return this.state.failed ? <AppErrorFallback /> : this.props.children;
  }
}
