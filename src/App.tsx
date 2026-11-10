import { useCallback, useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { Authenticator, Text } from '@aws-amplify/ui-react';
import { client } from './dataClient';
import { isMockPreview } from './preview/config';
import PreviewControls from './preview/PreviewControls';
import { useAuthenticator } from '@aws-amplify/ui-react-core';
import {
  confirmSignUp,
  fetchAuthSession,
  fetchUserAttributes,
  getCurrentUser,
  signIn,
  signOut as amplifySignOut,
  signUp,
} from 'aws-amplify/auth';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthModal, { AuthIntro } from './components/AuthModal';
import ErrorArtwork from './components/ErrorArtwork';
import { sanctuaryThemeStyle } from './theme/sanctuaryTheme';
import RecipeBuilder from './components/RecipeBuilder';
import AdminDashboard from './components/AdminDashboard';
import WorkspaceFooter from './components/WorkspaceFooter';
import {
  AuthSignInOptions,
  EmailSignInFooter,
} from './components/AuthSignInOptions';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import StartupLoading from './components/StartupLoading';
import {
  getProfileRoutePath,
  getProfileUsernameFromPath,
  getUsernameFromAuth,
  loadUserProfiles,
  reconcileUserProfileOnLogin,
  sanitizeUsername,
} from './utils/userProfiles';
import { getUserFacingErrorMessage } from './utils/userFacingErrors';

const authFormFields = {
  signIn: {
    username: {
      placeholder: 'you@example.com',
      label: 'Email',
    },
  },
  confirmSignUp: {
    confirmation_code: {
      labelHidden: true,
    },
  },
};

type AuthState = {
  isAuthenticated: boolean;
  currentUser: any | null;
  userAttributes: any | null;
  isInitialized: boolean;
  isAdmin: boolean;
};

type PersistedAuthState = {
  isAuthenticated: boolean;
  userId: string | null;
  username: string | null;
  email: string | null;
};

const AUTH_STORAGE_KEY = 'arcaneKitchen.authState';

const getPersistedAuthState = (): PersistedAuthState | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const saved = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!saved) {
      return null;
    }

    const parsed = JSON.parse(saved) as Partial<PersistedAuthState>;
    return {
      isAuthenticated: Boolean(parsed.isAuthenticated),
      userId: parsed.userId ?? null,
      username: parsed.username ?? null,
      email: parsed.email ?? null,
    };
  } catch {
    return null;
  }
};

const persistAuthState = (authState: PersistedAuthState | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (!authState) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
  } catch {
    // ignore storage failures
  }
};

const hasAmplifyAuthConfig = () => {
  try {
    return Boolean((Amplify.getConfig() as { Auth?: unknown })?.Auth);
  } catch {
    return false;
  }
};

const pendingConfirmations = new Map<string, Promise<any>>();
const pendingSignIns = new Map<string, Promise<any>>();

export const authServices = {
  handleSignIn(input: any) {
    const username = input.username?.trim().toLowerCase();
    const password = input.password;

    const key = `${username}:${password}`;
    const pending = pendingSignIns.get(key);
    if (pending) return pending;

    const request = (async () => {
      if (!hasAmplifyAuthConfig()) {
        throw new Error(
          'Authentication is not configured yet. Please try again later.'
        );
      }

      try {
        return await signIn({ username, password });
      } catch (error: any) {
        const shouldCreateAccount =
          error?.name === 'UserNotFoundException' ||
          error?.name === 'NotAuthorizedException';

        if (!shouldCreateAccount) {
          throw new Error(
            getUserFacingErrorMessage(
              error,
              'Sign-in failed. Please try again.'
            )
          );
        }

        try {
          const defaultNickname = username.split('@')[0] || 'cook';
          const signUpResult = await signUp({
            username,
            password,
            options: {
              autoSignIn: true,
              userAttributes: {
                email: username,
                nickname: defaultNickname,
              },
            },
          });

          if (signUpResult.isSignUpComplete) {
            return await signIn({ username, password });
          }

          return {
            isSignedIn: false,
            nextStep: {
              signInStep: 'CONFIRM_SIGN_UP',
            },
          } as any;
        } catch (signUpError: any) {
          if (signUpError?.name === 'UsernameExistsException') {
            throw new Error(
              getUserFacingErrorMessage(
                error,
                'Sign-in failed. Please try again.'
              )
            );
          }

          throw new Error(
            getUserFacingErrorMessage(
              signUpError,
              'Account creation failed. Please try again.'
            )
          );
        }
      }
    })();

    pendingSignIns.set(key, request);
    void request.then(
      () => pendingSignIns.delete(key),
      () => pendingSignIns.delete(key)
    );
    return request;
  },

  async handleConfirmSignUp(input: any) {
    const username = input.username?.trim().toLowerCase();
    const confirmationCode =
      input.confirmation_code?.trim() ||
      input.confirmationCode?.trim() ||
      input.code?.trim() ||
      '';

    if (!confirmationCode) {
      throw new Error('Code is required to confirm sign up');
    }

    const key = `${username}:${confirmationCode}`;
    const pending = pendingConfirmations.get(key);
    if (pending) return pending;

    const request = (async () => {
      try {
        return await confirmSignUp({
          username,
          confirmationCode,
        });
      } catch (error: any) {
        console.error('Cognito confirmSignUp failed', {
          name: error?.name,
          message: error?.message,
          httpStatusCode: error?.metadata?.httpStatusCode,
        });
        throw new Error(
          getUserFacingErrorMessage(
            error,
            'We could not verify your account. Please try again.'
          )
        );
      } finally {
        pendingConfirmations.delete(key);
      }
    })();

    pendingConfirmations.set(key, request);
    return request;
  },
};

