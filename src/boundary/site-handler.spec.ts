import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

import { SIGN_IN_SUFFIX, SIGN_OUT_SUFFIX, type BoundaryConfig } from './boundary';
import { SESSION_COOKIE } from './http';
import type { IdentityCheck, Owner } from './identity';
import { createSiteHandler } from './site-handler';

const ENTRANCE = '/a-quiet-door';
const FRED: Owner = { accountId: 'sub-fred', label: 'fred@example.com' };
const CONFIG: BoundaryConfig = { entrancePath: ENTRANCE, allowedAccountId: FRED.accountId };

const identity: IdentityCheck = {
  ownerFromCredential: (credential) =>
    Promise.resolve(credential === 'fred-credential' ? FRED : null),
  ownerFromSession: (session) => Promise.resolve(session === 'fred-session' ? FRED : null),
  sessionFor: () => Promise.resolve('fred-session'),
};

interface Call {
  readonly statusCode: number;
  readonly headers: Map<string, string>;
  readonly body: string | null;
  readonly handedOn: boolean;
  readonly error: unknown;
  readonly rewrittenTo: string | undefined;
  readonly originalRewrittenTo: string | undefined;
}

async function call(options: {
  method?: string | undefined;
  path?: string;
  cookie?: string;
  body?: string | Readable;
  behindExpress?: boolean;
  deps?: Partial<Parameters<typeof createSiteHandler>[0]>;
}): Promise<Call> {
  const source =
    options.body instanceof Readable
      ? options.body
      : Readable.from([Buffer.from(options.body ?? '', 'utf8')]);

  const req = Object.assign(source, {
    method: 'method' in options ? options.method : 'GET',
    url: options.path ?? '/',
    headers: { cookie: options.cookie },
    ...(options.behindExpress ? { originalUrl: options.path ?? '/' } : {}),
  }) as unknown as IncomingMessage;

  const headers = new Map<string, string>();
  let statusCode = 0;
  let body: string | null = null;
  const res = {
    set statusCode(value: number) {
      statusCode = value;
    },
    setHeader: (name: string, value: string) => headers.set(name.toLowerCase(), value),
    end: (chunk?: string) => {
      body = chunk ?? '';
    },
  } as unknown as ServerResponse;

  let handedOn = false;
  let error: unknown = null;
  const handler = createSiteHandler({
    config: CONFIG,
    identity,
    renderEntrance: () => '<entrance/>',
    renderPortfolio: (owner) => `<portfolio>${owner.label}</portfolio>`,
    ...options.deps,
  });

  await handler(req, res, (thrown?: unknown) => {
    handedOn = true;
    error = thrown ?? null;
  });

  return {
    statusCode,
    headers,
    body,
    handedOn,
    error,
    rewrittenTo: req.url,
    originalRewrittenTo: (req as IncomingMessage & { originalUrl?: string }).originalUrl,
  };
}

describe('a request the boundary sends to the public site', () => {
  it('is rewritten to the root and handed on to Angular', async () => {
    const result = await call({ path: '/whatever' });

    expect(result.handedOn).toBe(true);
    expect(result.rewrittenTo).toBe('/');
    expect(result.body).toBeNull();
    expect(result.error).toBeNull();
  });

  it('rewrites the address Angular actually reads, not just req.url', async () => {
    const result = await call({ path: '/whatever', behindExpress: true });

    expect(result.originalRewrittenTo).toBe('/');
    expect(result.rewrittenTo).toBe('/');
  });

  it('leaves originalUrl alone when nothing set one', async () => {
    expect((await call({ path: '/whatever' })).originalRewrittenTo).toBeUndefined();
  });

  it('sets no cookie of any kind', async () => {
    expect((await call({ path: '/whatever' })).headers.has('set-cookie')).toBe(false);
  });

  it('is what a request with no method at all gets, read as a plain GET', async () => {
    const result = await call({ method: undefined, path: ENTRANCE });

    expect(result.body).toBe('<entrance/>');
  });
});

describe('the entrance', () => {
  it('is rendered, uncacheable and hidden from robots', async () => {
    const result = await call({ path: ENTRANCE });

    expect(result.body).toBe('<entrance/>');
    expect(result.statusCode).toBe(200);
    expect(result.handedOn).toBe(false);
    expect(result.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(result.headers.get('cache-control')).toBe('no-store');
    expect(result.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  });
});

describe('the portfolio', () => {
  it('is rendered for a device carrying the owner session', async () => {
    const result = await call({
      path: '/portfolio',
      cookie: `${SESSION_COOKIE}=fred-session`,
      });

    expect(result.body).toBe('<portfolio>fred@example.com</portfolio>');
  });

  it('is the public site for a device carrying anything else', async () => {
    const result = await call({ path: '/portfolio', cookie: `${SESSION_COOKIE}=stale` });

    expect(result.handedOn).toBe(true);
    expect(result.body).toBeNull();
  });
});

describe('the sign-in callback', () => {
  const post = (body: string, cookie?: string) => ({
    method: 'POST',
    path: ENTRANCE + SIGN_IN_SUFFIX,
    body,
    cookie,
  });

  it('starts a session when the csrf token matches the cookie Google set', async () => {
    const result = await call(
      post('g_csrf_token=abc123&credential=fred-credential', 'g_csrf_token=abc123'),
    );

    expect(result.body).toBe('<portfolio>fred@example.com</portfolio>');
    expect(result.headers.get('set-cookie')).toContain(`${SESSION_COOKIE}=fred-session`);
  });

  it('is the public site when the csrf token does not match', async () => {
    const result = await call(
      post('g_csrf_token=abc123&credential=fred-credential', 'g_csrf_token=different'),
    );

    expect(result.handedOn).toBe(true);
    expect(result.headers.has('set-cookie')).toBe(false);
  });

  it('is the public site when no csrf token was posted at all', async () => {
    expect((await call(post('credential=fred-credential'))).handedOn).toBe(true);
  });

  it('is the public site when the post is too large to be a credential', async () => {
    const huge = `g_csrf_token=abc123&credential=fred-credential&pad=${'x'.repeat(9000)}`;

    expect((await call(post(huge, 'g_csrf_token=abc123'))).handedOn).toBe(true);
  });
});

describe('signing out', () => {
  it('expires the session cookie and shows the public site', async () => {
    const result = await call({
      method: 'POST',
      path: ENTRANCE + SIGN_OUT_SUFFIX,
      cookie: `${SESSION_COOKIE}=fred-session`,
    });

    expect(result.handedOn).toBe(true);
    expect(result.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});

describe('when something goes wrong', () => {
  it('hands the error on rather than answering', async () => {
    const boom = new Error('stream broke');
    const failing = new Readable({
      read() {
        this.destroy(boom);
      },
    });

    const result = await call({ method: 'POST', path: ENTRANCE + SIGN_IN_SUFFIX, body: failing });

    expect(result.error).toBe(boom);
    expect(result.body).toBeNull();
  });

  it('shows the public site if a portfolio decision somehow arrives with no owner', async () => {
    const noOwner: IdentityCheck = {
      ...identity,
      ownerFromSession: () => Promise.resolve(null),
    };
    const result = await call({
      path: '/portfolio',
      cookie: `${SESSION_COOKIE}=fred-session`,
      deps: { identity: noOwner },
    });

    expect(result.handedOn).toBe(true);
  });
});
