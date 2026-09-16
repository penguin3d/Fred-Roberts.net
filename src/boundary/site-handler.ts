/**
 * The adapter between Node's request objects and `serve`.
 *
 * It knows three things the decision itself should not: how to read a cookie, how to read
 * Google's form post back, and what "show the public site" means in HTTP terms — which is
 * to rewrite the URL to `/` and hand on to Angular. That rewrite is why a wrong address, a
 * wrong account and an abandoned sign-in all look identical from outside: none of them
 * produce a status, a redirect or a message of their own.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import { serve, type BoundaryConfig, type SessionChange, type SiteRequest } from './boundary';
import {
  CSRF_COOKIE,
  SESSION_COOKIE,
  endSessionCookie,
  originOf,
  pathOf,
  readCookie,
  startSessionCookie,
} from './http';
import type { IdentityCheck, Owner } from './identity';

/** Google's credential post is a few hundred bytes; anything larger is not one. */
const MAX_BODY_BYTES = 8 * 1024;

export type Next = (error?: unknown) => void;

export interface SiteHandlerDeps {
  readonly config: BoundaryConfig;
  readonly identity: IdentityCheck;
  /** Takes the absolute origin of the request: Google rejects a relative login_uri. */
  readonly renderEntrance: (origin: string) => string;
  readonly renderPortfolio: (owner: Owner) => string;
}

export type SiteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  next: Next,
) => Promise<void>;

export function createSiteHandler(deps: SiteHandlerDeps): SiteHandler {
  return async (req, res, next) => {
    try {
      const served = await serve(await readRequest(req), deps.config, deps.identity);
      applySession(res, served.session);

      if (served.view === 'entrance') {
        sendHtml(res, deps.renderEntrance(originOf(req.headers)));
      } else if (served.view === 'portfolio' && served.owner) {
        sendHtml(res, deps.renderPortfolio(served.owner));
      } else {
        showPublicSite(req);
        next();
      }
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Every refusal leaves here, as a request for the site's front page and nothing more.
 *
 * `originalUrl` is set as well as `url` on purpose: Angular's request adapter reads
 * `originalUrl ?? url`, so rewriting only `url` leaves the address the visitor asked for
 * in play and they get a 404 — which is itself a tell that the address meant something.
 */
function showPublicSite(req: IncomingMessage): void {
  const rewritable = req as IncomingMessage & { originalUrl?: string };
  req.url = '/';
  if (rewritable.originalUrl !== undefined) {
    rewritable.originalUrl = '/';
  }
}

async function readRequest(req: IncomingMessage): Promise<SiteRequest> {
  const method = req.method ?? 'GET';

  return {
    method,
    path: pathOf(req.url),
    session: readCookie(req.headers.cookie, SESSION_COOKIE),
    credential: method === 'POST' ? await readCredential(req) : null,
  };
}

/**
 * Double-submit: Google sets `g_csrf_token` as a cookie and posts the same value as a
 * field. If they disagree the post did not come from the entrance, so there is no
 * credential to consider and the visitor gets the public site like everyone else.
 */
async function readCredential(req: IncomingMessage): Promise<string | null> {
  const form = new URLSearchParams(await readBody(req));
  const posted = form.get(CSRF_COOKIE);

  return posted && posted === readCookie(req.headers.cookie, CSRF_COOKIE)
    ? form.get('credential')
    : null;
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      return '';
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString('utf8');
}

function applySession(res: ServerResponse, change: SessionChange): void {
  if (change.action === 'start') {
    res.setHeader('Set-Cookie', startSessionCookie(change.value));
  } else if (change.action === 'end') {
    res.setHeader('Set-Cookie', endSessionCookie());
  }
}

function sendHtml(res: ServerResponse, html: string): void {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.end(html);
}