function ConfirmationCodeHeader() {
  const [code, setCode] = useState(Array(6).fill(''));
  const { updateForm } = useAuthenticator((context) => [context.updateForm]);

  const syncConfirmationField = (confirmationCode: string) => {
    updateForm({
      name: 'confirmation_code',
      value: confirmationCode,
    });

    updateForm({
      name: 'confirmationCode',
      value: confirmationCode,
    });

    updateForm({
      name: 'code',
      value: confirmationCode,
    });

    const confirmationInput = document.querySelector<HTMLInputElement>(
      'form[data-amplify-authenticator-confirmsignup] input[name="confirmation_code"]'
    );

    if (confirmationInput) {
      confirmationInput.value = confirmationCode;
    }
  };

  const setDigit = (index: number, value: string) => {
    const nextValue = value.replace(/\D/g, '').slice(-1);
    const nextCode = [...code];
    nextCode[index] = nextValue;
    setCode(nextCode);

    const confirmationCode = nextCode.join('');
    syncConfirmationField(confirmationCode);

    if (nextValue && index < nextCode.length - 1) {
      const nextInput = document.getElementById(
        `confirmation-code-${index + 1}`
      );
      nextInput?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === 'Backspace' && !code[index] && index > 0) {
      const previousInput = document.getElementById(
        `confirmation-code-${index - 1}`
      );
      previousInput?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedCode = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6)
      .split('');

    if (!pastedCode.length) return;

    const nextCode = Array(6)
      .fill('')
      .map((_, index) => pastedCode[index] || '');

    setCode(nextCode);
    syncConfirmationField(nextCode.join(''));

    const nextFocusIndex = Math.min(pastedCode.length, 6) - 1;
    document.getElementById(`confirmation-code-${nextFocusIndex}`)?.focus();
  };

  return (
    <div className="confirmation-code-panel">
      <Text className="amplify-authenticator__subtitle">
        Enter the 6-digit code we sent to your email.
      </Text>

      <div className="confirmation-code-grid">
        {code.map((digit, index) => (
          <input
            key={index}
            id={`confirmation-code-${index}`}
            name={`confirmation-code-${index}`}
            aria-label={`Confirmation code digit ${index + 1}`}
            className="confirmation-code-input"
            inputMode="numeric"
            maxLength={1}
            onChange={(event) => setDigit(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            value={digit}
          />
        ))}
      </div>
    </div>
  );
}

function AuthSuccess({ onComplete }: { onComplete: () => Promise<void> }) {
  useEffect(() => {
    onComplete();
  }, [onComplete]);

  return null;
}

function AdminDashboardRoute(
  props: Omit<React.ComponentProps<typeof AdminDashboard>, 'onBack'>
) {
  const navigate = useNavigate();
  const location = useLocation();
  if (props.isAuthenticated && props.isAdmin && props.profilePath) {
    const params = new URLSearchParams(location.search);
    params.set('workspace', 'backrooms');
    return (
      <Navigate
        to={{
          pathname: props.profilePath,
          search: params.toString(),
          hash: location.hash,
        }}
        replace
      />
    );
  }
  return <AdminDashboard {...props} onBack={() => navigate('/discover')} />;
}

type AppProps = {
  pathname?: string;
  search?: string;
};

export function AppRouteAware() {
  const { pathname, search, hash } = useLocation();
  const normalized = pathname.replace(/\/+$/, '') || '/';
  const knownRoute =
    /^\/(?:discover|build|saved|drafts|admin)?$/.test(normalized) ||
    /^\/(?:u|profile|recipe)\/[^/]+$/.test(normalized);
  useEffect(() => {
    if (!knownRoute) document.title = 'Page not found · Arcane Kitchen';
  }, [knownRoute]);
  if (normalized === '/drafts') {
    return <Navigate to={{ pathname: '/build', search, hash }} replace />;
  }
  if (!knownRoute)
    return (
      <main className="flex min-h-dvh flex-col bg-[var(--theme-bg)] text-center">
        <div className="ak-page-rail ak-workspace flex flex-1 items-center justify-center">
          <div className="ak-panel w-full p-8 sm:p-12">
            <ErrorArtwork />
            <p className="text-sm font-semibold text-[var(--theme-accent)]">
              404 · A wrong turn in the kitchen
            </p>
            <h1 className="mt-3 text-3xl">This page isn't on the menu.</h1>
            <p className="mt-4 text-[var(--theme-text-muted)]">
              The address may have changed. Let's find something delicious
              instead.
            </p>
            <Link
              to="/discover"
              className="ak-button-primary mt-6 inline-flex rounded-xl px-5 py-3 font-semibold"
            >
              Explore recipes
            </Link>
          </div>
        </div>
        <WorkspaceFooter />
      </main>
    );
  return <App pathname={normalized} search={search} />;
}

function App({ pathname, search }: AppProps = {}) {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const persisted = getPersistedAuthState();
    const currentUser = persisted?.isAuthenticated
      ? {
          userId: persisted.userId,
          username: persisted.username,
        }
      : null;
    const userAttributes = persisted?.isAuthenticated
      ? {
          sub: persisted.userId ?? undefined,
          email: persisted.email ?? undefined,
        }
      : null;

    return {
      isAuthenticated: persisted?.isAuthenticated ?? false,
      currentUser,
      userAttributes,
      isInitialized: false,
      isAdmin: false,
    };
  });
  const {
    isAuthenticated,
    currentUser,
    userAttributes,
    isInitialized: isAuthInitialized,
    isAdmin,
  } = authState;
  const profileIds = [
    currentUser?.userId,
    userAttributes?.sub,
    currentUser?.username,
  ].filter(Boolean);
  const profileCache = Object.values(loadUserProfiles()).find((profile) =>
    profileIds.includes(profile.userId)
  );
  const currentPathname =
    pathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '/');
  const currentSearch =
    search ?? (typeof window !== 'undefined' ? window.location.search : '');
  const ownerUsername =
    profileCache?.username || getUsernameFromAuth(currentUser, userAttributes);
  useEffect(() => {
    const requestedProfile = getProfileUsernameFromPath(currentPathname);
    const ownBackrooms =
      isAuthenticated &&
      isAdmin &&
      requestedProfile !== null &&
      sanitizeUsername(requestedProfile) === sanitizeUsername(ownerUsername) &&
      new URLSearchParams(currentSearch).get('workspace') === 'backrooms';
    const title =
      currentPathname === '/build'
        ? 'Create a recipe'
        : currentPathname === '/saved'
          ? 'Saved recipes'
          : currentPathname === '/admin' || ownBackrooms
            ? 'Backrooms'
            : requestedProfile !== null
              ? 'Cook profile'
              : 'Emporium';
    document.title = `${title} · Arcane Kitchen`;
  }, [currentPathname, currentSearch, isAuthenticated, isAdmin, ownerUsername]);
  const [showAuth, setShowAuth] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const refreshAuthState = useCallback(async () => {
    setAuthNotice(null);

    if (isMockPreview) {
      const previewRole = window.sessionStorage.getItem(
        'arcaneKitchen.previewRole'
      );
      const member = previewRole === 'member' || previewRole === 'admin';
      const { getPreviewProfile } = await import('./preview/client');
      const profile = getPreviewProfile();
      const previewUser = member
        ? { userId: profile.userId, username: profile.username }
        : null;
      const previewAttributes = member
        ? {
            sub: profile.userId,
            nickname: profile.username,
            email: 'rowan@example.test',
            'custom:avatar': profile.avatar,
            'custom:bio': profile.bio,
          }
        : null;
      if (member)
        await reconcileUserProfileOnLogin(
          previewUser,
          previewAttributes,
          client
        );
      setAuthState({
        isAuthenticated: member,
        currentUser: previewUser,
        userAttributes: previewAttributes,
        isInitialized: true,
        isAdmin: previewRole === 'admin',
      });
      return;
    }

    if (!hasAmplifyAuthConfig()) {
      setAuthNotice(
        isMockPreview
          ? 'Mock preview — sample data. Sign-in is unavailable.'
          : 'Authentication is not configured yet. Please try again later.'
      );
      setAuthState({
        isAuthenticated: false,
        currentUser: null,
        userAttributes: null,
        isInitialized: true,
        isAdmin: false,
      });
      persistAuthState(null);
      return;
    }

    try {
      const user = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      try {
        await reconcileUserProfileOnLogin(user, attributes, client);
      } catch (profileError) {
        // Profile reconciliation must not prevent a valid Cognito session from
        // entering the app when the data API is temporarily unavailable.
        console.error('Failed to reconcile user profile:', profileError);
      }
      let isAdmin = false;
      try {
        const session = await fetchAuthSession();
        const groups = session.tokens?.accessToken?.payload?.['cognito:groups'];
        isAdmin = Array.isArray(groups) && groups.includes('Admins');
      } catch {
        // Session claims are optional for the regular application shell.
      }

      setAuthState({
        isAuthenticated: true,
        currentUser: user,
        userAttributes: attributes,
        isInitialized: true,
        isAdmin,
      });
      persistAuthState({
        isAuthenticated: true,
        userId: user?.userId || attributes?.sub || null,
        username: user?.username || null,
        email: attributes?.email || null,
      });
    } catch {
      setAuthState({
        isAuthenticated: false,
        currentUser: null,
        userAttributes: null,
        isInitialized: true,
        isAdmin: false,
      });
      persistAuthState(null);
    }
  }, []);

  useEffect(() => {
    refreshAuthState();
  }, [refreshAuthState]);

  useEffect(() => {
    if (showAuth && isAuthenticated) {
      setShowAuth(false);
    }
  }, [isAuthenticated, showAuth]);

  const handleSignOut = async () => {
    if (isMockPreview) {
      window.sessionStorage.setItem('arcaneKitchen.previewRole', 'guest');
      await refreshAuthState();
      return;
    }
    await amplifySignOut();
    setAuthState({
      isAuthenticated: false,
      currentUser: null,
      userAttributes: null,
      isInitialized: true,
      isAdmin: false,
    });
    persistAuthState(null);
  };

  const handleAuthComplete = useCallback(async () => {
    await refreshAuthState();
    setShowAuth(false);
  }, [refreshAuthState]);

  if (!isAuthInitialized) {
    return <StartupLoading />;
  }

  if (currentPathname === '/admin') {
    return (
      <AdminDashboardRoute
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        profileTheme={profileCache?.kitchenIdentity?.theme}
        profileCalling={profileCache?.kitchenIdentity?.calling}
        profilePath={getProfileRoutePath(ownerUsername)}
        profileLabel={
          profileCache?.username ||
          currentUser?.username ||
          userAttributes?.email?.split('@')[0] ||
          'Admin'
        }
        profileAvatar={
          profileCache?.avatar || userAttributes?.['custom:avatar'] || null
        }
      />
    );
  }

  return (
    <div
      style={sanctuaryThemeStyle(
        isAuthenticated ? profileCache?.kitchenIdentity?.theme : undefined
      )}
      className={`ak-page-glow h-screen h-dvh overflow-x-hidden overflow-y-hidden text-[var(--theme-text)] ${isMockPreview ? 'ak-mock-preview' : ''}`}
    >
      {isMockPreview && (
        <PreviewControls
          member={isAuthenticated}
          admin={isAdmin}
          onAdminSwitch={() => {
            window.sessionStorage.setItem(
              'arcaneKitchen.previewRole',
              isAdmin ? 'member' : 'admin'
            );
            void refreshAuthState();
          }}
          onSwitch={() => {
            window.sessionStorage.setItem(
              'arcaneKitchen.previewRole',
              isAuthenticated ? 'guest' : 'member'
            );
            void refreshAuthState();
          }}
        />
      )}
      <RecipeBuilder
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        currentUser={currentUser}
        userAttributes={userAttributes}
        onRequestAuth={() => {
          if (isMockPreview) {
            window.sessionStorage.setItem(
              'arcaneKitchen.previewRole',
              'member'
            );
            void refreshAuthState();
          } else setShowAuth(true);
        }}
        onSignOut={isAuthenticated ? handleSignOut : undefined}
        onProfileSaved={() => void refreshAuthState()}
      />

      {!showAuth && <PWAInstallPrompt />}

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)}>
          {authNotice && (
            <div
              role="alert"
              className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
            >
              {authNotice}
            </div>
          )}
          <AuthSignInOptions>
            <Authenticator
              hideSignUp
              components={{
                Header: AuthIntro,
                SignIn: { Footer: EmailSignInFooter },
                ConfirmSignUp: {
                  Header: ConfirmationCodeHeader,
                },
              }}
              formFields={authFormFields}
              services={authServices}
            >
              {() => <AuthSuccess onComplete={handleAuthComplete} />}
            </Authenticator>
          </AuthSignInOptions>
        </AuthModal>
      )}
    </div>
  );
}

export default App;
