import { useCallback, useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { Authenticator, Text } from '@aws-amplify/ui-react';
import { useAuthenticator } from '@aws-amplify/ui-react-core';
import {
  autoSignIn,
  confirmSignUp,
  fetchUserAttributes,
  getCurrentUser,
  signIn,
  signOut as amplifySignOut,
  signUp,
} from 'aws-amplify/auth';
import RecipeBuilder from './components/RecipeBuilder';
import SignInForm from './components/SignInForm';
import {
  isFakeBackend,
  fakeGetCurrentUser,
  fakeFetchUserAttributes,
  fakeSignOut,
} from './fake-backend';

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

const hasAmplifyAuthConfig = () => {
  try {
    return Boolean((Amplify.getConfig() as { Auth?: unknown })?.Auth);
  } catch {
    return false;
  }
};

const authServices = {
  async handleSignIn(input: any) {
    const username = input.username?.trim().toLowerCase();
    const password = input.password;
    const agreeToTerms = input.__agreeToTerms === true;

    if (!isFakeBackend() && !hasAmplifyAuthConfig()) {
      throw new Error('Authentication is not configured yet. Please try again later.');
    }

    try {
      return await signIn({ username, password });
    } catch (error: any) {
      const shouldCreateAccount =
        error?.name === 'UserNotFoundException' ||
        error?.name === 'NotAuthorizedException';

      if (!shouldCreateAccount) {
        throw error;
      }

      if (!agreeToTerms) {
        throw new Error('You must accept the user agreement to continue');
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
          throw error;
        }

        throw signUpError;
      }
    }
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

    const result = await confirmSignUp({
      username,
      confirmationCode,
    });

    if (result.isSignUpComplete) {
      return await autoSignIn();
    }

    return result as any;
  },
};

