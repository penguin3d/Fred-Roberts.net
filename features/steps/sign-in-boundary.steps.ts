import assert from 'node:assert/strict';

import { Given, Then, When } from '@cucumber/cucumber';

import {
  BoundaryWorld,
  ENTRANCE_PATH,
  FRED_ACCOUNT_ID,
  FRED_EMAIL,
  PORTFOLIO_PATH,
  SAM_ACCOUNT_ID,
  clientSources,
  publicPage,
} from './world.js';

/** Words that would tell a stranger there is anything here but a placeholder. */
const TELLS = [
  'portfolio',
  'sign in',
  'sign-in',
  'signin',
  'sign out',
  'log in',
  'login',
  'refused',
  'denied',
  'not allowed',
  'unauthorized',
  'unauthorised',
  'forbidden',
  'admin',
  'allow-list',
  'allowlist',
  'private area',
];

const NEAR_MISSES: Record<string, string> = {
  'a different letter case': ENTRANCE_PATH.toUpperCase(),
  'a trailing slash added': `${ENTRANCE_PATH}/`,
  'an extra segment appended': `${ENTRANCE_PATH}/in`,
};

function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

// ── the allow-list, and who holds what ───────────────────────────────────────

Given(
  "the only allowed Google account is Fred's, identified by its Google account id",
  function (this: BoundaryWorld) {
    this.config = { ...this.config, allowedAccountId: FRED_ACCOUNT_ID };
  },
);

Given('no allowed Google account is configured', function (this: BoundaryWorld) {
  this.config = { ...this.config, allowedAccountId: null };
});

Given('the identity check is unavailable', function (this: BoundaryWorld) {
  this.identityIsUnavailable();
});

Given('{string} holds the allowed Google account', function (this: BoundaryWorld, name: string) {
  this.holds(name, { accountId: FRED_ACCOUNT_ID, label: FRED_EMAIL });
});

Given('{string} holds a Google account of their own', function (this: BoundaryWorld, name: string) {
  this.holds(name, { accountId: SAM_ACCOUNT_ID, label: 'sam.whitlock@gmail.com' });
});

Given(
  "{string} holds a Google account that shows Fred's email address but is not Fred's account",
  function (this: BoundaryWorld, name: string) {
    this.holds(name, { accountId: SAM_ACCOUNT_ID, label: FRED_EMAIL });
  },
);

Given("Fred's Google account now shows a different email address", function (this: BoundaryWorld) {
  this.relabel('Fred', 'fred@fredroberts.net');
});

// ── being signed in, or not ──────────────────────────────────────────────────

Given('{string} is signed in', async function (this: BoundaryWorld, name: string) {
  const shown = await this.device(name).signIn(this.credentialFor(name));
  assert.equal(shown.view, 'portfolio', `"${name}" could not sign in`);
});

Given(
  '{string} is signed in on their {string}',
  async function (this: BoundaryWorld, name: string, device: string) {
    const shown = await this.device(name, device).signIn(this.credentialFor(name));
    assert.equal(shown.view, 'portfolio', `"${name}" could not sign in on their ${device}`);
  },
);

Given(
  '{string} signed in on {word} and has not signed out',
  async function (this: BoundaryWorld, name: string, date: string) {
    this.travelTo(date);
    const shown = await this.device(name).signIn(this.credentialFor(name));
    assert.equal(shown.view, 'portfolio', `"${name}" could not sign in on ${date}`);
  },
);

Given('{string} has signed out', async function (this: BoundaryWorld, name: string) {
  await this.device(name).signOut();
});

// ── asking for things ────────────────────────────────────────────────────────

When('{string} asks for the portfolio', async function (this: BoundaryWorld, name: string) {
  this.shown = await this.device(name).get(PORTFOLIO_PATH);
});

When(
  '{string} asks for the portfolio on {word}',
  async function (this: BoundaryWorld, name: string, date: string) {
    this.travelTo(date);
    this.shown = await this.device(name).get(PORTFOLIO_PATH);
  },
);

When('{string} asks for the sign-in entrance', async function (this: BoundaryWorld, name: string) {
  this.shown = await this.device(name).get(ENTRANCE_PATH);
});

When(
  '{string} asks for the sign-in entrance with {string}',
  async function (this: BoundaryWorld, name: string, difference: string) {
    const path = NEAR_MISSES[difference];
    assert.ok(path, `No near miss defined for "${difference}"`);
    this.shown = await this.device(name).get(path);
  },
);

When(
  '{string} asks for an address that is not the sign-in entrance',
  async function (this: BoundaryWorld, name: string) {
    this.shown = await this.device(name).get('/admin');
  },
);

When(
  '{string} looks over the public site for a way to sign in',
  function (this: BoundaryWorld, name: string) {
    this.visitor = name;
    this.sent = publicPage();
    this.shown = { view: 'public', html: this.sent };
  },
);

