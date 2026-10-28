# ceevee_frontend

React + TypeScript + Vite. Talks to the ceevee backend over `/api`.

## Run (two terminals)

```bash
# terminal 1: backend (from the backend folder)
uvicorn app.main:app --reload            # http://localhost:8000

# terminal 2: frontend
npm install
npm run dev                              # http://localhost:5173
```

Vite proxies `/api` to the backend, so there is no CORS setup in development.
Different backend address: `VITE_PROXY_TARGET=http://host:port npm run dev`.

## Scripts

| | |
|---|---|
| `npm test` | unit and component tests (no backend needed) |
| `VITE_API_BASE=http://127.0.0.1:8000 npm test` | also runs the live test against a running backend |
| `npm run typecheck` / `npm run build` | type check / production bundle in `dist/` |
| `npm run gen:api` | regenerate `src/api/schema.d.ts` from the running backend's OpenAPI |

After any backend API change: run `python scripts/export_openapi.py` in the backend (writes `openapi.json` here), then `npm run gen:api:offline`; the type checker then shows exactly what broke.

## Production

Serve `dist/` and the API from the same origin (reverse proxy `/api` to the backend). Share links are built from the page origin, so they stay valid with no extra config.
