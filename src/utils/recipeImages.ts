import { getUrl } from 'aws-amplify/storage';
import { getCloudFrontDomain } from '../amplifyConfig';
import { isMockPreview } from '../preview/config';

/** Shared by the public feed and the admin recipe/feature previews. */
export async function getRecipeImageSource(imageUrl?: string | null) {
  if (!imageUrl) return '__no_image__';
  if (isMockPreview && /^(\/|data:|blob:)/.test(imageUrl)) return imageUrl;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  const cdnDomain =
    getCloudFrontDomain() || import.meta.env.VITE_CLOUDFRONT_DOMAIN;
  if (cdnDomain) return `https://${cdnDomain}/${imageUrl}`;

  try {
    const { url } = await getUrl({
      path: imageUrl,
      options: { expiresIn: 60 * 60 },
    });
    return url.toString();
  } catch (error) {
    console.error('Failed to resolve recipe image:', error);
    return '__no_image__';
  }
}
