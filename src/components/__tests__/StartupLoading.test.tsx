import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import StartupLoading from '../StartupLoading';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('announces startup and offers recovery only after a prolonged wait', () => {
  vi.useFakeTimers();
  const { unmount } = render(<StartupLoading />);
  expect(screen.getByRole('status')).toHaveTextContent(
    'Preparing your kitchen'
  );
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(12000));
  expect(screen.getByText(/taking longer than usual/)).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Reload kitchen' })
  ).toBeInTheDocument();
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it('cleans up its recovery timer when startup finishes promptly', () => {
  vi.useFakeTimers();
  const { unmount } = render(<StartupLoading />);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
