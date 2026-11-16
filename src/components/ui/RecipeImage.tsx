import { useState } from 'react';
import { CookingPot } from 'lucide-react';

export default function RecipeImage({
  src,
  alt,
  className = '',
  eager = false,
}: {
  src?: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string>();
  return src && src !== '__no_image__' && src !== failedSource ? (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={`ak-food-image ${className}`}
      onError={() => setFailedSource(src)}
    />
  ) : (
    <div
      className={`ak-recipe-placeholder ${className}`}
      role="img"
      aria-label={alt}
    >
      <span className="ak-recipe-placeholder-seal">
        <CookingPot aria-hidden="true" />
      </span>
      <span className="ak-eyebrow">From the kitchen</span>
      <span className="ak-placeholder-rule" aria-hidden="true">
        ✧
      </span>
    </div>
  );
}
