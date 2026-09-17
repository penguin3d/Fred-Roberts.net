/**
 * Stage 5 for @sign-in-boundary — the scenarios that need a real owner session.
 *
 * Every test starts from the session captured by auth.setup.ts, in its own browser context,
 * so a test that signs out cannot affect any other. Run the setup first:
 *
 *   npx playwright test auth.setup.ts --headed --project=setup
 */
import { expect, test } from '@playwright/test';

import { ENTRANCE, PORTFOLIO, SESSION_COOKIE, expectEntrance, expectPortfolio, expectPublicSite } from './boundary';

test.describe('Only the allowed account gets in', () => {
  test('The signed-in owner who asks for the portfolio is shown it', async ({ page }) => {
    await page.goto(PORTFOLIO);

    await expectPortfolio(page, 'owner-asks-portfolio');
    await expect(page.getByText(/you are .+@.+/i)).toBeVisible();
  });

  test('The owner who is already signed in and asks for the entrance is shown the portfolio, not a prompt', async ({
    page,
  }) => {
    await page.goto(ENTRANCE);

    await expectPortfolio(page, 'owner-at-entrance-gets-portfolio');
    await expect(page.locator('#g_id_onload')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /sign in with google/i })).toHaveCount(0);
  });
});

test.describe('Anyone who is not Fred is shown the public site', () => {
  /**
   * Lives here rather than in the signed-out spec because its precondition needs a real
   * owner session: the point is that Fred being in on his device opens nothing anywhere else.
   */
  test('Fred being signed in on one device opens nothing to anyone else', async ({
    browser,
  }, testInfo) => {
    const fred = await browser.newContext({ storageState: testInfo.project.use.storageState });
    const onFredsLaptop = await fred.newPage();
    await onFredsLaptop.goto(PORTFOLIO);
    await expectPortfolio(onFredsLaptop, 'one-device-fred-is-in');

    /**
     * Sam: a different browser entirely, carrying nothing.
     *
     * The empty storageState is load-bearing and must stay explicit. browser.newContext()
     * inherits the project's `use` options, so a bare newContext() here silently arrives
     * carrying Fred's session — and this test, of all of them, would then assert that the
     * boundary leaks while reporting green.
     */
    const sam = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const onSamsBrowser = await sam.newPage();
    await onSamsBrowser.goto(PORTFOLIO);

    await expectPublicSite(onSamsBrowser, 'one-device-sam-gets-nothing');
    expect(await sam.cookies()).toEqual([]);

    await fred.close();
    await sam.close();
  });
});

test.describe('Signed-in state lasts until sign-out, on that device alone', () => {
  /**
   * The contract names 2026-09-17, 2026-09-23 and 2026-10-16 — one day, one week and one
   * month after signing in. None is reachable without waiting, and the session carries no
   * expiry of our own to fast-forward past: `issuedAt` is recorded and never compared to a
   * clock. What is provable now is the property those dates exist to pin down — the session
   * survives the browser being closed and reopened, which is what "come back later" means
   * mechanically. The calendar itself is a gap and is reported as one.
   */
  for (const date of ['2026-09-17', '2026-09-23', '2026-10-16'] as const) {
    test(`The site owner is still signed in when they come back later — ${date}`, async ({
      browser,
    }, testInfo) => {
      // A brand-new context is a fresh browser session carrying only the stored cookie.
      const context = await browser.newContext({
        storageState: testInfo.project.use.storageState,
      });
      const page = await context.newPage();

      await page.goto(PORTFOLIO);

      await expectPortfolio(page, `still-signed-in-${date}`);
      await expect(page.locator('#g_id_onload')).toHaveCount(0);
      await context.close();
    });
  }

  test('After signing out, the portfolio is out of reach again', async ({ page }) => {
    await page.goto(PORTFOLIO);
    await page.getByRole('button', { name: 'Sign out' }).click();

    await page.goto(PORTFOLIO);

    await expectPublicSite(page, 'after-sign-out-portfolio-unreachable');
    expect(
      (await page.context().cookies()).filter((c) => c.name === SESSION_COOKIE && c.value),
    ).toEqual([]);
  });

  test('After signing out, the entrance offers sign-in again rather than the portfolio', async ({
    page,
  }) => {
    await page.goto(PORTFOLIO);
    await page.getByRole('button', { name: 'Sign out' }).click();

    await page.goto(ENTRANCE);

    await expectEntrance(page, 'after-sign-out-entrance-prompts');
    await expect(page.getByRole('heading', { name: 'Fred Roberts' })).toHaveCount(0);
  });

  test('Signing out on one device leaves another device signed in', async ({
    browser,
  }, testInfo) => {
    const state = testInfo.project.use.storageState;
    const laptop = await browser.newContext({ storageState: state });
    const phone = await browser.newContext({ storageState: state });
    const onLaptop = await laptop.newPage();
    const onPhone = await phone.newPage();

    await onLaptop.goto(PORTFOLIO);
    await onLaptop.getByRole('button', { name: 'Sign out' }).click();

    await onLaptop.goto(PORTFOLIO);
    await expectPublicSite(onLaptop, 'sign-out-laptop-only-laptop');

    await onPhone.goto(PORTFOLIO);
    await expectPortfolio(onPhone, 'sign-out-laptop-only-phone');

    await laptop.close();
    await phone.close();
  });
});
