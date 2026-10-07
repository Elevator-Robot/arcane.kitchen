import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccessibleDialog from '../AccessibleDialog';

it('closes on the backdrop but keeps clicks inside the content open', async () => {
  const user = userEvent.setup();
  const close = vi.fn();
  render(
    <AccessibleDialog label="Example dialog" onClose={close}>
      <div>
        <button type="button">Inside</button>
      </div>
    </AccessibleDialog>
  );
  await user.click(screen.getByRole('button', { name: 'Inside' }));
  expect(close).not.toHaveBeenCalled();
  await user.click(screen.getByRole('dialog'));
  expect(close).toHaveBeenCalledOnce();
});
