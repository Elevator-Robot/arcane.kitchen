type Props = {
  lightSrc: string;
  darkSrc: string;
  wrapperClassName?: string;
  imageClassName?: string;
  width: number;
  height: number;
  loading?: 'eager' | 'lazy';
};

export default function ColorSchemeImage({
  lightSrc,
  darkSrc,
  wrapperClassName = '',
  imageClassName = '',
  width,
  height,
  loading = 'lazy',
}: Props) {
  return (
    <span
      className={`ak-color-scheme-image ${wrapperClassName}`}
      aria-hidden="true"
    >
      <img
        src={lightSrc}
        alt=""
        width={width}
        height={height}
        loading={loading}
        className={`ak-color-scheme-image-light ${imageClassName}`}
      />
      <img
        src={darkSrc}
        alt=""
        width={width}
        height={height}
        loading={loading}
        className={`ak-color-scheme-image-dark ${imageClassName}`}
      />
    </span>
  );
}
