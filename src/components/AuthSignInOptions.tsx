import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react-core';
import { I18n } from 'aws-amplify/utils';
import { ArrowLeft, Mail } from 'lucide-react';

I18n.putVocabularies({ en: { 'Sign In with Google': 'Continue with Google' } });

const EmailSignInContext = createContext<{
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
} | null>(null);

/** Keep the choice across Authenticator routes, but reset it when the modal closes. */
export function AuthSignInOptions({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const value = useMemo(() => ({ expanded, setExpanded }), [expanded]);
  return (
    <EmailSignInContext.Provider value={value}>
      <div className="ak-auth-methods" data-email-expanded={expanded}>
        {children}
      </div>
    </EmailSignInContext.Provider>
  );
}

/** Use the supported footer slot so native fields, validation, and Google SSO remain intact. */
export function EmailSignInFooter() {
  const options = useContext(EmailSignInContext);
  if (!options) throw new Error('Email sign-in requires AuthSignInOptions.');
  const { expanded, setExpanded } = options;
  const { error, isPending, toForgotPassword } = useAuthenticator((context) => [
    context.error,
    context.isPending,
    context.toForgotPassword,
  ]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const focusRequested = useRef(false);
  const fieldsId = useId();

  useEffect(() => {
    if (error) setExpanded(true);
  }, [error, setExpanded]);

  useEffect(() => {
    const form = buttonRef.current?.closest('form');
    const fields = form?.querySelector('fieldset');
    if (fields) fields.id = fieldsId;
    if (expanded && focusRequested.current) {
      form?.querySelector<HTMLInputElement>('input[name="username"]')?.focus();
      focusRequested.current = false;
    }
  }, [expanded, fieldsId]);

  return (
    <div className="ak-auth-email-footer">
      {expanded && (
        <button
          type="button"
          onClick={() => toForgotPassword()}
          disabled={isPending}
          aria-label="Forgot your password?"
          className="amplify-button amplify-button--link ak-auth-glass-secondary"
        >
          <span className="ak-auth-label-long">Forgot your password?</span>
          <span className="ak-auth-label-short">Forgot password?</span>
        </button>
      )}
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={expanded}
        aria-controls={fieldsId}
        aria-label={
          expanded ? 'Back to sign-in options' : 'Continue with email'
        }
        disabled={isPending}
        className={`ak-auth-email-toggle ${expanded ? 'ak-auth-email-toggle-open ak-auth-glass-secondary' : ''}`}
        onClick={() => {
          focusRequested.current = !expanded;
          setExpanded(!expanded);
        }}
      >
        {expanded ? (
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Mail className="h-4 w-4" aria-hidden="true" />
        )}
        {expanded ? (
          <>
            <span className="ak-auth-label-long">Back to sign-in options</span>
            <span className="ak-auth-label-short">Other options</span>
          </>
        ) : (
          'Continue with email'
        )}
      </button>
    </div>
  );
}
