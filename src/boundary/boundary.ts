/**
 * The whole rule, in one function.
 *
 * Every request the site receives is decided here, on the server, before anything is
 * rendered. It is deliberately not reachable from the browser bundle: the client half of
 * this site never learns the entrance address, the portfolio, or the allowed account,
 * because a check that ships to the visitor is a check the visitor can read.
 *
 * Three ways out, and only three: the ordinary public site, the sign-in entrance, or the
 * portfolio. There is no fourth "refused" answer — a refusal IS the public site, which is
 * what makes a wrong account indistinguishable from a wrong address.
 */
import type { IdentityCheck, Owner } from './identity';

export type View = 'public' | 'entrance' | 'portfolio';

/** What the device's session cookie should be afterwards. */
export type SessionChange =
  | { readonly action: 'keep' }
  | { readonly action: 'start'; readonly value: string }
  | { readonly action: 'end' };

export interface Served {
  readonly view: View;
  readonly owner: Owner | null;
  readonly session: SessionChange;
}

export interface SiteRequest {
  readonly method: string;
  readonly path: string;
  /** The session value this device presented, if any. */
  readonly session: string | null;
  /** The Google credential posted back to the sign-in callback, if any. */
  readonly credential: string | null;
}

export interface BoundaryConfig {
  /** The secret address the entrance answers on. Missing means nobody can get in. */
  readonly entrancePath: string | null;
  /** The one Google account id allowed through. Missing means nobody can get in. */
  readonly allowedAccountId: string | null;
}

/** Where the portfolio answers, once someone is through the boundary. */
export const PORTFOLIO_PATH = '/portfolio';
/** Google posts the credential back here; it hangs off the entrance so it is secret too. */
export const SIGN_IN_SUFFIX = '/callback';
/** The portfolio's sign-out posts here. Only the owner is ever sent the address. */
export const SIGN_OUT_SUFFIX = '/sign-out';

const PUBLIC: Served = { view: 'public', owner: null, session: { action: 'keep' } };
const SIGNED_OUT: Served = { view: 'public', owner: null, session: { action: 'end' } };

export async function serve(
  request: SiteRequest,
  config: BoundaryConfig,
  identity: IdentityCheck,
): Promise<Served> {
  const { entrancePath, allowedAccountId } = config;
  if (!entrancePath || !allowedAccountId) {
    return PUBLIC;
  }

  if (request.method === 'POST' && request.path === entrancePath + SIGN_IN_SUFFIX) {
    return signIn(request.credential, allowedAccountId, identity);
  }
  if (request.method === 'POST' && request.path === entrancePath + SIGN_OUT_SUFFIX) {
    return SIGNED_OUT;
  }

  return visit(request, entrancePath, allowedAccountId, identity);
}

async function signIn(
  credential: string | null,
  allowedAccountId: string,
  identity: IdentityCheck,
): Promise<Served> {
  if (!credential) {
    return PUBLIC;
  }

  const owner = await identity.ownerFromCredential(credential);
  if (!owner || owner.accountId !== allowedAccountId) {
    return PUBLIC;
  }

  const value = await identity.sessionFor(owner);

  return value ? { view: 'portfolio', owner, session: { action: 'start', value } } : PUBLIC;
}

async function visit(
  request: SiteRequest,
  entrancePath: string,
  allowedAccountId: string,
  identity: IdentityCheck,
): Promise<Served> {
  const owner = await signedInOwner(request.session, allowedAccountId, identity);

  // Exact match only. A different case, a trailing slash or an extra segment is a
  // different address, and every other address on this site is the public site.
  if (request.path === entrancePath) {
    return owner ? portfolioFor(owner) : { view: 'entrance', owner: null, session: { action: 'keep' } };
  }
  if (request.path === PORTFOLIO_PATH && owner) {
    return portfolioFor(owner);
  }

  return PUBLIC;
}

/**
 * Re-established on every request, never trusted from the cookie alone. That is what makes
 * an identity check that cannot run lock out the owner too, rather than only new arrivals.
 */
async function signedInOwner(
  session: string | null,
  allowedAccountId: string,
  identity: IdentityCheck,
): Promise<Owner | null> {
  if (!session) {
    return null;
  }

  const owner = await identity.ownerFromSession(session);

  return owner && owner.accountId === allowedAccountId ? owner : null;
}

function portfolioFor(owner: Owner): Served {
  return { view: 'portfolio', owner, session: { action: 'keep' } };
}
