import type { ReactNode } from 'react';
import { sanctuaryBackground } from '../../theme/sanctuaryTheme';
import { SANCTUARY_ARTWORK } from '../../theme/sanctuaryArtwork';
import type { KITCHEN_CLASSES } from '../../utils/kitchenIdentity';
import ColorSchemeImage from './ColorSchemeImage';
import SanctuaryMotif from './SanctuaryMotif';

type SanctuaryId = (typeof KITCHEN_CLASSES)[number]['id'];

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  level?: 1 | 2;
  callingId?: SanctuaryId;
};

export default function SanctuaryHeading({
  eyebrow,
  title,
  description,
  actions,
  level = 1,
  callingId,
}: Props) {
  const Heading = level === 1 ? 'h1' : 'h2';
  const artwork = callingId ? SANCTUARY_ARTWORK[callingId] : undefined;
  return (
    <header
      className="ak-sanctuary-heading relative isolate overflow-hidden rounded-3xl px-5 py-6 text-white sm:px-8 sm:py-7"
      style={{ background: sanctuaryBackground }}
    >
      {artwork ? (
        <>
          <ColorSchemeImage
            lightSrc={artwork.light}
            darkSrc={artwork.dark}
            width={2172}
            height={724}
            wrapperClassName="absolute inset-0"
            imageClassName="h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/35"
            aria-hidden="true"
          />
        </>
      ) : (
        <SanctuaryMotif />
      )}
      <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0 max-w-2xl">
          {eyebrow && <p className="ak-eyebrow text-white/80">{eyebrow}</p>}
          <Heading
            className={`ak-banner-title text-3xl leading-tight sm:text-4xl ${eyebrow ? 'mt-3' : ''}`}
          >
            {title}
          </Heading>
          {description && (
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/85">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}
