import { useEffect, useRef, useState } from 'react';
import { Check, Share } from 'lucide-react';
import { getProfileShareUrl } from '../../utils/userProfiles';
import Button from '../ui/Button';

export default function ShareProfileButton({ username }: { username: string }) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'copied' | 'error'>(
    'idle'
  );
  const pending = useRef(false);
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);
  const share = async () => {
    if (pending.current) return;
    pending.current = true;
    clearTimeout(timer.current);
    setStatus('pending');
    const url = getProfileShareUrl(username) || window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      if (mounted.current) {
        setStatus('copied');
        timer.current = setTimeout(() => setStatus('idle'), 2500);
      }
    } catch (error) {
      console.error('Profile link copy failed', error);
      if (mounted.current) setStatus('error');
    } finally {
      pending.current = false;
    }
  };
  return (
    <Button
      variant="banner"
      aria-label="Share profile"
      onClick={share}
      disabled={status === 'pending'}
      aria-busy={status === 'pending'}
    >
      {status === 'copied' ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Share className="h-4 w-4" aria-hidden="true" />
      )}
      <span aria-live="polite">
        {status === 'pending'
          ? 'Copying…'
          : status === 'copied'
            ? 'Copied!'
            : status === 'error'
              ? 'Try again'
              : 'Share'}
      </span>
    </Button>
  );
}
