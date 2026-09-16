import {
  PORTFOLIO_PATH,
  SIGN_IN_SUFFIX,
  SIGN_OUT_SUFFIX,
  serve,
  type BoundaryConfig,
  type SiteRequest,
} from './boundary';
import type { IdentityCheck, Owner } from './identity';

const ENTRANCE = '/a-quiet-door';
const FRED: Owner = { accountId: 'sub-fred', label: 'fred@example.com' };
const SAM: Owner = { accountId: 'sub-sam', label: 'sam@example.com' };

const CONFIG: BoundaryConfig = { entrancePath: ENTRANCE, allowedAccountId: FRED.accountId };

/** Credentials and sessions are just the owner's name here; Google is not under test. */
function identityFor(owners: Owner[]): IdentityCheck {
  const find = (key: string) => owners.find((o) => o.accountId === key) ?? null;

  return {
    ownerFromCredential: (credential) => Promise.resolve(find(credential)),
    ownerFromSession: (session) => Promise.resolve(find(session)),
    sessionFor: (owner) => Promise.resolve(owner.accountId),
  };
}

const UNAVAILABLE: IdentityCheck = {
  ownerFromCredential: () => Promise.resolve(null),
  ownerFromSession: () => Promise.resolve(null),
  sessionFor: () => Promise.resolve(null),
};

function request(overrides: Partial<SiteRequest> = {}): SiteRequest {
  return { method: 'GET', path: '/', session: null, credential: null, ...overrides };
}

const identity = identityFor([FRED, SAM]);

describe('a visitor who is not signed in', () => {
  it('gets the public site at the root', async () => {
    await expect(serve(request(), CONFIG, identity)).resolves.toMatchObject({ view: 'public' });
  });

  it('gets the public site at the portfolio', async () => {
    const served = await serve(request({ path: PORTFOLIO_PATH }), CONFIG, identity);

    expect(served).toEqual({ view: 'public', owner: null, session: { action: 'keep' } });
  });

  it('gets the public site at a guessed private address', async () => {
    await expect(serve(request({ path: '/admin' }), CONFIG, identity)).resolves.toMatchObject({
      view: 'public',
    });
  });

  it('gets the entrance at the exact entrance address', async () => {
    const served = await serve(request({ path: ENTRANCE }), CONFIG, identity);

    expect(served).toEqual({ view: 'entrance', owner: null, session: { action: 'keep' } });
  });

  it.each([
    ['a different letter case', ENTRANCE.toUpperCase()],
    ['a trailing slash', `${ENTRANCE}/`],
    ['an extra segment', `${ENTRANCE}/in`],
    ['a missing leading slash', ENTRANCE.slice(1)],
    ['the entrance as a prefix', `${ENTRANCE}x`],
  ])('gets the public site for %s', async (_difference, path) => {
    await expect(serve(request({ path }), CONFIG, identity)).resolves.toMatchObject({
      view: 'public',
    });
  });
});

describe('a visitor carrying a session', () => {
  it('reaches the portfolio when the session is the allowed account', async () => {
    const served = await serve(
      request({ path: PORTFOLIO_PATH, session: FRED.accountId }),
      CONFIG,
      identity,
    );

    expect(served).toEqual({ view: 'portfolio', owner: FRED, session: { action: 'keep' } });
  });

  it('is shown the portfolio at the entrance rather than a prompt', async () => {
    await expect(
      serve(request({ path: ENTRANCE, session: FRED.accountId }), CONFIG, identity),
    ).resolves.toMatchObject({ view: 'portfolio' });
  });

  it('is turned away when the session is some other account', async () => {
    await expect(
      serve(request({ path: PORTFOLIO_PATH, session: SAM.accountId }), CONFIG, identity),
    ).resolves.toMatchObject({ view: 'public' });
  });

  it('is turned away when the session means nothing', async () => {
    await expect(
      serve(request({ path: PORTFOLIO_PATH, session: 'made-up' }), CONFIG, identity),
    ).resolves.toMatchObject({ view: 'public' });
  });

  it('is turned away, owner included, when the check cannot run', async () => {
    await expect(
      serve(request({ path: PORTFOLIO_PATH, session: FRED.accountId }), CONFIG, UNAVAILABLE),
    ).resolves.toMatchObject({ view: 'public' });
  });
});

describe('signing in', () => {
  const callback = { method: 'POST', path: ENTRANCE + SIGN_IN_SUFFIX } as const;

  it('starts a session for the allowed account', async () => {
    const served = await serve(
      request({ ...callback, credential: FRED.accountId }),
      CONFIG,
      identity,
    );

    expect(served).toEqual({
      view: 'portfolio',
      owner: FRED,
      session: { action: 'start', value: FRED.accountId },
    });
  });

  it('silently refuses any other account', async () => {
    const served = await serve(
      request({ ...callback, credential: SAM.accountId }),
      CONFIG,
      identity,
    );

    expect(served).toEqual({ view: 'public', owner: null, session: { action: 'keep' } });
  });

  it('refuses an account Google does not recognise', async () => {
    await expect(
      serve(request({ ...callback, credential: 'nobody' }), CONFIG, identity),
    ).resolves.toMatchObject({ view: 'public' });
  });

  it('refuses a sign-in that came back without a credential', async () => {
    await expect(serve(request(callback), CONFIG, identity)).resolves.toMatchObject({
      view: 'public',
    });
  });

  it('refuses the owner when the check cannot run', async () => {
    await expect(
      serve(request({ ...callback, credential: FRED.accountId }), CONFIG, UNAVAILABLE),
    ).resolves.toMatchObject({ view: 'public' });
  });

  it('refuses the owner when no session can be issued', async () => {
    const noSessions: IdentityCheck = { ...identity, sessionFor: () => Promise.resolve(null) };

    await expect(
      serve(request({ ...callback, credential: FRED.accountId }), CONFIG, noSessions),
    ).resolves.toMatchObject({ view: 'public' });
  });

  it('is not reachable by GET — that address is just another near miss', async () => {
    await expect(
      serve(request({ path: ENTRANCE + SIGN_IN_SUFFIX }), CONFIG, identity),
    ).resolves.toMatchObject({ view: 'public' });
  });
});

describe('signing out', () => {
  const signOut = request({ method: 'POST', path: ENTRANCE + SIGN_OUT_SUFFIX });

  it('ends the session on this device and shows the public site', async () => {
    const served = await serve({ ...signOut, session: FRED.accountId }, CONFIG, identity);

    expect(served).toEqual({ view: 'public', owner: null, session: { action: 'end' } });
  });

  it('changes nothing when there was no session to end', async () => {
    await expect(serve(signOut, CONFIG, identity)).resolves.toEqual({
      view: 'public',
      owner: null,
      session: { action: 'end' },
    });
  });
});

describe('a boundary that is not configured', () => {
  it.each([
    ['no allowed account', { entrancePath: ENTRANCE, allowedAccountId: null }],
    ['no entrance address', { entrancePath: null, allowedAccountId: FRED.accountId }],
  ])('lets nobody in, owner included, with %s', async (_why, config: BoundaryConfig) => {
    const paths = [ENTRANCE, PORTFOLIO_PATH, '/'];
    for (const path of paths) {
      await expect(
        serve(request({ path, session: FRED.accountId }), config, identity),
      ).resolves.toMatchObject({ view: 'public' });
    }

    await expect(
      serve(
        request({
          method: 'POST',
          path: ENTRANCE + SIGN_IN_SUFFIX,
          credential: FRED.accountId,
        }),
        config,
        identity,
      ),
    ).resolves.toMatchObject({ view: 'public' });
  });
});
