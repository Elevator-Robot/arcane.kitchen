import { ShieldCheck } from 'lucide-react';
import ProfileLink from './ProfileLink';
import Button from './ui/Button';

type Props = {
  onHome: () => void;
  homeLabel?: string;
  profilePath: string;
  profileLabel: string;
  profileAvatar?: string | null;
  isAuthenticated: boolean;
  adminWorkspace?: boolean;
  onRequestAuth?: () => void;
};

export default function WorkspaceHeader({
  onHome,
  homeLabel = 'Go to Home',
  profilePath,
  profileLabel,
  profileAvatar,
  isAuthenticated,
  adminWorkspace = false,
  onRequestAuth,
}: Props) {
  return (
    <header role="banner" className="ak-app-header relative z-20 shrink-0">
      <div className="ak-page-rail ak-app-header-inner">
        <button
          type="button"
          onClick={onHome}
          className="ak-logo-button ak-brand-lockup"
          aria-label={homeLabel}
        >
          <img
            src="/logo-no-background.svg"
            alt=""
            draggable={false}
            className="ak-brand-mark pointer-events-none"
          />
          <span className="ak-brand-wordmark">
            Arcane Kitchen
            <span className="ak-brand-caption">
              A gathering of curious cooks
            </span>
          </span>
        </button>
        <span className="ak-header-flourish" aria-hidden="true">
          <span /> ✧ <span />
        </span>
        <div className="flex items-center gap-3">
          {adminWorkspace ? (
            <span className="ak-admin-access">
              <ShieldCheck size={14} aria-hidden="true" /> Admin
            </span>
          ) : (
            <span className="ak-header-note">Pull up a chair.</span>
          )}
          {isAuthenticated ? (
            <ProfileLink
              profilePath={profilePath}
              profileLabel={profileLabel}
              profileAvatar={profileAvatar}
            />
          ) : (
            <Button onClick={onRequestAuth} className="rounded-full">
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
