import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import App from './App';

const { getCurrentUserMock, fetchUserAttributesMock, signOutMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  fetchUserAttributesMock: vi.fn(),
  signOutMock: vi.fn(),
}));

vi.mock('aws-amplify/auth', async () => {
  const actual = await vi.importActual<typeof import('aws-amplify/auth')>('aws-amplify/auth');

  return {
    ...actual,
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
  default: () => <div>RecipeBuilder</div>,
}));

vi.mock('./components/SignInForm', () => ({
  default: () => <div>SignInForm</div>,
}));

describe('App auth initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('does not render the unauthenticated experience before auth resolves', async () => {
    getCurrentUserMock.mockResolvedValue({ userId: 'user-1', username: 'test-user' });
    fetchUserAttributesMock.mockResolvedValue({
      sub: 'user-1',
      email: 'test@example.com',
    });

    render(<App />);

    expect(screen.getByText('Preparing your kitchen…')).toBeInTheDocument();
    expect(screen.queryByText('RecipeBuilder')).not.toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('RecipeBuilder')).toBeInTheDocument());
    expect(screen.queryByText('Preparing your kitchen…')).not.toBeInTheDocument();
  });
});
