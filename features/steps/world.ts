/**
 * The acceptance harness: a device with a cookie jar, driving the real server handler.
 *
 * Everything under `src/boundary` runs for real here — the decision, the sessions, the
 * cookies, the rendered pages. The only thing stood in for is Google itself, because the
 * contract is about which account is let in, never about how a credential is fetched.
 */
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { setWorldConstructor, World } from '@cucumber/cucumber';

import {
  PORTFOLIO_PATH,
  SIGN_IN_SUFFIX,
  SIGN_OUT_SUFFIX,
  type BoundaryConfig,
  type View,
} from '../../src/boundary/boundary.js';
import { CSRF_COOKIE } from '../../src/boundary/http.js';
import { createIdentityCheck, type Owner, type TokenVerifier } from '../../src/boundary/identity.js';
import { createSiteHandler, type SiteHandler } from '../../src/boundary/site-handler.js';
import { renderEntrance, renderPortfolio } from '../../src/boundary/views.js';

export const ENTRANCE_PATH = '/a-quiet-door-2f91c7';
export const FRED_ACCOUNT_ID = 'google-sub-104857392017465';
export const FRED_EMAIL = 'penguinpavilion@gmail.com';
export const SAM_ACCOUNT_ID = 'google-sub-887711093322104';
export const GOOGLE_CLIENT_ID = '1085-boundary.apps.googleusercontent.com';
const SESSION_SECRET = 'acceptance-session-secret';
const USUAL_DEVICE = 'the usual device';

export interface Shown {
  readonly view: View;
  readonly html: string;
}

/** A browser on one device: its own cookie jar, and nothing shared with any other. */
class Device {
  private readonly cookies = new Map<string, string>();

  constructor(private readonly handler: () => SiteHandler) {}

  async get(path: string): Promise<Shown> {
    return this.send('GET', path, '');
  }

  async post(path: string, body: string): Promise<Shown> {
    return this.send('POST', path, body);
  }

  async signIn(credential: string | null): Promise<Shown> {
    // Google Identity Services sets this cookie and posts the same value back.
    const token = `csrf-${this.cookies.size}-token`;
    this.cookies.set(CSRF_COOKIE, token);

    const body = new URLSearchParams({ g_csrf_token: token });
    if (credential !== null) {
      body.set('credential', credential);
    }

    return this.post(ENTRANCE_PATH + SIGN_IN_SUFFIX, body.toString());
  }

  signOut(): Promise<Shown> {
    return this.post(ENTRANCE_PATH + SIGN_OUT_SUFFIX, '');
  }

  private async send(method: string, path: string, body: string): Promise<Shown> {
    const req = Object.assign(Readable.from([Buffer.from(body, 'utf8')]), {
      method,
      url: path,
      headers: { cookie: this.cookieHeader() },
    }) as unknown as IncomingMessage;

    const headers = new Map<string, string>();
    let sent: string | null = null;
    const res = {
      statusCode: 0,
      setHeader: (name: string, value: string) => headers.set(name.toLowerCase(), value),
      end: (chunk?: string) => {
        sent = chunk ?? '';
      },
    } as unknown as ServerResponse;

    let handedOn = false;
    await this.handler()(req, res, (error?: unknown) => {
      if (error) {
        throw error;
      }
      handedOn = true;
    });

    this.applySetCookie(headers.get('set-cookie'));

    return handedOn ? { view: 'public', html: publicPage() } : { view: viewOf(sent), html: sent ?? '' };
  }

  private cookieHeader(): string {
    return [...this.cookies].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join('; ');
  }

  private applySetCookie(header: string | undefined): void {
    if (!header) {
      return;
    }

    const [pair, ...attributes] = header.split(';');
    const at = pair.indexOf('=');
    const name = pair.slice(0, at).trim();
    const value = decodeURIComponent(pair.slice(at + 1).trim());
    const expired = attributes.some((a) => a.trim().toLowerCase() === 'max-age=0');

    if (expired || !value) {
      this.cookies.delete(name);
    } else {
      this.cookies.set(name, value);
    }
  }
}

function viewOf(html: string | null): View {
  return html?.includes('g_id_onload') ? 'entrance' : 'portfolio';
}

