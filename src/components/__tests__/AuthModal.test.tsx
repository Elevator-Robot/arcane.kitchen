import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AuthModal, { AuthIntro } from '../AuthModal';

const auth = vi.hoisted(() => ({ route: 'signIn' }));
vi.mock('@aws-amplify/ui-react-core', () => ({ useAuthenticator: () => auth }));

describe('image-led authentication modal', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    auth.route = 'signIn';
  });

  it('keeps the supplied artwork and restores focus when dismissed with Escape', async () => {
    function Example() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Sign in</button>
          {open && (
            <AuthModal onClose={() => setOpen(false)}>
              <label>
                Email
                <input type="email" />
              </label>
            </AuthModal>
          )}
        </>
      );
    }
    const user = userEvent.setup();
    render(<Example />);
    const opener = screen.getByRole('button', { name: 'Sign in' });
    await user.click(opener);
    expect(screen.getByRole('dialog').querySelector('img')).toHaveAttribute(
      'src',
      '/images/member-kitchen-hero.webp'
    );
    expect(
      screen.getByRole('button', { name: 'Close sign-in' })
    ).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('resizes with the visible viewport when the keyboard reduces available space', () => {
    const viewport = Object.assign(new EventTarget(), {
      height: 700,
      offsetTop: 0,
    });
    vi.stubGlobal('visualViewport', viewport);
    render(
      <AuthModal onClose={vi.fn()}>
        <input aria-label="Email" />
      </AuthModal>
    );
    expect(
      screen
        .getByRole('dialog')
        .style.getPropertyValue('--auth-viewport-height')
    ).toBe('700px');
    act(() => {
      viewport.height = 360;
      viewport.offsetTop = 12;
      viewport.dispatchEvent(new Event('resize'));
    });
    expect(
      screen
        .getByRole('dialog')
        .style.getPropertyValue('--auth-viewport-height')
    ).toBe('360px');
    expect(
      screen.getByRole('dialog').style.getPropertyValue('--auth-viewport-top')
    ).toBe('12px');
  });

  it('keeps the welcome copy out of password recovery and labels confirmation clearly', () => {
    const { rerender } = render(<AuthIntro />);
    expect(
      screen.getByRole('heading', { name: 'Make yourself at home.' })
    ).toBeInTheDocument();
    auth.route = 'forgotPassword';
    rerender(<AuthIntro />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    auth.route = 'confirmSignUp';
    rerender(<AuthIntro />);
    expect(
      screen.getByRole('heading', { name: 'Check your inbox.' })
    ).toBeInTheDocument();
  });
});
