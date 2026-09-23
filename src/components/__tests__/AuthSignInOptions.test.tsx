import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthSignInOptions, EmailSignInFooter } from '../AuthSignInOptions';

const auth = vi.hoisted(() => ({
  error: '',
  isPending: false,
  toForgotPassword: vi.fn(),
}));
vi.mock('@aws-amplify/ui-react-core', () => ({ useAuthenticator: () => auth }));

function Example({ recovery = false }: { recovery?: boolean }) {
  return (
    <AuthSignInOptions>
      {recovery ? (
        <p>Password recovery</p>
      ) : (
        <form onSubmit={(event) => event.preventDefault()}>
          <button type="button">Continue with Google</button>
          <fieldset>
            <label>
              Email
              <input name="username" type="email" />
            </label>
            <label>
              Password
              <input name="password" type="password" />
            </label>
          </fieldset>
          <button type="submit">Sign in</button>
          <EmailSignInFooter />
        </form>
      )}
    </AuthSignInOptions>
  );
}

describe('Google-first email disclosure', () => {
  beforeEach(() => {
    auth.error = '';
    auth.isPending = false;
    auth.toForgotPassword.mockReset();
  });

  it('starts collapsed, focuses email on expansion, and preserves entered credentials', async () => {
    const user = userEvent.setup();
    render(<Example />);
    const choice = screen.getByRole('button', { name: 'Continue with email' });
    expect(choice).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('button', { name: 'Forgot your password?' })
    ).not.toBeInTheDocument();
    await user.click(choice);
    const email = screen.getByRole('textbox', { name: 'Email' });
    const password = screen.getByLabelText('Password');
    expect(email).toHaveFocus();
    const controlledFields = document.getElementById(
      choice.getAttribute('aria-controls')!
    );
    expect(controlledFields).toContainElement(email);
    await user.type(email, 'cook@example.com');
    await user.type(password, 'Test-password-1');
    await user.click(
      screen.getByRole('button', { name: 'Back to sign-in options' })
    );
    expect(choice).toHaveAttribute('aria-expanded', 'false');
    await user.click(
      screen.getByRole('button', { name: 'Continue with email' })
    );
    expect(screen.getByRole('textbox', { name: 'Email' })).toBe(email);
    expect(email).toHaveValue('cook@example.com');
    expect(password).toHaveValue('Test-password-1');
  });

  it('keeps the email choice open when returning from password recovery', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Example />);
    await user.click(
      screen.getByRole('button', { name: 'Continue with email' })
    );
    await user.click(
      screen.getByRole('button', { name: 'Forgot your password?' })
    );
    expect(auth.toForgotPassword).toHaveBeenCalledOnce();
    rerender(<Example recovery />);
    rerender(<Example />);
    expect(
      screen.getByRole('button', { name: 'Back to sign-in options' })
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('reveals email after an error while allowing an explicit return to Google', async () => {
    const { rerender } = render(<Example />);
    act(() => {
      auth.error = 'Sign-in failed';
      rerender(<Example />);
    });
    const choice = screen.getByRole('button', {
      name: 'Back to sign-in options',
    });
    expect(choice).toHaveAttribute('aria-expanded', 'true');
    expect(choice).not.toBeDisabled();
    fireEvent.click(choice);
    expect(choice).toHaveAttribute('aria-expanded', 'false');
  });

  it('disables option changes while a request is pending', () => {
    auth.isPending = true;
    render(<Example />);
    expect(
      screen.getByRole('button', { name: 'Continue with email' })
    ).toBeDisabled();
  });
});
