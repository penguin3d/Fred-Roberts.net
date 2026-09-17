/**
 * Shared setup for the sign-in-boundary specs.
 *
 * The entrance address is a secret, so it is never written here — it comes from
 * E2E_ENTRANCE_PATH. Same for the allowed account id, which the no-trace scenario has to
 * search for by value. A spec that hardcoded either would put the secret in git, which is
 * the one thing the feature exists to prevent.
 */
import { expect, type Page } from '@playwright/test';

export const ENTRANCE = required('E2E_ENTRANCE_PATH');
export const PORTFOLIO = '/portfolio';
export const SHOTS = 'reports/qa';
/** Where auth.setup.ts leaves the owner's session. A live credential; gitignored. */
export const OWNER_STATE = '.auth/owner.json';
export const SESSION_COOKIE = '__Host-frn_session';

/** Values that must never appear in anything sent to a signed-out visitor. */
export const SECRETS = {
  entrance: ENTRANCE,
  accountId: process.env['E2E_ALLOWED_ACCOUNT_ID'] ?? '',
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. These specs drive the real boundary, whose entrance address is a ` +
        `secret and is deliberately not committed. Export it before running:\n` +
        `  E2E_ENTRANCE_PATH=/your-entrance E2E_BASE_URL=https://fredroberts.net npm run e2e`,
    );
  }

  return value;
}

/**
 * The public site, as a signed-out visitor sees it.
 *
 * Asserted by what it does NOT contain rather than by a marker of its own: the whole point
 * is that a refusal and an ordinary wrong address are the same response, so there is no
 * "you were refused" string to look for. The placeholder's own text is the positive signal.
 */
export async function expectPublicSite(page: Page, shot: string): Promise<void> {
  await expect(page.locator('app-root')).toBeAttached();
  await expect(page.getByRole('button', { name: /sign in/i })).toHaveCount(0);
  await expect(page.locator('#g_id_onload')).toHaveCount(0);
  await expect(page.locator('iframe[src*="accounts.google.com"]')).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/${shot}.png`, fullPage: true });
}

/** The entrance: a Google sign-in and nothing else of ours. */
export async function expectEntrance(page: Page, shot: string): Promise<void> {
  await expect(page.locator('#g_id_onload')).toBeAttached();
  await expect(page.locator('#g_id_onload')).toHaveAttribute(
    'data-login_uri',
    new RegExp(`^https://[^/]+${escapeRegExp(ENTRANCE)}/callback$`),
  );
  await expect(page.locator('app-root')).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/${shot}.png`, fullPage: true });
}

/** The portfolio, which is the only page that names its owner. */
export async function expectPortfolio(page: Page, shot: string): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Fred Roberts' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await expect(page.locator('#g_id_onload')).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/${shot}.png`, fullPage: true });
}

/** Nothing of ours about signing in, being refused, or a portfolio existing. */
export async function expectNoHint(page: Page): Promise<void> {
  const html = (await page.content()).toLowerCase();
  for (const word of ['portfolio', 'sign in', 'sign-in', 'signed in', 'refused', 'not allowed']) {
    expect(html, `the public page must not mention "${word}"`).not.toContain(word);
  }
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
