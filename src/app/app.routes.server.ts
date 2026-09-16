import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * The Angular half of the site is the public placeholder and nothing else, so there is
 * exactly one page to prerender. The entrance and the portfolio are served by
 * `src/boundary`, which never enters the browser bundle.
 */
export const serverRoutes: ServerRoute[] = [{ path: '**', renderMode: RenderMode.Prerender }];
