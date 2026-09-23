import { describe, expect, it, vi } from 'vitest';
import {
  matchesAdminSearch,
  readAllAdminPages,
  requireAdminResult,
  userModerationStatus,
} from '../adminConsole';

describe('admin collection helpers', () => {
  it('rejects GraphQL errors in later pages rather than returning partial counts', async () => {
    const page = vi
      .fn()
      .mockResolvedValueOnce({ data: ['first'], nextToken: 'next' })
      .mockResolvedValueOnce({
        data: [],
        errors: [{ message: 'network error' }],
      });
    await expect(readAllAdminPages(page)).rejects.toThrow('network error');
  });
  it('rejects repeated page tokens instead of loading forever', async () => {
    await expect(
      readAllAdminPages(async () => ({ data: [], nextToken: 'same' }))
    ).rejects.toThrow('could not finish');
  });
  it('requires mutation data and rejects GraphQL errors', () => {
    expect(() => requireAdminResult({ data: null })).toThrow();
    expect(() =>
      requireAdminResult({ data: { id: 'x' }, errors: [{ message: 'denied' }] })
    ).toThrow('denied');
  });
  it('matches identity and content terms together', () => {
    expect(matchesAdminSearch('@moon soup', 'moon_cook', 'Winter soup')).toBe(
      true
    );
    expect(matchesAdminSearch('moon cake', 'moon_cook', 'Winter soup')).toBe(
      false
    );
    expect(userModerationStatus({ isDeleted: true, isBanned: true })).toBe(
      'Deleted'
    );
    expect(userModerationStatus({ enabled: false })).toBe('Disabled');
  });
});
