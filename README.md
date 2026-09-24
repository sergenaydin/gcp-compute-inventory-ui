# GCP Compute Inventory UI

A React + Vite front end for the
[`gcp-compute-inventory-service`](https://github.com/sergenaydin/gcp-compute-inventory-service) API. It is a
separate project: it has its own dependencies, is started on its own, and only
talks to the API over HTTP.

## Features

The UI is read-only and built around watching a fleet:

- Summary cards and a fleet status bar (running / changing / stopped) with tooltips.
- A searchable, filterable, sortable table. Search, filter, sort and the open VM
  are stored in the URL, so any view is a shareable link.
- Auto-refresh every 10 seconds. When a VM changes state the row flashes, a toast
  appears and the change is added to a "Recent activity" feed, so stopping or
  starting a VM from the terminal is visible within seconds.
- A detail drawer per VM (data from `GET /api/instances/:id`) with an
  "Open in Cloud Console" link, copy-ready `gcloud ssh` / `describe` commands and
  the state changes seen this session.
- Light / dark / system theme, keyboard shortcuts (`/` search, `R` refresh,
  `L` live, `T` theme), and a responsive layout for phones.

React escapes rendered text, so VM names can't inject HTML.

## Running it

Requires Node.js >=20.13 (pinned in `.nvmrc`; run `nvm use` if you use nvm).

```bash
npm install
cp .env.example .env      # optional: only if the API is not on http://localhost:8080
npm run dev
# http://localhost:5173
```

The API must be running for the page to show data. Start it from its own
repository (`npm run dev` there, listening on `http://localhost:8080`).

| Script              | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | Dev server with hot reload on http://localhost:5173       |
| `npm run build`     | Typecheck, then build static files into `dist/`           |
| `npm run preview`   | Serve the built `dist/` locally (also proxies `/api`)     |
| `npm run typecheck` | TypeScript check only                                     |
| `npm test`          | Unit tests for the pure helpers (Vitest)                  |

## Talking to the API

| Setting              | Used by             | Meaning                                                                 |
| -------------------- | ------------------- | ----------------------------------------------------------------------- |
| `API_PROXY_TARGET`   | `dev`, `preview`    | Where `/api` is forwarded. Default `http://localhost:8080`.            |
| `VITE_API_BASE_URL`  | `build`             | Base URL baked into the bundle for an API on another origin. Default: same origin. |

- **Local development:** the browser only talks to the Vite dev server, which
  forwards `/api` to the API. No CORS setup is needed.
- **Hosting the UI separately** (any static host): build with
  `VITE_API_BASE_URL=https://api.example.com npm run build`, deploy `dist/`, and
  set `CORS_ORIGIN=https://ui.example.com` on the API so the browser is allowed
  to call it.

## Structure

```
src/
  App.tsx, hooks.ts    State, polling, URL state, data fetching
  api.ts               Fetch wrapper (uses VITE_API_BASE_URL)
  api-types.ts         Copy of the API's response contract (keep in sync)
  lib.ts               Pure helpers: filtering, sorting, change detection, URL state
  lib.test.ts          Tests for lib.ts
  components/          Header, Stats, FleetBar, Toolbar, InstanceTable, DetailDrawer,
                       ActivityFeed, Toasts, ThemeToggle, StatusPill
```

`api-types.ts` duplicates the backend's `CloudInstance` type on purpose, so the
two repositories stay independent. With more endpoints I'd generate it from an
OpenAPI spec instead of copying it by hand.
