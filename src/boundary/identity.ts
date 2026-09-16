/**
 * Who is asking, and can we still tell?
 *
 * One object answers all three questions the boundary asks about identity: who a fresh
 * Google credential belongs to, who a device's session stands for, and what session value
 * a device should carry. They live together on purpose — "the identity check is
 * unavailable" has to be a single state, because a boundary that can still trust its own
 * sessions while it cannot verify anything is not failing closed.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

/** A Google account, identified by the id Google never changes. The label is decoration. */
export interface Owner {
  /** Google's `sub`. The only thing the allow-list is ever compared against. */
  readonly accountId: string;
  /** Whatever Google currently shows for the account — an email, usually. Never matched on. */
  readonly label: string;
}

export interface IdentityCheck {
  /** The account behind a freshly issued Google credential, or null if it cannot be established. */
  ownerFromCredential(credential: string): Promise<Owner | null>;
  /** The account a device's session stands for, or null if it cannot be established. */
  ownerFromSession(session: string): Promise<Owner | null>;
  /** A session value standing for this account on one device, or null if none can be issued. */
  sessionFor(owner: Owner): Promise<string | null>;
}

/** Turns a Google credential into an account. Everything network-shaped lives behind this. */
export type TokenVerifier = (credential: string) => Promise<Owner | null>;

export interface IdentityOptions {
  /** Signing key for device sessions. Missing means the check cannot run. */
  readonly sessionSecret: string | null;
  /** Google credential verifier. Missing means the check cannot run. */
  readonly verify: TokenVerifier | null;
  /** Clock, recorded on a session and never read back — see `readSession`. */
  readonly now: () => number;
}

const UNAVAILABLE: IdentityCheck = {
  ownerFromCredential: () => Promise.resolve(null),
  ownerFromSession: () => Promise.resolve(null),
  sessionFor: () => Promise.resolve(null),
};

export function createIdentityCheck(options: IdentityOptions): IdentityCheck {
  const { sessionSecret, verify, now } = options;
  if (!sessionSecret || !verify) {
    return UNAVAILABLE;
  }

  return {
    ownerFromCredential: (credential) => verifySafely(verify, credential),
    ownerFromSession: (session) => Promise.resolve(readSession(sessionSecret, session)),
    sessionFor: (owner) => Promise.resolve(issueSession(sessionSecret, owner, now())),
  };
}

async function verifySafely(verify: TokenVerifier, credential: string): Promise<Owner | null> {
  try {
    return await verify(credential);
  } catch {
    return null;
  }
}

function issueSession(secret: string, owner: Owner, issuedAt: number): string {
  const claims = JSON.stringify({ accountId: owner.accountId, label: owner.label, issuedAt });
  const payload = Buffer.from(claims, 'utf8').toString('base64url');

  return `${payload}.${sign(secret, payload)}`;
}

/**
 * `issuedAt` is carried but never compared against the clock: the session has no expiry of
 * our own, so the only thing that ends it is signing out on that device.
 */
function readSession(secret: string, value: string): Owner | null {
  const parts = value.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1] || !sameString(sign(secret, parts[0]), parts[1])) {
    return null;
  }

  return ownerFromClaims(parts[0]);
}

function ownerFromClaims(payload: string): Owner | null {
  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  const record = claims as Record<string, unknown>;
  const accountId = record['accountId'];
  const label = record['label'];

  return typeof accountId === 'string' && typeof label === 'string' ? { accountId, label } : null;
}

function sign(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function sameString(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');

  return a.length === b.length && timingSafeEqual(a, b);
}
