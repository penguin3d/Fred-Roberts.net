/**
 * The two pages the public bundle must never contain.
 *
 * Rendered as plain strings on the server rather than as Angular components, because an
 * Angular route for either one would put its address into the browser bundle — which is
 * the one thing the no-trace rule forbids. Neither page carries any wording of ours about
 * signing in, being refused, or a portfolio existing, so what a stranger who guesses the
 * entrance sees is a bare Google button and nothing to report.
 */
import type { Owner } from './identity';

const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';

const SHELL_STYLE =
  'body{margin:0;min-height:100dvh;display:grid;place-items:center;' +
  'background:#0f0f10;color:#f5f3ef;font:16px/1.5 system-ui,sans-serif}';

export function renderEntrance(clientId: string, loginUri: string): string {
  return page(`<script src="${GOOGLE_IDENTITY_SCRIPT}" async></script>
  <div id="g_id_onload"
       data-client_id="${escapeHtml(clientId)}"
       data-login_uri="${escapeHtml(loginUri)}"
       data-ux_mode="redirect"
       data-auto_prompt="false"></div>
  <div class="g_id_signin" data-type="standard" data-shape="pill"></div>`);
}

export function renderPortfolio(owner: Owner, signOutPath: string): string {
  return page(`<main>
    <h1>Fred Roberts</h1>
    <p>You are ${escapeHtml(owner.label)}.</p>
    <form method="post" action="${escapeHtml(signOutPath)}"><button type="submit">Sign out</button></form>
  </main>`);
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function page(body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>fredroberts.net</title>
  <style>${SHELL_STYLE}</style>
</head>
<body>
  ${body}
</body>
</html>
`;
}
