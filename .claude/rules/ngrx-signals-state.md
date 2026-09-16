---
paths:
  - "src/**/*.ts"
---

# All data access goes through an NgRx SignalStore

Applies to this workspace (`@ngrx/signals` **21.1.1**, Angular 21).
API below verified against the shipped type definitions, not blog posts.

**Components never fetch and never own server state.** A component injects a store, reads
signals, and calls store methods. `HttpClient` appears in exactly two places: the API services
in `@gymbug/core/data`, and the stores that call them.

## Non-negotiables

1. **No `HttpClient` in a component.** Ever.
2. **No `toSignal(this.api.getX())` in a component** to load data. That is a fetch in disguise —
   it has no loading/error state, no way to refresh, and no way to share the result.
3. **State is mutated only via `patchState`.** Never assign to a signal the store exposes.
4. **Async work uses `rxMethod`** from `@ngrx/signals/rxjs-interop`, with `tapResponse` from
   `@ngrx/operators` so a failed request can never kill the subscription.
5. **Collections use `withEntities`** from `@ngrx/signals/entities` rather than a hand-rolled array.
6. **`protectedState` stays on** (the default). If a component needs to change state, the store
   exposes a method — external `patchState` on a store is a design smell.

## The canonical store

```ts
import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withMethods, withState, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, switchMap, tap } from 'rxjs';

type BookingsState = {
  bookings: MemberBooking[];
  loading: boolean;
  error: string | null;
};

const initialState: BookingsState = { bookings: [], loading: false, error: null };

export const BookingsStore = signalStore(
  { providedIn: 'root' },              // omit for a component-scoped store
  withState(initialState),

  withComputed(({ bookings }) => ({
    upcoming: computed(() => bookings().filter((b) => b.status === 'Confirmed')),
  })),

  withMethods((store, api = inject(MemberApiService)) => ({
    load: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() =>
          api.getMyBookings().pipe(
            tapResponse({
              next: (bookings) => patchState(store, { bookings, loading: false }),
              error: () => patchState(store, { error: 'load-failed', loading: false }),
            }),
          ),
        ),
      ),
    ),

    async cancel(bookingId: string): Promise<void> {
      patchState(store, { loading: true });
      // …call the API, then patchState with the result
    },
  })),
);
```

Component side — read signals, call methods, nothing else:

```ts
export class SchedulePage {
  protected readonly store = inject(BookingsStore);
  constructor() { this.store.load(); }
}
```

## `rxMethod` — the part that is easy to get wrong

`rxMethod<T>` takes an **operator pipeline**, not a callback. It accepts a value, a signal, a
computation, or an observable — passing a signal makes it re-run whenever that signal changes:

```ts
readonly loadForWeek = rxMethod<string>(          // Input type = the argument
  pipe(
    tap(() => patchState(store, { loading: true })),
    switchMap((weekStart) => api.getCalendar(weekStart, …)),
  ),
);

store.loadForWeek(this.weekStart);   // 👈 signal — re-runs on every change
store.loadForWeek('2026-07-27');     // 👈 static value — runs once
```

Flattening operator matters: `switchMap` for "latest wins" (navigation, search), `concatMap`
when order must hold (writes), `exhaustMap` to ignore double-taps (submit buttons).

**Always wrap the inner call in `tapResponse`.** A bare `catchError` inside `switchMap` is fine,
but an unhandled error propagates to the outer pipeline and **permanently kills the rxMethod** —
the screen then silently stops loading forever.

## Entities

```ts
import { withEntities, setAllEntities } from '@ngrx/signals/entities';

export const ClassesStore = signalStore(
  withEntities<CalendarSlot>(),
  withMethods((store, api = inject(MemberApiService)) => ({
    load: rxMethod<{ from: string; to: string }>(
      pipe(
        switchMap(({ from, to }) =>
          api.getCalendar(from, to).pipe(
            tapResponse({
              next: (slots) => patchState(store, setAllEntities(slots, { selectId: (s) => s.sessionId })),
              error: () => patchState(store, { error: 'load-failed' }),
            }),
          ),
        ),
      ),
    ),
  })),
);
```

Gives `store.entities()`, `store.entityMap()`, `store.ids()`. Updaters:
`setAllEntities` · `setEntity` · `addEntity` · `updateEntity` · `upsertEntity` · `removeEntity`
(plus `…Entities` plurals, `prependEntity`, `removeAllEntities`, `updateAllEntities`).

## Full exported API (verified from `@ngrx/signals@21.1.1` types)

| Entry point | Exports |
|---|---|
| `@ngrx/signals` | `signalStore` `signalStoreFeature` `signalState` `withState` `withComputed` `withMethods` `withHooks` `withProps` `withFeature` `withLinkedState` `patchState` `getState` `watchState` `deepComputed` `signalMethod` `isWritableStateSource` `type` |
| `@ngrx/signals/rxjs-interop` | `rxMethod` |
| `@ngrx/signals/entities` | `withEntities` `entityConfig` `setAllEntities` `setEntities` `setEntity` `addEntity` `addEntities` `prependEntity` `prependEntities` `updateEntity` `updateEntities` `updateAllEntities` `upsertEntity` `upsertEntities` `removeEntity` `removeEntities` `removeAllEntities` |
| `@ngrx/signals/events` | event-based store extensions |
| `@ngrx/signals/testing` | test helpers |
| `@ngrx/operators` | `tapResponse` `mapResponse` `concatLatestFrom` |

Feature order is enforced by the types: a feature may only reference state/props/methods
declared **before** it. `withState` → `withComputed` → `withMethods` → `withHooks` is the
conventional order.

## Where stores live

- **Shared across apps** (bookings, plans, schedule, workouts, documents) →
  `@gymbug/core/data`, alongside the API service they wrap. Promote on the **second** consumer.
- **One screen only** → next to that page, without `{ providedIn: 'root' }`, so it is created
  and destroyed with the component.

`signalMethod` over `rxMethod` when the work is synchronous — it avoids pulling RxJS in for
nothing.
