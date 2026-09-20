import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import App, { AppRouteAware, authServices } from './App';
import { BrowserRouter } from 'react-router-dom';

const {
  autoSignInMock,
  confirmSignUpMock,
  getCurrentUserMock,
  fetchUserAttributesMock,
  signOutMock,
  recipeBuilderMock,
} = vi.hoisted(() => ({
  autoSignInMock: vi.fn(),
  confirmSignUpMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
  fetchUserAttributesMock: vi.fn(),
  signOutMock: vi.fn(),
  recipeBuilderMock: vi.fn(),
}));

vi.mock('aws-amplify/auth', async () => {
  const actual =
    await vi.importActual<typeof import('aws-amplify/auth')>(
      'aws-amplify/auth'
    );

  return {
    ...actual,
    autoSignIn: autoSignInMock,
    confirmSignUp: confirmSignUpMock,
    getCurrentUser: getCurrentUserMock,
    fetchUserAttributes: fetchUserAttributesMock,
    signOut: signOutMock,
  };
});

vi.mock('aws-amplify', () => ({
  Amplify: {
    getConfig: () => ({ Auth: {} }),
  },
}));

vi.mock('@aws-amplify/ui-react', () => ({
  Authenticator: ({ children }: { children?: () => ReactNode }) =>
    children ? <>{children()}</> : null,
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@aws-amplify/ui-react-core', () => ({
  useAuthenticator: () => ({ updateForm: vi.fn() }),
}));

vi.mock('./components/RecipeBuilder', () => ({
  default: (props: any) => {
    recipeBuilderMock(props);
    return <div>RecipeBuilder</div>;
  },
}));

vi.mock('./components/SignInForm', () => ({
  default: () => <div>SignInForm</div>,
}));

describe('App auth initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirmSignUpMock.mockResolvedValue({
      isSignUpComplete: true,
      nextStep: { signUpStep: 'COMPLETE_AUTO_SIGN_IN' },
    });
    sessionStorage.clear();
    localStorage.clear();
  });

  it.each(['/admin-nope', '/build-something', '/unknown'])(
    'provides route recovery for %s',
    (path) => {
      window.history.replaceState({}, '', path);
      render(
        <BrowserRouter>
          <AppRouteAware />
        </BrowserRouter>
      );
      expect(
        screen.getByRole('heading', { name: "This page isn't on the menu." })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'Explore recipes' })
      ).toHaveAttribute('href', '/discover');
      expect(document.title).toBe('Page not found · Arcane Kitchen');
      window.history.replaceState({}, '', '/');
    }
  );

  it('does not render the unauthenticated experience before auth resolves', async () => {
    getCurrentUserMock.mockResolvedValue({
      userId: 'user-1',
      username: 'test-user',
    });
    fetchUserAttributesMock.mockResolvedValue({
      sub: 'user-1',
      email: 'test@example.com',
    });

    render(<App />);

    expect(screen.getByText('Preparing your kitchen…')).toBeInTheDocument();
    expect(screen.queryByText('RecipeBuilder')).not.toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText('RecipeBuilder')).toBeInTheDocument()
    );
    expect(
      screen.queryByText('Preparing your kitchen…')
    ).not.toBeInTheDocument();
  });

  it('verifies persisted auth before rendering the authenticated workspace', async () => {
    getCurrentUserMock.mockResolvedValue({
      userId: 'user-1',
      username: 'verified-user',
    });
    fetchUserAttributesMock.mockResolvedValue({
      sub: 'user-1',
      email: 'verified@example.com',
    });
    localStorage.setItem(
      'arcaneKitchen.authState',
      JSON.stringify({
        isAuthenticated: true,
        userId: 'user-1',
        username: 'persisted-user',
        email: 'persisted@example.com',
      })
    );

    render(<App />);

    expect(screen.getByText('Preparing your kitchen…')).toBeInTheDocument();
    expect(recipeBuilderMock).not.toHaveBeenCalled();
    await waitFor(() => expect(recipeBuilderMock).toHaveBeenCalled());
    const initialProps = recipeBuilderMock.mock.calls[0]?.[0];
    expect(initialProps?.isAuthenticated).toBe(true);
    expect(initialProps?.currentUser).toEqual(
      expect.objectContaining({ username: 'verified-user' })
    );
    expect(initialProps?.userAttributes).toEqual(
      expect.objectContaining({ email: 'verified@example.com' })
    );
  });

  it('returns the confirmation result for Authenticator auto sign-in', async () => {
    const result = await authServices.handleConfirmSignUp({
      username: 'test@example.com',
      confirmation_code: '123456',
    });

    expect(result).toEqual({
      isSignUpComplete: true,
      nextStep: { signUpStep: 'COMPLETE_AUTO_SIGN_IN' },
    });
    expect(confirmSignUpMock).toHaveBeenCalledWith({
      username: 'test@example.com',
      confirmationCode: '123456',
    });
    expect(autoSignInMock).not.toHaveBeenCalled();
  });

  it('shares concurrent confirmation requests without invoking Cognito twice', async () => {
    let resolveConfirmation: ((value: unknown) => void) | undefined;
    confirmSignUpMock.mockReturnValue(
      new Promise((resolve) => {
        resolveConfirmation = resolve;
      })
    );

    const first = authServices.handleConfirmSignUp({
      username: ' TEST@example.com ',
      confirmation_code: '123456',
    });
    const second = authServices.handleConfirmSignUp({
      username: 'test@example.com',
      confirmation_code: '123456',
    });

    expect(confirmSignUpMock).toHaveBeenCalledTimes(1);
    resolveConfirmation?.({
      isSignUpComplete: true,
      nextStep: { signUpStep: 'DONE' },
    });
    await expect(first).resolves.toEqual({
      isSignUpComplete: true,
      nextStep: { signUpStep: 'DONE' },
    });
    await expect(second).resolves.toEqual({
      isSignUpComplete: true,
      nextStep: { signUpStep: 'DONE' },
    });
  });

  it('keeps Cognito confirmation failures as failures and logs safe diagnostics', async () => {
    const error = Object.assign(
      new Error('NotAuthorizedException: confirmed'),
      {
        name: 'NotAuthorizedException',
        metadata: { httpStatusCode: 400 },
      }
    );
    confirmSignUpMock.mockRejectedValue(error);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await expect(
      authServices.handleConfirmSignUp({
        username: 'test@example.com',
        confirmation_code: '123456',
      })
    ).rejects.toThrow();
    expect(autoSignInMock).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith('Cognito confirmSignUp failed', {
      name: 'NotAuthorizedException',
      message: 'NotAuthorizedException: confirmed',
      httpStatusCode: 400,
    });
    consoleError.mockRestore();
  });
});
