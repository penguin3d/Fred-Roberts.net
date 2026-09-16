/** The small amount of HTTP the boundary has to speak for itself. */

/**
 * `__Host-` is not decoration: it binds the cookie to this exact origin over HTTPS, with
 * no Domain attribute, so nothing on a neighbouring host can set or read it.
 */
export const SESSION_COOKIE = '__Host-frn_session';

/** Google Identity Services sets this itself and posts a matching field back. */
export const CSRF_COOKIE = 'g_csrf_token';

/**
 * ponytail: 400 days is the ceiling every browser already clamps a cookie to, so this is
 * the longest "no expiry of our own" can actually be expressed. If a device needs to stay
 * signed in past that, the session has to move somewhere we control.
 */
const SESSION_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export function readCookie(header: string | undefined, name: string): string | null {
  if (!header) {
    return null;
  }

  for (const pair of header.split(';')) {
    const at = pair.indexOf('=');
    if (at > 0 && pair.slice(0, at).trim() === name) {
      return decodeURIComponent(pair.slice(at + 1).trim()) || null;
    }
  }

  return null;
}

export function startSessionCookie(value: string): string {
  return cookieHeader(`${SESSION_COOKIE}=${encodeURIComponent(value)}`, SESSION_MAX_AGE_SECONDS);
}

export function endSessionCookie(): string {
  return cookieHeader(`${SESSION_COOKIE}=`, 0);
}

export function pathOf(url: string | undefined): string {
  try {
    return new URL(url ?? '/', 'http://boundary.invalid').pathname;
  } catch {
    return '/';
  }
}

function cookieHeader(pair: string, maxAge: number): string {
  return `${pair}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}
