import { useEffect, useRef, useState } from 'react';
import { Share } from 'lucide-react';
import { getProfileShareUrl } from '../../utils/userProfiles';
import Button from '../ui/Button';

export default function ShareProfileButton({
  username,
  onShare,
}: {
  username: string;
  onShare?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const share = async () => {
    if (onShare) {
      onShare();
      return;
    }
    const url = getProfileShareUrl(username) || window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${username} on Arcane Kitchen`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Share failed', error);
    }
  };
  return (
    <Button variant="banner" aria-label="Share profile" onClick={share}>
      <Share className="h-4 w-4" aria-hidden="true" />
      {copied ? 'Copied!' : 'Share'}
    </Button>
  );
}
