import { useState } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react-core';
import Input from './ui/Input';
import Button from './ui/Button';

interface SignInFormProps {
  onSignInStart?: () => void;
}

export const SignInForm: React.FC<SignInFormProps> = ({ onSignInStart }) => {
  const { submitForm } = useAuthenticator((context) => [
    context.submitForm,
  ]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    onSignInStart?.();

    try {
      await submitForm({
        username: email,
        password,
      });
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Sign in failed. Please try again.');
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div>
          <Input
            type="password"
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-400/30 p-3">
            <p className="text-red-300 text-sm flex items-start">
              <svg
                className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </p>
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          isLoading={isLoading}
          className="w-full mt-6"
        >
          Sign In / Create Account
        </Button>
      </form>
    </>
  );
};

export default SignInForm;
