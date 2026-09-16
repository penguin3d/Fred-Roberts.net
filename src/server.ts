/**
 * The server entry, and the only place the boundary's configuration is read.
 *
 * Composition root: environment in, wired objects out, no rules of its own. Every value
 * below is absent by default, and absent means the boundary fails closed — an unconfigured
 * deploy is a plain public site with no way in, for anybody.
 */
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { join } from 'node:path';

import { SIGN_IN_SUFFIX, SIGN_OUT_SUFFIX, type BoundaryConfig } from './boundary/boundary';
import { createIdentityCheck, type Owner, type TokenVerifier } from './boundary/identity';
import { createSiteHandler } from './boundary/site-handler';
import { renderEntrance, renderPortfolio } from './boundary/views';

const browserDistFolder = join(import.meta.dirname, '../browser');

const entrancePath = process.env['SIGN_IN_ENTRANCE_PATH'] || null;
const allowedAccountId = process.env['ALLOWED_GOOGLE_ACCOUNT_ID'] || null;
const googleClientId = process.env['GOOGLE_OAUTH_CLIENT_ID'] || null;
const sessionSecret = process.env['SESSION_SECRET'] || null;

const config: BoundaryConfig = { entrancePath, allowedAccountId };

const identity = createIdentityCheck({
  sessionSecret,
  verify: googleClientId ? googleTokenVerifier(googleClientId) : null,
  now: () => Date.now(),
});

function googleTokenVerifier(audience: string): TokenVerifier {
  const client = new OAuth2Client(audience);

  return async (credential): Promise<Owner | null> => {
    const payload = (await client.verifyIdToken({ idToken: credential, audience })).getPayload();

    return payload ? { accountId: payload.sub, label: payload.email ?? payload.sub } : null;
  };
}

const app = express();
const angularApp = new AngularNodeAppEngine();

// Static assets first: they are the public bundle, and nothing private is built into it.
app.use(express.static(browserDistFolder, { maxAge: '1y', index: false, redirect: false }));

// Then the boundary, which decides every page request before Angular sees it.
app.use(
  createSiteHandler({
    config,
    identity,
    renderEntrance: () =>
      renderEntrance(googleClientId ?? '', (entrancePath ?? '') + SIGN_IN_SUFFIX),
    renderPortfolio: (owner) => renderPortfolio(owner, (entrancePath ?? '') + SIGN_OUT_SUFFIX),
  }),
);

// Anything the boundary passed on is the public site, rendered by Angular.
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
