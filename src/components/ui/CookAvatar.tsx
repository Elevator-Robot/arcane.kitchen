import { getPortraitSource } from '../../utils/recipeDisplay';

export default function CookAvatar({
  name,
  avatar,
}: {
  name: string;
  avatar?: string;
}) {
  const src = getPortraitSource(avatar);
  return (
    <span className="ak-cook-avatar" aria-hidden="true">
      {src ? (
        <img src={src} alt="" loading="lazy" />
      ) : (
        name.replace(/^@/, '').slice(0, 1).toUpperCase()
      )}
    </span>
  );
}
