import {
  SESSION_COOKIE,
  endSessionCookie,
  originOf,
  pathOf,
  readCookie,
  startSessionCookie,
} from './http';

describe('readCookie', () => {
  it('finds a cookie among several', () => {
    expect(readCookie('a=1; __Host-frn_session=abc; b=2', SESSION_COOKIE)).toBe('abc');
  });

  it('url-decodes the value', () => {
    expect(readCookie('x=a%2Eb%20c', 'x')).toBe('a.b c');
  });

  it('is null when there is no cookie header at all', () => {
    expect(readCookie(undefined, 'x')).toBeNull();
  });

  it('is null when the named cookie is absent', () => {
    expect(readCookie('a=1; b=2', 'x')).toBeNull();
  });

  it('is null for an empty value', () => {
    expect(readCookie('x=', 'x')).toBeNull();
  });

  it('ignores a pair with no equals sign', () => {
    expect(readCookie('broken; x=1', 'x')).toBe('1');
  });

  it('ignores a pair whose name is empty', () => {
    expect(readCookie('=nameless; x=1', 'x')).toBe('1');
  });

  it('matches the whole name, not a suffix of one', () => {
    expect(readCookie('not_x=1', 'x')).toBeNull();
  });

  it('is null for a bare flag, rather than reading it as its own last character', () => {
    expect(readCookie('xy', 'x')).toBeNull();
  });

  it('never matches a nameless pair, not even against the empty name', () => {
    expect(readCookie('=abc', '')).toBeNull();
  });

  it('trims the value, so a padded cookie is the same cookie', () => {
    expect(readCookie('a=1; x=  spaced  ', 'x')).toBe('spaced');
  });
});

describe('the session cookie', () => {
  it('is host-locked, http-only and long-lived when started', () => {
    const cookie = startSessionCookie('value with space');

    expect(cookie).toContain(`${SESSION_COOKIE}=value%20with%20space`);
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Max-Age=34560000');
  });

  it('expires immediately when ended', () => {
    expect(endSessionCookie()).toBe(
      `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
    );
  });
});

describe('pathOf', () => {
  it('drops the query string', () => {
    expect(pathOf('/a/b?c=1')).toBe('/a/b');
  });

  it('keeps a trailing slash, because it is a different address', () => {
    expect(pathOf('/a/')).toBe('/a/');
  });

  it('defaults to the root when there is no url', () => {
    expect(pathOf(undefined)).toBe('/');
  });

  it('falls back to the root when the url cannot be parsed', () => {
    expect(pathOf('http://')).toBe('/');
  });
});

describe('originOf', () => {
  it('builds an https origin from the host header', () => {
    expect(originOf({ host: 'fredroberts.net' })).toBe('https://fredroberts.net');
  });

  it('prefers the forwarded host over the internal one', () => {
    expect(
      originOf({ host: 'fred-roberts-bak.run.app', 'x-forwarded-host': 'fredroberts.net' }),
    ).toBe('https://fredroberts.net');
  });

  it('takes the first entry when proxies have appended to the list', () => {
    expect(originOf({ 'x-forwarded-host': 'fredroberts.net, inner.run.app' })).toBe(
      'https://fredroberts.net',
    );
  });

  it('takes the first entry when the header arrives repeated', () => {
    expect(originOf({ 'x-forwarded-host': ['fredroberts.net', 'inner.run.app'] })).toBe(
      'https://fredroberts.net',
    );
  });

  it('honours a forwarded http scheme', () => {
    expect(originOf({ host: 'localhost:4200', 'x-forwarded-proto': 'http' })).toBe(
      'http://localhost:4200',
    );
  });

  it('assumes https when no scheme is forwarded', () => {
    expect(originOf({ host: 'fredroberts.net' })).toBe('https://fredroberts.net');
  });

  it('ignores an empty forwarded host and falls back to host', () => {
    expect(originOf({ host: 'fredroberts.net', 'x-forwarded-host': '' })).toBe(
      'https://fredroberts.net',
    );
  });

  it('yields a bare scheme when there is no host at all, rather than throwing', () => {
    expect(originOf({})).toBe('https://');
  });

  it('treats a whitespace-only forwarded host as absent', () => {
    expect(originOf({ host: 'fredroberts.net', 'x-forwarded-host': '   ' })).toBe(
      'https://fredroberts.net',
    );
  });

  it('treats a leading empty entry in the list as absent', () => {
    expect(originOf({ host: 'fredroberts.net', 'x-forwarded-host': ', inner.run.app' })).toBe(
      'https://fredroberts.net',
    );
  });
});
