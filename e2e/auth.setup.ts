/**
 * Builds the owner's session for the owner specs, without Playwright ever touching Google.
 *
 * Google refuses OAuth in any browser it detects as automated — "This browser or app may not
 * be secure" — and it is right to. That means the sign-in itself cannot be scripted, and the
 * one scenario it proves ("The site owner signs in with the allowed account and lands in the
 * portfolio") is verified by hand, with a screenshot, not by this file.
 *
 * What CAN be automated is everything after: the device's session is our own signed cookie,
 * and the boundary re-verifies its HMAC on every single request. Replaying it is exactly what
 * a returning browser does, so nothing is being bypassed.
 *
 * Get the value once, from a browser where you are signed in:
 *   DevTools -> Application -> Cookies -> https://fredroberts.net -> __Host-frn_session
 *
 * Then:
 *   E2E_BASE_URL=https://fredroberts.net \
 *   E2E_ENTRANCE_PATH=/your-entrance \
 *   E2E_OWNER_SESSION=<the cookie value> \
 *   npx playwright test auth.setup.ts --project=setup
 */
import { expect, test as setup } from '@playwright/test';

import { ENTRANCE, OWNER_STATE, PORTFOLIO, SESSION_COOKIE, SHOTS } from './boundary';

setup('the owner session is accepted by the live boundary', async ({ browser, baseURL }) => {
  const value = process.env['E2E_OWNER_SESSION'];
  expect(
    value,
    'E2E_OWNER_SESSION is not set. Copy __Host-frn_session from a browser where you are ' +
      'signed in (DevTools -> Application -> Cookies) and export it — see the comment at the ' +
      'top of this file.',
  ).toBeTruthy();

  const host = new URL(baseURL ?? 'https://fredroberts.net').hostname;
  const context = await browser.newContext();
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: value as string,
      domain: host,
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
  ]);

  // Prove the session is live before saving it, so a stale paste fails here with a clear
  // message rather than as six confusing failures in the owner spec.
  const page = await context.newPage();
  await page.goto(PORTFOLIO);
  // Sign out is portfolio-only; the heading is not, so it is no use as the signal here.
  await expect(
    page.getByRole('button', { name: 'Sign out' }),
    'the boundary did not accept that session — is it current, and copied whole? ' +
      'A wrong or expired value silently yields the public site, by design.',
  ).toBeVisible();
  await expect(page.getByText(/you are .+@.+/i)).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/owner-session-accepted.png`, fullPage: true });

  // And that it is the session doing the work: the same request without it is the public site.
  const anonymous = await browser.newContext();
  const anonymousPage = await anonymous.newPage();
  await anonymousPage.goto(ENTRANCE);
  await expect(anonymousPage.locator('#g_id_onload')).toBeAttached();
  await anonymous.close();

  await context.storageState({ path: OWNER_STATE });
  await context.close();
});
