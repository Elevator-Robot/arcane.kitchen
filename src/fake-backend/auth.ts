const FAKE_USER_ID = 'fake-user-00000000-0000-4000-8000-000000000001';
const FAKE_USERNAME = 'fakelog@arcane.kitchen';
const FAKE_NICKNAME = 'FakeCook';

export async function fakeGetCurrentUser(): Promise<{
  userId: string;
  username: string;
  signInDetails?: { loginId?: string };
}> {
  return {
    userId: FAKE_USER_ID,
    username: FAKE_USERNAME,
    signInDetails: { loginId: FAKE_USERNAME },
  };
}

export async function fakeFetchUserAttributes(): Promise<
  Record<string, string | undefined>
> {
  return {
    sub: FAKE_USER_ID,
    email: FAKE_USERNAME,
    nickname: FAKE_NICKNAME,
  };
}

export async function fakeSignOut(): Promise<void> {
  // no-op — fake backend always stays authenticated
}
