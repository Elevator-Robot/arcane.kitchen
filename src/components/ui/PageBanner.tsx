import type { ReactNode } from 'react';
import type { KITCHEN_CLASSES } from '../../utils/kitchenIdentity';
import { SANCTUARY_ARTWORK } from '../../theme/sanctuaryArtwork';
import { sanctuaryBackground } from '../../theme/sanctuaryTheme';
import ColorSchemeImage from './ColorSchemeImage';
import SanctuaryMotif from './SanctuaryMotif';

/** One measured artwork frame for every page and profile workspace. */
export default function PageBanner({
  callingId,
  background = sanctuaryBackground,
  as: Element = 'header',
  className = '',
  children,
}: {
  callingId?: (typeof KITCHEN_CLASSES)[number]['id'];
  background?: string;
  as?: 'header' | 'div';
  className?: string;
  children: ReactNode;
}) {
  const artwork = callingId ? SANCTUARY_ARTWORK[callingId] : undefined;
  return (
    <Element
      data-page-banner
      className={`ak-page-banner ak-artwork-surface ${className}`}
      style={{ background }}
    >
      {artwork ? (
        <ColorSchemeImage
          lightSrc={artwork.light}
          darkSrc={artwork.dark}
          width={2172}
          height={724}
          wrapperClassName="absolute inset-0"
          imageClassName="h-full w-full object-cover"
        />
      ) : (
        <SanctuaryMotif />
      )}
      <div className="ak-banner-shade absolute inset-0" aria-hidden="true" />
      {children}
    </Element>
  );
}
