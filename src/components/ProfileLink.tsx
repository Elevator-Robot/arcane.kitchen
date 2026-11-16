import { useState, type CSSProperties } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { randomMerlinColor } from '../theme/merlinPalette';
import { getPortraitSource } from '../utils/recipeDisplay';

/** A personal sigil that leads straight to the owner's profile. */
export default function ProfileLink({
  profilePath,
  profileLabel,
  profileAvatar,
}: {
  profilePath: string;
  profileLabel: string;
  profileAvatar?: string | null;
}) {
  const { pathname } = useLocation();
  const [accent] = useState(randomMerlinColor);
  const name = profileLabel.replace(/^@+/, '');
  const avatar = getPortraitSource(profileAvatar);
  const active =
    pathname.replace(/\/+$/, '') === profilePath.replace(/\/+$/, '');
  return (
    <Link
      to={profilePath}
      className="ak-profile-link"
      aria-label={`View your profile, ${name}`}
      aria-current={active ? 'page' : undefined}
      style={{ '--ak-profile-link-accent': accent } as CSSProperties}
    >
      <span className="ak-profile-sigil" aria-hidden="true">
        <svg className="ak-profile-orbit" viewBox="0 0 64 64" fill="none">
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth=".7"
          />
          <path
            d="M32 1v7m0 48v7M1 32h7m48 0h7M11 11l4 4m34 34 4 4M11 53l4-4m34-34 4-4"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path
            d="m32 4 2 3-2 3-2-3Zm25 26 3 2-3 2-3-2ZM32 54l2 3-2 3-2-3ZM7 30l3 2-3 2-3-2Z"
            fill="currentColor"
          />
        </svg>
        <span className="ak-profile-sigil-portrait">
          {avatar ? (
            <img src={avatar} alt="" loading="lazy" />
          ) : (
            name.slice(0, 1).toUpperCase()
          )}
        </span>
        <span className="ak-profile-sigil-star">✧</span>
      </span>
      <span className="ak-profile-link-label">
        <span>{name}</span>
        <span>Profile</span>
      </span>
    </Link>
  );
}
