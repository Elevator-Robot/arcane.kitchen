import type { ReactNode } from 'react';
import type { KITCHEN_CLASSES } from '../../utils/kitchenIdentity';
import PageBanner from './PageBanner';

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
  return (
    <PageBanner callingId={callingId} className="ak-sanctuary-heading">
      <div className="ak-page-banner-content relative flex flex-wrap items-center justify-between gap-5">
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
    </PageBanner>
  );
}
