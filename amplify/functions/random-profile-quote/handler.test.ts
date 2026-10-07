import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PROFILE_QUOTE_CATEGORIES,
  chooseQuoteCategory,
  fetchRandomProfileQuote,
} from './handler';

test('includes every supported API Ninjas quote category', () => {
  assert.deepEqual(PROFILE_QUOTE_CATEGORIES, [
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
  ]);
  assert.equal(chooseQuoteCategory(() => 0), 'wisdom');
  assert.equal(chooseQuoteCategory(() => 0.999), 'leadership');
});

test('requests and normalizes one random categorized quote', async () => {
  const result = await fetchRandomProfileQuote({
    apiKey: 'test-key',
    random: () => 0.5,
    fetchQuote: async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('categories'), 'courage');
      assert.equal((init?.headers as Record<string, string>)['X-Api-Key'], 'test-key');
      return new Response(
        JSON.stringify([{ quote: '  Begin where you are.  ', author: 'Someone' }]),
        { status: 200 }
      );
    },
  });

  assert.deepEqual(result, {
    quote: 'Begin where you are.',
    author: 'Someone',
    category: 'courage',
  });
});
