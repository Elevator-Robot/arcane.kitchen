import { useState } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react-core';
import Input from './ui/Input';
import Button from './ui/Button';

interface SignInFormProps {
  onSignInStart?: () => void;
  onTermsOpen?: () => void;
}

const AGREEMENT_TEXT = `I agree to the User Agreement and confirm that I will only upload recipes I have the right to share.`;

function TermsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--theme-overlay)] backdrop-blur-md">
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 shadow-lg">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] transition"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-semibold text-[var(--theme-text)] mb-4">User Agreement</h2>

        <div className="space-y-4 text-sm text-[var(--theme-text-muted)] max-h-[400px] overflow-y-auto">
          <section>
            <h3 className="font-semibold text-[var(--theme-text)] mb-2">Your Content</h3>
            <p>
              You retain ownership of any recipes, text, photos, and other content you submit. By uploading
              content to Arcane Kitchen, you grant us a non-exclusive, royalty-free license to display, store,
              and distribute it on the platform.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-[var(--theme-text)] mb-2">Copyright & Originality</h3>
            <p>
              You represent and warrant that all content you upload is your original work, or that you have
              obtained all necessary rights and permissions to share it. You may not upload recipes, photos, or
              text that infringe upon the copyright, trademark, or other intellectual property rights of any
              person or entity. This includes recipes copied from cookbooks, websites, or other sources without
              permission.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-[var(--theme-text)] mb-2">Prohibited Conduct</h3>
            <p>
              You agree not to submit content that is unlawful, misleading, plagiarized, or otherwise
              violates the rights of others. Arcane Kitchen reserves the right to review, modify, or remove
              any content at its sole discretion.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-[var(--theme-text)] mb-2">Enforcement</h3>
            <p>
              Violation of these terms may result in content removal, account suspension, or termination
              of access to the platform, with or without notice.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-[var(--theme-text)] mb-2">Disclaimer</h3>
            <p>
              Arcane Kitchen is provided "as is" without warranties of any kind. We are not responsible for
              the accuracy, completeness, or safety of user-submitted recipes. Use the platform at your
              own risk.
            </p>
          </section>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 rounded-lg bg-[var(--theme-accent)] text-white font-medium hover:opacity-90 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export const SignInForm: React.FC<SignInFormProps> = ({ onSignInStart, onTermsOpen }) => {
  const { submitForm, validationErrors } = useAuthenticator((context) => [
    context.submitForm,
    context.validationErrors,
  ]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
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
        __agreeToTerms: agreeToTerms,
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

        <div className="space-y-2">
          <div className="flex items-start gap-3 pt-2">
            <input
              type="checkbox"
              id="agree-terms"
              checked={agreeToTerms}
              onChange={(e) => setAgreeToTerms(e.target.checked)}
              disabled={isLoading}
              className="mt-1 w-4 h-4 cursor-pointer rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] accent-[var(--theme-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Accept user agreement"
            />
            <label htmlFor="agree-terms" className="text-sm text-[var(--theme-text-muted)] cursor-pointer select-none">
              <span>{AGREEMENT_TEXT}</span>
              <button
                type="button"
                onClick={() => {
                  setTermsModalOpen(true);
                  onTermsOpen?.();
                }}
                className="ml-1 text-[var(--theme-accent)] hover:underline font-medium"
              >
                View full terms
              </button>
            </label>
          </div>
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

      <TermsModal isOpen={termsModalOpen} onClose={() => setTermsModalOpen(false)} />
    </>
  );
};

export default SignInForm;
