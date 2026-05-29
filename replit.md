# CloudeArc

An AI-powered app builder where users describe what they want to build and an LLM agent writes the code into a live WebContainer sandbox (isolated browser-based dev environment).

## Run & Operate

- `pnpm --filter @workspace/cloudearc run dev` — run the frontend (Vite, port assigned by workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port assigned by workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Required env: `NVIDIA_API_KEY` — for LLM calls via NVIDIA NIM API
- Optional env: `MODEL_GENERAL`, `MODEL_REASONER`, `MODEL_CODER`, `MODEL_FAST` — model overrides

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifacts/cloudearc)
- Backend: Express 5 (artifacts/api-server)
- DB: PostgreSQL + Drizzle ORM (not yet used)
- WebContainer: @webcontainer/api — runs a full Node/Vite dev server in the browser
- Editor: Monaco Editor (@monaco-editor/react)
- Routing: wouter
- API codegen: Orval (from OpenAPI spec)

## Where things live

- `artifacts/cloudearc/src/pages/home.tsx` — landing page with prompt input
- `artifacts/cloudearc/src/pages/workspace.tsx` — workspace with Monaco editor + WebContainer preview
- `artifacts/cloudearc/src/lib/sandbox.ts` — WebContainer boot/mount/write logic
- `artifacts/cloudearc/src/lib/syncEngine.ts` — file sync between AI actions and WebContainer
- `artifacts/api-server/src/routes/chat.ts` — LLM orchestration (Planner → Architect → Coder)
- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for API)

## Architecture decisions

- Uses @webcontainer/api to run a complete Vite + React dev environment inside the browser (no server-side code execution needed)
- Three-agent LLM pipeline: Planner breaks the request into steps, Architect identifies files to modify, Coder writes the actual file content
- Cross-Origin-Embedder-Policy + Cross-Origin-Opener-Policy headers required for SharedArrayBuffer (WebContainer requirement)
- Models are configurable via env vars (NVIDIA NIM API)

## Product

- Users describe an app on the home page, get redirected to a workspace
- The workspace boots a WebContainer (Node/Vite dev server in the browser)
- Monaco editor shows the generated files
- Users can chat with the AI assistant to modify the app in real-time
- Live preview iframe shows the running app

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- WebContainer requires COOP/COEP headers (Cross-Origin-Embedder-Policy: require-corp + Cross-Origin-Opener-Policy: same-origin) — these must be set on the Vite server responses
- NVIDIA_API_KEY must be set for the chat endpoint to work
- The copy script failed for this import (flat root layout not a standard monorepo) — files were ported manually

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
