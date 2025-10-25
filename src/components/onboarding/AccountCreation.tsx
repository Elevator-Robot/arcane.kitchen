import React, { useState } from 'react';
import { signUp, confirmSignUp, signIn } from 'aws-amplify/auth';

interface AccountCreationProps {
  userName: string;
  userAvatar: string;
  onComplete: () => void;
}

const AccountCreation: React.FC<AccountCreationProps> = ({
  userName,
  userAvatar,
  onComplete,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      setIsLoading(false);
      return;
    }

    try {
      const result = await signUp({
        username: email,
        password: password,
        options: {
          userAttributes: {
            email: email,
            nickname: userName,
            picture: userAvatar,
          },
        },
      });

      if (result.nextStep?.signUpStep === 'CONFIRM_SIGN_UP') {
        setNeedsConfirmation(true);
      } else {
        // Auto sign in and complete
        await handleAutoSignIn();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await confirmSignUp({
        username: email,
        confirmationCode: confirmationCode,
      });

      // After confirmation, sign in automatically
      await handleAutoSignIn();
    } catch (err: any) {
      setError(
        err.message || 'Failed to confirm account. Please check the code.'
      );
      setIsLoading(false);
    }
  };

  const handleAutoSignIn = async () => {
    try {
      const result = await signIn({
        username: email,
        password: password,
      });

      if (result.isSignedIn) {
        // Clear prefill data from localStorage after successful account creation
        localStorage.removeItem('arcane_onboarding_prefill');
        onComplete();
      }
    } catch (err: any) {
      setError(err.message || 'Account created but failed to sign in.');
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn({
        username: email,
        password: password,
      });

      if (result.isSignedIn) {
        // Clear prefill data from localStorage
        localStorage.removeItem('arcane_onboarding_prefill');
        onComplete();
      }
    } catch (err: any) {
      setError(
        err.message || 'Failed to sign in. Please check your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-4">
            {needsConfirmation
              ? 'Confirm Your Email'
              : isLoginMode
                ? 'Welcome Back'
                : 'Join the Coven'}
          </h1>
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent mx-auto mb-6"></div>
          <p className="text-lg text-stone-300 leading-relaxed">
            {needsConfirmation
              ? 'Enter the confirmation code sent to your email'
              : isLoginMode
                ? 'Sign in to continue your magical journey'
                : 'Create your account to save your magical journey'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-gradient-to-br from-stone-800/60 via-green-900/30 to-amber-900/30 backdrop-blur-lg border border-green-400/40 rounded-3xl p-8 shadow-2xl shadow-emerald-500/10">
          {/* Profile Preview - Only show for signup */}
          {!isLoginMode && !needsConfirmation && (
            <div className="text-center mb-6">
              <div className="inline-block relative">
                <img
                  src={`/images/profile-pictures/${userAvatar}`}
                  alt="Your Avatar"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500/60 shadow-xl mx-auto mb-3"
                />
                <div className="absolute -inset-2 bg-gradient-to-r from-emerald-400/20 to-green-400/20 rounded-2xl blur-lg animate-pulse"></div>
              </div>
              <h3 className="text-xl font-bold text-stone-200">{userName}</h3>
              <p className="text-sm text-emerald-300">Your mystical identity</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          {!needsConfirmation && !isLoginMode ? (
            /* Sign Up Form */
            <form onSubmit={handleSignUp} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-green-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="chat-input w-full"
                  placeholder="witch@arcane.kitchen"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-green-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="chat-input w-full"
                  placeholder="Enter a strong password"
                  required
                  minLength={8}
                />
                <p className="text-xs text-stone-400 mt-1">
                  At least 8 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-green-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="chat-input w-full"
                  placeholder="Confirm your password"
                  required
                  minLength={8}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Creating Account...
                  </div>
                ) : (
                  'Create Account & Enter Kitchen ✨'
                )}
              </button>

              <p className="text-xs text-center text-stone-400 pt-2">
                By creating an account, you join our mystical community of
                kitchen witches
              </p>

              {/* Discreet Login Link */}
              <div className="text-center pt-4 border-t border-stone-700/30 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginMode(true);
                    setError('');
                  }}
                  className="text-sm text-stone-400 hover:text-emerald-300 transition-colors"
                >
                  Already have an account?{' '}
                  <span className="text-emerald-400 hover:text-emerald-300">
                    Sign in
                  </span>
                </button>
              </div>
            </form>
          ) : !needsConfirmation && isLoginMode ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-green-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="chat-input w-full"
                  placeholder="witch@arcane.kitchen"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-green-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="chat-input w-full"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Signing In...
                  </div>
                ) : (
                  'Sign In & Enter Kitchen ✨'
                )}
              </button>

              {/* Back to Sign Up Link */}
              <div className="text-center pt-4 border-t border-stone-700/30 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginMode(false);
                    setError('');
                  }}
                  className="text-sm text-stone-400 hover:text-emerald-300 transition-colors"
                >
                  Don't have an account?{' '}
                  <span className="text-emerald-400 hover:text-emerald-300">
                    Create one
                  </span>
                </button>
              </div>
            </form>
          ) : (
            /* Confirmation Form */
            <form onSubmit={handleConfirmSignUp} className="space-y-5">
              <div className="text-center mb-4">
                <p className="text-sm text-stone-300">
                  We've sent a confirmation code to:
                </p>
                <p className="text-emerald-300 font-medium mt-1">{email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-green-300 mb-2 text-center">
                  Confirmation Code
                </label>
                <input
                  type="text"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  className="chat-input w-full text-center text-2xl tracking-widest"
                  placeholder="000000"
                  required
                  maxLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Confirming...
                  </div>
                ) : (
                  'Confirm & Enter Kitchen ✨'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Mystical quote */}
        <div className="text-sm text-stone-400/70 max-w-xl mx-auto italic pt-6 text-center">
          "With this sacred bond, you join the ancient order of culinary magic."
        </div>
      </div>
    </div>
  );
};

export default AccountCreation;