When('{string} inspects everything the site sent them', function (this: BoundaryWorld, name: string) {
  this.visitor = name;
  this.sent = `${publicPage()}\n${clientSources()}`;
});

When('{string} signs in at the sign-in entrance', async function (this: BoundaryWorld, name: string) {
  this.shown = await this.device(name).signIn(this.credentialFor(name));
});

When(
  '{string} starts signing in at the sign-in entrance but does not complete it',
  async function (this: BoundaryWorld, name: string) {
    await this.device(name).get(ENTRANCE_PATH);
    this.shown = await this.device(name).signIn(null);
  },
);

When('{string} signs out', async function (this: BoundaryWorld, name: string) {
  this.shown = await this.device(name).signOut();
});

When(
  '{string} signs out on their {string}',
  async function (this: BoundaryWorld, name: string, device: string) {
    this.shown = await this.device(name, device).signOut();
  },
);

// ── what they were shown ─────────────────────────────────────────────────────

Then('{string} is shown the public site', function (this: BoundaryWorld, name: string) {
  assert.equal(this.shown.view, 'public', `"${name}" was shown the ${this.shown.view}`);
  assert.match(this.shown.html, /Site under construction/);
});

Then('{string} is shown the portfolio', function (this: BoundaryWorld, name: string) {
  assert.equal(this.shown.view, 'portfolio', `"${name}" was shown the ${this.shown.view} site`);
});

Then(
  'the portfolio identifies {string} as the signed-in owner',
  function (this: BoundaryWorld, name: string) {
    assert.equal(this.shown.view, 'portfolio');
    assert.ok(
      this.shown.html.includes(this.labelOf(name)),
      `The portfolio does not name ${this.labelOf(name)}`,
    );
  },
);

Then(
  '{string} is offered a Google sign-in and nothing else',
  function (this: BoundaryWorld, name: string) {
    assert.equal(this.shown.view, 'entrance', `"${name}" was shown the ${this.shown.view}`);
    assert.match(this.shown.html, /accounts\.google\.com\/gsi\/client/);
    assert.match(this.shown.html, new RegExp(`data-login_uri="${ENTRANCE_PATH}/callback"`));
    assert.doesNotMatch(this.shown.html, /<a\s|<form/i, 'The entrance offers more than the button');
    assert.equal(visibleText(this.shown.html).replace('fredroberts.net', '').trim(), '');
  },
);

Then('{string} is not asked to sign in', function (this: BoundaryWorld, name: string) {
  assert.notEqual(this.shown.view, 'entrance', `"${name}" was asked to sign in`);
  assert.doesNotMatch(this.shown.html, /g_id_onload|accounts\.google\.com/);
});

Then(
  'nothing {string} was shown mentions a portfolio, a sign-in, or a refusal',
  function (this: BoundaryWorld, name: string) {
    const text = visibleText(this.shown.html);
    for (const tell of TELLS) {
      assert.ok(!text.includes(tell), `What "${name}" was shown says "${tell}"`);
    }
  },
);

Then('{string} finds no way to sign in', function (this: BoundaryWorld, name: string) {
  assert.doesNotMatch(this.sent, /<a\s|<button|<form/i, `The public site offers "${name}" a way in`);
  const text = visibleText(this.sent);
  for (const tell of TELLS) {
    assert.ok(!text.includes(tell), `The public site says "${tell}"`);
  }
});

Then(
  'nothing the site sent {string} contains any trace of the portfolio, the sign-in entrance, or the allowed account',
  function (this: BoundaryWorld, name: string) {
    const traces = [
      ENTRANCE_PATH,
      ENTRANCE_PATH.slice(1),
      PORTFOLIO_PATH,
      'portfolio',
      FRED_ACCOUNT_ID,
      FRED_EMAIL,
      'g_id_onload',
      'accounts.google.com',
      'allowedAccountId',
    ];
    const sent = this.sent.toLowerCase();
    for (const trace of traces) {
      assert.ok(
        !sent.includes(trace.toLowerCase()),
        `What the site sent "${name}" contains "${trace}"`,
      );
    }
  },
);

// ── being signed in, asserted through the door itself ────────────────────────

Then('{string} is not signed in', async function (this: BoundaryWorld, name: string) {
  assert.equal(await this.isSignedIn(name), false, `"${name}" is signed in`);
});

Then(
  '{string} is not signed in on their {string}',
  async function (this: BoundaryWorld, name: string, device: string) {
    assert.equal(await this.isSignedIn(name, device), false, `"${name}" is signed in on ${device}`);
  },
);

Then(
  '{string} is still signed in on their {string}',
  async function (this: BoundaryWorld, name: string, device: string) {
    assert.equal(await this.isSignedIn(name, device), true, `"${name}" is signed out on ${device}`);
  },
);
