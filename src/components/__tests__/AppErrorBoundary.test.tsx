import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AppErrorBoundary from '../AppErrorBoundary';

describe('application error recovery', () => {
  it('shows catwitch artwork and recovery actions instead of a crashed app', () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});
    function BrokenScreen(): never {
      throw new Error('Private backend diagnostics');
    }
    render(
      <AppErrorBoundary>
        <BrokenScreen />
      </AppErrorBoundary>
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Our kitchen magic went a little sideways.'
    );
    expect(
      screen.getByRole('img', { name: /Two cats in witch hats/ })
    ).toHaveAttribute('src', '/images/catwitch.webp');
    expect(
      screen.getByRole('button', { name: 'Reload kitchen' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Back to recipes' })
    ).toHaveAttribute('href', '/discover');
    expect(
      screen.queryByText('Private backend diagnostics')
    ).not.toBeInTheDocument();
    diagnostic.mockRestore();
  });
});
