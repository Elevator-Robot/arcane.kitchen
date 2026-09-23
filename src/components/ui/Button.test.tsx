import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import Button from './Button';

it('preserves native focus and explicit submit semantics for reusable actions', async () => {
  const user = userEvent.setup();
  const ref = createRef<HTMLButtonElement>();
  const submit = vi.fn((event) => event.preventDefault());
  render(
    <form onSubmit={submit}>
      <Button ref={ref} variant="secondary">
        Cancel
      </Button>
      <Button type="submit">Save</Button>
    </form>
  );
  ref.current?.focus();
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(submit).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(submit).toHaveBeenCalledOnce();
});

it('prevents activation while loading and exposes the busy state', async () => {
  const user = userEvent.setup();
  const click = vi.fn();
  render(
    <Button isLoading onClick={click}>
      Saving
    </Button>
  );
  const button = screen.getByRole('button', { name: 'Saving' });
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute('aria-busy', 'true');
  await user.click(button);
  expect(click).not.toHaveBeenCalled();
});
