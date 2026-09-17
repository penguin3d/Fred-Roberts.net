/**
 * One-time manual sign-in, captured for the owner specs.
 *
 * Google actively blocks automated sign-in, and it should: a spec that could log in as Fred
 * without Fred would mean the boundary was forgeable. So this runs HEADED and waits for a
 * human to complete the Google flow, then saves the resulting session.
 *
 * The saved file is a live credential for the portfolio. It is gitignored, and because the
 * session has no expiry of our own it stays valid until someone signs out on it.
 *
 *   E2E_BASE_URL=https://fredroberts.net \
 *   E2E_ENTRANCE_PATH=/your-entrance \
 *   npx playwright test auth.setup.ts --headed --project=setup
 *
 * This also IS the proof of one scenario: "The site owner signs in with the allowed account
 * and lands in the portfolio".
 */
import { expect, test as setup } from '@playwright/test';

import { ENTRANCE, OWNER_STATE, SHOTS } from './boundary';

setup('The site owner signs in with the allowed account and lands in the portfolio', async ({
  page,
}) => {
  setup.setTimeout(5 * 60 * 1000);

  await page.goto(ENTRANCE);
  await expect(page.locator('#g_id_onload')).toBeAttached();

  console.log('\n  Sign in with the allowed Google account in the browser window.');
  console.log('  Waiting up to 5 minutes…\n');

  // The portfolio is the only page that names its owner, so this is the completion signal.
  await expect(page.getByRole('heading', { name: 'Fred Roberts' })).toBeVisible({
    timeout: 5 * 60 * 1000,
  });
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await expect(page.locator('#g_id_onload')).toHaveCount(0);

  // "it shows they are signed in as the owner" — the label Google returned for the account.
  await expect(page.getByText(/you are .+@.+/i)).toBeVisible();

  await page.screenshot({ path: `${SHOTS}/owner-signs-in.png`, fullPage: true });
  await page.context().storageState({ path: OWNER_STATE });
});
