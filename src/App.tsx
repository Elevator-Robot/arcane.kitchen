import { useCallback, useEffect, useState } from 'react';
import { Authenticator, Text } from '@aws-amplify/ui-react';
import { useAuthenticator } from '@aws-amplify/ui-react-core';
import {
  fetchUserAttributes,
  getCurrentUser,
  signIn,
  signOut as amplifySignOut,
  signUp,
} from 'aws-amplify/auth';
import RecipeBuilder from './components/RecipeBuilder';

const authFormFields = {
  signIn: {
    username: {
      placeholder: 'you@example.com',
      label: 'Email',
    },
  },
};

const authServices = {
  async handleSignIn(input: any) {
    const username = input.username?.trim().toLowerCase();
    const password = input.password;

    try {
      return await signIn({ username, password });
    } catch (error: any) {
      const shouldCreateAccount =
        error?.name === 'UserNotFoundException' ||
        error?.name === 'NotAuthorizedException';

      if (!shouldCreateAccount) {
        throw error;
      }

      try {
        const defaultNickname = username.split('@')[0] || 'cook';
        const signUpResult = await signUp({
          username,
          password,
          options: {
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
};

function ConfirmationCodeHeader() {
  const [code, setCode] = useState(Array(6).fill(''));
  const { updateForm } = useAuthenticator((context) => [
    context.updateForm,
  ]);

  const syncConfirmationField = (confirmationCode: string) => {
    updateForm({
      name: 'confirmation_code',
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
      const nextInput = document.getElementById(`confirmation-code-${index + 1}`);
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

function AuthSuccess({
  onComplete,
}: {
  onComplete: () => Promise<void>;
}) {
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

  const refreshAuthState = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      const attributes = await fetchUserAttributes();

      setCurrentUser(user);
      setUserAttributes(attributes);
      setIsAuthenticated(true);
    } catch {
      setCurrentUser(null);
      setUserAttributes(null);
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    refreshAuthState();
  }, [refreshAuthState]);

  const handleSignOut = async () => {
    await amplifySignOut();
    setCurrentUser(null);
    setUserAttributes(null);
    setIsAuthenticated(false);
  };

  const handleAuthComplete = useCallback(async () => {
    await refreshAuthState();
    setShowAuth(false);
  }, [refreshAuthState]);

  const submitAuthFormOnEnter = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.metaKey || event.ctrlKey) {
      return;
    }

    const target = event.target as HTMLElement;
    const form = target.closest('form');

    if (!form) return;

    event.preventDefault();
    form.requestSubmit();
  };

  return (
    <div className="min-h-screen bg-[#f7f3ec]">
      <RecipeBuilder
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        userAttributes={userAttributes}
        onRequestAuth={() => setShowAuth(true)}
        onSignOut={isAuthenticated ? handleSignOut : undefined}
      />

      {showAuth && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#201a16]/62 px-4 py-6 backdrop-blur-md sm:py-10">
          <div className="mx-auto flex min-h-full w-full max-w-5xl items-center justify-center">
            <div className="relative grid w-full overflow-hidden rounded-3xl border border-white/45 bg-[#fffaf4] shadow-[0_30px_90px_rgba(32,26,22,0.35)] md:grid-cols-[0.95fr_1fr]">
              <section className="relative hidden min-h-[620px] bg-[#201a16] p-8 text-white md:block">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(242,180,159,0.28),transparent_32%),linear-gradient(145deg,rgba(200,79,49,0.18),transparent_55%)]" />
                <div className="relative flex h-full flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-[#f2b49f]">
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

                  <div className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur">
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
                  <p className="text-xs font-semibold uppercase text-[#c84f31]">
                    Member Kitchen
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-normal">
                    Share recipes people want to save
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#74665a]">
                    Log in to publish recipes, save favorites, and build your
                    collection.
                  </p>
                </div>

                <button
                  onClick={() => setShowAuth(false)}
                  className="absolute right-4 top-4 rounded-full border border-[#e2d8ca] bg-white/90 px-4 py-2 text-sm font-semibold text-[#51463d] shadow-sm transition hover:bg-[#f0e8dc]"
                >
                  Close
                </button>

                <div className="auth-panel" onKeyDown={submitAuthFormOnEnter}>
                  <Authenticator
                    hideSignUp
                    components={{
                      SignIn: {
                        Header() {
                          return null;
                        },
                        Footer() {
                          return null;
                        },
                      },
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
