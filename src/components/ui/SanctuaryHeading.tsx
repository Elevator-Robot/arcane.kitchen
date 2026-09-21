import type { ReactNode } from 'react';
import { sanctuaryBackground } from '../../theme/sanctuaryTheme';
import SanctuaryMotif from './SanctuaryMotif';

type Props = {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  level?: 1 | 2;
};

export default function SanctuaryHeading({
  eyebrow,
  title,
  description,
  actions,
  level = 1,
}: Props) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <header
      className="ak-sanctuary-heading relative isolate overflow-hidden rounded-3xl px-5 py-6 text-white sm:px-8 sm:py-7"
      style={{ background: sanctuaryBackground }}
    >
      <SanctuaryMotif />
      <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0 max-w-2xl">
          <p className="ak-eyebrow text-white/80">{eyebrow}</p>
          <Heading className="mt-3 text-3xl leading-tight sm:text-4xl">
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
