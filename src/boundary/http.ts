/** The small amount of HTTP the boundary has to speak for itself. */
import type { IncomingHttpHeaders } from 'node:http';

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

/**
 * The absolute origin this request arrived on.
 *
 * Google will not accept a relative `login_uri`: the value has to match an authorised
 * redirect URI on the OAuth client exactly, and those are absolute. Sending a path meant
 * the sign-in button was refused before it ever rendered.
 *
 * Read from the forwarded headers first, because App Hosting terminates TLS at its own
 * proxy: `host` there is the internal Cloud Run hostname, not the domain the visitor typed,
 * and a login_uri built from it matches nothing. A comma-joined list means several proxies
 * appended to it; the first entry is the original client-facing one.
 */
export function originOf(headers: IncomingHttpHeaders): string {
  const host = firstValue(headers['x-forwarded-host']) ?? headers.host ?? '';
  const proto = firstValue(headers['x-forwarded-proto']) ?? 'https';

  return `${proto}://${host}`;
}

function firstValue(header: string | string[] | undefined): string | null {
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) {
    return null;
  }

  // Not split(',')[0]: indexing that needs a guard for a case split() cannot produce,
  // which is an unreachable branch the coverage gate then can never close.
  const comma = raw.indexOf(',');

  return (comma === -1 ? raw : raw.slice(0, comma)).trim() || null;
}

function cookieHeader(pair: string, maxAge: number): string {
  return `${pair}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}
