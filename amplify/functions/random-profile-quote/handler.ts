import type { Schema } from '../../data/resource';

export const PROFILE_QUOTE_CATEGORIES = [
  'wisdom',
  'philosophy',
  'life',
  'truth',
  'inspirational',
  'relationships',
  'love',
  'faith',
  'humor',
  'success',
  'courage',
  'happiness',
  'art',
  'writing',
  'fear',
  'nature',
  'time',
  'freedom',
  'death',
  'leadership',
] as const;

type QuoteResponse = {
  quote?: unknown;
  author?: unknown;
};

export const chooseQuoteCategory = (random = Math.random) =>
  PROFILE_QUOTE_CATEGORIES[
    Math.floor(random() * PROFILE_QUOTE_CATEGORIES.length)
  ];

export const fetchRandomProfileQuote = async ({
  apiKey,
  random = Math.random,
  fetchQuote = fetch,
}: {
  apiKey: string;
  random?: () => number;
  fetchQuote?: typeof fetch;
}) => {
  const category = chooseQuoteCategory(random);
  const url = new URL('https://api.api-ninjas.com/v2/randomquotes');
  url.searchParams.set('categories', category);

  const response = await fetchQuote(url, {
    headers: { 'X-Api-Key': apiKey },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new Error(`API Ninjas quote request failed (${response.status})`);
  }

  const payload = (await response.json()) as QuoteResponse[];
  const quote = payload[0]?.quote;
  if (typeof quote !== 'string' || !quote.trim()) {
    throw new Error('API Ninjas returned no quote');
  }

  return {
    quote: quote.trim(),
    author:
      typeof payload[0]?.author === 'string' ? payload[0].author.trim() : '',
    category,
  };
};

export const handler: Schema['randomProfileQuote']['functionHandler'] = async () => {
  const apiKey = process.env.API_NINJAS_API_KEY;
  if (!apiKey) throw new Error('API_NINJAS_API_KEY is not configured');

  return fetchRandomProfileQuote({ apiKey });
};