function CustomSignIn() {
  return (
    <div>
      <SignInForm />
    </div>
  );
}

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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userAttributes, setUserAttributes] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showAgreementPrompt, setShowAgreementPrompt] = useState(false);
  const [agreementPendingUserKey, setAgreementPendingUserKey] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const getAgreementStorageKey = useCallback((userIdentifier?: string | null) => {
    if (!userIdentifier) return null;
    return `arcaneKitchen.acceptedAgreement.${userIdentifier}`;
  }, []);

  const hasAcceptedAgreement = useCallback((userIdentifier?: string | null) => {
    const storageKey = getAgreementStorageKey(userIdentifier);
    if (!storageKey || typeof window === 'undefined') return false;

    try {
      return window.localStorage.getItem(storageKey) === 'true';
    } catch {
      return false;
    }
  }, [getAgreementStorageKey]);

  const markAgreementAccepted = useCallback((userIdentifier?: string | null) => {
    const storageKey = getAgreementStorageKey(userIdentifier);
    if (!storageKey || typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(storageKey, 'true');
    } catch {
      // ignore localStorage failures
    }
  }, [getAgreementStorageKey]);

  const refreshAuthState = useCallback(async () => {
    setAuthNotice(null);

    if (!isFakeBackend() && !hasAmplifyAuthConfig()) {
      setAuthNotice('Authentication is not configured yet. Please try again later.');
      setCurrentUser(null);
      setUserAttributes(null);
      setIsAuthenticated(false);
      setShowAgreementPrompt(false);
      setAgreementPendingUserKey(null);
      return;
    }

    try {
      const user = isFakeBackend()
        ? await fakeGetCurrentUser()
        : await getCurrentUser();
      const attributes = isFakeBackend()
        ? await fakeFetchUserAttributes()
        : await fetchUserAttributes();

      const userIdentifier =
        user?.userId ||
        attributes?.sub ||
        user?.username ||
        attributes?.email ||
        null;

      setCurrentUser(user);
      setUserAttributes(attributes);
      setIsAuthenticated(true);

      if (!hasAcceptedAgreement(userIdentifier)) {
        setAgreementPendingUserKey(userIdentifier);
        setShowAgreementPrompt(Boolean(userIdentifier));
      } else {
        setAgreementPendingUserKey(null);
        setShowAgreementPrompt(false);
      }
    } catch {
      setCurrentUser(null);
      setUserAttributes(null);
      setIsAuthenticated(false);
      setShowAgreementPrompt(false);
      setAgreementPendingUserKey(null);
    }
  }, [hasAcceptedAgreement]);

  useEffect(() => {
    refreshAuthState();
  }, [refreshAuthState]);

  useEffect(() => {
    if (showAuth && isAuthenticated) {
      setShowAuth(false);
    }
  }, [isAuthenticated, showAuth]);

  const handleSignOut = async () => {
    if (isFakeBackend()) {
      await fakeSignOut();
    } else {
      await amplifySignOut();
    }
    setCurrentUser(null);
    setUserAttributes(null);
    setIsAuthenticated(false);
  };

  const handleAuthComplete = useCallback(async () => {
    await refreshAuthState();
    setShowAuth(false);
  }, [refreshAuthState]);

  const handleAcceptAgreement = useCallback(() => {
    markAgreementAccepted(agreementPendingUserKey);
    setShowAgreementPrompt(false);
    setAgreementPendingUserKey(null);
  }, [agreementPendingUserKey, markAgreementAccepted]);

  const handleDismissAgreement = useCallback(() => {
    setShowAgreementPrompt(false);
  }, []);

  const submitAuthFormOnEnter = (event: React.KeyboardEvent<HTMLElement>) => {
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.metaKey ||
      event.ctrlKey
    ) {
      return;
    }

    const target = event.target as HTMLElement;
    const form = target.closest('form');

    if (!form) return;

    event.preventDefault();
    form.requestSubmit();
  };

  return (
    <div className="h-screen overflow-hidden bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <RecipeBuilder
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        userAttributes={userAttributes}
        onRequestAuth={() => setShowAuth(true)}
        onSignOut={isAuthenticated ? handleSignOut : undefined}
      />

      {showAgreementPrompt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--theme-overlay)] px-4 py-6 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 shadow-[0_30px_90px_rgba(34,18,36,0.35)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--theme-accent)]">
              User agreement
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-[var(--theme-text)]">
              Please confirm the agreement
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--theme-text-muted)]">
              To keep using Arcane Kitchen safely, please confirm that you own or have permission to share the recipes you upload.
            </p>
            <div className="mt-5 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-alt)] p-4 text-sm text-[var(--theme-text-muted)]">
              You can accept this now and continue using the app. If you prefer, you can close this prompt and return later.
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleDismissAgreement}
                className="rounded-xl border border-[var(--theme-border)] px-4 py-2 text-sm font-medium text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-alt)]"
              >
                Maybe later
              </button>
              <button
                type="button"
                onClick={handleAcceptAgreement}
                className="rounded-xl bg-[var(--theme-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Accept and continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuth && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--theme-overlay)] px-4 py-6 backdrop-blur-md sm:py-10">
          <div className="mx-auto flex min-h-full w-full max-w-5xl items-center justify-center">
            <div className="relative grid w-full overflow-hidden rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-[0_30px_90px_rgba(34,18,36,0.35)] md:grid-cols-[0.95fr_1fr]">
              <section className="relative hidden min-h-[620px] bg-[var(--theme-sage-strong)] p-8 text-white md:block">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(111,43,106,0.34),transparent_32%),linear-gradient(145deg,rgba(111,43,106,0.2),transparent_55%)]" />
                <div className="relative flex h-full flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-[color-mix(in_srgb,var(--theme-accent)_45%,white_55%)]">
                      Member Kitchen
                    </p>
                    <h2 className="mt-4 text-4xl font-semibold tracking-normal">
                      Share recipes people want to save
                    </h2>
                    <p className="mt-4 max-w-sm text-sm leading-7 text-white/72">
                      Log in to publish recipes, save favorites, and build a
                      collection that other cooks can discover.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur">
                    <p className="text-sm font-semibold">After logging in</p>
                    <div className="mt-4 grid gap-3 text-sm text-white/72">
                      <span>Publish recipes into the shared feed</span>
                      <span>Save drafts and build your collection</span>
                      <span>Show your creator profile on every post</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="max-h-[calc(100vh-3rem)] overflow-y-auto p-5 sm:p-7 md:max-h-[calc(100vh-5rem)]">
                <div className="mb-5 pr-14 md:hidden">
                  <p className="text-xs font-semibold uppercase text-[var(--theme-accent)]">
                    Member Kitchen
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-normal">
                    Share recipes people want to save
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--theme-text-muted)]">
                    Log in to publish recipes, save favorites, and build your
                    collection.
                  </p>
                </div>

                <button
                  onClick={() => setShowAuth(false)}
                  className="absolute right-4 top-4 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2 text-sm font-medium text-[var(--theme-text-muted)] shadow-sm transition hover:bg-[var(--theme-surface-alt)] hover:text-[var(--theme-text)]"
                >
                  Close
                </button>

                <div className="auth-panel" onKeyDown={submitAuthFormOnEnter}>
                  {authNotice && (
                    <div className="mb-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                      {authNotice}
                    </div>
                  )}
                  <Authenticator
                    hideSignUp
                    components={{
                      SignIn: CustomSignIn as any,
                      ConfirmSignUp: {
                        Header: ConfirmationCodeHeader,
                      },
                    }}
                    formFields={authFormFields}
                    services={authServices}
                  >
                    {() => <AuthSuccess onComplete={handleAuthComplete} />}
                  </Authenticator>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
