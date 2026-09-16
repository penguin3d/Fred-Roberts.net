import { escapeHtml, renderEntrance, renderPortfolio } from './views';

describe('the entrance', () => {
  const html = renderEntrance('client-123.apps.googleusercontent.com', '/door/callback');

  it('loads Google Identity Services', () => {
    expect(html).toContain('https://accounts.google.com/gsi/client');
  });

  it('points Google back at the callback', () => {
    expect(html).toContain('data-login_uri="/door/callback"');
    expect(html).toContain('data-client_id="client-123.apps.googleusercontent.com"');
  });

  it('asks robots to stay away', () => {
    expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
  });

  it('says nothing of its own — no link, no form, no prose', () => {
    expect(html).not.toMatch(/<a\s|<form/i);
    expect(html.replace(/<[^>]*>/g, ' ')).not.toMatch(/portfolio|sign ?-?in|refus/i);
  });

  it('escapes what it is given', () => {
    expect(renderEntrance('"><script>', '/x')).toContain('&quot;&gt;&lt;script&gt;');
  });
});

describe('the portfolio', () => {
  const owner = { accountId: 'sub-1', label: 'fred@example.com' };

  it('names the signed-in owner', () => {
    expect(renderPortfolio(owner, '/door/sign-out')).toContain('fred@example.com');
  });

  it('offers a way out on this device', () => {
    expect(renderPortfolio(owner, '/door/sign-out')).toContain(
      '<form method="post" action="/door/sign-out">',
    );
  });

  it('escapes the label Google gave us', () => {
    expect(renderPortfolio({ accountId: 'sub-1', label: '<img onerror=x>' }, '/o')).toContain(
      '&lt;img onerror=x&gt;',
    );
  });
});

describe('escapeHtml', () => {
  it('escapes every character that could break out of markup', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('leaves ordinary text alone', () => {
    expect(escapeHtml('fred@example.com')).toBe('fred@example.com');
  });
});
