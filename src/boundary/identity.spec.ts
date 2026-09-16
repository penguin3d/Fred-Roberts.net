import { createHmac } from 'node:crypto';

import { createIdentityCheck, type IdentityOptions, type Owner } from './identity';

const FRED: Owner = { accountId: 'sub-fred', label: 'fred@example.com' };
const SECRET = 'a-signing-secret';

function identity(overrides: Partial<IdentityOptions> = {}) {
  return createIdentityCheck({
    sessionSecret: SECRET,
    verify: (credential) => Promise.resolve(credential === 'good' ? FRED : null),
    now: () => 1_758_009_600_000,
    ...overrides,
  });
}

/** A session value signed with our real secret, so only its claims are under test. */
function ourOwn(claims: string): string {
  const payload = Buffer.from(claims, 'utf8').toString('base64url');

  return `${payload}.${createHmac('sha256', SECRET).update(payload).digest('base64url')}`;
}

describe('when the check can run', () => {
  it('reads the account out of a good credential', async () => {
    await expect(identity().ownerFromCredential('good')).resolves.toEqual(FRED);
  });

  it('gives nothing for a credential Google does not recognise', async () => {
    await expect(identity().ownerFromCredential('rubbish')).resolves.toBeNull();
  });

  it('gives nothing when the verifier throws rather than answers', async () => {
    const check = identity({
      verify: () => Promise.reject(new Error('Google is down')),
    });

    await expect(check.ownerFromCredential('good')).resolves.toBeNull();
  });

  it('issues a session that reads back as the same owner', async () => {
    const check = identity();
    const session = await check.sessionFor(FRED);

    expect(session).not.toBeNull();
    await expect(check.ownerFromSession(session ?? '')).resolves.toEqual(FRED);
  });

  it('records when the session was issued, and still never expires it', async () => {
    const early = await identity({ now: () => 0 }).sessionFor(FRED);
    const late = await identity({ now: () => 9_999_999_999 }).sessionFor(FRED);

    expect(early).not.toBe(late);
    await expect(identity().ownerFromSession(early ?? '')).resolves.toEqual(FRED);
  });
});

describe('a session that was not issued by us', () => {
  it('is refused when the signature belongs to another secret', async () => {
    const forged = await identity({ sessionSecret: 'someone-elses-secret' }).sessionFor(FRED);

    await expect(identity().ownerFromSession(forged ?? '')).resolves.toBeNull();
  });

  it('is refused when the claims are edited under a good signature', async () => {
    const session = (await identity().sessionFor(FRED)) ?? '';
    const swapped = Buffer.from('{"accountId":"sub-sam","label":"x"}').toString('base64url');

    await expect(identity().ownerFromSession(`${swapped}.${session.split('.')[1]}`)).resolves.toBeNull();
  });

  it('is refused when it is not two dot-separated parts', async () => {
    await expect(identity().ownerFromSession('nodots')).resolves.toBeNull();
    await expect(identity().ownerFromSession('a.b.c')).resolves.toBeNull();
  });

  it('is refused when a third part is appended to one we did sign', async () => {
    const session = (await identity().sessionFor(FRED)) ?? '';

    await expect(identity().ownerFromSession(`${session}.extra`)).resolves.toBeNull();
  });

  it('is refused when either part is empty', async () => {
    await expect(identity().ownerFromSession('.sig')).resolves.toBeNull();
    await expect(identity().ownerFromSession('payload.')).resolves.toBeNull();
  });

  it('is refused when the signature is a different length', async () => {
    const session = (await identity().sessionFor(FRED)) ?? '';

    await expect(identity().ownerFromSession(`${session.split('.')[0]}.short`)).resolves.toBeNull();
  });

  it('is refused when the payload is properly signed but is not json', async () => {
    await expect(identity().ownerFromSession(ourOwn('not json at all'))).resolves.toBeNull();
  });

  it('is refused when the claims are properly signed but the wrong shape', async () => {
    await expect(identity().ownerFromSession(ourOwn('{"accountId":"sub-fred"}'))).resolves.toBeNull();
    await expect(identity().ownerFromSession(ourOwn('{"label":"fred"}'))).resolves.toBeNull();
    await expect(identity().ownerFromSession(ourOwn('{"accountId":7,"label":"f"}'))).resolves.toBeNull();
  });
});

describe('when the check cannot run', () => {
  it('lets nobody in, for want of a signing secret', async () => {
    const check = identity({ sessionSecret: null });
    const session = (await identity().sessionFor(FRED)) ?? '';

    await expect(check.ownerFromCredential('good')).resolves.toBeNull();
    await expect(check.ownerFromSession(session)).resolves.toBeNull();
    await expect(check.sessionFor(FRED)).resolves.toBeNull();
  });

  it('lets nobody in, for want of a verifier', async () => {
    const check = identity({ verify: null });

    await expect(check.ownerFromCredential('good')).resolves.toBeNull();
    await expect(check.sessionFor(FRED)).resolves.toBeNull();
  });
});
