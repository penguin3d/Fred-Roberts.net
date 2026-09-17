/**
 * Stage 5 for @sign-in-boundary — the scenarios a signed-out visitor can prove.
 *
 * One test per Scenario in features/sign-in-boundary.feature, named after it so the two map
 * 1:1. The owner's half lives in sign-in-boundary.owner.spec.ts, which needs a real Google
 * session and so needs the one-time headed setup in auth.setup.ts.
 *
 * These drive the deployed site, not `ng serve`: the boundary is express middleware in
 * src/server.ts and `ng serve` never loads it, so a local run would pass while testing
 * nothing at all.
 */
import { expect, test } from '@playwright/test';

import { ENTRANCE, PORTFOLIO, SECRETS, expectEntrance, expectNoHint, expectPublicSite } from './boundary';

test.describe('Anyone who is not Fred is shown the public site', () => {
  test('A signed-out visitor who asks for the portfolio is shown the public site', async ({
    page,
  }) => {
    await page.goto(PORTFOLIO);

    await expectPublicSite(page, 'signed-out-asks-portfolio');
    expect(await page.context().cookies()).toEqual([]);
  });

  test('A signed-out visitor who asks for the portfolio is given no hint that a private area exists', async ({
    page,
  }) => {
    await page.goto(PORTFOLIO);

    await expectNoHint(page);
  });

  test('Nothing on the public site leads to the sign-in entrance', async ({ page }) => {
    await page.goto('/');

    const hrefs = await page.locator('a[href]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('href') ?? ''),
    );
    expect(hrefs.filter((href) => href.includes(ENTRANCE))).toEqual([]);
    await expect(page.getByRole('link', { name: /sign in|admin|portfolio/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /sign in/i })).toHaveCount(0);
    await page.screenshot({ path: 'reports/qa/public-site-has-no-way-in.png', fullPage: true });
  });

  test('What the site sends a signed-out visitor carries no trace of the private area', async ({
    page,
    request,
  }) => {
    const sent: string[] = [];
    page.on('response', async (response) => {
      const type = response.headers()['content-type'] ?? '';
      if (/text|javascript|json|css/.test(type)) {
        sent.push(await response.text().catch(() => ''));
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The page itself plus every script, style and payload it pulled.
    const everything = sent.join('\n');
    expect(sent.length, 'nothing was captured, so this proves nothing').toBeGreaterThan(0);
    expect(everything).not.toContain(SECRETS.entrance);
    expect(everything.toLowerCase()).not.toContain('portfolio');
    if (SECRETS.accountId) {
      expect(everything).not.toContain(SECRETS.accountId);
    }

    // And the same for the bundle fetched directly, in case the page lazily skipped it.
    const shell = await request.get('/');
    expect(await shell.text()).not.toContain(SECRETS.entrance);
  });

  test('A common guess at a private address is shown the public site', async ({ page }) => {
    await page.goto('/admin');

    await expectPublicSite(page, 'common-guess-admin');
    await expectNoHint(page);
  });

  for (const [difference, path] of [
    ['a different letter case', ENTRANCE.toUpperCase()],
    ['a trailing slash added', `${ENTRANCE}/`],
    ['an extra segment appended', `${ENTRANCE}/extra`],
  ] as const) {
    test(`A near miss on the entrance address is shown the public site — ${difference}`, async ({
      page,
    }) => {
      await page.goto(path);

      await expectPublicSite(page, `near-miss-${difference.replace(/\s+/g, '-')}`);
      await expectNoHint(page);
    });
  }

  test('Someone who knows the exact entrance address is offered a Google sign-in and nothing more', async ({
    page,
    request,
  }) => {
    await page.goto(ENTRANCE);
    await expectEntrance(page, 'entrance-offers-google-sign-in');

    // A real Google button, rendered by Google's own script.
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();

    /**
     * "and nothing else" is asserted against the HTML WE serve, not the live DOM.
     *
     * The contract's next line — nothing mentions "a portfolio, a sign-in, or a refusal" —
     * cannot hold literally of the rendered page: Google injects a button whose own label is
     * "Sign in with Google", and a stylesheet, and an iframe. The guardrail it comes from
     * says what is actually meant: no wording OF OURS about signing in, being refused, or a
     * portfolio existing. So the subject here is our own response body.
     */
    const ours = (await (await request.get(ENTRANCE)).text()).toLowerCase();
    for (const word of ['portfolio', 'refused', 'not allowed', 'sign in', 'sign out', 'owner']) {
      expect(ours, `our own entrance HTML must not mention "${word}"`).not.toContain(word);
    }
    // The owner is never named or hinted at before anyone is through the boundary.
    expect(ours).not.toContain('penguinpavilion');
    if (SECRETS.accountId) {
      expect(ours).not.toContain(SECRETS.accountId);
    }
  });

  test('A sign-in that does not complete leaves the visitor signed out on the public site', async ({
    page,
  }) => {
    await page.goto(ENTRANCE);
    await expect(page.locator('#g_id_onload')).toBeAttached();

    // Leave without completing: exactly what closing the Google window amounts to.
    await page.goto(PORTFOLIO);

    await expectPublicSite(page, 'abandoned-sign-in');
    expect(
      (await page.context().cookies()).filter((c) => c.name.includes('frn_session')),
    ).toEqual([]);
  });
});
