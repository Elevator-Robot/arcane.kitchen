import { useEffect, useState } from 'react';
import { getRecipeImageSource } from '../../utils/recipeImages';
import RecipeImage from './RecipeImage';

/** Resolve storage keys only for photos currently mounted in the interface. */
export default function RecipePhoto({
  imageUrl,
  alt,
  className,
}: {
  imageUrl?: string | null;
  alt: string;
  className?: string;
}) {
  const [resolved, setResolved] = useState<{
    source?: string | null;
    url: string;
  }>();
  useEffect(() => {
    let cancelled = false;
    void getRecipeImageSource(imageUrl).then((url) => {
      if (!cancelled) setResolved({ source: imageUrl, url });
    });
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);
  return (
    <RecipeImage
      src={resolved?.source === imageUrl ? resolved?.url : undefined}
      alt={alt}
      className={className}
    />
  );
}
