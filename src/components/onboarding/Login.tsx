import React, { useState } from 'react';
import { signIn, signOut, confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';

interface LoginProps {
  onComplete: () => void;
  onBack: () => void;
}

const Login: React.FC<LoginProps> = ({ onComplete, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // First, try to sign out any existing session
      try {
        await signOut();
      } catch (signOutError) {
        // Ignore sign out errors - user might not be signed in
        console.log('No existing session to sign out');
      }

      // Now sign in with the provided credentials
      const result = await signIn({
        username: email,
        password: password,
      });

      console.log('Sign in result:', result);

      // Check if user needs to confirm their account
      if (result.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
        console.log('User needs confirmation - showing confirmation form');
        setNeedsConfirmation(true);
        setError('');
        return;
      }

      if (result.isSignedIn) {
        // Clear any prefill data from localStorage
        localStorage.removeItem('arcane_onboarding_prefill');
        onComplete();
      }
    } catch (err: any) {
      // Log the error details to help debug
      console.error('Login error - Full details:', err);
      
      // Still check for error-based unconfirmed state (just in case)
      const errorType = err.name || err.code || err.__type || '';
      const errorMessage = err.message || '';
      
      const isUnconfirmed = 
        errorType.includes('UserNotConfirmedException') ||
        errorMessage.toLowerCase().includes('not confirmed') ||
        errorMessage.toLowerCase().includes('user is not confirmed');

      if (isUnconfirmed) {
        console.log('User needs confirmation (from error) - showing confirmation form');
        setNeedsConfirmation(true);
        setError('');
      } else {
        setError(
          err.message || 'Failed to sign in. Please check your credentials.'
        );
      }
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

      console.log('Account confirmed successfully');

      // After confirmation, try to sign in again
      const result = await signIn({
        username: email,
        password: password,
      });

      if (result.isSignedIn) {
        localStorage.removeItem('arcane_onboarding_prefill');
        onComplete();
      }
    } catch (err: any) {
      console.error('Confirmation error:', err);
      setError(
        err.message || 'Failed to confirm account. Please check the code.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setError('');

    try {
      await resendSignUpCode({ username: email });
      setError('');
      // Show success message briefly
      const successMsg = 'Code resent! Check your email.';
      setError(successMsg);
      setTimeout(() => {
        if (error === successMsg) setError('');
      }, 3000);
    } catch (err: any) {
      console.error('Resend code error:', err);
      setError(err.message || 'Failed to resend code.');
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
              : 'Welcome Back, Kitchen Witch'}
          </h1>
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent mx-auto mb-6"></div>
          <p className="text-lg text-stone-300 leading-relaxed">
            {needsConfirmation
              ? 'Enter the confirmation code sent to your email'
              : 'Sign in to continue your magical culinary journey'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-gradient-to-br from-stone-800/60 via-green-900/30 to-amber-900/30 backdrop-blur-lg border border-green-400/40 rounded-3xl p-8 shadow-2xl shadow-emerald-500/10">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          {!needsConfirmation ? (
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
                  autoFocus
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

              {/* Back Link */}
              <div className="text-center pt-4 border-t border-stone-700/30 mt-6">
                <button
                  type="button"
                  onClick={onBack}
                  className="text-sm text-stone-400 hover:text-emerald-300 transition-colors"
                >
                  ← Back to welcome
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
                  autoFocus
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
                  'Confirm & Sign In ✨'
                )}
              </button>

              {/* Resend Code Link */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isLoading}
                  className="text-sm text-stone-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
                >
                  Didn't receive the code? Resend it
                </button>
              </div>

              {/* Back to Login Link */}
              <div className="text-center pt-4 border-t border-stone-700/30">
                <button
                  type="button"
                  onClick={() => {
                    setNeedsConfirmation(false);
                    setConfirmationCode('');
                    setError('');
                  }}
                  className="text-sm text-stone-400 hover:text-emerald-300 transition-colors"
                >
                  ← Back to login
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Mystical quote */}
        <div className="text-sm text-stone-400/70 max-w-xl mx-auto italic pt-6 text-center">
          "The kitchen remembers its witches, and welcomes them home."
        </div>
      </div>
    </div>
  );
};

export default Login;