export class BoundaryWorld extends World {
  config: BoundaryConfig = { entrancePath: ENTRANCE_PATH, allowedAccountId: null };
  shown: Shown = { view: 'public', html: '' };
  sent = '';
  /** Whoever is doing the looking, for the assertion messages. */
  visitor = '';

  private readonly accounts = new Map<string, Owner>();
  private readonly devices = new Map<string, Device>();
  private identityAvailable = true;
  private clock = Date.parse('2026-09-16T09:00:00Z');

  /** Registers who a person is at Google. The label may change; the account id may not. */
  holds(name: string, owner: Owner): void {
    this.accounts.set(name, owner);
  }

  labelOf(name: string): string {
    return this.accountOf(name).label;
  }

  relabel(name: string, label: string): void {
    this.holds(name, { ...this.accountOf(name), label });
  }

  credentialFor(name: string): string {
    return `google-credential-for:${name}`;
  }

  /** The identity check stops working — config unreadable, Google unreachable, either way. */
  identityIsUnavailable(): void {
    this.identityAvailable = false;
  }

  travelTo(date: string): void {
    this.clock = Date.parse(`${date}T09:00:00Z`);
  }

  device(name: string, deviceName = USUAL_DEVICE): Device {
    const key = `${name}::${deviceName}`;
    let device = this.devices.get(key);
    if (!device) {
      device = new Device(() => this.handler());
      this.devices.set(key, device);
    }

    return device;
  }

  /** Behaviour, not bookkeeping: asks for the portfolio and sees whether it arrives. */
  async isSignedIn(name: string, deviceName?: string): Promise<boolean> {
    return (await this.device(name, deviceName).get(PORTFOLIO_PATH)).view === 'portfolio';
  }

  private accountOf(name: string): Owner {
    const owner = this.accounts.get(name);
    if (!owner) {
      throw new Error(`No Google account registered for "${name}"`);
    }

    return owner;
  }

  private handler(): SiteHandler {
    const verify: TokenVerifier = async (credential) => {
      const name = credential.replace('google-credential-for:', '');

      return this.accounts.get(name) ?? null;
    };

    return createSiteHandler({
      config: this.config,
      identity: createIdentityCheck({
        sessionSecret: this.identityAvailable ? SESSION_SECRET : null,
        verify: this.identityAvailable ? verify : null,
        now: () => this.clock,
      }),
      renderEntrance: () => renderEntrance(GOOGLE_CLIENT_ID, ENTRANCE_PATH + SIGN_IN_SUFFIX),
      renderPortfolio: (owner) => renderPortfolio(owner, ENTRANCE_PATH + SIGN_OUT_SUFFIX),
    });
  }
}

setWorldConstructor(BoundaryWorld);

/**
 * Everything the browser is ever sent: the shell, the styles, and every source the client
 * bundle is built from. Nothing else can reach a visitor, so this is the whole surface the
 * no-trace rule has to hold over. `src/boundary`, `src/server.ts` and the `.server.ts`
 * files are deliberately absent — they are the server's, and the server keeps them.
 */
const TEXT = /\.(ts|html|scss|css|js|json|txt|svg|webmanifest)$/;

export function clientSources(): string {
  const root = join(import.meta.dirname, '../..');
  const files = ['src/index.html', 'src/main.ts', 'src/styles.scss']
    .concat(walk(join(root, 'src/app'), root))
    .concat(walk(join(root, 'public'), root))
    .filter((path) => TEXT.test(path) && !path.includes('.server.') && !path.endsWith('.spec.ts'));

  return files.map((path) => readFileSync(join(root, path), 'utf8')).join('\n');
}

export function publicPage(): string {
  const root = join(import.meta.dirname, '../..');

  return readFileSync(join(root, 'src/index.html'), 'utf8').replace(
    '<app-root></app-root>',
    readFileSync(join(root, 'src/app/app.html'), 'utf8'),
  );
}

function walk(directory: string, root: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry);

    return statSync(full).isDirectory() ? walk(full, root) : [full.slice(root.length + 1)];
  });
}

export { PORTFOLIO_PATH, SIGN_IN_SUFFIX, SIGN_OUT_SUFFIX };
