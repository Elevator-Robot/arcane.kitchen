export async function readAllAdminPages<T>(
  loadPage: (nextToken?: string) => Promise<{
    data?: T[] | null;
    errors?: { message?: string }[];
    nextToken?: string | null;
  }>
): Promise<T[]> {
  const records: T[] = [];
  const seenTokens = new Set<string>();
  let nextToken: string | undefined;
  do {
    const result = await loadPage(nextToken);
    if (result.errors?.length)
      throw new Error(result.errors.map((error) => error.message).join('; '));
    if (!Array.isArray(result.data))
      throw new Error('The collection did not return a valid result.');
    records.push(...result.data);
    nextToken = result.nextToken || undefined;
    if (nextToken && seenTokens.has(nextToken))
      throw new Error('The collection could not finish loading.');
    if (nextToken) seenTokens.add(nextToken);
  } while (nextToken);
  return records;
}

export type ModerationUser = {
  isDeleted?: boolean | null;
  isBanned?: boolean | null;
  enabled?: boolean | null;
  contentHidden?: boolean | null;
};
export function userModerationStatus(user: ModerationUser) {
  if (user.isDeleted) return 'Deleted';
  if (user.isBanned) return 'Banned';
  if (user.enabled === false) return 'Disabled';
  if (user.contentHidden) return 'Content hidden';
  return 'Active';
}

export function matchesAdminSearch(
  query: string,
  ...fields: (string | null | undefined)[]
) {
  const terms = query
    .toLowerCase()
    .replace(/^@/, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const text = fields.filter(Boolean).join(' ').toLowerCase();
  return terms.every((term) => text.includes(term));
}

export function requireAdminResult<T>(result: {
  data?: T | null;
  errors?: { message?: string }[];
}): T {
  if (result.errors?.length)
    throw new Error(result.errors.map((error) => error.message).join('; '));
  if (!result.data)
    throw new Error(
      'The operation did not return a result. Please refresh and try again.'
    );
  return result.data;
}
