/** Stored durations are HH:mm; reading surfaces use kitchen-friendly units. */
export function formatRecipeTime(value?: string) {
  if (!value) return 'Take your time';
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return (
    [hours ? `${hours} hr` : '', minutes ? `${minutes} min` : '']
      .filter(Boolean)
      .join(' ') || 'Take your time'
  );
}

const portraits = import.meta.glob('../assets/avatars/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export function getPortraitSource(filename?: string | null) {
  return filename ? portraits[`../assets/avatars/${filename}`] : undefined;
}
