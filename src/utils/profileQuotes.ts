import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

export const DEFAULT_PROFILE_TENET = 'Good food, made often.';

const client = generateClient<Schema>();
const quoteRequests = new Map<string, Promise<string>>();

export const loadProfilePlaceholderQuote = (profileId: string) => {
  const existing = quoteRequests.get(profileId);
  if (existing) return existing;

  const request = (async () => {
    try {
      if (typeof client.queries?.randomProfileQuote !== 'function') {
        return DEFAULT_PROFILE_TENET;
      }

      const { data, errors } = await client.queries.randomProfileQuote({
        authMode: 'userPool',
      });
      if (errors?.length) throw new Error(errors[0].message);

      const quote = data?.quote?.trim();
      return quote || DEFAULT_PROFILE_TENET;
    } catch (error) {
      console.error('Failed to load profile placeholder quote:', error);
      return DEFAULT_PROFILE_TENET;
    }
  })();

  quoteRequests.set(profileId, request);
  return request;
};
