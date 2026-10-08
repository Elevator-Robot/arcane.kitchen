import {
  act,
  fireEvent,
  render,
  screen,
  cleanup,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ShareProfileButton from './ShareProfileButton';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it('copies once, waits for success, and never opens native sharing', async () => {
  vi.useFakeTimers();
  let finish!: () => void;
  const copy = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      })
  );
  const nativeShare = vi.fn();
  vi.stubGlobal('navigator', {
    clipboard: { writeText: copy },
    share: nativeShare,
  });
  render(<ShareProfileButton username="chef" />);
  const button = screen.getByRole('button', { name: 'Share profile' });
  fireEvent.click(button);
  expect(button).toHaveTextContent('Copying…');
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(copy).toHaveBeenCalledOnce();
  expect(copy).toHaveBeenCalledWith(expect.stringContaining('/u/chef'));
  expect(nativeShare).not.toHaveBeenCalled();
  await act(async () => finish());
  expect(button).toHaveTextContent('Copied!');
  act(() => vi.advanceTimersByTime(2500));
  expect(button).toHaveTextContent(/^Share$/);
});

it('offers retry rather than success if clipboard access fails', async () => {
  const copy = vi
    .fn()
    .mockRejectedValueOnce(new Error('denied'))
    .mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText: copy } });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  render(<ShareProfileButton username="chef" />);
  await act(async () => {
    fireEvent.click(screen.getByRole('button'));
  });
  expect(screen.getByRole('button')).toHaveTextContent('Try again');
  await act(async () => {
    fireEvent.click(screen.getByRole('button'));
  });
  expect(screen.getByRole('button')).toHaveTextContent('Copied!');
});
