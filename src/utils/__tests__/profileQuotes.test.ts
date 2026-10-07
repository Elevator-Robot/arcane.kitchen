import { describe, expect, it, vi } from 'vitest';

const { randomProfileQuote } = vi.hoisted(() => ({
  randomProfileQuote: vi.fn().mockResolvedValue({
    data: { quote: '  Stay curious.  ' },
    errors: undefined,
  }),
}));

vi.mock('aws-amplify/data', () => ({
  generateClient: () => ({ queries: { randomProfileQuote } }),
}));

import { loadProfilePlaceholderQuote } from '../profileQuotes';

describe('profile quote placeholders', () => {
  it('loads and deduplicates an authenticated random quote per profile', async () => {
    await expect(loadProfilePlaceholderQuote('cook-1')).resolves.toBe(
      'Stay curious.'
    );
    await expect(loadProfilePlaceholderQuote('cook-1')).resolves.toBe(
      'Stay curious.'
    );
    expect(randomProfileQuote).toHaveBeenCalledTimes(1);
    expect(randomProfileQuote).toHaveBeenCalledWith({ authMode: 'userPool' });
  });
});
