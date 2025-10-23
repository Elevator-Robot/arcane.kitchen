import React, { useState } from 'react';
import { signIn } from 'aws-amplify/auth';

interface LoginProps {
  onComplete: () => void;
  onBack: () => void;
}

const Login: React.FC<LoginProps> = ({ onComplete, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
        // Clear any prefill data from localStorage
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
            Welcome Back, Kitchen Witch
          </h1>
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent mx-auto mb-6"></div>
          <p className="text-lg text-stone-300 leading-relaxed">
            Sign in to continue your magical culinary journey
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

          {/* Login Form */}
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
